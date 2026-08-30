import { useState, useMemo } from 'react';
import { Search, X, SlidersHorizontal, Calendar, RotateCcw } from 'lucide-react';
import FilterDropdown from './FilterDropdown';
import FilterPresetBar from './FilterPresetBar';

/**
 * UniversalFilterBar
 * Unified declarative filter bar with expandable tray, date ranges, and preset saving.
 */
export default function UniversalFilterBar({
  filtersConfig = [],
  values = {},
  onChange,
  storageKey = 'global',
  accentColor = 'var(--brand-solid)',
  enableDateRange = true,
  enableSearch = true,
  searchPlaceholder = 'Search...',
  rightActions = null,
  className = '',
}) {
  const [showFilters, setShowFilters] = useState(false);

  // Calculate active filter count
  const activeCount = useMemo(() => {
    let count = 0;
    for (const config of filtersConfig) {
      const val = values[config.key];
      if (val !== null && val !== undefined && val !== '' && (Array.isArray(val) ? val.length > 0 : true)) {
        count++;
      }
    }
    if (values.dateFrom) count++;
    if (values.dateTo) count++;
    return count;
  }, [filtersConfig, values]);

  const handleFilterChange = (key, val) => {
    if (!onChange) return;
    onChange({
      ...values,
      [key]: val,
    });
  };

  const handleSearchChange = (q) => {
    if (!onChange) return;
    onChange({
      ...values,
      search: q,
    });
  };

  const handleClearAll = () => {
    if (!onChange) return;
    const cleared = {};
    for (const config of filtersConfig) {
      cleared[config.key] = null;
    }
    cleared.dateFrom = '';
    cleared.dateTo = '';
    cleared.search = values.search || '';
    onChange(cleared);
  };

  const handleApplyPreset = (presetFilters) => {
    if (!onChange) return;
    onChange({
      ...values,
      ...presetFilters,
    });
    setShowFilters(true);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Primary Bar: Search, Filters Toggle, Presets, and Right Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left Section: Search & Filters Toggle */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search Input */}
          {enableSearch && (
            <div className="relative flex-1 max-w-xs min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-subtle pointer-events-none" />
              <input
                type="text"
                value={values.search || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 bg-surface border border-hairline rounded-tracker-md text-xs text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent transition-all shadow-xs"
              />
              {values.search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink p-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tracker-md text-xs font-semibold border transition-all duration-150 cursor-pointer shadow-xs ${
              showFilters || activeCount > 0
                ? 'border-current bg-surface shadow-xs'
                : 'border-hairline bg-surface text-ink-muted hover:text-ink hover:border-hairline-strong'
            }`}
            style={{
              color: showFilters || activeCount > 0 ? accentColor : undefined,
              borderColor: showFilters || activeCount > 0 ? accentColor : undefined,
            }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            {activeCount > 0 && (
              <span
                className="ml-0.5 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold"
                style={{ backgroundColor: accentColor }}
              >
                {activeCount}
              </span>
            )}
          </button>

          {/* Preset Pills Bar */}
          <FilterPresetBar
            storageKey={storageKey}
            currentFilters={values}
            onApplyPreset={handleApplyPreset}
            onResetFilters={handleClearAll}
            accentColor={accentColor}
          />
        </div>

        {/* Right Actions (e.g. View switches, Create button) */}
        {rightActions && <div className="flex items-center gap-2 shrink-0">{rightActions}</div>}
      </div>

      {/* Expandable Filter Tray */}
      {showFilters && (
        <div className="p-3 bg-surface rounded-tracker-lg border border-hairline shadow-xs space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex flex-wrap items-center gap-2">
            {/* Dynamic Filter Dropdowns */}
            {filtersConfig.map((config) => (
              <FilterDropdown
                key={config.key}
                label={config.label}
                value={values[config.key] ?? null}
                onChange={(val) => handleFilterChange(config.key, val)}
                options={config.options || []}
                type={config.type || 'default'}
                model={config.model}
                fetchFields={config.fetchFields}
                fetchFilter={config.fetchFilter}
                fetchPopulate={config.fetchPopulate}
                fetchTransform={config.fetchTransform}
                accentColor={accentColor}
              />
            ))}

            {/* Date Range Picker */}
            {enableDateRange && (
              <div className="flex items-center gap-1.5 pl-1 border-l border-hairline-soft">
                <span className="text-[11px] text-ink-subtle font-semibold flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Date:
                </span>
                <input
                  type="date"
                  value={values.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="px-2 py-1 bg-surface-1 border border-hairline rounded-tracker-md text-[11px] text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  title="Filter From Date"
                />
                <span className="text-[11px] text-ink-subtle">to</span>
                <input
                  type="date"
                  value={values.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="px-2 py-1 bg-surface-1 border border-hairline rounded-tracker-md text-[11px] text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  title="Filter To Date"
                />
              </div>
            )}

            {/* Clear All Action */}
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-tracker-md text-[11px] font-semibold bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)] hover:bg-[var(--tracker-danger)] hover:text-white transition-all cursor-pointer ml-auto shadow-xs"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear all ({activeCount})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
