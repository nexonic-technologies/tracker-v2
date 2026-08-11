import { useState, useRef, useEffect } from "react";

export default function ColumnVisibility({
  columns,
  selectedCols,
  toggleColumn,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 px-4 py-2.5 bg-[#111111] hover:bg-[#313130] text-white rounded-[8px] text-[13px] font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
        <span>Columns</span>
        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-20 mt-2 w-60 bg-white border border-[#d3cec6] rounded-[12px] shadow-sm p-3 right-0"
        >
          <div className="mb-3">
            <h3 className="text-[12px] font-semibold text-[#626260] uppercase tracking-wide">Column Visibility</h3>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {columns.map((col) => (
              <label
                key={col}
                className="flex items-center justify-between p-2.5 rounded-[8px] hover:bg-[#f5f1ec] cursor-pointer transition-colors group"
              >
                <span
                  className={`text-[13px] transition-colors ${
                    selectedCols.includes(col) 
                      ? "font-medium text-[#111111]" 
                      : "text-[#7b7b78]"
                  }`}
                >
                  {col}
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedCols.includes(col)}
                    onChange={() => toggleColumn(col)}
                    className="w-4 h-4 text-[#111111] bg-white border-[#d3cec6] rounded focus:ring-1 focus:ring-[#111111] focus:ring-offset-0 transition-all"
                  />
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
