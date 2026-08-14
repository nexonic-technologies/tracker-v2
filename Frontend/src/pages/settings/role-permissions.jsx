import React, { useState, useEffect } from 'react';
import axiosInstance from '@api/axiosInstance';
import {
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    ShieldCheckIcon,
    TableCellsIcon,
    SquaresPlusIcon,
    FunnelIcon,
    CpuChipIcon,
    MagnifyingGlassIcon,
    ChevronDownIcon,
    InformationCircleIcon,
    SparklesIcon,
    EyeIcon,
    EyeSlashIcon,
    Bars3Icon,
} from '@heroicons/react/24/solid';
import { WIDGET_REGISTRY, WIDGET_GROUPS } from '@pages/dashboard/config/dashboardConfig';
import { usePermission } from '@context/permissionProvider';
import { useTenant } from '@context/TenantContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIONS = ['read', 'create', 'update', 'delete'];

const ACTION_META = {
    read: { label: 'Read', gradient: 'from-sky-500 to-blue-600', bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800', glow: 'shadow-sky-200/50 dark:shadow-sky-900/30' },
    create: { label: 'Create', gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', glow: 'shadow-emerald-200/50 dark:shadow-emerald-900/30' },
    update: { label: 'Update', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', glow: 'shadow-amber-200/50 dark:shadow-amber-900/30' },
    delete: { label: 'Delete', gradient: 'from-rose-500 to-red-600', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', glow: 'shadow-rose-200/50 dark:shadow-rose-900/30' },
};

const REGISTRY_FUNCTIONS = [
    { key: 'isSelf', label: 'Is Self', desc: 'Allows user to access their own record (matched by _id, userId, employee)', icon: '👤' },
    { key: 'isTeamMember', label: 'Is Team Member', desc: 'Allows manager to access records of their direct reports', icon: '👥' },
    { key: 'isManager', label: 'Is Manager', desc: 'Allows users with Manager role to access these records', icon: '🏢' },
    { key: 'isHR', label: 'Is HR', desc: 'Allows users with HR role to access these records', icon: '📋' },
    { key: 'isAssigned', label: 'Is Assigned', desc: 'Allows access when user is assigned to the record (assignedTo field)', icon: '📌' },
    { key: 'isCreatedBy', label: 'Is Created By', desc: 'Allows access when user created the record (createdBy, assignedBy, author)', icon: '✏️' },
    { key: 'isRecipient', label: 'Is Recipient', desc: 'Allows access when user is the recipient of a notification/message', icon: '📨' },
    { key: 'isSender', label: 'Is Sender', desc: 'Allows access when user is the sender of a notification/message', icon: '📤' },
    { key: 'isRef', label: 'Is Reference', desc: 'Allows any authenticated user to access basic reference data (dropdowns)', icon: '🔗' },
];

const GROUP_COLORS = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    purple: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
};

// ─── Premium Card Wrapper ─────────────────────────────────────────────────────

const PremiumCard = ({ children, className = '', noPad = false }) => (
    <div className={`
        bg-white/80 dark:bg-gray-800/80
        backdrop-blur-xl
        border border-gray-200/60 dark:border-gray-700/60
        rounded-xl
        shadow-lg shadow-gray-200/40 dark:shadow-black/20
        ${noPad ? '' : 'p-4'}
        ${className}
    `}>
        {children}
    </div>
);

// ─── Reusable Small Components ─────────────────────────────────────────────────

const TabButton = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={`
            flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all duration-300
            ${active
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-200'
            }
        `}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
);

const ActionBadge = ({ action, active, onClick }) => {
    const meta = ACTION_META[action];
    return (
        <button
            onClick={onClick}
            className={`
                group relative px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-all duration-300 flex items-center gap-1.5 min-w-[90px] justify-center
                ${active
                    ? `${meta.bg} ${meta.text} ${meta.border} shadow-md ${meta.glow} scale-[1.02]`
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                }
            `}
        >
            {active
                ? <CheckCircleIcon className="w-3.5 h-3.5 drop-shadow-sm" />
                : <XCircleIcon className="w-3.5 h-3.5 opacity-40" />
            }
            {meta.label}
        </button>
    );
};

const SaveBar = ({ onSave, saving, message }) => (
    <div className="flex justify-end items-center gap-3 pt-3 mt-auto shrink-0">
        {message && (
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${message.includes('Error') || message.includes('failed') || message.includes('Failed')
                ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                }`}>
                {message}
            </span>
        )}
        <button
            onClick={onSave}
            disabled={saving}
            className={`
                px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300
                bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
                hover:scale-[1.02] active:scale-[0.98]
                ${saving ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            {saving ? (
                <span className="flex items-center gap-1.5">
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                    Saving…
                </span>
            ) : (
                <span className="flex items-center gap-1.5">
                    <SparklesIcon className="w-3.5 h-3.5" />
                    Save Changes
                </span>
            )}
        </button>
    </div>
);

// Helper to clean ObjectId strings
const getCleanId = (id) => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id.$oid) return id.$oid;
    if (id._id) return getCleanId(id._id);
    return id.toString();
};

const DataAccessTab = ({ models, policies, navMap, navChanges, sidebars, onToggle, onModelToggleAll, onGlobalToggle, onNavToggle, onSave, saving, message }) => {
    const [search, setSearch] = useState('');
    const [onlyConfigured, setOnlyConfigured] = useState(false);

    const configuredCount = models.filter(m => ACTIONS.some(a => policies[m]?.[a])).length;

    const visibleModels = models.filter(m => {
        const matchesSearch = m.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = onlyConfigured ? ACTIONS.some(a => policies[m]?.[a]) : true;
        return matchesSearch && matchesFilter;
    });

    // Navigation grouping from sidebars list
    const parents = sidebars.filter(i => i.isParent || !i.parentId);
    const children = sidebars.filter(i => i.parentId);

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-4">
            {/* ── Section 1: Resource Access (RBAC) ── */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search model… e.g. ticket"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="
                                w-full pl-9 pr-4 py-2 text-sm font-medium
                                border border-gray-200 dark:border-gray-700 rounded-xl
                                bg-white/80 dark:bg-gray-800/60 backdrop-blur
                                text-gray-900 dark:text-white placeholder-gray-400
                                focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-600
                                transition-all duration-300
                            "
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <XCircleIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter chips */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => setOnlyConfigured(v => !v)}
                            className={`
                                flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-300
                                ${onlyConfigured
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-700'
                                }
                            `}
                        >
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            Configured only
                            {configuredCount > 0 && (
                                <span className={`
                                    px-1.5 py-0.5 rounded-md text-[10px] font-black leading-none
                                    ${onlyConfigured ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'}
                                `}>
                                    {configuredCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={onGlobalToggle}
                            className="px-3 py-2 text-xs font-bold bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-600 dark:text-gray-200 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-300 hover:scale-105"
                        >
                            Toggle All
                        </button>
                    </div>

                    {/* Match count */}
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0">
                        {visibleModels.length} / {models.length} models
                    </span>
                </div>

                <PremiumCard noPad className="overflow-hidden max-h-[400px] flex flex-col">
                    <div className="overflow-auto flex-1">
                        {visibleModels.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
                                <MagnifyingGlassIcon className="w-10 h-10 mb-3 opacity-30" />
                                <p className="text-sm font-semibold">
                                    {search ? `No models match "${search}"` : 'No configured models yet'}
                                </p>
                                {search && (
                                    <button
                                        onClick={() => setSearch('')}
                                        className="mt-2 text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors"
                                    >
                                        Clear search
                                    </button>
                                )}
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750">
                                        <th className="px-4 py-3 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.15em]">
                                            Model
                                        </th>
                                        {ACTIONS.map(action => (
                                            <th key={action} className="px-2 py-3 text-center">
                                                <span className={`text-xs font-black uppercase tracking-[0.15em] ${ACTION_META[action].text}`}>
                                                    {ACTION_META[action].label}
                                                </span>
                                            </th>
                                        ))}
                                        {/* Nav column header */}
                                        <th className="px-2 py-3 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-xs font-black text-violet-500 dark:text-violet-400 uppercase tracking-[0.15em]">Nav</span>
                                                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-600 normal-case tracking-normal">(global)</span>
                                            </div>
                                        </th>
                                        <th className="px-2 py-3 text-center">
                                            <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">All</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleModels.map((model, i) => {
                                        const p = policies[model] || {};
                                        const isAllSelected = ACTIONS.every(a => p[a]);
                                        const anySelected = ACTIONS.some(a => p[a]);

                                        const navItem = navMap[model];
                                        const navItemIdStr = navItem ? getCleanId(navItem._id) : '';
                                        const effectiveNavVisibility = navChanges[navItemIdStr] ?? navItem?.visibility ?? null;
                                        const hasNavItem = !!navItem;
                                        const isNavPublic = effectiveNavVisibility === 'public';
                                        const isNavChanged = navChanges[navItemIdStr] !== undefined;

                                        return (
                                            <tr
                                                key={model}
                                                className={`
                                                    border-b border-gray-100 dark:border-gray-700/50 transition-all duration-200
                                                    hover:bg-blue-50/50 dark:hover:bg-blue-900/10
                                                    ${anySelected
                                                        ? 'bg-blue-50/30 dark:bg-blue-900/5'
                                                        : i % 2 === 0 ? 'bg-white dark:bg-gray-800/50' : 'bg-gray-50/50 dark:bg-gray-800/30'
                                                    }
                                                `}
                                            >
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        {anySelected && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                                        )}
                                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 capitalize">
                                                            {model}
                                                        </span>
                                                    </div>
                                                </td>
                                                {ACTIONS.map(action => (
                                                    <td key={action} className="px-2 py-2 text-center">
                                                        <div className="flex justify-center">
                                                            <ActionBadge
                                                                action={action}
                                                                active={!!p[action]}
                                                                onClick={() => onToggle(model, action)}
                                                            />
                                                        </div>
                                                    </td>
                                                ))}
                                                {/* Inline Nav toggle */}
                                                <td className="px-2 py-2 text-center">
                                                    {hasNavItem ? (
                                                        <button
                                                            title={isNavPublic
                                                                ? 'Always visible (click to make permission-based)'
                                                                : 'Visible when Read is granted (click to make always visible)'}
                                                            onClick={() => onNavToggle(model)}
                                                            className={`
                                                                relative inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border-2
                                                                transition-all duration-300 whitespace-nowrap
                                                                ${isNavPublic
                                                                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700'
                                                                    : 'bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-violet-300 dark:hover:border-violet-700'
                                                                }
                                                            `}
                                                        >
                                                            {isNavPublic
                                                                ? <><EyeIcon className="w-3 h-3" /> Always</>
                                                                : <><EyeSlashIcon className="w-3 h-3" /> Auto</>
                                                            }
                                                            {isNavChanged && (
                                                                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 border border-white dark:border-gray-800" />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <button
                                                        onClick={() => onModelToggleAll(model)}
                                                        className={`
                                                            px-3.5 py-1.5 text-xs font-bold rounded-lg border-2 transition-all duration-300
                                                            ${isAllSelected
                                                                ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 border-transparent text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:scale-105'
                                                            }
                                                        `}
                                                    >
                                                        {isAllSelected ? 'None' : 'All'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </PremiumCard>
            </div>



            <SaveBar onSave={onSave} saving={saving} message={message} />
        </div>
    );
};

// ─── Tab 2: Field Policies (FBAC) ─────────────────────────────────────────────

const FieldCheckList = ({ fields, selected, onToggle, onSelectAll, onClearAll, searchQuery }) => {
    const filtered = fields.filter(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return (
        <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {selected.length} of {fields.length} selected
                </span>
                <div className="flex gap-3">
                    <button onClick={onSelectAll} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30">
                        Select All
                    </button>
                    <button onClick={onClearAll} className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50">
                        Clear
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50 min-h-0 max-h-[320px]">
                {filtered.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-sm">No fields match your search</div>
                ) : (
                    filtered.map(field => {
                        const isSelected = selected.includes(field);
                        return (
                            <label
                                key={field}
                                className={`
                                    flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-all duration-200
                                    border-b border-gray-50 dark:border-gray-700/30 last:border-0
                                    hover:bg-blue-50/60 dark:hover:bg-blue-900/20
                                    ${isSelected ? 'bg-blue-50/80 dark:bg-blue-950/30' : ''}
                                `}
                            >
                                <div className={`
                                    w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0
                                    transition-all duration-300
                                    ${isSelected
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-transparent shadow-md shadow-blue-500/30 scale-110'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                                    }
                                `}>
                                    {isSelected && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <input type="checkbox" className="sr-only" checked={isSelected} onChange={() => onToggle(field)} />
                                <span className={`text-sm font-mono font-semibold tracking-wide ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                    {field}
                                </span>
                            </label>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const FieldPoliciesTab = ({ selectedRole, models, fieldMap, onSave, saving, message }) => {
    const [selectedModel, setSelectedModel] = useState('');
    const [activeAction, setActiveAction] = useState('read');
    const [fieldPolicies, setFieldPolicies] = useState({});
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!selectedModel || !selectedRole) return;
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.post('/populate/read/access_policies', {
                    filter: { role: selectedRole, modelName: selectedModel },
                    limit: 1,
                });
                const doc = res.data?.data?.[0];
                if (doc) {
                    setFieldPolicies({
                        allowAccess: doc.allowAccess || { read: [], create: [], update: [], delete: [] },
                        forbiddenAccess: doc.forbiddenAccess || { read: [], create: [], update: [], delete: [] },
                    });
                } else {
                    setFieldPolicies({
                        allowAccess: { read: [], create: [], update: [], delete: [] },
                        forbiddenAccess: { read: [], create: [], update: [], delete: [] },
                    });
                }
            } catch (err) {
                console.error('Failed to load field policy', err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [selectedModel, selectedRole]);

    const fields = fieldMap[selectedModel] || [];

    const toggleAllow = (field) => {
        setFieldPolicies(prev => {
            const current = prev.allowAccess?.[activeAction] || [];
            const next = current.includes(field) ? current.filter(f => f !== field) : [...current, field];
            return { ...prev, allowAccess: { ...prev.allowAccess, [activeAction]: next } };
        });
    };
    const toggleForbidden = (field) => {
        setFieldPolicies(prev => {
            const current = prev.forbiddenAccess?.[activeAction] || [];
            const next = current.includes(field) ? current.filter(f => f !== field) : [...current, field];
            return { ...prev, forbiddenAccess: { ...prev.forbiddenAccess, [activeAction]: next } };
        });
    };

    const selectAllAllow = () => setFieldPolicies(prev => ({ ...prev, allowAccess: { ...prev.allowAccess, [activeAction]: [...fields] } }));
    const clearAllAllow = () => setFieldPolicies(prev => ({ ...prev, allowAccess: { ...prev.allowAccess, [activeAction]: [] } }));
    const selectAllForbidden = () => setFieldPolicies(prev => ({ ...prev, forbiddenAccess: { ...prev.forbiddenAccess, [activeAction]: [...fields] } }));
    const clearAllForbidden = () => setFieldPolicies(prev => ({ ...prev, forbiddenAccess: { ...prev.forbiddenAccess, [activeAction]: [] } }));

    const handleSave = () => onSave(selectedModel, fieldPolicies);

    if (!selectedModel) {
        return (
            <div className="flex flex-col flex-1 min-h-0 gap-3">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Select a model to configure field-level access
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {models.map(m => (
                        <button
                            key={m}
                            onClick={() => setSelectedModel(m)}
                            className="
                                group px-3.5 py-2.5 text-sm font-bold text-left capitalize
                                bg-white dark:bg-gray-800/60 backdrop-blur
                                border border-gray-100 dark:border-gray-700
                                rounded-xl
                                hover:border-blue-300 dark:hover:border-blue-700
                                hover:bg-blue-50/60 dark:hover:bg-blue-900/20
                                hover:shadow-lg hover:shadow-blue-100/50 dark:hover:shadow-blue-900/20
                                hover:scale-[1.02]
                                transition-all duration-300
                                text-gray-700 dark:text-gray-300
                            "
                        >
                            {m}
                        </button>
                    ))}
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                    <FunnelIcon className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-semibold text-base">Select a model above</p>
                </div>
            </div>
        );
    }

    const allowFields = fieldPolicies.allowAccess?.[activeAction] || [];
    const forbiddenFields = fieldPolicies.forbiddenAccess?.[activeAction] || [];

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-3">
            {/* Breadcrumb + hint */}
            <div className="flex items-center gap-4 flex-wrap">
                <button
                    onClick={() => setSelectedModel('')}
                    className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                    ← All Models
                </button>
                <span className="text-gray-300 dark:text-gray-600 text-lg">/</span>
                <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-sm shadow-blue-500/20 capitalize">
                    {selectedModel}
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                    <InformationCircleIcon className="w-4 h-4" />
                    Empty = no field restriction (inherits RBAC)
                </span>
            </div>

            {/* Action tabs */}
            <div className="flex gap-1.5 p-1 bg-gray-100/80 dark:bg-gray-700/40 rounded-xl backdrop-blur">
                {ACTIONS.map(action => {
                    const meta = ACTION_META[action];
                    const isActive = activeAction === action;
                    const count = (fieldPolicies.allowAccess?.[action] || []).length + (fieldPolicies.forbiddenAccess?.[action] || []).length;
                    return (
                        <button
                            key={action}
                            onClick={() => setActiveAction(action)}
                            className={`
                                flex-1 px-3 py-2 text-sm font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2
                                ${isActive
                                    ? `bg-gradient-to-r ${meta.gradient} text-white shadow-lg ${meta.glow} scale-[1.01]`
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-600/40'
                                }
                            `}
                        >
                            {meta.label}
                            {count > 0 && !isActive && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search fields…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="
                        w-full pl-9 pr-4 py-2.5 text-sm font-medium
                        border border-gray-100 dark:border-gray-700 rounded-xl
                        bg-white/80 dark:bg-gray-800/60 backdrop-blur
                        text-gray-900 dark:text-white placeholder-gray-400
                        focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-600
                        transition-all duration-300
                    "
                />
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    <span className="font-semibold">Loading field policy…</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
                    {/* Allow Access */}
                    <PremiumCard className="flex flex-col gap-3 !border-emerald-200/60 dark:!border-emerald-800/40 !bg-emerald-50/30 dark:!bg-emerald-950/10">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/30" />
                            <h4 className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Allow Fields</h4>
                            <span className="text-xs font-medium text-emerald-500/60 dark:text-emerald-600 ml-auto">(explicit allowlist)</span>
                        </div>
                        <FieldCheckList
                            fields={fields}
                            selected={allowFields}
                            onToggle={toggleAllow}
                            onSelectAll={selectAllAllow}
                            onClearAll={clearAllAllow}
                            searchQuery={searchQuery}
                        />
                    </PremiumCard>

                    {/* Forbidden Access */}
                    <PremiumCard className="flex flex-col gap-3 !border-rose-200/60 dark:!border-rose-800/40 !bg-rose-50/30 dark:!bg-rose-950/10">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-rose-500 to-red-500 shadow-md shadow-rose-500/30" />
                            <h4 className="text-sm font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">Forbidden Fields</h4>
                            <span className="text-xs font-medium text-rose-500/60 dark:text-rose-600 ml-auto">(explicit blocklist)</span>
                        </div>
                        <FieldCheckList
                            fields={fields}
                            selected={forbiddenFields}
                            onToggle={toggleForbidden}
                            onSelectAll={selectAllForbidden}
                            onClearAll={clearAllForbidden}
                            searchQuery={searchQuery}
                        />
                    </PremiumCard>
                </div>
            )}

            <SaveBar onSave={handleSave} saving={saving} message={message} />
        </div>
    );
};

// ─── Tab 3: Registry & Conditions (FBAC) ──────────────────────────────────────

const RegistryTab = ({ selectedRole, models, onSave, saving, message }) => {
    const [selectedModel, setSelectedModel] = useState('');
    const [activeRegistry, setActiveRegistry] = useState(new Set());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedModel || !selectedRole) return;
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.post('/populate/read/access_policies', {
                    filter: { role: selectedRole, modelName: selectedModel },
                    limit: 1,
                });
                const doc = res.data?.data?.[0];
                setActiveRegistry(new Set(doc?.registry || []));
            } catch (err) {
                console.error('Failed to load registry config', err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [selectedModel, selectedRole]);

    const toggleRegistry = (key) => {
        setActiveRegistry(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const handleSave = () => onSave(selectedModel, { registry: [...activeRegistry] });

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-3">
            {/* Model Selector */}
            <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                    Select Model
                </label>
                <div className="relative max-w-sm">
                    <select
                        value={selectedModel}
                        onChange={e => setSelectedModel(e.target.value)}
                        className="
                            w-full pl-4 pr-10 py-2.5 text-sm font-bold
                            border border-gray-100 dark:border-gray-700 rounded-xl
                            bg-white/80 dark:bg-gray-800/60 backdrop-blur
                            text-gray-900 dark:text-white appearance-none
                            focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-600
                            focus:outline-none transition-all duration-300 capitalize
                        "
                    >
                        <option value="">— Choose a Model —</option>
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {!selectedModel ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 py-10">
                    <CpuChipIcon className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-base font-bold">Select a model to configure</p>
                    <p className="text-sm mt-1 opacity-60">Registry functions add fine-grained conditional access on top of RBAC</p>
                </div>
            ) : loading ? (
                <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    <span className="font-semibold">Loading…</span>
                </div>
            ) : (
                <>
                    <PremiumCard noPad className="overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-750 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider">Registry Functions</h4>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                                    <span className="font-bold text-blue-600 dark:text-blue-400">{activeRegistry.size}</span> of {REGISTRY_FUNCTIONS.length} active for <span className="font-bold capitalize">{selectedModel}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setActiveRegistry(activeRegistry.size === REGISTRY_FUNCTIONS.length ? new Set() : new Set(REGISTRY_FUNCTIONS.map(r => r.key)))}
                                className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200"
                            >
                                {activeRegistry.size === REGISTRY_FUNCTIONS.length ? 'Disable All' : 'Enable All'}
                            </button>
                        </div>

                        <div>
                            {REGISTRY_FUNCTIONS.map((fn, i) => {
                                const isOn = activeRegistry.has(fn.key);
                                return (
                                    <div
                                        key={fn.key}
                                        onClick={() => toggleRegistry(fn.key)}
                                        className={`
                                            flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-all duration-300
                                            border-b border-gray-50 dark:border-gray-700/50 last:border-0
                                            ${isOn
                                                ? 'bg-blue-50/80 dark:bg-blue-950/20'
                                                : `hover:bg-gray-50 dark:hover:bg-gray-700/30 ${i % 2 === 0 ? 'bg-white dark:bg-gray-800/50' : 'bg-gray-50/30 dark:bg-gray-800/30'}`
                                            }
                                        `}
                                    >
                                        {/* Emoji icon */}
                                        <span className="text-lg flex-shrink-0">{fn.icon}</span>

                                        {/* Toggle switch */}
                                        <div
                                            className={`
                                                relative flex-shrink-0 rounded-full transition-all duration-300
                                                ${isOn
                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30'
                                                    : 'bg-gray-200 dark:bg-gray-600'
                                                }
                                            `}
                                            style={{ height: '22px', width: '40px' }}
                                        >
                                            <div className={`
                                                absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-md
                                                transition-transform duration-300 ease-out
                                                ${isOn ? 'translate-x-[20px]' : 'translate-x-[2px]'}
                                            `} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-sm font-black font-mono ${isOn ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {fn.key}
                                                </span>
                                                <span className={`
                                                    text-xs px-2 py-0.5 rounded-lg font-bold
                                                    ${isOn
                                                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                                        : 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400'
                                                    }
                                                `}>
                                                    {fn.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                                                {fn.desc}
                                            </p>
                                        </div>

                                        {isOn && (
                                            <span className="flex-shrink-0 px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black shadow-sm shadow-blue-500/20 uppercase tracking-wider">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </PremiumCard>

                    <SaveBar onSave={handleSave} saving={saving} message={message} />
                </>
            )}
        </div>
    );
};

// ─── Tab 4: Dashboard Widgets ──────────────────────────────────────────────────

const DashboardWidgetsTab = ({ selectedRole }) => {
    const [enabledWidgets, setEnabledWidgets] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const grouped = Object.entries(WIDGET_GROUPS).map(([groupKey, groupMeta]) => ({
        key: groupKey,
        ...groupMeta,
        widgets: WIDGET_REGISTRY.filter((w) => w.group === groupKey),
    }));

    useEffect(() => {
        if (!selectedRole) return;
        const fetchWidgets = async () => {
            setLoading(true);
            setMessage('');
            try {
                const res = await axiosInstance.post('/populate/read/dashboard_widgets', {
                    filter: { role: selectedRole },
                    limit: 1,
                });
                const doc = res.data?.data?.[0];
                setEnabledWidgets(new Set(doc?.widgets || []));
            } catch (err) {
                console.error('Failed to load widget config', err);
            } finally {
                setLoading(false);
            }
        };
        fetchWidgets();
    }, [selectedRole]);

    const toggleWidget = (id) => {
        setEnabledWidgets((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const toggleGroup = (widgets) => {
        const allOn = widgets.every((w) => enabledWidgets.has(w.id));
        setEnabledWidgets((prev) => {
            const next = new Set(prev);
            widgets.forEach((w) => (allOn ? next.delete(w.id) : next.add(w.id)));
            return next;
        });
    };
    const toggleAll = () => {
        const allOn = WIDGET_REGISTRY.every((w) => enabledWidgets.has(w.id));
        setEnabledWidgets(allOn ? new Set() : new Set(WIDGET_REGISTRY.map((w) => w.id)));
    };
    const handleSave = async () => {
        setSaving(true);
        setMessage('Saving...');
        try {
            const res = await axiosInstance.post('/populate/bulk-upsert/dashboard_widgets', [
                { filter: { role: selectedRole }, body: { widgets: [...enabledWidgets] } },
            ]);
            setMessage(res.data.success ? '✓ Widget config saved!' : 'Save failed');
        } catch (err) {
            console.error(err);
            setMessage('Error saving widget config');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center py-20 text-gray-400">
                <ArrowPathIcon className="w-6 h-6 animate-spin mr-3" />
                <span className="font-semibold">Loading widget config…</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-black text-gray-800 dark:text-gray-100 text-base">{enabledWidgets.size}</span>
                    <span className="font-medium"> of {WIDGET_REGISTRY.length} widgets enabled</span>
                </p>
                <button
                    onClick={toggleAll}
                    className="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-600 dark:text-gray-200 rounded-lg hover:shadow-md transition-all duration-300 hover:scale-105"
                >
                    Toggle All
                </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3">
                {grouped.map(({ key, label, color, widgets }) => {
                    const allOn = widgets.every((w) => enabledWidgets.has(w.id));
                    const someOn = widgets.some((w) => enabledWidgets.has(w.id));
                    return (
                        <PremiumCard key={key} noPad className="overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-750 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${GROUP_COLORS[color] || GROUP_COLORS.blue}`}>
                                        {label}
                                    </span>
                                    {someOn && !allOn && (
                                        <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-lg">Partial</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => toggleGroup(widgets)}
                                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-all"
                                >
                                    {allOn ? 'Disable All' : 'Enable All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                {widgets.map((widget, i) => {
                                    const isOn = enabledWidgets.has(widget.id);
                                    return (
                                        <div
                                            key={widget.id}
                                            className={`
                                                p-3.5 flex items-start gap-3 cursor-pointer transition-all duration-300
                                                border-b border-r border-gray-50 dark:border-gray-700/40 last:border-r-0
                                                hover:bg-blue-50/40 dark:hover:bg-blue-900/10
                                                ${isOn ? 'bg-blue-50/60 dark:bg-blue-950/20' : 'bg-white dark:bg-gray-800/50'}
                                            `}
                                            onClick={() => toggleWidget(widget.id)}
                                        >
                                            <div className={`
                                                mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0
                                                transition-all duration-300
                                                ${isOn
                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/30 scale-110'
                                                    : 'border-2 border-gray-300 dark:border-gray-600'
                                                }
                                            `}>
                                                {isOn && (
                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold ${isOn ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    {widget.label}
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
                                                    {widget.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </PremiumCard>
                    );
                })}
            </div>

            <SaveBar onSave={handleSave} saving={saving} message={message} />
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const RoleAccessPolicy = () => {
    const { refresh: refreshPermissions } = usePermission();
    const { enabledModules } = useTenant();
    const [activeTab, setActiveTab] = useState('rbac');

    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState('');
    const [models, setModels] = useState([]);
    const [fieldMap, setFieldMap] = useState({});

    // navMap: modelName → sidebar doc (global, not per-role)
    const [navMap, setNavMap] = useState({});
    // sidebars: full list of sidebar items (for the nav tree)
    const [sidebars, setSidebars] = useState([]);
    // navChanges: sidebarId → new 'public'|'protected' (staged, saved with RBAC)
    const [navChanges, setNavChanges] = useState({});

    const [policies, setPolicies] = useState({});
    const [rawPolicies, setRawPolicies] = useState({});
    const [rbacLoading, setRbacLoading] = useState(false);
    const [rbacSaving, setRbacSaving] = useState(false);
    const [rbacMessage, setRbacMessage] = useState('');

    const [fbacSaving, setFbacSaving] = useState(false);
    const [fbacMessage, setFbacMessage] = useState('');

    const [regSaving, setRegSaving] = useState(false);
    const [regMessage, setRegMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rolesRes, modelsRes, sidebarRes, resourceRes] = await Promise.all([
                    axiosInstance.post('/populate/read/roles'),
                    axiosInstance.get('/config/models', { params: { fields: true } }),
                    axiosInstance.post('/populate/read/sidebars', {
                        filter: { isDeleted: { $ne: true } }, limit: 200,
                    }),
                    axiosInstance.post('/populate/read/resources', {
                        filter: { isActive: true }, limit: 200,
                    }),
                ]);
                const normalizedRoles = (rolesRes.data.data || []).map(r => ({ ...r, _id: r._id?.$oid || r._id }));
                setRoles(normalizedRoles);
                let rawModels = modelsRes.data.models || [];
                if (enabledModules && Array.isArray(enabledModules) && !enabledModules.includes('*') && enabledModules.length > 0) {
                    const normalizedMods = enabledModules.map(m => m.toString().toLowerCase());
                    rawModels = rawModels.filter(m => {
                        const mLower = m.toLowerCase();
                        if (['user', 'employee', 'department', 'designation', 'role', 'sidebar', 'notification', 'auditlog', 'company'].some(c => mLower.includes(c))) return true;
                        return normalizedMods.some(modKey => mLower.includes(modKey) || modKey.includes(mLower));
                    });
                }
                setModels(rawModels);
                setFieldMap(modelsRes.data.fields || {});

                // Build resourceId → modelName map
                const ridToModel = {};
                (resourceRes.data.data || []).forEach(r => {
                    if (r.modelName) ridToModel[getCleanId(r._id)] = r.modelName;
                });

                // Normalize sidebar IDs and store full list filtered by provisioned enabledModules
                const normalizedSidebars = (sidebarRes.data.data || [])
                    .filter(s => {
                        if (!enabledModules || !Array.isArray(enabledModules) || enabledModules.includes('*')) return true;
                        const key = (s.moduleKey || s.moduleId?.moduleId || s.moduleId || '').toString().toLowerCase();
                        const title = (s.title || '').toString().toLowerCase();
                        const route = (s.mainRoute || '').toString().toLowerCase();
                        if (!key || key === 'core' || key === 'dashboard' || key === 'profile' || key === 'settings') return true;
                        return enabledModules.some(m => {
                            const modKey = m.toString().toLowerCase();
                            return key.includes(modKey) || modKey.includes(key) || title.includes(modKey) || route.includes(modKey);
                        });
                    })
                    .map(s => ({
                        ...s,
                        _id: getCleanId(s._id),
                        parentId: s.parentId ? getCleanId(s.parentId) : null,
                        // Attach resolved modelName for display
                        _resolvedModel: ridToModel[getCleanId(s.resourceId?._id || s.resourceId)] || null,
                    }));
                setSidebars(normalizedSidebars);

                // Build modelName → sidebar item map
                const navMapBuilt = {};
                normalizedSidebars.forEach(s => {
                    if (s._resolvedModel) {
                        navMapBuilt[s._resolvedModel] = s;
                    }
                });
                setNavMap(navMapBuilt);
            } catch (err) {
                console.error('Failed to load setup data', err);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!selectedRole) return;
        const fetchPolicies = async () => {
            setRbacLoading(true);
            try {
                const res = await axiosInstance.post('/populate/read/access_policies', {
                    filter: { role: selectedRole },
                    limit: 1000,
                });
                const policyMap = {};
                const rawMap = {};
                (res.data.data || []).forEach(p => {
                    const permissionsObj = {};
                    if (Array.isArray(p.actions)) {
                        p.actions.forEach(act => {
                            permissionsObj[act] = true;
                        });
                    }
                    ACTIONS.forEach(act => {
                        if (permissionsObj[act] === undefined) {
                            permissionsObj[act] = false;
                        }
                    });
                    policyMap[p.modelName] = permissionsObj;
                    rawMap[p.modelName] = p;
                });
                setPolicies(policyMap);
                setRawPolicies(rawMap);
            } catch (err) {
                console.error('Failed to load policies', err);
            } finally {
                setRbacLoading(false);
            }
        };
        fetchPolicies();
    }, [selectedRole]);

    const handleToggle = (model, type) => {
        setPolicies(prev => ({
            ...prev,
            [model]: { ...prev[model], [type]: !prev[model]?.[type] },
        }));
    };
    const handleModelToggleAll = (model) => {
        setPolicies(prev => {
            const current = prev[model] || {};
            const allSelected = ACTIONS.every(a => current[a]);
            const next = {};
            ACTIONS.forEach(a => { next[a] = !allSelected; });
            return { ...prev, [model]: next };
        });
    };
    const handleGlobalToggle = () => {
        setPolicies(prev => {
            const allSelected = models.every(m => ACTIONS.every(a => prev[m]?.[a]));
            const target = !allSelected;
            const next = { ...prev };
            models.forEach(m => {
                next[m] = {};
                ACTIONS.forEach(a => { next[m][a] = target; });
            });
            return next;
        });
    };
    // Toggle a sidebar nav item's visibility (staged — saved with RBAC)
    // Accepts either a model name (from RBAC table) or a sidebar _id (from nav tree)
    const handleNavToggle = (key) => {
        // Resolve to sidebar _id: if key matches a model name in navMap, use its _id
        const sidebarItem = navMap[key]; // try model name first
        let sidebarId;
        if (sidebarItem) {
            sidebarId = getCleanId(sidebarItem._id);
        } else {
            // key is already a sidebar _id (from nav tree)
            sidebarId = getCleanId(key);
        }
        // Find current visibility from navChanges or sidebar data
        const existingSidebar = sidebarItem || sidebars.find(s => getCleanId(s._id) === sidebarId);
        const currentVisibility = navChanges[sidebarId] ?? existingSidebar?.visibility ?? 'protected';
        const next = currentVisibility === 'public' ? 'protected' : 'public';
        setNavChanges(prev => ({ ...prev, [sidebarId]: next }));
    };
    const handleRbacSave = async () => {
        setRbacSaving(true);
        setRbacMessage('Saving...');
        try {
            // 1. Save RBAC (access_policies.actions array) - Only send dirty models!
            const isSameActions = (arr1, arr2) => {
                if (arr1.length !== arr2.length) return false;
                const s1 = [...arr1].sort();
                const s2 = [...arr2].sort();
                return s1.every((v, i) => v === s2[i]);
            };

            const dirtyModels = models.filter(model => {
                const activeActions = ACTIONS.filter(a => !!policies[model]?.[a]);
                const dbActions = rawPolicies[model]?.actions || [];
                return !isSameActions(activeActions, dbActions);
            });

            let res = { data: { success: true, count: 0 } };

            if (dirtyModels.length > 0) {
                const bulkPayload = dirtyModels.map(model => {
                    const activeActions = ACTIONS.filter(a => !!policies[model]?.[a]);
                    const existing = rawPolicies[model] || {};

                    const allowAccess = { ...existing.allowAccess };
                    const forbiddenAccess = { ...existing.forbiddenAccess };

                    ACTIONS.forEach(a => {
                        if (activeActions.includes(a)) {
                            // If enabled, default to "*" to allow access to all fields initially
                            if (!allowAccess[a] || allowAccess[a].length === 0) {
                                allowAccess[a] = ["*"];
                            }
                        } else {
                            // Clear if disabled
                            allowAccess[a] = [];
                            forbiddenAccess[a] = [];
                        }
                    });

                    return {
                        filter: { role: selectedRole, modelName: model },
                        body: {
                            actions: activeActions,
                            allowAccess,
                            forbiddenAccess
                        },
                    };
                });
                res = await axiosInstance.post('/populate/bulk-upsert/access_policies', bulkPayload);
            } else if (Object.keys(navChanges).length === 0) {
                setRbacMessage('No changes to save.');
                setRbacSaving(false);
                return;
            }

            // 2. Save nav changes (sidebar visibility) if any — keyed by sidebar _id
            if (Object.keys(navChanges).length > 0) {
                const navPayload = Object.entries(navChanges)
                    .map(([sidebarId, visibility]) => ({
                        filter: { _id: sidebarId },
                        body: { visibility },
                    }));
                if (navPayload.length > 0) {
                    await axiosInstance.post('/populate/bulk-upsert/sidebars', navPayload);
                    // Merge changes back into navMap + sidebars so toggles reflect saved state
                    setNavMap(prev => {
                        const next = { ...prev };
                        Object.entries(navChanges).forEach(([sidebarId, visibility]) => {
                            // Find by sidebar _id in navMap values
                            const modelKey = Object.keys(next).find(m => getCleanId(next[m]._id) === sidebarId);
                            if (modelKey) next[modelKey] = { ...next[modelKey], visibility };
                        });
                        return next;
                    });
                    setSidebars(prev => prev.map(s =>
                        navChanges[getCleanId(s._id)] !== undefined
                            ? { ...s, visibility: navChanges[getCleanId(s._id)] }
                            : s
                    ));
                    setNavChanges({});
                }
            }

            if (res.data.success) {
                setRbacMessage(`✓ Saved ${res.data.count} policies${Object.keys(navChanges).length > 0 ? ' + nav' : ''}`);
                await axiosInstance.post('/config/refresh-policy');
                await refreshPermissions();
            } else {
                setRbacMessage('Save failed');
            }
        } catch (err) {
            console.error(err);
            setRbacMessage('Error saving policies');
        } finally {
            setRbacSaving(false);
        }
    };
    const handleFbacSave = async (modelName, fieldPolicies) => {
        setFbacSaving(true);
        setFbacMessage('Saving...');
        try {
            const res = await axiosInstance.post('/populate/bulk-upsert/access_policies', [{
                filter: { role: selectedRole, modelName },
                body: { allowAccess: fieldPolicies.allowAccess, forbiddenAccess: fieldPolicies.forbiddenAccess },
            }]);
            if (res.data.success) {
                setFbacMessage('✓ Field policies saved!');
                await axiosInstance.post('/config/refresh-policy');
                await refreshPermissions();
            } else {
                setFbacMessage('Save failed');
            }
        } catch (err) {
            console.error(err);
            setFbacMessage('Error saving field policies');
        } finally {
            setFbacSaving(false);
        }
    };
    const handleRegistrySave = async (modelName, { registry }) => {
        setRegSaving(true);
        setRegMessage('Saving...');
        try {
            const res = await axiosInstance.post('/populate/bulk-upsert/access_policies', [{
                filter: { role: selectedRole, modelName },
                body: { registry },
            }]);
            if (res.data.success) {
                setRegMessage('✓ Registry saved!');
                await axiosInstance.post('/config/refresh-policy');
                await refreshPermissions();
            } else {
                setRegMessage('Save failed');
            }
        } catch (err) {
            console.error(err);
            setRegMessage('Error saving registry');
        } finally {
            setRegSaving(false);
        }
    };
    const handleRefreshCache = async () => {
        try {
            await axiosInstance.post('/config/refresh-policy');
            await refreshPermissions();
            alert('Policy Cache Refreshed!');
        } catch {
            alert('Refresh Failed');
        }
    };

    const selectedRoleName = roles.find(r => r._id === selectedRole)?.name || '';

    const tabs = [
        { key: 'rbac', label: 'Resource Access', icon: TableCellsIcon },
        { key: 'fbac', label: 'Field Policies', icon: FunnelIcon },
        { key: 'registry', label: 'Registry', icon: CpuChipIcon },
        { key: 'widgets', label: 'Dashboard', icon: SquaresPlusIcon },
    ];

    return (
        <div className="min-h-full flex flex-col gap-3">
            {/* ── Page Header ── */}
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800/60">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400">
                        <ShieldCheckIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-800 dark:text-white tracking-tight">Role Access Policy</h2>
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-0.5">
                            RBAC + FBAC — Configure fine-grained data access and field policies
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleRefreshCache}
                    title="Refresh Cache"
                    className="
                        p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400
                        bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700
                        border border-gray-200/50 dark:border-gray-700/50
                        rounded-lg transition-all duration-300 active:scale-95 shadow-sm
                    "
                >
                    <ArrowPathIcon className="w-4.5 h-4.5" />
                </button>
            </div>

            {/* ── Main Side-by-Side Content Layout ── */}
            <div className="flex-1 flex flex-col md:flex-row gap-3.5 min-h-0">
                {/* Left Side: Roles Sidebar */}
                <div className="w-full md:w-64 flex flex-col gap-3 shrink-0">
                    <PremiumCard className="flex-1 flex flex-col min-h-0">
                        <span className="block text-xs font-black text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wider">
                            Select Role
                        </span>
                        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1 max-h-[300px] md:max-h-none">
                            {roles.map(r => (
                                <button
                                    key={r._id}
                                    onClick={() => { setSelectedRole(r._id); setRbacMessage(''); setFbacMessage(''); setRegMessage(''); }}
                                    className={`
                                        w-full px-4 py-2.5 text-sm font-bold text-left rounded-xl border transition-all duration-300
                                        ${selectedRole === r._id
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-transparent text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                                            : 'bg-transparent border-gray-100 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600'
                                        }
                                    `}
                                >
                                    {r.name}
                                </button>
                            ))}
                            {roles.length === 0 && (
                                <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                    Loading roles…
                                </div>
                            )}
                        </div>
                    </PremiumCard>
                </div>

                {/* Right Side: Permissions details */}
                <div className="flex-1 flex flex-col min-h-0">
                    {selectedRole ? (
                        <div className="flex-1 flex flex-col gap-3 min-h-0">
                            {/* Tab Bar Header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                                <div className="flex gap-1.5 p-1 bg-gray-100/60 dark:bg-gray-800/40 backdrop-blur rounded-xl overflow-x-auto scrollbar-hide">
                                    {tabs.map(tab => (
                                        <TabButton
                                            key={tab.key}
                                            active={activeTab === tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            icon={tab.icon}
                                            label={tab.label}
                                        />
                                    ))}
                                </div>
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200/40 dark:border-gray-700/40 rounded-lg">
                                    Configuring: <span className="text-blue-600 dark:text-blue-400 font-extrabold capitalize">{selectedRoleName}</span>
                                </div>
                            </div>

                            {/* Active Tab Content */}
                            <div className="flex-1 flex flex-col min-h-0">
                                {activeTab === 'rbac' && (
                                    <DataAccessTab
                                        models={models}
                                        policies={policies}
                                        navMap={navMap}
                                        navChanges={navChanges}
                                        sidebars={sidebars}
                                        onToggle={handleToggle}
                                        onModelToggleAll={handleModelToggleAll}
                                        onGlobalToggle={handleGlobalToggle}
                                        onNavToggle={handleNavToggle}
                                        onSave={handleRbacSave}
                                        saving={rbacSaving}
                                        message={rbacMessage}
                                    />
                                )}
                                {activeTab === 'fbac' && (
                                    <FieldPoliciesTab
                                        selectedRole={selectedRole}
                                        models={models}
                                        fieldMap={fieldMap}
                                        onSave={handleFbacSave}
                                        saving={fbacSaving}
                                        message={fbacMessage}
                                    />
                                )}
                                {activeTab === 'registry' && (
                                    <RegistryTab
                                        selectedRole={selectedRole}
                                        models={models}
                                        onSave={handleRegistrySave}
                                        saving={regSaving}
                                        message={regMessage}
                                    />
                                )}
                                {activeTab === 'widgets' && (
                                    <DashboardWidgetsTab selectedRole={selectedRole} />
                                )}
                            </div>
                        </div>
                    ) : (
                        <PremiumCard className="flex-1 flex flex-col items-center justify-center py-12">
                            <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-2xl mb-4">
                                <ShieldCheckIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                            </div>
                            <p className="text-lg font-black text-gray-400 dark:text-gray-500">Select a role from the sidebar</p>
                            <p className="text-sm font-medium mt-1 text-gray-400 dark:text-gray-500">
                                Choose a role to edit its data access permissions, field-level policies, registry functions, and widgets.
                            </p>
                        </PremiumCard>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoleAccessPolicy;
