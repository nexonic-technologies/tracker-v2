import { useState, useEffect, useRef } from "react";
import axiosInstance from "../../api/axiosInstance";
import toast from "react-hot-toast";
import { ChevronDown, X, Search, Upload, FileText, Plus, Trash2, Check, Calendar, Eye, EyeOff, Crop, Image as ImageIcon } from "lucide-react";
import ImageCropperModal from "./ImageCropperModal";
import { Country, State, City } from "country-state-city";
import {
  buildDirtyPatch,
  getNestedValue,
  setNestedValue,
  stripMetaFields,
} from "@utils/formPatch";

// Resolve Country Name -> ISO Code
const getCountryCode = (countryName) => {
  if (!countryName) return "";
  const country = Country.getAllCountries().find(
    c => c.name.toLowerCase() === countryName.toLowerCase()
  );
  return country ? country.isoCode : "";
};

// Resolve State Name -> ISO Code within Country
const getStateCode = (countryCode, stateName) => {
  if (!countryCode || !stateName) return "";
  const state = State.getStatesOfCountry(countryCode).find(
    s => s.name.toLowerCase() === stateName.toLowerCase()
  );
  return state ? state.isoCode : "";
};


/* ════════════════════════════════════════════
   UNIFIED FORM LABEL
   — Clean, modern top-aligned label without floating cutouts
════════════════════════════════════════════ */
export const FormLabel = ({ label, required, focused, htmlFor, className = "" }) => {
  if (!label) return null;
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-[12.5px] font-semibold transition-colors duration-150 select-none mb-1.5 ${focused
        ? "text-[var(--brand-solid)]"
        : "text-[var(--tracker-ink)]"
        } ${className}`}
    >
      {label}
      {required && <span className="text-red-500 ml-1 font-bold">*</span>}
    </label>
  );
};

/* ════════════════════════════════════════════
   UNIFIED FORM FIELD WRAPPER
════════════════════════════════════════════ */
export const FormField = ({ label, required, focused, children, className = "" }) => (
  <div className={`flex flex-col w-full ${className}`}>
    <FormLabel label={label} required={required} focused={focused} />
    <div className="relative w-full">{children}</div>
  </div>
);

/* ════════════════════════════════════════════
   SEARCHABLE DROPDOWN (replaces MUI Autocomplete)
════════════════════════════════════════════ */
const SearchableSelect = ({ options = [], value, onChange, multiple, labelField, fieldName, placeholder, label, required, onOpen }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (!open && onOpen) onOpen();
    setOpen(!open);
    setIsFocused(true);
    setHighlightIndex(-1);
  };

  const getLabel = (opt) => {
    if (opt === undefined || opt === null) return "";
    if (typeof opt === 'object') {
      return opt?.[labelField] || opt?.[fieldName] || opt?.name || opt?.title || opt?.label || opt?._id || opt?.value || "";
    }
    const match = options.find(o => {
      if (typeof o === 'object' && o !== null) {
        return (o?._id || o?.id || o?.value || o?.name || o?.label) === opt || (o?._id || o?.id || o?.value || o?.name || o?.label)?.toString() === opt?.toString();
      }
      return o === opt || o?.toString() === opt?.toString();
    });
    if (match && typeof match === 'object') {
      return match[labelField] || match[fieldName] || match.name || match.title || match.label || opt;
    }
    return String(opt);
  };

  const filtered = options.filter((opt) =>
    getLabel(opt).toLowerCase().includes(search.toLowerCase())
  );

  const isFilled = multiple ? (value || []).length > 0 : (value !== undefined && value !== null && value !== "");

  const isSelected = (opt) => {
    if (multiple) {
      return (value || []).some(v => {
        const vId = typeof v === 'object' ? (v?._id || v?.value || v?.name || v?.label) : v;
        const optId = typeof opt === 'object' ? (opt?._id || opt?.value || opt?.name || opt?.label) : opt;
        return vId === optId || vId?.toString() === optId?.toString();
      });
    }
    const valId = typeof value === 'object' ? (value?._id || value?.value || value?.name || value?.label) : value;
    const optId = typeof opt === 'object' ? (opt?._id || opt?.value || opt?.name || opt?.label) : opt;
    return valId === optId || valId?.toString() === optId?.toString();
  };

  const handleSelect = (opt) => {
    if (multiple) {
      const current = value || [];
      const exists = current.some(v => {
        const vId = typeof v === 'object' ? (v?._id || v?.value || v?.name || v?.label) : v;
        const optId = typeof opt === 'object' ? (opt?._id || opt?.value || opt?.name || opt?.label) : opt;
        return vId === optId || vId?.toString() === optId?.toString();
      });
      onChange(exists ? current.filter(v => {
        const vId = typeof v === 'object' ? (v?._id || v?.value || v?.name || v?.label) : v;
        const optId = typeof opt === 'object' ? (opt?._id || opt?.value || opt?.name || opt?.label) : opt;
        return vId !== optId && vId?.toString() !== optId?.toString();
      }) : [...current, opt]);
    } else {
      onChange(opt);
      setOpen(false);
      setSearch("");
      setIsFocused(false);
    }
  };

  const removeTag = (opt, e) => {
    e.stopPropagation();
    onChange((value || []).filter(v => {
      const vId = typeof v === 'object' ? (v?._id || v?.value || v?.name || v?.label) : v;
      const optId = typeof opt === 'object' ? (opt?._id || opt?.value || opt?.name || opt?.label) : opt;
      return vId !== optId && vId?.toString() !== optId?.toString();
    }));
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        handleSelect(filtered[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setIsFocused(false);
    }
  };

  return (
    <div ref={ref} className="relative w-full" onKeyDown={handleKeyDown}>
      <FormField label={label} required={required} focused={open || isFocused}>
        <button
          type="button"
          onClick={handleOpen}
          onFocus={() => setIsFocused(true)}
          onBlur={() => !open && setIsFocused(false)}
          className={`
            w-full min-h-[36px] h-[36px] pl-3 pr-8 py-1.5 rounded-[var(--tracker-radius-md)] text-left flex items-center gap-1.5 flex-wrap
            bg-[var(--tracker-surface)] cursor-pointer text-[12px]
            border transition-all duration-200 outline-none
            ${open || isFocused
              ? 'border-[var(--brand-solid)] ring-2 ring-[var(--brand-solid)]/15 shadow-xs bg-[var(--tracker-surface)]'
              : 'border-[var(--tracker-border)] hover:border-[var(--tracker-ink-subtle)] hover:bg-[var(--tracker-surface-1)]/30'}
          `}
        >
          {multiple && (value || []).map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 rounded-[var(--tracker-radius-sm)] bg-[var(--brand-solid)]/10 text-[var(--brand-solid)] text-[11px] font-medium border border-[var(--brand-solid)]/20 shadow-xs">
              {getLabel(v)}
              <span onClick={(e) => removeTag(v, e)} className="p-0.5 rounded-[3px] hover:bg-[var(--brand-solid)]/20 transition-colors cursor-pointer text-[var(--brand-solid)]">
                <X className="h-2.5 w-2.5" />
              </span>
            </span>
          ))}
          {!multiple && isFilled && (
            <span className="text-[12px] font-normal text-[var(--tracker-ink)] truncate">{getLabel(value)}</span>
          )}
          {!multiple && !isFilled && (
            <span className="text-[12px] text-[var(--tracker-ink-subtle)] truncate">
              {placeholder || `Select ${label || 'an option'}...`}
            </span>
          )}
        </button>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180 text-[var(--brand-solid)]' : 'text-[var(--tracker-ink-subtle)]'}`} />
        </div>
      </FormField>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-[var(--tracker-radius-md)] shadow-2xl overflow-hidden animate-fade-in backdrop-blur-md">
          {options.length > 4 && (
            <div className="p-2 border-b border-[var(--tracker-border-soft)] bg-[var(--tracker-surface-1)]/50">
              <div className="flex items-center gap-2 px-2.5 h-9 bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-[var(--tracker-radius-sm)] focus-within:border-[var(--brand-solid)] focus-within:ring-2 focus-within:ring-[var(--brand-solid)]/15">
                <Search className="h-3.5 w-3.5 text-[var(--tracker-ink-subtle)] flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setHighlightIndex(-1);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  placeholder="Search options..."
                  autoFocus
                  className="flex-1 bg-transparent text-[13px] text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-subtle)] focus:outline-none"
                />
                {search && (
                  <X className="h-3.5 w-3.5 text-[var(--tracker-ink-subtle)] cursor-pointer hover:text-[var(--tracker-ink)]" onClick={() => setSearch("")} />
                )}
              </div>
            </div>
          )}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-[13px] text-[var(--tracker-ink-subtle)] text-center">No options found</div>
            ) : filtered.map((opt, idx) => {
              const sel = isSelected(opt);
              const isHighlighted = idx === highlightIndex;
              return (
                <div
                  key={opt?._id || opt?.value || idx}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={`
                    group flex items-center justify-between px-3 py-2.5 rounded-[var(--tracker-radius-sm)] cursor-pointer transition-all text-[13px]
                    ${sel
                      ? 'bg-[var(--brand-solid)] text-white font-semibold shadow-xs'
                      : isHighlighted
                        ? 'bg-[var(--brand-solid)]/10 text-[var(--brand-solid)] font-medium'
                        : 'text-[var(--tracker-ink)] hover:bg-[var(--brand-solid)]/10 hover:text-[var(--brand-solid)]'}
                  `}
                >
                  <span className="truncate">{getLabel(opt)}</span>
                  {sel ? (
                    <Check className="h-4 w-4 text-white flex-shrink-0 ml-2" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-transparent group-hover:border-[var(--brand-solid)]/30 flex items-center justify-center transition-colors">
                      <Check className="h-3 w-3 text-[var(--brand-solid)] opacity-0 group-hover:opacity-40" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════
   CUSTOM DROPDOWN DATE PICKER
════════════════════════════════════════════ */
const CustomDatePicker = ({ value, onChange, label, required, maxDate: maxDateProp, error }) => {
  const [open, setOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });
  const [viewMode, setViewMode] = useState("days"); // 'days' | 'months' | 'years'
  const [yearPageStart, setYearPageStart] = useState(() => {
    const initialYear = value ? new Date(value).getFullYear() : new Date().getFullYear();
    return Math.floor(initialYear / 12) * 12;
  });
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setViewMode("days");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
      }
    }
  }, [value]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handleOpenYears = () => {
    setYearPageStart(Math.floor(year / 12) * 12);
    setViewMode("years");
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Resolve maxDate for disabling future days
  const resolvedMaxDate = maxDateProp === "today" ? new Date() : maxDateProp ? new Date(maxDateProp) : null;
  if (resolvedMaxDate) resolvedMaxDate.setHours(23, 59, 59, 999);

  const isDayDisabled = (day) => {
    if (!resolvedMaxDate) return false;
    const d = new Date(year, month, day);
    return d > resolvedMaxDate;
  };

  const handleSelectDay = (day) => {
    if (isDayDisabled(day)) return;
    const selected = new Date(year, month, day);
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, "0");
    const dd = String(selected.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    if (resolvedMaxDate && today > resolvedMaxDate) return;
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = d.toLocaleString("en-US", { month: "short" });
    const yyyy = d.getFullYear();
    return `${dd} ${mm} ${yyyy}`;
  };

  const isSelected = (day) => {
    if (!value) return false;
    const d = new Date(value);
    return (
      d.getDate() === day &&
      d.getMonth() === month &&
      d.getFullYear() === year
    );
  };

  const isCurrentDayToday = (day) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const cells = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, isCurrentMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, isCurrentMonth: false });
  }

  const isFilled = !!value;

  return (
    <div ref={ref} className="relative w-full">
      <FormField label={label} required={required} focused={open}>
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            if (!open) {
              setViewMode("days");
            }
          }}
          className={`
            w-full min-h-[36px] h-[36px] pl-3 pr-8 py-1.5 rounded-[var(--tracker-radius-md)] text-left flex items-center
            bg-[var(--tracker-surface)] cursor-pointer text-[12px] text-[var(--tracker-ink)]
            border transition-all duration-200 outline-none
            ${open
              ? 'border-[var(--brand-solid)] ring-2 ring-[var(--brand-solid)]/15 shadow-xs'
              : 'border-[var(--tracker-border)] hover:border-[var(--tracker-ink-subtle)]'}
          `}
        >
          {getDisplayValue() || <span className="text-[var(--tracker-ink-subtle)] text-[12px]">Select date...</span>}
        </button>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tracker-ink-subtle)] pointer-events-none">
          <Calendar size={15} />
        </span>
      </FormField>

      {open && (
        <div className="absolute z-50 mt-1 p-3 w-[280px] bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-[var(--tracker-radius-md)] shadow-2xl animate-fade-in backdrop-blur-md">
          <div className="flex justify-between items-center mb-3">
            <button
              type="button"
              onClick={
                viewMode === "days"
                  ? handlePrevMonth
                  : viewMode === "months"
                    ? () => setCurrentDate(new Date(year - 1, month, 1))
                    : () => setYearPageStart((prev) => prev - 12)
              }
              className="p-1 rounded-[6px] hover:bg-surface-1 text-ink transition-colors cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center border border-hairline-soft"
            >
              &larr;
            </button>

            {viewMode === "days" ? (
              <div className="flex items-center text-[12px] font-bold text-ink">
                <button
                  type="button"
                  onClick={() => setViewMode("months")}
                  className="hover:bg-surface-1 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                >
                  {months[month]}
                </button>
                <span className="text-ink-subtle mx-0.5">,</span>
                <button
                  type="button"
                  onClick={handleOpenYears}
                  className="hover:bg-surface-1 rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                >
                  {year}
                </button>
              </div>
            ) : viewMode === "months" ? (
              <button
                type="button"
                onClick={handleOpenYears}
                className="text-[12px] font-bold text-ink hover:bg-surface-1 rounded px-2 py-0.5 transition-colors cursor-pointer"
              >
                {year}
              </button>
            ) : (
              <span className="text-[12px] font-bold text-ink px-2 py-0.5">
                {yearPageStart} - {yearPageStart + 11}
              </span>
            )}

            <button
              type="button"
              onClick={
                viewMode === "days"
                  ? handleNextMonth
                  : viewMode === "months"
                    ? () => setCurrentDate(new Date(year + 1, month, 1))
                    : () => setYearPageStart((prev) => prev + 12)
              }
              className="p-1 rounded-[6px] hover:bg-surface-1 text-ink transition-colors cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center border border-hairline-soft"
            >
              &rarr;
            </button>
          </div>

          {viewMode === "days" && (
            <>
              <div className="grid grid-cols-7 gap-0.5 text-center mb-1 text-[10px] font-bold text-ink-subtle">
                <span>Su</span>
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center">
                {cells.map((cell, idx) => {
                  if (cell.isCurrentMonth) {
                    const selected = isSelected(cell.day);
                    const isToday = isCurrentDayToday(cell.day);
                    const disabled = isDayDisabled(cell.day);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectDay(cell.day)}
                        disabled={disabled}
                        className={`
                          text-[11px] p-0.5 rounded-tracker-sm font-medium transition-colors
                          min-w-[28px] min-h-[28px] flex items-center justify-center
                          ${disabled
                            ? 'text-ink-tertiary opacity-30 cursor-not-allowed'
                            : selected
                              ? 'bg-[var(--module-accent)] text-white font-bold cursor-pointer'
                              : isToday
                                ? 'border border-[var(--module-accent)] text-[var(--module-accent)] bg-[var(--module-accent-light)] cursor-pointer'
                                : 'hover:bg-surface-1 text-ink cursor-pointer'}
                        `}
                      >
                        {cell.day}
                      </button>
                    );
                  } else {
                    return (
                      <span
                        key={idx}
                        className="text-[11px] p-0.5 text-ink-tertiary opacity-30 min-w-[28px] min-h-[28px] flex items-center justify-center"
                      >
                        {cell.day}
                      </span>
                    );
                  }
                })}
              </div>
            </>
          )}

          {viewMode === "months" && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {months.map((m, idx) => {
                const isCurrent = idx === month;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setCurrentDate(new Date(year, idx, 1));
                      setViewMode("days");
                    }}
                    className={`
                      text-[11px] py-2.5 rounded-tracker-md font-semibold transition-colors cursor-pointer
                      ${isCurrent
                        ? 'bg-[var(--module-accent)] text-white font-bold'
                        : 'hover:bg-surface-1 text-ink'}
                    `}
                  >
                    {m.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === "years" && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {Array.from({ length: 12 }, (_, i) => yearPageStart + i).map((y) => {
                const isCurrent = y === year;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setCurrentDate(new Date(y, month, 1));
                      setViewMode("months");
                    }}
                    className={`
                      text-[11px] py-2.5 rounded-tracker-md font-semibold transition-colors cursor-pointer
                      ${isCurrent
                        ? 'bg-[var(--module-accent)] text-white font-bold'
                        : 'hover:bg-surface-1 text-ink'}
                    `}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === "days" ? (
            <div className="flex justify-between items-center border-t border-hairline-soft pt-2 mt-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-semibold text-tracker-danger hover:underline cursor-pointer min-h-[28px] px-2 rounded-tracker-sm hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="text-[11px] font-semibold text-[var(--module-accent)] hover:underline cursor-pointer min-h-[28px] px-2 rounded-tracker-sm hover:bg-[var(--module-accent-light)]"
              >
                Today
              </button>
            </div>
          ) : (
            <div className="flex justify-center border-t border-hairline-soft pt-2 mt-2">
              <button
                type="button"
                onClick={() => setViewMode("days")}
                className="text-[11px] font-semibold text-[var(--module-accent)] hover:underline cursor-pointer min-h-[28px] px-2 rounded-tracker-sm hover:bg-[var(--module-accent-light)]"
              >
                Back to calendar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inline validation error */}
      {error && (
        <p className="mt-1 text-[11px] font-medium text-red-500 dark:text-red-400 animate-fade-in">{error}</p>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════
   FORM RENDERER
════════════════════════════════════════════ */
/* ════════════════════════════════════════════
   FIELD VALIDATION ENGINE
   — Declarative rule evaluation for any field config
════════════════════════════════════════════ */
const validateField = (field, value, formData) => {
  if (field.type === "section" || field.type === "heading") return null;
  const v = field.validate;
  if (!v) return null;
  const str = (value ?? "").toString();

  // Required check (handled separately by HTML, but useful for submit gate)
  if (field.required && (!str || str.trim() === "")) return v.message || `${field.label || field.name} is required`;

  // Skip further validation if field is empty and not required
  if (!str || str.trim() === "") return null;

  // Pattern
  if (v.pattern && !v.pattern.test(str)) return v.message || `${field.label || field.name} is invalid`;

  // Max length
  if (v.maxLength && str.length > v.maxLength) return v.message || `${field.label || field.name} must be at most ${v.maxLength} characters`;

  // Min length
  if (v.minLength && str.length < v.minLength) return v.message || `${field.label || field.name} must be at least ${v.minLength} characters`;

  // Max date
  if (v.maxDate && value) {
    const maxD = v.maxDate === "today" ? new Date() : new Date(v.maxDate);
    maxD.setHours(23, 59, 59, 999);
    if (new Date(value) > maxD) return v.message || `${field.label || field.name} cannot be a future date`;
  }

  // Custom validator
  if (typeof v.custom === "function") {
    const err = v.custom(value, formData);
    if (err) return err;
  }

  return null;
};

/* ════════════════════════════════════════════
   CONDITIONAL VISIBILITY EVALUATOR
   — Checks field.visibleWhen against current formData
════════════════════════════════════════════ */
const isFieldVisible = (field, formData) => {
  if (!field.visibleWhen) return true;
  const { field: depField, operator, value: depValue } = field.visibleWhen;
  const currentVal = getNestedValue(formData, depField);
  switch (operator) {
    case "eq": return currentVal === depValue;
    case "neq": return currentVal !== depValue;
    case "in": return Array.isArray(depValue) && depValue.includes(currentVal);
    case "notIn": return Array.isArray(depValue) && !depValue.includes(currentVal);
    case "exists": return currentVal !== undefined && currentVal !== null && currentVal !== "";
    default: return currentVal === depValue;
  }
};

const FormRenderer = ({
  fields = [],
  fieldsByTab = null,
  activeTab = null,
  submitButton,
  onSubmit,
  onChange,
  onNextTab,
  isLastTab = true,
  data = {},
  value,
}) => {
  const [formData, setFormData] = useState(data);
  const [changedFields, setChangedFields] = useState({});
  const [dynamicOptions, setDynamicOptions] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [croppingField, setCroppingField] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const baselineRef = useRef(null);
  const recordId = data?._id;

  const visibleFields =
    fieldsByTab && activeTab
      ? fieldsByTab[activeTab] || fields
      : fields;

  const prevDataKeyRef = useRef(null);

  useEffect(() => {
    // Generate a lightweight fingerprint of data to avoid re-triggering when parent passes new object references
    const dataFingerprint = data ? (data._id || data.id || JSON.stringify(data)) : "";
    const fieldsFingerprint = Array.isArray(fields) ? fields.map(f => `${f.name}:${f.default}`).join('|') : "";
    const currentSyncKey = `${dataFingerprint}___${fieldsFingerprint}`;

    if (prevDataKeyRef.current === currentSyncKey) {
      return;
    }
    prevDataKeyRef.current = currentSyncKey;

    const defaults = {};
    (fields || []).forEach((field) => {
      if (field.default !== undefined) defaults[field.name] = field.default;
      if (field.hidden && field.value !== undefined) defaults[field.name] = field.value;
      if (field.type === "multiGroup" && !defaults[field.name]) {
        const newItem = {};
        const subFields = field.subFormFields || field.fields || [];
        subFields.forEach(sf => { newItem[sf.name] = ""; });
        defaults[field.name] = [newItem];
      }
    });

    if (data && (data._id || data.id || Object.keys(data).length > 0)) {
      const merged = { ...defaults, ...data };
      baselineRef.current = structuredClone(merged);
      setFormData(merged);
      setChangedFields({});
    } else {
      setFormData((prev) => {
        const hasMissing = Object.keys(defaults).some(k => prev[k] === undefined);
        return hasMissing ? { ...defaults, ...prev } : prev;
      });
    }

    // Auto-fetch options for AutoComplete fields with pre-filled values on load
    (fields || []).forEach(f => {
      if (f.type === "AutoComplete" && f.source) {
        const val = getNestedValue(data, f.name);
        if (val) {
          handlePopulate(f);
        }
      }
    });
  }, [fields, data]);

  const update = (name, value) => {
    if (!name) return;
    setFormData((prev) => {
      const updated = { ...prev };
      setNestedValue(updated, name, value);
      setChangedFields(p => ({ ...p, [name]: value }));

      // Clear dependent fields' values and option caches when parent changes
      fields.forEach(f => {
        if (f.dependsOn === name) {
          setNestedValue(updated, f.name, null);
          setDynamicOptions(prevOpts => ({ ...prevOpts, [f.name]: [] }));
        }
      });

      if (name.includes('country')) {
        setNestedValue(updated, name.replace('country', 'state'), null);
        setNestedValue(updated, name.replace('country', 'city'), null);
      } else if (name.includes('state')) {
        setNestedValue(updated, name.replace('state', 'city'), null);
      }
      onChange?.(updated);
      return updated;
    });
  };

  const handleAutoFetch = async (field, value) => {
    try {
      const response = await fetch(`https://ifsc.razorpay.com/${value}`);
      if (response.ok) {
        const data = await response.json();
        if (data.BANK && field.autoFetch.target) {
          setFormData(prev => {
            const updated = { ...prev };
            setNestedValue(updated, field.autoFetch.target, data.BANK);
            onChange?.(updated);
            return updated;
          });
        }
      }
    } catch (error) { /* silent */ }
  };

  const handlePopulate = async (field) => {
    if (!field.dependsOn && dynamicOptions[field.name]?.length > 0) return;
    try {
      let url = field.source;
      if (field.dependsOn) {
        const parentValue = getNestedValue(formData, field.dependsOn);
        if (!parentValue?._id) return;
        url = url.replace(/:\w+/g, parentValue._id);
        if (field.name.includes('city') && field.dependsOn.includes('state')) {
          const countryValue = getNestedValue(formData, field.dependsOn.replace('state', 'country'));
          if (countryValue?._id) url += `?countryCode=${countryValue._id}`;
        }
      }
      const [baseUrl, queryString] = url.split('?');
      let payload = {};
      if (queryString) {
        const sp = new URLSearchParams(queryString);
        for (const [k, v] of sp.entries()) { try { payload[k] = JSON.parse(v); } catch { payload[k] = v; } }
      }
      if (field.dynamicOptions?.params?.aggregate) {
        payload.aggregate = true;
        payload.stages = field.dynamicOptions.params.stages;
      }
      const response = await axiosInstance.post(baseUrl, Object.keys(payload).length > 0 ? payload : undefined);
      let d = response?.data?.data || [];
      if (!Array.isArray(d) && typeof d === "object") {
        const arr = Object.values(d).find(v => Array.isArray(v));
        if (arr) d = arr;
      }
      if (field.transform && typeof field.transform === 'function') d = field.transform(d);
      setDynamicOptions(prev => ({ ...prev, [field.name]: d }));
    } catch (err) { console.error("Autocomplete fetch failed:", err); }
  };

  /* ═════════════ FIELD RENDERER ═════════════ */
  const renderField = (field, value, onFieldChange, parentContext = formData) => {
    const options = dynamicOptions[field.name] || field.options || [];
    const isFocused = focusedField === field.name;
    const filled = value !== undefined && value !== null && value !== "";

    const inputCls = `
      w-full h-[36px] px-3 py-1.5 rounded-[var(--tracker-radius-md)] text-[12px]
      bg-[var(--tracker-surface)]
      border transition-all duration-200 outline-none
      text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-subtle)] placeholder:text-[12px]
      ${isFocused
        ? 'border-[var(--brand-solid)] ring-2 ring-[var(--brand-solid)]/15 shadow-xs'
        : 'border-[var(--tracker-border)] hover:border-[var(--tracker-ink-subtle)] hover:bg-[var(--tracker-surface-1)]/20'}
    `;

    /* ── Section / Group Heading ── */
    if (field.type === "section" || field.type === "heading") {
      return (
        <div className="pt-3 pb-1 border-b border-[var(--tracker-border)] dark:border-slate-800 flex items-center justify-between mb-0.5">
          <h2 className="text-[13px] font-bold text-[var(--tracker-ink)] tracking-tight flex items-center gap-2">
            <span className="w-1 h-3.5 bg-[var(--brand-solid)] rounded-full inline-block" />
            {field.label}
          </h2>
          {field.description && (
            <span className="text-[11px] text-[var(--tracker-ink-subtle)]">
              {field.description}
            </span>
          )}
        </div>
      );
    }

    // ── Country Dropdown override ──
    const isCountry = field.name.endsWith("country") || field.name === "country" || field.label === "Country";
    if (isCountry) {
      const countryList = Country.getAllCountries().map(c => ({ value: c.name, label: c.name }));
      const selectedOpt = countryList.find(o => o.value === value) || null;
      return (
        <SearchableSelect
          options={countryList}
          value={selectedOpt}
          onChange={(opt) => onFieldChange(opt?.value ?? opt)}
          multiple={false}
          labelField="label"
          fieldName="value"
          label={field.label}
          required={field.required}
        />
      );
    }

    // ── State Dropdown override ──
    const isState = field.name.endsWith("state") || field.name === "state" || field.label === "State";
    if (isState) {
      const countryPath = field.name.replace("state", "country");
      const countryName = getNestedValue(parentContext, countryPath) || getNestedValue(parentContext, "country");
      const countryCode = getCountryCode(countryName);

      const stateList = countryCode
        ? State.getStatesOfCountry(countryCode).map(s => ({ value: s.name, label: s.name }))
        : [];
      const selectedOpt = stateList.find(o => o.value === value) || null;

      return (
        <SearchableSelect
          options={stateList}
          value={selectedOpt}
          onChange={(opt) => onFieldChange(opt?.value ?? opt)}
          multiple={false}
          labelField="label"
          fieldName="value"
          label={field.label}
          required={field.required}
        />
      );
    }

    // ── City Dropdown override ──
    const isCity = field.name.endsWith("city") || field.name === "city" || field.label === "City";
    if (isCity) {
      const countryPath = field.name.replace("city", "country");
      const statePath = field.name.replace("city", "state");

      const countryName = getNestedValue(parentContext, countryPath) || getNestedValue(parentContext, "country");
      const stateName = getNestedValue(parentContext, statePath) || getNestedValue(parentContext, "state");

      const countryCode = getCountryCode(countryName);
      const stateCode = getStateCode(countryCode, stateName);

      const cityList = (countryCode && stateCode)
        ? City.getCitiesOfState(countryCode, stateCode).map(c => ({ value: c.name, label: c.name }))
        : [];
      const selectedOpt = cityList.find(o => o.value === value) || null;

      return (
        <SearchableSelect
          options={cityList}
          value={selectedOpt}
          onChange={(opt) => onFieldChange(opt?.value ?? opt)}
          multiple={false}
          labelField="label"
          fieldName="value"
          label={field.label}
          required={field.required}
        />
      );
    }

    /* ── Label (read-only display) ── */
    if (field.type === "label") {
      return (
        <FormField label={field.label} required={field.required} focused={false}>
          <div className="w-full min-h-[36px] h-[36px] px-3 py-1.5 rounded-[var(--tracker-radius-md)] text-[12px] font-normal bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] text-[var(--tracker-ink)] flex items-center">
            {field.external ? field.externalValue ?? "—" : value ?? "—"}
          </div>
        </FormField>
      );
    }

    /* ── Select ── */
    if (field.type === "select") {
      let selectedOpt = null;
      if (typeof value === 'object' && value !== null) {
        selectedOpt = value;
      } else if (value !== undefined && value !== null && value !== '') {
        selectedOpt = (field.options || []).find(o => {
          if (typeof o === 'object' && o !== null) {
            return (o._id ?? o.value ?? o.name ?? o.label) === value || (o._id ?? o.value ?? o.name ?? o.label)?.toString() === value?.toString();
          }
          return o === value || o?.toString() === value?.toString();
        }) || value;
      }

      return (
        <SearchableSelect
          options={field.options || []}
          value={selectedOpt}
          onChange={(opt) => {
            const rawVal = typeof opt === 'object' && opt !== null
              ? (opt._id ?? opt.value ?? opt.name ?? opt.label)
              : opt;
            onFieldChange(rawVal);
          }}
          multiple={false}
          labelField="label"
          fieldName="name"
          label={field.label}
          required={field.required}
        />
      );
    }

    /* ── SubForm / multiGroup ── */
    if (field.type === "SubForm" || field.type === "multiGroup") {
      const isMulti = field.type === "multiGroup" || field.multiple;
      const subFormValue = isMulti ? (value || []) : (value || {});
      const subFields = field.subFormFields || field.fields || [];

      if (isMulti) {
        return (
          <div className="space-y-3 col-span-1 sm:col-span-2">
            <FormLabel label={field.label} required={field.required} />
            {subFormValue.map((item, index) => (
              <div key={index} className="rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] p-4 bg-[var(--tracker-surface)] relative group hover:border-[var(--tracker-ink-subtle)] transition-colors shadow-xs">
                <button type="button" onClick={() => onFieldChange(subFormValue.filter((_, i) => i !== index))}
                  className="absolute top-3 right-3 p-1.5 rounded-[var(--tracker-radius-sm)] text-[var(--tracker-ink-subtle)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-8">
                  {subFields.map((subField) => (
                    <div key={subField.name} className={subField.gridClass || "col-span-1"}>
                      {renderField(subField, item[subField.name], (val) => {
                        const updated = [...subFormValue];
                        updated[index] = { ...updated[index], [subField.name]: val };

                        // Auto-calculate line total for quotation items
                        if (field.name === "items" && (subField.name === "quantity" || subField.name === "unitPrice" || subField.name === "discount" || subField.name === "tax")) {
                          const qty = Number(updated[index].quantity) || 0;
                          const price = Number(updated[index].unitPrice) || 0;
                          const discount = Number(updated[index].discount) || 0;
                          const tax = Number(updated[index].tax) || 0;
                          updated[index].total = (qty * price) - discount + tax;
                        }

                        onFieldChange(updated);
                      }, item)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => {
              const newItem = {};
              subFields.forEach(sf => { newItem[sf.name] = ""; });
              onFieldChange([...subFormValue, newItem]);
            }}
              className="w-full py-3 rounded-[var(--tracker-radius-md)] border border-dashed border-[var(--tracker-border)] text-[13px] font-medium text-[var(--tracker-ink-muted)] hover:border-[var(--brand-solid)] hover:text-[var(--brand-solid)] hover:bg-[var(--brand-solid)]/5 transition-all cursor-pointer flex items-center justify-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add {field.label || "Item"}
            </button>
          </div>
        );
      } else {
        return (
          <div className="rounded-[var(--tracker-radius-md)] border border-[var(--tracker-border)] p-4 bg-[var(--tracker-surface)] col-span-1 sm:col-span-2 shadow-xs">
            <FormLabel label={field.label} required={field.required} />
            <div className="grid grid-cols-1 gap-4">
              {subFields.map((subField) => (
                <div key={subField.name}>
                  {renderField(subField, subFormValue[subField.name], (val) => onFieldChange({ ...subFormValue, [subField.name]: val }), subFormValue)}
                </div>
              ))}
            </div>
          </div>
        );
      }
    }

    /* ── Textarea ── */
    if (field.type === "textarea") {
      return (
        <FormField label={field.label} required={field.required} focused={isFocused}>
          <textarea
            rows={field.rows || 3}
            value={value || ""}
            placeholder={field.placeholder || `Enter ${field.label || ""}...`}
            onChange={(e) => onFieldChange(e.target.value)}
            onFocus={() => setFocusedField(field.name)}
            onBlur={() => setFocusedField(null)}
            className={`
              w-full px-3.5 py-2.5 rounded-[var(--tracker-radius-md)] text-[13px] resize-none
              bg-[var(--tracker-surface)]
              border transition-all duration-200 outline-none
              text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-subtle)]
              ${isFocused
                ? 'border-[var(--brand-solid)] ring-3 ring-[var(--brand-solid)]/15 shadow-xs'
                : 'border-[var(--tracker-border)] hover:border-[var(--tracker-ink-subtle)] hover:bg-[var(--tracker-surface-1)]/20'}
            `}
          />
        </FormField>
      );
    }

    /* ── File Upload with 1:1 Image Cropper ── */
    if (field.type === "file") {
      const hasFile = !!value;
      const isImageField = field.accept?.includes('image') || field.name?.includes('profile') || field.name?.includes('avatar') || field.crop;
      const fileId = `file-${field.name.replace(/\./g, '-')}`;

      const getImageUrl = (val) => {
        if (!val) return '';
        if (typeof val === 'string') {
          if (val.startsWith('http') || val.startsWith('data:') || val.startsWith('blob:')) return val;
          if (val.includes('serve/')) return `${axiosInstance.defaults.baseURL.replace('/api', '')}/api/files/${val}`;
          return `${axiosInstance.defaults.baseURL.replace('/api', '')}/api/files/render/profile/${val.split('/').pop()}`;
        }
        if (val instanceof Blob || val instanceof File) {
          return URL.createObjectURL(val);
        }
        return '';
      };

      const imageUrl = isImageField && hasFile ? getImageUrl(value) : '';

      const handleFileInput = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (isImageField) {
          const rawSrc = URL.createObjectURL(file);
          setCroppingField({ field, rawSrc, onFieldChange });
        } else {
          onFieldChange(file);
        }
        e.target.value = "";
      };

      if (isImageField) {
        return (
          <FormField label={field.label} required={field.required} focused={false}>
            <div className="flex flex-wrap items-center gap-3.5 p-3 rounded-[var(--tracker-radius-md)] border border-hairline bg-[var(--tracker-surface)] shadow-2xs">
              <input
                type="file"
                accept={field.accept || "image/*"}
                onChange={handleFileInput}
                className="hidden"
                id={fileId}
              />

              {/* 1:1 Circular / Square Avatar Preview */}
              <div className="relative group/avatar">
                {imageUrl ? (
                  <div className="w-13 h-13 rounded-full overflow-hidden border-2 border-indigo-500 bg-surface-1 shadow-xs flex-shrink-0 flex items-center justify-center">
                    <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-13 h-13 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border-2 border-dashed border-indigo-300 dark:border-indigo-700 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <ImageIcon size={20} />
                  </div>
                )}
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setCroppingField({ field, rawSrc: imageUrl, onFieldChange })}
                    className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md transition cursor-pointer"
                    title="Adjust & Crop 1:1"
                  >
                    <Crop size={10} />
                  </button>
                )}
              </div>

              {/* Details and Actions */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-[12.5px] font-semibold text-ink truncate">
                    {hasFile ? (typeof value === 'string' ? '1:1 Profile Picture' : value.name) : 'No picture selected'}
                  </p>
                  {hasFile && (
                    <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      1:1 Matched
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor={fileId}
                    className="py-1 px-2.5 bg-surface hover:bg-surface-1 border border-hairline rounded-md text-[11px] font-medium text-ink flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Upload size={12} className="text-indigo-500" />
                    {hasFile ? 'Change Picture' : 'Upload Image'}
                  </label>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setCroppingField({ field, rawSrc: imageUrl, onFieldChange })}
                      className="py-1 px-2.5 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Crop size={12} />
                      Adjust & Crop 1:1
                    </button>
                  )}
                </div>
              </div>
            </div>
          </FormField>
        );
      }

      return (
        <FormField label={field.label} required={field.required} focused={false}>
          <label htmlFor={fileId}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-[var(--tracker-radius-md)] cursor-pointer group transition-all duration-200
              border border-dashed bg-[var(--tracker-surface)]
              ${hasFile ? 'border-[var(--brand-solid)] bg-[var(--brand-solid)]/5' : 'border-[var(--tracker-border)] hover:border-[var(--brand-solid)] hover:bg-[var(--brand-solid)]/5'}
            `}
          >
            <input type="file" accept={field.accept} onChange={handleFileInput} className="hidden" id={fileId} />
            <div className={`h-10 w-10 rounded-[var(--tracker-radius-sm)] flex items-center justify-center flex-shrink-0 transition-colors ${hasFile ? 'bg-[var(--tracker-surface)] border border-[var(--tracker-border)]' : 'bg-[var(--tracker-surface-1)] group-hover:bg-[var(--tracker-surface)] border border-transparent group-hover:border-[var(--tracker-border)]'}`}>
              {hasFile ? <FileText className="h-4 w-4 text-[var(--tracker-ink)]" /> : <Upload className="h-4 w-4 text-[var(--tracker-ink-subtle)] group-hover:text-[var(--brand-solid)] transition-colors" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-medium truncate transition-colors ${hasFile ? 'text-[var(--tracker-ink)]' : 'text-[var(--tracker-ink-muted)] group-hover:text-[var(--brand-solid)]'}`}>
                {hasFile ? (typeof value === 'string' ? 'Change file' : value.name) : 'Click to upload'}
              </p>
              <p className="text-[11px] text-[var(--tracker-ink-subtle)] mt-0.5">{field.accept?.replace('/*', '') || 'Any file'}</p>
            </div>
          </label>
        </FormField>
      );
    }

    /* ── AutoComplete ── */
    if (field.type === "AutoComplete") {
      return (
        <SearchableSelect
          options={options}
          value={field.multiple ? (value || []) : (value || null)}
          onChange={onFieldChange}
          multiple={field.multiple}
          labelField={field.labelField}
          fieldName={field.fieldName}
          label={field.label}
          required={field.required}
          placeholder={field.placeholder}
          onOpen={() => handlePopulate(field)}
        />
      );
    }

    /* ── Date ── */
    if (field.type === "date") {
      return (
        <CustomDatePicker
          value={value}
          onChange={(val) => {
            onFieldChange(val);
            if (field.validate) {
              const err = validateField(field, val, formData);
              setFieldErrors(prev => ({ ...prev, [field.name]: err }));
            }
          }}
          label={field.label}
          required={field.required}
          maxDate={field.validate?.maxDate}
          error={fieldErrors[field.name]}
        />
      );
    }

    /* ── Password ── */
    if (field.type === "password") {
      const showPassword = !!showPasswords[field.name];
      const toggleShow = () => {
        setShowPasswords(prev => ({
          ...prev,
          [field.name]: !prev[field.name]
        }));
      };

      return (
        <FormField label={field.label} required={field.required} focused={isFocused}>
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              value={typeof value === 'object' && value !== null ? JSON.stringify(value) : (value || "")}
              placeholder={field.placeholder || `Enter ${field.label || ""}...`}
              onChange={(e) => {
                onFieldChange(e.target.value);
              }}
              onFocus={() => setFocusedField(field.name)}
              onBlur={() => setFocusedField(null)}
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={toggleShow}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </FormField>
      );
    }
    /* ── Switch / Toggle ── */
    if (field.type === "switch") {
      const switchLabels = field.switchLabels || { on: "Enabled", off: "Disabled" };
      // Determine boolean state — handle string "Active"/"Inactive" and true/false
      const isOn = value === true || value === switchLabels.on || value === "Active";
      const handleToggle = () => {
        if (field.switchLabels) {
          onFieldChange(isOn ? switchLabels.off : switchLabels.on);
        } else {
          onFieldChange(!isOn);
        }
      };
      return (
        <FormField label={field.label} required={field.required} focused={false}>
          <div className="flex items-center gap-3 min-h-[42px]">
            <button
              type="button"
              role="switch"
              aria-checked={isOn}
              onClick={handleToggle}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0
                ${isOn
                  ? 'bg-[var(--brand-solid)]'
                  : 'bg-[var(--tracker-border)] hover:bg-[var(--tracker-ink-subtle)]'}
              `}
            >
              <span
                className={`
                  inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transform transition-transform duration-200
                  ${isOn ? 'translate-x-[22px]' : 'translate-x-[3px]'}
                `}
              />
            </button>
            <span className={`text-[12px] font-medium select-none ${isOn ? 'text-[var(--brand-solid)]' : 'text-[var(--tracker-ink-subtle)]'
              }`}>
              {isOn ? switchLabels.on : switchLabels.off}
            </span>
          </div>
        </FormField>
      );
    }

    /* ── Default Text/Number/Email/etc ── */
    const fieldError = fieldErrors[field.name];
    return (
      <FormField label={field.label} required={field.required} focused={isFocused}>
        <input
          type={field.type || "text"}
          value={typeof value === 'object' && value !== null ? JSON.stringify(value) : (value || "")}
          placeholder={field.placeholder || `Enter ${field.label || ""}...`}
          maxLength={field.validate?.maxLength || undefined}
          onChange={(e) => {
            let val = e.target.value;
            // Enforce digit-only input for fields with digitOnly validation
            if (field.validate?.digitOnly) val = val.replace(/\D/g, "");
            onFieldChange(val);
            if (field.autoFetch && val.length === 11) handleAutoFetch(field, val);
            // Clear error on change if corrected
            if (fieldError) {
              const err = validateField(field, val, formData);
              setFieldErrors(prev => ({ ...prev, [field.name]: err }));
            }
          }}
          onFocus={() => setFocusedField(field.name)}
          onBlur={() => {
            setFocusedField(null);
            if (field.validate) {
              const err = validateField(field, value, formData);
              setFieldErrors(prev => ({ ...prev, [field.name]: err }));
            }
          }}
          className={`${inputCls}${fieldError ? ' !border-red-400 dark:!border-red-500 !ring-2 !ring-red-500/10' : ''}`}
        />
        {fieldError && (
          <p className="mt-1 text-[10.5px] font-medium text-red-500 dark:text-red-400 animate-fade-in">{fieldError}</p>
        )}
      </FormField>
    );
  };

  /* ═════════ SUBMIT ═════════ */
  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (submitting) return;

    // ── Run validation on all visible fields before submit ──
    const errors = {};
    const currentVisible = fieldsByTab && activeTab ? (fieldsByTab[activeTab] || fields) : fields;
    for (const field of currentVisible) {
      if (field.hidden || !isFieldVisible(field, formData)) continue;
      if (field.validate) {
        const val = getNestedValue(formData, field.name);
        const err = validateField(field, val, formData);
        if (err) errors[field.name] = err;
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...errors }));
      const firstErr = Object.values(errors)[0];
      toast.error(firstErr);
      return;
    }

    const cleanData = stripMetaFields(formData);
    const isEdit = Boolean(recordId);
    const changedKeys = Object.keys(changedFields);

    let payload = cleanData;
    if (isEdit && changedKeys.length > 0) {
      const patch = buildDirtyPatch(
        baselineRef.current || data,
        formData,
        changedKeys
      );
      if (Object.keys(patch).length > 0) {
        payload = patch;
      }
    }

    const meta = {
      formData: cleanData,
      fullPayload: cleanData,
      changedFields,
      isEdit,
      patchPayload: isEdit ? payload : cleanData,
    };

    setSubmitting(true);
    try {
      const result = onSubmit?.(payload, meta);
      if (result && typeof result.then === "function") {
        await result;
        if (isEdit) {
          baselineRef.current = structuredClone(formData);
          setChangedFields({});
        }
      }
    } catch (error) {
      console.error("FormRenderer submit error:", error);
      if (!error?.queued) {
        toast.error(error.response?.data?.message || "Failed to save changes");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ═════════ RENDER ═════════ */
  return (
    <form onSubmit={onSubmitHandler} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-3">
        {visibleFields
          .filter((f) => !f.hidden && isFieldVisible(f, formData))
          .sort((a, b) => (a.orderKey ?? 999) - (b.orderKey ?? 999))
          .map((field) => {
            const isFullWidth = field.type === 'section' || field.type === 'heading' || field.type === 'multiGroup' || field.type === 'SubForm';
            return (
              <div key={field.name} className={field.gridClass || (isFullWidth ? 'col-span-1 sm:col-span-2 md:col-span-3 xl:col-span-4' : 'col-span-1')}>
                {renderField(
                  field,
                  field.external ? field.externalValue : getNestedValue(formData, field.name),
                  (val) => update(field.name, val),
                  formData
                )}
              </div>
            );
          })}
      </div>

      {isLastTab ? (
        <button
          type="submit"
          disabled={submitting}
          className="tracker-btn-primary w-full h-[44px] text-[14px] cursor-pointer disabled:opacity-60"
        >
          {submitting ? "Saving…" : submitButton?.text || "Submit"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            // Validate current tab fields before advancing
            const errors = {};
            const currentVisible = fieldsByTab && activeTab ? (fieldsByTab[activeTab] || fields) : fields;
            for (const field of currentVisible) {
              if (field.hidden || !isFieldVisible(field, formData)) continue;
              if (field.validate) {
                const val = getNestedValue(formData, field.name);
                const err = validateField(field, val, formData);
                if (err) errors[field.name] = err;
              }
            }
            if (Object.keys(errors).length > 0) {
              setFieldErrors(prev => ({ ...prev, ...errors }));
              toast.error(Object.values(errors)[0]);
              return;
            }
            onNextTab?.();
          }}
          className="tracker-btn-primary w-full h-[44px] text-[14px] cursor-pointer flex items-center justify-center gap-2"
        >
          Next
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      )}

      {/* 1:1 Image Cropper & Matcher Modal */}
      {croppingField && (
        <ImageCropperModal
          imageSrc={croppingField.rawSrc}
          title={`Crop & Match 1:1 (${croppingField.field.label || 'Profile Picture'})`}
          onCropComplete={(blob, croppedFile) => {
            croppingField.onFieldChange(croppedFile);
            setCroppingField(null);
          }}
          onCancel={() => setCroppingField(null)}
        />
      )}
    </form>
  );
};

export default FormRenderer;
