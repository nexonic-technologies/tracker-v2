import { useState, useRef, useEffect } from "react";
import { motion as Motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import {
  Shield,
  Route,
  Database,
  Wrench,
  Server,
  Terminal,
  Cpu,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Lock,
  ArrowRight,
  Play,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Wifi,
  WifiOff
} from "lucide-react";
import CodeBlock from "./shared/CodeBlock";

const steps = [
  {
    stepNum: 1,
    title: "Request Entry & Tracing",
    icon: <Terminal size={18} />,
    desc: "Every dynamic request enters the Populate route. The engine assigns a unique trace ID and starts a high-resolution performance timer.",
    files: ["requestTracer.js", "auditLogger.js"],
    allowedPath: {
      action: "READ",
      role: "Manager",
      detail: "Generated Trace ID trace-allowed-123. Performance hrtime started.",
      badge: "ACTIVE",
      badgeColor: "bg-emerald-950/40 text-emerald-400 border-emerald-900/35"
    },
    deniedPath: {
      action: "UPDATE",
      role: "Employee",
      detail: "Generated Trace ID trace-denied-456. Performance hrtime started.",
      badge: "ACTIVE",
      badgeColor: "bg-red-950/40 text-red-400 border-red-900/35"
    },
    code: `// backend/src/utils/requestTracer.js
export function requestTracer(req, res, next) {
  req.traceId = generateTraceId();
  req.startTime = process.hrtime();
  res.setHeader("X-Trace-ID", req.traceId);
  next();
}`
  },
  {
    stepNum: 2,
    title: "Authentication Check",
    icon: <Shield size={18} />,
    desc: "Verify user credentials. Validates the JWT signature and checks the client x-device-uuid session to prevent token hijacking.",
    files: ["authMiddleware.js", "AuthController.js"],
    allowedPath: {
      action: "READ",
      role: "Manager",
      detail: "Token verified. User: user_mgr12. Fingerprint check: PASS.",
      badge: "AUTHENTICATED",
      badgeColor: "bg-emerald-950/40 text-emerald-400 border-emerald-900/35"
    },
    deniedPath: {
      action: "UPDATE",
      role: "Employee",
      detail: "Token verified. User: user_emp45. Fingerprint check: PASS.",
      badge: "AUTHENTICATED",
      badgeColor: "bg-red-950/40 text-red-400 border-red-900/35"
    },
    code: `// backend/src/Controller/AuthController.js
export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  const deviceUuid = req.headers["x-device-uuid"];
  const user = await verifyJWT(token);
  await checkDeviceSession(user._id, deviceUuid);
  req.user = user;
  next();
}`
  },
  {
    stepNum: 3,
    title: "File Upload Parsing",
    icon: <FileText size={18} />,
    desc: "If content-type headers match multipart/form-data, the Multer middleware intercepts raw file streams and populates req.files buffers.",
    files: ["multerConfig.js"],
    allowedPath: {
      action: "READ",
      role: "Manager",
      detail: "GET/READ query carries no files. Middleware skipped.",
      badge: "PASSED",
      badgeColor: "bg-emerald-950/40 text-emerald-400 border-emerald-900/35"
    },
    deniedPath: {
      action: "UPDATE",
      role: "Employee",
      detail: "JSON payload carries no files. Middleware skipped.",
      badge: "PASSED",
      badgeColor: "bg-red-950/40 text-red-400 border-red-900/35"
    },
    code: `// backend/src/middlewares/multerConfig.js
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, \`\${req.traceId}-\${file.originalname}\`)
});
export const upload = multer({ storage });`
  },
  {
    stepNum: 4,
    title: "Orchestration & Queueing",
    icon: <Route size={18} />,
    desc: "populateHelper.js parses models and enqueues execution in requestQueue.js to isolate locks and prevent database race conditions.",
    files: ["populateHelper.js", "requestQueue.js"],
    allowedPath: {
      action: "READ",
      role: "Manager",
      detail: "Action: READ. Model: tickets. Enqueued task in thread pool.",
      badge: "ENQUEUED",
      badgeColor: "bg-emerald-950/40 text-emerald-400 border-emerald-900/35"
    },
    deniedPath: {
      action: "UPDATE",
      role: "Employee",
      detail: "Action: UPDATE. Model: tickets. Enqueued task in thread pool.",
      badge: "ENQUEUED",
      badgeColor: "bg-red-950/40 text-red-400 border-red-900/35"
    },
    code: `// backend/src/helper/populateHelper.js
export async function populateHelper(req, res) {
  const { action, model } = req.params;
  const payload = req.body;
  await requestQueue.enqueue(req.traceId, async () => {
    const result = await runAction(action, model, payload, req.user);
    res.json({ success: true, data: result });
  });
}`
  },
  {
    stepNum: 5,
    title: "Data Safety Filtering",
    icon: <Cpu size={18} />,
    desc: "Tokenize inputs. mongoFilterCompiler.js parses query conditions to verify that no NoSQL injection statements exist inside operators.",
    files: ["filterParser.js", "mongoFilterCompiler.js"],
    allowedPath: {
      action: "READ",
      role: "Manager",
      detail: "Filter { status: 'Open' } checked. Safe compiled filters returned.",
      badge: "SANITIZED",
      badgeColor: "bg-emerald-950/40 text-emerald-400 border-emerald-900/35"
    },
    deniedPath: {
      action: "UPDATE",
      role: "Employee",
      detail: "Update field payload { status: 'Resolved' } checked. Safe.",
      badge: "SANITIZED",
      badgeColor: "bg-red-950/40 text-red-400 border-red-900/35"
    },
    code: `// backend/src/utils/mongoFilterCompiler.js
export function compile(filter) {
  const compiled = {};
  for (const [key, rules] of Object.entries(filter)) {
    if (isForbiddenField(key)) throw new Error("Restricted filter field");
    compiled[key] = mapOperators(rules);
  }
  return compiled;
}`
  },
  {
    stepNum: 6,
    title: "Access Policy Check (THE GATE)",
    icon: <Shield size={18} />,
    desc: "Evaluates role permissions and ownership conditions. Request B (Employee updating tickets) is evaluated. Request A (Manager reading tickets) is evaluated.",
    files: ["policyEngine.js", "ticketPolicy.js"],
    allowedPath: {
      action: "READ",
      role: "Manager",
      detail: "Manager role has permissions to read all tickets. Injected filter: assignedTo = user_123.",
      badge: "PASSED",
      badgeColor: "bg-emerald-950/40 text-emerald-400 border-emerald-900/35"
    },
    deniedPath: {
      action: "UPDATE",
      role: "Employee",
      detail: "Policy Failure: Employees are forbidden to alter ticket status. Access blocked.",
      badge: "BLOCKED (403)",
      badgeColor: "bg-red-950/80 text-red-450 border-red-900/40"
    },
    code: `// backend/src/utils/policy/ticketPolicy.js
export const ticketPolicy = {
  read: async (user) => true,
  update: async (user, doc) => {
    // BLOCKS: Employee lacks permissions to update ticket status
    return ["Admin", "Manager"].includes(user.role) || 
      doc.createdBy.toString() === user._id.toString();
  }
};`
  },
  {
    stepNum: 7,
    title: "Business Logic Hooks",
    icon: <Wrench size={18} />,
    desc: "Executes lifecycle hooks. Triggers pre-query and pre-save service hooks (e.g. validating status state transition rules).",
    files: ["tickets.js"],
    allowedPath: {
      action: "READ",
      role: "Manager",
      detail: "beforeRead hook fired. Injected filters successfully.",
      badge: "ACTIVE",
      badgeColor: "bg-emerald-950/40 text-emerald-400 border-emerald-900/35"
    },
    deniedPath: {
      action: "UPDATE",
      role: "Employee",
      detail: "Request terminated at Policy gate. Lifecycle hooks bypassed.",
      badge: "TERMINATED",
      badgeColor: "bg-slate-900 text-slate-650 border-slate-950"
    },
    code: `// backend/src/services/tickets.js
export async function beforeUpdate({ data, existingDoc, user }) {
  if (existingDoc.status === "Closed") {
    throw new Error("Cannot modify a closed ticket");
  }
  return data;
}`
  },
  {
    stepNum: 8,
    title: "Database Mutation",
    icon: <Database size={18} />,
    desc: "Executes the compiled Mongoose query. For Request A, Mongoose queries Mongo collections. For Request B, database call is bypassed.",
    files: ["buildReadQuery.js", "buildUpdateQuery.js"],
    allowedPath: {
      action: "READ",
      role: "Manager",
      detail: "Executed Mongoose Ticket.find(). 4 records fetched.",
      badge: "RESOLVED",
      badgeColor: "bg-emerald-950/40 text-emerald-400 border-emerald-900/35"
    },
    deniedPath: {
      action: "UPDATE",
      role: "Employee",
      detail: "Request terminated. Bypassed database layers.",
      badge: "TERMINATED",
      badgeColor: "bg-slate-900 text-slate-650 border-slate-950"
    },
    code: `// backend/src/crud/buildReadQuery.js
export async function buildReadQuery(model, filter, user) {
  const policyFilters = await policyEngine.getReadFilters(model, user);
  const compiled = mongoFilterCompiler.compile({ ...filter, ...policyFilters });
  return model.find(compiled).populate(defaultPopulationsFor(model));
}`
  },
  {
    stepNum: 9,
    title: "Auditing & Ledger Logging",
    icon: <FileText size={18} />,
    desc: "Write ledger record in audit_logs. Assures compliance checks can verify trace details, showing mutated fields or access warnings.",
    files: ["auditLogger.js"],
    allowedPath: {
      action: "READ",
      role: "Manager",
      detail: "audit_logs collection updated with READ action for user_mgr12.",
      badge: "LOGGED",
      badgeColor: "bg-emerald-950/40 text-emerald-400 border-emerald-900/35"
    },
    deniedPath: {
      action: "UPDATE",
      role: "Employee",
      detail: "audit_logs collection updated with BLOCKED mutation warning for user_emp45.",
      badge: "LOGGED",
      badgeColor: "bg-red-950/30 text-red-500/80 border-red-900/30"
    },
    code: `// backend/src/utils/auditLogger.js
export async function auditLog({ traceId, user, action, model, doc, change }) {
  await AuditLog.create({
    traceId,
    userId: user._id,
    action,
    modelName: model,
    changes: change,
    timestamp: new Date()
  });
}`
  },
  {
    stepNum: 10,
    title: "Response Sanitization & Return",
    icon: <Eye size={18} />,
    desc: "Sanitizes output records. Strip __v and hidden fields, log API hit execution speed, and send JSON data to client.",
    files: ["sanitizeRead.js", "apiHitLogger.js"],
    allowedPath: {
      action: "READ",
      role: "Manager",
      detail: "Response payload sanitized. Status 200 SUCCESS returned in 122ms.",
      badge: "200 OK",
      badgeColor: "bg-emerald-950/40 text-emerald-400 border-emerald-900/35"
    },
    deniedPath: {
      action: "UPDATE",
      role: "Employee",
      detail: "Error payload compiled. Status 403 Forbidden returned in 8ms.",
      badge: "403 ERROR",
      badgeColor: "bg-red-950/40 text-red-400 border-red-900/35"
    },
    code: `// backend/src/crud/sanitizeRead.js
export function sanitizeRead(doc, policyRules) {
  const cleaned = doc.toObject();
  delete cleaned.__v;
  for (const field of policyRules.hiddenFields) {
    delete cleaned[field];
  }
  return cleaned;
}`
  },
];

const stepConsoleLogs = {
  1: [
    "[trace-tracer] Allocating trace headers...",
    "[trace-tracer] Performance high-res timer started (+0.02ms)",
    "[trace-tracer] Trace IDs assigned to requests"
  ],
  2: [
    "[auth-middleware] Fetching Authorization Bearer token...",
    "[auth-middleware] Verifying cryptographic JWT signature...",
    "[auth-middleware] Auditing user session token fingerprint..."
  ],
  3: [
    "[multer-config] Checking multipart headers...",
    "[multer-config] Multipart stream not found, skipping buffers..."
  ],
  4: [
    "[populate-helper] Initializing transaction queues...",
    "[request-queue] Lock reservation requested...",
    "[request-queue] Task successfully enqueued in pool thread"
  ],
  5: [
    "[filter-parser] Checking operators...",
    "[mongo-compiler] Compiling filter syntax rules...",
    "[mongo-compiler] Data injection audit: PASS"
  ],
  6: [
    "[policy-engine] Querying role permissions registry...",
    "[policy-engine] Auditing ownership constraints...",
    "[policy-engine] RUNNING RBAC & FBAC VERDICTS..."
  ],
  7: [
    "[lifecycle-hooks] Resolving pre-query hooks...",
    "[lifecycle-hooks] Firing beforeRead ticket triggers..."
  ],
  8: [
    "[query-builder] Compiling Mongoose MongoDB driver parameters...",
    "[query-builder] Executing DB query cursor fetch..."
  ],
  9: [
    "[audit-logger] Opening write stream for audit trail ledger...",
    "[audit-logger] Ledger transaction committed to Mongo successfully"
  ],
  10: [
    "[sanitizer] Stripping MongoDB document schema values (__v)...",
    "[sanitizer] Masking restricted query fields...",
    "[api-hit-logger] Finalizing pipeline latency response timer..."
  ]
};

function StepCard({ step, isActive, isPassed, isRevealed, isDeniedBlocked, isUnlocked, onHeaderClick }) {
  const [loadingState, setLoadingState] = useState("idle"); // idle, loading, loaded
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    if (isUnlocked && isActive) {
      setLoadingState("loading");
      const timer = setTimeout(() => {
        setLoadingState("loaded");
      }, 900); // Simulated "loading" trace ID phase
      return () => clearTimeout(timer);
    } else {
      setLoadingState("idle");
    }
  }, [isActive, isUnlocked]);

  // Auto-expand code block when active and loaded
  useEffect(() => {
    if (isActive && loadingState === "loaded") {
      setShowCode(true);
    }
  }, [isActive, loadingState]);

  useEffect(() => {
    if (!isUnlocked) {
      setShowCode(false);
    }
  }, [isUnlocked]);

  const logs = stepConsoleLogs[step.stepNum] || [];

  return (
    <div
      className={`transition-all duration-500 border rounded-[24px] p-5 shadow-xl relative overflow-hidden ${!isUnlocked
          ? "bg-slate-950/20 border-slate-950/40 opacity-20 scale-95 select-none pointer-events-none"
          : isActive
            ? "bg-slate-900/80 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.25)] scale-[1.01] opacity-100"
            : isPassed
              ? "bg-slate-900/40 border-slate-900/60 opacity-60 hover:opacity-80 scale-98"
              : "bg-slate-950/40 border-slate-900/60 opacity-30 hover:opacity-50 scale-98"
        }`}
    >
      {/* Locked overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center z-10">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-500 font-bold text-[10px] uppercase tracking-wider">
            <Lock size={12} />
            Conduit Offline
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Stage Header - Clickable to scroll to step */}
        <div
          onClick={() => {
            if (isUnlocked && !isActive && onHeaderClick) {
              onHeaderClick(step.stepNum);
            }
          }}
          className={`flex justify-between items-center gap-4 ${isUnlocked && !isActive ? "cursor-pointer select-none" : ""
            }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 bg-slate-950 border border-white/5 rounded-xl transition-colors ${isActive ? "text-indigo-400" : isPassed ? "text-emerald-400" : "text-slate-500"
              }`}>
              {step.icon}
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                Stage {step.stepNum} of 10
              </span>
              <h4 className="text-sm font-black text-white mt-0.5">{step.title}</h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isUnlocked && (
              <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors ${isActive
                  ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/35"
                  : isPassed
                    ? step.stepNum >= 6 && isDeniedBlocked
                      ? "bg-red-950/40 text-red-400 border-red-900/35"
                      : "bg-emerald-950/40 text-emerald-400 border-emerald-900/35"
                    : "bg-slate-950 border-slate-900 text-slate-600"
                }`}>
                {isActive
                  ? "ACTIVE"
                  : isPassed
                    ? step.stepNum >= 6
                      ? "B: BLOCKED"
                      : "PASSED"
                    : "LOCKED"}
              </span>
            )}
          </div>
        </div>

        {/* Collapsible Content */}
        <Motion.div
          initial={false}
          animate={{
            height: isRevealed ? "auto" : 0,
            opacity: isRevealed ? 1 : 0
          }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="space-y-4 pt-4 border-t border-white/5">
            {/* Associated Files */}
            <div className="flex flex-wrap gap-1.5">
              {step.files.map((file) => (
                <span key={file} className="rounded bg-slate-950 border border-white/5 px-2 py-0.5 font-mono text-[8px] text-indigo-350">
                  {file}
                </span>
              ))}
            </div>

            {/* Live Tracing Simulator Mockup (Loading Phase) */}
            {isActive && (
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 font-mono text-[10px] space-y-1 shadow-inner min-h-[90px] flex flex-col justify-center">
                <div className="flex items-center justify-between text-slate-500 border-b border-white/5 pb-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                    <span className="ml-1 text-[8px] uppercase tracking-wider font-bold text-slate-400">
                      Live Trace Logger
                    </span>
                  </div>
                  <span className="text-[7.5px] text-indigo-400/70 uppercase">
                    {loadingState === "loading" ? "Analyzing..." : "Trace Cached"}
                  </span>
                </div>

                {loadingState === "loading" ? (
                  <div className="space-y-1 text-indigo-300">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span className="animate-pulse">{logs[0]}</span>
                    </div>
                    <div className="text-slate-500 text-[9px] animate-pulse pl-4.5">
                      Verifying transaction state ....
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 animate-fadeIn">
                    {logs.map((log, lIdx) => (
                      <div key={lIdx} className="text-indigo-400/90 flex items-center gap-1">
                        <span className="text-slate-650 font-bold">&gt;</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Main Details (Only revealed when loaded or when not active) */}
            {loadingState !== "loading" && (
              <div className="space-y-4 animate-fadeIn">
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  {step.desc}
                </p>

                {/* Path details */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Path A */}
                  <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4 space-y-2 relative overflow-hidden">
                    <div className="flex justify-between items-center border-b border-emerald-500/10 pb-1.5">
                      <span className="text-[9px] font-black text-emerald-400 flex items-center gap-1">
                        <CheckCircle size={10} />
                        REQUEST A (ALLOWED)
                      </span>
                      <span className={`text-[7px] font-bold font-mono px-1.5 py-0.5 rounded border ${step.allowedPath.badgeColor}`}>
                        {step.allowedPath.badge}
                      </span>
                    </div>
                    <p className="text-[9.5px] font-mono text-slate-350 leading-normal">
                      {step.allowedPath.detail}
                    </p>
                    <div className="text-[7.5px] text-slate-500">
                      Role: <span className="text-slate-400">{step.allowedPath.role}</span> | Action: <span className="text-slate-400">{step.allowedPath.action}</span>
                    </div>
                  </div>

                  {/* Path B */}
                  <div className={`border rounded-2xl p-4 space-y-2 relative overflow-hidden transition-all duration-300 ${isDeniedBlocked
                      ? "bg-slate-950/40 border-slate-900/60 opacity-40 text-slate-650"
                      : step.stepNum === 6
                        ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                        : "bg-red-500/5 border-red-500/15 text-red-400"
                    }`}>
                    {step.stepNum === 6 && (
                      <div className="absolute inset-0 bg-red-950/5 pointer-events-none border border-red-500/20" />
                    )}

                    <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                      <span className={`text-[9px] font-black flex items-center gap-1 ${isDeniedBlocked ? "text-slate-500" : "text-red-400"}`}>
                        {step.stepNum === 6 ? <ShieldAlert size={10} /> : <XCircle size={10} />}
                        REQUEST B (DENIED)
                      </span>
                      <span className={`text-[7px] font-bold font-mono px-1.5 py-0.5 rounded border ${isDeniedBlocked ? "bg-slate-950 border-slate-900 text-slate-600" : step.deniedPath.badgeColor
                        }`}>
                        {isDeniedBlocked ? "TERMINATED" : step.deniedPath.badge}
                      </span>
                    </div>
                    <p className="text-[9.5px] font-mono text-slate-350 leading-normal">
                      {step.deniedPath.detail}
                    </p>
                    <div className="text-[7.5px] text-slate-500">
                      Role: <span className="text-slate-400">{step.deniedPath.role}</span> | Action: <span className="text-slate-400">{step.deniedPath.action}</span>
                    </div>
                  </div>
                </div>

                {/* Code Block toggle section */}
                <div className="pt-2 border-t border-white/5">
                  <button
                    onClick={() => setShowCode(!showCode)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    {showCode ? (
                      <>
                        <ChevronUp size={12} />
                        Hide Implementation Code Routine
                      </>
                    ) : (
                      <>
                        <ChevronDown size={12} />
                        Inspect Implementation Code Routine
                      </>
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {showCode && (
                      <Motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden mt-2.5"
                      >
                        <CodeBlock code={step.code} />
                      </Motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </Motion.div>
      </div>
    </div>
  );
}

export default function RequestJourney() {
  const sectionRef = useRef(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [activeState, setActiveState] = useState(0);
  const [maxState, setMaxState] = useState(0);
  const [scrollContainer, setScrollContainer] = useState(null);

  const isInitializedRef = useRef(isInitialized);
  const activeStateRef = useRef(activeState);
  const maxStateRef = useRef(maxState);

  useEffect(() => {
    isInitializedRef.current = isInitialized;
  }, [isInitialized]);

  useEffect(() => {
    activeStateRef.current = activeState;
  }, [activeState]);

  useEffect(() => {
    maxStateRef.current = maxState;
  }, [maxState]);

  useEffect(() => {
    const mainEl = document.querySelector('main.overflow-y-auto');
    if (mainEl) {
      setScrollContainer(mainEl);
    }
  }, []);

  // Set up scroll hooks targeting the entire timeline container inside the custom scrollable main container
  const { scrollYProgress } = useScroll({
    container: scrollContainer ? { current: scrollContainer } : undefined,
    target: sectionRef,
    offset: ["start start", "end end"]
  });

  // Calculate packet positions. They travel from 5% to 95% of the conduit height.
  // When not initialized, they park at 5% (starting gate).
  const allowedYProgress = useTransform(scrollYProgress, (latest) => {
    if (!isInitializedRef.current) return "5%";
    if (latest < 0.05) return "5%";
    const pct = 5 + ((latest - 0.05) / 0.95) * 90;
    return `${pct}%`;
  });

  const deniedYProgress = useTransform(scrollYProgress, (latest) => {
    if (!isInitializedRef.current) return "5%";
    if (latest < 0.05) return "5%";
    if (latest >= 0.55) return "55.5%";
    const pct = 5 + ((latest - 0.05) / 0.50) * 50.5;
    return `${pct}%`;
  });

  // Detect which step card is active
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const isInit = isInitializedRef.current;
    const currentActive = activeStateRef.current;

    if (!isInit) {
      if (currentActive !== 0) {
        setActiveState(0);
        activeStateRef.current = 0;
        setMaxState(0);
        maxStateRef.current = 0;
      }
      return;
    }
    let state = 0;
    if (latest >= 0.05) {
      const stepProgress = (latest - 0.05) / 0.95;
      const stepIdx = Math.min(9, Math.max(0, Math.floor(stepProgress * 10)));
      state = stepIdx + 1;
    }
    if (state !== currentActive) {
      setActiveState(state);
      activeStateRef.current = state;
      if (state > maxStateRef.current) {
        setMaxState(state);
        maxStateRef.current = state;
      }
    }
  });

  const isBAtGate = isInitialized && activeState >= 6;

  const scrollToStep = (stepNum) => {
    const mainEl = document.querySelector('main.overflow-y-auto');
    if (!mainEl || !sectionRef.current) return;

    const sectionTop = sectionRef.current.offsetTop;
    const containerHeight = mainEl.clientHeight;
    const sectionHeight = sectionRef.current.offsetHeight;

    let targetProgress = 0;
    if (stepNum > 0) {
      targetProgress = 0.05 + (stepNum - 0.5) * 0.095;
    } else {
      targetProgress = 0;
    }

    const targetScrollTop = sectionTop + targetProgress * (sectionHeight - containerHeight);

    mainEl.scrollTo({
      top: targetScrollTop,
      behavior: "smooth"
    });
  };

  const handleInitialize = () => {
    setIsInitialized(true);
    isInitializedRef.current = true;
    setActiveState(1);
    activeStateRef.current = 1;
    setMaxState(1);
    maxStateRef.current = 1;
    setTimeout(() => {
      scrollToStep(1);
    }, 150);
  };

  const handleReset = () => {
    setIsInitialized(false);
    isInitializedRef.current = false;
    setActiveState(0);
    activeStateRef.current = 0;
    setMaxState(0);
    maxStateRef.current = 0;
    scrollToStep(0);
  };

  return (
    <section ref={sectionRef} className="relative w-full">
      {/* Scroll-Linked Grid Layout */}
      <div className="grid md:grid-cols-12 gap-8 md:items-stretch items-start relative">

        {/* Left Column: Sticky conduit tracks simulator */}
        <div className="col-span-12 md:col-span-4 lg:col-span-5 sticky top-[60px] md:top-[110px] h-[320px] md:h-full z-20">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-900 rounded-[28px] p-5 h-full flex flex-col justify-between shadow-2xl relative">

            {/* LED Status Board */}
            <div className="w-full bg-slate-950 border border-slate-900 rounded-2xl p-4 font-mono text-[9px] space-y-2.5">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-500 uppercase tracking-widest font-black">Conduit Status Panel</span>
                <span className={`inline-flex items-center gap-1 font-bold ${isInitialized ? "text-emerald-400" : "text-amber-400"
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isInitialized ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  {isInitialized ? "ONLINE" : "STANDBY"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[8.5px]">
                <div className="space-y-1">
                  <span className="text-slate-500 block">TRACE A (ALLOWED)</span>
                  <span className={`font-semibold ${isInitialized ? "text-emerald-400" : "text-slate-500"}`}>
                    {isInitialized ? "trace-allowed-123" : "N/A"}
                  </span>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-slate-500 block">TRACE B (DENIED)</span>
                  <span className={`font-semibold ${isBAtGate ? "text-red-500" : isInitialized ? "text-red-400/80" : "text-slate-500"
                    }`}>
                    {isBAtGate ? "BLOCKED 403" : isInitialized ? "trace-denied-456" : "N/A"}
                  </span>
                </div>
              </div>

              {isInitialized && (
                <div className="border-t border-white/5 pt-2 text-slate-500 flex justify-between items-center">
                  <span>ACTIVE STEP: {activeState} / 10</span>
                  <span>
                    LATENCY:{" "}
                    {activeState < 6
                      ? "Calculating..."
                      : activeState < 10
                        ? "B: 8ms | A: Running..."
                        : "B: 8ms | A: 122ms"}
                  </span>
                </div>
              )}
            </div>

            {/* Vertical Pipelines */}
            <div className="relative w-full flex-1 flex justify-center py-6 my-4 min-h-[160px] md:min-h-0 bg-slate-950/40 rounded-2xl border border-slate-900/60 overflow-hidden">

              {/* Pipeline guide lines */}
              <div className="absolute left-[30%] top-6 bottom-6 w-1 bg-slate-950 rounded shadow-inner" />
              <div className="absolute left-[70%] top-6 bottom-6 w-1 bg-slate-950 rounded shadow-inner" />

              {/* Glowing flows based on initialization */}
              {isInitialized && (
                <>
                  <div className="absolute left-[30%] top-6 bottom-6 w-1 bg-emerald-500/20 rounded" />
                  <div className="absolute left-[70%] top-6 bottom-6 w-1 bg-red-500/20 rounded" />
                </>
              )}

              {/* Step indicator ticks */}
              <div className="absolute inset-y-6 left-0 right-0 flex flex-col justify-between items-center pointer-events-none z-10">
                {steps.map((s, idx) => {
                  const stepStateIdx = idx + 1;
                  const isActive = isInitialized && stepStateIdx === activeState;
                  return (
                    <div
                      key={s.stepNum}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono text-[9px] font-black transition-all duration-300 ${isActive
                          ? "bg-indigo-600 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.6)] scale-110"
                          : isInitialized && stepStateIdx < activeState
                            ? "bg-slate-900 border-indigo-950 text-indigo-400"
                            : "bg-slate-950 border-slate-900 text-slate-600"
                        }`}
                    >
                      {s.stepNum}
                    </div>
                  );
                })}
              </div>

              {/* Firewall Shield Gate Barrier at Step 6 (55.5%) */}
              <div className="absolute left-0 right-0 top-[55.5%] -translate-y-1/2 h-[3px] z-15 pointer-events-none">
                <div className={`absolute inset-0 bg-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-opacity duration-300 ${isInitialized && activeState >= 6 ? "opacity-100" : "opacity-20"
                  }`} />
                {isBAtGate && (
                  <Motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "100%", opacity: 1 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500 to-transparent flex items-center justify-center"
                  >
                    <span className="text-[6px] font-mono font-black text-white bg-red-600 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(239,68,68,0.8)] -translate-y-1.5 uppercase tracking-wider flex items-center gap-0.5 animate-pulse">
                      <ShieldAlert size={6} /> Shield Active
                    </span>
                  </Motion.div>
                )}
              </div>

              {/* Pulsing visual blast when red packet hit gate */}
              {isBAtGate && (
                <Motion.div
                  initial={{ scale: 0.6, opacity: 0.8 }}
                  animate={{ scale: [1, 2.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.6 }}
                  className="absolute left-[70%] top-[55.5%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-red-500/20 border border-red-500/60 z-10 pointer-events-none"
                />
              )}

              {/* Traveling Packets */}
              {/* Packet A (Allowed) */}
              <Motion.div
                style={{ top: allowedYProgress }}
                className={`absolute left-[30%] -translate-x-1/2 w-4.5 h-4.5 rounded-full z-20 flex items-center justify-center text-[8px] font-black shadow-lg transition-colors duration-300 ${isInitialized
                    ? "bg-emerald-500 text-slate-950 shadow-emerald-500/40"
                    : "bg-slate-800 text-slate-500"
                  }`}
              >
                A
              </Motion.div>

              {/* Packet B (Denied) */}
              <Motion.div
                style={{ top: deniedYProgress }}
                className={`absolute left-[70%] -translate-x-1/2 w-4.5 h-4.5 rounded-full z-20 flex items-center justify-center text-[8px] font-black shadow-lg transition-colors duration-300 ${isBAtGate
                    ? "bg-red-600 text-white shadow-red-600/75 scale-110"
                    : isInitialized
                      ? "bg-red-400 text-slate-950 shadow-red-400/40"
                      : "bg-slate-800 text-slate-500"
                  }`}
              >
                {isBAtGate ? <Lock size={9} className="stroke-[3]" /> : "B"}
              </Motion.div>

            </div>

            {/* Path Labels */}
            <div className="flex justify-between w-full border-t border-white/5 pt-3 text-[8px] text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isInitialized ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-slate-800"}`} />
                Conduit A (Allowed)
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isBAtGate ? "bg-red-600 animate-ping" : isInitialized ? "bg-red-400" : "bg-slate-800"}`} />
                Conduit B (Denied)
              </span>
            </div>

          </div>
        </div>

        {/* Right Column: Sticky interactive storytelling timeline */}
        <div className="col-span-12 md:col-span-8 lg:col-span-7 pr-2 space-y-4 pb-12 scroll-smooth">

          {/* Card 0: Request Creator Console */}
          <div
            className={`transition-all duration-500 border rounded-[24px] p-5 md:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md ${activeState === 0
                ? "bg-slate-900/80 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.25)] scale-[1.01] opacity-100"
                : "bg-slate-950/40 border-slate-900/60 opacity-40 hover:opacity-60 scale-98"
              }`}
          >
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-500/5 blur-[60px] pointer-events-none" />

            {/* Header is always visible */}
            <div
              onClick={() => {
                if (isInitialized && activeState !== 0) {
                  scrollToStep(0);
                }
              }}
              className={`flex justify-between items-center gap-4 ${isInitialized && activeState !== 0 ? "cursor-pointer select-none" : ""
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 bg-slate-950 border border-white/5 rounded-xl transition-colors ${activeState === 0 ? "text-indigo-400" : "text-slate-500"
                  }`}>
                  <Terminal size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                    Simulator Control
                  </span>
                  <h3 className="text-sm font-black text-white mt-0.5">
                    🏁 Starting Gate Console
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isInitialized && activeState !== 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white font-bold text-[8px] cursor-pointer transition-colors"
                  >
                    <RefreshCw size={8} />
                    Reset
                  </button>
                )}
                <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 rounded border ${isInitialized
                    ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/35"
                    : "bg-amber-950/40 text-amber-400 border-amber-900/35"
                  }`}>
                  {isInitialized ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
            </div>

            {/* Collapsible Content */}
            <Motion.div
              initial={false}
              animate={{
                height: (activeState === 0 || isInitialized) ? "auto" : 0,
                opacity: (activeState === 0 || isInitialized) ? 1 : 0
              }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-4 border-t border-white/5">
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  The Populate Engine orchestrates dynamic queries safely. Let's send two parallel requests down the channels. Click initialize to launch packets A and B and scroll down to step through the trace checks.
                </p>

                {/* Requests Payload Details */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Payload A */}
                  <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 space-y-2">
                    <span className="text-[8.5px] font-black text-emerald-400 tracking-wider block uppercase border-b border-white/5 pb-1">
                      Request A payload details
                    </span>
                    <div className="font-mono text-[9.5px] text-slate-400 space-y-1">
                      <div><span className="text-indigo-400">GET</span> /api/populate/tickets</div>
                      <div>Role: <span className="text-emerald-400">Manager</span></div>
                      <div>Query: <span className="text-slate-300">{"{ status: 'Open' }"}</span></div>
                      <div className="text-[8px] text-emerald-500/80 mt-1 flex items-center gap-1 font-sans">
                        <Wifi size={10} /> Route targets reading ticket collections
                      </div>
                    </div>
                  </div>

                  {/* Payload B */}
                  <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 space-y-2">
                    <span className="text-[8.5px] font-black text-red-400 tracking-wider block uppercase border-b border-white/5 pb-1">
                      Request B payload details
                    </span>
                    <div className="font-mono text-[9.5px] text-slate-400 space-y-1">
                      <div><span className="text-red-400">POST</span> /api/populate/tickets/status</div>
                      <div>Role: <span className="text-red-400">Employee</span></div>
                      <div>Query: <span className="text-slate-300">{"{ status: 'Resolved' }"}</span></div>
                      <div className="text-[8px] text-red-500/80 mt-1 flex items-center gap-1 font-sans">
                        <WifiOff size={10} /> Route targets updating administrative status
                      </div>
                    </div>
                  </div>
                </div>

                {/* Launch Action */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {!isInitialized ? (
                    <button
                      onClick={handleInitialize}
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 cursor-pointer group transition-all"
                    >
                      <Play size={14} className="group-hover:scale-110 transition-transform" />
                      Initialize Requests Conduit
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white font-bold text-xs cursor-pointer transition-colors"
                      >
                        <RefreshCw size={12} />
                        Reset Simulator
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono animate-pulse">
                        Conduit active! Scroll down to travel &gt;
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Motion.div>
          </div>

          {/* Timeline Step Cards */}
          <div className="space-y-4">
            {steps.map((step, idx) => {
              const stepStateIdx = idx + 1;
              return (
                <div
                  key={step.stepNum}
                  className="scroll-mt-36"
                >
                  <StepCard
                    step={step}
                    isActive={isInitialized && stepStateIdx === activeState}
                    isPassed={isInitialized && activeState > stepStateIdx}
                    isRevealed={isInitialized && stepStateIdx <= maxState}
                    isDeniedBlocked={idx >= 6} // Blocked starting Step 7
                    isUnlocked={isInitialized}
                    onHeaderClick={scrollToStep}
                  />
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}