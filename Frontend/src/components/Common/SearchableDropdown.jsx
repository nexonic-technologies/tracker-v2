import { useState, useRef, useEffect } from "react";
import { FiChevronDown, FiSearch, FiX } from "react-icons/fi";

const SearchableDropdown = ({
  options = [], // can be array of strings, numbers, or array of { value, label }
  value = "",
  onChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  disabled = false,
  required = false
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Normalize options to objects with value and label
  const normalizedOptions = options.map(opt => {
    if (opt === null || opt === undefined) {
      return { value: "", label: "" };
    }
    if (typeof opt === "string" || typeof opt === "number") {
      const strVal = String(opt);
      return { value: strVal, label: strVal };
    }
    return {
      value: String(opt.value ?? opt._id ?? ""),
      label: String(opt.label ?? opt.name ?? opt.value ?? "")
    };
  });

  const selectedOpt = normalizedOptions.find(opt => opt.value === String(value));

  // Filter options based on search query
  const filtered = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className={`
          w-full h-11 px-3.5 rounded-tracker-md text-left flex items-center justify-between gap-2
          border transition-all duration-200 outline-none text-sm bg-surface text-ink
          ${disabled 
            ? "border-hairline bg-surface-1 text-ink-tertiary cursor-not-allowed opacity-60" 
            : "border-hairline hover:border-ink-subtle cursor-pointer"
          }
          ${open ? "border-[var(--tracker-border-focus)] ring-2 ring-violet-500/15" : ""}
        `}
      >
        <span className="truncate">
          {selectedOpt ? selectedOpt.label : <span className="text-ink-subtle">{placeholder}</span>}
        </span>
        <FiChevronDown className={`h-4 w-4 shrink-0 text-ink-subtle transition-transform duration-200 ${open ? "rotate-180 text-ink" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-hairline rounded-tracker-md shadow-tracker-overlay overflow-hidden flex flex-col max-h-64 animate-fade-in animate-fade-in-up">
          {/* Search box header */}
          <div className="p-2 border-b border-hairline-soft bg-surface relative flex items-center flex-shrink-0">
            <FiSearch className="absolute left-4.5 text-ink-subtle h-3.5 w-3.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
              className="w-full pl-8.5 pr-8 py-1.5 bg-surface-1 border border-hairline rounded-tracker-sm text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-[var(--tracker-border-focus)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-4 text-ink-subtle hover:text-ink p-1 rounded-full hover:bg-surface-2"
              >
                <FiX className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* List items */}
          <ul className="overflow-y-auto py-1 flex-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-4 text-sm text-ink-subtle text-center">No options found</li>
            ) : (
              filtered.map((opt, idx) => {
                const isActive = opt.value === String(value);
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`
                        w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between
                        ${isActive 
                          ? "bg-[var(--module-accent-light)] text-[var(--module-accent)] font-semibold" 
                          : "text-ink hover:bg-surface-1"
                        }
                      `}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[var(--module-accent)] shrink-0 ml-2" />}
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
};

export default SearchableDropdown;
