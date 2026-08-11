---
description: Build or update the cross-module System Brain (_SYSTEM/) for shared tables and dependencies
version: 2.0
last_updated: 2026-06-03
tech_stack: React + Vite (Frontend) / Node.js + Express + Mongoose (Backend)
---

# Build System Brain Workflow

> **Purpose**: Aggregate data from all module brains into a cross-module knowledge layer.
> **Prereq**: Minimum 3 module brains built via `/build-module-brain`.

## Output

```
knowledge_brain/_SYSTEM/
├── SHARED_COLLECTIONS.md     ← MongoDB collections used by 2+ modules
├── SYSTEM_COVERAGE.md        ← Coverage: how many modules have brains
├── MODULE_DEPENDENCIES.md    ← (aspirational) Which modules depend on each other
├── SHARED_SCHEMAS.md         ← (aspirational) Shared Mongoose schemas and nested refs
├── CROSS_MODULE_BUGS.md      ← (aspirational) Bugs spanning multiple modules
├── DATA_FLOW_CHAINS.md       ← (aspirational) End-to-end business flows via populate API
├── VALIDATION_GAPS.md        ← (aspirational) Missing server-side payload/Mongoose validations
├── CLEANUP_GAPS.md           ← (aspirational) Missing cascades on document delete
├── PERFORMANCE_RISKS.md      ← (aspirational) Missing indexes, unoptimized aggregations
├── DIAGNOSTIC_PLAYBOOK.md    ← (aspirational) Symptom→suspect rules
├── DANGER_ZONES.md           ← (aspirational) NEVER rules (hard stops)
└── HANDOFF_AUDIT.md          ← (aspirational) Cross-module contract verification
```

> **Note**: Only `SHARED_COLLECTIONS.md` and `SYSTEM_COVERAGE.md` exist by default. Create additional docs as needed.

## Steps

### Step 0: Pre-Check
Count module brains. If < 3 → STOP.

### Step 1-3: Read all module brain files
Read CROSS_MODULE_MAP.md, METHOD_INDEX.md, SCHEMA_ANALYSIS.md from each module.

### Step 4-8: Generate system brain documents
Build each `_SYSTEM/` document from aggregated data. Ensure that you track MongoDB `ref` paths and frontend generic API payload structures rather than legacy Django constraints.

### Step 8b: Generate HANDOFF_AUDIT.md
Match outbound contracts (dynamic payloads) from each module against inbound constraints/schemas of downstream logic.

## Completion Report

```
✅ System Brain — {MODE} complete
   Modules scanned: {N}
   Shared collections: {N} ({N} high-risk)
   Dependencies: {N} links
   Coverage: {N}/{TOTAL} modules ({N}%)
```
