---
description: Build a Module Brain for any module to enable rapid bug diagnosis and AI-assisted development
version: 2.0
last_updated: 2026-06-03
tech_stack: React + Vite (Frontend) / Node.js + Express + Mongoose (Backend)
---

# Build Module Brain Workflow

## Purpose
Create a comprehensive knowledge base ("Module Brain") for any module. This reduces bug diagnosis time by ~60% and is a **prerequisite** before running a bug audit on any new module.

## AI Optimization Principles

> These brain docs are consumed by Antigravity (AI agent). Structure EVERY output for machine grep:

1. **Alphabetical sorting** — All method indexes must be alphabetical so `grep_search` finds any method in one hit
2. **Endpoint → Model mapping** — Every dynamic endpoint payload must specify which Mongoose model and fields it queries/populates
3. **Collection → Frontend reverse-map** — For any database bug, instantly find all frontend components and queries that touch the collection
4. **React Component → API map** — Every `axiosInstance` / `useGenericAPI` call mapped to its backend route (`/populate/:action/:model/:id`) and JSON payload structure
5. **Callers column** — Every method/component entry should say what calls it
6. **Line numbers** — Every reference must include line numbers. Stale line numbers are better than no line numbers
7. **Cross-references over prose** — Tables and links over paragraphs. One lookup, not a paragraph scan

## Prerequisites
- Module name identified
- Access to the module's Backend logic (Mongoose schemas, populateHelper integrations, custom routes if any) and React pages/components
- `knowledge_brain/` directory exists (create if not)

## Input
- `{MODULE_NAME}` — e.g., Masters, Feeds, PM, HR, Gamification
- `{BE_ROOT}/src/models/` — Mongoose schemas
- `{FE_PAGE_DIR}` — e.g., `{FE_PAGES}/masters/`
- `{FE_COMPONENT_DIR}` — e.g., `{FE_COMPONENTS}/tickets/`

## Output
```
knowledge_brain/{MODULE_NAME}/
├── MODULE_BRAIN.md           ← Master brain document (architecture, routes, risks)
├── METHOD_INDEX.md           ← Alphabetical method lookup — generic hooks, payload generators, React components
├── DATA_FLOW.md              ← Detailed data flow traces + React component → Dynamic API JSON Payload map
├── FLOW_RISK_MATRIX.md       ← Handoff contracts, state machines, reversal checks (QA-ready)
├── BUSINESS_RULES.md         ← Extracted business rules and validations (from frontend forms and Mongoose)
├── CROSS_MODULE_MAP.md       ← Dependencies on other modules (MongoDB refs)
├── SCHEMA_ANALYSIS.md        ← MongoDB collection analysis (fields, types, indexes, risks)
├── FORENSIC_TEMPLATE.md      ← Per-module layer-by-layer investigation cheat sheet
└── COVERAGE_TRACKER.md       ← Round-by-round coverage progress (auto-updated every round)
```

## Steps

### Step 0: Existing Brain Detection [Antigravity]

Before building, check if a brain already exists:

```powershell
Test-Path "{PROJECT_ROOT}\knowledge_brain\{MODULE_NAME}\MODULE_BRAIN.md"
```

**If brain does NOT exist** → Skip to Step 1 (build from scratch).

**If brain EXISTS** → Present three options:

| Mode | When to Use | What Happens |
|---|---|---|
| **Refresh** | Same version, brain may be stale | Re-scan code, MERGE new findings into existing brain |
| **Upgrade** | Major version change | Diff old brain against new code. Add new, flag removed |
| **Force Rebuild** | Brain is corrupted or fundamentally wrong | Back up, then wipe and regenerate |

### Step 1: Project Skeleton

1. List ALL files the module touches:
   - **Backend Layer**: 
     - Mongoose Schemas inside `{BE_ROOT}/src/models/` related to this module
     - Any custom Express routes or helper logic (`populateHelper.js` interactions)
   - **React Pages**: `{FE_PAGE_DIR}/` — list all `.jsx` page files
   - **React Components**: `{FE_COMPONENT_DIR}/` — list all `.jsx` component files
   - **API Layer**: `useGenericAPI.js`, `axiosInstance.js`, and form configuration constants.
   - **Hooks**: relevant hooks in `{FE_HOOKS}/`

2. For each file, write a one-line purpose description

3. Document the connection flow:
   ```
   Browser → React Component ({FE_COMPONENT_DIR}/*.jsx)
           → JSON Payload builder / useGenericAPI
           → axios.post('/populate/:action/:model/:id', payload)
           → Express (populateRoutes.js -> populateHelper.js)
           → Mongoose Model / MongoDB Aggregation
           → Response → React Component state/cache re-render
   ```

