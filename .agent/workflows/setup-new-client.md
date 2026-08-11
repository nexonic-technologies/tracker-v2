---
description: Set up bug remediation for a new client project
version: 1.0
last_updated: 2026-06-01
tech_stack: React + Vite (Frontend) / Node.js + Express + Mongoose (Backend)
---

# Setup New Client Project

> **When to use**: New project with NO existing brain or audit data.

## Steps

### Step 1: Copy Workflow Files
Copy `.agent/workflows/` from source project to client project.

### Step 2: Update Project-Specific Config
Edit `.agent/config.md` — update all project-specific values:
- `{PROJECT_ROOT}`, `{PROJECT_NAME}`, `{REPO_OWNER}`, `{REPO_NAME}`
- `{FE_ROOT}`, `{BE_ROOT}`, `{FE_SRC}`, directory structure
- Module Registry — map all Node.js/Express apps and React page directories

### Step 3: Initialize Pattern Library
Run `/manage-bug-patterns` → creates `COMMON_BUG_PATTERNS.md` with React+Node.js/Express seed patterns.

### Step 4: Set Up GitHub Tracking
Create labels and milestones on the client's GitHub repo.

### Step 5: Build First Module Brain
Run `/build-module-brain` on the module with the most reported bugs.

### Step 6: Run First Audit
Run `/module-bug-audit` on the first module.

### Step 7: Verify Setup
- [ ] `.agent/workflows/` created
- [ ] `.agent/config.md` configured
- [ ] GitHub labels + milestones created
- [ ] Pattern library initialized
- [ ] First module brain built
- [ ] First audit run
