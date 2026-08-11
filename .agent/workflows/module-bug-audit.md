---
description: Find all bugs in a module through systematic 6-round audit
version: 1.0
last_updated: 2026-06-07
tech_stack: React + Vite (Frontend) / Node.js + Express + Mongoose (Backend)
---

# Module Bug Audit Workflow

## Purpose
Systematically find all bugs in a module through 6 rounds of increasingly deep analysis.

## Prerequisites
- Module Brain built via `/build-module-brain` (coverage ≥ 80%)

## Audit Rounds

### Round 1: Security Scan
- [ ] Auth middleware on all mutation routes
- [ ] JWT validation in agentAuthMiddleware
- [ ] Input validation in route handlers (no raw `req.body` usage without checks)
- [ ] Rate limiting on sensitive endpoints
- [ ] File upload validation (type, size, extension)
- [ ] XSS vectors (dangerouslySetInnerHTML in React)

### Round 2: Data Integrity
- [ ] Mongoose query correctness (filters, populate, aggregations)
- [ ] Soft-delete filter consistency (`isDeleted: false`)
- [ ] Reference integrity (orphan document risks after delete)
- [ ] Atomic operations with Mongoose sessions for multi-document writes
- [ ] Schema validation completeness (required, enum, validate)

### Round 3: Error Handling
- [ ] API error responses (proper status codes, consistent format)
- [ ] React error boundaries
- [ ] axios interceptor error handling
- [ ] Missing try/catch in services
- [ ] Unhandled promise rejections in React

### Round 4: Performance
- [ ] N+1 query detection (missing `.populate()` or loop queries)
- [ ] Missing pagination on list endpoints
- [ ] Large queryset loading (no unbounded `.find({})`)
- [ ] Missing database indexes
- [ ] React re-render optimization (useMemo, useCallback)

### Round 5: Business Logic
- [ ] Calculation accuracy
- [ ] Business rule enforcement (both frontend and backend)
- [ ] Status transition validity
- [ ] Cross-module data consistency
- [ ] Edge cases (empty lists, null values, boundary conditions)

### Round 6: Integration
- [ ] API contract consistency (frontend expects ↔ backend returns)
- [ ] WebSocket message handling
- [ ] File upload/download flow
- [ ] Cross-module API calls
- [ ] Socket event handling correctness

## Output
- `knowledge_brain/{module}/BUGS/CONSOLIDATED_BUG_REPORT.md`
- `knowledge_brain/{module}/BUGS/{MODULE}_EXECUTION_PLAN.md`
