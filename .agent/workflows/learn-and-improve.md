---
description: Post-fix knowledge capture — update Module Brain, pattern library, and track metrics
version: 1.0
last_updated: 2026-06-01
tech_stack: React + Vite (Frontend) / Node.js + Express + Mongoose (Backend)
---

# Learn & Improve Workflow

## Purpose

After every fix, update the knowledge base so the system gets **faster over time**.

## Steps

### Step 0: Quick Impact Assessment [Antigravity]

| Change Type                         | If Yes → Update                    |
| ----------------------------------- | ---------------------------------- |
| View/Serializer method changed?     | METHOD_INDEX.md                    |
| Data flow / API endpoint changed?   | DATA_FLOW.md                       |
| Business rule corrected or added?   | BUSINESS_RULES.md                  |
| Schema changed (migration)?         | SCHEMA_ANALYSIS.md                 |
| Cross-module tables/models touched? | _SYSTEM/ documents                 |

### Step 0b: Capture Fix Velocity [Antigravity]

Record timing data to `knowledge_brain/FIX_VELOCITY.md`.

### Step 1: Update Module Brain [Antigravity]

- Add anti-pattern entry
- Add "Why It Was Done This Way" note
- Update field-level data flow if applicable
- Update System Brain if cross-module impact

### Step 2: Update Pattern Library [Antigravity]

- Existing pattern match → add module to "Modules Found In"
- New pattern → add full entry with detection rule and fix template

### Step 3: Update METHOD_INDEX (if applicable) [Antigravity]

### Step 4: Update Execution Plan / Bug Report [Antigravity]

Mark bug as ✅ Fixed, update consolidated report, close GitHub Issue, update Active Bug Tracker.

### Step 5: Monthly Metrics Review [Human + Antigravity]

Run monthly for sprint planning and process improvement.

## Completion Report

```
✅ Learn & Improve cycle complete
   Brain updates: {N} modules updated
   Anti-patterns added: {N} entries
   Pattern library: {N} existing updated, {M} new added
   Bug tracking: {fixed}/{total} bugs resolved
```
