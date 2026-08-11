import React, { useState, useEffect, useRef } from "react";
import { FiChevronDown, FiSearch, FiFilter } from "react-icons/fi";

const DOT_COLORS = [
  "bg-amber-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-indigo-500",
  "bg-slate-500"
];

function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select option",
  searchPlaceholder = "Search..."
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const selected = options[selectedIndex];

  const filteredOptions = options.filter((opt) =>
    (opt.label || "").toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const getDotColor = (index) => {
    if (index < 0) return "bg-slate-400";
    return DOT_COLORS[index % DOT_COLORS.length];
  };

  return (
    <div ref={ref} className="lmx-feed-composer__picker relative min-w-[160px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="lmx-feed-composer__picker-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {selected ? (
          <span className="inline-flex items-center gap-2 min-w-0">
            <span className={`h-2 w-2 rounded-full shrink-0 ${getDotColor(selectedIndex)}`} />
            <span className="truncate">{selected.label}</span>
          </span>
        ) : (
          <span className="text-ink-subtle">{placeholder}</span>
        )}
        <FiChevronDown className={`h-4 w-4 shrink-0 text-ink-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="lmx-feed-composer__picker-menu z-50" role="listbox">
          {options.length > 5 && (
            <div className="p-2 border-b border-hairline-soft">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-subtle pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  autoFocus
                  className="lmx-input pl-9 py-1.5 text-xs"
                />
              </div>
            </div>
          )}
          <ul className="max-h-48 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-xs text-ink-subtle text-center">No options found</li>
            ) : (
              filteredOptions.map((opt) => {
                const index = options.findIndex((o) => o.value === opt.value);
                const isActive = opt.value === value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelect(opt.value)}
                      className={`lmx-feed-composer__picker-option ${isActive ? 'lmx-feed-composer__picker-option--active' : ''}`}
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${getDotColor(index)}`} />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ReportFilters({
  filterStatus,
  setFilterStatus,
  filterPeriod,
  setFilterPeriod,
  periodOptions = [],
  statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" }
  ]
}) {
  const formattedPeriodOptions = [
    { value: "", label: "All Periods" },
    ...periodOptions.map((p) => ({ value: p, label: p }))
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-subtle uppercase tracking-wider">
        <FiFilter className="text-brand text-xs" />
        <span>Filter:</span>
      </div>

      {setFilterStatus && (
        <CustomSelect
          value={filterStatus}
          onChange={setFilterStatus}
          options={statusOptions}
          placeholder="All Statuses"
          searchPlaceholder="Search status..."
        />
      )}

      {setFilterPeriod && (
        <CustomSelect
          value={filterPeriod}
          onChange={setFilterPeriod}
          options={formattedPeriodOptions}
          placeholder="All Periods"
          searchPlaceholder="Search period..."
        />
      )}
    </div>
  );
}