4. Note file sizes — the largest file is the most complex and risky

### Step 2: Entry Points & Routes

Create a table of ALL Frontend API payload triggers:

**Frontend API Usage (Targeting the Generic API):**
| React Component | Dynamic API Action | Model / Endpoint | JSON Payload Structure | Lines | Purpose |
|---|---|---|---|---|---|
| {Component} | `read` (POST) | `/populate/read/{model}` | `{ filter: {...}, limit: N }` | L100-200 | List records |
| {Component} | `create` (POST) | `/populate/create/{model}` | `{ ...formFields }` | L200-300 | Create record |
| {Component} | `update` (PUT/POST) | `/populate/update/{model}/{id}` | `{ ...updatedFields }` | L350-400 | Update record |
| {Component} | `delete` (DELETE) | `/populate/delete/{model}/{id}` | — | L400-450 | Delete record |

### Step 3: Engine Reverse Engineering (Data Flow)

Trace the primary user actions end-to-end based on the generic API paradigm. At minimum, trace these 3 flows:

**Flow 1: CREATE (Save New Record)**
1. What React component renders the form (`FormRenderer.jsx`, constants)?
2. What frontend validation runs before submitting?
3. What JSON payload is built for the `/populate/create/...` call?
4. What Mongoose schema handles it? What are the `required` fields or pre-save hooks?
5. What collections are written to?
6. What response goes back to the browser?

**Flow 2: READ / QUERY (List Records)**
1. How is data queried? (e.g., passing `$or` filters, aggregations, `$lookup` stages in the payload)
2. Which fields are populated? (via `populateFields` in payload)
3. Are there heavy aggregations being processed dynamically in `populateHelper.js`?
4. How is the state managed (Context, React local state)?

**Flow 3: EDIT / DELETE**
1. How is existing data loaded to populate the edit form?
2. Does the update payload include query parameters mixed with body data?
3. Is deletion soft-delete (flag update) or hard-delete? Are Mongoose hooks handling cascades?

Document each flow with exact function names, line numbers, and collection names.

Output: `knowledge_brain/{MODULE_NAME}/DATA_FLOW.md`

### Step 3b: Flow Risk Matrix (Handoff Contracts) [Antigravity]

> Build this AFTER Step 3 and Step 5 are complete.

Create `knowledge_brain/{MODULE_NAME}/FLOW_RISK_MATRIX.md` with:

#### 3b-1. State Machine
Document ALL status fields in Mongoose and their valid transitions.

#### 3b-2. Inbound Contracts
What this module's generic payloads expect.

#### 3b-3. Outbound Contracts
What this module guarantees to downstream operations.

#### 3b-4. Reversal Contracts
For each cancel/delete/reverse operation, what must be restored.

#### 3b-5. Flow Risk Checklist (QA-Ready Test Scenarios)

Output: `knowledge_brain/{MODULE_NAME}/FLOW_RISK_MATRIX.md`

### Step 4: Business Rules Extraction

For every validation, calculation, or constraint found in the code (Form constants + Mongoose schemas):

1. Extract the rule
2. Write it in plain English
3. Note where it's implemented (React Form config, Mongoose schema validation)
4. Note if it's validated frontend-only, backend-only, or both
5. Note any edge cases

Format:
```
RULE-{MODULE}-001: {Rule Name}
Formula: {plain-English rule}
Implementation: {React component/form config L{N}} + {Mongoose Schema}
Validation: Frontend-only / Backend-only / Both
Edge cases: {known edge cases}
```

Output: `knowledge_brain/{MODULE_NAME}/BUSINESS_RULES.md`

### Step 5: Cross-Module Mapping

Identify every interaction with external modules:

1. From Mongoose schemas, find every `ref: 'OtherModel'` connecting to another module's collection.
2. From the frontend payloads, find every API call pulling data from a different module's collection (e.g. `$lookup` stages).
3. From the React components, find every import from another module's components.

Document:
| External Module | Direction | Collections | What Data | Risk |
|---|---|---|---|---|
| Auth | Read | employees / users | User details | User could be deleted breaking refs |
| PM | Write | tickets | Ticket sync | Wrong data payload sent |

Include a Mermaid dependency graph.

Output: `knowledge_brain/{MODULE_NAME}/CROSS_MODULE_MAP.md`

### Step 6: DB Truth Protocol

Create verification queries for the module's most important data:

