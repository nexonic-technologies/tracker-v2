import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../context/authProvider";
import { socketService } from "../services/socketService";
import PageLoader from "../components/Common/PageLoader";
import ProfileImage from "../components/Common/ProfileImage";
import AudioMessagePlayer from "../components/Messages/AudioMessagePlayer";
import VoiceRecorderBar from "../components/Messages/VoiceRecorderBar";
import ForwardMessageModal from "../components/Messages/ForwardMessageModal";
import ImageLightboxModal from "../components/Messages/ImageLightboxModal";
import {
  MessageSquare, Search, Send, User, Clock, CheckCircle, Coffee,
  Paperclip, Image as ImageIcon, Smile, Circle, Mic, CornerUpLeft,
  Copy, Forward, Trash2, X, Download, FileText, Check, File,
  Reply, Sparkles
} from "lucide-react";
import toast from "react-hot-toast";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // Strict 5 MB file size limit
const EMOJI_REACTIONS = ["👍", "❤️", "😂", "🚀", "🎉"];

export default function Messages() {
  const [searchParams] = useSearchParams();
  const targetChatUserId = searchParams.get("chat");

  const [employees, setEmployees] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);

  // Messaging & conversation state
  const [messageText, setMessageText] = useState("");
  const [chats, setChats] = useState({}); // { memberId: [ messageObjects ] }
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Advanced features state
  const [replyingTo, setReplyingTo] = useState(null); // Message object being replied to
  const [stagingFiles, setStagingFiles] = useState([]); // [{ file, previewUrl, type, name, size }]
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // 1. Fetch active employees
      const empRes = await axiosInstance.post('/populate/read/employees', {
        limit: 1000,
        filter: { status: "Active" },
        populateFields: {
          "professionalInfo.department": "name",
          "professionalInfo.designation": "title"
        }
      });
      const emps = (empRes.data?.data || []).filter(e => e._id !== user?.id);
      setEmployees(emps);

      // 2. Fetch today's attendances for live check-in presence
      const todayStr = new Date().toISOString().split('T')[0];
      try {
        const attRes = await axiosInstance.post('/populate/read/attendances', {
          filter: {
            date: {
              $gte: `${todayStr}T00:00:00.000Z`,
              $lte: `${todayStr}T23:59:59.999Z`
            }
          },
          limit: 1000
        });
        setAttendances(attRes.data?.data || []);
      } catch (_) { }

      // 3. Fetch active connected online users
      try {
        const activeRes = await axiosInstance.get('/auth/active-users');
        if (activeRes.data?.onlineUserIds) {
          setOnlineUserIds(new Set(activeRes.data.onlineUserIds));
        }
      } catch (_) { }

      // 4. Select target member if specified in URL query
      if (targetChatUserId) {
        const target = emps.find(e => e._id === targetChatUserId);
        if (target) setSelectedMember(target);
      } else if (emps.length > 0) {
        setSelectedMember(emps[0]);
      }

    } catch (err) {
      console.error("Error loading chat data:", err);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  // Determine current live check-in presence for an employee
  const getPresenceStatus = useCallback((empId) => {
    const att = attendances.find(a => {
      const aEmpId = (a.employee?._id || a.employee || a.employeeId?._id || a.employeeId)?.toString();
      return aEmpId === empId?.toString();
    });

    if (!att || !att.checkIn) {
      if (att?.status === "Leave") {
        return { label: "On Leave", color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800", dot: "bg-purple-500" };
      }
      return { label: "Absent", color: "bg-slate-100 text-slate-500 dark:bg-slate-800", dot: "bg-slate-400" };
    }

    if (att.checkOut) {
      return { label: "Checked Out", color: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800", dot: "bg-amber-500" };
    }
    if (att.status === "On Break") {
      return { label: "On Break", color: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800", dot: "bg-orange-500" };
    }
    return { label: "Present", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" };
  }, [attendances]);

  // Listen for real-time incoming chat messages
  useEffect(() => {
    const unsub = socketService.on('chat_message', (data) => {
      if (!data || !user?.id) return;
      const senderId = (data.sender?._id || data.sender)?.toString();
      if (!senderId || senderId === user.id) return;

      const newMsg = {
        _id: data._id,
        sender: "them",
        rawSender: data.sender,
        text: data.message,
        type: data.type || 'text',
        attachments: data.attachments || [],
        replyTo: data.replyTo,
        reactions: data.reactions || [],
        time: new Date(data.createdAt || data.sentAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: data.status || 'sent'
      };

      setChats(prev => ({
        ...prev,
        [senderId]: [...(prev[senderId] || []), newMsg]
      }));

      scrollToBottom();
    });

    return () => unsub();
  }, [user?.id]);

  // Fetch chat history when selected member changes
  useEffect(() => {
    if (!selectedMember || !user?.id) return;
    const memberId = selectedMember._id;
    const conversationId = [user.id, memberId].sort().join('_');

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await axiosInstance.post('/populate/read/team_messages', {
          filter: { conversationId },
          populateFields: {
            replyTo: 'message,sender,type,attachments',
            'replyTo.sender': 'basicInfo.firstName,basicInfo.lastName,name'
          },
          sort: { createdAt: 1 },
          limit: 300
        });
        if (res.data?.data) {
          const formatted = res.data.data.map(m => ({
            _id: m._id,
            sender: (m.sender?._id || m.sender) === user.id ? "me" : "them",
            rawSender: m.sender,
            text: m.message,
            type: m.type || 'text',
            attachments: m.attachments || [],
            replyTo: m.replyTo,
            reactions: m.reactions || [],
            time: new Date(m.createdAt || m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: m.status
          }));
          setChats(prev => ({ ...prev, [memberId]: formatted }));
        }
      } catch (err) {
        console.error("Failed to fetch conversation history:", err);
      } finally {
        setLoadingHistory(false);
        scrollToBottom();
      }
    };

    fetchHistory();
    setReplyingTo(null);
    setStagingFiles([]);
  }, [selectedMember, user?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // ── File Selection & < 5MB Validation ──────────────────────────────────────
  const handleFilesSelected = (filesList) => {
    const files = Array.from(filesList);
    const validStaging = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`);
        continue;
      }

      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      const previewUrl = isImage ? URL.createObjectURL(file) : null;

      validStaging.push({
        file,
        previewUrl,
        type: isImage ? 'image' : isAudio ? 'audio' : 'file',
        name: file.name,
        size: file.size,
        sizeFormatted: formatBytes(file.size)
      });
    }

    if (validStaging.length > 0) {
      setStagingFiles(prev => [...prev, ...validStaging]);
    }
  };

  const removeStagingFile = (idx) => {
    setStagingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // ── Send Message (Text / Attachments / Replies) ────────────────────────────
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!messageText.trim() && stagingFiles.length === 0) || !selectedMember || !user?.id) return;

    const memberId = selectedMember._id;
    const conversationId = [user.id, memberId].sort().join('_');
    const textToSend = messageText.trim();
    const currentReplyTo = replyingTo;
    const filesToUpload = [...stagingFiles];

    // Clear input state immediately for snappy UX
    setMessageText("");
    setReplyingTo(null);
    setStagingFiles([]);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      sender: "me",
      text: textToSend || (filesToUpload.length > 0 ? (filesToUpload[0].type === 'image' ? 'Sent an image' : 'Sent an attachment') : ''),
      type: filesToUpload.length > 0 ? filesToUpload[0].type : 'text',
      attachments: filesToUpload.map(f => ({
        type: f.type,
        name: f.name,
        url: f.previewUrl || '',
        size: f.size
      })),
      replyTo: currentReplyTo,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sending"
    };

    setChats(prev => ({
      ...prev,
      [memberId]: [...(prev[memberId] || []), optimisticMsg]
    }));
    scrollToBottom();

    try {
      if (filesToUpload.length > 0) {
        // Send multipart form data with attachments
        const fd = new FormData();
        fd.append('conversationId', conversationId);
        fd.append('sender', user.id);
        fd.append('recipient', memberId);
        fd.append('message', textToSend || (filesToUpload[0].type === 'image' ? 'Photo' : filesToUpload[0].name));
        fd.append('type', filesToUpload[0].type);
        fd.append('status', 'sent');
        fd.append('sentAt', new Date().toISOString());
        if (currentReplyTo?._id) {
          fd.append('replyTo', currentReplyTo._id);
        }

        filesToUpload.forEach(f => {
          fd.append('attachments', f.file);
        });

        const res = await axiosInstance.post('/populate/create/team_messages', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data?.data) {
          // Update temp message with real backend ID
          setChats(prev => ({
            ...prev,
            [memberId]: prev[memberId].map(m => m._id === tempId ? {
              ...m,
              _id: res.data.data._id,
              attachments: res.data.data.attachments || m.attachments,
              status: 'sent'
            } : m)
          }));
        }
      } else {
        // Simple text message
        const res = await axiosInstance.post('/populate/create/team_messages', {
          conversationId,
          sender: user.id,
          recipient: memberId,
          message: textToSend,
          type: 'text',
          replyTo: currentReplyTo?._id || undefined,
          status: 'sent',
          sentAt: new Date().toISOString()
        });

        if (res.data?.data) {
          setChats(prev => ({
            ...prev,
            [memberId]: prev[memberId].map(m => m._id === tempId ? {
              ...m,
              _id: res.data.data._id,
              status: 'sent'
            } : m)
          }));
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
      setChats(prev => ({
        ...prev,
        [memberId]: prev[memberId].map(m => m._id === tempId ? { ...m, status: 'failed' } : m)
      }));
    }
  };

  // ── Voice Note Sender ──────────────────────────────────────────────────────
  const handleSendVoiceNote = async (audioBlob, durationSec) => {
    if (!selectedMember || !user?.id) return;
    setIsRecordingVoice(false);

    const memberId = selectedMember._id;
    const conversationId = [user.id, memberId].sort().join('_');
    const audioFile = new window.File([audioBlob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });

    const tempUrl = URL.createObjectURL(audioBlob);
    const tempId = `temp-voice-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      sender: "me",
      text: "Voice message",
      type: "voice",
      attachments: [{
        type: "audio",
        name: "Voice note",
        url: tempUrl,
        size: audioBlob.size,
        duration: durationSec
      }],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sending"
    };

    setChats(prev => ({
      ...prev,
      [memberId]: [...(prev[memberId] || []), optimisticMsg]
    }));
    scrollToBottom();

    try {
      const fd = new FormData();
      fd.append('conversationId', conversationId);
      fd.append('sender', user.id);
      fd.append('recipient', memberId);
      fd.append('message', 'Voice message');
      fd.append('type', 'voice');
      fd.append('status', 'sent');
      fd.append('sentAt', new Date().toISOString());
      fd.append('attachments', audioFile);

      const res = await axiosInstance.post('/populate/create/team_messages', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.data) {
        setChats(prev => ({
          ...prev,
          [memberId]: prev[memberId].map(m => m._id === tempId ? {
            ...m,
            _id: res.data.data._id,
            attachments: res.data.data.attachments || m.attachments,
            status: 'sent'
          } : m)
        }));
      }
    } catch (err) {
      console.error("Failed to send voice note:", err);
      toast.error("Failed to send voice note");
    }
  };

  // ── Quick Actions: Copy, Double Click Reply, Reaction, Forward ─────────────
  const handleCopyText = (msg) => {
    if (!msg.text) return;
    navigator.clipboard.writeText(msg.text);
    setCopiedMessageId(msg._id);
    toast.success("Text copied to clipboard");
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleStartReply = (msg) => {
    setReplyingTo(msg);
    messageInputRef.current?.focus();
  };

  const handleToggleReaction = async (msg, emoji) => {
    if (!msg._id || msg._id.startsWith('temp-')) return;
    const memberId = selectedMember._id;

    try {
      const currentReactions = msg.reactions || [];
      const userReactionIndex = currentReactions.findIndex(r => (r.user?._id || r.user) === user.id && r.emoji === emoji);

      let updatedReactions;
      if (userReactionIndex > -1) {
        updatedReactions = currentReactions.filter((_, i) => i !== userReactionIndex);
      } else {
        updatedReactions = [...currentReactions, { emoji, user: user.id }];
      }

      setChats(prev => ({
        ...prev,
        [memberId]: prev[memberId].map(m => m._id === msg._id ? { ...m, reactions: updatedReactions } : m)
      }));

      await axiosInstance.put(`/populate/update/team_messages/${msg._id}`, {
        reactions: updatedReactions
      });
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  const handleForwardMessages = async (recipientIds, msgToForward) => {
    try {
      for (const recId of recipientIds) {
        const conversationId = [user.id, recId].sort().join('_');
        await axiosInstance.post('/populate/create/team_messages', {
          conversationId,
          sender: user.id,
          recipient: recId,
          message: msgToForward.text || 'Forwarded message',
          type: msgToForward.type || 'text',
          attachments: msgToForward.attachments || [],
          status: 'sent',
          sentAt: new Date().toISOString()
        });
      }
      toast.success(`Message forwarded to ${recipientIds.length} colleague${recipientIds.length > 1 ? 's' : ''}`);
    } catch (err) {
      console.error("Failed to forward message:", err);
      toast.error("Failed to forward message");
    }
  };

  const scrollToMessage = (msgId) => {
    if (!msgId) return;
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-indigo-400', 'bg-indigo-50/50');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-indigo-400', 'bg-indigo-50/50');
      }, 1500);
    }
  };

  // ── Drag and Drop Over Handlers ───────────────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer?.files?.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(emp => {
      const name = `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.toLowerCase();
      const dept = emp.professionalInfo?.department?.name?.toLowerCase() || '';
      return name.includes(q) || dept.includes(q);
    });
  }, [employees, searchQuery]);

  if (loading) return <PageLoader />;

  const currentMessages = selectedMember ? (chats[selectedMember._id] || []) : [];

  return (
    <div className="h-[calc(100vh-var(--topbar-height,56px)-28px)] max-h-[calc(100vh-var(--topbar-height,56px)-28px)] flex flex-col text-ink overflow-hidden" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      {/* Page Eyebrow and Title */}
      <div className="mb-2 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="lmx-page-eyebrow text-[9px] mb-0.2">COMMUNICATION</p>
          <h1 className="text-base font-bold text-ink flex items-center gap-1.5 tracking-tight">
            <MessageSquare className="h-4 w-4 text-indigo-500" />
            Direct Messages & Chat
          </h1>
        </div>
      </div>

      {/* Main Chat Shell */}
      <div className="flex-1 bg-surface border border-hairline rounded-tracker-md overflow-hidden flex shadow-2xs min-h-0">

        {/* Left Contacts Sidebar */}
        <div className="w-64 sm:w-72 border-r border-hairline flex flex-col bg-surface flex-shrink-0">
          {/* Search Contacts */}
          <div className="p-2 border-b border-hairline">
            <div className="flex items-center gap-1.5 border border-hairline rounded-tracker-md px-2.5 bg-surface-1">
              <Search className="h-3 w-3 text-ink-subtle flex-shrink-0" />
              <input
                type="text"
                placeholder="Search colleagues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[11px] py-1.5 outline-none text-ink placeholder:text-ink-subtle"
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto divide-y divide-hairline-soft">
            {filteredEmployees.length === 0 ? (
              <div className="p-4 text-center text-[11px] text-ink-subtle">
                No team members found.
              </div>
            ) : (
              filteredEmployees.map(emp => {
                const isSelected = selectedMember?._id === emp._id;
                const presence = getPresenceStatus(emp._id);
                const empName = `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim() || 'Team Member';
                const empTitle = emp.professionalInfo?.designation?.title || emp.professionalInfo?.department?.name || 'Staff';

                return (
                  <button
                    key={emp._id}
                    onClick={() => setSelectedMember(emp)}
                    className={`w-full p-2 px-2.5 flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-l-3 border-indigo-500"
                        : "hover:bg-surface-1"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <ProfileImage
                        profileImage={emp.basicInfo?.profileImage}
                        firstName={emp.basicInfo?.firstName}
                        lastName={emp.basicInfo?.lastName}
                        size="xs"
                      />
                      <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-surface ${presence.dot || "bg-slate-400"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-[11px] font-semibold truncate ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-ink"}`}>
                          {empName}
                        </p>
                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full ${presence.color}`}>
                          {presence.label}
                        </span>
                      </div>
                      <p className="text-[9px] text-ink-subtle truncate mt-0.2">{empTitle}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Chat Pane */}
        {selectedMember ? (
          <div
            className="flex-1 flex flex-col bg-surface-1 min-w-0 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag & Drop Overlay */}
            {isDraggingOver && (
              <div className="absolute inset-0 z-40 bg-indigo-500/10 backdrop-blur-xs border-2 border-dashed border-indigo-500 flex flex-col items-center justify-center pointer-events-none">
                <Paperclip size={28} className="text-indigo-600 animate-bounce mb-1" />
                <p className="text-xs font-bold text-indigo-700">Drop files here to send</p>
                <p className="text-[10px] text-indigo-600/80">Max 5MB per file</p>
              </div>
            )}

            {/* Header */}
            <div className="p-2 px-3.5 bg-surface border-b border-hairline flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <ProfileImage
                    profileImage={selectedMember.basicInfo?.profileImage}
                    firstName={selectedMember.basicInfo?.firstName}
                    lastName={selectedMember.basicInfo?.lastName}
                    size="xs"
                  />
                  <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-surface ${getPresenceStatus(selectedMember._id).dot || "bg-slate-400"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-ink">
                      {selectedMember.basicInfo?.firstName} {selectedMember.basicInfo?.lastName}
                    </h3>
                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full ${getPresenceStatus(selectedMember._id).color}`}>
                      {getPresenceStatus(selectedMember._id).label}
                    </span>
                  </div>
                  <p className="text-[9px] text-ink-subtle">
                    {selectedMember.professionalInfo?.designation?.title || "Staff"} · {selectedMember.professionalInfo?.department?.name || "Team"}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-3 overflow-y-auto min-h-0 flex flex-col">
              {loadingHistory ? (
                <div className="flex items-center justify-center h-full my-auto">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full my-auto text-ink-subtle">
                  <MessageSquare className="h-6 w-6 text-indigo-400 mb-1.5 opacity-50" />
                  <p className="text-[11px] font-medium">No messages yet with {selectedMember.basicInfo?.firstName}.</p>
                  <p className="text-[10px] text-ink-subtle mt-0.5">Double-click any message to reply, or drag and drop files under 5MB.</p>
                </div>
              ) : (
                <div className="mt-auto space-y-2 flex flex-col justify-end">
                  {currentMessages.map((msg) => {
                    const isMe = msg.sender === "me";
                    const isHovered = hoveredMessageId === msg._id;

                  return (
                    <div
                      key={msg._id || msg.time}
                      id={`msg-${msg._id}`}
                      onMouseEnter={() => setHoveredMessageId(msg._id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                      onDoubleClick={() => handleStartReply(msg)}
                      className={`group relative flex flex-col transition-all ${isMe ? "items-end" : "items-start"}`}
                    >
                      {/* Quoted Reply Snippet inside Message Bubble */}
                      <div className="relative max-w-[72%]">

                        {/* Floating Quick Action Bar (Google Chat Style) */}
                        {isHovered && (
                          <div className={`absolute -top-6 ${isMe ? "right-1" : "left-1"} z-20 flex items-center gap-0.5 bg-surface/95 backdrop-blur-md border border-hairline rounded-full px-1.5 py-0.5 shadow-sm animate-fade-in`}>
                            {/* Quick Reactions */}
                            {EMOJI_REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg, emoji)}
                                className="p-0.5 hover:scale-125 text-[11px] transition-transform cursor-pointer"
                                title={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                            <div className="h-2.5 w-px bg-hairline mx-0.5" />
                            {/* Reply Action */}
                            <button
                              type="button"
                              onClick={() => handleStartReply(msg)}
                              className="p-0.5 hover:bg-surface-2 text-ink-muted hover:text-indigo-600 rounded-full transition-colors cursor-pointer"
                              title="Reply (Double click)"
                            >
                              <CornerUpLeft size={11} />
                            </button>
                            {/* Copy Action */}
                            <button
                              type="button"
                              onClick={() => handleCopyText(msg)}
                              className="p-0.5 hover:bg-surface-2 text-ink-muted hover:text-indigo-600 rounded-full transition-colors cursor-pointer"
                              title="Copy text"
                            >
                              {copiedMessageId === msg._id ? <Check size={11} className="text-emerald-500 stroke-[3]" /> : <Copy size={11} />}
                            </button>
                            {/* Forward Action */}
                            <button
                              type="button"
                              onClick={() => setForwardingMessage(msg)}
                              className="p-0.5 hover:bg-surface-2 text-ink-muted hover:text-indigo-600 rounded-full transition-colors cursor-pointer"
                              title="Forward message"
                            >
                              <Forward size={11} />
                            </button>
                          </div>
                        )}

                        <div className={`px-3 py-1.5 rounded-xl text-[11.5px] leading-snug transition-shadow ${
                          isMe
                            ? "bg-indigo-600 text-white rounded-br-none shadow-2xs"
                            : "bg-surface border border-hairline text-ink rounded-bl-none shadow-2xs"
                        }`}>

                          {/* Quoted Message Reference */}
                          {msg.replyTo && (
                            <div
                              onClick={() => scrollToMessage(msg.replyTo._id || msg.replyTo)}
                              className={`mb-1.5 p-1.5 rounded-md border-l-2 text-[10px] cursor-pointer transition-opacity hover:opacity-90 ${
                                isMe
                                  ? "bg-indigo-700/50 border-white/60 text-white/90"
                                  : "bg-surface-2 border-indigo-500 text-ink-muted"
                              }`}
                            >
                              <span className="font-bold text-[9px] block opacity-90">
                                {msg.replyTo.sender?.basicInfo?.firstName || 'Colleague'}
                              </span>
                              <p className="truncate line-clamp-1 italic">
                                {msg.replyTo.message || '[Attachment]'}
                              </p>
                            </div>
                          )}

                          {/* Render Voice Note Player */}
                          {msg.type === 'voice' && msg.attachments?.[0] ? (
                            <AudioMessagePlayer
                              src={msg.attachments[0].url}
                              duration={msg.attachments[0].duration || 0}
                              isMe={isMe}
                            />
                          ) : null}

                          {/* Render Image Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && msg.type !== 'voice' && (
                            <div className="space-y-1.5 mb-1">
                              {msg.attachments.map((att, attIdx) => {
                                const isImg = att.type === 'image' || att.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                if (isImg) {
                                  return (
                                    <div
                                      key={attIdx}
                                      onClick={() => setLightboxImage(att.url)}
                                      className="relative rounded-lg overflow-hidden cursor-pointer group/img max-w-[220px]"
                                    >
                                      <img
                                        src={att.url}
                                        alt={att.name || "Attachment"}
                                        className="w-full h-auto max-h-48 object-cover rounded-lg transition-transform group-hover/img:scale-102"
                                      />
                                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
                                        Click to expand
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <a
                                    key={attIdx}
                                    href={att.url}
                                    download={att.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-1.5 rounded-lg border transition-colors ${
                                      isMe
                                        ? "bg-indigo-700/60 border-white/20 text-white hover:bg-indigo-700/80"
                                        : "bg-surface-1 border-hairline text-ink hover:bg-surface-2"
                                    }`}
                                  >
                                    <FileText size={14} className="flex-shrink-0" />
                                    <div className="flex-1 min-w-0 text-left">
                                      <p className="font-semibold truncate text-[10px]">{att.name || "Document"}</p>
                                      {att.size && (
                                        <p className="text-[8px] opacity-75">{formatBytes(att.size)}</p>
                                      )}
                                    </div>
                                    <Download size={12} className="flex-shrink-0 opacity-80 hover:opacity-100" />
                                  </a>
                                );
                              })}
                            </div>
                          )}

                          {/* Message Text */}
                          {msg.text && (
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          )}
                        </div>
                      </div>

                      {/* Reaction Badges */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5 px-0.5">
                          {Object.entries(
                            msg.reactions.reduce((acc, r) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([emoji, count]) => (
                            <span
                              key={emoji}
                              onClick={() => handleToggleReaction(msg, emoji)}
                              className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[9px] bg-surface border border-hairline cursor-pointer hover:bg-surface-2 shadow-2xs"
                            >
                              <span>{emoji}</span>
                              <span className="font-bold text-ink-muted">{count}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Time and Delivery Status */}
                      <div className="flex items-center gap-1 text-[8px] text-ink-subtle mt-0.2 px-0.5">
                        <span>{msg.time}</span>
                        {isMe && (
                          <span>
                            {msg.status === "sending" ? "· sending..." : msg.status === "failed" ? "· failed" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Staging Attachment Preview Strip */}
            {stagingFiles.length > 0 && (
              <div className="p-1.5 px-3 bg-surface border-t border-hairline flex items-center gap-1.5 overflow-x-auto">
                {stagingFiles.map((sf, idx) => (
                  <div
                    key={idx}
                    className="relative flex items-center gap-1.5 bg-surface-1 border border-hairline rounded-lg p-1 pr-2 text-xs text-ink flex-shrink-0 animate-scale-in"
                  >
                    {sf.previewUrl ? (
                      <img src={sf.previewUrl} alt="" className="w-6 h-6 rounded-md object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                        <File size={12} />
                      </div>
                    )}
                    <div className="max-w-[100px]">
                      <p className="truncate text-[10px] font-semibold">{sf.name}</p>
                      <p className="text-[8px] text-ink-subtle">{sf.sizeFormatted}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStagingFile(idx)}
                      className="p-0.5 text-ink-muted hover:text-rose-600 rounded-full hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Replying To Banner Preview Strip */}
            {replyingTo && (
              <div className="p-1.5 px-3 bg-indigo-50/90 dark:bg-indigo-950/40 border-t border-indigo-200 dark:border-indigo-800 flex items-center justify-between animate-slide-in">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Reply size={12} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <div className="truncate text-xs">
                    <span className="font-bold text-[10px] text-indigo-700 dark:text-indigo-300">
                      Replying to {replyingTo.sender === "me" ? "yourself" : selectedMember.basicInfo?.firstName || "colleague"}
                    </span>
                    <p className="text-[9px] text-ink-muted truncate italic">
                      {replyingTo.text || "[Attachment]"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-0.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-1 transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Bottom Input Controls / Voice Recording Bar */}
            <div className="p-2 px-3 bg-surface border-t border-hairline flex-shrink-0">
              {isRecordingVoice ? (
                <VoiceRecorderBar
                  onSendAudio={handleSendVoiceNote}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              ) : (
                <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
                  {/* File Pickers (Hidden) */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.length > 0) handleFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                    multiple
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={(e) => {
                      if (e.target.files?.length > 0) handleFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />

                  {/* Attachment Paperclip Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-ink-muted hover:text-indigo-600 hover:bg-surface-1 rounded-full transition-colors cursor-pointer"
                    title="Attach file (< 5MB)"
                  >
                    <Paperclip size={14} />
                  </button>

                  {/* Image Picker Button */}
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="p-1.5 text-ink-muted hover:text-indigo-600 hover:bg-surface-1 rounded-full transition-colors cursor-pointer"
                    title="Send image (< 5MB)"
                  >
                    <ImageIcon size={14} />
                  </button>

                  {/* Text Input */}
                  <input
                    ref={messageInputRef}
                    type="text"
                    placeholder={`Message ${selectedMember.basicInfo?.firstName || 'colleague'} (double click to reply)...`}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 bg-surface-1 border border-hairline rounded-full px-3 py-1.5 text-[11.5px] text-ink outline-none focus:border-indigo-500 placeholder:text-ink-subtle"
                  />

                  {/* Voice Note Button */}
                  <button
                    type="button"
                    onClick={() => setIsRecordingVoice(true)}
                    className="p-1.5 text-ink-muted hover:text-indigo-600 hover:bg-surface-1 rounded-full transition-colors cursor-pointer"
                    title="Record voice note"
                  >
                    <Mic size={14} />
                  </button>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={!messageText.trim() && stagingFiles.length === 0}
                    className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition cursor-pointer flex-shrink-0 shadow-2xs"
                    title="Send message"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </form>
              )}
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-surface-1 text-ink-subtle p-4">
            <MessageSquare className="h-8 w-8 text-indigo-400 mb-2 opacity-40" />
            <p className="text-xs font-semibold">Select a conversation</p>
            <p className="text-[10px] text-ink-subtle mt-0.5">Choose a colleague from the sidebar to start chatting.</p>
          </div>
        )}
      </div>

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <ForwardMessageModal
          message={forwardingMessage}
          employees={employees}
          onlineUserIds={onlineUserIds}
          currentUserId={user?.id}
          onForward={handleForwardMessages}
          onClose={() => setForwardingMessage(null)}
        />
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <ImageLightboxModal
          src={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}
