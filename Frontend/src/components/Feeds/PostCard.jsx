import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { FiMoreHorizontal, FiMessageSquare, FiEye, FiPaperclip, FiThumbsUp, FiEdit2, FiTrash2, FiBookmark, FiShare2, FiFlag, FiCopy } from 'react-icons/fi';
import { BiPin } from 'react-icons/bi';
import ProfileImage from '../Common/ProfileImage';
import { useAuth } from '../../context/authProvider';
import useGenericAPI from '../useGenericAPI';
import toast from 'react-hot-toast';

dayjs.extend(relativeTime);

export default function PostCard({ post, onRefresh, onEditDraft }) {
  const { user } = useAuth();
  const { update, create, readPaginated, remove } = useGenericAPI();
  const [localPost, setLocalPost] = useState(post);
  const [showComments, setShowComments] = useState(false);
  const [showViews, setShowViews] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionList, setMentionList] = useState([]);
  const [selectedMentions, setSelectedMentions] = useState([]);
  const checkIncludesUser = (arr) => arr?.some(id => id === user?.id || id?._id === user?.id);
  const [isBookmarked, setIsBookmarked] = useState(checkIncludesUser(post.bookmarkedBy));
  const [isPinned, setIsPinned] = useState(checkIncludesUser(post.pinnedBy));
  const [isFollowing, setIsFollowing] = useState(checkIncludesUser(post.followers));
  const pickerTimeoutRef = useRef(null);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleMouseEnterPicker = () => {
    if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current);
    setShowPicker(true);
  };

  const handleMouseLeavePicker = () => {
    pickerTimeoutRef.current = setTimeout(() => {
      setShowPicker(false);
    }, 400);
  };

  // 1. Mark as viewed
  useEffect(() => {
    const hasViewed = localPost.viewedBy?.some(v => v.employee?._id === user?.id || v.employee === user?.id || v === user?.id);
    if (user?.id && localPost && !hasViewed) {
      const markViewed = async () => {
        try {
          const newViewRecord = { employee: user.id, viewedAt: new Date().toISOString() };
          const updatedViewedBy = [...(localPost.viewedBy || []), newViewRecord];
          const updatedViewsCount = (localPost.viewsCount || 0) + 1;
          setLocalPost(prev => ({ ...prev, viewedBy: updatedViewedBy, viewsCount: updatedViewsCount }));
          await update('feed_posts', localPost._id, {
            viewedBy: updatedViewedBy,
            viewsCount: updatedViewsCount
          });
        } catch (error) {
          console.error("Failed to mark post as viewed", error);
        }
      };
      markViewed();
    }
  }, [user?.id, localPost._id]);

  // 2. Reactions
  const handleReact = async (emoji = '👍') => {
    if (emoji?.nativeEvent) emoji = '👍';

    const existingReactionIndex = localPost.reactions?.findIndex(r => r.employee?._id === user.id || r.employee === user.id);
    let newReactions = [...(localPost.reactions || [])];

    if (existingReactionIndex >= 0) {
      if (newReactions[existingReactionIndex].reactionType === emoji) {
        newReactions.splice(existingReactionIndex, 1);
      } else {
        newReactions[existingReactionIndex].reactionType = emoji;
        newReactions[existingReactionIndex].createdAt = new Date().toISOString();
      }
    } else {
      newReactions.push({ employee: user.id, reactionType: emoji, createdAt: new Date().toISOString() });
    }

    setLocalPost(prev => ({ ...prev, reactions: newReactions }));
    setShowPicker(false);
    try {
      await update('feed_posts', localPost._id, { reactions: newReactions });
    } catch (err) {
      console.error("Failed to react", err);
    }
  };

  const handleVote = async (optionIndex) => {
    if (!user?.id) return;
    const updatedOptions = (localPost.pollOptions || []).map((opt, idx) => {
      let votes = [...(opt.votes || [])];
      votes = votes.filter(v => {
        const vId = v && typeof v === 'object' ? (v._id || v.toString()) : (v ? v.toString() : '');
        return vId !== user.id.toString();
      });
      if (idx === optionIndex) {
        votes.push(user.id);
      }
      return { ...opt, votes };
    });

    setLocalPost(prev => ({ ...prev, pollOptions: updatedOptions }));

    try {
      await update('feed_posts', localPost._id, {
        pollOptions: updatedOptions,
        voterModel: user.role === 'agent' ? 'agents' : 'employees'
      });
      toast.success("Vote registered!");
    } catch (err) {
      console.error("Failed to submit vote", err);
      toast.error("Failed to vote");
    }
  };

  const myReaction = localPost.reactions?.find(r => r.employee?._id === user?.id || r.employee === user?.id);
  const hasReacted = !!myReaction;

  // 3. Comments
  const fetchComments = async () => {
    try {
      const res = await readPaginated('feed_comments', 1, 50, {
        filter: JSON.stringify({ postId: localPost._id }),
        sort: 'createdAt',
        populateFields: 'author'
      });
      if (res?.data) setComments(res.data);
    } catch (err) {
      console.error("Failed to fetch comments", err);
    }
  };

  const toggleComments = () => {
    if (!showComments) fetchComments();
    setShowComments(!showComments);
    if (showViews) setShowViews(false);
  };

  const toggleViews = () => {
    setShowViews(!showViews);
    if (showComments) setShowComments(false);
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    try {
      const commentPayload = {
        postId: localPost._id,
        author: user.id,
        content: newComment,
        mentions: selectedMentions
      };
      await create('feed_comments', commentPayload);

      const newCount = (localPost.commentsCount || 0) + 1;
      setLocalPost(prev => ({ ...prev, commentsCount: newCount }));
      await update('feed_posts', localPost._id, { commentsCount: newCount });

      setNewComment('');
      setSelectedMentions([]);
      fetchComments();
    } catch (err) {
      console.error("Failed to post comment", err);
    }
  };

  const handleCommentChange = async (e) => {
    const val = e.target.value;
    setNewComment(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9]*)$/);

    if (match) {
      const search = match[1].toLowerCase();
      try {
        const res = await readPaginated('employees', 1, 100);
        if (res?.data) {
          const filtered = res.data.filter(emp => {
            const name = `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.toLowerCase();
            return name.includes(search);
          });
          setMentionList(filtered);
          setShowMentions(true);
        }
      } catch (err) {
        console.error("Failed to fetch users for mention", err);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleSelectMention = (employee) => {
    const inputEl = document.querySelector(`#comment-input-${localPost._id}`);
    const cursor = inputEl ? inputEl.selectionStart : newComment.length;

    const textBeforeCursor = newComment.slice(0, cursor);
    const textAfterCursor = newComment.slice(cursor);

    const newTextBefore = textBeforeCursor.replace(/@([a-zA-Z0-9]*)$/, `@${employee.basicInfo?.firstName} `);

    setNewComment(newTextBefore + textAfterCursor);
    setShowMentions(false);

    if (!selectedMentions.includes(employee._id)) {
      setSelectedMentions([...selectedMentions, employee._id]);
    }

    if (inputEl) {
      setTimeout(() => inputEl.focus(), 0);
    }
  };

  // 4. Menu Actions
  const handleDeletePost = async () => {
    setShowMenu(false);
    try {
      await update('feed_posts', localPost._id, { isDeleted: true });
      toast.success("Post deleted");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to delete post", err);
      toast.error("Failed to delete post");
    }
  };

  const handleFollow = async () => {
    const newVal = !isFollowing;
    setIsFollowing(newVal);
    setShowMenu(false);

    let newArr = [...(localPost.followers || [])];
    if (newVal) {
      if (!newArr.includes(user.id)) newArr.push(user.id);
    } else {
      newArr = newArr.filter(id => id !== user.id && id?._id !== user.id);
    }
    setLocalPost(prev => ({ ...prev, followers: newArr }));

    try {
      await update('feed_posts', localPost._id, { followers: newArr });
      toast.success(newVal ? "Following post" : "Unfollowed post");
    } catch (err) {
      console.error(err);
      setIsFollowing(!newVal);
      toast.error("Failed to update follow status");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/feed?post=${localPost._id}`);
    toast.success("Link copied!");
    setShowMenu(false);
  };

  const handleBookmark = async () => {
    const newVal = !isBookmarked;
    setIsBookmarked(newVal);
    setShowMenu(false);

    let newArr = [...(localPost.bookmarkedBy || [])];
    if (newVal) {
      if (!newArr.includes(user.id)) newArr.push(user.id);
    } else {
      newArr = newArr.filter(id => id !== user.id && id?._id !== user.id);
    }
    setLocalPost(prev => ({ ...prev, bookmarkedBy: newArr }));

    try {
      await update('feed_posts', localPost._id, { bookmarkedBy: newArr });
      toast.success(newVal ? "Bookmarked!" : "Removed from bookmarks");
    } catch (err) {
      console.error(err);
      setIsBookmarked(!newVal);
      toast.error("Failed to bookmark");
    }
  };

  const handlePin = async () => {
    const newVal = !isPinned;
    setIsPinned(newVal);
    setShowMenu(false);

    let newArr = [...(localPost.pinnedBy || [])];
    if (newVal) {
      if (!newArr.includes(user.id)) newArr.push(user.id);
    } else {
      newArr = newArr.filter(id => id !== user.id && id?._id !== user.id);
    }
    setLocalPost(prev => ({ ...prev, pinnedBy: newArr }));

    try {
      await update('feed_posts', localPost._id, { pinnedBy: newArr });
      toast.success(newVal ? "Pinned to top!" : "Unpinned");
    } catch (err) {
      console.error(err);
      setIsPinned(!newVal);
      toast.error("Failed to pin");
    }
  };

  const isAuthor = localPost.author?._id === user?.id || localPost.author === user?.id;
  const authorName = localPost.author?.basicInfo?.firstName || 'Unknown User';
  const authorLastName = localPost.author?.basicInfo?.lastName || '';
  const getLabel = (obj) => {
    if (!obj) return null;
    if (typeof obj === 'string') return obj;
    return obj.name || obj.title || obj._id || null;
  };
  const targetName = getLabel(localPost.group) || getLabel(localPost.channel) || 'All Members';

  // Post type badge
  const postTypeBadge = {
    Update: { bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20', icon: '📝' },
    Announcement: { bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', icon: '📢' },
    Question: { bg: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20', icon: '❓' },
    General: { bg: 'bg-surface-2 text-ink-muted border-hairline', icon: '💬' }
  };
  const badge = postTypeBadge[localPost.postType] || postTypeBadge.General;

  // Aggregated reaction emojis for display
  const reactionEmojis = [...new Set((localPost.reactions || []).map(r => r.reactionType))];

  return (
    <div className={`tracker-card-plain overflow-hidden hover:border-[var(--module-accent)] transition-all duration-200 ${isPinned ? 'ring-2 ring-amber-400/50' : ''}`}>
      {isPinned && (
        <div className="bg-amber-500/10 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5 border-b border-amber-500/20">
          <BiPin className="text-amber-500" /> Pinned post
        </div>
      )}

      <div className="p-3">
        {/* POST HEADER */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <ProfileImage
              profileImage={localPost.author?.basicInfo?.profileImage}
              firstName={localPost.author?.basicInfo?.firstName}
              lastName={authorLastName}
              size="xs"
              className="!w-8 !h-8 text-xs shrink-0 ring-2 ring-hairline-soft"
            />
            <div className="min-w-0">
              <div className="text-xs flex items-center gap-1 flex-wrap">
                <span className="font-bold text-ink">{authorName} {authorLastName}</span>
                <span className="text-ink-subtle">in</span>
                <span className="font-semibold text-[var(--module-accent)] hover:underline cursor-pointer">{targetName}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-ink-subtle">{dayjs(localPost.createdAt).fromNow()}</span>
                {localPost.isEdited && <span className="text-[10px] text-ink-subtle italic">(edited)</span>}
                {localPost.postType && localPost.postType !== 'General' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badge.bg}`}>
                    {badge.icon} {localPost.postType}
                  </span>
                )}
                {localPost.postType === 'Announcement' && localPost.expiryDate && (
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Expires in {dayjs(localPost.expiryDate).diff(dayjs(), 'day')} days
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3-Dot Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="tracker-btn-ghost !p-1.5"
            >
              <FiMoreHorizontal />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 tracker-card-plain z-30 py-1.5 overflow-hidden !border-l-0">
                <button onClick={handleBookmark} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-ink hover:bg-surface-1 transition-colors">
                  <FiBookmark className={isBookmarked ? 'fill-current text-[var(--module-accent)]' : ''} />
                  {isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
                </button>
                <button onClick={handleFollow} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-ink hover:bg-surface-1 transition-colors">
                  <FiEye className={isFollowing ? 'text-[var(--module-accent)]' : ''} />
                  {isFollowing ? 'Unfollow Post' : 'Follow Post'}
                </button>
                <button onClick={handlePin} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-ink hover:bg-surface-1 transition-colors">
                  <BiPin className={isPinned ? 'text-amber-500' : ''} />
                  {isPinned ? 'Unpin' : 'Pin to top'}
                </button>
                <button onClick={handleCopyLink} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-ink hover:bg-surface-1 transition-colors">
                  <FiCopy /> Copy link
                </button>
                {isAuthor && (
                  <>
                    <div className="border-t my-1" />
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        if (onEditDraft) onEditDraft(localPost);
                      }}
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-ink hover:bg-surface-1 transition-colors"
                    >
                      <FiEdit2 /> Edit post
                    </button>
                    <button onClick={handleDeletePost} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <FiTrash2 /> Delete post
                    </button>
                  </>
                )}
                {!isAuthor && (
                  <>
                    <div className="border-t my-1" />
                    <button className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-ink hover:bg-surface-1 transition-colors">
                      <FiFlag /> Report
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SUBJECT */}
        {localPost.subject && (
          <h3 className="text-sm font-bold text-ink mb-1.5">{localPost.subject}</h3>
        )}

        {/* MENTIONS */}
        {localPost.mentions && localPost.mentions.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="text-xs text-ink-muted mr-1 mt-0.5">Mentioned:</span>
            {localPost.mentions.map((m, i) => (
              <span key={i} className="text-xs bg-[var(--module-accent-light)] text-[var(--module-accent)] px-2 py-0.5 rounded-full font-medium border border-hairline-soft">
                @{m.basicInfo?.firstName || 'User'}
              </span>
            ))}
          </div>
        )}

        {/* CONTENT */}
        <div
          className="text-ink text-xs mb-3 leading-normal ql-editor !p-0"
          dangerouslySetInnerHTML={{ __html: localPost.content }}
        />

        {/* POLL SECTION */}
        {localPost.postType === 'Poll' && localPost.pollOptions && localPost.pollOptions.length > 0 && (() => {
          const totalVotes = localPost.pollOptions.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0) || 0;
          return (
            <div className="mb-4 space-y-2 border border-hairline-soft p-3 rounded-tracker-lg bg-surface-1/30">
              {localPost.pollOptions.map((option, idx) => {
                const votesCount = option.votes?.length || 0;
                const pct = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                const isUserChoice = option.votes?.some(v => {
                  const vId = v && typeof v === 'object' ? (v._id || v.toString()) : (v ? v.toString() : '');
                  return vId === user?.id?.toString();
                });

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleVote(idx)}
                    className={`w-full text-left relative overflow-hidden p-2.5 rounded-tracker-md border transition-all flex items-center justify-between group ${isUserChoice
                      ? 'border-[var(--module-accent)] bg-[var(--module-accent-light)]/20'
                      : 'border-hairline hover:bg-surface-1 hover:border-ink-subtle'
                      }`}
                  >
                    {/* Progress Bar background */}
                    <div
                      className="absolute top-0 left-0 bottom-0 bg-[var(--module-accent)]/10 transition-all duration-300 pointer-events-none"
                      style={{ width: `${pct}%` }}
                    />

                    {/* Left content: check circle and text */}
                    <div className="relative z-10 flex items-center gap-2 min-w-0 pointer-events-none">
                      <span className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold ${isUserChoice
                        ? 'border-[var(--module-accent)] bg-[var(--module-accent)] text-white'
                        : 'border-ink-subtle bg-white text-transparent'
                        }`}>
                        {isUserChoice ? "✓" : ""}
                      </span>
                      <span className={`text-xs font-semibold truncate ${isUserChoice ? 'text-ink' : 'text-ink-muted group-hover:text-ink'
                        }`}>
                        {option.optionText}
                      </span>
                    </div>

                    {/* Right content: percentage and votes count */}
                    <div className="relative z-10 shrink-0 text-right pl-2 pointer-events-none">
                      <span className="text-xs font-bold text-ink">{pct}%</span>
                      <span className="text-[10px] text-ink-subtle block">{votesCount} vote{votesCount !== 1 ? 's' : ''}</span>
                    </div>
                  </button>
                );
              })}
              <p className="text-[10px] text-ink-tertiary text-right font-medium px-1">
                Total: {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
              </p>
            </div>
          );
        })()}

        {/* ATTACHMENTS */}
        {localPost.attachments && localPost.attachments.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Attachments</div>
            <div className="flex gap-2 flex-wrap">
              {localPost.attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 border border-gray-200 rounded p-1.5 hover:bg-gray-50 hover:border-indigo-200 cursor-pointer transition-all group">
                  <div className="w-7 h-7 bg-indigo-50 rounded flex items-center justify-center text-indigo-500 group-hover:bg-indigo-100 transition-colors">
                    <FiPaperclip className="text-[10px]" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-700 truncate max-w-[100px] font-medium">{att}</div>
                    <div className="text-[10px] text-gray-400">File</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REACTION SUMMARY BAR */}
        {!localPost.isDraft && localPost.reactions?.length > 0 && (
          <div
            className="flex items-center gap-2 mb-2 relative cursor-pointer w-fit"
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
          >
            <div className="flex -space-x-1">
              {reactionEmojis.slice(0, 4).map((e, idx) => (
                <span key={idx} className="text-base leading-none">{e}</span>
              ))}
            </div>
            <span className="text-xs font-medium text-ink-subtle hover:text-[var(--module-accent)] hover:underline">
              {localPost.reactions.length} {localPost.reactions.length === 1 ? 'reaction' : 'reactions'}
            </span>

            {/* Reaction Details Hover Tooltip */}
            {showReactions && (
              <div className="absolute bottom-full left-0 mb-2 w-52 bg-gray-900 text-white rounded-xl shadow-xl p-3 z-30 text-xs cursor-default">
                <div className="font-bold mb-2 border-b border-gray-700 pb-1.5 text-[11px] uppercase tracking-wider text-gray-400">Reactions</div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 scrollbar-hide">
                  {localPost.reactions.map((r, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <ProfileImage
                          profileImage={r.employee?.basicInfo?.profileImage}
                          firstName={r.employee?.basicInfo?.firstName}
                          lastName={r.employee?.basicInfo?.lastName}
                          size="xs"
                          className="!w-5 !h-5 text-[8px] shrink-0"
                        />
                        <span className="truncate text-[11px]">{r.employee?.basicInfo?.firstName || 'User'}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-sm">{r.reactionType}</span>
                        {r.createdAt && <span className="text-[9px] text-gray-500">{dayjs(r.createdAt).fromNow(true)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {localPost.isDraft ? (
          <div className="flex items-center justify-between border-t border-hairline-soft pt-3 text-sm mt-3">
            <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider">
              ⚠️ Draft
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onEditDraft && onEditDraft(localPost)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--module-accent)] hover:bg-[var(--module-accent)]/90 text-white font-semibold text-xs transition-all shadow-sm"
              >
                <FiEdit2 className="text-xs" /> Edit & Publish
              </button>
              <button
                onClick={handleDeletePost}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs transition-all"
              >
                <FiTrash2 className="text-xs" /> Delete
              </button>
            </div>
          </div>
        ) : (
          /* FOOTER ACTIONS */
          <div className="flex items-center justify-between border-t border-hairline-soft pt-3 text-sm text-ink-muted">
            <div className="flex items-center gap-1 md:gap-3">
              {/* Reaction Button */}
              <div className="flex items-center gap-1 relative">
                <div
                  className="relative"
                  onMouseEnter={handleMouseEnterPicker}
                  onMouseLeave={handleMouseLeavePicker}
                >
                  <div
                    className="absolute bottom-full left-0 mb-2 z-20 bg-white border border-gray-200 shadow-xl rounded-full px-2 md:px-3 py-2 flex gap-1.5 md:gap-3 transition-all duration-200"
                    style={{ opacity: showPicker ? 1 : 0, pointerEvents: showPicker ? 'auto' : 'none', transform: showPicker ? 'translateY(0)' : 'translateY(10px)' }}
                  >
                    {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReact(emoji)}
                        className="text-xl md:text-2xl hover:scale-125 transition-transform p-0.5 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleReact(myReaction ? myReaction.reactionType : '👍')}
                    className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg transition-all cursor-pointer ${hasReacted
                      ? 'text-[var(--module-accent)] font-semibold bg-[var(--module-accent-light)] hover:opacity-90'
                      : 'hover:bg-surface-1 hover:text-[var(--module-accent)]'
                      }`}
                  >
                    {myReaction ? <span className="text-base leading-none">{myReaction.reactionType}</span> : <FiThumbsUp className="text-base" />}
                    <span className="hidden sm:inline text-xs">{myReaction ? ({ '👍': 'Like', '❤️': 'Love', '😂': 'Haha', '😮': 'Wow', '😢': 'Sad', '😡': 'Angry' }[myReaction.reactionType] || 'Liked') : 'Like'}</span>
                  </button>
                </div>
              </div>

              {/* Comment Button */}
              <button
                onClick={toggleComments}
                className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg transition-all ${showComments
                  ? 'text-[var(--module-accent)] font-semibold bg-[var(--module-accent-light)]'
                  : 'hover:bg-surface-1 hover:text-[var(--module-accent)]'
                  }`}
              >
                <FiMessageSquare className="text-base" />
                <span className="text-xs">{localPost.commentsCount > 0 ? `${localPost.commentsCount}` : ''}</span>
                <span className="hidden sm:inline text-xs">{localPost.commentsCount > 0 ? 'Comments' : 'Comment'}</span>
              </button>
            </div>

            {/* Views */}
            <button
              onClick={toggleViews}
              className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg text-xs transition-all ${showViews
                ? 'text-indigo-600 font-semibold bg-indigo-50'
                : 'text-gray-400 hover:bg-gray-100 hover:text-indigo-600'
                }`}
            >
              <FiEye className="text-base" />
              <span>{localPost.viewsCount || 0}</span>
              <span className="hidden sm:inline">views</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEWS SECTION */}
      {!localPost.isDraft && showViews && (
        <div className="px-4 md:px-5 pb-4 pt-1 border-t border-gray-100">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 mt-3">Viewed By</div>
          {localPost.viewedBy?.length > 0 ? (
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {localPost.viewedBy.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-1 pr-3 py-1 hover:border-indigo-200 transition-colors">
                  <ProfileImage
                    profileImage={v.employee?.basicInfo?.profileImage}
                    firstName={v.employee?.basicInfo?.firstName}
                    lastName={v.employee?.basicInfo?.lastName}
                    size="xs"
                    className="!w-6 !h-6 text-[10px] shrink-0"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-gray-700">{v.employee?.basicInfo?.firstName || 'Unknown'}</span>
                    <span className="text-[10px] text-gray-400">{dayjs(v.viewedAt).fromNow()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400 py-2">No views yet</div>
          )}
        </div>
      )}

      {/* COMMENTS SECTION */}
      {!localPost.isDraft && showComments && (
        <div className="px-4 md:px-5 pb-4 pt-1 border-t border-gray-100">
          <div className="space-y-3 mt-3">
            {comments.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-3">No comments yet. Be the first!</div>
            )}
            {comments.map(c => (
              <div key={c._id} className="flex gap-2.5">
                <ProfileImage
                  profileImage={c.author?.basicInfo?.profileImage}
                  firstName={c.author?.basicInfo?.firstName}
                  lastName={c.author?.basicInfo?.lastName}
                  size="xs"
                  className="!w-7 !h-7 text-[10px] shrink-0 mt-0.5"
                />
                <div className="bg-gray-50 rounded-xl px-3 py-2 text-sm flex-1 border border-gray-100">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold text-gray-800 text-xs">{c.author?.basicInfo?.firstName || 'Unknown'} {c.author?.basicInfo?.lastName || ''}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{dayjs(c.createdAt).fromNow()}</span>
                  </div>
                  <div className="text-gray-700 mt-0.5 text-[13px] leading-relaxed">{c.content}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Comment Input */}
          <div className="flex gap-2.5 pt-3 mt-1">
            <ProfileImage
              profileImage={user?.basicInfo?.profileImage}
              firstName={user?.firstName}
              lastName={user?.lastName}
              size="xs"
              className="!w-7 !h-7 text-[10px] shrink-0 mt-0.5"
            />
            <div className="flex-1 flex flex-col relative">
              <div className="flex gap-2 w-full">
                <input
                  id={`comment-input-${localPost._id}`}
                  type="text"
                  value={newComment}
                  onChange={handleCommentChange}
                  onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                  placeholder="Write a comment..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                />
                <button
                  onClick={handlePostComment}
                  disabled={!newComment.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-full text-xs font-semibold disabled:opacity-40 shrink-0 transition-colors shadow-sm"
                >
                  Post
                </button>
              </div>

              {/* Mentions Dropdown */}
              {showMentions && mentionList.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto bg-white border border-gray-200 shadow-xl rounded-xl z-30">
                  {mentionList.map(emp => (
                    <div
                      key={emp._id}
                      onClick={() => handleSelectMention(emp)}
                      className="flex items-center gap-2 p-2.5 hover:bg-indigo-50 cursor-pointer transition-colors"
                    >
                      <ProfileImage
                        profileImage={emp.basicInfo?.profileImage}
                        firstName={emp.basicInfo?.firstName}
                        lastName={emp.basicInfo?.lastName}
                        size="xs"
                        className="!w-6 !h-6 text-[10px] shrink-0"
                      />
                      <span className="text-sm text-gray-800 font-medium">
                        {emp.basicInfo?.firstName} {emp.basicInfo?.lastName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
