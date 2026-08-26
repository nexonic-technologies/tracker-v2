import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./authProvider";
import axiosInstance from "../api/axiosInstance";

/** Parses a raw context response object into the shape used by provider state */
const parseContext = (ctx) => {
  if (!ctx) return null;
  const capObjects = ctx.capabilities || [];
  const capNames = capObjects.map(cap => typeof cap === 'string' ? cap : cap.key);
  return {
    permissions: ctx.permissions || {},
    navigation: ctx.navigation || [],
    capabilities: capObjects,
    uiCapabilities: capNames,
    role: ctx.user?.role || null,
    userProfile: ctx.user || null,
    isSuperAdmin: ctx.user?.role?.isSuperAdmin || false,
    loading: false,
    error: null
  };
};

export const PermissionContext = createContext({
  permissions: {},
  navigation: [],
  capabilities: [],
  uiCapabilities: [],
  role: null,
  isSuperAdmin: false,
  loading: true,
  error: null,
  can: () => false,
  canAny: () => false,
  canAll: () => false,
  hasCapability: () => false,
  canRenderMenu: () => false,
  refresh: () => { }
});

export const PermissionProvider = ({ children }) => {
  const { user, seededContext, setSeededContext } = useAuth();
  
  const [state, setState] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cached_user_context");
      if (cached) {
        const parsedCtx = JSON.parse(cached);
        const parsed = parseContext(parsedCtx);
        if (parsed) {
          return { ...parsed, loading: false };
        }
      }
    } catch (_) {}

    return {
      permissions: {},
      navigation: [],
      capabilities: [],
      uiCapabilities: [],
      role: null,
      userProfile: null,
      isSuperAdmin: false,
      loading: true,
      error: null
    };
  });

  const versionRef = useRef(0);
  const fetchingRef = useRef(false);

  const fetchContext = useCallback(async (isRefresh = false) => {
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // Show loading state only on explicit manual refresh
    if (isRefresh) {
      setState((s) => ({ ...s, loading: true }));
    }

    try {
      const res = await axiosInstance.get("/auth/me/context");
      const ctx = res.data?.data;

      const parsed = parseContext(ctx);
      if (parsed) {
        versionRef.current = ctx._v || 0;
        setState(parsed);
        try {
          sessionStorage.setItem("cached_user_context", JSON.stringify(ctx));
        } catch (_) {}
      }
    } catch (err) {
      console.error("[PermissionProvider] Failed to fetch context:", err?.message);
      setState((s) => ({
        ...s,
        loading: false,
        error: err?.response?.data?.message || err?.message || "Failed to load permissions"
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [user]);

  // Expose a refresh function that triggers loading state
  const refreshPermissions = useCallback(() => fetchContext(true), [fetchContext]);

  // Initial fetch when user changes (login/logout)
  useEffect(() => {
    if (!user) {
      // User logged out — clear everything
      try {
        sessionStorage.removeItem("cached_user_context");
      } catch (_) {}
      setState({
        permissions: {},
        navigation: [],
        capabilities: [],
        uiCapabilities: [],
        role: null,
        userProfile: null,
        isSuperAdmin: false,
        loading: false,
        error: null
      });
      versionRef.current = 0;
      return;
    }

    // If the splash screen is still running (splashShown not yet written to sessionStorage),
    // DON'T fetch — App.jsx will call setSeededContext(ctx) with the validated context
    // once the splash animation + validateToken() both complete. The seededContext useEffect
    // below will handle seeding state from that. Fetching here would race with validateToken
    // and waste one API call.
    const splashAlreadyDone = sessionStorage.getItem("splashShown") === "true";
    if (!splashAlreadyDone) {
      // Keep loading:true — the seededContext effect will set it to false when ctx arrives.
      // If validation fails, App.jsx calls setUser(null) which triggers this effect again
      // with user=null and correctly clears state.
      return;
    }

    // Normal path: splash was already shown in a previous session visit.
    // Fetch context directly (no splash seed available).
    fetchContext();
  }, [user, fetchContext]);

  // Reactive seed: fires when App.jsx calls setSeededContext(ctx) after splash validation.
  // This is the primary data-loading path on first page load (when splash runs).
  useEffect(() => {
    if (!seededContext) return;

    const parsed = parseContext(seededContext);
    if (parsed) {
      versionRef.current = seededContext._v ?? 0;
      setState(parsed);
    }
    // Consume the seed so it doesn't persist across manual refreshes
    setSeededContext(null);
  }, [seededContext, setSeededContext]);

  // Listen for real-time permission invalidation via Socket.io
  useEffect(() => {
    if (!user) return;

    const handleInvalidation = (payload) => {
      // Only re-fetch if the server's version is newer than ours
      if (payload?.version > versionRef.current) {
        console.log(
          `[PermissionProvider] Permissions invalidated (v${payload.version}), re-fetching...`
        );
        fetchContext();
      }
    };

    // Listen on the global socket instance (if available)
    // The socket is typically set up in useSocket.js or a similar module
    const socket = window.__trackerSocket || window.__socket;
    if (socket) {
      socket.on("permissions:invalidated", handleInvalidation);
      return () => {
        socket.off("permissions:invalidated", handleInvalidation);
      };
    }
  }, [user, fetchContext]);

  // Periodic version poll: every 30s check if backend version bumped.
  // This catches sidebar changes, permission updates, and cache resets
  // without requiring a logout/login or socket event.
  useEffect(() => {
    if (!user) return;

    const poll = setInterval(async () => {
      try {
        const res = await axiosInstance.get("/auth/me/context");
        const ctx = res.data?.data;
        if (ctx && (ctx._v || 0) > versionRef.current) {
          console.log(`[PermissionProvider] Version bumped to v${ctx._v}, refreshing context...`);
          const parsed = parseContext(ctx);
          if (parsed) {
            versionRef.current = ctx._v || 0;
            setState(parsed);
          }
        }
      } catch {
        // Silently ignore poll errors to avoid spamming the console
      }
    }, 5 * 60 * 1000); // 5 minute fallback interval (300000ms)

    return () => clearInterval(poll);
  }, [user]);

  const normalizeCap = (cap) => {
    if (!cap) return '';
    let key = (typeof cap === 'string' ? cap : (cap.key || cap.name || '')).toLowerCase().trim();
    if (key.includes(':')) {
      const parts = key.split(':');
      let module = parts[0].trim();
      if (module.endsWith('s') && module !== 'hrms' && module !== 'crm' && module !== 'status') {
        module = module.slice(0, -1);
      }
      return `${module}:${parts[1].trim()}`;
    }
    return key;
  };

  /**
   * Check if the current user has a specific UI capability (CBAC).
   * Use this for in-page button/feature visibility controlled by the
   * Designation Permissions page (not access_policies).
   *
   * @param {string} capabilityKey - e.g. "Sidebar:create", "attendance:create"
   * @returns {boolean}
   */
  const hasCapability = useCallback(
    (capabilityKey) => {
      if (state.isSuperAdmin) return true;
      if (!capabilityKey) return false;
      const normalizedKey = normalizeCap(capabilityKey);
      const userCaps = state.uiCapabilities?.map(normalizeCap) || [];
      if (userCaps.includes(normalizedKey)) return true;

      // Also check raw string matching if needed
      if (state.uiCapabilities && state.uiCapabilities.includes(capabilityKey)) return true;
      if (Array.isArray(state.capabilities)) {
        return state.capabilities.some((c) => {
          if (!c) return false;
          const k = typeof c === 'string' ? c : (c.key || c.name || '');
          return normalizeCap(k) === normalizedKey || k === capabilityKey;
        });
      }
      return false;
    },
    [state.uiCapabilities, state.capabilities, state.isSuperAdmin]
  );

  /**
   * Check if the current user can perform an action on a resource.
   * Primary UI Gateway for dynamic capability (CBAC) and permission (ABAC) evaluation.
   *
   * @param {string} action   - e.g. "read", "create", "update", "delete", "approve", "export"
   * @param {string} resource - e.g. "tickets", "employees", "leaves", "attendances"
   * @returns {boolean}
   */
  const can = useCallback(
    (action, resource) => {
      if (state.isSuperAdmin) return true;
      if (!action) return false;

      // Single argument provided (e.g. capability key or dashboard stat ID)
      if (!resource) {
        return hasCapability(action);
      }

      const act = action.toLowerCase().trim();
      const res = resource.toLowerCase().trim();

      const resSingular = res.endsWith('s') && res !== 'hrms' && res !== 'crm' && res !== 'status'
        ? res.slice(0, -1)
        : res;
      const resPlural = `${resSingular}s`;

      // 1. Dynamic UI Capabilities resolution (Primary UI Security Gateway)
      const actionCandidates = [act];
      if (act === 'read') actionCandidates.push('view');
      if (act === 'view') actionCandidates.push('read');
      if (act === 'create') actionCandidates.push('mark', 'add');
      if (act === 'update') actionCandidates.push('edit', 'modify');

      const resourceCandidates = [res, resSingular, resPlural];

      for (const r of resourceCandidates) {
        for (const a of actionCandidates) {
          if (hasCapability(`${r}:${a}`)) {
            return true;
          }
        }
      }

      // Check capabilities array by action property
      if (Array.isArray(state.capabilities)) {
        const hasMatchedCap = state.capabilities.some((cap) => {
          if (!cap) return false;
          const capAction = (cap.action || '').toLowerCase().trim();
          const capKey = (cap.key || '').toLowerCase().trim();
          const capModule = (cap.module || (capKey.includes(':') ? capKey.split(':')[0] : '')).toLowerCase().trim();
          const moduleMatches = resourceCandidates.includes(capModule);
          const actionMatches = actionCandidates.includes(capAction) || actionCandidates.some((a) => capKey.endsWith(`:${a}`));
          return moduleMatches && actionMatches;
        });
        if (hasMatchedCap) return true;
      }

      // 2. Direct match in permissions map if available
      for (const r of resourceCandidates) {
        for (const a of actionCandidates) {
          if (state.permissions?.[r]?.[a] === true) {
            return true;
          }
        }
      }

      return false;
    },
    [state.permissions, state.capabilities, state.isSuperAdmin, hasCapability]
  );

  /**
   * Check if the current user can perform ANY of the given actions on a resource.
   * @param {string[]} actions - e.g. ["update", "delete"]
   * @param {string} resource  - e.g. "tickets"
   * @returns {boolean}
   */
  const canAny = useCallback(
    (actions, resource) => {
      if (state.isSuperAdmin) return true;
      if (!Array.isArray(actions)) return false;
      return actions.some((action) => can(action, resource));
    },
    [can, state.isSuperAdmin]
  );

  /**
   * Check if the current user can perform ALL of the given actions on a resource.
   * @param {string[]} actions - e.g. ["read", "update"]
   * @param {string} resource  - e.g. "employees"
   * @returns {boolean}
   */
  const canAll = useCallback(
    (actions, resource) => {
      if (state.isSuperAdmin) return true;
      if (!Array.isArray(actions)) return false;
      return actions.every((action) => can(action, resource));
    },
    [can, state.isSuperAdmin]
  );

  const canRenderMenu = useCallback(
    (menu) => {
      if (!menu) return false;
      if (menu.visibility === 'public') return true;
      if (!menu.capabilities || menu.capabilities.length === 0) return true;
      return menu.capabilities.some(cap => {
        const capKey = typeof cap === 'string' ? cap : (cap.key || cap._id);
        return hasCapability(capKey);
      });
    },
    [hasCapability]
  );

  return (
    <PermissionContext.Provider
      value={{
        ...state,
        can,
        canAny,
        canAll,
        hasCapability,
        canRenderMenu,
        refresh: refreshPermissions
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

/**
 * Hook to access the permission context.
 *
 * Usage:
 *   const { can, permissions, navigation } = usePermission();
 *   if (can("approve", "leaves")) { ... }
 */
export const usePermission = () => useContext(PermissionContext);
