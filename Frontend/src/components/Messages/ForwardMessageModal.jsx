import { useState, useMemo } from "react";
import { X, Search, Check, Send, User } from "lucide-react";
import ProfileImage from "../Common/ProfileImage";

export default function ForwardMessageModal({ message, employees = [], onlineUserIds = new Set(), currentUserId, onForward, onClose }) {
  const [search, setSearch] = useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState(new Set());
  const [forwarding, setForwarding] = useState(false);

  const availableEmployees = useMemo(() => {
    return employees.filter(e => e._id !== currentUserId);
  }, [employees, currentUserId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return availableEmployees;
    const q = search.toLowerCase();
    return availableEmployees.filter(e => {
      const name = `${e.basicInfo?.firstName || ''} ${e.basicInfo?.lastName || ''}`.toLowerCase();
      const dept = (e.professionalInfo?.department?.name || '').toLowerCase();
      return name.includes(q) || dept.includes(q);
    });
  }, [availableEmployees, search]);

  const toggleSelect = (id) => {
    setSelectedRecipientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendForward = async () => {
    if (selectedRecipientIds.size === 0) return;
    setForwarding(true);
    try {
      await onForward(Array.from(selectedRecipientIds), message);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setForwarding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-surface border border-hairline rounded-tracker-card w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-hairline flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink">Forward Message</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface-1 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message Snippet Preview */}
        <div className="p-3 bg-surface-1 border-b border-hairline text-xs text-ink-muted">
          <span className="font-semibold text-ink uppercase text-[10px] block mb-1">Message Preview</span>
          <p className="line-clamp-2 italic text-ink">{message?.text || message?.message || '[Attachment]'}</p>
          {message?.attachments && message.attachments.length > 0 && (
            <span className="text-[10px] text-indigo-500 font-semibold mt-1 block">
              📎 {message.attachments.length} attachment(s) included
            </span>
          )}
        </div>

        {/* Search Filter */}
        <div className="p-3 border-b border-hairline">
          <div className="flex items-center gap-2 bg-surface-1 border border-hairline rounded-tracker-md px-3 py-1.5">
            <Search size={14} className="text-ink-subtle flex-shrink-0" />
            <input
              type="text"
              placeholder="Search colleagues to forward to..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-subtle"
            />
          </div>
        </div>

        {/* List of Employees */}
        <div className="flex-1 overflow-y-auto divide-y divide-hairline-soft p-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-subtle">
              No colleagues found.
            </div>
          ) : (
            filtered.map(emp => {
              const isChecked = selectedRecipientIds.has(emp._id);
              const isOnline = onlineUserIds.has(emp._id.toString());
              const name = `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim() || 'Team Member';
              const title = emp.professionalInfo?.designation?.title || emp.professionalInfo?.department?.name || 'Staff';

              return (
                <div
                  key={emp._id}
                  onClick={() => toggleSelect(emp._id)}
                  className={`flex items-center justify-between p-2.5 px-3 rounded-tracker-md cursor-pointer transition-colors ${
                    isChecked ? "bg-indigo-50/70 dark:bg-indigo-950/30" : "hover:bg-surface-1"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex-shrink-0">
                      <ProfileImage
                        profileImage={emp.basicInfo?.profileImage}
                        firstName={emp.basicInfo?.firstName}
                        lastName={emp.basicInfo?.lastName}
                        size="xs"
                      />
                      <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-surface ${
                        isOnline ? "bg-emerald-500" : "bg-slate-400"
                      }`} />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-ink truncate">{name}</p>
                      <p className="text-[10px] text-ink-subtle truncate">{title}</p>
                    </div>
                  </div>

                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 ${
                    isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-hairline bg-surface"
                  }`}>
                    {isChecked && <Check size={12} className="stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-hairline flex items-center justify-between bg-surface">
          <span className="text-xs text-ink-muted">
            {selectedRecipientIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface-1 rounded-tracker-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSendForward}
              disabled={selectedRecipientIds.size === 0 || forwarding}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-tracker-md transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={12} />
              <span>{forwarding ? "Forwarding..." : `Forward (${selectedRecipientIds.size})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
