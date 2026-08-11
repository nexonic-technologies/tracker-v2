import { useEffect, useRef, useState } from "react";
import { Columns, Check } from "lucide-react";

const ColumnVisibilityDropdown = ({ columns, hiddenCols, onToggle }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-hairline bg-surface text-[13px] font-medium text-ink-muted hover:bg-[#EDE9FE] hover:text-[#7C3AED] hover:border-[#7C3AED] transition-colors"
        title="Column Visibility"
      >
        <Columns size={15} />
        Columns
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-48 rounded-[10px] border border-hairline bg-surface shadow-[0_4px_12px_rgba(108,61,232,0.15)] py-1.5">
          <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.4px] text-ink-subtle">Toggle Columns</p>
          {columns.map((col) => {
            const visible = !hiddenCols.includes(col);
            return (
              <button
                key={col}
                onClick={() => onToggle(col)}
                className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-ink hover:bg-surface-1 transition-colors"
              >
                <span>{col}</span>
                <span className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${visible ? "bg-[#7C3AED] border-[#7C3AED]" : "border-hairline bg-surface"}`}>
                  {visible && <Check size={10} color="white" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ColumnVisibilityDropdown;
