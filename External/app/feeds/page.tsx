'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGenericAPI } from '../useGenericAPI';
import NotificationDrawer from '@/components/Common/NotificationDrawer';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiMessageSquare, FiEye, FiPaperclip, FiHash
} from 'react-icons/fi';
import { MdOutlineCampaign, MdOutlineDynamicFeed } from 'react-icons/md';
import ProfileImage from '@/components/Common/ProfileImage';

export default function FeedsPage() {
  const router = useRouter();
  const { read, update, create, request, loading } = useGenericAPI();

  const [channels, setChannels] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
  const [fetching, setFetching] = useState(true);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Comments state maps postId -> comments array
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [agentId, setAgentId] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('agentToken');
    const aid = localStorage.getItem('agentId');
    if (!token || !aid) {
      router.push('/login');
      return;
    }
    setAgentId(aid);
    fetchInitialData();
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const aid = localStorage.getItem('agentId');
      const data = await read('notifications', { filter: { receiver: aid } });
      if (data.success) {
        const list = data.data || [];
        const count = list.filter((n: any) => !(n.isRead || n.read)).length;
        setUnreadNotifCount(count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchInitialData = async () => {
    setFetching(true);
    try {
      // 1. Fetch allowed external feed channels
      const channelRes = await read('feed_channels', { sort: 'name' });
      if (channelRes.success) {
        setChannels(channelRes.data || []);
      }

      // 2. Fetch posts
      await fetchPosts('all');
    } catch (err) {
      console.error('Failed to load feeds data:', err);
    } finally {
      setFetching(false);
    }
  };

  const fetchPosts = async (channelId: string) => {
    try {
      const filter: any = {};
      if (channelId && channelId !== 'all') {
        filter.channels = channelId;
      }
      const postsRes = await read('feed_posts', {
        filter,
        populateFields: 'author,channel',
        sort: '-createdAt'
      });
      if (postsRes.success) {
        setPosts(postsRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleChannelSelect = async (channelId: string) => {
    setSelectedChannelId(channelId);
    setFetching(true);
    await fetchPosts(channelId);
    setFetching(false);
  };

  const handleVote = async (post: any, optionIndex: number) => {
    if (!agentId) return;

    const updatedOptions = (post.pollOptions || []).map((opt: any, idx: number) => {
      let votes = [...(opt.votes || [])];
      votes = votes.filter(v => {
        const vId = v && typeof v === 'object' ? (v._id || v.toString()) : (v ? v.toString() : '');
        return vId !== agentId.toString();
      });
      if (idx === optionIndex) {
        votes.push(agentId);
      }
      return { ...opt, votes };
    });

    setPosts(prev => prev.map(p => p._id === post._id ? { ...p, pollOptions: updatedOptions } : p));

    try {
      await update('feed_posts', post._id, {
        pollOptions: updatedOptions,
        voterModel: 'agents'
      });
      toast.success("Vote registered!");
    } catch (err) {
      console.error("Failed to vote:", err);
      toast.error("Failed to submit vote");
      fetchPosts(selectedChannelId);
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const res = await read('feed_comments', {
        filter: { postId },
        sort: 'createdAt',
        populateFields: 'author'
      });
      if (res?.success) {
        setCommentsMap(prev => ({ ...prev, [postId]: res.data || [] }));
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    }
  };

  const toggleComments = (postId: string) => {
    const isExpanded = !expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: isExpanded }));
    if (isExpanded) {
      fetchComments(postId);
    }
  };

  const handlePostComment = async (postId: string) => {
    const text = newCommentText[postId] || '';
    if (!text.trim()) return;

    try {
      await create('feed_comments', {
        postId,
        author: agentId,
        content: text,
        authorModel: 'agents'
      });

      setPosts(prev => prev.map(p => p._id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));

      const post = posts.find(p => p._id === postId);
      if (post) {
        await update('feed_posts', postId, { commentsCount: (post.commentsCount || 0) + 1 });
      }

      setNewCommentText(prev => ({ ...prev, [postId]: '' }));
      toast.success("Comment posted!");
      fetchComments(postId);
    } catch (err) {
      console.error("Failed to post comment:", err);
      toast.error("Failed to comment");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('agentToken');
    localStorage.removeItem('agentId');
    localStorage.removeItem('clientId');
    localStorage.removeItem('sessionId');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Toaster position="top-right" />

      {/* Top bar navigation */}
      <nav className="lmx-topbar">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg lmx-gradient-hero flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <span className="text-ink font-semibold text-[15px]">WorkHub</span>
            <span className="text-ink-subtle text-[13px] ml-2">Agent Portal</span>
          </div>
        </div>

        {/* Center menu links */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[14px] font-semibold text-ink-muted hover:text-accent transition-colors"
          >
            Tickets
          </button>
          <button
            onClick={() => router.push('/feeds')}
            className="text-[14px] font-bold text-accent border-b-2 border-accent pb-1 transition-colors"
          >
            Feeds
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="lmx-btn-ghost text-[13px] p-2 relative shrink-0"
            aria-label="Notifications"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadNotifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-1 ring-white animate-pulse" />
            )}
          </button>
          <button onClick={handleLogout} className="lmx-btn-ghost text-[13px] px-3 py-2">
            Logout
          </button>
        </div>
      </nav>

      {/* Main Workspace Layout */}
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left Navigation: Feed Channels */}
          <div className="lg:col-span-1 space-y-4">
            <div className="p-4 border border-hairline bg-surface rounded-tracker-lg">
              <h3 className="text-xs font-bold text-ink-subtle uppercase tracking-wider mb-3">Feed Channels</h3>
              <div className="space-y-1">
                <button
                  onClick={() => handleChannelSelect('all')}
                  className={`w-full text-left px-3 py-2 rounded-tracker-md text-[13px] font-semibold transition-all flex items-center justify-between ${selectedChannelId === 'all'
                    ? 'bg-accent/10 text-accent font-bold'
                    : 'hover:bg-surface-1 text-ink-muted'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <MdOutlineDynamicFeed className="text-base shrink-0" />
                    All Feeds
                  </span>
                </button>
                {channels.map((chan) => (
                  <button
                    key={chan._id}
                    onClick={() => handleChannelSelect(chan._id)}
                    className={`w-full text-left px-3 py-2 rounded-tracker-md text-[13px] font-semibold transition-all flex items-center justify-between ${selectedChannelId === chan._id
                      ? 'bg-accent/10 text-accent font-bold'
                      : 'hover:bg-surface-1 text-ink-muted'
                      }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FiHash className="text-base shrink-0" />
                      {chan.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Feed posts */}
          <div className="lg:col-span-3 space-y-4">

            {/* Header info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="lmx-eyebrow mb-1">UPDATES & ANNOUNCEMENTS</p>
                <h2 className="text-[24px] font-semibold text-ink tracking-tight">
                  {selectedChannelId === 'all'
                    ? 'All Activity'
                    : channels.find(c => c._id === selectedChannelId)?.name || 'Feed'}
                </h2>
              </div>
            </div>

            {fetching ? (
              <div className="flex justify-center py-16">
                <div className="lmx-spinner" />
              </div>
            ) : posts.length === 0 ? (
              <div className="lmx-section-card-plain p-12 text-center">
                <MdOutlineDynamicFeed className="text-5xl text-ink-subtle mx-auto mb-3 opacity-30" />
                <h3 className="text-[16px] font-semibold text-ink mb-1">No posts found</h3>
                <p className="text-[13px] text-ink-muted">No updates have been posted to this channel yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => {
                  const isAnnouncement = post.postType === 'Announcement';
                  const totalVotes = (post.pollOptions || []).reduce((sum: number, opt: any) => sum + (opt.votes?.length || 0), 0) || 0;

                  return (
                    <div
                      key={post._id}
                      className={`p-5 border bg-surface rounded-tracker-lg transition-all ${isAnnouncement
                        ? 'border-amber-400 bg-amber-500/5'
                        : 'border-hairline hover:border-accent'
                        }`}
                    >
                      {/* Post Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ProfileImage
                            profileImage={post.authorModel === 'agents' ? post.author?.profileImage : post.author?.basicInfo?.profileImage}
                            firstName={post.authorModel === 'agents' ? (post.author?.name ? post.author.name.split(' ')[0] : 'Client') : 'Support'}
                            lastName={post.authorModel === 'agents' ? (post.author?.name ? post.author.name.split(' ').slice(1).join(' ') : 'Agent') : 'Team'}
                            size="xs"
                            className="!w-8 !h-8 text-xs shrink-0 ring-2 ring-hairline-soft"
                          />
                          <div>
                            <div className="text-xs flex items-center gap-1 flex-wrap">
                              <span className="font-bold text-ink">
                                {post.authorModel === 'agents' ? (post.author?.name || 'Client Agent') : 'Support Team'}
                              </span>
                              {post.channel && (
                                <>
                                  <span className="text-ink-subtle">in</span>
                                  <span className="font-semibold text-accent hover:underline cursor-pointer">
                                    #{post.channel.name}
                                  </span>
                                </>
                              )}
                            </div>
                            <span className="text-[10px] text-ink-subtle mt-0.5 block">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {post.postType && post.postType !== 'General' && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${isAnnouncement
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20'
                            }`}>
                            {isAnnouncement ? '📢 Announcement' : post.postType}
                          </span>
                        )}
                      </div>

                      {/* Subject */}
                      {post.subject && (
                        <h3 className="text-[15px] font-bold text-ink mb-2">{post.subject}</h3>
                      )}

                      {/* Rich Content Text */}
                      <div
                        className="text-ink text-[13px] mb-4 leading-relaxed ql-editor !p-0"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                      />

                      {/* Dynamic Poll Voting Component */}
                      {post.postType === 'Poll' && post.pollOptions && post.pollOptions.length > 0 && (
                        <div className="mb-4 space-y-2 border border-hairline-soft p-3 rounded-tracker-lg bg-surface-1/30">
                          {post.pollOptions.map((option: any, idx: number) => {
                            const votesCount = option.votes?.length || 0;
                            const pct = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                            const isUserChoice = option.votes?.some((v: any) => {
                              const vId = v && typeof v === 'object' ? (v._id || v.toString()) : (v ? v.toString() : '');
                              return vId === agentId.toString();
                            });

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleVote(post, idx)}
                                className={`w-full text-left relative overflow-hidden p-2.5 rounded-tracker-md border transition-all flex items-center justify-between group ${isUserChoice
                                  ? 'border-accent bg-accent/5'
                                  : 'border-hairline hover:bg-surface-1 hover:border-ink-subtle'
                                  }`}
                              >
                                {/* Progress overlay background */}
                                <div
                                  className="absolute top-0 left-0 bottom-0 bg-accent/10 transition-all duration-300 pointer-events-none"
                                  style={{ width: `${pct}%` }}
                                />

                                <div className="relative z-10 flex items-center gap-2 min-w-0 pointer-events-none">
                                  <span className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold ${isUserChoice
                                    ? 'border-accent bg-accent text-white'
                                    : 'border-ink-subtle bg-white text-transparent'
                                    }`}>
                                    {isUserChoice ? "✓" : ""}
                                  </span>
                                  <span className={`text-xs font-semibold truncate ${isUserChoice ? 'text-ink' : 'text-ink-muted group-hover:text-ink'
                                    }`}>
                                    {option.optionText}
                                  </span>
                                </div>

                                <div className="relative z-10 shrink-0 text-right pl-2 pointer-events-none">
                                  <span className="text-xs font-bold text-ink">{pct}%</span>
                                  <span className="text-[10px] text-ink-subtle block">
                                    {votesCount} vote{votesCount !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                          <p className="text-[10px] text-ink-tertiary text-right font-medium px-1">
                            Total: {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                          </p>
                        </div>
                      )}

                      {/* Attachments */}
                      {post.attachments && post.attachments.length > 0 && (
                        <div className="mb-4">
                          <div className="text-[11px] font-bold text-ink-subtle uppercase mb-2 tracking-wider">Attachments</div>
                          <div className="flex gap-2 flex-wrap">
                            {post.attachments.map((att: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 border border-hairline rounded p-1.5 hover:bg-surface-1 cursor-pointer transition-all">
                                <FiPaperclip className="text-xs text-accent" />
                                <span className="text-[11px] text-ink truncate max-w-[150px] font-medium">{att}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Post Actions Toolbar */}
                      <div className="flex items-center justify-between border-t border-hairline-soft pt-3 mt-4 text-[12px] text-ink-muted">
                        <button
                          onClick={() => toggleComments(post._id)}
                          className="flex items-center gap-2 hover:text-accent font-semibold transition-colors"
                        >
                          <FiMessageSquare className="text-sm" />
                          <span>{post.commentsCount || 0} Comments</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <FiEye className="text-sm" />
                          <span>{post.viewsCount || 0} Views</span>
                        </div>
                      </div>

                      {/* Expandable Comments list */}
                      {expandedComments[post._id] && (
                        <div className="border-t border-hairline-soft mt-3 pt-3 space-y-3 animate-fade-in">
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                            {(commentsMap[post._id] || []).length === 0 ? (
                              <p className="text-xs text-ink-subtle italic text-center py-2">No comments yet. Write one below!</p>
                            ) : (
                              (commentsMap[post._id] || []).map((comm) => (
                                <div key={comm._id} className="flex gap-2.5 items-start">
                                  <ProfileImage
                                    profileImage={comm.authorModel === 'agents' ? comm.author?.profileImage : comm.author?.basicInfo?.profileImage}
                                    firstName={comm.authorModel === 'agents' ? (comm.author?.name ? comm.author.name.split(' ')[0] : 'Client') : 'Support'}
                                    lastName={comm.authorModel === 'agents' ? (comm.author?.name ? comm.author.name.split(' ').slice(1).join(' ') : 'Agent') : 'Team'}
                                    size="xs"
                                    className="!w-7 !h-7 text-[10px] shrink-0 mt-0.5"
                                  />
                                  <div className="flex-1 p-2.5 rounded-tracker-md bg-canvas/60 border border-hairline-soft">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <span className="text-xs font-bold text-ink">
                                        {comm.authorModel === 'agents' ? (comm.author?.name || 'Client Agent') : 'Support Team'}
                                      </span>
                                      <span className="text-[9px] text-ink-subtle">
                                        {new Date(comm.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-xs text-ink-muted leading-normal">{comm.content}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Write Comment Form */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newCommentText[post._id] || ''}
                              onChange={(e) => setNewCommentText(prev => ({ ...prev, [post._id]: e.target.value }))}
                              placeholder="Write a comment..."
                              className="lmx-input flex-1 py-1.5 px-3 text-xs"
                              onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(post._id); }}
                            />
                            <button
                              onClick={() => handlePostComment(post._id)}
                              className="lmx-btn-accent text-xs px-3 py-1.5 shrink-0"
                            >
                              Post
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <NotificationDrawer isOpen={drawerOpen} setIsOpen={(val) => { setDrawerOpen(val); if (!val) fetchUnreadCount(); }} />
    </div>
  );
}
