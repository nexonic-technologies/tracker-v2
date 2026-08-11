import React, { useState, useEffect } from 'react';
import axiosInstance from '@api/axiosInstance';
import {
    ShieldCheckIcon,
    UserGroupIcon,
    BriefcaseIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    InformationCircleIcon,
    CheckIcon,
    PlusIcon,
    ArrowPathIcon,
    XMarkIcon,
    FolderIcon,
    DocumentIcon,
    SparklesIcon
} from '@heroicons/react/24/solid';
import { usePermission } from '../../context/permissionProvider';
import { useTenant } from '../../context/TenantContext';

// Helper to clean ObjectId strings
const getCleanId = (id) => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id.$oid) return id.$oid;
    if (id._id) return getCleanId(id._id);
    return id.toString();
};

export default function DesignationPermissions() {
    const { refresh: refreshPermissions } = usePermission();
    const { enabledModules } = useTenant();
    
    // UI state
    const [granteeType, setGranteeType] = useState('role');
    const [roles, setRoles] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedDesignation, setSelectedDesignation] = useState('');
    
    // Hierarchical sidebar tree structure
    const [menuTree, setMenuTree] = useState([]);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    
    const [capabilities, setCapabilities] = useState([]); // List of active capabilities from DB
    const [stagedCapabilities, setStagedCapabilities] = useState(new Set()); // Staged allowed capability keys
    
    const [loading, setLoading] = useState(false);
    const [savingState, setSavingState] = useState(''); // '', 'saving', 'saved', 'error'
    const [errorMessage, setErrorMessage] = useState('');

    // Fetch initial setup data (roles, designations, active capabilities, sidebars)
    useEffect(() => {
        const fetchSetupData = async () => {
            try {
                const [rolesRes, designationsRes, sidebarRes, capRes] = await Promise.all([
                    axiosInstance.post('/populate/read/roles'),
                    axiosInstance.post('/populate/read/designations'),
                    axiosInstance.post('/populate/read/sidebars', { 
                        filter: { isDeleted: { $ne: true } }, 
                        limit: 200,
                        populate: ['capabilities']
                    }),
                    axiosInstance.post('/populate/read/capabilities', { filter: { status: 'active' }, limit: 1000 })
                ]);
                
                const rolesData = (rolesRes.data?.data || []).map(r => ({ ...r, _id: getCleanId(r._id) }));
                const designationsData = (designationsRes.data?.data || []).map(d => ({ ...d, _id: getCleanId(d._id) }));
                const capsData = capRes.data?.data || [];

                setRoles(rolesData);
                if (rolesData.length > 0) {
                    setSelectedRole(rolesData[0]._id);
                }
                setDesignations(designationsData);
                setCapabilities(capsData);
                
                // Process sidebars into parent-child tree filtered by provisioned enabledModules
                const rawSidebars = (sidebarRes.data?.data || [])
                    .filter(item => {
                        if (!enabledModules || !Array.isArray(enabledModules) || enabledModules.includes('*')) return true;
                        const key = (item.moduleKey || item.moduleId?.moduleId || item.moduleId || '').toString().toLowerCase();
                        const title = (item.title || '').toString().toLowerCase();
                        const route = (item.mainRoute || '').toString().toLowerCase();
                        if (!key || key === 'core' || key === 'dashboard' || key === 'profile' || key === 'settings') return true;
                        return enabledModules.some(m => {
                            const modKey = m.toString().toLowerCase();
                            return key.includes(modKey) || modKey.includes(key) || title.includes(modKey) || route.includes(modKey);
                        });
                    })
                    .map(item => ({
                        ...item,
                        _id: getCleanId(item._id),
                        parentId: item.parentId ? getCleanId(item.parentId) : null
                    }));

                const parents = rawSidebars.filter(s => s.isParent || !s.parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
                const children = rawSidebars.filter(s => s.parentId);

                const tree = parents.map(parent => {
                    const nodeChildren = children
                        .filter(c => c.parentId === parent._id)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    
                    return {
                        ...parent,
                        children: nodeChildren
                    };
                });
                
                setMenuTree(tree);
                
                // Expand all parent nodes by default
                const defaultExpanded = new Set(parents.map(p => p._id));
                setExpandedNodes(defaultExpanded);
            } catch (err) {
                console.error('Failed to load capabilities setup data', err);
                setErrorMessage('Failed to load menu list and capabilities structure.');
            }
        };
        fetchSetupData();
    }, []);

    // Load existing role capabilities when selection changes
    useEffect(() => {
        const fetchRoleCapabilities = async () => {
            const hasRole = granteeType === 'role' || granteeType === 'designation_role';
            
            if (hasRole && !selectedRole) {
                setStagedCapabilities(new Set());
                return;
            }

            setLoading(true);
            setSavingState('');
            setErrorMessage('');
            
            try {
                const res = await axiosInstance.post('/populate/read/roles', {
                    filter: { _id: selectedRole },
                    limit: 1
                });
                const role = res.data?.data?.[0];
                
                if (role && role.capabilities) {
                    // Fetch capability documents to get keys
                    const capIds = role.capabilities.map(c => getCleanId(c));
                    const capsRes = await axiosInstance.post('/populate/read/capabilities', {
                        filter: { _id: { $in: capIds } },
                        limit: 1000
                    });
                    const caps = capsRes.data?.data || [];
                    
                    const allowed = new Set();
                    caps.forEach(c => {
                        if (c.key) allowed.add(c.key);
                    });
                    setStagedCapabilities(allowed);
                } else {
                    setStagedCapabilities(new Set());
                }
            } catch (err) {
                console.error('Failed to fetch role capabilities', err);
                setErrorMessage('Error fetching capabilities settings.');
            } finally {
                setLoading(false);
            }
        };
        fetchRoleCapabilities();
    }, [granteeType, selectedRole, selectedDesignation]);

    // Save changes automatically in background (supports single key toggle OR batch keys update)
    const handleSaveCapability = async (batchUpdates = null, customKeyToToggle = null) => {
        setSavingState('saving');
        setErrorMessage('');

        try {
            const nextStaged = new Set(stagedCapabilities);

            if (batchUpdates) {
                const { toAdd = [], toRemove = [] } = batchUpdates;
                toAdd.forEach(k => nextStaged.add(k));
                toRemove.forEach(k => nextStaged.delete(k));
            } else if (customKeyToToggle) {
                if (stagedCapabilities.has(customKeyToToggle)) {
                    nextStaged.delete(customKeyToToggle);
                } else {
                    nextStaged.add(customKeyToToggle);
                }
            }

            // Optimistic UI state update
            setStagedCapabilities(nextStaged);

            // Fetch ObjectIds for staged keys
            const allCapabilityDocs = await axiosInstance.post('/populate/read/capabilities', {
                filter: {
                    key: { $in: Array.from(nextStaged) }
                },
                limit: 1000
            });
            const capabilityDocs = allCapabilityDocs.data?.data || [];
            const capabilityIds = capabilityDocs.map(c => getCleanId(c._id));

            await axiosInstance.post(`/populate/update/roles/${selectedRole}`, {
                capabilities: capabilityIds
            });

            setSavingState('saved');
            await refreshPermissions();
        } catch (err) {
            console.error('Auto-save failed:', err);
            setErrorMessage('Auto-save failed. Some capability updates might not have saved.');
            setSavingState('error');
        }
    };

    // Collect all capability keys for a menu item (and all its children recursively if parent)
    const getAllKeysForItem = (item) => {
        const keys = new Set();
        (item.capabilities || []).forEach(c => {
            if (c.key) keys.add(c.key);
        });
        if (item.children && item.children.length > 0) {
            item.children.forEach(child => {
                (child.capabilities || []).forEach(c => {
                    if (c.key) keys.add(c.key);
                });
            });
        }
        return Array.from(keys);
    };

    // Toggle ALL capabilities for a row (and its sub-menu children if parent)
    const handleToggleAllForRow = (item) => {
        const itemKeys = getAllKeysForItem(item);
        if (itemKeys.length === 0) return;

        const allSelected = itemKeys.every(k => stagedCapabilities.has(k));

        if (allSelected) {
            // Deselect all
            handleSaveCapability({ toRemove: itemKeys });
        } else {
            // Select all
            handleSaveCapability({ toAdd: itemKeys });
        }
    };

    // Global Select All
    const handleSelectAllGlobal = () => {
        const allKeys = new Set();
        menuTree.forEach(parent => {
            getAllKeysForItem(parent).forEach(k => allKeys.add(k));
        });
        handleSaveCapability({ toAdd: Array.from(allKeys) });
    };

    // Global Clear All
    const handleClearAllGlobal = () => {
        const allKeys = new Set();
        menuTree.forEach(parent => {
            getAllKeysForItem(parent).forEach(k => allKeys.add(k));
        });
        handleSaveCapability({ toRemove: Array.from(allKeys) });
    };

    const toggleNodeExpanded = (nodeId) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const isSelectionComplete = () => {
        if (granteeType === 'role') return !!selectedRole;
        if (granteeType === 'designation') return !!selectedDesignation;
        return !!selectedRole && !!selectedDesignation;
    };

    const getCapLabel = (cap) => {
        const action = (cap.action || '').toLowerCase();
        let icon = '';
        if (action === 'view') icon = '👁️';
        else if (action === 'create') icon = '➕';
        else if (action === 'read') icon = '📖';
        else if (action === 'update') icon = '📝';
        else if (action === 'delete') icon = '🗑️';
        
        if (icon) {
            return (
                <span className="flex items-center gap-1 justify-center">
                    <span className="text-[11px]">{icon}</span>
                    <span className="hidden sm:inline text-[11px] font-semibold capitalize">{action}</span>
                </span>
            );
        }
        return (
            <span className="flex items-center justify-center">
                <span className="text-[11px] font-semibold capitalize">{cap.label || cap.key}</span>
            </span>
        );
    };

    // Render a menu item row with distinct parent vs child styling
    const renderMenuRow = (item, isChild = false) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedNodes.has(item._id);

        const sidebarCapabilities = item.capabilities || [];
        const sidebarCapKeys = sidebarCapabilities.map(c => c.key);
        const allItemKeys = getAllKeysForItem(item);
        const isAllSelected = allItemKeys.length > 0 && allItemKeys.every(k => stagedCapabilities.has(k));
        const isPartiallySelected = !isAllSelected && allItemKeys.some(k => stagedCapabilities.has(k));

        const standardCapabilities = sidebarCapabilities.filter(c => 
            c.action && ['view', 'create', 'read', 'update', 'delete'].includes(c.action)
        );

        if (!isChild) {
            // PARENT MODULE CONTAINER CARD
            return (
                <div key={item._id} className="w-full bg-surface border border-hairline-soft rounded-lg mb-2 overflow-hidden shadow-xs">
                    {/* PARENT HEADER BAR */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 px-3 bg-canvas/80 border-b border-hairline-soft">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {hasChildren ? (
                                <button
                                    type="button"
                                    onClick={() => toggleNodeExpanded(item._id)}
                                    className="p-1 rounded-md bg-surface hover:bg-accent-light/40 text-accent transition-colors flex items-center justify-center border border-hairline-soft"
                                    style={{ minWidth: '24px', minHeight: '24px' }}
                                >
                                    {isExpanded ? (
                                        <ChevronDownIcon className="w-3.5 h-3.5 text-accent" />
                                    ) : (
                                        <ChevronRightIcon className="w-3.5 h-3.5 text-accent" />
                                    )}
                                </button>
                            ) : (
                                <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center">
                                    <FolderIcon className="w-3.5 h-3.5 text-accent" />
                                </div>
                            )}

                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="text-[13px] font-bold text-ink tracking-tight">{item.title}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-accent/10 text-accent border border-accent/20">
                                    Parent Module
                                </span>
                                {hasChildren && (
                                    <span className="text-[11px] text-ink-muted font-bold">
                                        ({item.children.length} sub-menus)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* PARENT INLINE CONTROLS */}
                        <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                            {/* Toggle All Button for Parent */}
                            {allItemKeys.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handleToggleAllForRow(item)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 border transition-all ${
                                        isAllSelected
                                            ? 'bg-accent text-white border-accent shadow-xs'
                                            : isPartiallySelected
                                            ? 'bg-accent/20 text-accent border-accent/40'
                                            : 'bg-surface hover:bg-canvas border-hairline text-ink-muted'
                                    }`}
                                >
                                    <SparklesIcon className="w-3 h-3" />
                                    <span>{isAllSelected ? 'All Granted' : 'Grant All ⚡'}</span>
                                </button>
                            )}

                            {/* Direct Parent Capabilities if any */}
                            {standardCapabilities.map(cap => {
                                const capKey = cap.key;
                                const isChecked = stagedCapabilities.has(cap.key);
                                return (
                                    <button
                                        key={capKey}
                                        type="button"
                                        onClick={() => handleSaveCapability(null, capKey)}
                                        className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 border transition-all ${
                                            isChecked
                                                ? 'bg-accent/10 border-accent/30 text-accent'
                                                : 'bg-surface border-hairline text-ink-muted hover:border-hairline'
                                        }`}
                                    >
                                        <div className={`w-3 h-3 rounded flex items-center justify-center border transition-all ${
                                            isChecked ? 'bg-accent border-transparent text-white' : 'border-hairline bg-canvas'
                                        }`}>
                                            {isChecked && <CheckIcon className="w-2 h-2" />}
                                        </div>
                                        {getCapLabel(cap)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* CHILDREN SUB-MENU CONTAINER */}
                    {hasChildren && isExpanded && (
                        <div className="p-1.5 pl-3 sm:pl-6 bg-surface/30 border-l-2 border-accent/40 ml-3 my-1 flex flex-col gap-1">
                            {item.children.map(child => renderMenuRow(child, true))}
                        </div>
                    )}
                </div>
            );
        }

        // CHILD SUB-MENU ROW
        return (
            <div key={item._id} className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 px-2.5 rounded-md bg-canvas/60 border border-hairline-soft hover:bg-accent-light/20 transition-all">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Tree branch visual icon */}
                    <span className="text-accent/60 font-mono text-[11px] font-bold flex-shrink-0">└──</span>
                    <DocumentIcon className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" />

                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-[11px] font-bold text-ink truncate">{item.title}</span>
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-canvas text-ink-muted border border-hairline-soft">
                            Sub-Menu
                        </span>
                    </div>
                </div>

                {/* CHILD INLINE CONTROLS */}
                <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                    {/* Row Select All button */}
                    {sidebarCapKeys.length > 0 && (
                        <button
                            type="button"
                            onClick={() => handleToggleAllForRow(item)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                                isAllSelected
                                    ? 'bg-accent/20 border-accent/40 text-accent font-bold'
                                    : 'bg-surface hover:bg-canvas border-hairline-soft text-ink-muted'
                            }`}
                        >
                            {isAllSelected ? '✓ All' : 'Select All'}
                        </button>
                    )}

                    {standardCapabilities.map(cap => {
                        const capKey = cap.key;
                        const isChecked = stagedCapabilities.has(cap.key);
                        return (
                            <button
                                key={capKey}
                                type="button"
                                onClick={() => handleSaveCapability(null, capKey)}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 border transition-all ${
                                    isChecked
                                        ? 'bg-accent/10 border-accent/30 text-accent'
                                        : 'bg-surface border-hairline-soft text-ink-muted hover:border-hairline'
                                }`}
                            >
                                <div className={`w-3 h-3 rounded flex items-center justify-center border transition-all ${
                                    isChecked ? 'bg-accent border-transparent text-white' : 'border-hairline bg-canvas'
                                }`}>
                                    {isChecked && <CheckIcon className="w-2 h-2" />}
                                </div>
                                {getCapLabel(cap)}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="lmx-content" data-module="hr">
            {/* Header section with role selection & real-time status */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 border-b border-hairline-soft pb-2">
                <div>
                    <span className="lmx-page-eyebrow text-accent uppercase tracking-[0.15em] text-[10px]">Settings & Security</span>
                    <h1 className="text-[18px] font-extrabold text-ink tracking-tight mt-0.5 flex items-center gap-2">
                        <ShieldCheckIcon className="w-5 h-5 text-accent" />
                        Designation Permissions
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3 flex-shrink-0 self-end sm:self-center">
                    {/* Select Role */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Role:</span>
                        <div className="relative w-44">
                            <select
                                value={selectedRole}
                                onChange={(e) => { setSelectedRole(e.target.value); setSavingState(''); }}
                                className="lmx-input w-full py-1 pl-2.5 pr-7 text-[11px] font-bold text-ink bg-canvas border border-hairline focus:border-accent focus:ring-2 focus:ring-accent/15 rounded-md appearance-none transition-all"
                            >
                                <option value="">— Choose Role —</option>
                                {roles.map(r => (
                                    <option key={r._id} value={r._id}>{r.name}</option>
                                ))}
                            </select>
                            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-muted pointer-events-none" />
                        </div>
                    </div>

                    {/* Instant status indicators */}
                    <div className="flex items-center gap-2">
                        {savingState === 'saving' && (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent-light/50 text-accent text-[11px] font-bold shadow-xs animate-pulse border border-accent/20">
                                <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                <span>Auto-saving...</span>
                            </div>
                        )}
                        {savingState === 'saved' && (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs transition-all duration-300">
                                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Saved</span>
                            </div>
                        )}
                        {savingState === 'error' && (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-[11px] font-bold border border-rose-250 dark:border-rose-800/40 shadow-xs">
                                <XMarkIcon className="w-3.5 h-3.5 text-rose-500" />
                                <span>Error</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tree Table Editor */}
            {!isSelectionComplete() ? (
                <div className="tracker-card-plain py-12 flex flex-col items-center justify-center text-center bg-surface/30 border border-dashed border-hairline-soft rounded-lg shadow-xs">
                    <ShieldCheckIcon className="w-10 h-10 text-ink-muted/30 mb-2" />
                    <p className="text-sm font-bold text-ink-muted">Select role above to configure capabilities</p>
                </div>
            ) : loading ? (
                <div className="tracker-card-plain py-14 flex flex-col items-center justify-center bg-surface/30 border border-hairline-soft rounded-lg shadow-xs">
                    <ArrowPathIcon className="w-7 h-7 text-accent animate-spin mb-2" />
                    <p className="text-xs font-bold text-ink-muted">Loading capability settings...</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {/* Global Actions Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-3 py-2 rounded-lg bg-canvas border border-hairline-soft">
                        <div className="flex items-center gap-1.5">
                            <InformationCircleIcon className="w-4 h-4 text-accent flex-shrink-0" />
                            <span className="text-[11px] text-ink-muted font-medium">
                                Active Capabilities: <strong>{stagedCapabilities.size}</strong> granted
                            </span>
                        </div>

                        {/* Global Quick Buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                                type="button"
                                onClick={handleSelectAllGlobal}
                                className="px-2.5 py-1 rounded-md bg-accent text-white text-[11px] font-bold flex items-center gap-1 shadow-xs hover:bg-accent/90 transition-all"
                            >
                                <SparklesIcon className="w-3 h-3" />
                                <span>Grant All Permissions ⚡</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleClearAllGlobal}
                                className="px-2.5 py-1 rounded-md bg-surface hover:bg-canvas border border-hairline-soft text-ink-muted text-[11px] font-semibold transition-all"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    {/* Error Alerts */}
                    {errorMessage && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-800/40 rounded-lg text-rose-700 dark:text-rose-350 shadow-xs">
                            <XMarkIcon className="w-4 h-4 flex-shrink-0 text-rose-500" />
                            <p className="text-[11px] font-semibold">{errorMessage}</p>
                        </div>
                    )}

                    {/* Hierarchical Parent-Child Tree View */}
                    <div className="w-full flex flex-col">
                        {menuTree.length === 0 ? (
                            <div className="py-8 text-center text-ink-muted text-xs">No sidebar menu items found</div>
                        ) : (
                            menuTree.map(parent => renderMenuRow(parent))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline custom icon components to keep layout dependency-free and robust
function CheckCircleIcon({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.748-5.25Z" clipRule="evenodd" />
        </svg>
    );
}
