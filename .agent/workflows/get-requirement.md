---
description: Analyze task description and generate structured requirement output
version: 1.0
last_updated: 2026-06-01
audience: Support Team
tech_stack: React + Vite (Frontend) / Node.js + Express + Mongoose (Backend)
---

# Get Requirement Workflow

## Purpose

Take a raw task description and produce a structured requirement with:
1. **Category** — Module and sub-feature area
2. **Task** — Clean one-line title
3. **User Story** — As a [role], I want to [action], so that [benefit]
4. **Observation** — Current system behavior from brain analysis
5. **Impacts** — Files, tables, and cross-module effects
6. **Acceptance Criteria** — Testable done conditions

## Safety Constraints

This workflow is READ-ONLY — it never modifies code, database, or any files.

### Allowed Tools
1. `view_file` — Read brain files and source code
2. `grep_search` — Search across files for keywords

### Blocked Tools
- `run_command` is STRICTLY FORBIDDEN
- DO NOT install anything
- DO NOT create, modify, or delete any files

## Steps

### Step 1: Parse Task Description
Extract action verbs, module keywords, entity references, UI references, business context.

### Step 2: Read Module Brain
Read MODULE_BRAIN.md, BUSINESS_RULES.md, DATA_FLOW.md, METHOD_INDEX.md, SCHEMA_ANALYSIS.md for the primary module.

### Step 3: Cross-Module Impact Analysis
Read CROSS_MODULE_MAP.md, _SYSTEM/SHARED_COLLECTIONS.md.

### Step 4: Generate Structured Requirement
Output all 6 sections in copyable format.

## Impact Table Template

| Component | File | What Changes |
|---|---|---|
| API Route | `backend/src/routes/{module}Routes.js` | {what changes} |
| Service | `backend/src/services/{service}.js` | {what changes} |
| Model | `backend/src/models/{Model}.js` | {what changes} |
| React Page | `{page_dir}/{file}.jsx` | {what changes} |
| React Component | `{component_dir}/{file}.jsx` | {what changes} |
| MongoDB Collection | `{collection}` | {new fields / altered queries} |
