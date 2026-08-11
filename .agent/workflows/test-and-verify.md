---
description: Test and verify a bug fix with category-specific test requirements and module smoke tests
version: 1.0
last_updated: 2026-06-07
tech_stack: React + Vite (Frontend) / Node.js + Express + Mongoose (Backend)
---

# Test & Verify Workflow

## Purpose

Standardize testing after every bug fix. Every fix must pass prerequisite checks, syntax checks, automated tests, and a smoke test before approval.

## Prerequisites

- A bug fix has been applied (code change is in place)
- Bug ID, category, and severity are known

## Environment Config

| Variable | Source | Change Per Project |
| -------- | ------ | ------------------ |
| `{NODE_PATH}` | `.agent/.env` (auto-detected) | Auto-detected |
| `{NPM_PATH}` | `.agent/.env` (auto-detected) | Auto-detected |

## Steps

### Step 0: Prerequisite Check

#### Step 0a: Node.js Check
```powershell
node --version
npm --version
```
- ✅ Versions displayed → continue
- ❌ Not found → ask user

### Step 1: Syntax Check

For **every** JavaScript file changed:
```powershell
node -c {affected_js_file}
```

For Node.js project syntax check:
```powershell
cd "{PROJECT_ROOT}\{FE_ROOT}" && npx eslint . --no-error-on-unmatched-pattern
```

### Step 1.5: Select Test Approach

| Bug Type | Test Approach | Tool |
| -------- | ------------- | ---- |
| **API data mismatch** | Backend test with supertest + in-memory MongoDB | supertest / Jest |
| **Validation error** | Unit test validation logic | Jest / Mocha |
| **React component bug** | Browser test on localhost | Manual / Playwright |
| **Pure logic / calculation** | Jest unit test | Jest |
| **Mongoose query bug** | Backend test with test DB | Jest / supertest |
| **UI / interaction bug** | Browser test on localhost | Manual |
| **JS syntax error** | ESLint + Node syntax check | eslint |
| **API integration bug** | supertest integration test | supertest |
| **WebSocket bug** | Socket.io client test | Jest + io-client |

### Step 2: Identify Required Tests by Category

| Category | Required Tests |
| -------- | -------------- |
| **Security** (Auth, XSS) | Auth middleware enforcement, JWT validation, input sanitization |
| **API / Route** | Valid input passes, invalid input rejected, proper status codes |
| **Logic / Calculation** | Correct result normal input, edge cases (0, negative, max) |
| **Data Validation** | Valid accepted, invalid blocked, boundary conditions, null handling |
| **Schema / Model** | Mongoose schema validation, required fields, defaults |
| **React Component** | Renders correctly, handles errors, responsive |
| **WebSocket / Real-time** | Connection established, messages delivered, reconnection works |

### Step 3: Check for Existing Tests

```powershell
# Find existing tests for the module
Get-ChildItem "{PROJECT_ROOT}\{BE_ROOT}" -Recurse -Include "*.test.js", "*.spec.js", "__tests__/**" | Select-String -Pattern "{MODULE_NAME}" -List
```

If found → run existing tests first:
```powershell
cd "{PROJECT_ROOT}\{BE_ROOT}" && npx jest {test_file} --verbose
```

### Step 4: Create New Tests (if P0/P1)

For backend tests (supertest + Jest):
```javascript
const request = require('supertest');
const app = require('../src/index');

describe('Bug {BUG_ID}: {Title}', () => {
  it('should resolve the reported issue', async () => {
    // Arrange
    // Act
    // Assert
  });

  it('should handle edge cases', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Step 5: Run All Tests

```powershell
# Lint check
cd "{PROJECT_ROOT}\{FE_ROOT}" && npx eslint . --no-error-on-unmatched-pattern

# Backend syntax check
cd "{PROJECT_ROOT}\{BE_ROOT}" && node -c server.js
```

```powershell
# Backend tests (if they exist)
cd "{PROJECT_ROOT}\{BE_ROOT}" && npx jest --verbose
```

### Step 6: Module Smoke Test Checklist

- [ ] Primary **create/save** action works
- [ ] Primary **edit/update** preserves ALL existing data
- [ ] Primary **delete** cleans up ALL related records
- [ ] **Search/filter** returns correct results
- [ ] **API endpoints** return proper status codes and data
- [ ] **Error cases** show appropriate messages to user
- [ ] **Browser console** shows no JS errors

**Module-specific additions:**

| Module | Extra Smoke Tests |
| ------ | ----------------- |
| Tickets | Ticket CRUD, comment/reply flow, file attachments, status transitions |
| Tasks | Task CRUD, status transitions, assignments |
| HR | Attendance, leave management, holiday calendar |
| Dashboard | Widget rendering, data accuracy, responsive layout |
| Auth | Login/logout, token refresh, session management, FCM tokens |

### Step 7: Sign-Off Criteria

| Criterion | Status |
| --------- | ------ |
| Prerequisites verified (Node + npm) | |
| Syntax check passes (all changed files) | |
| ESLint clean | |
| Automated tests pass | |
| Smoke test items checked | |
| No unintended side effects | |
| Rollback plan documented | |

## Completion Report

```
✅ Testing complete for {BUG_ID}
   Prerequisites: Node {version} ✅
   Syntax: {N} files checked — all pass
   Lint: ✅ clean
   Tests: {N} tests — all pass
   Smoke: {N}/{TOTAL} items checked
   Sign-off: {Ready / Blocked on: {reason}}

   Next: Approval gate in /fix-single-bug Step 7
```
