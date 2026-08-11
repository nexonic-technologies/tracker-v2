import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Reusable month/year navigator with chevron buttons.
 * @param {{ month: number, year: number, onChange: (month: number, year: number) => void }} props
 */
export default function MonthNavigator({ month, year, onChange }) {
  const prev = () => {
    if (month === 0) onChange(11, year - 1);
    else onChange(month - 1, year);
  };
  const next = () => {
    if (month === 11) onChange(0, year + 1);
    else onChange(month + 1, year);
  };

  return (
    <div className="flex items-center gap-1 bg-surface border border-hairline rounded-[8px] px-1 py-0.5">
      <button onClick={prev} className="p-1.5 hover:bg-surface-1 rounded-[6px] transition cursor-pointer">
        <ChevronLeft className="h-4 w-4 text-ink-subtle" />
      </button>
      <span className="px-3 text-[14px] font-medium text-ink min-w-[140px] text-center">
        {MONTH_NAMES[month]} {year}
      </span>
      <button onClick={next} className="p-1.5 hover:bg-surface-1 rounded-[6px] transition cursor-pointer">
        <ChevronRight className="h-4 w-4 text-ink-subtle" />
      </button>
    </div>
  );
}

export { MONTH_NAMES };
