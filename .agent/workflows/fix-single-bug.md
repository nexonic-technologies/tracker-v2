---
description: Fix a single bug end-to-end using the 8-step workflow with layer-specific procedures
version: 1.0
last_updated: 2026-06-07
tech_stack: React + Vite (Frontend) / Node.js + Express + Mongoose (Backend)
---

# Fix Single Bug Workflow

## Purpose

Fix ONE bug at a time with surgical precision, full traceability, and documented rollback. This is the **Fix Execution** phase — `/bug-intake-triage` prepares the bug, this workflow fixes it.

## Core Principles

> **ONE bug at a time. No batch fixes. Stability > Elegance. Documentation first.**

1. **Isolation** — Each bug fixed in its own change, linked to a specific Bug ID
2. **Traceability** — Every change references the Bug ID in commit messages and docs
3. **Reversibility** — Every fix has a documented rollback plan BEFORE the fix is applied
4. **Surgical precision** — Minimal fix footprint, no opportunistic refactoring
5. **Pattern reuse** — Check module brain and common patterns BEFORE writing a fix from scratch

## Prerequisites

- Bug ID is known
- Bug has been triaged via `/bug-intake-triage`
- Module Brain read: `knowledge_brain/{MODULE_NAME}/MODULE_BRAIN.md`
- System Brain read (if cross-module): `knowledge_brain/_SYSTEM/SHARED_COLLECTIONS.md`

## Steps

### Step 0: DUPLICATE FIX GUARD

1. Read the bug entry from the execution plan
2. Check the bug's status:
   - **`✅ Fixed`** → WARN: "Bug {BUG_ID} was already fixed. Re-open or skip?"
   - **`🔧 In Progress`** → WARN: "Bug {BUG_ID} is being worked on. Continue?"
   - **`⏳ Queue` / blank** → Proceed normally

### Step 1: DIAGNOSE

1. Read the bug details. Extract:
   - Problem summary, root cause, impact, affected file(s), proposed fix, risk level, rollback plan

2. **Pattern check** — search `knowledge_brain/Common/COMMON_BUG_PATTERNS.md` if it exists:
   - **Match found**: Note Pattern ID → use fix template
   - **No match**: Novel bug → use execution plan's proposed fix

3. If Module Brain exists, cross-reference:
   - Which business rule is violated? (check `MODULE_BRAIN.md`)
   - Which data flow path is affected? (check `DATA_FLOW.md`)
   - Any cross-module dependencies? (check `CROSS_MODULE_MAP.md`)
   - Which models are touched? (check `METHOD_INDEX.md`)

4. **System Brain cross-reference** — if `knowledge_brain/_SYSTEM/` exists:
   - Does the fix touch a shared collection? → check `_SYSTEM/SHARED_COLLECTIONS.md`

### Step 1b: CONFIDENCE GATE

Rate your confidence:

🟢 **HIGH (80%+)**: Pattern match found, brain has full coverage.
   → Proceed to Step 2

🟡 **MEDIUM (50-80%)**: Brain covers the area but root cause is ambiguous.
   → Present TOP 3 possible causes to developer WITH evidence
   → Developer chooses which to investigate

🔴 **LOW (<50%)**: Novel bug, no pattern match, unfamiliar subsystem.
   → STOP. Present what you know and don't know. Ask for guidance.

**Automatic LOW confidence** if the bug involves:
- Payment / financial data discrepancy
- WebSocket / real-time sync failure
- Cross-module data flow (3+ modules)
- Authentication / authorization edge cases
- Mongoose schema changes affecting existing data

### Step 2: LOCATE

1. Open the affected file(s) at the specified line number(s)
2. Read current code verbatim
3. Confirm the code matches the execution plan
4. If the code has changed since audit — does the bug still exist?
5. Layer-by-layer trace: `React Component → useGenericAPI → /populate/:action/:model/:id → populateRoutes → services → Mongoose → MongoDB`

### Step 3: ASSESS

