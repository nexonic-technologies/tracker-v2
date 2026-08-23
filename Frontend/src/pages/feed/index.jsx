import React, { useState, useEffect, useRef, useCallback } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PostCard from '../../components/Feeds/PostCard';
import FeedComposer from '../../components/Feeds/FeedComposer';
import useGenericAPI from '../../components/useGenericAPI';
import { FiSearch, FiStar, FiAtSign, FiFileText, FiHash, FiUsers, FiFilter, FiLoader, FiPlus, FiX, FiPaperclip, FiMenu, FiChevronDown, FiChevronRight, FiRefreshCw, FiEdit2 } from 'react-icons/fi';
import { MdOutlineDynamicFeed, MdOutlineCampaign } from 'react-icons/md';
import { Dialog } from '@mui/material';
import { useAuth } from '@context/authProvider';
import toast from 'react-hot-toast';
import ProfileImage from '@components/Common/ProfileImage';
import FilterDropdown from '@components/Common/FilterDropdown';
import JarvisFeedSummarizer from '../../components/Jarvis/JarvisFeedSummarizer';

dayjs.extend(relativeTime);

export default function Feeds() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [activeNav, setActiveNav] = useState('All Posts');
  const [posts, setPosts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [editDraftId, setEditDraftId] = useState(null);

  // Post Composer State
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [sortOrder, setSortOrder] = useState('-createdAt');
  const [postSubject, setPostSubject] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState('Update');
  const [targetType, setTargetType] = useState('Channel');
  const [targetId, setTargetId] = useState('');

  // Groups, Channels, Employees
  const [groups, setGroups] = useState([]);
  const [channels, setChannels] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [expiryDays, setExpiryDays] = useState(7);
  const [postMentions, setPostMentions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionList, setMentionList] = useState([]);
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Collapse states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [announcementsExpanded, setAnnouncementsExpanded] = useState(true);
  const [feedMenuExpanded, setFeedMenuExpanded] = useState(true);

  // Modals
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editGroupId, setEditGroupId] = useState(null);
  const [newGroup, setNewGroup] = useState({ name: '', description: '', members: [] });
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editChannelId, setEditChannelId] = useState(null);
  const [newChannel, setNewChannel] = useState({ name: '', description: '', members: [] });

  // Search
  const [groupSearch, setGroupSearch] = useState('');
  const [channelSearch, setChannelSearch] = useState('');
  const [showGroupSearch, setShowGroupSearch] = useState(false);
  const [showChannelSearch, setShowChannelSearch] = useState(false);
  const searchDebounceRef = useRef(null);

  const { readPaginated, create, update, loading } = useGenericAPI();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeNav === 'All Posts') {
      fetchPosts();
    } else if (activeNav === 'Starred') {
      fetchStarredPosts();
    } else if (activeNav === 'Mentions') {
      fetchMentionPosts();
    } else if (activeNav === 'My Feeds') {
      fetchMyFeeds();
    } else if (activeNav === 'My Follows') {
      fetchFollowingPosts();
    } else if (activeNav === 'Broadcasts') {
      fetchBroadcastPosts();
    } else if (activeNav === 'Drafts') {
      fetchDraft();
    }
  }, [activeNav]);

  const fetchPosts = async () => {
    try {
      const response = await readPaginated('feed_posts', 1, 10, {
        populateFields: 'author,group,channel',
        sort: '-createdAt'
      });
      if (response?.data) {
        setPosts(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch posts', err);
      toast.error("Failed to fetch posts");
    }
  };

  const fetchStarredPosts = async () => {
    try {
      const response = await readPaginated('feed_posts', 1, 10, {
        filter: JSON.stringify({ bookmarkedBy: user?.id }),
        populateFields: 'author,group,channel',
        sort: '-createdAt'
      });
      if (response?.data) {
        setPosts(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch starred posts', err);
      toast.error("Failed to fetch starred posts");
    }
  };

  const fetchMentionPosts = async () => {
    try {
      const response = await readPaginated('feed_posts', 1, 10, {
        filter: JSON.stringify({ mentions: user?.id }),
        populateFields: 'author,group,channel',
        sort: '-createdAt'
      });
      if (response?.data) {
        setPosts(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch mention posts', err);
      toast.error("Failed to fetch mention posts");
    }
  };

  const fetchMyFeeds = async () => {
    try {
      const response = await readPaginated('feed_posts', 1, 10, {
        filter: JSON.stringify({ author: user?.id }),
        populateFields: 'author,group,channel',
        sort: '-createdAt'
      });
      if (response?.data) {
        setPosts(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch my feeds', err);
      toast.error("Failed to fetch my feeds");
    }
  };

  const fetchFollowingPosts = async () => {
    try {
      const response = await readPaginated('feed_posts', 1, 10, {
        filter: JSON.stringify({ followers: user?.id }),
        populateFields: 'author,group,channel',
        sort: '-createdAt'
      });
      if (response?.data) {
        setPosts(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch following posts', err);
      toast.error("Failed to fetch following posts");
    }
  };

  const fetchBroadcastPosts = async () => {
    try {
      const response = await readPaginated('feed_posts', 1, 10, {
        filter: JSON.stringify({ isBroadcast: true }),
        populateFields: 'author,group,channel',
        sort: '-createdAt'
      });
      if (response?.data) {
        setPosts(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch pinned posts', err);
      toast.error("Failed to fetch pinned posts");
    }
  };

  const fetchDraft = async () => {
    try {
      const response = await readPaginated('feed_posts', 1, 10, {
        filter: JSON.stringify({ isDraft: true, author: user?.id }),
        populateFields: 'author,group,channel',
        sort: '-createdAt'
      });
      if (response?.data) {
        setPosts(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch draft posts', err);
      toast.error("Failed to fetch draft posts");
    }
  }

  const fetchSearchPost = async (id) => {
    try {
      const response = await readPaginated('feed_posts', 1, 10, {
        filter: JSON.stringify({ $or: [{ group: id }, { channel: id }] }),
        populateFields: 'author,group,channel',
        sort: '-createdAt'
      });
      if (response?.data) {
        setPosts(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch search posts", error);
      toast.error("Failed to filter posts");
    }
  };

  const handlePostSearch = useCallback((val) => {
    setSearchText(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      // Client-side filter is handled in render
    }, 300);
  }, []);

  const fetchInitialData = async () => {
    try {
      const gRes = await readPaginated('feed_groups', 1, 100, { sort: 'name' });
      if (gRes?.data) setGroups(gRes.data);

      const cRes = await readPaginated('feed_channels', 1, 100, { sort: 'name' });
      if (cRes?.data) setChannels(cRes.data);

      const eRes = await readPaginated('employees', 1, 100);
      if (eRes?.data) setEmployees(eRes.data);
    } catch (err) {
      console.error('Failed to fetch initial data', err);
    }
  };

  const handleSaveDraft = async () => {
    if (!postContent.trim() || postContent === '<p><br></p>') {
      toast.error("Please add some content before saving draft");
      return;
    }
    try {
      const payload = {
        content: postContent,
        subject: postSubject,
        postType: postType,
        author: user?.id,
        mentions: postMentions,
        isDraft: true
      };

      if (postType === 'Announcement') {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + Number(expiryDays));
        payload.expiryDate = expiry.toISOString();
      }

      if (postType === 'Poll') {
        const filteredOpts = pollOptions.filter(opt => opt.trim() !== '');
        payload.pollOptions = filteredOpts.map(opt => ({ optionText: opt, votes: [] }));
      }

      if (targetType === 'Group' && targetId) {
        payload.group = targetId;
        payload.isBroadcast = true;
        const groupChannels = channels.filter(c => c.groups && c.groups.some(gId => gId.toString() === targetId.toString()));
        payload.channels = groupChannels.map(c => c._id);
      }

      if (targetType === 'Channel' && targetId) {
        payload.channel = targetId;
        payload.channels = [targetId];
      }

      if (editDraftId) {
        await update('feed_posts', editDraftId, payload);
        toast.success('Draft updated successfully!');
      } else {
        const res = await create('feed_posts', payload);
        if (res?.data?._id) {
          setEditDraftId(res.data._id);
        }
        toast.success('Draft saved successfully!');
      }
      fetchPosts();
    } catch (err) {
      console.error('Failed to save draft', err);
      toast.error('Failed to save draft');
    }
  };

  const handleEditDraft = (draftPost) => {
    setEditDraftId(draftPost._id);
    setPostSubject(draftPost.subject || '');
    setPostContent(draftPost.content || '');
    setPostType(draftPost.postType || 'Update');
    if (draftPost.postType === 'Poll' && draftPost.pollOptions) {
      setPollOptions(draftPost.pollOptions.map(opt => opt.optionText || opt));
    }
    if (draftPost.group) {
      setTargetType('Group');
      setTargetId(draftPost.group._id || draftPost.group);
    } else if (draftPost.channel || (draftPost.channels && draftPost.channels.length > 0)) {
      setTargetType('Channel');
      setTargetId(draftPost.channel?._id || draftPost.channel || draftPost.channels?.[0]);
    } else {
      setTargetType('Channel');
      setTargetId('');
    }
    setPostMentions(draftPost.mentions || []);
    setIsComposerExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success(draftPost.isDraft ? 'Draft loaded into composer!' : 'Post loaded into composer!');
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() || postContent === '<p><br></p>') return;
    try {
      const payload = {
        content: postContent,
        subject: postSubject,
        postType: postType,
        author: user?.id,
        mentions: postMentions
      };

      if (postType === 'Announcement') {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + Number(expiryDays));
        payload.expiryDate = expiry.toISOString();
      }

      if (postType === 'Poll') {
        const filteredOpts = pollOptions.filter(opt => opt.trim() !== '');
        if (filteredOpts.length < 2) {
          toast.error("Please add at least 2 poll options");
          return;
        }
        payload.pollOptions = filteredOpts.map(opt => ({ optionText: opt, votes: [] }));
      }

      if (targetType === 'Group' && targetId) {
        payload.group = targetId;
        payload.isBroadcast = true;
        const groupChannels = channels.filter(c => c.groups && c.groups.some(gId => gId.toString() === targetId.toString()));
        payload.channels = groupChannels.map(c => c._id);
      }

      if (targetType === 'Channel' && targetId) {
        payload.channel = targetId;
        payload.channels = [targetId];
      }

      if (editDraftId) {
        payload.isDraft = false;
        await update('feed_posts', editDraftId, payload);
        toast.success('Post published successfully!');
        setEditDraftId(null);
      } else {
        payload.isDraft = false;
        await create('feed_posts', payload, 'Post created successfully!');
      }
      localStorage.removeItem('feed-post-draft');
      setPostContent('');
      setPostSubject('');
      setPostType('Update');
      setTargetType('Channel');
      setTargetId('');
      setPostMentions([]);
      setExpiryDays(7);
      setPollOptions(['', '']);
      fetchPosts();
      setIsComposerExpanded(false);
    } catch (err) {
      console.error('Failed to create post', err);
    }
  };

  const handleContentChange = (val) => {
    setPostContent(val);

    const tempElement = document.createElement('div');
    tempElement.innerHTML = val;
    const textContent = tempElement.textContent || tempElement.innerText || "";

    const match = textContent.match(/@([a-zA-Z0-9]*)$/);
    if (match) {
      const search = match[1].toLowerCase();
      const filtered = employees.filter(emp => {
        const name = `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.toLowerCase();
        return name.includes(search);
      });
      setMentionList(filtered);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleSelectMention = (employee) => {
    const lastAtIndex = postContent.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textBefore = postContent.substring(0, lastAtIndex);
      const textAfter = postContent.substring(lastAtIndex);
      const replacedTextAfter = textAfter.replace(/@([a-zA-Z0-9]*)/, `<strong class="text-indigo-600">@${employee.basicInfo?.firstName}</strong>&nbsp;`);
      setPostContent(textBefore + replacedTextAfter);
    }

    setShowMentions(false);
    if (!postMentions.includes(employee._id)) {
      setPostMentions([...postMentions, employee._id]);
    }
  };

  const normalizeIds = (arr) =>
    (arr || []).map(m => {
      if (m && typeof m === 'object') {
        // New format: { employee: ObjectId }
        if (m.employee) return m.employee?.toString?.() || m.employee;
        // Old format: { _id: ObjectId }
        if (m._id) return m._id?.toString?.() || m._id;
      }
      return m?.toString?.();
    }).filter(Boolean);

  const handleOpenGroupModal = (g = null) => {
    if (g) {
      setNewGroup({ name: g.name, description: g.description || '', members: normalizeIds(g.members) });
      setEditGroupId(g._id);
    } else {
      setNewGroup({ name: '', description: '', members: [] });
      setEditGroupId(null);
    }
    setShowGroupModal(true);
  };

  const handleOpenChannelModal = (c = null) => {
    if (c) {
      setNewChannel({ name: c.name, description: c.description || '', members: normalizeIds(c.members) });
      setEditChannelId(c._id);
    } else {
      setNewChannel({ name: '', description: '', members: [] });
      setEditChannelId(null);
    }
    setShowChannelModal(true);
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) return;
    try {
      if (editGroupId) {
        await update('feed_groups', editGroupId, { ...newGroup }, 'Group updated successfully!');
      } else {
        await create('feed_groups', { ...newGroup, createdBy: user?.id }, 'Group created successfully!');
      }
      setNewGroup({ name: '', description: '', members: [] });
      setEditGroupId(null);
      setShowGroupModal(false);
      fetchInitialData();
    } catch (err) {
      console.error('Failed to save group', err);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannel.name.trim()) return;
    try {
      if (editChannelId) {
        await update('feed_channels', editChannelId, { ...newChannel }, 'Channel updated successfully!');
      } else {
        await create('feed_channels', { ...newChannel, createdBy: user?.id }, 'Channel created successfully!');
      }
      setNewChannel({ name: '', description: '', members: [] });
      setEditChannelId(null);
      setShowChannelModal(false);
      fetchInitialData();
    } catch (err) {
      console.error('Failed to save channel', err);
    }
  };

  const handleNavClick = (label) => {
    setActiveNav(label);
    setMobileSidebarOpen(false);
    if (label === 'All Posts' || label === 'Starred' || label === 'Mentions' || label === 'My Feeds' || label === 'My Follows' || label === 'Drafts') {
      setActiveTab('All');
    } else if (label === 'Broadcasts') {
      setActiveTab('Announcement');
    }
  };

  // Filtered posts (relying on genericApi server-side filtering results)
  const filteredPosts = posts
    .filter(p => !p.isDeleted)
    .filter(p => activeTab === 'All' || p.postType === activeTab)
    .filter(p => {
      // Drafts filtering
      if (activeNav === 'Drafts') {
        return p.isDraft === true;
      }
      // Exclude drafts for all other standard views
      return !p.isDraft;
    })
    .filter(p => {
      if (!searchText.trim()) return true;
      const q = searchText.toLowerCase();
      return (
        (p.subject || '').toLowerCase().includes(q) ||
        (p.content || '').toLowerCase().includes(q) ||
        (p.author?.basicInfo?.firstName || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === '-createdAt' ? dateB - dateA : dateA - dateB;
    });

  const announcements = posts
    .filter(p => !p.isDeleted && p.postType === 'Announcement')
    .filter(p => !p.expiryDate || new Date(p.expiryDate) > new Date());

  // Filtered groups/channels for sidebar search
  const filteredGroups = groupSearch
    ? groups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
    : groups;
  const filteredChannels = channelSearch
    ? channels.filter(c => c.name.toLowerCase().includes(channelSearch.toLowerCase()))
    : channels;

  const sidebarContent = (
    <>
      {/* LOGO HEADER */}
      <div className="p-5 flex items-center justify-between border-b border-hairline-soft">
        <div className="flex items-center gap-3">
          <div className="lmx-gradient-hero rounded-tracker-md p-1.5 shadow-sm">
            <MdOutlineDynamicFeed className="text-white text-xl" />
          </div>
          <h2 className="text-ink font-bold text-lg tracking-tight">Feeds</h2>
        </div>
        <button
          onClick={() => { setSidebarOpen(false); setMobileSidebarOpen(false); }}
          className="tracker-btn-ghost !p-1 hidden md:flex"
        >
          <FiChevronRight className="text-lg" />
        </button>
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="tracker-btn-ghost !p-1 md:hidden"
        >
          <FiX className="text-lg" />
        </button>
      </div>

      {/* FEED MENU */}
      <div className="px-3 pt-4">
        <button
          onClick={() => setFeedMenuExpanded(!feedMenuExpanded)}
          className="flex items-center justify-between w-full text-[11px] font-bold text-ink-subtle uppercase tracking-widest mb-2 px-2 hover:text-ink-muted transition-colors"
        >
          <span>Feed Menu</span>
          {feedMenuExpanded ? <FiChevronDown className="text-xs" /> : <FiChevronRight className="text-xs" />}
        </button>
        <div className={`space-y-0.5 overflow-hidden transition-all duration-300 ${feedMenuExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <NavItem icon={<MdOutlineDynamicFeed />} label="All Posts" active={activeNav === 'All Posts'} badge={posts.length > 0 ? `${posts.length}` : null} onClick={() => handleNavClick('All Posts')} />
          <NavItem icon={<FiStar />} label="Starred" active={activeNav === 'Starred'} onClick={() => handleNavClick('Starred')} />
          <NavItem icon={<FiAtSign />} label="Mentions" active={activeNav === 'Mentions'} onClick={() => handleNavClick('Mentions')} />
          <NavItem icon={<FiFileText />} label="My Feeds" active={activeNav === 'My Feeds'} onClick={() => handleNavClick('My Feeds')} />
          <NavItem icon={<FiUsers />} label="My Follows" active={activeNav === 'My Follows'} onClick={() => handleNavClick('My Follows')} />
          <NavItem icon={<MdOutlineCampaign />} label="Broadcasts" active={activeNav === 'Broadcasts'} onClick={() => handleNavClick('Broadcasts')} />
          <NavItem icon={<FiFileText />} label="Drafts" active={activeNav === 'Drafts'} onClick={() => handleNavClick('Drafts')} />
        </div>
      </div>

      {/* GROUPS */}
      <div className="px-3 mt-5">
        <div className="flex items-center justify-between text-[11px] font-bold text-ink-subtle uppercase tracking-widest mb-2 px-2">
          <button onClick={() => setGroupsExpanded(!groupsExpanded)} className="flex items-center gap-1 hover:text-ink-muted transition-colors">
            {groupsExpanded ? <FiChevronDown className="text-xs" /> : <FiChevronRight className="text-xs" />}
            <span>Groups</span>
          </button>
          <div className="flex gap-1.5">
            <button onClick={() => handleOpenGroupModal()} className="tracker-btn-ghost !p-1 !px-1">
              <FiPlus className="text-sm" />
            </button>
            <button onClick={() => setShowGroupSearch(!showGroupSearch)} className="tracker-btn-ghost !p-1 !px-1">
              <FiSearch className="text-sm" />
            </button>
          </div>
        </div>
        {showGroupSearch && (
          <input
            type="text"
            placeholder="Search groups..."
            value={groupSearch}
            onChange={e => setGroupSearch(e.target.value)}
            className="lmx-input mb-2 py-1.5 text-sm"
            autoFocus
          />
        )}
        <div className={`space-y-0.5 text-sm overflow-hidden transition-all duration-300 ${groupsExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="max-h-36 overflow-y-auto scrollbar-hide">
            {filteredGroups.length === 0 ? (
              <div className="text-xs text-ink-subtle italic pl-3 py-2">No groups found</div>
            ) : (
              filteredGroups.map(g => (
                <div
                  key={g._id}
                  onClick={() => { setActiveNav(g.name); fetchSearchPost(g._id); setMobileSidebarOpen(false); }}
                  className="flex items-center gap-2.5 hover:bg-surface-1 p-2 rounded-lg cursor-pointer transition-colors group"
                >
                  <span className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 rounded-md text-white text-[10px] font-bold shrink-0 shadow-sm">
                    {g.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate text-ink-muted group-hover:text-ink transition-colors text-[13px] flex-1">{g.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenGroupModal(g); }}
                    className="opacity-0 group-hover:opacity-100 tracker-btn-ghost !p-1"
                    title="Edit Group"
                  >
                    <FiEdit2 className="text-[10px]" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CHANNELS */}
      <div className="px-3 mt-5 flex-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-ink-subtle uppercase tracking-widest mb-2 px-2">
          <button onClick={() => setChannelsExpanded(!channelsExpanded)} className="flex items-center gap-1 hover:text-ink-muted transition-colors">
            {channelsExpanded ? <FiChevronDown className="text-xs" /> : <FiChevronRight className="text-xs" />}
            <span>Channels</span>
          </button>
          <div className="flex gap-1.5">
            <button onClick={() => handleOpenChannelModal()} className="tracker-btn-ghost !p-1 !px-1">
              <FiPlus className="text-sm" />
            </button>
            <button onClick={() => setShowChannelSearch(!showChannelSearch)} className="tracker-btn-ghost !p-1 !px-1">
              <FiSearch className="text-sm" />
            </button>
          </div>
        </div>
        {showChannelSearch && (
          <input
            type="text"
            placeholder="Search channels..."
            value={channelSearch}
            onChange={e => setChannelSearch(e.target.value)}
            className="lmx-input mb-2 py-1.5 text-sm"
            autoFocus
          />
        )}
        <div className={`space-y-0.5 text-sm overflow-hidden transition-all duration-300 ${channelsExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="max-h-36 overflow-y-auto scrollbar-hide">
            {filteredChannels.length === 0 ? (
              <div className="text-xs text-ink-subtle italic pl-3 py-2">No channels found</div>
            ) : (
              filteredChannels.map(c => (
                <div
                  key={c._id}
                  onClick={() => { setActiveNav(c.name); fetchSearchPost(c._id); setMobileSidebarOpen(false); }}
                  className="flex items-center gap-2.5 hover:bg-surface-1 p-2 rounded-lg cursor-pointer transition-colors group"
                >
                  <span className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 rounded-md text-white text-[10px] font-bold shrink-0 shadow-sm">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate text-ink-muted group-hover:text-ink transition-colors text-[13px] flex-1">{c.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenChannelModal(c); }}
                    className="opacity-0 group-hover:opacity-100 tracker-btn-ghost !p-1"
                    title="Edit Channel"
                  >
                    <FiEdit2 className="text-[10px]" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="lmx-page-bleed flex bg-canvas text-ink" data-module="hr">
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 tracker-overlay z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div
        className={`hidden md:flex bg-surface text-ink-muted flex-col shrink-0 overflow-y-auto transition-all duration-300 ease-in-out scrollbar-hide border-r border-hairline-soft ${sidebarOpen ? 'w-52' : 'w-0 overflow-hidden'}`}
        style={{ minWidth: sidebarOpen ? '13rem' : '0' }}
      >
        {sidebarContent}
      </div>

      <div
        className={`fixed top-0 left-0 h-full bg-surface text-ink-muted flex flex-col z-50 overflow-y-auto transition-transform duration-300 md:hidden w-72 scrollbar-hide border-r border-hairline-soft ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebarContent}
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="px-4 py-3 bg-surface border-b border-hairline-soft shrink-0 flex items-center justify-between gap-2.5 flex-nowrap overflow-x-auto scrollbar-hide w-full">
          {/* Left Title & Sidebar Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setMobileSidebarOpen(true);
                } else {
                  setSidebarOpen(!sidebarOpen);
                }
              }}
              className="p-1.5 rounded-lg bg-surface-1 hover:bg-slate-200/50 dark:hover:bg-zinc-800 text-ink-subtle hover:text-ink transition-colors cursor-pointer shrink-0"
              title="Channels & Groups Sidebar"
            >
              <FiMenu className="text-base" />
            </button>
            {activeNav === 'Feeds' && (
              <h1 className="text-sm sm:text-base font-bold text-ink tracking-tight whitespace-nowrap">
                Feeds
              </h1>
            )}
            {activeNav !== 'Feeds' && (
              <h1 className="text-sm sm:text-base font-bold text-ink tracking-tight whitespace-nowrap">
                {activeNav}
              </h1>
            )}
          </div>

          {/* Right Controls in ONE SINGLE LINE (flex-nowrap) */}
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            {/* Filter Pills */}
            <div className="flex items-center gap-0.5 bg-surface-1 p-0.5 rounded-lg border border-hairline-soft flex-nowrap shrink-0">
              {[
                { id: 'All', label: 'All' },
                { id: 'Announcement', label: '📢 Announcements' },
                { id: 'Update', label: '💡 Updates' },
                { id: 'Question', label: '❓ Questions' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${activeTab === tab.id
                    ? 'bg-surface text-brand shadow-xs font-black'
                    : 'text-ink-muted hover:text-ink'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-32 sm:w-36 lg:w-44 shrink-0">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle text-[11px]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchText}
                onChange={e => handlePostSearch(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 bg-surface border border-hairline rounded-lg text-[11px] font-semibold focus:ring-2 ring-brand/20 outline-none"
              />
            </div>

            {/* Sort Dropdown & Refresh */}
            <div className="flex items-center gap-1 shrink-0">
              <FilterDropdown
                label="Sort Order"
                value={sortOrder}
                onChange={(val) => setSortOrder(val || '-createdAt')}
                options={[
                  { value: '-createdAt', label: 'Newest First' },
                  { value: 'createdAt', label: 'Oldest First' },
                ]}
                searchable={false}
                type="default"
                className="!min-w-[125px] !py-1 !text-[11px]"
              />
              <button
                onClick={() => { fetchPosts(); toast.success("Refreshed!"); }}
                className="p-1.5 rounded-md bg-surface hover:bg-surface-1 border border-hairline text-ink-subtle hover:text-brand transition-colors cursor-pointer shrink-0"
                title="Refresh feed"
              >
                <FiRefreshCw className={`text-xs ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        <div className="lg:hidden bg-surface px-4 py-2 border-b border-hairline-soft overflow-x-auto scrollbar-hide">
          <div className="lmx-tab-bar !mb-0 min-w-max">
            {['All', 'Update', 'Announcement', 'Question'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={activeTab === tab ? 'lmx-tab-active' : 'lmx-tab'}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* FEED AREA */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex p-3 md:p-4 gap-4">
            {/* Main Feed Column */}
            <div className="flex-1 min-w-0 space-y-3">
              <JarvisFeedSummarizer posts={posts} />

              <FeedComposer
                user={user}
                expanded={isComposerExpanded}
                onExpand={() => setIsComposerExpanded(true)}
                onCollapse={() => setIsComposerExpanded(false)}
                postType={postType}
                setPostType={setPostType}
                postSubject={postSubject}
                setPostSubject={setPostSubject}
                postContent={postContent}
                onContentChange={handleContentChange}
                targetType={targetType}
                setTargetType={setTargetType}
                targetId={targetId}
                setTargetId={setTargetId}
                groups={groups}
                channels={channels}
                expiryDays={expiryDays}
                setExpiryDays={setExpiryDays}
                onSubmit={handleCreatePost}
                onSaveDraft={handleSaveDraft}
                loading={loading}
                showMentions={showMentions}
                mentionList={mentionList}
                onSelectMention={handleSelectMention}
                pollOptions={pollOptions}
                setPollOptions={setPollOptions}
              />

              {/* POSTS LIST */}
              <div className="space-y-4">
                {loading && posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <FiLoader className="animate-spin text-3xl text-[var(--module-accent)]" />
                    <span className="text-sm text-ink-muted">Loading posts...</span>
                  </div>
                ) : filteredPosts.length > 0 ? (
                  filteredPosts.map(post => <PostCard key={post._id} post={post} onRefresh={fetchPosts} onEditDraft={handleEditDraft} />)
                ) : (
                  <div className="text-center py-16 tracker-card-plain border-dashed">
                    <MdOutlineDynamicFeed className="text-5xl text-ink-subtle mx-auto mb-3 opacity-40" />
                    <p className="text-ink-muted font-medium">No posts found</p>
                    <p className="text-ink-subtle text-sm mt-1">Be the first to share something!</p>
                  </div>
                )}
              </div>
            </div>

            <div className="hidden xl:block w-64 shrink-0">
              <div className="tracker-card-plain sticky top-6 overflow-hidden">
                <div
                  className="p-3 border-b border-hairline-soft flex items-center justify-between cursor-pointer hover:bg-surface-1 transition-colors"
                  onClick={() => setAnnouncementsExpanded(!announcementsExpanded)}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-ink">
                    <MdOutlineCampaign className="text-amber-500 text-lg" />
                    Announcements
                  </div>
                  <div className="flex items-center gap-2">
                    {announcements.length > 0 && (
                      <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{announcements.length}</span>
                    )}
                    {announcementsExpanded ? <FiChevronDown className="text-ink-subtle text-sm" /> : <FiChevronRight className="text-ink-subtle text-sm" />}
                  </div>
                </div>
                <div className={`overflow-hidden transition-all duration-300 ${announcementsExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-3 space-y-2 max-h-[460px] overflow-y-auto scrollbar-hide">
                    {announcements.length > 0 ? (
                      announcements.slice(0, 10).map(ann => (
                        <div key={ann._id} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs hover:shadow-sm transition-shadow cursor-pointer">
                          <div className="font-semibold text-amber-800 dark:text-amber-300 mb-0.5 text-[11px]">{ann.subject || 'Announcement'}</div>
                          <div className="text-ink-muted line-clamp-2 text-[10px] leading-relaxed" dangerouslySetInnerHTML={{ __html: ann.content }} />
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-[10px] text-ink-subtle">
                              {ann.author?.basicInfo?.firstName} · {dayjs(ann.createdAt).fromNow()}
                            </span>
                            {ann.expiryDate && (
                              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">
                                {dayjs(ann.expiryDate).diff(dayjs(), 'day')} days left
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center text-ink-subtle text-sm py-8 text-center gap-2">
                        <MdOutlineCampaign className="text-4xl opacity-30" />
                        <span>No announcements yet</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showGroupModal} onClose={() => setShowGroupModal(false)} maxWidth="sm" fullWidth>
        <div className="p-6 bg-surface text-ink">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-ink">{editGroupId ? 'Edit Group' : 'Create New Group'}</h3>
            <button type="button" className="tracker-btn-ghost !p-1" onClick={() => setShowGroupModal(false)}>
              <FiX className="text-lg" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Group Name</label>
              <input
                type="text"
                value={newGroup.name}
                onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                className="lmx-input"
                placeholder="e.g. Project Alpha Team"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Description</label>
              <textarea
                value={newGroup.description}
                onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                className="lmx-input resize-none"
                placeholder="Optional description"
                rows="3"
              />
              <MemberSelect
                employees={employees}
                selectedMembers={newGroup.members}
                onChange={m => setNewGroup({ ...newGroup, members: m })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowGroupModal(false)} className="tracker-btn-secondary">Cancel</button>
              <button type="button" onClick={handleCreateGroup} className="tracker-btn-brand flex items-center gap-2">
                {loading && <FiLoader className="animate-spin" />} {editGroupId ? 'Save Changes' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog open={showChannelModal} onClose={() => setShowChannelModal(false)} maxWidth="sm" fullWidth>
        <div className="p-6 bg-surface text-ink">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-ink">{editChannelId ? 'Edit Channel' : 'Create New Channel'}</h3>
            <button type="button" className="tracker-btn-ghost !p-1" onClick={() => setShowChannelModal(false)}>
              <FiX className="text-lg" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Channel Name</label>
              <input
                type="text"
                value={newChannel.name}
                onChange={e => setNewChannel({ ...newChannel, name: e.target.value })}
                className="lmx-input"
                placeholder="e.g. General Announcements"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Description</label>
              <textarea
                value={newChannel.description}
                onChange={e => setNewChannel({ ...newChannel, description: e.target.value })}
                className="lmx-input resize-none"
                placeholder="Optional description"
                rows="3"
              />
              <MemberSelect
                employees={employees}
                selectedMembers={newChannel.members}
                onChange={m => setNewChannel({ ...newChannel, members: m })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowChannelModal(false)} className="tracker-btn-secondary">Cancel</button>
              <button type="button" onClick={handleCreateChannel} className="tracker-btn-brand flex items-center gap-2">
                {loading && <FiLoader className="animate-spin" />} {editChannelId ? 'Save Changes' : 'Create Channel'}
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function NavItem({ icon, label, active, badge, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-1.5 mx-1 my-0.5 rounded-lg cursor-pointer transition-all duration-200 ${active
        ? 'bg-[var(--module-accent)] text-white shadow-sm'
        : 'hover:bg-surface-1 text-ink-muted hover:text-ink'
        }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`text-[15px] ${active ? 'text-white/90' : 'text-ink-subtle'}`}>{icon}</span>
        <span className={`text-[12px] ${active ? 'font-semibold tracking-wide' : 'font-medium'}`}>{label}</span>
      </div>
      {badge && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-[var(--module-accent-light)] text-[var(--module-accent)]'}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

function MemberSelect({ employees, selectedMembers, onChange }) {
  const [search, setSearch] = useState('');

  const handleSelectAll = () => {
    if (selectedMembers.length === employees.length) {
      onChange([]);
    } else {
      onChange(employees.map(e => e._id));
    }
  };

  const handleToggleMember = (id) => {
    if (selectedMembers.includes(id)) {
      onChange(selectedMembers.filter(m => m !== id));
    } else {
      onChange([...selectedMembers, id]);
    }
  };

  const filtered = employees.filter(emp => {
    if (!search) return true;
    const name = `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="border border-hairline rounded-tracker-md overflow-hidden flex flex-col mt-4 bg-surface">
      <div className="bg-surface-1 px-3 py-2 flex items-center justify-between border-b border-hairline">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink">
          <input
            type="checkbox"
            checked={employees.length > 0 && selectedMembers.length === employees.length}
            onChange={handleSelectAll}
            className="rounded text-[var(--module-accent)] focus:ring-[var(--module-accent)] cursor-pointer"
          />
          Select All Employees
        </label>
        <span className="text-[10px] text-ink-muted font-bold bg-surface-2 px-2 py-0.5 rounded-md">
          {selectedMembers.length} selected
        </span>
      </div>
      <div className="p-2 border-b border-hairline-soft bg-surface">
        <div className="relative">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle text-xs" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="lmx-input pl-7 py-1.5 text-xs"
          />
        </div>
      </div>
      <div className="max-h-40 overflow-y-auto bg-surface p-1.5 space-y-0.5 scrollbar-hide">
        {filtered.map(emp => (
          <label key={emp._id} className="flex items-center gap-3 p-1.5 hover:bg-surface-1 rounded-md cursor-pointer transition-colors group">
            <input
              type="checkbox"
              checked={selectedMembers.includes(emp._id)}
              onChange={() => handleToggleMember(emp._id)}
              className="rounded border-hairline text-[var(--module-accent)] focus:ring-[var(--module-accent)] cursor-pointer ml-0.5"
            />
            <ProfileImage
              profileImage={emp.basicInfo?.profileImage}
              firstName={emp.basicInfo?.firstName}
              lastName={emp.basicInfo?.lastName}
              size="xs"
              className="!w-6 !h-6 shadow-sm ring-1 ring-hairline-soft"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-ink group-hover:text-[var(--module-accent)] transition-colors truncate">
                {emp.basicInfo?.firstName} {emp.basicInfo?.lastName}
              </span>
              <span className="text-[9px] text-ink-subtle truncate">
                {(() => {
                  const d = emp.professionalInfo?.designation;
                  if (!d) return 'Member';
                  if (typeof d === 'string') return d;
                  return d.title || d.name || 'Member';
                })()}
              </span>
            </div>
          </label>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-5 text-xs text-ink-subtle italic flex flex-col items-center gap-2">
            <FiUsers className="text-xl opacity-40" />
            No employees found
          </div>
        )}
      </div>
    </div>
  );
}
