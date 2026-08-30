import { useState, useEffect, useRef } from 'react';
import { Bookmark, Plus, X, Check, Trash2, Sparkles } from 'lucide-react';
import { useAuth } from '@providers/AuthProvider';

/**
 * FilterPresetBar
 * Reusable filter preset manager with per-user persistent storage.
 *
 * Props:
 *   storageKey       — unique identifier for module/screen (e.g. 'tickets', 'tasks')
 *   currentFilters   — active filter state object { status, priority, assignee, createdBy, ... }
 *   onApplyPreset    — (filters: Object) => void
 *   onResetFilters   — () => void
 *   accentColor      — CSS var string for active accents e.g. "var(--module-ticket)"
 */
export default function FilterPresetBar({
  storageKey = 'global',
  currentFilters = {},
  onApplyPreset,
  onResetFilters,
  accentColor = 'var(--brand-solid)',
}) {
  const { user } = useAuth();
  const userId = user?._id || user?.id || 'guest';
  const storageId = `tracker_presets_${userId}_${storageKey}`;

  const [presets, setPresets] = useState([]);
  const [activePresetId, setActivePresetId] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const inputRef = useRef(null);

  // Load presets from localStorage on mount or storageKey change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageId);
      if (saved) {
        setPresets(JSON.parse(saved));
      } else {
        setPresets([]);
      }
    } catch (e) {
      console.warn('Failed to load filter presets:', e);
      setPresets([]);
    }
    setActivePresetId(null);
  }, [storageId]);

  // Persist presets to localStorage
  const savePresetsToStorage = (updated) => {
    setPresets(updated);
    try {
      localStorage.setItem(storageId, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save filter presets:', e);
    }
  };

  // Focus input when save modal opens
  useEffect(() => {
    if (showSaveModal) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showSaveModal]);

  // Check if any non-empty filter is active
  const hasActiveFilters = Object.values(currentFilters).some(
    (v) => v !== null && v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
  );

  const handleSavePreset = (e) => {
    e?.preventDefault();
    const name = newPresetName.trim();
    if (!name) return;

    const newPreset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name,
      filters: { ...currentFilters },
      createdAt: new Date().toISOString(),
    };

    const updated = [...presets, newPreset];
    savePresetsToStorage(updated);
    setActivePresetId(newPreset.id);
    setNewPresetName('');
    setShowSaveModal(false);
  };

  const handleDeletePreset = (id, e) => {
    e?.stopPropagation();
    const updated = presets.filter((p) => p.id !== id);
    savePresetsToStorage(updated);
    if (activePresetId === id) {
      setActivePresetId(null);
    }
  };

  const handleSelectPreset = (preset) => {
    if (activePresetId === preset.id) {
      // Toggle off
      setActivePresetId(null);
      if (onResetFilters) onResetFilters();
    } else {
      setActivePresetId(preset.id);
      if (onApplyPreset) onApplyPreset(preset.filters);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Presets Label / Icon */}
      <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--tracker-ink-subtle)] shrink-0 mr-1 select-none">
        <Bookmark className="h-3.5 w-3.5" style={{ color: accentColor }} />
        <span>Presets:</span>
      </div>

      {/* Preset Pill Tags */}
      {presets.map((preset) => {
        const isActive = activePresetId === preset.id;
        return (
          <div
            key={preset.id}
            onClick={() => handleSelectPreset(preset)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-tracker-md text-[11px] font-semibold transition-all cursor-pointer border select-none ${
              isActive
                ? 'bg-surface text-ink border-current shadow-xs'
                : 'bg-surface-1 hover:bg-surface-2 text-ink-muted hover:text-ink border-hairline-soft'
            }`}
            style={{
              borderColor: isActive ? accentColor : undefined,
              color: isActive ? accentColor : undefined,
            }}
            title={`Apply preset: ${preset.name}`}
          >
            {isActive && <Check className="h-3 w-3" />}
            <span className="truncate max-w-[120px]">{preset.name}</span>
            <button
              type="button"
              onClick={(e) => handleDeletePreset(preset.id, e)}
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-ink-subtle hover:text-rose-500 transition-colors ml-0.5"
              title="Delete preset"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        );
      })}

      {/* Save Current Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => setShowSaveModal(true)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-tracker-md text-[11px] font-semibold bg-surface-1 hover:bg-surface-2 text-ink-muted hover:text-ink border border-dashed border-hairline transition-all cursor-pointer"
          title="Save current filters as a new preset"
        >
          <Plus className="h-3 w-3" />
          <span>Save Preset</span>
        </button>
      )}

      {/* Save Preset Dialog Popover */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowSaveModal(false)}
        >
          <div
            className="w-full max-w-sm bg-surface border border-hairline rounded-2xl shadow-2xl p-4 space-y-3 z-10 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-hairline-soft pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-surface-1" style={{ color: accentColor }}>
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-ink">Save Filter Preset</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="p-1 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePreset} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-ink-muted block mb-1">
                  Preset Name
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="e.g. Critical In Progress, My Team Tasks"
                  className="w-full px-3 py-1.5 bg-surface-1 border border-hairline rounded-tracker-md text-xs text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent"
                  maxLength={40}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-3 py-1.5 rounded-tracker-md text-xs font-semibold text-ink-muted hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPresetName.trim()}
                  className="px-3.5 py-1.5 rounded-tracker-md text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: accentColor }}
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
