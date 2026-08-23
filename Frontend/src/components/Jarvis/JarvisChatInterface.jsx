import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Zap,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Plus,
  Trash2,
  MessageSquare,
  Search,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Flame,
} from "lucide-react";
import api from "../../api/axiosInstance";

export default function JarvisChatInterface({ activeMode = "full" }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [focalTopic, setFocalTopic] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [messages, setMessages] = useState([
    {
      id: "init",
      sender: "jarvis",
      text: "Good day, sir. J.A.R.V.I.S. neuro-symbolic cognitive engine is online. I can reason across your local ERP relationship graph offline in <10ms (0 API tokens), or coordinate actions and meta-learning.",
      offlineResolved: true,
      executionPathway: "system_init",
      latencyMs: 0,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestedPrompts = [
    "What collections does HRMS Module manage?",
    "Who can apply for a Leave Request?",
    "What is the largest planet in our solar system?",
    "Which module resolves Tickets?",
    "Remember: Project Alpha deadline is October 15",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load chat sessions on mount via Master Populate Pipeline
  const fetchSessions = async () => {
    try {
      const res = await api.post("/populate/read/jarvis_chat_sessions", {
        filter: { metaStatus: "active" },
        sort: { updatedAt: -1 },
        limit: 30,
      });
      const sessionList = Array.isArray(res.data?.data)
        ? res.data.data
        : (res.data?.sessions || []);

      if (sessionList.length > 0) {
        const formatted = sessionList.map((s) => ({
          _id: s._id,
          title: s.title || "New Conversation",
          messageCount: s.messages?.length || 0,
          focalTopic: s.discourseState?.focalEntities?.[0]?.canonical || null,
          updatedAt: s.updatedAt,
        }));
        setSessions(formatted);
        if (!activeSessionId) {
          loadSession(formatted[0]._id);
        }
      }
    } catch (err) {
      console.warn("Failed to load sessions via Populate API:", err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const createNewSession = async () => {
    try {
      const res = await api.post("/populate/create/jarvis_chat_sessions", {
        title: "New Conversation",
        messages: [],
        discourseState: {
          focalEntities: [],
          lastPredicate: null,
          turnCount: 0,
        },
        metaStatus: "active",
      });
      const created = res.data?.data || res.data?.session;
      if (created && created._id) {
        const newS = {
          _id: created._id,
          title: created.title || "New Conversation",
          messageCount: 0,
          updatedAt: new Date(),
        };
        setSessions((prev) => [newS, ...prev]);
        setActiveSessionId(newS._id);
        setMessages([
          {
            id: "init",
            sender: "jarvis",
            text: "Good day, sir. J.A.R.V.I.S. is ready for a new conversation.",
            offlineResolved: true,
            executionPathway: "session_start",
            latencyMs: 0,
            timestamp: new Date(),
          },
        ]);
        setFocalTopic(null);
      }
    } catch (err) {
      console.error("Failed to create session via Populate API:", err);
    }
  };

  const loadSession = async (sessionId) => {
    if (!sessionId) return;
    setActiveSessionId(sessionId);
    try {
      const res = await api.get(`/populate/read/jarvis_chat_sessions/${sessionId}`);
      const s = res.data?.data || res.data?.session;
      if (s) {
        if (Array.isArray(s.messages) && s.messages.length > 0) {
          setMessages(
            s.messages.map((m, idx) => ({
              id: m._id || `m_${idx}`,
              sender: m.role === "user" ? "user" : "jarvis",
              text: m.text,
              offlineResolved: m.offlineResolved,
              executionPathway: m.intent?.type || (m.offlineResolved ? "graph_factual_query" : "llm_teacher"),
              intent: m.intent,
              actionPayload: m.actionPayload,
              latencyMs: m.latencyMs || 0,
              timestamp: new Date(m.timestamp),
            }))
          );
        } else {
          setMessages([
            {
              id: "init",
              sender: "jarvis",
              text: `Chat session "${s.title || "Session"}" opened. How may I assist you, sir?`,
              offlineResolved: true,
              executionPathway: "session_loaded",
              latencyMs: 0,
              timestamp: new Date(),
            },
          ]);
        }
        setFocalTopic(s.discourseState?.focalEntities?.[0]?.canonical || null);
      }
    } catch (err) {
      console.error("Failed to load session via Populate API:", err);
    }
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await api.delete(`/populate/delete/jarvis_chat_sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete session via Populate API:", err);
    }
  };

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsgId = `user_${Date.now()}`;
    const userMessage = {
      id: userMsgId,
      sender: "user",
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const startTime = performance.now();

    try {
      const payload = {
        utterance: query,
        mode: activeMode,
        sessionId: activeSessionId,
        conversationHistory: messages.slice(-10).map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        })),
      };

      const res = await api.post("/jarvis/chat", payload);
      const latency = Math.round(performance.now() - startTime);

      if (res.data?.success) {
        const jarvisMsg = {
          id: `jarvis_${Date.now()}`,
          sender: "jarvis",
          text: res.data.response || "No response generated.",
          offlineResolved: res.data.offlineResolved,
          executionPathway:
            res.data.intent?.type ||
            res.data.intent?.taskCategory ||
            (res.data.offlineResolved ? "graph_factual_query" : "llm_teacher"),
          intent: res.data.intent,
          verified: res.data.verified,
          latencyMs: latency,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, jarvisMsg]);

        // If a focal subject was resolved or taught, update live focal topic
        if (res.data.intent?.parameters?.subject) {
          setFocalTopic(res.data.intent.parameters.subject);
        }

        // Refresh sessions list in background to update titles and message counts
        fetchSessions();
      } else {
        throw new Error(res.data?.error || "Failed to process query");
      }
    } catch (err) {
      const errorMsg = {
        id: `err_${Date.now()}`,
        sender: "jarvis",
        text: `Error: ${err.response?.data?.error || err.message || "Failed to connect to J.A.R.V.I.S. Core."}`,
        offlineResolved: false,
        executionPathway: "error_handler",
        latencyMs: Math.round(performance.now() - startTime),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSessions = sessions.filter((s) =>
    (s.title || "").toLowerCase().includes(sessionSearch.toLowerCase())
  );

  return (
    <div className="flex flex-1 h-full w-full rounded-2xl border border-[var(--tracker-border)] bg-[var(--tracker-surface)] overflow-hidden shadow-sm">
      {/* ── Left Sidebar: Persistent Chat Sessions ── */}
      <div
        className={`${
          sidebarOpen ? "w-64 md:w-72" : "w-0"
        } transition-all duration-300 ease-in-out border-r border-[var(--tracker-border)] bg-[var(--tracker-surface-1)] flex flex-col shrink-0 overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-[var(--tracker-border-soft)] flex items-center justify-between gap-2">
          <button
            onClick={createNewSession}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#6c3de8] to-[#8b5cf6] hover:opacity-95 text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-xl text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface)] transition-all cursor-pointer"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Search Past Chats */}
        <div className="p-2 border-b border-[var(--tracker-border-soft)]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--tracker-ink-muted)]" />
            <input
              type="text"
              placeholder="Search chats..."
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg text-[11px] bg-[var(--tracker-surface)] border border-[var(--tracker-border-soft)] text-[var(--tracker-ink)] outline-none focus:border-[#6c3de8]"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-[11px] text-[var(--tracker-ink-muted)]">
              No chat sessions found
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isActive = s._id === activeSessionId;
              return (
                <div
                  key={s._id}
                  onClick={() => loadSession(s._id)}
                  className={`group relative flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isActive
                      ? "bg-[#6c3de8]/12 text-[#6c3de8] font-bold border border-[#6c3de8]/25 shadow-2xs"
                      : "text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface)]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#6c3de8]" : ""}`} />
                    <div className="truncate text-[11.5px] leading-tight">
                      <div className="truncate font-medium">{s.title || "Chat Session"}</div>
                      {s.focalTopic && (
                        <div className="text-[9.5px] opacity-75 truncate text-[#6c3de8] dark:text-[#a78bfa]">
                          Topic: {s.focalTopic}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => deleteSession(e, s._id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 rounded transition-all"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main Chat Canvas (100% Fluid Width) ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--tracker-surface)]">
        {/* Active Session Top Bar */}
        <div className="px-4 py-2.5 border-b border-[var(--tracker-border-soft)] bg-[var(--tracker-surface-1)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface)] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title={sidebarOpen ? "Hide History" : "Show History"}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4 text-[#6c3de8]" /> : <Menu className="w-4 h-4 text-[#6c3de8]" />}
              {!sidebarOpen && <span className="text-[11px] text-[var(--tracker-ink-muted)] font-medium">History</span>}
            </button>
            <div className="h-4 w-[1px] bg-[var(--tracker-border-soft)]" />
            <div className="flex items-center gap-2 truncate">
              <Bot className="w-4 h-4 text-[#6c3de8]" />
              <span className="text-xs font-bold text-[var(--tracker-ink)] truncate">
                Cognitive Discourse Stream
              </span>
              {focalTopic && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6c3de8]/10 text-[#6c3de8] border border-[#6c3de8]/20">
                  <Flame className="w-3 h-3" />
                  Active Focus: {focalTopic}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              ⚡ Neuro-Symbolic Engine
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => {
            const isUser = m.sender === "user";
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fade-in`}
              >
                {/* Avatar */}
                <div
                  className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-2xs ${
                    isUser
                      ? "bg-gradient-to-tr from-[#6c3de8] to-[#8b5cf6] text-white"
                      : "bg-gradient-to-tr from-[#6c3de8] to-[#0ea5e9] text-white"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
                  <div
                    className={`relative group px-4 py-2.5 rounded-2xl text-xs leading-relaxed select-text ${
                      isUser
                        ? "bg-gradient-to-r from-[#6c3de8] to-[#8b5cf6] text-white rounded-tr-xs shadow-xs"
                        : "bg-[var(--tracker-surface-1)] text-[var(--tracker-ink)] border border-[var(--tracker-border-soft)] rounded-tl-xs shadow-2xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>

                    {/* Copy Button */}
                    {!isUser && (
                      <button
                        onClick={() => handleCopy(m.id, m.text)}
                        className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-[var(--tracker-surface)] border border-[var(--tracker-border-soft)] text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] transition-all"
                        title="Copy text"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Telemetry Metadata */}
                  {!isUser && m.executionPathway !== "system_init" && (
                    <div className="flex items-center gap-2 mt-1.5 px-1 text-[10px] text-[var(--tracker-ink-muted)] flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[9.5px] font-semibold ${
                          m.offlineResolved
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {m.offlineResolved ? (
                          <>
                            <Zap className="w-3 h-3" />
                            0 TOKENS (Offline)
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            LLM Teacher
                          </>
                        )}
                      </span>

                      {m.latencyMs !== undefined && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {m.latencyMs} ms
                        </span>
                      )}

                      {m.verified && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6c3de8] to-[#0ea5e9] text-white flex items-center justify-center animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 rounded-2xl bg-[var(--tracker-surface-1)] border border-[var(--tracker-border-soft)] text-xs text-[var(--tracker-ink-muted)] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#6c3de8] animate-ping" />
                <span>Traversing cognitive graph and reasoning...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Pills */}
        <div className="px-4 py-2 border-t border-[var(--tracker-border-soft)] bg-[var(--tracker-surface-1)] flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
          <span className="text-[10px] font-bold text-[var(--tracker-ink-muted)] shrink-0 uppercase tracking-wider">
            Try:
          </span>
          {suggestedPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              disabled={loading}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[var(--tracker-surface)] border border-[var(--tracker-border-soft)] text-[var(--tracker-ink-muted)] hover:text-[#6c3de8] hover:border-[#6c3de8]/30 transition-all shrink-0 cursor-pointer disabled:opacity-40"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-[var(--tracker-surface)] border-t border-[var(--tracker-border-soft)] flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask J.A.R.V.I.S. anything about the ERP system, facts, or follow-ups... (Press Enter)"
            className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-[var(--tracker-surface-1)] border border-[var(--tracker-border-soft)] text-[var(--tracker-ink)] outline-none focus:border-[#6c3de8] transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#6c3de8] to-[#8b5cf6] hover:opacity-95 text-white transition-all shadow-xs disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
