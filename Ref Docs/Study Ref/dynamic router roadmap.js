/**
 * ============================================================
 * 🚀 Dynamic API Roadmap (Subhamita Stock Vision)
 * ============================================================
 * This roadmap outlines how we will reach a fully future-proof,
 * developer-friendly API architecture over time.
 * 
 * The structure mirrors the checklist, with steps divided into
 * immediate tasks, mid-term tasks, and long-term enhancements.
 * ============================================================
 */

export const apiRoadmap = {
  immediatePhase: [
    {
      step: 1,
      title: "Stabilize Core CRUD Handler",
      status: "In Progress",
      description:
        "Ensure CRUD, populate, customFun, key, field all working together. Role-based restriction applied.",
      risk: "Low - needs more testing on combinations."
    },
    {
      step: 2,
      title: "Role-based Field Restrictions",
      status: "Completed (basic)",
      description:
        "Role from JWT token applied. Block denied fields safely. Console error in dev mode.",
      risk: "Medium - need logging layer."
    },
    {
      step: 3,
      title: "Logging User Access",
      status: "Planned",
      description:
        "Log every allowed/denied access attempt. Store in DB/log file. Dev console in development mode.",
      risk: "Medium - requires structured log format."
    },
    {
      step: 4,
      title: "Manual Limit Override",
      status: "Partially Done",
      description:
        "Default 50 docs limit, 10 populate limit. Allow manual override in query param.",
      risk: "Low"
    }
  ],

  midTermPhase: [
    {
      step: 5,
      title: "Fuzzy Loading / Performance Guard",
      status: "Not Started",
      description:
        "Implement debouncing / batching of repeated API calls. Avoid stress on DB.",
      risk: "High - requires careful backend & frontend sync."
    },
    {
      step: 6,
      title: "API Documentation (JS Docs)",
      status: "In Progress",
      description:
        "Maintain JavaScript docs explaining API usage, keywords, constraints.",
      risk: "Low"
    },
    {
      step: 7,
      title: "Audit Trail",
      status: "Not Started",
      description:
        "Save who accessed what, including create/update/delete metadata.",
      risk: "Medium"
    }
  ],

  longTermPhase: [
    {
      step: 8,
      title: "API Versioning",
      status: "Not Started",
      description:
        "Support /v1, /v2 versions for breaking changes in future.",
      risk: "Low"
    },
    {
      step: 9,
      title: "Caching Layer",
      status: "Not Started",
      description:
        "Introduce Redis/memory cache for repeated queries to reduce DB load.",
      risk: "Medium"
    },
    {
      step: 10,
      title: "Observability & Analytics",
      status: "Not Started",
      description:
        "Track response times, most used queries, errors. Provide metrics for optimization.",
      risk: "High"
    },
    {
      step: 11,
      title: "TypeScript Typings",
      status: "Not Started",
      description:
        "Add typing for safer front-end consumption and reduce runtime bugs.",
      risk: "Medium"
    }
  ]
};