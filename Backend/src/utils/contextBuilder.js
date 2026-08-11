import { getPolicy, getRoleMeta, setCache, getCacheVersion } from "./cache.js";
import { getTenantStore } from "../tenant/tenantContext.js";
import mongoose from "mongoose";
import models from "../models/Collection.js";

const Role = models.roles;
const Employee = models.employees;
const SideBar = models.sidebars;
const Resource = models.resources;
const Capability = models.capabilities;
import { buildMenuTree } from "../services/menuVisibilityService.js";

// Navigation cache: maps key "roleId:deptId:desigId" -> filtered navigation tree
const navigationCache = new Map();
let cachedVersion = 0;

/**
 * Clear the in-memory navigation tree cache.
 * Call this whenever sidebar documents are created, updated, or deleted.
 * @param {string|null} roleId - Optional roleId to target eviction for a specific role
 */
export function clearNavigationCache(roleId = null) {
  if (!roleId) {
    navigationCache.clear();
    return;
  }
  const prefix = `${roleId.toString()}:`;
  for (const key of navigationCache.keys()) {
    if (key.startsWith(prefix)) {
      navigationCache.delete(key);
    }
  }
}

/**
 * Build the complete user context for the frontend.
 *
 * @param {string} userId   - Employee._id
 * @param {string} roleId   - Role._id (from JWT or Employee.professionalInfo.role)
 * @returns {object} Context payload
 */
