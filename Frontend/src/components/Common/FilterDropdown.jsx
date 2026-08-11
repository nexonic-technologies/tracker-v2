import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import * as Icons from 'lucide-react';
import ProfileImage from './ProfileImage';
import axiosInstance from '../../api/axiosInstance';

/**
 * FilterDropdown — unified searchable filter dropdown.
 *
 * Matches the feeds "Select channel" popup style.
 * Supports three option types controlled by the `type` prop:
 *
 *   type="status"   — coloured dot per option (uses option.color or auto STATUS_COLORS)
 *   type="member"   — ProfileImage avatar per option (uses option.profileImage, firstName, lastName)
 *   type="default"  — plain label text only
 *
 * Props:
 *   label        — placeholder text when nothing selected  e.g. "All Statuses"
 *   value        — currently selected value (string | null)
 *   onChange     — (value: string | null) => void
 *   options      — array of option objects (see below)
 *   type         — "status" | "member" | "default"  (default: "default")
 *   searchable   — boolean, show search input (default: true when options > 5)
 *   className    — extra class on the trigger button
 *   accentColor  — CSS var string for active state, e.g. "var(--module-ticket)"
 *
 * Dynamic populate API props:
 *   model          — DB collection/model to query (e.g. 'employees', 'task_types')
 *   fetchFields    — fields list to fetch (string or array)
 *   fetchFilter    — query filter object
 *   fetchPopulate  — relation fields to populate (string or object)
 *   fetchTransform — custom mapping function (item) => option
 *
 * Option shape:
 *   { value, label, color?, profileImage?, firstName?, lastName?, icon?: ReactNode }
 */

// Default status colour map — used as fallback when option.color is not provided
const STATUS_COLORS = {
  'Open': 'var(--tracker-info)',
  'In Progress': 'var(--tracker-warning)',
  'Review': 'var(--module-hr)',
  'Testing': 'var(--brand-teal)',
  'Completed': 'var(--tracker-success)',
  'Closed': 'var(--ink-subtle)',
  'Pending': 'var(--tracker-warning)',
  'Rejected': 'var(--tracker-danger)',
  'Critical': 'var(--tracker-danger)',
  'High': 'var(--tracker-warning)',
  'Medium': 'var(--tracker-warning)',
  'Low': 'var(--tracker-success)',
};