1. MongoDB aggregate query that pulls a complete document with all populated `$lookups`
2. MongoDB count query that calculates expected totals
3. MongoDB query that checks for orphaned `ref` ObjectIds
4. MongoDB schema integrity checks

### Step 7: Build METHOD_INDEX.md

**7a. Mongoose Schemas (alphabetical)**
| Schema/Model | Lines | Collections Read | Collections Written | Frontend Callers |
|---|---|---|---|---|

**7b. React Components → Dynamic Payload Map**
| Component | API Call (`/populate/...`) | HTTP Method | JSON Payload Structure (Filter/Populate) |
|---|---|---|---|

**7c. Collection Reverse Map**
| Collection | Read By (Components/Payloads) | Written By |
|---|---|---|

### Step 8: Assemble the Module Brain

Create `knowledge_brain/{MODULE_NAME}/MODULE_BRAIN.md` with:

1. **Module Overview** — Purpose, file map, connection diagram
2. **Backend Structure** — Mongoose Schemas, Helper Integrations
3. **React Structure** — Pages, Components, Hooks, Context, Form Constants
4. **Dynamic API Usage** — Payload table from Step 2
5. **Data Flow Summary** — High-level flows (detailed in DATA_FLOW.md)
6. **Key Collections** — List with field counts, indexed fields, purpose
7. **Business Rules Summary** — Rule count and top rules
8. **Cross-Module Dependencies** — Summary (link to CROSS_MODULE_MAP.md)
9. **Known Risks** — Pre-identified risk areas (especially payload injection/validation risks)
10. **Anti-Patterns Register** — Empty initially, updated after each bug fix

> **IMPORTANT**: Keep MODULE_BRAIN.md under 400 lines.

### Step 9: Coverage Progress Scan [MANDATORY — Every Round]

#### 9a. Count Actuals from Codebase
```powershell
# Mongoose Schema count
(Select-String -Path "{BE_ROOT}\src\models\*.js" -Pattern "new mongoose.Schema" | Measure-Object).Count

# Generic API Post/Get call count in frontend
(Select-String -Path "{FE_PAGE_DIR}\*.jsx", "{FE_COMPONENT_DIR}\*.jsx" -Pattern "axiosInstance.(post|get|put|delete)\(['`]/populate/" | Measure-Object).Count

# Form config count in constants
(Get-ChildItem "{FE_ROOT}\src\constants" -File -Filter "*.js" -Recurse | Measure-Object).Count

# React component count
(Get-ChildItem "{FE_PAGE_DIR}" -File -Filter "*.jsx" -Recurse | Measure-Object).Count
(Get-ChildItem "{FE_COMPONENT_DIR}" -File -Filter "*.jsx" -Recurse | Measure-Object).Count
```

#### 9b-d. Calculate Coverage & Update Tracker

Status thresholds:
- `0%` → ⬜ Not started
- `1-79%` → 🟡 Partial
- `80-99%` → 🟢 Complete
- `100%` + verified → 🔵 Verified

**Overall Coverage** = weighted average:
- Mongoose Schemas: 18%
- API Payload configurations: 15%
- React Components: 15%
- DB Collections (owned): 12%
- Business rules: 10%
- Data flows: 10%
- Flow risk contracts: 8%

## Completion Report
```
✅ Module Brain — Round {N} complete for {MODULE_NAME}

   📊 COVERAGE PROGRESS:
   ┌─────────────────────────┬──────────┬──────────┬──────────┐
   │ Metric                  │ Covered  │ Total    │ Coverage │
   ├─────────────────────────┼──────────┼──────────┼──────────┤
   │ Mongoose Schemas        │ {N}      │ {N}      │ {N}%     │
   │ API Payloads            │ {N}      │ {N}      │ {N}%     │
   │ React Pages             │ {N}      │ {N}      │ {N}%     │
   │ React Components        │ {N}      │ {N}      │ {N}%     │
   │ Form Constants          │ {N}      │ {N}      │ {N}%     │
   │ DB Collections          │ {N}      │ {N}      │ {N}%     │
   │ Data flows (CRUD+)      │ {N}      │ {N}      │ {N}%     │
   ├─────────────────────────┼──────────┼──────────┼──────────┤
   │ OVERALL                 │          │          │ {N}%     │
   └─────────────────────────┴──────────┴──────────┴──────────┘

   Brain location: knowledge_brain/{MODULE_NAME}/
   Ready for: /module-bug-audit (when overall ≥ 80%)
```

## Time Estimate
- Simple module (< 5 files total, < 5 collections): ~30 minutes
- Medium module (5-15 files, 5-15 collections): ~1 hour
- Complex module (15+ files, 15+ collections): ~2 hours
