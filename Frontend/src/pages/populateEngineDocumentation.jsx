import React, { useState, useEffect, useRef } from "react";
import {
  MdLayers,
  MdInfoOutline,
  MdCode,
  MdBuild,
  MdBugReport,
  MdSecurity,
  MdArrowForward,
  MdCheck,
  MdContentCopy,
  MdChevronRight,
  MdTimeline,
  MdAssignment,
  MdWorkspacePremium,
  MdStorage,
  MdApi,
  MdShield,
  MdTerminal,
} from "react-icons/md";

const CodeBlock = ({ code, language = "javascript" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mt-3 rounded-2xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs text-slate-100 overflow-x-auto group shadow-inner">
      <pre>{code}</pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/40 text-slate-400 hover:text-slate-200 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
        title="Copy code"
      >
        {copied ? <MdCheck className="text-emerald-400 text-sm" /> : <MdContentCopy className="text-sm" />}
      </button>
    </div>
  );
};

const ScrollRevealSection = ({ children, id }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      id={id}
      className={`transform transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
    >
      {children}
    </div>
  );
};

const SectionCard = ({ icon: Icon, title, description, children }) => (
  <div className="bg-gradient-to-br from-slate-50/50 to-slate-50/30 dark:from-slate-800/30 dark:to-slate-900/30 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-6 md:p-8 space-y-4 hover:border-slate-300/50 dark:hover:border-slate-600/50 transition-all duration-300">
    <div className="flex items-start gap-3">
      <div className="p-2 bg-indigo-600/10 dark:bg-indigo-500/10 rounded-xl">
        <Icon className="text-indigo-600 dark:text-indigo-400 text-xl" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
      </div>
    </div>
    {children && <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/50">{children}</div>}
  </div>
);

const LifecycleStep = ({ number, title, description, points }) => (
  <div className="flex gap-4 pb-6 last:pb-0">
    <div className="flex-shrink-0">
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-600/20 dark:bg-indigo-500/20 border border-indigo-500/40">
        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{number}</span>
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">{title}</h4>
      <p className="text-xs text-slate-600 dark:text-slate-400 leading-5 mb-2">{description}</p>
      {points && (
        <ul className="space-y-1">
          {points.map((point, idx) => (
            <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex gap-2">
              <MdChevronRight className="flex-shrink-0 mt-0.5 text-indigo-500" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

const TabGroup = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200/50 dark:border-slate-700/50 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs.find((t) => t.id === activeTab)?.content}</div>
    </div>
  );
};

export default function PopulateEngineDocumentation() {
  const navItems = [
    { id: "overview", label: "Overview", icon: MdLayers },
    { id: "lifecycle", label: "Request Lifecycle", icon: MdTimeline },
    { id: "frontend", label: "Frontend Guide", icon: MdCode },
    { id: "backend", label: "Backend Guide", icon: MdTerminal },
    { id: "building", label: "Building Features", icon: MdBuild },
    { id: "newmodel", label: "New Model Setup", icon: MdAssignment },
    { id: "policies", label: "Access Policies", icon: MdShield },
    { id: "debugging", label: "Debugging", icon: MdBugReport },
  ];

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
      {/* Force parent scroll wrapper to allow sticky positioning and remove margins */}
      <style>{`
        .lmx-content {
          overflow: visible !important;
          padding: 0 !important;
          max-width: 100% !important;
        }
      `}</style>

      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-fuchsia-500/10 dark:bg-fuchsia-500/5 blur-3xl" />
      </div>

      <div className="relative w-full">
        {/* Header */}
        <div className="relative z-10 bg-white/85 dark:bg-slate-950/85 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-5 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/20 rounded-xl">
                <MdApi className="text-indigo-600 dark:text-indigo-400 text-2xl" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Populate Engine</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Unified API Architecture Guide</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                System Running
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Sticky Quick-Links Menu */}
        <div className="sticky top-0 z-40 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md py-3 border-b border-slate-200 dark:border-slate-800/60 flex items-center gap-2 overflow-x-auto scrollbar-none px-6 md:px-8">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap mr-2">Jump to:</span>
          <div className="flex gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-indigo-650 hover:text-white dark:hover:bg-indigo-600 transition-all duration-200"
                >
                  <Icon className="text-sm" />
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>

        {/* Main Content (Single-Scroll Container utilizing full width) */}
        <div className="w-full bg-white/75 dark:bg-slate-900/60 backdrop-blur-lg border-y border-slate-200 dark:border-slate-800/80 py-8 px-6 md:px-8 space-y-12 pb-20">

          {/* OVERVIEW */}
          <div id="overview" className="scroll-mt-28">
            <ScrollRevealSection id="overview-intro">
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <MdLayers className="text-indigo-600 dark:text-indigo-400" />
                    The Populate Engine
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    A unified, metadata-driven API architecture that handles CREATE, READ, UPDATE, DELETE, and REPORT operations across all models. Built on a foundation of secure filtering, policy-based access control, and race-condition prevention.
                  </p>
                </div>

                <SectionCard
                  icon={MdWorkspacePremium}
                  title="Core Philosophy"
                  description="Centralized business logic, decentralized policy enforcement"
                >
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-900 dark:text-white">Single Entry Point</p>
                      <p className="text-slate-600 dark:text-slate-400">All CRUD operations flow through `/populate/*` endpoints with consistent payload structures.</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-900 dark:text-white">Dynamic Policy Engine</p>
                      <p className="text-slate-600 dark:text-slate-400">Role-based (RBAC) + Fine-grained (FBAC) access control evaluated at request time.</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-900 dark:text-white">NoSQL-Safe Filtering</p>
                      <p className="text-slate-600 dark:text-slate-400">User filters are tokenized, parsed, and compiled to prevent injection attacks.</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-900 dark:text-white">Automatic Auditing</p>
                      <p className="text-slate-600 dark:text-slate-400">All mutations are logged with trace IDs for compliance and forensic debugging.</p>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </ScrollRevealSection>

            <ScrollRevealSection id="core-files" className="mt-8">
              <SectionCard icon={MdStorage} title="Core File Mapping" description="Where everything lives">
                <div className="space-y-3">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto">
                    <div className="space-y-2">
                      <p><span className="text-fuchsia-400">Routes</span> → backend/src/routes/<span className="text-emerald-400">populateRoutes.js</span></p>
                      <p><span className="text-fuchsia-400">Orchestration</span> → backend/src/helper/<span className="text-emerald-400">populateHelper.js</span></p>
                      <p><span className="text-fuchsia-400">Auth & Middleware</span> → backend/src/Controller/<span className="text-emerald-400">AuthController.js</span> + <span className="text-emerald-400">multerConfig.js</span></p>
                      <p><span className="text-fuchsia-400">Policy & Access</span> → backend/src/utils/policy/<span className="text-emerald-400">policyEngine.js</span> + registry/</p>
                      <p><span className="text-fuchsia-400">Data Safety</span> → backend/src/utils/<span className="text-emerald-400">filterParser.js</span>, <span className="text-emerald-400">mongoFilterCompiler.js</span></p>
                      <p><span className="text-fuchsia-400">CRUD Builders</span> → backend/src/crud/<span className="text-emerald-400">build*Query.js</span></p>
                      <p><span className="text-fuchsia-400">Logging & Trace</span> → backend/src/utils/<span className="text-emerald-400">requestTracer.js</span>, <span className="text-emerald-400">auditLogger.js</span></p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </ScrollRevealSection>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* REQUEST LIFECYCLE */}
          <div id="lifecycle" className="scroll-mt-28">
            <ScrollRevealSection id="lifecycle-intro">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <MdTimeline className="text-indigo-600 dark:text-indigo-400" />
                  Request Lifecycle
                </h2>

                <SectionCard
                  icon={MdTimeline}
                  title="The Complete Journey"
                  description="From browser to database and back"
                >
                  <div className="space-y-3">
                    <LifecycleStep
                      number="1"
                      title="Request Entry & Tracing"
                      description="Every request gets a unique Trace ID and performance timer"
                      points={[
                        "Assigned in requestTracer.js",
                        "Included in logs for correlation",
                        "Visible in error responses",
                      ]}
                    />
                    <LifecycleStep
                      number="2"
                      title="Authentication"
                      description="JWT validation and device session check via authMiddleware"
                      points={[
                        "Verifies token signature and expiry",
                        "Checks device fingerprint (x-device-uuid)",
                        "Populates req.user with user context",
                      ]}
                    />
                    <LifecycleStep
                      number="3"
                      title="File Upload Parsing"
                      description="If multipart/form-data, Multer intercepts and stores files"
                      points={[
                        "Files attached to req.files",
                        "Metadata preserved for business logic",
                      ]}
                    />
                    <LifecycleStep
                      number="4"
                      title="Orchestration"
                      description="populateHelper.js routes to the correct action (read/create/update/delete/report)"
                      points={[
                        "Parses action from route",
                        "Enqueues in requestQueue.js for concurrency control",
                        "Extracts device fingerprint",
                      ]}
                    />
                    <LifecycleStep
                      number="5"
                      title="Data Parsing & Sanitization"
                      description="User input is tokenized, validated, and compiled safely"
                      points={[
                        "filterParser tokenizes user filters",
                        "mongoFilterCompiler prevents NoSQL injection",
                        "sanitizeWrite/Update validates payload shape",
                      ]}
                    />
                    <LifecycleStep
                      number="6"
                      title="Policy Evaluation"
                      description="Access control checks at role and field level"
                      points={[
                        "RBAC: Check user role permissions",
                        "FBAC: Check field-level access rules from registry/",
                        "Returns 403 if denied",
                      ]}
                    />
                    <LifecycleStep
                      number="7"
                      title="Business Logic & Hooks"
                      description="Execute before* hooks, apply race-condition locks for updates"
                      points={[
                        "beforeCreate/beforeUpdate from services/",
                        "raceConditionHandler applies optimistic locks",
                        "Can mutate or reject the request",
                      ]}
                    />
                    <LifecycleStep
                      number="8"
                      title="Database Mutation"
                      description="CRUD query builder executes Mongoose operation with policy filters baked in"
                      points={[
                        "buildReadQuery/buildCreateQuery/etc.",
                        "Policy filters automatically injected",
                        "Populated fields optimized to prevent N+1",
                      ]}
                    />
                    <LifecycleStep
                      number="9"
                      title="Audit & Post-Processing"
                      description="Mutations logged, afterCreate/afterUpdate hooks run"
                      points={[
                        "auditLogger records who changed what",
                        "afterCreate/afterUpdate can trigger side effects (emails, webhooks)",
                        "Trace ID included in audit record",
                      ]}
                    />
                    <LifecycleStep
                      number="10"
                      title="Response Sanitization & Return"
                      description="Data is cleaned and returned with status code"
                      points={[
                        "sanitizeRead removes sensitive fields",
                        "API Hit Logger records response time/size",
                        "Error handler catches any step failures",
                      ]}
                    />
                  </div>
                </SectionCard>
              </div>
            </ScrollRevealSection>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* FRONTEND GUIDE */}
          <div id="frontend" className="scroll-mt-28">
            <ScrollRevealSection id="frontend-intro">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <MdCode className="text-indigo-600 dark:text-indigo-400" />
                  Frontend Developer Guide
                </h2>

                <SectionCard
                  icon={MdCode}
                  title="Using the Populate API from React"
                  description="Best practices for consuming the backend"
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">1. Setup Your Axios Instance</h4>
                      <CodeBlock code={`// frontend/src/api/axiosInstance.js
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
    "x-device-uuid": localStorage.getItem("deviceId") || generateDeviceId(),
  },
});

// Auto-attach JWT from localStorage
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
});

// Handle 401 (token expired) globally
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("authToken");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;`} />
                    </div>

                    <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">2. Read Data (Query)</h4>
                      <CodeBlock code={`// Example: Fetch all tickets assigned to current user
const response = await axiosInstance.post("/populate/read/tickets", {
  filter: {
    assignedTo: { eq: userId }, // Safe filtering via filter parser
    status: { in: ["Open", "InProgress"] }
  },
  populateFields: {
    createdBy: "name email", // Nested population
    project: "name"
  },
  sort: { createdAt: -1 },
  page: 1,
  limit: 20
});

// Response: { success: true, data: [...], total: 42, type: "tickets" }
console.log(response.data.data);`} />
                    </div>

                    <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">3. Create Data</h4>
                      <CodeBlock code={`// Example: Create a new ticket
const response = await axiosInstance.post("/populate/create/tickets", {
  title: "Fix login bug",
  description: "Users report 401 after token refresh",
  project: projectId,
  assignedTo: userId,
  status: "Open"
});

// Returns the created document with _id
const newTicket = response.data.data;
console.log("Ticket created:", newTicket._id);`} />
                    </div>

                    <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">4. Update Data</h4>
                      <CodeBlock code={`// Example: Update ticket status
const response = await axiosInstance.post("/populate/update/tickets/:id", {
  status: "Resolved",
  resolvedAt: new Date().toISOString()
});

// Backend automatically:
// - Validates you have permission
// - Checks field-level access (can you edit status?)
// - Runs beforeUpdate hooks
// - Logs the change to Audit
// - Returns updated doc

console.log("Updated:", response.data.data);`} />
                    </div>

                    <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">5. Error Handling & Trace IDs</h4>
                      <CodeBlock code={`try {
  await axiosInstance.post("/populate/read/tickets", payload);
} catch (err) {
  const traceId = err.response?.data?.traceId;
  const message = err.response?.data?.message;
  
  console.error(\`[Trace: \${traceId}] \${message}\`);
  
  if (err.response?.status === 403) {
    showError("You don't have permission to access this");
  } else if (err.response?.status === 422) {
    showError(\`Validation error: \${message}\`);
  }
  
  // Share traceId with backend team for debugging
}`} />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  icon={MdInfoOutline}
                  title="Safe Filter Syntax"
                  description="How to query data without SQL injection risks"
                  className="mt-6"
                >
                  <CodeBlock code={`// Operators supported by mongoFilterCompiler:
const safeFilter = {
  // Comparison
  assignedTo: { eq: userId },           // Exact match
  age: { gte: 18, lte: 65 },           // Greater/less than
  status: { in: ["Open", "Active"] },  // Array membership
  
  // Text search
  title: { contains: "urgent" },       // Case-insensitive substring
  
  // Date ranges
  createdAt: { gte: startDate, lte: endDate },
  
  // Nested (with populateFields)
  project: { eq: projectId }
};`} />
                </SectionCard>

                <SectionCard icon={MdArrowForward} title="Common Patterns" description="Copy-paste ready snippets" className="mt-6">
                  <TabGroup
                    tabs={[
                      {
                        id: "usehook",
                        label: "Custom Hook",
                        content: (
                          <CodeBlock code={`// frontend/src/hooks/usePopulate.js
import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

export const usePopulate = (model, filter = {}, options = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axiosInstance.post(\`/populate/read/\${model}\`, {
          filter,
          ...options
        });
        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [model, JSON.stringify(filter)]);

  return { data, loading, error };
};`} />
                        ),
                      },
                      {
                        id: "form",
                        label: "Form Submit",
                        content: (
                          <CodeBlock code={`// Handle form submission safely
const handleCreateTicket = async (formData) => {
  try {
    setSubmitting(true);
    const { data } = await axiosInstance.post(
      "/populate/create/tickets",
      formData
    );
    showSuccess("Ticket created!");
    refetch(); // Refresh list
  } catch (err) {
    const errorMsg = err.response?.data?.message || "Failed to create";
    showError(errorMsg);
    console.error(\`[Trace: \${err.response?.data?.traceId}]\`, err);
  } finally {
    setSubmitting(false);
  }
};`} />
                        ),
                      },
                      {
                        id: "optimistic",
                        label: "Optimistic Update",
                        content: (
                          <CodeBlock code={`// Update UI immediately, revert on failure
const handleStatusChange = async (ticketId, newStatus) => {
  const original = ticketData.find(t => t._id === ticketId);
  
  // Update UI immediately
  setTicketData(ticketData.map(t =>
    t._id === ticketId ? { ...t, status: newStatus } : t
  ));

  try {
    await axiosInstance.post(\`/populate/update/tickets/\${ticketId}\`, {
      status: newStatus
    });
  } catch (err) {
    // Revert on error
    setTicketData(ticketData.map(t =>
      t._id === ticketId ? original : t
    ));
    showError("Failed to update status");
  }
};`} />
                        ),
                      },
                    ]}
                  />
                </SectionCard>
              </div>
            </ScrollRevealSection>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* BACKEND GUIDE */}
          <div id="backend" className="scroll-mt-28">
            <ScrollRevealSection id="backend-intro">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <MdTerminal className="text-indigo-600 dark:text-indigo-400" />
                  Backend Developer Guide
                </h2>

                <SectionCard
                  icon={MdTerminal}
                  title="Core Entry Points"
                  description="Where requests enter the system"
                >
                  <CodeBlock code={`// backend/src/routes/populateRoutes.js
router.post("/populate/:action/:model", 
  authMiddleware,      // 1. Verify JWT
  multerMiddleware,    // 2. Parse file uploads if any
  requestTracer,       // 3. Assign Trace ID
  populateHelper       // 4. Route to action
);

// populateHelper.js then:
// 1. Determines action (read|create|update|delete|report)
// 2. Enqueues in requestQueue.js
// 3. Delegates to policyEngine.js
// 4. Executes hooks from services/
// 5. Returns response with auditLog entry`} />
                </SectionCard>

                <SectionCard icon={MdBuild} title="The Service Lifecycle" description="Where business logic lives" className="mt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Create a Service File</h4>
                      <CodeBlock code={`// backend/src/services/tickets.js
export async function beforeCreate({ data, user, traceId }) {
  // Validate and mutate BEFORE database insert
  if (!data.title || data.title.trim().length === 0) {
    throw new Error("Title is required");
  }
  
  return {
    ...data,
    title: data.title.trim(),
    createdBy: user._id,
    status: "Open" // Default value
  };
}

export async function afterCreate({ doc, user, traceId }) {
  // Side effects AFTER successful insert
  
  // Example: Send email to assignee
  if (doc.assignedTo !== user._id) {
    await sendEmail({
      to: doc.assignedTo,
      subject: \`Ticket assigned: \${doc.title}\`,
      template: "ticket-assigned"
    });
  }
  
  // Example: Log custom event
  console.log(\`[Trace: \${traceId}] Ticket created\`, doc._id);
}

export async function beforeUpdate({ data, existingDoc, user }) {
  // Prevent certain fields from being edited
  if (existingDoc.status === "Resolved" && user.role === "Employee") {
    throw new Error("Cannot modify resolved tickets");
  }
  return data;
}

export async function afterUpdate({ doc, user, change }) {
  // change = { before, after } for audit purposes
  console.log("Updated fields:", Object.keys(change.after));
}`} />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={MdStorage} title="Working with Models" description="Mongoose integration patterns" className="mt-6">
                  <CodeBlock code={`// backend/src/models/Ticket.js
import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: { 
    type: String, 
    enum: ["Open", "InProgress", "Resolved", "Closed"],
    default: "Open"
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true 
  },
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  project: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project"
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Ticket", TicketSchema);`} />
                </SectionCard>

                <SectionCard icon={MdSecurity} title="Query Builders" description="Safe CRUD operations" className="mt-6">
                  <CodeBlock code={`// backend/src/crud/buildReadQuery.js
export async function buildReadQuery(model, filter, user, options = {}) {
  // 1. Apply policy filters (automatically restricts based on RBAC/FBAC)
  const policyFilters = await policyEngine.getReadFilters(model, user);
  const finalFilter = { ...filter, ...policyFilters };
  
  // 2. Compile user-provided filter safely
  const compiledFilter = mongoFilterCompiler.compile(finalFilter);
  
  // 3. Build Mongoose query
  let query = model.find(compiledFilter);
  
  // 4. Populate related fields efficiently
  const populateFields = options.populateFields || 
    defaultPopulateFields.get(model.name);
  for (const [field, select] of Object.entries(populateFields)) {
    query = query.populate(field, select);
  }
  
  // 5. Optimize projection to prevent N+1
  query = queryOptimizer.optimizePopulate(query);
  
  // 6. Sort, paginate, execute
  if (options.sort) query = query.sort(options.sort);
  if (options.skip) query = query.skip(options.skip);
  if (options.limit) query = query.limit(options.limit);
  
  return query.exec();
}`} />
                </SectionCard>

                <SectionCard
                  icon={MdArrowForward}
                  title="Manual Endpoint (Optional)"
                  description="When you need custom business logic beyond the Populate Engine"
                  className="mt-6"
                >
                  <CodeBlock code={`// backend/src/routes/customRoutes.js
router.post("/custom/generate-report/:ticketId", authMiddleware, async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // Custom logic that doesn't fit the populate pattern
    const ticket = await Ticket.findById(ticketId).populate("createdBy");
    
    // Generate PDF, etc.
    const pdf = await generateTicketPDF(ticket);
    
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdf);
  } catch (err) {
    errorHandler(err, req, res);
  }
});

// But for standard CRUD, use the Populate Engine!`} />
                </SectionCard>
              </div>
            </ScrollRevealSection>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* BUILDING FEATURES */}
          <div id="building" className="scroll-mt-28">
            <ScrollRevealSection id="building-intro">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <MdBuild className="text-indigo-600 dark:text-indigo-400" />
                  Building Features
                </h2>

                <SectionCard icon={MdBuild} title="Feature Development Workflow" description="Step-by-step to add a new capability">
                  <div className="space-y-4">
                    <LifecycleStep
                      number="1"
                      title="Define the Feature"
                      description="What data do you need to read/write? What are the access rules?"
                      points={[
                        "Sketch user stories",
                        "List required fields and validations",
                        "Define who can do what (RBAC/FBAC rules)",
                      ]}
                    />
                    <LifecycleStep
                      number="2"
                      title="Create/Update Model"
                      description="Add or extend a Mongoose model in backend/src/models/"
                      points={[
                        "Include all required fields with types",
                        "Add default values where appropriate",
                        "Include audit fields (createdAt, updatedAt, createdBy)",
                      ]}
                    />
                    <LifecycleStep
                      number="3"
                      title="Create/Update Service"
                      description="Add business logic hooks in backend/src/services/"
                      points={[
                        "Export beforeCreate, afterCreate, beforeUpdate, afterUpdate",
                        "Validate inputs",
                        "Trigger side effects (emails, webhooks, etc)",
                      ]}
                    />
                    <LifecycleStep
                      number="4"
                      title="Add Access Policy"
                      description="Define who can read/create/update in backend/src/utils/policy/"
                      points={[
                        "Add RBAC rules (manager can read all, employee only their own)",
                        "Add FBAC rules (certain roles can't edit certain fields)",
                        "Use registry/ functions for complex conditions",
                      ]}
                    />
                    <LifecycleStep
                      number="5"
                      title="Test via Postman"
                      description="Verify the API works before building the frontend"
                      points={[
                        "POST /populate/create/model with valid data",
                        "POST /populate/read/model with filters",
                        "POST /populate/update/model/:id with changes",
                        "Verify audit logs recorded correctly",
                      ]}
                    />
                    <LifecycleStep
                      number="6"
                      title="Build Frontend"
                      description="Create React components using usePopulate hook or axiosInstance"
                      points={[
                        "Forms for create/update",
                        "Tables/lists for read with filters",
                        "Error handling with trace IDs",
                      ]}
                    />
                    <LifecycleStep
                      number="7"
                      title="E2E Test"
                      description="Test full flow from UI to database to audit logs"
                      points={[
                        "Create record, verify in database",
                        "Update record, check beforeUpdate/afterUpdate hooks fired",
                        "Check audit logs contain the change with trace ID",
                        "Test permission denied scenarios (403)",
                      ]}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  icon={MdCode}
                  title="Real Example: Add a 'Comments' Feature"
                  description="Walk through adding comment functionality to tickets"
                  className="mt-6"
                >
                  <TabGroup
                    tabs={[
                      {
                        id: "model",
                        label: "1. Model",
                        content: (
                          <CodeBlock code={`// backend/src/models/Comment.js
const CommentSchema = new mongoose.Schema({
  ticket: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Ticket",
    required: true
  },
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  mentions: [{
    userId: mongoose.Schema.Types.ObjectId,
    name: String
  }],
  createdAt: { type: Date, default: Date.now }
});`} />
                        ),
                      },
                      {
                        id: "service",
                        label: "2. Service",
                        content: (
                          <CodeBlock code={`// backend/src/services/comments.js
export async function beforeCreate({ data, user }) {
  if (!data.content?.trim()) {
    throw new Error("Comment cannot be empty");
  }
  
  return {
    ...data,
    content: data.content.trim(),
    author: user._id
  };
}

export async function afterCreate({ doc, user }) {
  // Find mentioned users and send notifications
  const mentions = doc.mentions || [];
  for (const mention of mentions) {
    await sendNotification({
      userId: mention.userId,
      message: \`\${user.name} mentioned you in a comment\`
    });
  }
}`} />
                        ),
                      },
                      {
                        id: "policy",
                        label: "3. Policy",
                        content: (
                          <CodeBlock code={`// backend/src/utils/policy/commentPolicy.js
export const commentPolicy = {
  // Can read: anyone who can see the ticket
  read: async (user, doc) => {
    const ticket = await Ticket.findById(doc.ticket);
    return canReadTicket(user, ticket);
  },
  
  // Can create: anyone who can access the ticket
  create: async (user) => {
    return ["Employee", "Manager", "Admin"].includes(user.role);
  },
  
  // Can update own comments only
  update: async (user, doc) => {
    return doc.author.toString() === user._id.toString();
  },
  
  // Can delete own comments only
  delete: async (user, doc) => {
    return doc.author.toString() === user._id.toString();
  }
};`} />
                        ),
                      },
                      {
                        id: "frontend-section",
                        label: "4. Frontend",
                        content: (
                          <CodeBlock code={`// frontend/src/components/CommentSection.jsx
export function CommentSection({ ticketId }) {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const res = await axiosInstance.post(
        "/populate/create/comments",
        { ticket: ticketId, content }
      );
      setComments([...comments, res.data.data]);
      setContent("");
    } catch (err) {
      console.error("Failed:", err.response?.data?.traceId, err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea 
          value={content} 
          onChange={e => setContent(e.target.value)}
          placeholder="Add a comment..."
        />
        <button disabled={submitting}>{submitting ? "Posting..." : "Post"}</button>
      </form>
      {comments.map(c => <CommentCard key={c._id} comment={c} />)}
    </div>
  );
}`} />
                        ),
                      },
                    ]}
                  />
                </SectionCard>
              </div>
            </ScrollRevealSection>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* NEW MODEL SETUP */}
          <div id="newmodel" className="scroll-mt-28">
            <ScrollRevealSection id="newmodel-intro">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <MdAssignment className="text-indigo-600 dark:text-indigo-400" />
                  Initiating a New Model
                </h2>

                <SectionCard icon={MdAssignment} title="Complete Checklist" description="Everything needed to add a new entity type">
                  <div className="space-y-3">
                    <LifecycleStep
                      number="1"
                      title="Create the Mongoose Model"
                      description="backend/src/models/YourModel.js"
                      points={[
                        "Define schema with required fields",
                        "Add createdBy, createdAt, updatedAt for audit",
                        "Include references to related models",
                        "Set sensible defaults",
                      ]}
                    />
                    <LifecycleStep
                      number="2"
                      title="Create the Service File"
                      description="backend/src/services/yourmodel.js (lowercase plural)"
                      points={[
                        "Export beforeCreate, afterCreate, beforeUpdate, afterUpdate",
                        "Each receives { data/existingDoc, user, traceId }",
                        "Throw errors for validation failures",
                      ]}
                    />
                    <LifecycleStep
                      number="3"
                      title="Define Access Policy"
                      description="backend/src/utils/policy/yourmodelPolicy.js"
                      points={[
                        "Implement read, create, update, delete functions",
                        "Use RBAC for role-based checks",
                        "Use FBAC for field-level validation",
                        "Return true/false or throw 403 error",
                      ]}
                    />
                    <LifecycleStep
                      number="4"
                      title="Add to Policy Registry"
                      description="backend/src/utils/policy/registry/index.js"
                      points={[
                        "Import and register your policy",
                        "Pattern: policies['YourModel'] = yourmodelPolicy",
                      ]}
                    />
                    <LifecycleStep
                      number="5"
                      title="Configure Default Populate Fields"
                      description="backend/src/crud/defaultPopulateFields.js"
                      points={[
                        "Define which nested relations load by default",
                        "Example: { 'YourModel': { createdBy: 'name email' } }",
                        "Prevents N+1 query problems",
                      ]}
                    />
                    <LifecycleStep
                      number="6"
                      title="Create CRUD Query Builders (Optional)"
                      description="Only if custom read/create logic needed"
                      points={[
                        "backend/src/crud/buildYourModelReadQuery.js",
                        "Most models use the generic builder",
                        "Override only for complex filtering/aggregation",
                      ]}
                    />
                    <LifecycleStep
                      number="7"
                      title="Update Routes (Usually Auto)"
                      description="If populateRoutes.js uses dynamic routing, you're done"
                      points={[
                        "If manual: add POST /populate/:action/yourmodel routes",
                        "But the engine auto-discovers models in most setups",
                      ]}
                    />
                    <LifecycleStep
                      number="8"
                      title="Test with Postman"
                      description="Verify all CRUD operations work"
                      points={[
                        "POST /populate/create/yourmodels with valid data",
                        "POST /populate/read/yourmodels with various filters",
                        "POST /populate/update/yourmodels/:id with changes",
                        "Verify beforeCreate, afterCreate hooks ran",
                        "Check audit logs",
                      ]}
                    />
                  </div>
                </SectionCard>

                <SectionCard icon={MdCode} title="Template: New Model Setup" description="Copy-paste to get started" className="mt-6">
                  <TabGroup
                    tabs={[
                      {
                        id: "model-template",
                        label: "Model",
                        content: (
                          <CodeBlock code={`// backend/src/models/YourModel.js
import mongoose from "mongoose";

const YourModelSchema = new mongoose.Schema({
  // Core fields
  name: { type: String, required: true },
  description: String,
  status: { 
    type: String, 
    enum: ["Active", "Inactive"],
    default: "Active"
  },
  
  // Audit fields (required)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // Relations
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
});

export default mongoose.model("YourModel", YourModelSchema);`} />
                        ),
                      },
                      {
                        id: "service-template",
                        label: "Service",
                        content: (
                          <CodeBlock code={`// backend/src/services/yourmodels.js
import YourModel from "../models/YourModel.js";

export async function beforeCreate({ data, user }) {
  // Validate
  if (!data.name?.trim()) {
    throw new Error("Name is required");
  }
  
  return {
    ...data,
    name: data.name.trim(),
    createdBy: user._id
  };
}

export async function afterCreate({ doc, user }) {
  console.log(\`YourModel created: \${doc._id}\`);
  // Send emails, webhooks, etc
}

export async function beforeUpdate({ data, existingDoc, user }) {
  // Prevent certain users from changing certain fields
  return data;
}

export async function afterUpdate({ doc, change, user }) {
  console.log(\`YourModel updated: \${doc._id}\`);
}`} />
                        ),
                      },
                      {
                        id: "policy-template",
                        label: "Policy",
                        content: (
                          <CodeBlock code={`// backend/src/utils/policy/yourmodelPolicy.js
export const yourmodelPolicy = {
  read: async (user, doc) => {
    // Can read if: Admin, or creator, or owner
    if (user.role === "Admin") return true;
    if (doc.createdBy.toString() === user._id.toString()) return true;
    if (doc.owner?.toString() === user._id.toString()) return true;
    return false;
  },
  
  create: async (user) => {
    // Only certain roles can create
    return ["Manager", "Admin"].includes(user.role);
  },
  
  update: async (user, doc) => {
    // Can update if: Admin or creator
    if (user.role === "Admin") return true;
    if (doc.createdBy.toString() === user._id.toString()) return true;
    return false;
  },
  
  delete: async (user, doc) => {
    // Only creator or admin can delete
    if (user.role === "Admin") return true;
    if (doc.createdBy.toString() === user._id.toString()) return true;
    return false;
  },
  
  // Field-level access (optional)
  fieldAccess: {
    owner: async (user, action) => {
      // Only admins can assign owner
      return user.role === "Admin";
    }
  }
};`} />
                        ),
                      },
                      {
                        id: "registry-template",
                        label: "Register",
                        content: (
                          <CodeBlock code={`// backend/src/utils/policy/registry/index.js
// Add your policy to the registry

import { yourmodelPolicy } from "../yourmodelPolicy.js";

export const policies = {
  // ... existing policies ...
  YourModel: yourmodelPolicy
};

// The engine will auto-discover it based on model name!`} />
                        ),
                      },
                    ]}
                  />
                </SectionCard>
              </div>
            </ScrollRevealSection>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* ACCESS POLICIES */}
          <div id="policies" className="scroll-mt-28">
            <ScrollRevealSection id="policies-intro">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <MdShield className="text-indigo-600 dark:text-indigo-400" />
                  Access Policies (RBAC + FBAC)
                </h2>

                <SectionCard
                  icon={MdShield}
                  title="Understanding the Two-Layer System"
                  description="Granular, production-grade access control"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 space-y-2">
                      <h4 className="font-bold text-slate-900 dark:text-white">RBAC (Role-Based)</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Coarse-grained: "Can Admin users read Tickets?" Yes.
                      </p>
                      <CodeBlock code={`// Example RBAC check
if (user.role === "Admin") {
  // Can do anything
} else if (user.role === "Manager") {
  // Can read own team's tickets
} else if (user.role === "Employee") {
  // Can only read own tickets
}`} />
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 space-y-2">
                      <h4 className="font-bold text-slate-900 dark:text-white">FBAC (Field-Based)</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Fine-grained: "Can Manager edit the 'priority' field?" Maybe not.
                      </p>
                      <CodeBlock code={`// Example FBAC check
const canEditField = {
  status: (user) => ["Admin", "Manager"].includes(user.role),
  salary: (user) => user.role === "Admin",
  title: (user) => true // Everyone can edit
};`} />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={MdInfoOutline} title="Policy Structure" description="What a policy object looks like" className="mt-6">
                  <CodeBlock code={`// backend/src/utils/policy/ticketPolicy.js
export const ticketPolicy = {
  // READ: Who can fetch tickets?
  read: async (user, doc) => {
    // doc = the specific ticket being accessed
    
    // Admins can read all
    if (user.role === "Admin") return true;
    
    // Managers can read their team's tickets
    if (user.role === "Manager") {
      const teamMembers = await getTeamMembers(user._id);
      const memberIds = teamMembers.map(m => m._id.toString());
      return memberIds.includes(doc.createdBy.toString());
    }
    
    // Employees can only read tickets assigned to them
    return doc.assignedTo?.toString() === user._id.toString();
  },
  
  // CREATE: Who can create tickets?
  create: async (user) => {
    // Only Managers and Admins can create tickets
    return ["Manager", "Admin"].includes(user.role);
  },
  
  // UPDATE: Who can modify tickets?
  update: async (user, doc) => {
    if (user.role === "Admin") return true;
    if (user.role === "Manager") return true;
    // Employees can only update their own tickets
    return doc.createdBy.toString() === user._id.toString();
  },
  
  // DELETE: Who can remove tickets?
  delete: async (user, doc) => {
    // Only Admins can delete
    return user.role === "Admin";
  },
  
  // FIELD ACCESS: Who can edit specific fields?
  fieldAccess: {
    status: async (user, action) => {
      // Only Managers and Admins can change status
      return ["Manager", "Admin"].includes(user.role);
    },
    
    priority: async (user, action) => {
      // Admins only
      return user.role === "Admin";
    },
    
    assignedTo: async (user, action) => {
      // Managers and Admins can assign
      return ["Manager", "Admin"].includes(user.role);
    }
  }
};`} />
                </SectionCard>

                <SectionCard icon={MdArrowForward} title="Dynamic Conditions (Registry)" description="Complex logic using registry functions" className="mt-6">
                  <CodeBlock code={`// backend/src/utils/policy/registry/index.js
// Pre-built utility functions for complex rules

export const registry = {
  isSelf: (userId, targetId) => 
    userId.toString() === targetId.toString(),
  
  isManager: (user) =>
    ["Manager", "Admin"].includes(user.role),
  
  isAssigned: async (user, doc) =>
    doc.assignedTo?.toString() === user._id.toString(),
  
  isTeamMember: async (user, targetUser) => {
    const team = await getTeamOf(user._id);
    return team.members.some(m => m._id.equals(targetUser._id));
  },
  
  isProjectMember: async (user, projectId) => {
    const project = await Project.findById(projectId);
    return project.members.some(m => m.userId.equals(user._id));
  }
};

// Use in policies:
export const ticketPolicy = {
  read: async (user, doc) => {
    return await registry.isTeamMember(user, doc.createdBy);
  }
};`} />
                </SectionCard>

                <SectionCard
                  icon={MdCode}
                  title="How Policies Are Evaluated"
                  description="The evaluation flow during a request"
                  className="mt-6"
                >
                  <CodeBlock code={`// When frontend calls:
// POST /populate/read/tickets
// { filter: { status: "Open" } }

// Backend does:
// 1. Load policy for Ticket model
const policy = policies["Ticket"];

// 2. Evaluate read permission on EACH document
const userTickets = await Ticket.find({ status: "Open" });
const allowed = [];
for (const ticket of userTickets) {
  if (await policy.read(req.user, ticket)) {
    allowed.push(ticket);
  }
}

// 3. Return only allowed documents
return { data: allowed };

// 4. For writes, also check field-level access
if (policy.fieldAccess) {
  for (const [field, value] of Object.entries(updateData)) {
    const canEdit = await policy.fieldAccess[field](req.user, "update");
    if (!canEdit) {
      throw new Error(\`You cannot edit field: \${field}\`);
    }
  }
}`} />
                </SectionCard>
              </div>
            </ScrollRevealSection>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* DEBUGGING */}
          <div id="debugging" className="scroll-mt-28">
            <ScrollRevealSection id="debugging-intro">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <MdBugReport className="text-indigo-600 dark:text-indigo-400" />
                  Debugging Guide
                </h2>

                <SectionCard
                  icon={MdBugReport}
                  title="Using Trace IDs"
                  description="Correlate frontend errors with backend logs"
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Frontend: Capture Trace ID on Error</h4>
                      <CodeBlock code={`// When an API call fails, the response includes traceId
try {
  const res = await axiosInstance.post("/populate/read/tickets", payload);
} catch (err) {
  const traceId = err.response?.data?.traceId;
  const message = err.response?.data?.message;
  
  console.error(\`Failed with Trace ID: \${traceId}\`);
  console.error(\`Message: \${message}\`);
  
  // Show to user or log to error tracking service
  logErrorToSentry({
    traceId,
    message,
    endpoint: "/populate/read/tickets"
  });
}`} />
                    </div>

                    <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Backend: Search Logs by Trace ID</h4>
                      <CodeBlock code={`// In your backend logs/console:
// Get the traceId from error response
const traceId = "abc123xyz789";

// Search all logs with this traceId
grep -r "abc123xyz789" logs/ 

// You'll see:
// [Trace: abc123xyz789] Request started
// [Trace: abc123xyz789] Auth check passed
// [Trace: abc123xyz789] Policy evaluation failed - 403
// [Trace: abc123xyz789] Audit logged

// This tells you EXACTLY where the request failed`} />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={MdCode} title="Common Errors & Solutions" description="Quick reference for troubleshooting" className="mt-6">
                  <TabGroup
                    tabs={[
                      {
                        id: "401",
                        label: "401 Unauthorized",
                        content: (
                          <CodeBlock code={`// Cause: JWT token invalid, expired, or missing

// Solutions:
// 1. Check localStorage has authToken
const token = localStorage.getItem("authToken");
console.log("Token exists?", !!token);

// 2. Check Axios interceptor is adding header
// frontend/src/api/axiosInstance.js line 15
config.headers.Authorization = \`Bearer \${token}\`;

// 3. Check backend is verifying JWT correctly
// Try: curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/populate/read/tickets

// 4. Token might be expired - redirect to login
if (err.response?.status === 401) {
  window.location.href = "/login";
}`} />
                        ),
                      },
                      {
                        id: "403",
                        label: "403 Forbidden",
                        content: (
                          <CodeBlock code={`// Cause: Policy check failed - you don't have permission

// Solution: Check the policy for your role
// backend/src/utils/policy/yourmodelPolicy.js

// Example: User is Employee but policy says only Manager can create
const policy = {
  create: async (user) => {
    return ["Manager", "Admin"].includes(user.role); // Employee fails here
  }
};

// Debug: 
// 1. Log your role
console.log("My role:", user.role);

// 2. Check policy code
// 3. Either change policy or elevate user role`} />
                        ),
                      },
                      {
                        id: "422",
                        label: "422 Validation Error",
                        content: (
                          <CodeBlock code={`// Cause: Request payload doesn't match schema

// Example error:
// "Validation failed: title: Path \`title\` is required"

// Solution:
// 1. Check required fields in model
// backend/src/models/Ticket.js -> { required: true }

// 2. Ensure your request includes them
await axiosInstance.post("/populate/create/tickets", {
  title: "Fix bug", // Required!
  description: "..."
});

// 3. Check field types
// String field with number? { age: "25" } should be { age: 25 }

// 4. Use beforeCreate hook to validate
export async function beforeCreate({ data }) {
  if (!data.title?.trim()) {
    throw new Error("Title is required");
  }
}`} />
                        ),
                      },
                      {
                        id: "500",
                        label: "500 Server Error",
                        content: (
                          <CodeBlock code={`// Cause: Unhandled exception in backend

// Solution:
// 1. Get the traceId from error response
const traceId = err.response?.data?.traceId;

// 2. Search backend logs
grep -r "\${traceId}" logs/

// 3. Look for the stack trace
// [Error] [Trace: abc123] Cannot read property 'name' of undefined
//   at afterCreate (/src/services/tickets.js:45:12)

// 4. Check the file and line number mentioned
// backend/src/services/tickets.js line 45

// Common causes:
// - Forgot to await async operation
// - Null reference (accessing property on undefined)
// - Mongoose query didn't populate field correctly`} />
                        ),
                      },
                    ]}
                  />
                </SectionCard>

                <SectionCard icon={MdAssignment} title="Audit Log Inspection" description="Debug by checking what actually happened" className="mt-6">
                  <CodeBlock code={`// Check MongoDB audit_logs collection
db.audit_logs.find({ traceId: "abc123xyz789" })

// Returns:
{
  _id: ObjectId("..."),
  traceId: "abc123xyz789",
  user: ObjectId("user_123"),
  action: "create",
  model: "Ticket",
  documentId: ObjectId("ticket_456"),
  changes: {
    before: null,
    after: {
      title: "Fix bug",
      status: "Open",
      createdBy: ObjectId("user_123")
    }
  },
  timestamp: ISODate("2026-06-18T10:30:00Z")
}

// This tells you:
// - WHO made the change (user_123)
// - WHAT changed (title, status added)
// - WHEN it happened (timestamp)
// - Via which request (traceId)`} />
                </SectionCard>
              </div>
            </ScrollRevealSection>
          </div>
        </div>
      </div>
    </div>
  );
}