export async function buildUserContext(userId, roleId) {
  const roleStr = roleId?.toString();
  const tenantContext = getTenantStore();

  // 1. Fetch role metadata from cache (no DB query needed if cached)
  let roleMeta = getRoleMeta(roleStr);
  if (!roleMeta) {
    await setCache();
    roleMeta = getRoleMeta(roleStr);
  }
  if (!roleMeta && roleStr) {
    const isObjId = mongoose.Types.ObjectId.isValid(roleStr);
    const roleDoc = await Role.findOne({
      $or: [
        { name: roleStr },
        { name: new RegExp(`^${roleStr}$`, 'i') },
        ...(isObjId ? [{ _id: roleStr }] : [])
      ]
    }).populate('capabilities').lean();

    if (roleDoc) {
      const capKeys = (roleDoc.capabilities || [])
        .filter(cap => cap && cap.key && cap.status === 'active')
        .map(cap => cap.key);
      roleMeta = {
        id: roleDoc._id.toString(),
        name: roleDoc.name,
        isSuperAdmin: !!roleDoc.isSuperAdmin,
        level: roleDoc.level || 1,
        capabilities: capKeys,
        permissionVersion: roleDoc.permissionVersion || 1
      };
    }
  }

  if (!roleMeta) {
    throw new Error(`Role "${roleStr}" not found in cache or database`);
  }

  // 2. Fetch user profile
  let user = await Employee.findById(userId)
    .select(
      "basicInfo.firstName basicInfo.lastName basicInfo.email basicInfo.profileImage " +
      "professionalInfo.department professionalInfo.designation professionalInfo.role professionalInfo.empId"
    )
    .populate("professionalInfo.department", "name")
    .populate("professionalInfo.designation", "name")
    .lean();

  if (!user) {
    try {
      const { default: UserLogin } = await import("../models/UserLogin.js");
      const globalUser = await UserLogin.findById(userId).lean();
      if (globalUser) {
        user = {
          _id: globalUser._id,
          basicInfo: {
            firstName: globalUser.name || globalUser.email?.split('@')[0] || "User",
            lastName: "",
            email: globalUser.email
          },
          professionalInfo: {
            role: globalUser.role
          }
        };
      }
    } catch (_) { }
  }

  if (!user) {
    user = {
      _id: userId,
      basicInfo: { firstName: "Super Admin", lastName: "", email: "" },
      professionalInfo: { role: roleStr }
    };
  }

  // 3. Fetch all active Resource definitions to map keys
  const allResources = await Resource.find({ isActive: true }).lean();
  const resourceById = {};
  const resourceByModel = {};

  allResources.forEach((res) => {
    resourceById[res._id.toString()] = res;
    if (res.modelName) {
      resourceByModel[res.modelName] = res;
    }
  });

  // 4. Determine if Super Admin
  const isSuperAdmin = !!roleMeta?.isSuperAdmin;

  // 5. Build or retrieve cached navigation tree
  const userDept = user.professionalInfo?.department?._id;
  const userDesig = user.professionalInfo?.designation?._id;

  const tenantId = tenantContext?.tenantId || 'global';
  const userDeptStr = userDept ? userDept.toString() : "all";
  const userDesigStr = userDesig ? userDesig.toString() : "all";
  const navCacheKey = `${tenantId}:${roleStr}:${userDeptStr}:${userDesigStr}`;

  // Invalidate local navigation tree cache if global permission cache version has bumped
  const currentVersion = getCacheVersion();
  if (currentVersion !== cachedVersion) {
    navigationCache.clear();
    cachedVersion = currentVersion;
  }

  let navigation = navigationCache.get(navCacheKey);

  // ![] === false in JS — an empty cached array would skip the rebuild.
  // Use Array.isArray guard so only a genuine cached non-empty array is reused.
  if (!Array.isArray(navigation)) {
    let allSidebarItems = await SideBar.find({
      isActive: true,
      isDeleted: { $ne: true }
    })
      .populate('capabilities')
      .populate('moduleId')
      .sort({ order: 1 })
      .lean();

    const enabledMods = tenantContext?.enabledModules;
    if (enabledMods && Array.isArray(enabledMods) && !enabledMods.includes('*') && enabledMods.length > 0) {
      const normalizedEnabled = enabledMods.map(m => m.toString().toLowerCase());
      allSidebarItems = allSidebarItems.filter(item => {
        const itemKey = (item.moduleKey || item.moduleId?.moduleId || item.moduleId || '').toString().toLowerCase();
        const itemTitle = (item.title || '').toString().toLowerCase();
        const itemRoute = (item.mainRoute || '').toString().toLowerCase();

        // Core / mandatory sidebar items always visible to all users
        if (!itemKey || itemKey === 'core' || itemKey === 'dashboard' || itemKey === 'profile' || itemKey === 'settings') return true;

        return normalizedEnabled.some(modKey => 
          itemKey.includes(modKey) || 
          modKey.includes(itemKey) ||
          itemTitle.includes(modKey) ||
          itemRoute.includes(modKey)
        );
      });
    }

    if (isSuperAdmin) {
      // Super Admin bypasses all capability checks — build tree directly from all items
      // Debug: log sidebar item breakdown to diagnose child resolution
      const withParent = allSidebarItems.filter(i => !!i.parentId);
      const withoutParent = allSidebarItems.filter(i => !i.parentId);
      console.log(`[contextBuilder] SuperAdmin sidebar: total=${allSidebarItems.length} parents=${withoutParent.length} children=${withParent.length}`);
      if (withParent.length > 0) {
        console.log('[contextBuilder] Sample child parentId:', withParent[0].parentId, typeof withParent[0].parentId);
      }

      const cleanMenuItem = (item) => ({
        _id: item._id?.toString() || item._id,
        title: item.title,
        icon: item.icon,
        mainRoute: item.mainRoute,
        visibility: item.visibility,
        parentId: item.parentId?.toString() || item.parentId || null,
        hasChildren: !!item.hasChildren,
        isParent: !!item.isParent,
        order: item.order || 0
      });

      const buildSubTree = (parentIdStr) => {
        return allSidebarItems
          .filter(child => {
            if (!child.parentId) return false;
            return child.parentId.toString() === parentIdStr;
          })
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(child => {
            const childIdStr = child._id.toString();
            const subChildren = buildSubTree(childIdStr);
            return { ...cleanMenuItem(child), children: subChildren, hasChildren: subChildren.length > 0 || !!child.hasChildren };
          });
      };

      // Top-level items: no parentId
      const parents = allSidebarItems
        .filter(item => !item.parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      navigation = parents.map(parent => {
        const parentIdStr = parent._id.toString();
        const children = buildSubTree(parentIdStr);
        return { ...cleanMenuItem(parent), children, hasChildren: children.length > 0 || !!parent.hasChildren };
      });
    } else {
      // Regular users: filter by capabilities via buildMenuTree
      navigation = await buildMenuTree(allSidebarItems, user, roleMeta);
    }

    // Cache the constructed tree
    navigationCache.set(navCacheKey, navigation);
  }

  // 6. Get UI capabilities: Super Admin receives all active capabilities unrestricted
  let roleCapabilities = [];
  try {
    if (isSuperAdmin) {
      const allActiveCaps = await Capability.find({ status: 'active' }).lean();
      roleCapabilities = allActiveCaps.map(cap => ({
        _id: cap._id?.toString(),
        key: cap.key,
        action: cap.action || '',
        description: cap.description || ''
      }));
    } else {
      // Fetch role with capabilities populated
      const role = await Role.findById(roleId)
        .populate('capabilities')
        .lean();

      if (role && role.capabilities && role.capabilities.length > 0) {
        roleCapabilities = role.capabilities
          .filter(cap => cap && cap.status === 'active')
          .map(cap => ({
            _id: cap._id?.toString(),
            key: cap.key,
            action: cap.action || '',
            description: cap.description || ''
          }));
      }
    }
  } catch (error) {
    console.error('Failed to resolve UI capabilities:', error.message);
  }

  // 7. Assemble response
  return {
    user: {
      id: userId,
      name: `${user.basicInfo?.firstName || ""} ${user.basicInfo?.lastName || ""}`.trim(),
      email: user.basicInfo?.email,
      profileImage: user.basicInfo?.profileImage,
      empId: user.professionalInfo?.empId,
      department: user.professionalInfo?.department?.name || null,
      designation: user.professionalInfo?.designation?.name || null,
      role: {
        id: roleStr,
        name: roleMeta.name,
        level: roleMeta.level,
        isSuperAdmin
      }
    },
    capabilities: roleCapabilities, // User capabilities for visibility check
    navigation,
    _v: currentVersion,
    _cachedAt: new Date().toISOString()
  };
}
