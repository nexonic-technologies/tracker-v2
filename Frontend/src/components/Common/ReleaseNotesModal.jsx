import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  X,
  Search,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Bug,
  Rocket,
  Calendar,
  Layers,
  ExternalLink,
  History,
} from 'lucide-react';
import { useAuth } from '../../context/authProvider';
import {
  fetchReleaseNotes,
  hasUserSeenRelease,
  markReleaseAsSeen,
} from '../../services/releaseNotesService';

export default function ReleaseNotesModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [releases, setReleases] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const userId = user?._id || user?.id || 'guest';

  // Load release notes and trigger one-time auto-popup if user hasn't seen the latest release
  useEffect(() => {
    let mounted = true;

    async function initReleases() {
      setLoading(true);
      const data = await fetchReleaseNotes();
      if (!mounted) return;

      setReleases(data);
      if (data.length > 0) {
        const latest = data[0];
        setSelectedVersion(latest.version);

        // Check if user has already seen this latest release version
        const alreadySeen = hasUserSeenRelease(userId, latest.version);
        if (!alreadySeen) {
          // Subtle initial delay for smooth page entrance
          const timer = setTimeout(() => {
            if (mounted) setIsOpen(true);
          }, 800);
          return () => clearTimeout(timer);
        }
      }
      setLoading(false);
    }

    initReleases();

    // Event listener for manual on-demand opening (e.g. from Sidebar or Profile menu)
    const handleOpenEvent = async (e) => {
      const targetVer = e.detail?.version;
      setIsOpen(true);
      if (releases.length === 0) {
        setLoading(true);
        const data = await fetchReleaseNotes();
        if (mounted && Array.isArray(data)) {
          setReleases(data);
          if (data.length > 0) {
            setSelectedVersion(targetVer || data[0].version);
          }
        }
        setLoading(false);
      } else if (targetVer) {
        setSelectedVersion(targetVer);
      }
    };

    window.addEventListener('tracker:open-release-notes', handleOpenEvent);
    return () => {
      mounted = false;
      window.removeEventListener('tracker:open-release-notes', handleOpenEvent);
    };
  }, [userId]);

  const activeRelease = useMemo(() => {
    if (!releases.length) return null;
    return releases.find((r) => r.version === selectedVersion) || releases[0];
  }, [releases, selectedVersion]);

  // Handle closing and marking release as seen
  const handleClose = useCallback(() => {
    if (activeRelease) {
      markReleaseAsSeen(userId, activeRelease.version, activeRelease._id);
    }
    setIsOpen(false);
  }, [activeRelease, userId]);

  // Handle keyboard Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Filter items within the active release by query and category
  const filteredCategories = useMemo(() => {
    if (!activeRelease?.categories) return { features: [], improvements: [], security: [], fixes: [] };

    const q = searchQuery.toLowerCase().trim();
    const filterList = (items) => {
      if (!Array.isArray(items)) return [];
      if (!q) return items;
      return items.filter((item) => item.toLowerCase().includes(q));
    };

    return {
      features: activeCategoryFilter === 'all' || activeCategoryFilter === 'features'
        ? filterList(activeRelease.categories.features)
        : [],
      improvements: activeCategoryFilter === 'all' || activeCategoryFilter === 'improvements'
        ? filterList(activeRelease.categories.improvements)
        : [],
      security: activeCategoryFilter === 'all' || activeCategoryFilter === 'security'
        ? filterList(activeRelease.categories.security)
        : [],
      fixes: activeCategoryFilter === 'all' || activeCategoryFilter === 'fixes'
        ? filterList(activeRelease.categories.fixes)
        : [],
    };
  }, [activeRelease, searchQuery, activeCategoryFilter]);

  const totalFilteredCount =
    filteredCategories.features.length +
    filteredCategories.improvements.length +
    filteredCategories.security.length +
    filteredCategories.fixes.length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="release-notes-title"
    >
      {/* 2026-Grade Layered Glass Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={handleClose}
      />

      {/* Main Surface Card */}
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-2xl shadow-2xl overflow-hidden z-10 animate-fade-in-up"
        style={{
          boxShadow: '0 25px 50px -12px rgba(108, 61, 232, 0.18), 0 0 0 1px var(--tracker-border)',
        }}
      >
        {/* Header Ribbon */}
        <div className="relative px-5 py-4 border-b border-[var(--tracker-border)] bg-gradient-to-r from-[var(--tracker-surface-1)] via-[var(--tracker-surface)] to-[var(--tracker-surface-1)] flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20 flex-shrink-0">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id="release-notes-title"
                    className="text-base sm:text-lg font-bold text-[var(--tracker-ink)] tracking-tight leading-tight truncate"
                  >
                    What&apos;s New in Workhub
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    v{activeRelease?.version || '3.1.4'}
                  </span>
                </div>
                <p className="text-xs text-[var(--tracker-ink-subtle)] truncate mt-0.5">
                  {activeRelease?.tagline || 'Explore the latest enhancements, features, and platform updates.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-2)] transition-colors cursor-pointer flex-shrink-0"
              aria-label="Close release notes"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Sub-bar: Version History Tabs & Search Bar */}
          <div className="mt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-[var(--tracker-border-soft)]">
            {/* Version Selector Carousel / Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
              <span className="text-[11px] font-medium text-[var(--tracker-ink-subtle)] flex items-center gap-1 mr-1">
                <History className="h-3 w-3" /> Releases:
              </span>
              {releases.map((rel) => {
                const isSelected = rel.version === activeRelease?.version;
                return (
                  <button
                    key={rel.version}
                    type="button"
                    onClick={() => setSelectedVersion(rel.version)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--brand-solid)] text-white shadow-sm shadow-purple-500/25'
                        : 'bg-[var(--tracker-surface-2)] text-[var(--tracker-ink-muted)] hover:bg-[var(--tracker-surface-chip)] hover:text-[var(--tracker-ink)]'
                    }`}
                  >
                    v{rel.version}
                    {rel.isLatest && <span className="ml-1 text-[9px] opacity-80">(Latest)</span>}
                  </button>
                );
              })}
            </div>

            {/* Command-Grade Search Input */}
            <div className="relative flex-shrink-0 w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--tracker-ink-subtle)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search updates..."
                className="w-full pl-8 pr-3 py-1 bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] rounded-lg text-xs text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-solid)] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Body: Categorized Updates List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 max-h-[58vh]">
          {/* Release Meta Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-cyan-500/5 border border-purple-500/10 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[var(--brand-solid)]/10 text-[var(--brand-solid)]">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--tracker-ink)]">{activeRelease?.title}</h3>
                <p className="text-[11px] text-[var(--tracker-ink-muted)] flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3 w-3" /> Released on {activeRelease?.releaseDate || 'Recent'}
                  <span className="opacity-40">·</span>
                  <span className="text-[var(--brand-solid)] font-medium">{activeRelease?.type}</span>
                </p>
              </div>
            </div>

            {/* Quick Category Filter Pills */}
            <div className="flex items-center gap-1">
              {['all', 'features', 'improvements', 'fixes'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize transition-colors cursor-pointer ${
                    activeCategoryFilter === cat
                      ? 'bg-[var(--tracker-ink)] text-[var(--tracker-surface)]'
                      : 'text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-2)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Features */}
          {filteredCategories.features.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Rocket className="h-3.5 w-3.5" />
                <span>New Features & Capabilities</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/10 rounded-full font-mono">
                  {filteredCategories.features.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {filteredCategories.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[var(--tracker-surface-1)] border border-[var(--tracker-border-soft)] hover:border-emerald-500/30 transition-all flex items-start gap-2.5 group"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[var(--tracker-ink)] leading-relaxed">{feat}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Improvements */}
          {filteredCategories.improvements.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400">
                <Zap className="h-3.5 w-3.5" />
                <span>Improvements & Speed</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-cyan-500/10 rounded-full font-mono">
                  {filteredCategories.improvements.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {filteredCategories.improvements.map((imp, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[var(--tracker-surface-1)] border border-[var(--tracker-border-soft)] hover:border-cyan-500/30 transition-all flex items-start gap-2.5 group"
                  >
                    <ChevronRight className="h-4 w-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[var(--tracker-ink)] leading-relaxed">{imp}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Security & Platform */}
          {filteredCategories.security.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Security & Platform Governance</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/10 rounded-full font-mono">
                  {filteredCategories.security.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {filteredCategories.security.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[var(--tracker-surface-1)] border border-[var(--tracker-border-soft)] hover:border-indigo-500/30 transition-all flex items-start gap-2.5 group"
                  >
                    <ShieldCheck className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[var(--tracker-ink)] leading-relaxed">{sec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Fixes */}
          {filteredCategories.fixes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                <Bug className="h-3.5 w-3.5" />
                <span>Bug Fixes & Hardening</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/10 rounded-full font-mono">
                  {filteredCategories.fixes.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {filteredCategories.fixes.map((fix, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[var(--tracker-surface-1)] border border-[var(--tracker-border-soft)] hover:border-rose-500/30 transition-all flex items-start gap-2.5 group"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-[var(--tracker-ink)] leading-relaxed">{fix}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty search state */}
          {totalFilteredCount === 0 && (
            <div className="text-center py-8">
              <Search className="h-8 w-8 text-[var(--tracker-ink-subtle)] mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-[var(--tracker-ink)]">No matching updates found</p>
              <p className="text-[11px] text-[var(--tracker-ink-subtle)] mt-0.5">
                Try searching for another keyword or switch category filters.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-[11px] text-[var(--tracker-ink-subtle)] hidden sm:block">
            Captured for your session · Reopen anytime via the sidebar version tag.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Got it, Explore Workhub</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
