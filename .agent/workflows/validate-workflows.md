---
description: Validate all workflows are internally consistent — auto-setup developer environment
version: 1.0
last_updated: 2026-06-01
tech_stack: React + Vite (Frontend) / Node.js + Express + Mongoose (Backend)
---

# Validate Workflows

> **Purpose**: (1) Auto-setup a developer's local environment, (2) self-test workflow consistency.

## Steps

### Step 0: Pre-Flight Auto-Setup [Antigravity]

#### 0a. Detect PROJECT_ROOT
```powershell
git rev-parse --show-toplevel
```

#### 0b. Detect NODE_PATH
```powershell
(Get-Command node -ErrorAction SilentlyContinue).Source
(Get-Command npm -ErrorAction SilentlyContinue).Source
```

#### 0d. Detect ISSUE_PLATFORM from Git Remote
```powershell
git remote -v
```

#### 0e. Derive LOCALHOST URLs
```
LOCALHOST_FE = http://localhost:5173
LOCALHOST_BE = http://localhost:3000
```

#### 0f. Write .env File
Save all detected values to `.agent/.env`.

#### 0g. Display Setup Summary
```
✅ Environment auto-configured:
   Project root:  {PROJECT_ROOT}
    Node:          {NODE_PATH}
   Platform:      {ISSUE_PLATFORM}
   Frontend:      {LOCALHOST_FE}
   Backend:       {LOCALHOST_BE}
```

### Step 1: Check All Workflow Files Exist [Antigravity]

Verify core workflows exist:

| #   | Workflow                 | File                          |
| --- | ------------------------ | ----------------------------- |
| 1   | Build Module Brain       | `build-module-brain.md`       |
| 2   | Module Bug Audit         | `module-bug-audit.md`         |
| 3   | Bug Intake & Triage      | `bug-intake-triage.md`        |
| 4   | Fix Single Bug           | `fix-single-bug.md`           |
| 5   | Fix Architecture Bug     | `fix-architecture-bug.md`     |
| 6   | Fix Business Bug         | `fix-business-bug.md`         |
| 7   | Test & Verify            | `test-and-verify.md`          |
| 8   | Learn & Improve          | `learn-and-improve.md`        |
| 9   | Build System Brain       | `build-system-brain.md`       |
| 10  | Validate Workflows       | `validate-workflows.md`       |

### Step 2-6: Check frontmatter, cross-references, paths, supporting files

Generate validation report.

## Completion Report

```
# Workflow Validation Report — {DATE}
   Files: {N}/{TOTAL} found
   Cross-References: {N} checked
   Overall: {✅ PASS / ⚠️ WARNINGS / ❌ FAIL}
```
