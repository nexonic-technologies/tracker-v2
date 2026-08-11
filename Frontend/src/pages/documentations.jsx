import React, { useState } from "react";
import {
  MdLayers,
  MdInfoOutline,
  MdOutlineLogin,
  MdOutlineConfirmationNumber,
  MdOutlineTask,
  MdOutlineDateRange,
  MdOutlineWatchLater,
  MdAttachMoney,
  MdCardTravel,
  MdPeopleOutline,
  MdContentCopy,
  MdCheck,
  MdMenuBook,
  MdShowChart,
  MdSettingsSuggest,
  MdIntegrationInstructions
} from "react-icons/md";

const CodeBlock = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mt-3 rounded-2xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs text-slate-100 overflow-x-auto group shadow-inner">
      <pre className="pr-10">{code}</pre>
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

const EndpointHeader = ({ method, path }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const methodColors = {
    GET: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    POST: "bg-sky-500/10 border-sky-500/20 text-sky-400",
    PUT: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    DELETE: "bg-rose-500/10 border-rose-500/20 text-rose-400",
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 bg-slate-900 border border-slate-800/80 rounded-2xl p-3 shadow-inner">
      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border uppercase tracking-wider ${methodColors[method] || "bg-slate-500/10 border-slate-500/20 text-slate-400"}`}>
        {method}
      </span>
      <code className="text-slate-300 text-xs md:text-sm font-mono flex-1 select-all break-all">{path}</code>
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all shadow-sm"
        title="Copy endpoint path"
      >
        {copied ? <MdCheck className="text-emerald-400 text-sm" /> : <MdContentCopy className="text-sm" />}
      </button>
    </div>
  );
};

export default function Documentations() {
  const menuItems = [
    { id: "intro", label: "Introduction & Statuses", icon: MdIntegrationInstructions },
    { id: "architecture", label: "Core API Mappings", icon: MdLayers },
    { id: "parameters", label: "Query Payloads", icon: MdInfoOutline },
    { id: "reports", label: "Reports Engine", icon: MdShowChart },
    { id: "auth", label: "Auth & Sessions", icon: MdOutlineLogin },
    { id: "tickets", label: "Tickets Module", icon: MdOutlineConfirmationNumber },
    { id: "tasks", label: "Tasks Module", icon: MdOutlineTask },
    { id: "tracker", label: "Daily Tracker", icon: MdOutlineDateRange },
    { id: "attendance", label: "Attendance & Leaves", icon: MdOutlineWatchLater },
    { id: "payroll", label: "Payroll Engine", icon: MdAttachMoney },
    { id: "expenses", label: "Travel Expenses", icon: MdCardTravel },
    { id: "meta", label: "Dropdowns & Meta", icon: MdPeopleOutline },
  ];

  return (
    <div className="relative w-full min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Force parent scroll wrapper to allow sticky positioning and remove margins */}
      <style>{`
        .lmx-content {
          overflow: visible !important;
          padding: 0 !important;
          max-width: 100% !important;
        }
      `}</style>

      {/* Glow effects for premium glassmorphism */}
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] rounded-full bg-fuchsia-500/10 dark:bg-fuchsia-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 pt-6 pb-5 border-b border-slate-200 dark:border-slate-800/60 z-10 md:px-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <MdMenuBook className="text-indigo-500 text-3xl" />
            Developer Hub & API Reference
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            WorkHub Unified System Documentation — API endpoints, database schemas, access policies, and state transitions.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 px-4 py-2 rounded-2xl font-mono text-[11px] text-slate-600 dark:text-slate-300 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Config: Node.js/Express + React Pages</span>
        </div>
      </div>

      {/* Horizontal Sticky Quick-Links TOC */}
      <div className="sticky top-0 z-40 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md py-3 border-b border-slate-200 dark:border-slate-800/60 flex items-center gap-2 overflow-x-auto scrollbar-none px-6 md:px-8">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap mr-2">Jump to:</span>
        <div className="flex gap-2">
          {menuItems.map((item) => {
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

      <div className="relative z-10 w-full">
        {/* Content Pane containing all sections sequentially */}
        <div className="w-full bg-white/75 dark:bg-slate-900/60 backdrop-blur-lg border-y border-slate-200 dark:border-slate-800/80 py-8 px-6 md:px-8 shadow-2xl space-y-12 min-w-0">

          {/* TAB 0: INTRODUCTION & STATUS ENGINE */}
          <div id="intro" className="scroll-mt-28 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MdIntegrationInstructions className="text-indigo-500" />
                Introduction & Dynamic Status Engine
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-6">
                Welcome to the WorkHub Developer reference. This hub provides all documentation needed to consume backend resources securely and format payload queries accurately.
              </p>
            </div>

            {/* Status Engine Overview Card */}
            <div className="bg-indigo-600/[0.03] dark:bg-indigo-500/[0.02] border border-indigo-500/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <MdSettingsSuggest className="text-lg" />
                Dynamic Status Mapping Framework
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-6">
                Historically, backend models maintained hardcoded status values (like <code>Pending, Approved, Rejected</code>). To make workflows configurable, all hardcoded enums have been replaced by a dynamic <strong>Status Config Engine</strong>. Status values are now populated dynamically from the <code>status_configss</code> collection.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-white/80 dark:bg-slate-950/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">1. metaStatus (Lifecycle Status)</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-4">
                    Tracks the systemic lifecycle of a record. Automatically defaults to <code>"active"</code>. Used to filter out records during soft deletion or archival processes.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {["active", "inactive", "draft", "archive", "deleted"].map(k => (
                      <span key={k} className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-850">{k}</span>
                    ))}
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-950/40 backdrop-blur-md border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">2. status (Workflow Status)</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-4">
                    Determines the functional business step a record is at. Supports customizable colors, sorting orders, and terminal indicators (like <code>isTerminal: true</code> for Completed/Closed states).
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {["To Do", "In Progress", "In Review", "Completed", "Pending", "Approved"].map(k => (
                      <span key={k} className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10">{k}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Mapping Section */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Cross-Module Status Mapping</h3>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-5">
                When a model interacts with another (such as a <strong>Task</strong> linked to a <strong>Ticket</strong>), the system maps status transitions automatically based on configuration documents in the <code>status_mappings</code> collection.
              </p>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
                <table className="w-full border-collapse text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-950">
                      <th className="py-2.5 px-3">Source Model (Task)</th>
                      <th className="py-2.5 px-3">Target Model (Ticket)</th>
                      <th className="py-2.5 px-3">Automated Transition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 font-mono text-xs">
                    <tr>
                      <td className="py-2.5 px-3">Backlogs / To Do</td>
                      <td className="py-2.5 px-3">Open</td>
                      <td className="py-2.5 px-3 text-slate-400">Default mapping</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3">In Progress</td>
                      <td className="py-2.5 px-3">In Progress</td>
                      <td className="py-2.5 px-3 text-indigo-500 dark:text-indigo-400">Propagates transition</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3">In Review</td>
                      <td className="py-2.5 px-3">Review</td>
                      <td className="py-2.5 px-3 text-slate-400">Triggered on merge request</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3">Approved</td>
                      <td className="py-2.5 px-3">Testing</td>
                      <td className="py-2.5 px-3 text-emerald-500">Auto-routes to QA</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3">Completed</td>
                      <td className="py-2.5 px-3">Completed (Terminal)</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-semibold">Resolves both records</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3">Deleted</td>
                      <td className="py-2.5 px-3">Closed (Terminal)</td>
                      <td className="py-2.5 px-3 text-rose-500">Cancels dependency</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* TAB 1: CORE API MAPPINGS */}
          <div id="architecture" className="scroll-mt-28 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MdLayers className="text-indigo-500" />
              Core API Mappings
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-6">
              WorkHub's backend implements an optimized, dynamic CRUD controller schema. Rather than maintaining custom endpoints for every database action, a single controller handles resource access, model checking, default schemas, and recursive population.
            </p>

            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-xl text-xs leading-5 flex items-start gap-2.5">
              <MdInfoOutline className="text-base flex-shrink-0 mt-0.5" />
              <div>
                <strong>Important Update:</strong> To prevent URL character limits and improve security, <strong>all read query parameters have been migrated from URL search queries to the request body payload</strong>. All list fetches must use the <code>POST</code> method, passing parameters in the JSON payload body.
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Dynamic Router Mappings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Generic Collections (Without ID)</p>
                  <code className="text-indigo-500 dark:text-indigo-400 font-mono text-xs block mt-1 break-all">/api/populate/:action/:model</code>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Document Target Scope (With ID)</p>
                  <code className="text-indigo-500 dark:text-indigo-400 font-mono text-xs block mt-1 break-all">/api/populate/:action/:model/:id</code>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Mongoose Collections Mapping</h3>
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                <table className="w-full border-collapse text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-950">
                      <th className="py-2.5 px-3">Collection / Model</th>
                      <th className="py-2.5 px-3">Mongoose Schema</th>
                      <th className="py-2.5 px-3">Key Relations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 font-mono text-xs">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-950 dark:text-white">employees</td>
                      <td className="py-2.5 px-3">Employee.js</td>
                      <td className="py-2.5 px-3">roles, departments, designations</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-950 dark:text-white">tickets</td>
                      <td className="py-2.5 px-3">Ticket.js</td>
                      <td className="py-2.5 px-3">employees (assignedTo, createdBy)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-950 dark:text-white">tasks</td>
                      <td className="py-2.5 px-3">Task.js</td>
                      <td className="py-2.5 px-3">clients, project_types, task_types, employees</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-950 dark:text-white">daily_activities</td>
                      <td className="py-2.5 px-3">DailyActivity.js</td>
                      <td className="py-2.5 px-3">employees, clients, project_types, task_types</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-950 dark:text-white">attendances</td>
                      <td className="py-2.5 px-3">Attendance.js</td>
                      <td className="py-2.5 px-3">employees, leave_types</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-950 dark:text-white">payrolls</td>
                      <td className="py-2.5 px-3">Payroll.js</td>
                      <td className="py-2.5 px-3">employees, salary_structures, payroll_runs</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* TAB 2: QUERY PARAMETERS */}
          <div id="parameters" className="scroll-mt-28 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MdInfoOutline className="text-indigo-500" />
              Query Parameters (Request Body Payloads)
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-6">
              Read operations support advanced filter configurations. These parameters must be sent in the <strong>JSON request body</strong> of a <code>POST</code> request to the <code>/read</code> action.
            </p>

            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                <table className="w-full border-collapse text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-950">
                      <th className="py-3 px-4">Parameter</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Usage & Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 text-xs">
                    <tr>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">fields</td>
                      <td className="py-3 px-4 font-mono text-slate-500">String \| Array</td>
                      <td className="py-3 px-4 leading-5">Comma-separated properties to return. Optimizes payload size. E.g. <code>"title,status"</code></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">filter</td>
                      <td className="py-3 px-4 font-mono text-slate-500">Object</td>
                      <td className="py-3 px-4 leading-5">MongoDB query filters (JSON syntax). E.g. <code>{"{\"status\": \"Open\"}"}</code></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">populateFields</td>
                      <td className="py-3 px-4 font-mono text-slate-500">Object</td>
                      <td className="py-3 px-4 leading-5">Paths to populate dynamically with mapped lookup properties. E.g. <code>{"{\"assignedTo\": \"basicInfo.firstName\"}"}</code></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">sort</td>
                      <td className="py-3 px-4 font-mono text-slate-500">Object</td>
                      <td className="py-3 px-4 leading-5">Sort mappings. Defaults to <code>{"{\"createdAt\": -1}"}</code>.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">limit</td>
                      <td className="py-3 px-4 font-mono text-slate-500">Number</td>
                      <td className="py-3 px-4 leading-5">Pagination boundary (maximum: 100). Defaults to 20.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">aggregate</td>
                      <td className="py-3 px-4 font-mono text-slate-500">Boolean</td>
                      <td className="py-3 px-4 leading-5">Enables aggregation mode on the read query if set to <code>true</code>.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">stages</td>
                      <td className="py-3 px-4 font-mono text-slate-500">Array</td>
                      <td className="py-3 px-4 leading-5">Array of MongoDB aggregation pipeline stages (used when <code>aggregate: true</code>).</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 mt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Example: Read Query with Aggregation Pipeline</h4>
                <EndpointHeader method="POST" path="/api/populate/read/tickets" />
                <CodeBlock
                  code={`{
  "aggregate": true,
  "stages": [
    { "$match": { "priority": "High" } },
    { "$group": { "_id": "$status", "total": { "$sum": 1 } } }
  ]
}`}
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* TAB 3: REPORTS ENGINE */}
          <div id="reports" className="scroll-mt-28 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MdShowChart className="text-indigo-500 text-2xl" />
              Reports Engine
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-6">
              The reports engine provides powerful group-by analytics, nested grouping (sub-groupings), numerical summations, and customized range configurations compiled directly on MongoDB aggregate pipelines.
            </p>

            <div className="space-y-4">
              <EndpointHeader method="POST" path="/api/populate/report/:model" />

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                <table className="w-full border-collapse text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-950">
                      <th className="py-3 px-4">Field</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Functionality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 text-xs">
                    <tr>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">type</td>
                      <td className="py-3 px-4 font-mono text-slate-500">String</td>
                      <td className="py-3 px-4 leading-5">Scope return format: <code>"summary"</code> (aggregates metrics) or <code>"details"</code> (full list representation).</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">groupBy</td>
                      <td className="py-3 px-4 font-mono text-slate-500">String</td>
                      <td className="py-3 px-4 leading-5">Property field to group by (e.g. <code>"status"</code>, <code>"priority"</code>, <code>"assignedTo"</code>).</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">subGroupBy</td>
                      <td className="py-3 px-4 font-mono text-slate-500">String</td>
                      <td className="py-3 px-4 leading-5">Optional sub-classification field. Converts results into structured nested columns.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">sum</td>
                      <td className="py-3 px-4 font-mono text-slate-500">String \| Array</td>
                      <td className="py-3 px-4 leading-5">Properties to execute numerical summations on (e.g. <code>"dayTotal"</code> on expenses).</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">populate</td>
                      <td className="py-3 px-4 font-mono text-slate-500">Array</td>
                      <td className="py-3 px-4 leading-5">Lookup array listing referenced paths that must be populated before grouping.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-500 dark:text-indigo-400">dateRange</td>
                      <td className="py-3 px-4 font-mono text-slate-500">Object</td>
                      <td className="py-3 px-4 leading-5">Date boundaries mapping: <code>{"{startDate, endDate, dateField}"}</code>.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Example 1: Tickets Status/Priority Sub-Group Report</h4>
                  <CodeBlock
                    code={`// POST /api/populate/report/tickets
{
  "type": "summary",
  "groupBy": "status",
  "subGroupBy": "priority",
  "populate": ["createdBy", "assignedTo"]
}`}
                  />
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Example 2: Date-Ranged Expense Summary Report</h4>
                  <CodeBlock
                    code={`// POST /api/populate/report/expenses
{
  "type": "summary",
  "groupBy": "employee",
  "sum": ["dayTotal"],
  "populate": ["employee"],
  "dateRange": {
    "startDate": "2026-06-01T00:00:00.000Z",
    "endDate": "2026-06-30T23:59:59.999Z",
    "dateField": "date"
  }
}`}
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* TAB 4: AUTH & SESSIONS */}
          <div id="auth" className="scroll-mt-28 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MdOutlineLogin className="text-indigo-500" />
              Auth & Session Lifecycle
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Sign In</h3>
                <EndpointHeader method="POST" path="/api/auth/login" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Body</h4>
                <CodeBlock
                  code={`{
  "workEmail": "you@company.com",
  "password": "yourpassword",
  "platform": "mobile",
  "deviceUUID": "device_fingerprint_id"
}`}
                />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-4">Success Response (200 OK)</h4>
                <CodeBlock
                  code={`{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "sessionId": "session_mongodb_object_id"
}`}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Logout</h3>
                <EndpointHeader method="POST" path="/api/auth/logout" />
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* TAB 5: TICKETS */}
          <div id="tickets" className="scroll-mt-28 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MdOutlineConfirmationNumber className="text-indigo-500" />
              Tickets Module
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Read Tickets List</h3>
                <EndpointHeader method="POST" path="/api/populate/read/tickets" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Payload</h4>
                <CodeBlock
                  code={`{
  "fields": "title,type,priority,status,dueDate,createdAt,assignedTo,createdBy,ticketId",
  "limit": 1000
}`}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Create Ticket</h3>
                <EndpointHeader method="POST" path="/api/populate/create/tickets" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Payload</h4>
                <CodeBlock
                  code={`{
  "title": "Database connection dropouts",
  "userStory": "Connection timed out during bulk insertions...",
  "priority": "High", // 'Low', 'Medium', 'High', 'Critical'
  "type": "Bug", // 'Bug', 'Feature', 'Enhancement', 'Support'
  "product": "Work Hub",
  "dueDate": "2026-06-25T00:00:00.000Z",
  "createdBy": "user_mongodb_id",
  "status": "Open"
}`}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Update Ticket properties</h3>
                <EndpointHeader method="POST" path="/api/populate/update/tickets/:id" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Payload</h4>
                <CodeBlock
                  code={`{
  "status": "In Progress" // 'Open', 'In Progress', 'Review', 'Testing', 'Completed', 'Closed'
}`}
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* TAB 6: TASKS */}
          <div id="tasks" className="scroll-mt-28 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MdOutlineTask className="text-indigo-500" />
              Tasks & Comments System
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Read Tasks Checklist</h3>
                <EndpointHeader method="POST" path="/api/populate/read/tasks" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Payload</h4>
                <CodeBlock
                  code={`{
  "limit": 500,
  "populateFields": {
    "clientId": "name",
    "projectTypeId": "name",
    "assignedTo": "basicInfo.firstName,basicInfo.lastName"
  }
}`}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Create Task</h3>
                <EndpointHeader method="POST" path="/api/populate/create/tasks" />
                <CodeBlock
                  code={`{
  "title": "Complete Design Guidelines",
  "status": "To Do", // 'To Do', 'In Progress', 'In Review', 'Completed', 'Backlogs'
  "priorityLevel": "High", // 'Low', 'Medium', 'High', 'Weekly Priority'
  "userStory": "Create tokens and theme configurations...",
  "clientId": "client_id",
  "projectTypeId": "project_type_id",
  "assignedTo": ["employee_id"],
  "dueDate": "2026-06-25T00:00:00.000Z",
  "createdBy": "user_id"
}`}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Add Comment to Task Thread</h3>
                <EndpointHeader method="POST" path="/api/populate/update/comments_threads/:id" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Payload</h4>
                <CodeBlock
                  code={`{
  "comments": {
    "text": "Refactoring task detail screen implementation",
    "commentedBy": "employee_id",
    "commentedAt": "2026-06-18T10:00:00.000Z"
  }
}`}
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* TAB 7: DAILY TRACKER */}
          <div id="tracker" className="scroll-mt-28 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MdOutlineDateRange className="text-indigo-500" />
              Daily Activity Tracker
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Read Daily Activities</h3>
                <EndpointHeader method="POST" path="/api/populate/read/daily_activities" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Payload</h4>
                <CodeBlock
                  code={`{
  "filter": {
    "user": "employee_user_id",
    "date": {
      "$gte": "2026-06-18T00:00:00.000Z",
      "$lte": "2026-06-18T23:59:59.999Z"
    }
  },
  "populateFields": {
    "client": "name",
    "projectType": "name",
    "taskType": "name"
  }
}`}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Log Daily Activity</h3>
                <EndpointHeader method="POST" path="/api/populate/create/daily_activities" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Payload</h4>
                <CodeBlock
                  code={`{
  "user": "current_user_id",
  "client": "client_mongodb_id",
  "projectType": "project_type_mongodb_id",
  "taskType": "task_type_mongodb_id",
  "activity": "Resolved FlatList runtime exceptions and added API referencing screen.",
  "date": "2026-06-18T00:00:00.000Z"
}`}
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* TAB 8: ATTENDANCE & LEAVES */}
          <div id="attendance" className="scroll-mt-28 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MdOutlineWatchLater className="text-indigo-500" />
              Attendance, Leaves & Regularizations
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-6">
              Leaves, regularizations, and daily activities utilize dynamic configuration hooks. Mongoose schema enums are dynamically loaded from <code>status_configss</code> collection documents.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Daily Check-In</h3>
                <EndpointHeader method="POST" path="/api/populate/create/attendances" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Payload</h4>
                <CodeBlock
                  code={`{
  "employee": "employee_user_id",
  "date": "2026-06-18T00:00:00.000Z",
  "checkIn": "2026-06-18T09:00:00.000Z",
  "status": "Present"
}`}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Daily Check-Out</h3>
                <EndpointHeader method="POST" path="/api/populate/update/attendances/:id" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Payload</h4>
                <CodeBlock
                  code={`{
  "checkOut": "2026-06-18T18:00:00.000Z"
}`}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">File Leave Request</h3>
                <EndpointHeader method="POST" path="/api/populate/create/leaves" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Payload</h4>
                <CodeBlock
                  code={`{
  "employeeId": "employee_user_id",
  "leaveType": "leavetype_id",
  "startDate": "2026-06-20T00:00:00.000Z",
  "endDate": "2026-06-22T00:00:00.000Z",
  "reason": "Family gathering",
  "status": "Pending"
}`}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">File Regularization Request</h3>
                <EndpointHeader method="POST" path="/api/populate/create/regularizations" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Payload</h4>
                <CodeBlock
                  code={`{
  "employeeId": "employee_user_id",
  "attendanceId": "attendance_record_id",
  "date": "2026-06-18T00:00:00.000Z",
  "checkIn": "2026-06-18T09:15:00.000Z",
  "checkOut": "2026-06-18T18:00:00.000Z",
  "reason": "Forgot token card",
  "status": "Pending"
}`}
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* TAB 9: PAYROLL ENGINE */}
          <div id="payroll" className="scroll-mt-28 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MdAttachMoney className="text-indigo-500 text-2xl" />
              Payroll Engine Mappings
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-6">
              The payroll system is composed of salary structures, payroll calculations (overtime, PF/ESI limits, LOP penalties), and lifecycle stages:
              <span className="font-mono text-xs font-bold text-indigo-500 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded mx-1">Draft → Processing → Computed → Approved → Paid</span>.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Initiate Bulk Payroll Run</h3>
                <EndpointHeader method="POST" path="/api/populate/create/payroll_runs" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Payload</h4>
                <CodeBlock
                  code={`{
  "month": 6,
  "year": 2026,
  "employeeIds": ["employee_id_1", "employee_id_2"],
  "status": "Draft"
}`}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Approve / Pay Run</h3>
                <EndpointHeader method="POST" path="/api/populate/update/payroll_runs/:id" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Request Payload</h4>
                <CodeBlock
                  code={`// Transition to Approved (freezes configurations)
{
  "status": "Approved"
}

// Transition to Paid (marks individual payroll files as Paid)
{
  "status": "Paid"
}`}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Create Salary Structure</h3>
                <EndpointHeader method="POST" path="/api/populate/create/salary_structures" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  System automatically handles versioning: creates a new version, sets the previous open structure version's <code>effectiveTo = effectiveFrom - 1 day</code>.
                </p>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-3">Request Payload</h4>
                <CodeBlock
                  code={`{
  "employeeId": "employee_user_id",
  "effectiveFrom": "2026-06-01T00:00:00.000Z",
  "ctc": 85000,
  "earnings": [
    { "name": "Basic Salary", "amount": 42500, "isProratable": true },
    { "name": "HRA", "amount": 21250, "isProratable": true }
  ],
  "deductions": [
    { "name": "Professional Tax", "amount": 200 }
  ],
  "pfEmployeePercent": 12,
  "pfCeiling": 15000,
  "esiApplicable": false,
  "overtimeRate": 1.5
}`}
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* TAB 10: TRAVEL EXPENSES */}
          <div id="expenses" className="scroll-mt-28 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MdCardTravel className="text-indigo-500" />
              Travel & Expense Module
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Read Expense Submissions</h3>
                <EndpointHeader method="POST" path="/api/populate/read/expenses" />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Fetch Expense Aggregated Statistics</h3>
                <EndpointHeader method="POST" path="/api/populate/statistics/expenses" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Response Data (200 OK)</h4>
                <CodeBlock
                  code={`{
  "success": true,
  "stats": {
    "pending": 3,
    "approved": 12,
    "rejected": 1,
    "totalAmount": 18450
  },
  "type": "statistics"
}`}
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* TAB 11: DROPDOWNS & META */}
          <div id="meta" className="scroll-mt-28 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MdPeopleOutline className="text-indigo-500" />
              Dropdowns & Meta Lookups
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Fetch Clients with Project Types</h3>
                <EndpointHeader method="GET" path="/api/populate/read/clients?populateFields={&quot;project_types&quot;:&quot;name&quot;}" />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Fetch Task Types (Dropdown categories)</h3>
                <EndpointHeader method="GET" path="/api/populate/read/task_types" />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Fetch Active Departments</h3>
                <EndpointHeader method="POST" path="/api/populate/read/departments" />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Fetch System Designations</h3>
                <EndpointHeader method="POST" path="/api/populate/read/designations" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}