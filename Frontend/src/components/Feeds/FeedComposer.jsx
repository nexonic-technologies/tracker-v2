import React, { useMemo, useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { FiPaperclip, FiLoader, FiSend, FiHash, FiChevronDown, FiSearch } from 'react-icons/fi';
import { MdOutlineCampaign } from 'react-icons/md';
import ProfileImage from '../Common/ProfileImage';

const ALL_POST_TYPES = [
  { id: 'Update', label: 'Post' },
  { id: 'Announcement', label: 'Announcement' },
  { id: 'Question', label: 'Question' },
  { id: 'Poll', label: 'Poll' }
];

const TARGET_DOT_COLORS = [
  'bg-orange-400',
  'bg-sky-500',
  'bg-slate-400',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-rose-400',
];

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block', 'link'],
    ['clean'],
  ],
};

function displayName(user) {
  const first = user?.basicInfo?.firstName || '';
  const last = user?.basicInfo?.lastName || '';
  const full = `${first} ${last}`.trim();
  return full || user?.name || 'User';
}

function dotColor(index) {
  return TARGET_DOT_COLORS[index % TARGET_DOT_COLORS.length];
}

function FeedTargetPicker({ items, value, onChange, placeholder, searchPlaceholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selected = items.find((item) => item._id === value);
  const selectedIndex = items.findIndex((item) => item._id === value);

  const filtered = items.filter((item) =>
    (item.name || '').toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={ref} className="lmx-feed-composer__picker relative min-w-[160px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="lmx-feed-composer__picker-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {selected ? (
          <span className="inline-flex items-center gap-2 min-w-0">
            <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor(selectedIndex)}`} />
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="text-ink-subtle">{placeholder}</span>
        )}
        <FiChevronDown className={`h-4 w-4 shrink-0 text-ink-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="lmx-feed-composer__picker-menu" role="listbox">
          <div className="p-2 border-b border-hairline-soft">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-subtle pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="lmx-input pl-9 py-2 text-sm"
              />
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-ink-subtle text-center">No results</li>
            ) : (
              filtered.map((item) => {
                const index = items.findIndex((i) => i._id === item._id);
                const isActive = item._id === value;
                return (
                  <li key={item._id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelect(item._id)}
                      className={`lmx-feed-composer__picker-option ${isActive ? 'lmx-feed-composer__picker-option--active' : ''}`}
                    >
                      <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor(index)}`} />
                      <span className="truncate">{item.name}</span>
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
}

export default function FeedComposer({
  user,
  expanded,
  onExpand,
  onCollapse,
  postType,
  setPostType,
  postSubject,
  setPostSubject,
  postContent,
  onContentChange,
  targetType,
  setTargetType,
  targetId,
  setTargetId,
  groups = [],
  channels = [],
  expiryDays,
  setExpiryDays,
  onSubmit,
  onSaveDraft,
  loading,
  showMentions,
  mentionList = [],
  onSelectMention,
  pollOptions = [],
  setPollOptions,
}) {
  const isEmpty = !postContent.trim() || postContent === '<p><br></p>';
  const isChannelMode = targetType === 'Channel';
  const targetList = isChannelMode ? channels : groups;
  const targetPlaceholder = isChannelMode ? 'Select channel…' : 'Select group…';
  const targetSearchPlaceholder = isChannelMode ? 'Search channel…' : 'Search group…';

  const selectedChannel = channels.find((c) => c._id === targetId);
  const isExternalChannel = selectedChannel?.isExternal === true;

  const allowedPostTypes = isExternalChannel
    ? ALL_POST_TYPES.filter(t => ['Update', 'Announcement'].includes(t.id))
    : ALL_POST_TYPES;

  useEffect(() => {
    if (isExternalChannel && ['Question', 'Poll'].includes(postType)) {
      setPostType('Update');
    }
  }, [isExternalChannel, postType, setPostType]);

  const postLabel = useMemo(
    () => ALL_POST_TYPES.find((t) => t.id === postType)?.label || 'Post',
    [postType]
  );

  const setDestination = (mode) => {
    setTargetType(mode);
    setTargetId('');
  };

  if (!expanded) {
    return (
      <div className="bg-surface rounded-2xl border border-hairline shadow-xs p-4 sm:p-5 space-y-3.5 transition-all">
        <div className="flex items-center gap-3">
          <ProfileImage
            profileImage={user?.basicInfo?.profileImage}
            firstName={user?.basicInfo?.firstName}
            lastName={user?.basicInfo?.lastName}
            size="sm"
            className="!w-10 !h-10 rounded-full border border-hairline-soft shrink-0"
          />
          <button
            type="button"
            onClick={onExpand}
            className="flex-1 text-left px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 hover:bg-surface-1 border border-hairline-soft text-ink-subtle text-xs sm:text-sm font-medium transition-colors shadow-xs"
          >
            What's on your mind, {displayName(user).split(' ')[0]}?
          </button>
        </div>

        <div className="flex items-center justify-start pt-2.5 border-t border-hairline-soft flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => { setPostType('Update'); onExpand(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-ink-muted hover:text-brand hover:bg-brand/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Post Update</span>
            </button>

            <button
              type="button"
              onClick={() => { setPostType('Announcement'); onExpand(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <MdOutlineCampaign className="text-amber-500" size={16} />
              <span>Announcement</span>
            </button>

            <button
              type="button"
              onClick={() => { setPostType('Question'); onExpand(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span>Ask Question</span>
            </button>

            <button
              type="button"
              onClick={() => { setPostType('Poll'); onExpand(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Create Poll</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="lmx-feed-composer tracker-card-plain animate-fade-in">
      {/* Post to — destination pills */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-3 border-b border-hairline-soft">
        <span className="text-sm font-medium text-ink-muted shrink-0">Post to:</span>
        <button
          type="button"
          onClick={() => setDestination('Channel')}
          className={`lmx-feed-composer__dest-pill ${isChannelMode ? 'lmx-feed-composer__dest-pill--active' : ''}`}
        >
          <FiHash className="h-3.5 w-3.5 shrink-0" />
          Single Channel
        </button>
        <button
          type="button"
          onClick={() => setDestination('Group')}
          className={`lmx-feed-composer__dest-pill ${!isChannelMode ? 'lmx-feed-composer__dest-pill--active' : ''}`}
        >
          <MdOutlineCampaign className="h-3.5 w-3.5 shrink-0" />
          Broadcast to Group
        </button>
      </div>

      {/* User row + post type tabs */}
      <div className="relative z-20 flex flex-col gap-3 px-4 py-3 border-b border-hairline-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <ProfileImage
            profileImage={user?.basicInfo?.profileImage}
            firstName={user?.basicInfo?.firstName}
            lastName={user?.basicInfo?.lastName}
            size="sm"
            className="!w-8 !h-8 shrink-0"
          />
          <span className="text-sm font-semibold text-ink whitespace-nowrap">{displayName(user)}</span>
          <span className="text-sm text-ink-subtle">in</span>
          <FeedTargetPicker
            items={targetList}
            value={targetId}
            onChange={setTargetId}
            placeholder={targetPlaceholder}
            searchPlaceholder={targetSearchPlaceholder}
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-surface-1 rounded-xl border border-hairline-soft shrink-0" role="tablist">
          {allowedPostTypes.map(({ id, label }) => {
            const isSelected = postType === id;
            let activeColorClass = 'bg-brand text-white shadow-xs font-extrabold';
            let icon = <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />;

            if (id === 'Announcement') {
              icon = <MdOutlineCampaign size={14} className={isSelected ? 'text-white' : 'text-amber-500'} />;
              if (isSelected) activeColorClass = 'bg-amber-500 text-white shadow-xs font-extrabold';
            } else if (id === 'Question') {
              icon = <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />;
              if (isSelected) activeColorClass = 'bg-indigo-600 text-white shadow-xs font-extrabold';
            } else if (id === 'Poll') {
              icon = <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-500'}`} />;
              if (isSelected) activeColorClass = 'bg-purple-600 text-white shadow-xs font-extrabold';
            }

            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setPostType(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? activeColorClass
                    : 'text-ink-muted hover:text-ink hover:bg-surface'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Announcement expiry — only when Announcement selected */}
      {postType === 'Announcement' && (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-tracker-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
          <MdOutlineCampaign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Expires in</span>
          <input
            type="number"
            min="1"
            max="365"
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            className="lmx-input w-16 py-1 text-xs text-center font-semibold"
          />
          <span className="text-xs text-amber-700 dark:text-amber-400">days</span>
        </div>
      )}

      {/* Poll Options — only when Poll selected */}
      {postType === 'Poll' && (
        <div className="mx-4 mt-3 space-y-2 border border-hairline-soft p-3 rounded-tracker-md bg-surface-1/40 animate-fade-in">
          <span className="text-xs font-semibold text-ink-muted block">Poll Options</span>
          {pollOptions.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const newOpts = [...pollOptions];
                  newOpts[idx] = e.target.value;
                  setPollOptions(newOpts);
                }}
                placeholder={`Option ${idx + 1}`}
                className="lmx-input flex-1 py-1 px-3 text-xs"
              />
              {pollOptions.length > 2 && (
                <button
                  type="button"
                  onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                  className="p-1 text-ink-subtle hover:text-red-500 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 10 && (
            <button
              type="button"
              onClick={() => setPollOptions([...pollOptions, ''])}
              className="text-xs text-[var(--module-accent)] font-semibold hover:underline"
            >
              + Add Option
            </button>
          )}
        </div>
      )}

      {/* Subject — underline style (red when empty, accent when filled) */}
      <div className="px-4 pt-4">
        <input
          id="feed-post-subject"
          type="text"
          value={postSubject}
          onChange={(e) => setPostSubject(e.target.value)}
          placeholder="Subject *"
          className={`lmx-feed-composer__subject ${postSubject.trim() ? 'lmx-feed-composer__subject--filled' : ''}`}
        />
      </div>

      {/* Rich text — toolbar at bottom */}
      <div className="px-4 py-3">
        <div className="lmx-feed-composer__editor relative">
          <ReactQuill
            theme="snow"
            value={postContent}
            onChange={onContentChange}
            modules={quillModules}
            placeholder="Write a description…"
          />
          {showMentions && mentionList.length > 0 && (
            <div className="absolute z-50 tracker-card-plain !border-l-0 max-h-56 overflow-y-auto w-72 bottom-12 left-0 shadow-lg">
              {mentionList.map((emp) => (
                <button
                  key={emp._id}
                  type="button"
                  onClick={() => onSelectMention(emp)}
                  className="flex items-center gap-3 w-full p-3 hover:bg-surface-1 transition-colors border-b border-hairline-soft last:border-0 text-left"
                >
                  <ProfileImage
                    profileImage={emp.basicInfo?.profileImage}
                    firstName={emp.basicInfo?.firstName}
                    lastName={emp.basicInfo?.lastName}
                    size="sm"
                    className="!w-8 !h-8"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">
                      {emp.basicInfo?.firstName} {emp.basicInfo?.lastName}
                    </p>
                    <p className="text-[11px] text-ink-subtle truncate">
                      {emp.professionalInfo?.designation?.title || emp.professionalInfo?.designation?.name || (typeof emp.professionalInfo?.designation === 'string' ? emp.professionalInfo?.designation : '') || 'Member'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-hairline-soft">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
        >
          <FiPaperclip className="h-4 w-4" />
          Attach
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <button type="button" onClick={onCollapse} className="lmx-feed-composer__footer-link">
            Cancel
          </button>
          {onSaveDraft && (
            <button type="button" onClick={onSaveDraft} className="lmx-feed-composer__draft-btn">
              Save draft
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || isEmpty}
            className="lmx-feed-composer__post-btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiSend className="h-4 w-4" />}
            {postLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
