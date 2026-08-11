---
description: Fix Track A (system/architecture) bugs — AI-led with human approval
version: 1.0
last_updated: 2026-06-07
tech_stack: React + Vite (Frontend) / Node.js + Express + Mongoose (Backend)
---

# Fix Architecture Bug Workflow

## Purpose

Fix system/architecture bugs (Track A) — security, query, schema, exception, performance. AI leads the fix, human approves the diff.

## Track A Bug Categories

| Category | Examples | AI Confidence |
|---|---|---|
| **Security** | Auth bypass, XSS, middleware gaps | 🟢 Pattern-based |
| **Query/Mongoose** | N+1 queries, wrong filters, missing indexes | 🟢 Structural |
| **Schema** | Missing fields, wrong types, schema changes | 🟡 Needs DB context |
| **Exception** | Unhandled errors, missing try-catch | 🟢 Pattern-based |
| **Performance** | Slow aggregations, large payloads, missing pagination | 🟡 Needs profiling |
| **API** | Wrong status codes, missing error responses | 🟢 Pattern-based |

## Steps

### Step 1: Load Bug Context
Read from execution plan + Module Brain + System Brain.

### Step 2: Category-Specific Investigation

**For Query/Mongoose bugs:**
1. Read the Mongoose query in the service
2. Check for missing `.populate()` vs loop queries (N+1)
3. Check aggregation pipeline for performance issues
4. Verify indexes exist for filter/sort fields
5. Propose optimized query

**For Security bugs:**
1. Check auth middleware on route
2. Verify JWT verification in agentAuthMiddleware
3. Check for missing input sanitization
4. Verify rate limiting on sensitive routes

**For Schema bugs:**
1. Read current Mongoose schema
2. Verify existing documents are compatible with schema change
3. Add migration script if needed
4. Propose schema change with rollback

### Step 3: Apply Fix (AI-led)
Apply minimal fix following `/fix-single-bug` Step 4.

### Step 4: Present Diff for Approval
Show before/after code to human. Human approves or rejects.

## Completion
Route back to `/fix-single-bug` Step 7 (Approval Gate).
