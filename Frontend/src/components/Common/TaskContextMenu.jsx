import { useEffect, useRef } from "react";
import { Edit2, Play, CheckCircle2, Flag, Trash2 } from "lucide-react";

export default function TaskContextMenu({ 
  x, y, task, onClose, onEdit, onStatusChange, onPriorityChange, onDelete 
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!task) return null;

  // Prevent menu from overflowing screen bounds
  const style = {
    top: Math.min(y, window.innerHeight - 250),
    left: Math.min(x, window.innerWidth - 200),
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] w-48 bg-surface border border-hairline rounded-tracker-md shadow-lg py-1 text-sm animate-in fade-in zoom-in-95 duration-100"
      style={style}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button 
        className="w-full flex items-center gap-2 px-3 py-2 text-ink hover:bg-surface-1 transition-colors text-left"
        onClick={() => { onEdit(task); onClose(); }}
      >
        <Edit2 size={14} className="text-ink-subtle" />
        <span>Open Task</span>
      </button>

      <div className="h-px bg-hairline-soft my-1" />

      {/* Quick Status */}
      <div className="px-3 py-1.5 text-xs font-semibold text-ink-muted uppercase tracking-widest">
        Status
      </div>
      <button 
        className="w-full flex items-center gap-2 px-3 py-2 text-ink hover:bg-surface-1 transition-colors text-left"
        onClick={() => { onStatusChange(task, "In Progress"); onClose(); }}
      >
        <Play size={14} className="text-[var(--tracker-info)]" />
        <span>Start Progress</span>
      </button>
      <button 
        className="w-full flex items-center gap-2 px-3 py-2 text-ink hover:bg-surface-1 transition-colors text-left"
        onClick={() => { onStatusChange(task, "Completed"); onClose(); }}
      >
        <CheckCircle2 size={14} className="text-[var(--tracker-success)]" />
        <span>Mark Complete</span>
      </button>

      <div className="h-px bg-hairline-soft my-1" />

      {/* Priority */}
      <div className="px-3 py-1.5 text-xs font-semibold text-ink-muted uppercase tracking-widest">
        Priority
      </div>
      <button 
        className="w-full flex items-center gap-2 px-3 py-2 text-ink hover:bg-surface-1 transition-colors text-left"
        onClick={() => { onPriorityChange(task, "High"); onClose(); }}
      >
        <Flag size={14} className="text-[var(--tracker-danger)]" />
        <span>Set High Priority</span>
      </button>

      {/* Delete (if allowed) */}
      {onDelete && (
        <>
          <div className="h-px bg-hairline-soft my-1" />
          <button 
            className="w-full flex items-center gap-2 px-3 py-2 text-[var(--tracker-danger)] hover:bg-[var(--tracker-danger-light)] transition-colors text-left"
            onClick={() => { onDelete(task); onClose(); }}
          >
            <Trash2 size={14} />
            <span>Delete Task</span>
          </button>
        </>
      )}
    </div>
  );
}