export default function FilterDropdown({
  label,
  value,
  onChange,
  options = [],
  type = 'default',
  searchable,
  className = '',
  accentColor = 'var(--module-accent)',
  // Dynamic fetch props
  model,
  fetchFields,
  fetchFilter,
  fetchPopulate,
  fetchTransform,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dynamicOptions, setDynamicOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  // Fetch dynamic options
  useEffect(() => {
    if (!model) {
      setDynamicOptions([]);
      return;
    }

    let isMounted = true;
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        const payload = {};
        if (fetchFields) {
          payload.fields = Array.isArray(fetchFields) ? fetchFields.join(',') : fetchFields;
        }
        if (fetchFilter) {
          payload.filter = fetchFilter;
        }
        if (fetchPopulate) {
          payload.populateFields = fetchPopulate;
        }
        payload.limit = 500;

        const res = await axiosInstance.post(`/populate/read/${model}`, payload);
        if (!isMounted) return;

        const items = res.data?.data || [];
        const mapped = items.map(item => {
          if (fetchTransform) {
            return fetchTransform(item);
          }
          // Default mappings based on standard models
          if (model === 'employees') {
            return {
              value: item._id,
              label: `${item.basicInfo?.firstName || ''} ${item.basicInfo?.lastName || ''}`.trim(),
              profileImage: item.basicInfo?.profileImage,
              firstName: item.basicInfo?.firstName,
              lastName: item.basicInfo?.lastName,
            };
          }
          return {
            value: item._id,
            label: item.name || item.title || item._id,
          };
        });

        setDynamicOptions(mapped);
      } catch (err) {
        console.error(`FilterDropdown failed fetching dynamic options for model ${model}:`, err);
      } finally {
        if (isMounted) {
          setLoadingOptions(false);
        }
      }
    };

    fetchOptions();

    return () => {
      isMounted = false;
    };
  }, [model, fetchFields, fetchFilter, fetchPopulate, fetchTransform]);

  // Combine static and dynamic options
  const allOptions = useMemo(() => {
    return [...options, ...dynamicOptions];
  }, [options, dynamicOptions]);

  const showSearch = searchable ?? allOptions.length > 5;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (open && showSearch) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open, showSearch]);

  const filtered = query.trim()
    ? allOptions.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : allOptions;

  const selected = allOptions.find(o => o.value === value);

  const handleSelect = useCallback((opt) => {
    onChange(opt.value === value ? null : opt.value); // toggle off if re-clicked
    setOpen(false);
    setQuery('');
  }, [value, onChange]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    onChange(null);
  }, [onChange]);

  // ── Dot for status type ────────────────────────────────────────────────────
  const StatusDot = ({ opt, size = 7 }) => {
    const color = opt.color || STATUS_COLORS[opt.label] || STATUS_COLORS[opt.value] || 'var(--ink-subtle)';
    return (
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: size, height: size, background: color }}
      />
    );
  };

  // ── Avatar for member type ─────────────────────────────────────────────────
  const MemberAvatar = ({ opt }) => (
    <ProfileImage
      profileImage={opt.profileImage}
      firstName={opt.firstName || opt.label?.split(' ')[0]}
      lastName={opt.lastName || opt.label?.split(' ')[1]}
      px={20}
      className="flex-shrink-0"
    />
  );

  // ── Left adornment per type ────────────────────────────────────────────────
  const OptionAdornment = ({ opt }) => {
    if (type === 'status') return <StatusDot opt={opt} />;
    if (type === 'member') return <MemberAvatar opt={opt} />;

    // Dynamic Lucide icon lookup
    if (typeof opt.icon === 'string') {
      const LucideIcon = Icons[opt.icon] || Icons.HelpCircle;
      return <LucideIcon size={12} className="flex-shrink-0" style={{ color: opt.color || 'inherit' }} />;
    }
    if (opt.icon) {
      return <span className="flex-shrink-0 text-ink-subtle">{opt.icon}</span>;
    }
    // Fallback: if a color is provided but no icon, show a custom colored dot
    if (opt.color) {
      return <span className="rounded-full w-1.5 h-1.5 flex-shrink-0" style={{ backgroundColor: opt.color }} />;
    }
    return null;
  };

  // ── Trigger button label ───────────────────────────────────────────────────
  const TriggerLabel = () => {
    if (!selected) return <span className="text-ink-muted">{label}</span>;
    return (
      <span className="flex items-center gap-1.5 font-semibold" style={{ color: accentColor }}>
        {type === 'status' && <StatusDot opt={selected} size={6} />}
        {type === 'member' && <MemberAvatar opt={selected} />}
        {typeof selected.icon === 'string' && (() => {
          const LucideIcon = Icons[selected.icon] || Icons.HelpCircle;
          return <LucideIcon size={11} className="flex-shrink-0" style={{ color: selected.color || accentColor }} />;
        })()}
        {(!selected.icon && selected.color) && (
          <span className="rounded-full w-1.5 h-1.5 flex-shrink-0" style={{ backgroundColor: selected.color }} />
        )}
        <span className="truncate max-w-[120px]">{selected.label}</span>
      </span>
    );
  };

  const isActive = value !== null && value !== undefined && value !== '';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tracker-md text-[12px] border
          transition-all duration-150 cursor-pointer select-none min-w-[120px] justify-between
          ${isActive
            ? 'border-[var(--module-accent)] bg-[var(--module-accent-light,rgba(99,102,241,0.08))]'
            : 'border-hairline bg-surface hover:border-[var(--module-accent)] hover:bg-surface-1'}
        `}
        style={isActive ? { borderColor: accentColor } : {}}
      >
        <TriggerLabel />
        <span className="flex items-center gap-0.5 flex-shrink-0 ml-1">
          {isActive && (
            <span
              onClick={handleClear}
              className="hover:opacity-70 transition-opacity p-0.5 rounded"
              title="Clear"
            >
              <X size={10} className="text-ink-subtle" />
            </span>
          )}
          <ChevronDown
            size={11}
            className={`text-ink-subtle transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className="
            absolute z-50 top-full mt-1.5 left-0 min-w-[180px] max-w-[240px]
            bg-surface border border-hairline rounded-tracker-md shadow-lg
            overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100
          "
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}
        >
          {/* Search */}
          {showSearch && (
            <div className="p-2 border-b border-hairline-soft">
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder={`Search ${label?.toLowerCase() || ''}…`}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="lmx-input pl-7 py-1.5 text-[11px] w-full"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto scrollbar-hide py-1">
            {loadingOptions ? (
              <div className="flex items-center justify-center py-6 gap-2 text-ink-subtle">
                <div className="w-4 h-4 rounded-full border border-t-transparent animate-spin"
                  style={{ borderColor: accentColor, borderTopColor: "transparent" }} />
                <span className="text-[11px] font-medium">Loading options…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-5 text-[11px] text-ink-subtle italic">No results</div>
            ) : (
              filtered.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-left
                      transition-colors duration-100 group
                      ${isSelected
                        ? 'bg-surface-1 font-semibold'
                        : 'hover:bg-surface-1 text-ink-muted hover:text-ink'}
                    `}
                  >
                    <OptionAdornment opt={opt} />
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSelected && (
                      <Check size={11} className="flex-shrink-0" style={{ color: accentColor }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
