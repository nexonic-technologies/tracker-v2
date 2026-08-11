import { useState, useEffect, useRef } from "react";
import axiosInstance from "../../api/axiosInstance";
import toast from "react-hot-toast";
import { ChevronDown, X, Search, Upload, FileText, Plus, Trash2, Check, Calendar, Eye, EyeOff } from "lucide-react";
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
   FLOATING LABEL INPUT WRAPPER
   — Material-style label that floats on focus
════════════════════════════════════════════ */
const FloatingField = ({ label, required, filled, focused, children, className = "" }) => (
  <div className={`relative ${className}`}>
    {children}
    {label && (
      <span className={`
        absolute left-3 pointer-events-none select-none
        transition-all duration-200 ease-out
        ${filled || focused
          ? '-top-2 text-[10px] font-semibold px-1.5 bg-white'
          : 'top-1/2 -translate-y-1/2 text-[13px] font-normal'}
        ${focused
          ? 'text-[#111111]'
          : filled
            ? 'text-[#626260]'
            : 'text-[#7b7b78]'}
      `}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
    )}
  </div>
);

/* ════════════════════════════════════════════
   SEARCHABLE DROPDOWN (replaces MUI Autocomplete)
════════════════════════════════════════════ */
const SearchableSelect = ({ options = [], value, onChange, multiple, labelField, fieldName, placeholder, label, required, onOpen }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setIsFocused(false); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (!open && onOpen) onOpen();
    setOpen(!open);
    setIsFocused(true);
  };

  const getLabel = (opt) => {
    if (!opt) return "";
    if (typeof opt === 'object') {
      return opt?.[labelField] || opt?.[fieldName] || opt?.name || opt?.title || opt?.label || opt?._id || "";
    }
    const match = options.find(o => (o?._id || o?.id || o?.value) === opt);
    if (match) {
      return match[labelField] || match[fieldName] || match.name || match.title || match.label || opt;
    }
    return opt;
  };

  const filtered = options.filter((opt) =>
    getLabel(opt).toLowerCase().includes(search.toLowerCase())
  );

  const isFilled = multiple ? (value || []).length > 0 : !!value;

  const isSelected = (opt) => {
    if (multiple) return (value || []).some(v => (v?._id || v) === (opt?._id || opt));
    return (value?._id || value) === (opt?._id || opt);
  };

  const handleSelect = (opt) => {
    if (multiple) {
      const current = value || [];
      const exists = current.some(v => (v?._id || v) === (opt?._id || opt));
      onChange(exists ? current.filter(v => (v?._id || v) !== (opt?._id || opt)) : [...current, opt]);
    } else {
      onChange(opt);
      setOpen(false);
      setSearch("");
    }
  };

  const removeTag = (opt, e) => {
    e.stopPropagation();
    onChange((value || []).filter(v => (v?._id || v) !== (opt?._id || opt)));
  };

  return (
    <div ref={ref} className="relative">
      <FloatingField label={label} required={required} filled={isFilled} focused={open}>
        <button type="button" onClick={handleOpen}
          className={`
            w-full min-h-[48px] pl-3.5 pr-9 py-2 rounded-tracker-md text-left flex items-center gap-1.5 flex-wrap
            bg-surface cursor-pointer
            border transition-all duration-200 outline-none
            ${open
              ? 'border-[var(--tracker-border-focus)] ring-2 ring-violet-500/15'
              : 'border-hairline hover:border-ink-subtle'}
          `}
        >
          {multiple && (value || []).map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-tracker-sm bg-surface-1 text-ink text-[12px] font-medium border border-hairline-soft">
              {getLabel(v)}
              <span onClick={(e) => removeTag(v, e)} className="p-0.5 rounded-[4px] hover:bg-surface-2 transition-colors cursor-pointer text-ink-subtle hover:text-ink">
                <X className="h-3 w-3" />
              </span>
            </span>
          ))}
          {!multiple && value && <span className="text-[13px] text-ink">{getLabel(value)}</span>}
        </button>
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-transform duration-200 ${open ? 'rotate-180 text-ink' : 'text-ink-subtle'}`} />
      </FloatingField>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-hairline rounded-tracker-md shadow-tracker-overlay overflow-hidden animate-fade-in animate-fade-in-up">
          {options.length > 4 && (
            <div className="p-2 border-b border-hairline-soft bg-surface">
              <div className="flex items-center gap-2 px-2.5 h-9 bg-surface-1 border border-hairline rounded-tracker-sm">
                <Search className="h-3.5 w-3.5 text-ink-subtle flex-shrink-0" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  placeholder="Search..." autoFocus
                  className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-subtle focus:outline-none" />
                {search && <X className="h-3 w-3 text-ink-subtle cursor-pointer hover:text-ink" onClick={() => setSearch("")} />}
              </div>
            </div>
          )}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-[13px] text-ink-subtle text-center">No results</div>
            ) : filtered.map((opt, idx) => {
              const sel = isSelected(opt);
              return (
                <div key={opt?._id || opt?.value || idx} onClick={() => handleSelect(opt)}
                  className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors text-[13px] ${sel ? 'bg-[var(--module-accent-light)] text-[var(--module-accent)] font-semibold' : 'text-ink hover:bg-surface-1 hover:text-ink'}`}
                >
                  <span>{getLabel(opt)}</span>
                  {sel && <Check className="h-3.5 w-3.5 text-[var(--module-accent)] flex-shrink-0" />}
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
const CustomDatePicker = ({ value, onChange, label, required }) => {
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

  const handleSelectDay = (day) => {
    const selected = new Date(year, month, day);
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, "0");
    const dd = String(selected.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
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
    <div ref={ref} className="relative">
      <FloatingField label={label} required={required} filled={isFilled} focused={open}>
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            if (!open) {
              setViewMode("days");
            }
          }}
          className={`
            w-full min-h-[48px] pl-3.5 pr-9 py-2 rounded-tracker-md text-left flex items-center
            bg-surface cursor-pointer text-[13px] text-ink
            border transition-all duration-200 outline-none
            ${open
              ? 'border-[var(--tracker-border-focus)] ring-2 ring-violet-500/15'
              : 'border-hairline hover:border-ink-subtle'}
          `}
        >
          {getDisplayValue() || ((open || isFilled) ? <span className="text-ink-subtle text-[13px]">Select date...</span> : "\u00A0")}
        </button>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none">
          <Calendar size={15} />
        </span>
      </FloatingField>

      {open && (
        <div className="absolute z-50 mt-1 p-3 w-[280px] bg-surface border border-hairline rounded-tracker-md shadow-tracker-overlay animate-fade-in animate-fade-in-up">
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
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectDay(cell.day)}
                        className={`
                          text-[11px] p-0.5 rounded-tracker-sm font-medium transition-colors cursor-pointer
                          min-w-[28px] min-h-[28px] flex items-center justify-center
                          ${selected
                            ? 'bg-[var(--module-accent)] text-white font-bold'
                            : isToday
                              ? 'border border-[var(--module-accent)] text-[var(--module-accent)] bg-[var(--module-accent-light)]'
                              : 'hover:bg-surface-1 text-ink'}
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
    </div>
  );
};

/* ════════════════════════════════════════════
   FORM RENDERER
════════════════════════════════════════════ */
const FormRenderer = ({
  fields = [],
  fieldsByTab = null,
  activeTab = null,
  submitButton,
  onSubmit,
  onChange,
  data = {},
  value,
}) => {
  const [formData, setFormData] = useState(data);
  const [changedFields, setChangedFields] = useState({});
  const [dynamicOptions, setDynamicOptions] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const baselineRef = useRef(null);
  const recordId = data?._id;

  const visibleFields =
    fieldsByTab && activeTab
      ? fieldsByTab[activeTab] || fields
      : fields;

  useEffect(() => {
    const defaults = {};
    fields.forEach((field) => {
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
      setFormData((prev) => ({ ...defaults, ...prev }));
    }

    // Auto-fetch options for AutoComplete fields with pre-filled values on load
    fields.forEach(f => {
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
      w-full h-12 px-3.5 pt-4 pb-1 rounded-[8px] text-[13px]
      bg-white
      border transition-all duration-200 outline-none
      text-[#111111]
      ${isFocused
        ? 'border-[#111111] ring-1 ring-[#111111]'
        : 'border-[#d3cec6] hover:border-[#a8a39d]'}
    `;

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
        <FloatingField label={field.label} required={field.required} filled={true} focused={false}>
          <div className="w-full h-12 px-3.5 pt-5 pb-1 rounded-[8px] text-[13px] font-medium bg-[#f5f1ec] border border-[#d3cec6] text-[#111111]">
            {field.external ? field.externalValue ?? "—" : value ?? "—"}
          </div>
        </FloatingField>
      );
    }

    /* ── Select ── */
    if (field.type === "select") {
      const selectedOpt = field.options?.find(o => (o._id ?? o.value) === value) || null;
      return (
        <SearchableSelect
          options={field.options || []}
          value={selectedOpt}
          onChange={(opt) => onFieldChange(opt?._id ?? opt?.value ?? opt)}
          multiple={false}
          labelField="name"
          fieldName="label"
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
            <label className="block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-1">
              {field.label}
            </label>
            {subFormValue.map((item, index) => (
              <div key={index} className="rounded-[12px] border border-[#ebe7e1] p-4 bg-white relative group hover:border-[#d3cec6] transition-colors">
                <button type="button" onClick={() => onFieldChange(subFormValue.filter((_, i) => i !== index))}
                  className="absolute top-3 right-3 p-1.5 rounded-[6px] text-[#7b7b78] hover:text-[#c41c1c] hover:bg-[#c41c1c]/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
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
              className="w-full py-3 rounded-[8px] border border-dashed border-[#d3cec6] text-[13px] font-medium text-[#626260] hover:border-[#111111] hover:text-[#111111] hover:bg-[#f5f1ec] transition-all cursor-pointer flex items-center justify-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add {field.label || "Item"}
            </button>
          </div>
        );
      } else {
        return (
          <div className="rounded-[12px] border border-[#ebe7e1] p-4 bg-white col-span-1 sm:col-span-2">
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
        <FloatingField label={field.label} required={field.required} filled={filled} focused={isFocused}
          className="[&>span]:top-3 [&>span]:translate-y-0"
        >
          <textarea
            rows={field.rows || 3}
            value={value || ""}
            onChange={(e) => onFieldChange(e.target.value)}
            onFocus={() => setFocusedField(field.name)}
            onBlur={() => setFocusedField(null)}
            className={`
              w-full px-3.5 pt-5 pb-2 rounded-[8px] text-[13px] resize-none
              bg-white
              border transition-all duration-200 outline-none
              text-[#111111]
              ${isFocused
                ? 'border-[#111111] ring-1 ring-[#111111]'
                : 'border-[#d3cec6] hover:border-[#a8a39d]'}
            `}
          />
        </FloatingField>
      );
    }

    /* ── File Upload ── */
    if (field.type === "file") {
      const hasFile = !!value;
      return (
        <label htmlFor={`file-${field.name.replace(/\./g, '-')}`}
          className={`flex items-center gap-3 px-3.5 py-3 rounded-[8px] cursor-pointer group transition-all duration-200
            border border-dashed bg-white
            ${hasFile ? 'border-[#111111] bg-[#f5f1ec]' : 'border-[#d3cec6] hover:border-[#111111] hover:bg-[#f5f1ec]'}
          `}
        >
          <input type="file" accept={field.accept} onChange={(e) => onFieldChange(e.target.files[0])} className="hidden" id={`file-${field.name.replace(/\./g, '-')}`} />
          {hasFile && (field.accept?.includes('image')) ? (
            <img src={typeof value === 'string' ? (value.startsWith('http') ? value : (value.includes('serve/') ? `${axiosInstance.defaults.baseURL.replace('/api', '')}/api/files/${value}` : `${axiosInstance.defaults.baseURL.replace('/api', '')}/api/files/render/profile/${value.split('/').pop()}`)) : (value instanceof Blob || value instanceof File) ? URL.createObjectURL(value) : ''}
              alt="" className="w-10 h-10 object-cover rounded-[6px] border border-[#d3cec6]" />
          ) : (
            <div className={`h-10 w-10 rounded-[6px] flex items-center justify-center flex-shrink-0 transition-colors ${hasFile ? 'bg-white border border-[#d3cec6]' : 'bg-[#f5f1ec] group-hover:bg-white border border-transparent group-hover:border-[#d3cec6]'}`}>
              {hasFile ? <FileText className="h-4 w-4 text-[#111111]" /> : <Upload className="h-4 w-4 text-[#7b7b78] group-hover:text-[#111111] transition-colors" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-[13px] font-medium truncate transition-colors ${hasFile ? 'text-[#111111]' : 'text-[#626260] group-hover:text-[#111111]'}`}>
              {hasFile ? (typeof value === 'string' ? 'Change file' : value.name) : 'Click to upload'}
            </p>
            <p className="text-[11px] text-[#7b7b78] mt-0.5">{field.accept?.replace('/*', '') || 'Any file'}</p>
          </div>
        </label>
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
          onChange={onFieldChange}
          label={field.label}
          required={field.required}
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
        <FloatingField label={field.label} required={field.required} filled={filled} focused={isFocused}>
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              value={typeof value === 'object' && value !== null ? JSON.stringify(value) : (value || "")}
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </FloatingField>
      );
    }

    /* ── Default Text/Number/Email/etc ── */
    return (
      <FloatingField label={field.label} required={field.required} filled={filled} focused={isFocused}>
        <input
          type={field.type || "text"}
          value={typeof value === 'object' && value !== null ? JSON.stringify(value) : (value || "")}
          onChange={(e) => {
            onFieldChange(e.target.value);
            if (field.autoFetch && e.target.value.length === 11) handleAutoFetch(field, e.target.value);
          }}
          onFocus={() => setFocusedField(field.name)}
          onBlur={() => setFocusedField(null)}
          className={inputCls}
        />
      </FloatingField>
    );
  };

  /* ═════════ SUBMIT ═════════ */
  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (submitting) return;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
        {visibleFields
          .filter((f) => !f.hidden)
          .sort((a, b) => (a.orderKey ?? 999) - (b.orderKey ?? 999))
          .map((field) => (
            <div key={field.name} className={field.gridClass || (field.type === 'multiGroup' || field.type === 'SubForm' ? 'col-span-1 sm:col-span-2' : 'col-span-1')}>
              {renderField(
                field,
                field.external ? field.externalValue : getNestedValue(formData, field.name),
                (val) => update(field.name, val),
                formData
              )}
            </div>
          ))}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="tracker-btn-primary w-full h-[44px] text-[14px] cursor-pointer disabled:opacity-60"
      >
        {submitting ? "Saving…" : submitButton?.text || "Submit"}
      </button>
    </form>
  );
};

export default FormRenderer;
