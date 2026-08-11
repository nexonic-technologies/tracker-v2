---
description: Initialize or update the common bug patterns library for React + Node.js/Express stack
version: 1.0
last_updated: 2026-06-07
tech_stack: React + Vite (Frontend) / Node.js + Express + Mongoose (Backend)
---

# Manage Bug Patterns Workflow

## Purpose
Initialize or update the pattern library with React + Node.js/Express specific bug patterns.

## Seed Patterns (React + Vite + Node.js/Express)

### Backend (Express + Mongoose)

| ID | Pattern | Detection | Fix Template |
|---|---|---|---|
| PAT-SEC-001 | Missing auth middleware on route | Check route definition for `agentAuthMiddleware` | Add `agentAuthMiddleware` to route |
| PAT-SEC-002 | No input sanitization | `req.body` used directly without validation | Add Joi/express-validator or Mongoose schema validation |
| PAT-QRY-001 | N+1 query (missing `.populate()`) | Service makes multiple DB calls in loop | Use Mongoose `.populate()` or aggregation |
| PAT-QRY-002 | Missing pagination on list endpoint | Service returns all documents without `page`/`limit` | Add pagination with `page` and `limit` params |
| PAT-VAL-001 | Missing Mongoose schema validation | Schema field has no `required`, `enum`, or `validate` | Add proper schema validation to Mongoose model |
| PAT-TXN-001 | Missing atomic operation | Multi-document writes without session | Wrap in `Mongoose.startSession()` + `session.withTransaction()` |
| PAT-DEL-001 | Hard delete without cascade | `deleteOne` without cleaning related documents | Use soft delete (`isDeleted: true`) or cascade via pre-hook |
| PAT-FLT-001 | Missing isDeleted filter | Query missing `{ isDeleted: false }` | Always filter `isDeleted: false` in service queries |
| PAT-ERR-001 | Bare catch without logging | `catch(err)` without error logging | Add `ErrorLog` model write or console.error with context |

### Frontend (React + JavaScript)

| ID | Pattern | Detection | Fix Template |
|---|---|---|---|
| PAT-JSX-001 | Missing error handling in API call | `useGenericAPI` call without try/catch | Wrap API call in try/catch + toast.error |
| PAT-JSX-002 | Missing loading state | `useGenericAPI` without checking `loading` | Add loading spinner while API call is in flight |
| PAT-JSX-003 | Stale closure in useEffect | State variable in dependency-less useEffect | Add deps or use useCallback |
| PAT-JSX-004 | Direct DOM manipulation | `document.getElementById` in React | Use refs or state |
| PAT-JSX-005 | Missing key prop in list | `.map()` without `key` prop | Add unique `key` prop |
| PAT-JSX-006 | useEffect cleanup missing | Subscriptions/timers without cleanup return | Add cleanup function |
| PAT-JSX-007 | Missing data-module attribute | Page wrapper missing `data-module` | Add `data-module="hr|project|ticket|payroll"` for accent colors |

## Output
`knowledge_brain/Common/COMMON_BUG_PATTERNS.md`