1. **Track classification**:
   - **Track A (System)**: Security, query, schema, exception, performance → AI fixes, human approves diff
   - **Track B (Business)**: Calculation, business rule, workflow, integration → AI proposes, human validates logic
2. **Risk level**: Low / Medium / High
3. **Cross-module impact**: Check `CROSS_MODULE_MAP.md`
4. If cross-module impact detected → **alert user before proceeding**

### Step 4: PLAN & APPLY FIX

**Before applying any fix, document the rollback plan.**

#### 4a. RIPPLE CHECK

**For Mongoose Model fixes:**
- [ ] Schema validation correct?
- [ ] All services using this model still work?
- [ ] All queries/filters still work with schema change?
- [ ] Existing data preserved?
- [ ] Frontend components consuming this API still render correctly?

**For React Component fixes:**
- [ ] Component renders correctly in all usage contexts?
- [ ] Props still compatible with all parent components?
- [ ] useGenericAPI calls handle loading/error states?
- [ ] Error states handled?

**For API Endpoint fixes:**
- [ ] URL pattern unchanged (or frontend updated)?
- [ ] Request/response format unchanged (or frontend updated)?
- [ ] Auth middleware correct?
- [ ] Pagination still works?

#### For Backend Fixes:

1. Locate exact file and line from execution plan
2. Read current code — confirm it matches
3. Apply the **minimal** fix
4. Run syntax check: `node -c {file}`
5. If model changed: verify Mongoose schema compatibility with existing documents

#### For Frontend Fixes:

1. Locate exact component and line
2. Verify fix doesn't affect other components that share the same props/context
3. Apply minimal fix — prefer patterns already proven in the same codebase
4. Run lint: `npx eslint . --no-error-on-unmatched-pattern`
5. Flag for manual testing: "Clear browser cache and test"

### Step 5: SYNTAX CHECK

1. For JavaScript files:
```powershell
node -c {affected_js_file}
```

2. For frontend lint:
```powershell
cd "{PROJECT_ROOT}\{FE_ROOT}" && npx eslint . --no-error-on-unmatched-pattern
```

3. If any check fails → fix → re-run

### Step 6: TEST

1. **Backend tests** (if Jest/supertest tests exist):
```powershell
cd "{PROJECT_ROOT}\{BE_ROOT}" && npx jest --verbose
```

2. **Frontend lint**:
```powershell
cd "{PROJECT_ROOT}\{FE_ROOT}" && npx eslint . --no-error-on-unmatched-pattern
```

3. If no test exists and P0/P1 bug → create one
4. Present smoke test checklist:
   - [ ] Primary **create/save** action works
   - [ ] Primary **edit/update** preserves all data
   - [ ] Primary **delete** cleans up related records
   - [ ] **Search/filter** returns correct results
   - [ ] **API responses** match expected format
   - [ ] **Error cases** handled gracefully

### Step 7: APPROVAL GATE

```
Bug: {BUG_ID} — {Title}
Track: {A (System) / B (Business)}
Risk: {Low / Medium / High}

Changed:
  {file}:{lines} — {1-line description}

Test Results:
  {N} tests, {M} assertions — all passed

Rollback:
  {1-line rollback instruction}

Approve? (yes / modify / reject)
```

### Step 8: CLOSE & UPDATE

1. **Bug tracking**: Mark bug as ✅ Fixed with date
2. **Pattern library**: Update patterns if novel bug
3. **Module Brain**: Add anti-pattern note to `MODULE_BRAIN.md`
4. **Walkthrough**: Generate fix documentation
5. **Communication**: Notify reporter

## Completion Report

```
✅ Bug {BUG_ID} — {TITLE}
   Track: {A/B}
   Fix: {1-line summary}
   File: {path}:{lines}
   Tests: {N} tests — all passed
   Risk: {Low/Medium/High}
   Rollback: {1-line rollback instruction}
   Next bug: {NEXT_BUG_ID} — {NEXT_TITLE}
```
