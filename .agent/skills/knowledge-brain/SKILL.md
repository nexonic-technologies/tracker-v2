---
name: knowledge-brain
description: Reads and maintains knowledge_brain/ as the Tracker project source of truth before and after code work; applies backend/DESIGN.md tokens for UI. Use for bugs, features, refactors, module work, cross-module changes, or when the user mentions knowledge brain, module brain, or Tracker architecture.
---

# Knowledge Brain (Tracker)

## Mandatory rule

For every requirement from the user, you must ONLY execute the task by first verifying the current brain. Every update or finding MUST be updated in the brain. This process must not be missed by any means.

## Quick start

| Phase | Action |
|-------|--------|
| **Before code** | System brain → module brain → related skill (if any) |
| **During** | If brain contradicts code, flag it; prefer code for runtime truth |
| **After** | Update the brain files your change touched |

## 1. Pre-task (read)

### 1a. System brain (`knowledge_brain/_SYSTEM/`)

Always read when the task touches shared MongoDB collections or multiple modules:

| File | Use when |
|------|----------|
| `SHARED_COLLECTIONS.md` | Ref changes, populate bugs, “who references this model?” |
| `SYSTEM_COVERAGE.md` | Picking which module folder exists; coverage gaps |

Optional aspirational docs (from `.agent/workflows/` — create if missing and task needs them): `DIAGNOSTIC_PLAYBOOK.md`, `DANGER_ZONES.md`, `DATA_FLOW_CHAINS.md`.

### 1b. Module brain (`knowledge_brain/{Module}/`)

Resolve `{Module}` from the user’s area or path:

| User area / path | Brain folder |
|------------------|--------------|
| `frontend/src/pages/Attendance/` | `Attendance` |
| `frontend/src/pages/Master-Data/` | `Master-Data` |
| `frontend/src/pages/Tickets/`, tasks | `Tickets`, `Tasks` |
| `frontend/src/pages/CRM/` | `CRM` |
| `frontend/src/pages/feed/` | Check `Core` or build via `/build-module-brain` |
| `frontend/src/components/Common/` | `Common` |
| `backend/src/services/`, populate, auth, FCM | `Core` |
| Generic CRUD `[model]` pages | `[model]` |

Read in order (skip missing files; note gaps):

1. `MODULE_BRAIN.md` — models, services, routes, risks  
2. `METHOD_INDEX.md` — alphabetical lookup  
3. `DATA_FLOW.md` — React → `/populate/...` → Mongoose  
4. `CROSS_MODULE_MAP.md` — cross-module refs  

Deep dives: `Core/POPULATE_ENGINE.md`, `Core/FCM_NOTIFICATIONS.md`.

### 1c. Related project skills (`.agent/skills/`)

| Task | Also read |
|------|-----------|
| FCM / push / `NotificationReceptionist` | `.agent/skills/fcm-job-queue/SKILL.md` + `knowledge_brain/Core/FCM_NOTIFICATIONS.md` |
| New or stale module docs | `.agent/workflows/build-module-brain.md` |
| Copied brains from another client | `.agent/workflows/sync-brain.md` |

### 1d. UI / styling tasks

Read `.agent/skills/frontend-ui-tokens/SKILL.md` first. Every page must be **theme-aware** and **responsive**. Then: `ux-standards.md`, `design-tokens.md`, `tokens.css`, `uiTokens.js`, `backend/DESIGN.md`.

## 2. Post-task (write)

Update only what changed; keep tables grep-friendly (see `.agent/workflows/build-module-brain.md`).

| Change type | Update |
|-------------|--------|
| New/changed model, service, hook | `MODULE_BRAIN.md`, `METHOD_INDEX.md` |
| API / populate payload | `DATA_FLOW.md` (+ line numbers) |
| New cross-module ref | `CROSS_MODULE_MAP.md` + `_SYSTEM/SHARED_COLLECTIONS.md` if shared collection |
| Bug fix / behavior change | Module brain + note in commit/issue if applicable |
| New module documented | `_SYSTEM/SYSTEM_COVERAGE.md` |

If no module folder exists, run the build-module-brain workflow before closing the task.

## 3. Tracker stack (this repo)

Do not use stale Django/MySQL guidance from `.agent/config.md` for Tracker work.

| Layer | Location |
|-------|----------|
| Frontend | `frontend/src/` — React + Vite, `.jsx` pages/components |
| API client | `frontend/src/api/axiosInstance.js`, `useGenericAPI.js` |
| Backend | `backend/src/` — Express, Mongoose models in `models/`, logic in `services/` |
| Generic API | `POST/PUT/DELETE` → `/populate/:action/:model/:id` |

Standard trace:

```
Browser → React (pages/components)
       → useGenericAPI / axiosInstance
       → /populate/:action/:model/:id
       → populateHelper + services
       → Mongoose → MongoDB
       → response → UI state
```

## 4. Brain layout

```
knowledge_brain/
├── _SYSTEM/
│   ├── SHARED_COLLECTIONS.md
│   └── SYSTEM_COVERAGE.md
├── Core/                    # populate, auth, notifications, shared platform
├── {Module}/                # Attendance, HR, Tickets, Master-Data, …
│   ├── MODULE_BRAIN.md
│   ├── METHOD_INDEX.md
│   ├── DATA_FLOW.md
│   └── CROSS_MODULE_MAP.md
└── …                        # optional: FLOW_RISK_MATRIX, BUSINESS_RULES (see workflow)
```

## 5. Quality bar for brain edits

1. Alphabetical `METHOD_INDEX.md` entries  
2. Every API row: component, action, model, payload shape, **line numbers**  
3. Tables over prose; one lookup per fact  
4. Stale line numbers > missing line numbers  

## Additional resources

- File templates and module map: [reference.md](reference.md)  
- UI tokens summary: [design-tokens.md](design-tokens.md)  
- Full design spec: `backend/DESIGN.md`
