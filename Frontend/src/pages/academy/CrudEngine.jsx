import { useState, useMemo } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Pencil, Trash2, Database, ArrowRight, FileJson, Settings2, ShieldCheck, ArrowDown } from "lucide-react";
import CodeBlock from "./shared/CodeBlock";

export default function CrudEngine() {
  const [opType, setOpType] = useState("READ");

  // Interactive configurations
  const [readFilter, setReadFilter] = useState("assigned_me");
  const [populateAuthor, setPopulateAuthor] = useState(true);
  const [createContent, setCreateContent] = useState("Awesome populate engine!");
  const [createMentions, setCreateMentions] = useState(true);
  const [updateStatus, setUpdateStatus] = useState("InProgress");
  const [deleteId, setDeleteId] = useState("cmt_90384a");

  // Dynamic API details calculated in real-time
  const axiosCallCode = useMemo(() => {
    switch (opType) {
      case "READ":
        return `// React Frontend: Querying tickets
const res = await axiosInstance.post("/populate/read/tickets", {
  filter: {
    ${readFilter === "assigned_me" ? 'assignedTo: { eq: "user_123" }' : 'status: { eq: "Open" }'}
  },
  populateFields: {
    createdBy: "${populateAuthor ? "name email" : ""}"
  }
});`;
      case "CREATE":
        return `// React Frontend: Creating a comment
const res = await axiosInstance.post("/populate/create/comments", {
  content: "${createContent.trim()}",
  mentions: [
    ${createMentions ? '{ userId: "usr_882", name: "David M." }' : ""}
  ]
});`;
      case "UPDATE":
        return `// React Frontend: Updating ticket status
const res = await axiosInstance.post("/populate/update/tickets/tkt_773012", {
  status: "${updateStatus}"
});`;
      case "DELETE":
        return `// React Frontend: Purging comment
const res = await axiosInstance.post("/populate/delete/comments/${deleteId}");`;
      default:
        return "";
    }
  }, [opType, readFilter, populateAuthor, createContent, createMentions, updateStatus, deleteId]);

  const compiledQueryCode = useMemo(() => {
    switch (opType) {
      case "READ": {
        const parsedFilter = readFilter === "assigned_me"
          ? { assignedTo: "user_123" }
          : { status: "Open" };
        // ABAC criteria filter injected by policy
        const policyInjected = { assignedTo: "user_123" };
        const combined = { ...parsedFilter, ...policyInjected };
        return `// backend/src/crud/buildReadQuery.js
// 1. Injected policy filter merged: ${JSON.stringify(policyInjected)}
// 2. Compiled through mongoFilterCompiler.js
const mongooseFilter = ${JSON.stringify(combined)};
let query = Ticket.find(mongooseFilter);
${populateAuthor ? 'query = query.populate("createdBy", "name email");' : ""}
const results = await query.lean();`;
      }
      case "CREATE":
        return `// backend/src/services/comments.js
// beforeCreate lifecycle hook resolves:
export async function beforeCreate({ data, user }) {
  if (!data.content?.trim()) throw new Error("Empty comment");
  return {
    ...data,
    content: data.content.trim(),
    author: user._id
  };
}
// db execution:
await Comment.create(sanitizedData);`;
      case "UPDATE":
        return `// backend/src/utils/policy/ticketPolicy.js
// FBAC field checking validation:
const canEditStatus = ["Admin", "Manager"].includes(user.role);
if (!canEditStatus) throw new Error("403 Unauthorized Field");

// db update command:
await Ticket.findByIdAndUpdate("tkt_773012", { 
  $set: { status: "${updateStatus}", updatedAt: new Date() } 
});`;
      case "DELETE":
        return `// backend/src/utils/policy/commentPolicy.js
// Ownership authorization check:
const isAuthor = comment.author.toString() === user._id.toString();
if (!isAuthor) throw new Error("403 Forbidden");

// db delete execution:
await Comment.deleteOne({ _id: ObjectId("${deleteId}") });`;
      default:
        return "";
    }
  }, [opType, readFilter, populateAuthor, updateStatus, deleteId]);

  const responseJson = useMemo(() => {
    switch (opType) {
      case "READ":
        return {
          success: true,
          data: [
            {
              _id: "tkt_773012",
              title: "Fix session refresh leak",
              status: readFilter === "assigned_me" ? "Open" : "Open",
              assignedTo: "user_123",
              createdBy: populateAuthor ? { name: "Arunbharathi", email: "arunbharathi@Workhubindia.com" } : "user_123"
            }
          ]
        };
      case "CREATE":
        return {
          success: true,
          data: {
            _id: "cmt_new88219",
            content: createContent.trim(),
            author: "user_123",
            mentions: createMentions ? [{ userId: "usr_882", name: "David M." }] : [],
            createdAt: new Date().toISOString()
          }
        };
      case "UPDATE":
        return {
          success: true,
          data: {
            _id: "tkt_773012",
            status: updateStatus,
            updatedAt: new Date().toISOString()
          }
        };
      case "DELETE":
        return {
          success: true,
          deletedId: deleteId,
          message: "Purged comment from MongoDB index successfully."
        };
      default:
        return {};
    }
  }, [opType, readFilter, populateAuthor, createContent, createMentions, updateStatus, deleteId]);

  return (
    <section className="relative space-y-16">

      {/* Chapter header */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">
          ⚙️ CRUD COMPILER
        </span>
        <h2 className="text-3xl md:text-5xl font-black text-white">
          The Query Factory
        </h2>
        <p className="text-slate-400 text-xs md:text-sm">
          Set custom parameters in the workspace panel, scroll down, and experience exactly how API payloads compile and flow down.
        </p>
      </div>

      {/* Compiler Dashboard layout */}
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Dynamic Parameter Hub Console */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-[28px] p-6 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-indigo-500/5 blur-[90px] pointer-events-none" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-indigo-400 animate-spin" style={{ animationDuration: '8s' }} />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Control Panel Playground</h3>
            </div>

            {/* Selector list buttons */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 border border-slate-850 rounded-xl shrink-0">
              {[
                { id: "READ", icon: Search, color: "text-cyan-400" },
                { id: "CREATE", icon: Plus, color: "text-emerald-400" },
                { id: "UPDATE", icon: Pencil, color: "text-amber-400" },
                { id: "DELETE", icon: Trash2, color: "text-rose-400" }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = opType === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setOpType(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isSelected
                      ? "bg-slate-800 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-350"
                      }`}
                  >
                    <Icon size={12} className={tab.color} />
                    {tab.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuration Forms */}
          <div className="text-xs text-slate-300">
            <AnimatePresence mode="wait">
              {opType === "READ" && (
                <Motion.div
                  key="read-play"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid sm:grid-cols-2 gap-6"
                >
                  <div className="space-y-2">
                    <label className="text-slate-400 font-bold block">1. Toggle Search Filter</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2.5 cursor-pointer hover:text-white transition-colors">
                        <input
                          type="radio"
                          name="readFilterPlay"
                          checked={readFilter === "assigned_me"}
                          onChange={() => setReadFilter("assigned_me")}
                          className="accent-indigo-500 cursor-pointer"
                        />
                        <span>Query Tickets assigned to user_123</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer hover:text-white transition-colors">
                        <input
                          type="radio"
                          name="readFilterPlay"
                          checked={readFilter === "all_open"}
                          onChange={() => setReadFilter("all_open")}
                          className="accent-indigo-500 cursor-pointer"
                        />
                        <span>Query all Open tickets</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-400 font-bold block">2. DB Population Options</label>
                    <label className="flex items-center gap-2.5 cursor-pointer hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={populateAuthor}
                        onChange={(e) => setPopulateAuthor(e.target.checked)}
                        className="accent-indigo-500 rounded cursor-pointer"
                      />
                      <span>Populate Creator details (Prevents N+1)</span>
                    </label>
                  </div>
                </Motion.div>
              )}

              {opType === "CREATE" && (
                <Motion.div
                  key="create-play"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid sm:grid-cols-2 gap-6"
                >
                  <div className="space-y-2">
                    <label className="text-slate-400 font-bold block">1. Write Comment Text</label>
                    <input
                      type="text"
                      value={createContent}
                      onChange={(e) => setCreateContent(e.target.value)}
                      placeholder="Comment content..."
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 text-xs font-sans"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-400 font-bold block">2. Mention Notifications</label>
                    <label className="flex items-center gap-2.5 cursor-pointer hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={createMentions}
                        onChange={(e) => setCreateMentions(e.target.checked)}
                        className="accent-indigo-500 rounded cursor-pointer"
                      />
                      <span>Simulate Mention alert on tag 'David M.'</span>
                    </label>
                  </div>
                </Motion.div>
              )}

              {opType === "UPDATE" && (
                <Motion.div
                  key="update-play"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid sm:grid-cols-2 gap-6"
                >
                  <div className="space-y-2">
                    <label className="text-slate-400 font-bold block">1. Select Status update value</label>
                    <select
                      value={updateStatus}
                      onChange={(e) => setUpdateStatus(e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 text-xs w-full cursor-pointer"
                    >
                      <option value="InProgress">InProgress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </Motion.div>
              )}

              {opType === "DELETE" && (
                <Motion.div
                  key="delete-play"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid sm:grid-cols-2 gap-6"
                >
                  <div className="space-y-2">
                    <label className="text-slate-400 font-bold block">1. Type Target comment ID</label>
                    <input
                      type="text"
                      value={deleteId}
                      onChange={(e) => setDeleteId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                    />
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dynamic API Flow Visual Pipeline */}
        <div className="space-y-12">

          {/* Step 1: Frontend axios hit */}
          <Motion.div
            layout
            className="bg-slate-950 border border-slate-900 rounded-[24px] p-5 shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-2 right-3 rounded bg-slate-900/60 px-2 py-0.5 border border-white/5 font-mono text-[8px] text-indigo-400">
              1. Axios Call
            </div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Frontend request construction:</span>
            <CodeBlock code={axiosCallCode} />
          </Motion.div>

          {/* Step 2: Compiler Sanitization */}
          <Motion.div
            layout
            className="bg-slate-950 border border-slate-900 rounded-[24px] p-5 shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-2 right-3 rounded bg-slate-900/60 px-2 py-0.5 border border-white/5 font-mono text-[8px] text-cyan-400">
              2. Query Compiler
            </div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Backend query sanitization & hooks:</span>
            <CodeBlock code={compiledQueryCode} />
          </Motion.div>

          {/* Step 3: Sanitized Database Response */}
          <Motion.div
            layout
            className="bg-slate-950 border border-slate-900 rounded-[24px] p-5 shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-2 right-3 rounded bg-slate-900/60 px-2 py-0.5 border border-white/5 font-mono text-[8px] text-emerald-400">
              3. Output Payload
            </div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Sanitized response JSON payload returned:</span>
            <div className="bg-slate-900 rounded-xl p-3 border border-slate-850 overflow-x-auto text-[10px] font-mono text-emerald-300 max-h-[180px] scrollbar-thin">
              <pre>{JSON.stringify(responseJson, null, 2)}</pre>
            </div>
          </Motion.div>

        </div>

      </div>

      {/* Spacer transition scroll down */}
      <div className="flex justify-center pt-8">
        <Motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="flex flex-col items-center gap-1 text-slate-650"
        >
          <span className="text-[9px] font-mono uppercase tracking-widest">Scroll to Lego Builder</span>
          <ArrowDown size={14} />
        </Motion.div>
      </div>

    </section>
  );
}