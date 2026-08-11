# Knowledge Brain — Reference

## Module folders (current coverage)

From `knowledge_brain/_SYSTEM/SYSTEM_COVERAGE.md`:

| Module | Typical frontend | Backend models (if any) |
|--------|------------------|-------------------------|
| Core | `useGenericAPI`, layouts, auth | Yes (13+) |
| Attendance | `pages/Attendance/` | Yes |
| HR | HR pages / payroll | Yes |
| Tickets | `pages/Tickets/` | Yes |
| Tasks | `pages/tasks/` | Yes |
| Master-Data | `pages/Master-Data/` | — |
| CRM | `pages/CRM/` | — |
| Dashboard | `pages/Dashboard/` | — |
| Settings | `pages/Settings/` | — |
| Common | `components/Common/` | — |
| role | `components/role/` | — |
| Travel-Expenses | `pages/Travel-Expenses/` | — |
| Profile, PlayGround, Static, `[model]` | matching paths | — |

When adding a module, append a row to `SYSTEM_COVERAGE.md`.

## MODULE_BRAIN.md skeleton

```markdown
# {Module} Module Brain

## Overview
One paragraph: purpose, model count, main FE entry points.

## Backend Models
| Model | File | Lines | References |
|---|---|---|---|

## Backend Services
| Service File | Lines | Exported Functions |
|---|---|---|

## Dynamic API Usage
| File | Method | URL | Target Model |
|---|---|---|---|

## Risks / notes
- Bullet list
```

## DATA_FLOW.md skeleton

```markdown
# Data Flow: {Module}

## API Payloads
- **Component.jsx** -> `POST /populate/read/model` (payload summary)
```

## METHOD_INDEX.md rules

- Sort A→Z by symbol name (function, hook, component export)
- Columns: `Name | File | Lines | Callers | Purpose`

## Cross-module updates

When a Mongoose `ref` or shared collection changes:

1. Update module `CROSS_MODULE_MAP.md`
2. Update `_SYSTEM/SHARED_COLLECTIONS.md` inbound-ref table
3. Grep `frontend/src` and `backend/src/models` for the collection name

## Workflows (`.agent/workflows/`)

| Workflow | When |
|----------|------|
| `build-module-brain.md` | New module or full refresh |
| `sync-brain.md` | Brains copied from another client |
| `fix-single-bug.md` | Default bug fix path |
| `module-bug-audit.md` | Module audit |

## Code paths (Tracker)

| Variable | Path |
|----------|------|
| Models | `backend/src/models/` |
| Services | `backend/src/services/` |
| Populate | `backend/src/helper/populateHelper.js`, `backend/src/crud/` |
| FE pages | `frontend/src/pages/` |
| FE components | `frontend/src/components/` |
| Policies | `Ref Docs/DB Ref/access_policies.json` (access rules; not in brain by default) |

## Graphify (optional)

If `graphify-out/` exists and the task needs file relationship discovery, use the graphify skill after brain read — brain wins for business rules; graph for structural grep.
