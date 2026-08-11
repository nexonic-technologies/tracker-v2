import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../context/authProvider";
import { socketService } from "../services/socketService";
import PageLoader from "../components/Common/PageLoader";
import ProfileImage from "../components/Common/ProfileImage";
import {
  MessageSquare, Search, Send, User, Clock, CheckCircle, Coffee,
  Paperclip, Image as ImageIcon, Smile, Circle
} from "lucide-react";
import toast from "react-hot-toast";

export default function Messages() {
  const [searchParams] = useSearchParams();
  const targetChatUserId = searchParams.get("chat");

  const [employees, setEmployees] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);

  const [messageText, setMessageText] = useState("");
  const [chats, setChats] = useState({}); // { memberId: [ { sender, text, time, status } ] }
  const [loadingHistory, setLoadingHistory] = useState(false);

  const messagesEndRef = useRef(null);
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

      // 2. Fetch active connected online users
      try {
        const activeRes = await axiosInstance.get('/auth/active-users');
        if (activeRes.data?.onlineUserIds) {
          setOnlineUserIds(new Set(activeRes.data.onlineUserIds));
        }
      } catch (_) { }

      // 3. Select target member if specified in URL query
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

  // Listen for real-time incoming chat messages
  useEffect(() => {
    const unsub = socketService.on('chat_message', (data) => {
      if (!data || !user?.id) return;
      const senderId = (data.sender?._id || data.sender)?.toString();
      if (!senderId || senderId === user.id) return;

      const newMsg = {
        sender: "them",
        text: data.message,
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
          sort: { createdAt: 1 },
          limit: 200
        });
        if (res.data?.data) {
          const formatted = res.data.data.map(m => ({
            sender: (m.sender?._id || m.sender) === user.id ? "me" : "them",
            text: m.message,
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
  }, [selectedMember, user?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageText.trim() || !selectedMember || !user?.id) return;

    const memberId = selectedMember._id;
    const conversationId = [user.id, memberId].sort().join('_');
    const textToSend = messageText.trim();
    setMessageText("");

    const optimisticMsg = {
      sender: "me",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sending"
    };

    setChats(prev => ({
      ...prev,
      [memberId]: [...(prev[memberId] || []), optimisticMsg]
    }));
    scrollToBottom();

    try {
      await axiosInstance.post('/populate/create/team_messages', {
        conversationId,
        sender: user.id,
        recipient: memberId,
        message: textToSend,
        type: 'text',
        status: 'sent',
        sentAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
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
    <div className="h-[calc(100vh-80px)] flex flex-col p-4 sm:p-6 bg-canvas text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="lmx-page-eyebrow mb-0.5">COMMUNICATION</p>
          <h1 className="text-[20px] font-bold text-ink flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-indigo-500" />
            Direct Messages & Chat
          </h1>
        </div>
      </div>

      {/* Main Chat Shell */}
      <div className="flex-1 bg-surface border border-hairline rounded-tracker-lg overflow-hidden flex shadow-sm min-h-0">

        {/* Left Contacts Sidebar */}
        <div className="w-80 sm:w-80 border-r border-hairline flex flex-col bg-surface">
          {/* Search Contacts */}
          <div className="p-3 border-b border-hairline">
            <div className="flex items-center gap-2 border border-hairline rounded-tracker-md px-3 bg-surface-1">
              <Search className="h-3.5 w-3.5 text-ink-subtle flex-shrink-0" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs py-2 outline-none text-ink placeholder:text-ink-subtle"
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto divide-y divide-hairline-soft">
            {filteredEmployees.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-subtle">
                No team members found.
              </div>
            ) : (
              filteredEmployees.map(emp => {
                const isSelected = selectedMember?._id === emp._id;
                const isOnline = onlineUserIds.has(emp._id.toString());
                const empName = `${emp.basicInfo?.firstName || ''} ${emp.basicInfo?.lastName || ''}`.trim() || 'Team Member';
                const empTitle = emp.professionalInfo?.designation?.title || emp.professionalInfo?.department?.name || 'Staff';

                return (
                  <button
                    key={emp._id}
                    onClick={() => setSelectedMember(emp)}
                    className={`w-full p-3 flex items-center gap-3 text-left transition-all cursor-pointer ${isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/30 border-l-4 border-indigo-500"
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
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${isOnline ? "bg-emerald-500" : "bg-slate-400"
                        }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold truncate ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-ink"}`}>
                          {empName}
                        </p>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${isOnline ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                          }`}>
                          {isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-subtle truncate mt-0.5">{empTitle}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Chat Pane */}
        {selectedMember ? (
          <div className="flex-1 flex flex-col bg-surface-1 min-w-0">

            {/* Header */}
            <div className="p-3.5 px-4 bg-surface border-b border-hairline flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ProfileImage
                    profileImage={selectedMember.basicInfo?.profileImage}
                    firstName={selectedMember.basicInfo?.firstName}
                    lastName={selectedMember.basicInfo?.lastName}
                    size="xs"
                  />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${onlineUserIds.has(selectedMember._id.toString()) ? "bg-emerald-500" : "bg-slate-400"
                    }`} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ink">
                    {selectedMember.basicInfo?.firstName} {selectedMember.basicInfo?.lastName}
                  </h3>
                  <p className="text-[10px] text-ink-subtle">
                    {selectedMember.professionalInfo?.designation?.title || "Staff"} · {selectedMember.professionalInfo?.department?.name || "Team"}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
              {loadingHistory ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-ink-subtle">
                  <MessageSquare className="h-8 w-8 text-indigo-400 mb-2 opacity-50" />
                  <p className="text-xs font-medium">No messages yet with {selectedMember.basicInfo?.firstName}.</p>
                  <p className="text-[11px] text-ink-subtle mt-0.5">Send a friendly greeting to get started!</p>
                </div>
              ) : (
                currentMessages.map((msg, idx) => {
                  const isMe = msg.sender === "me";
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${isMe
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-surface border border-hairline text-ink rounded-bl-none shadow-2xs"
                        }`}>
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-ink-subtle mt-1 px-1">{msg.time}</span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-surface border-t border-hairline flex items-center gap-2 flex-shrink-0">
              <input
                type="text"
                placeholder={`Type a message to ${selectedMember.basicInfo?.firstName || 'colleague'}...`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 bg-surface-1 border border-hairline rounded-tracker-pill px-4 py-2 text-xs text-ink outline-none focus:border-indigo-500 placeholder:text-ink-subtle"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition cursor-pointer flex-shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-surface-1 text-ink-subtle p-6">
            <MessageSquare className="h-10 w-10 text-indigo-400 mb-3 opacity-40" />
            <p className="text-sm font-semibold">Select a conversation</p>
            <p className="text-xs text-ink-subtle mt-1">Choose a team member from the sidebar to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
