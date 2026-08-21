import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../context/authProvider";
import PageLoader from "../components/Common/PageLoader";
import {
  Users, Phone, MessageSquare, User, Network, Grid, CheckCircle,
  Clock, X, Send, AlertCircle, Coffee
} from "lucide-react";
import toast from "react-hot-toast";

export default function Teams() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid"); // grid or tree
  const [selectedDeptId, setSelectedDeptId] = useState("all");
  const { user } = useAuth();

  // Call modal state
  const [callMember, setCallMember] = useState(null);

  // Chat modal/slideout state
  const [chatMember, setChatMember] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [chats, setChats] = useState({}); // { memberId: [ { sender, text, time } ] }

  useEffect(() => {
    fetchTeamsAndStatuses();
  }, []);

  const fetchTeamsAndStatuses = async () => {
    try {
      setLoading(true);

      // 1. Fetch active employees
      const employeesRes = await axiosInstance.post('/populate/read/employees', {
        limit: 1000,
        filter: { status: "Active" },
        populateFields: {
          "professionalInfo.department": "name",
          "professionalInfo.designation": "title"
        }
      });
      const emps = employeesRes.data.data || [];
      setEmployees(emps);

      // 2. Fetch today's attendances to determine live status
      const todayStr = new Date().toISOString().split('T')[0];
      const attendanceRes = await axiosInstance.post('/populate/read/attendances', {
        filter: {
          date: {
            $gte: `${todayStr}T00:00:00.000Z`,
            $lte: `${todayStr}T23:59:59.999Z`
          }
        },
        limit: 1000
      });
      setAttendances(attendanceRes.data?.data || []);

    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  // Determine current live status for an employee based on today's check-in
  const getEmployeeStatus = (empId) => {
    const att = attendances.find(a => {
      const aEmpId = (a.employee?._id || a.employee || a.employeeId?._id || a.employeeId)?.toString();
      return aEmpId === empId?.toString();
    });

    if (!att || !att.checkIn) {
      if (att?.status === "Leave") {
        return { label: "On Leave", color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800", dot: "bg-purple-500", icon: Clock };
      }
      return { label: "Absent", color: "text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700", dot: "bg-slate-400", icon: Clock };
    }

    if (att.checkOut) {
      return { label: "Checked Out", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800", dot: "bg-amber-500", icon: Clock };
    }
    if (att.status === "On Break") {
      return { label: "On Break", color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800", dot: "bg-orange-500", icon: Coffee };
    }
    return { label: "Present", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500", icon: CheckCircle };
  };

  // Group departments
  const departmentsList = useMemo(() => {
    const depts = new Map();
    employees.forEach(emp => {
      const dept = emp.professionalInfo?.department;
      if (dept) {
        depts.set(dept._id, dept.name);
      }
    });
    return Array.from(depts.entries()).map(([id, name]) => ({ id, name }));
  }, [employees]);

  // Group members under departments
  const groupedTeams = useMemo(() => {
    const groups = {};

    employees.forEach(emp => {
      const dept = emp.professionalInfo?.department;
      const deptId = dept?._id || 'no-dept';
      const deptName = dept?.name || 'Unassigned';

      if (!groups[deptId]) {
        groups[deptId] = {
          id: deptId,
          name: deptName,
          members: []
        };
      }

      const liveStatus = getEmployeeStatus(emp._id);
      groups[deptId].members.push({
        ...emp,
        liveStatus
      });
    });

    return Object.values(groups);
  }, [employees, attendances]);

  // Filtered groups based on select dropdown
  const filteredTeams = useMemo(() => {
    if (selectedDeptId === "all") return groupedTeams;
    return groupedTeams.filter(g => g.id === selectedDeptId);
  }, [groupedTeams, selectedDeptId]);

  // Recursively build tree for a department
  const renderDepartmentTree = (deptMembers) => {
    const map = {};
    deptMembers.forEach(m => {
      map[m._id] = { ...m, children: [] };
    });

    const roots = [];
    deptMembers.forEach(m => {
      const parentId = m.professionalInfo?.reportingManager;
      if (parentId && map[parentId]) {
        map[parentId].children.push(map[m._id]);
      } else {
        roots.push(map[m._id]);
      }
    });

    const MemberNode = ({ node }) => {
      const name = `${node.basicInfo?.firstName || ""} ${node.basicInfo?.lastName || ""}`.trim();
      const isCurrentUser = node._id === user?.id;

      return (
        <div className="flex flex-col items-center">
          {/* Card */}
          <div className={`bg-surface border border-hairline rounded-tracker-card p-4 shadow-sm min-w-[210px] text-center transition-all ${isCurrentUser ? "ring-2 ring-indigo-500" : "hover:border-indigo-400"
            }`}>
            <div className="relative w-11 h-11 mx-auto mb-2">
              <div className="w-11 h-11 rounded-full bg-surface-2 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-sm border border-hairline">
                {node.basicInfo?.firstName?.[0] || <User />}
              </div>
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${node.liveStatus.label.includes("Present") ? "bg-emerald-500" :
                  node.liveStatus.label.includes("Break") ? "bg-orange-500" : "bg-slate-400"
                }`} />
            </div>

            <h5 className="text-[13px] font-bold text-ink leading-snug">{name} {isCurrentUser && "(You)"}</h5>
            <p className="text-[10px] text-ink-subtle mt-0.5">{node.professionalInfo?.designation?.title || "Staff"}</p>
            <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-semibold ${node.liveStatus.color}`}>
              {node.liveStatus.label}
            </span>

            {/* Call/Chat Actions */}
            <div className="flex items-center justify-center gap-2 mt-3 pt-2.5 border-t border-hairline-soft">
              <button
                onClick={() => setCallMember(node)}
                className="p-1.5 hover:bg-surface-1 rounded-full text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                title="Call Member"
              >
                <Phone className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setChatMember(node)}
                className="p-1.5 hover:bg-surface-1 rounded-full text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
                title="Chat Member"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Children Connector */}
          {node.children.length > 0 && (
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-5 bg-hairline" />
              <div className="flex gap-6 relative">
                {node.children.map((child, idx) => (
                  <div key={child._id} className="relative flex flex-col items-center">
                    <div className="absolute top-0 left-0 right-0 flex justify-between w-full">
                      <div className={`w-1/2 border-t border-hairline ${idx === 0 ? "opacity-0" : ""}`} />
                      <div className={`w-1/2 border-t border-hairline ${idx === node.children.length - 1 ? "opacity-0" : ""}`} />
                    </div>
                    <MemberNode node={child} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="flex gap-10 overflow-auto py-4 justify-center items-start">
        {roots.map(root => (
          <MemberNode key={root._id} node={root} />
        ))}
      </div>
    );
  };

  // Fetch messages history when chat member changes
  useEffect(() => {
    if (!chatMember || !user?.id) return;
    const conversationId = [user.id, chatMember._id].sort().join('_');

    const fetchHistory = async () => {
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
          setChats(prev => ({ ...prev, [chatMember._id]: formatted }));
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };

    fetchHistory();
  }, [chatMember, user?.id]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !chatMember || !user?.id) return;

    const memberId = chatMember._id;
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
      console.error("Failed to persist direct message:", err);
      toast.error("Failed to send message");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="h-[calc(100vh-var(--topbar-height,56px)-28px)] max-h-[calc(100vh-var(--topbar-height,56px)-28px)] flex flex-col text-ink overflow-hidden" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>

      {/* Header controls */}
      <div className="flex items-center justify-between gap-3 mb-2 flex-shrink-0">
        <div>
          <p className="lmx-page-eyebrow text-[9px] mb-0.2">COLLABORATION</p>
          <h1 className="text-base font-bold text-ink flex items-center gap-1.5 tracking-tight">
            <Users className="h-4 w-4 text-indigo-500" />
            Company Teams & Directory
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Dept Filter */}
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="py-1 px-2.5 text-[11px] bg-surface border border-hairline rounded-tracker-md outline-none text-ink cursor-pointer font-medium"
          >
            <option value="all">All Departments</option>
            {departmentsList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          {/* View toggle */}
          <div className="flex bg-surface-1 p-0.5 rounded-tracker-md border border-hairline">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded-sm text-xs transition cursor-pointer ${viewMode === "grid" ? "bg-surface shadow-2xs text-indigo-600 font-bold" : "text-ink-subtle hover:text-ink"}`}
              title="Grid View"
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={`p-1 rounded-sm text-xs transition cursor-pointer ${viewMode === "tree" ? "bg-surface shadow-2xs text-indigo-600 font-bold" : "text-ink-subtle hover:text-ink"}`}
              title="Organization Hierarchy Tree"
            >
              <Network className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content display */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
        {filteredTeams.map(team => (
          <div key={team.id} className="bg-surface border border-hairline rounded-tracker-md p-3.5 shadow-2xs space-y-3">

            <div className="flex items-center justify-between border-b border-hairline-soft pb-2 flex-shrink-0">
              <h2 className="text-xs font-bold text-ink flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                {team.name} Team
              </h2>
              <span className="text-[10px] font-semibold text-ink-subtle bg-surface-1 px-2 py-0.5 rounded-full">
                {team.members.length} Members
              </span>
            </div>

            {viewMode === "grid" ? (
              /* Grid Layout - Compact cards */
              <div className="flex flex-wrap gap-2.5">
                {team.members.map(member => {
                  const isMe = member._id === user?.id;
                  const name = `${member.basicInfo?.firstName || ""} ${member.basicInfo?.lastName || ""}`.trim();
                  return (
                    <div
                      key={member._id}
                      className={`w-[170px] sm:w-[180px] p-2.5 border rounded-tracker-md transition-all flex flex-col items-center text-center flex-shrink-0 ${isMe ? "bg-indigo-50/20 border-indigo-200" : "border-hairline hover:shadow-xs hover:border-indigo-300"
                        }`}
                    >
                      {/* Avatar */}
                      <div className="relative w-8 h-8 mb-1.5">
                        <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-[11px] border border-hairline">
                          {member.basicInfo?.firstName?.[0] || <User size={12} />}
                        </div>
                        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-surface ${member.liveStatus.dot || "bg-slate-400"}`} />
                      </div>

                      <h4 className="text-[11.5px] font-bold text-ink leading-snug truncate w-full">{name} {isMe && "(You)"}</h4>
                      <p className="text-[8.5px] text-ink-subtle truncate w-full mt-0.2">{member.professionalInfo?.designation?.title || "Staff Member"}</p>

                      <span className={`inline-block mt-1 px-1.5 py-0.2 rounded-full text-[7.5px] font-bold ${member.liveStatus.color}`}>
                        {member.liveStatus.label}
                      </span>

                      {/* Card Actions */}
                      <div className="flex items-center justify-center gap-1 mt-2 pt-1.5 border-t border-hairline-soft w-full">
                        <button
                          onClick={() => setCallMember(member)}
                          className="flex-1 py-1 bg-surface hover:bg-surface-1 border border-hairline rounded-md text-ink flex items-center justify-center gap-1 text-[9.5px] cursor-pointer"
                        >
                          <Phone className="h-2.5 w-2.5 text-indigo-500" /> Call
                        </button>
                        <button
                          onClick={() => !isMe && navigate(`/messages?chat=${member._id}`)}
                          disabled={isMe}
                          className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 text-[9.5px] transition ${isMe
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-hairline"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-2xs"
                            }`}
                        >
                          <MessageSquare className="h-2.5 w-2.5" /> {isMe ? "Profile" : "Chat"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Visual Tree View Layout */
              <div className="overflow-x-auto p-3 border border-hairline-soft bg-surface-1/20 rounded-tracker-md">
                {renderDepartmentTree(team.members)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CALL MODAL (Shows mobile number) */}
      {callMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45"
          onClick={(e) => e.target === e.currentTarget && setCallMember(null)}>
          <div className="bg-surface rounded-tracker-card border border-hairline w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-ink">Contact Info</h3>
              <p className="text-[12px] text-ink-subtle mt-0.5">{callMember.basicInfo?.firstName} {callMember.basicInfo?.lastName || ''}</p>
            </div>

            <div className="bg-surface-1 p-3 rounded-[8px] border border-hairline-soft">
              <p className="text-[15px] font-bold text-indigo-600 dark:text-indigo-400 select-all">
                {callMember.basicInfo?.phone || "No Mobile Number Provided"}
              </p>
            </div>

            <div className="flex gap-2">
              {callMember.basicInfo?.phone && (
                <a
                  href={`tel:${callMember.basicInfo.phone}`}
                  className="flex-1 py-2 bg-indigo-600 text-white font-semibold rounded-[8px] text-[12px] hover:bg-indigo-700 transition text-center"
                >
                  Dial Now
                </a>
              )}
              <button
                onClick={() => setCallMember(null)}
                className="flex-1 py-2 bg-surface border border-hairline text-ink-subtle font-semibold rounded-[8px] text-[12px] hover:bg-surface-2 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT MODAL / SLIDEOUT (Interactive Basic Chat Model) */}
      {chatMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setChatMember(null)}>
          <div className="h-full w-full max-w-md flex flex-col shadow-2xl bg-surface border-l border-hairline animate-[slideInRight_0.2s_ease-out]">

            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-hairline-soft bg-surface-1/40">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 flex items-center justify-center font-bold text-xs border border-hairline">
                    {chatMember.basicInfo?.firstName?.[0]}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${chatMember.liveStatus.label.includes("Present") ? "bg-emerald-500" : "bg-slate-400"
                    }`} />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-ink leading-tight">
                    {chatMember.basicInfo?.firstName} {chatMember.basicInfo?.lastName || ''}
                  </h4>
                  <p className="text-[9px] text-ink-subtle mt-0.5">{chatMember.professionalInfo?.designation?.title || "Team Member"}</p>
                </div>
              </div>
              <button onClick={() => setChatMember(null)} className="p-1.5 hover:bg-surface-2 rounded-full cursor-pointer transition">
                <X className="h-4 w-4 text-ink-subtle" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-surface-1/20">
              <div className="text-center">
                <span className="inline-block px-3 py-1 bg-surface border border-hairline-soft rounded-full text-[9px] text-ink-tertiary">
                  Secure direct message loop initiated
                </span>
              </div>

              {/* Render dynamic chats */}
              {(chats[chatMember._id] || []).map((msg, index) => {
                const isMe = msg.sender === "me";
                return (
                  <div key={index} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] p-3 rounded-[12px] shadow-sm text-[12px] leading-relaxed ${isMe
                        ? "bg-indigo-600 text-white rounded-br-[2px]"
                        : "bg-surface border border-hairline-soft text-ink rounded-bl-[2px]"
                      }`}>
                      <p>{msg.text}</p>
                      <span className={`block text-[8px] mt-1 text-right ${isMe ? "text-indigo-200" : "text-ink-tertiary"}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                );
              })}

              {!(chats[chatMember._id]?.length) && (
                <div className="h-full flex flex-col justify-center items-center text-center text-ink-tertiary space-y-1 py-20">
                  <MessageSquare className="h-8 w-8 opacity-25" />
                  <p className="text-xs">No direct messages yet.</p>
                  <p className="text-[10px]">Type a message below to start a quick chat conversation.</p>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-hairline bg-surface flex items-center gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 p-2.5 bg-surface border border-hairline rounded-[8px] outline-none text-ink text-[12px] focus:border-indigo-500"
              />
              <button
                onClick={handleSendMessage}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[8px] transition cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

    </div>
  );
}