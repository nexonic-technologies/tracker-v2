/**
 * =====================================================
 *   Dynamic Universal API Checklist Documentation
 *   Status Tracker: Completed / Partial / Pending
 * =====================================================
 */

// ✅ Completed / Partial Checklist
export const checklistProgress = [
  {
    id: 1,
    title: "Single API endpoint",
    description: "All CRUD and populate operations handled by one universal endpoint.",
    status: "completed",
  },
  {
    id: 2,
    title: "Dynamic collection support",
    description: "All models added in `models/index.js` are automatically supported.",
    status: "completed",
  },
  {
    id: 3,
    title: "User access logging",
    description: "System logs attempts to access collections/fields, even if denied.",
    status: "partial", // needs detailed audit trail
  },
  {
    id: 4,
    title: "Keyword support (customFun, key, field)",
    description: "API supports multiple keywords, even in combination, up to 10 fields.",
    status: "partial", // parsing logic exists but edge cases to refine
  },
  {
    id: 5,
    title: "Role-based field restriction",
    description: "Fields not allowed for role return console error but DB flow continues.",
    status: "completed",
  },
  {
    id: 6,
    title: "Manual limit override",
    description: "API supports special cases where manual limit can bypass default limit.",
    status: "pending", // not yet added
  },
  {
    id: 7,
    title: "Fuzzy loading for performance",
    description: "Continuous hits handled gracefully with async/queue/batching.",
    status: "pending",
  },
  {
    id: 8,
    title: "Developer documentation",
    description: "JavaScript docs file for future reference.",
    status: "completed",
  },
];

// 🚧 Not Started Checklist
export const futureChecklist = [
  { id: 9, title: "API versioning", description: "Support multiple API versions (v1, v2, etc).", status: "pending" },
  { id: 10, title: "Strong validation", description: "Validate operation, fields, populate params.", status: "pending" },
  { id: 11, title: "Query cost safeguard", description: "Prevent expensive queries (depth, fields, limits).", status: "pending" },
  { id: 12, title: "Rate limiting & abuse protection", description: "Protect against spam/DoS attacks.", status: "pending" },
  { id: 13, title: "Structured error handling", description: "Consistent JSON errors for frontend.", status: "pending" },
  { id: 14, title: "Response caching", description: "Cache common queries in Redis/memory.", status: "pending" },
  { id: 15, title: "Audit trail", description: "Track CRUD operations with user/time context.", status: "pending" },
  { id: 16, title: "Field aliasing", description: "Support renamed schema fields without breaking APIs.", status: "pending" },
  { id: 17, title: "Developer playground", description: "Interactive tool to test API queries.", status: "pending" },
  { id: 18, title: "Security hardening", description: "JWT refresh, ABAC rules, input sanitization.", status: "pending" },
  { id: 19, title: "Observability", description: "Metrics for queries, errors, and response times.", status: "pending" },
  { id: 20, title: "TypeScript typings", description: "Strong type support for frontend devs.", status: "pending" },
];