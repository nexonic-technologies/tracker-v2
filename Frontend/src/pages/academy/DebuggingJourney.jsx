import { motion as Motion } from "framer-motion";
import { Bug, Shield, Route, Wrench, Server, AlertTriangle, CheckCircle2, Terminal } from "lucide-react";
import CodeBlock from "./shared/CodeBlock";

const issues = [
  {
    id: "trace_err_401",
    title: "1. 401 Unauthorized Exception",
    traceId: "trace-auth-err-992",
    status: "Unauthorized",
    msg: "Error: Session credentials invalid or expired.",
    steps: [
      { name: "Tracing", status: "pass" },
      { name: "Auth Check", status: "fail" },
      { name: "Policy Engine", status: "pending" },
      { name: "Query Builder", status: "pending" }
    ],
    diagnosis: "The Authorization header was missing or contained an expired JWT token signature. Verify that your Axios request interceptor attaches the token accurately.",
    code: `// frontend/src/api/axiosInstance.js
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
});`
  },
  {
    id: "trace_err_403",
    title: "2. 403 Forbidden Access",
    traceId: "trace-policy-denied-041",
    status: "Forbidden",
    msg: "Error: Policy rejection. Role lacks write credentials.",
    steps: [
      { name: "Tracing", status: "pass" },
      { name: "Auth Check", status: "pass" },
      { name: "Policy Engine", status: "fail" },
      { name: "Query Builder", status: "pending" }
    ],
    diagnosis: "The user role 'Employee' attempted an operation restricted to Managers/Admins. Modify backend/src/utils/policy/ticketPolicy.js to adjust role groups.",
    code: `// backend/src/utils/policy/ticketPolicy.js
export const ticketPolicy = {
  create: async (user) => {
    // Only Managers and Admins can create tickets
    return ["Manager", "Admin"].includes(user.role);
  }
};`
  },
  {
    id: "trace_err_422",
    title: "3. 422 Database Validation Error",
    traceId: "trace-validation-err-118",
    status: "Validation failed",
    msg: "Error: Path 'title' is required on schema creation.",
    steps: [
      { name: "Tracing", status: "pass" },
      { name: "Auth Check", status: "pass" },
      { name: "Policy Engine", status: "pass" },
      { name: "Query Builder", status: "fail" }
    ],
    diagnosis: "The write payload was missing the required Mongoose schema 'title' property. Check frontend parameters to verify values are sent.",
    code: `// backend/src/models/Ticket.js
const TicketSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Required!
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});`
  },
  {
    id: "trace_err_500",
    title: "4. 500 Server Hook Exception",
    traceId: "trace-hook-crash-831",
    status: "Server Error",
    msg: "Error: Unhandled exception: Cannot read property 'name' of undefined.",
    steps: [
      { name: "Tracing", status: "pass" },
      { name: "Auth Check", status: "pass" },
      { name: "Policy Engine", status: "pass" },
      { name: "Query Builder", status: "fail" }
    ],
    diagnosis: "An unhandled exception crashed a Mongoose hook (afterCreate). In this case, an asynchronous function referenced properties on an undefined object.",
    code: `// backend/src/services/tickets.js
export async function afterCreate({ doc, user }) {
  // CRASH: user is undefined when accessed
  console.log("Ticket created for user:", user.name); 
}`
  }
];

export default function DebuggingJourney() {
  return (
    <section className="relative space-y-16">
      
      {/* Chapter header */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <span className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em]">
          🐛 Diagnostics Console
        </span>
        <h2 className="text-3xl md:text-5xl font-black text-white">
          Follow The Failure
        </h2>
        <p className="text-slate-400 text-xs md:text-sm">
          Debugging is simply tracing a request until it crashes. Scroll through to inspect diagnostic scenarios.
        </p>
      </div>

      {/* Scrolling error stack */}
      <div className="max-w-4xl mx-auto space-y-16 relative">
        {/* Connector vertical timeline line */}
        <div className="absolute left-6 md:left-12 top-4 bottom-4 w-[2px] bg-slate-900 border-l border-dashed border-slate-800 -z-10" />

        {issues.map((issue, idx) => {
          return (
            <Motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              className="relative pl-16 md:pl-24 space-y-4"
            >
              
              {/* Stepper Node pin */}
              <div className="absolute left-6 md:left-12 top-2 -translate-x-1/2 flex items-center justify-center z-10">
                <div className="w-8 h-8 rounded-full bg-red-950 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                  <AlertTriangle size={14} className="animate-pulse" />
                </div>
              </div>

              {/* Detail Visual Card */}
              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 md:p-8 space-y-6 shadow-xl backdrop-blur-md">
                
                {/* Header title */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 border-b border-red-500/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-slate-950 rounded-xl text-red-400">
                      <Bug size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">{issue.title}</h3>
                      <span className="text-[9px] font-mono text-slate-500 mt-1 block">Trace ID: {issue.traceId}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-red-400 border border-red-900/30 uppercase shrink-0 self-start">
                    {issue.status}
                  </span>
                </div>

                {/* Crash payload message */}
                <div className="p-4 rounded-xl border border-red-900/30 bg-black/40 font-mono text-[10.5px] text-red-400">
                  {issue.msg}
                </div>

                {/* Grid: Pipeline check + Diagnostics Code */}
                <div className="grid md:grid-cols-12 gap-6 items-start">
                  
                  {/* Left: Check points */}
                  <div className="md:col-span-5 space-y-3">
                    <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">Pipeline Traversal Checklist:</span>
                    <div className="space-y-2">
                      {issue.steps.map((st) => {
                        return (
                          <div
                            key={st.name}
                            className={`flex items-center justify-between p-3 rounded-xl border text-[10px] font-semibold ${
                              st.status === "pass"
                                ? "bg-emerald-950/20 border-emerald-900/20 text-emerald-400"
                                : st.status === "fail"
                                ? "bg-red-950/20 border-red-900/20 text-red-400 animate-pulse"
                                : "bg-slate-950 border-slate-900 text-slate-600"
                            }`}
                          >
                            <span>{st.name}</span>
                            <span className="font-mono text-[9px] uppercase tracking-wide">
                              {st.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Code Block solution */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900 text-[10.5px] text-slate-350 leading-relaxed font-sans">
                      <span className="font-bold text-slate-200 block mb-1">Root Cause & Resolution:</span>
                      {issue.diagnosis}
                    </div>

                    <div>
                      <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Diagnostics Implementation Code:</span>
                      <CodeBlock code={issue.code} />
                    </div>
                  </div>

                </div>

              </div>
            </Motion.div>
          );
        })}
      </div>

      {/* Final Summary visual message */}
      <Motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="max-w-xl mx-auto text-center border border-indigo-500/20 bg-indigo-500/5 p-8 rounded-[28px] mt-16 shadow-xl"
      >
        <span className="text-3xl mb-3 block">💡</span>
        <h3 className="text-lg font-black text-white">Every Bug is a Broken request Journey</h3>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
          Trace the request Trace ID in Mongoose middleware, safety compilers, RBAC rules, or service hooks step-by-step to isolate bugs cleanly.
        </p>
      </Motion.div>

    </section>
  );
}
