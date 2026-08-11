# Central Configuration — Workhub ERP Tracker System

> **All workflows reference this file for project-level values.**
> **Local/machine-specific values are auto-detected in `.agent/.env` (see Pre-Flight in `/validate-workflows`).**

## Project Identity

| Variable | Value |
|----------|-------|
| `{PROJECT_ROOT}` | `E:\Loigmax\Tracker` |
| `{PROJECT_NAME}` | `tracker` |
| `{REPO_OWNER}` | `Workhub-Hub` |
| `{REPO_NAME}` | `Tracker` |
| `{FRAMEWORK}` | `React 19 + Vite 7 (Frontend) / Express 5 + Mongoose 8 (Backend)` |
| `{LOCALHOST_FE}` | `http://localhost:5173` |
| `{LOCALHOST_BE}` | `http://localhost:3000` |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + JavaScript + Vite 7 |
| UI | Tailwind CSS 4 + MUI 7 + custom `tokens.css` |
| State | React Context (no Redux, no TanStack Query) |
| Routing | React Router DOM 7 |
| Backend | Express 5 + Mongoose 8 |
| Auth | JWT (`jsonwebtoken` + `bcryptjs`) |
| WebSocket | Socket.io 4 |
| DB | MongoDB 6 |
| Queue | Bull + Redis (ioredis) |
| Cache | Redis |
| Storage | S3 (AWS SDK v3) |
| Push | Firebase Admin SDK (backend) + Firebase (frontend) |

## Environment Paths

| Variable | Value | Used By |
|----------|-------|---------|
| `{NODE_PATH}` | *(auto-detected by /validate)* | frontend lint, build |
| `{NPM_PATH}` | *(auto-detected by /validate)* | frontend install, dev server |
| `{NODE_SCRIPT}` | `npm run dev` | backend dev server |

## Directory Structure

| Variable | Value | Purpose |
|----------|-------|---------|
| `{FE_ROOT}` | `frontend/` | React+Vite app root |
| `{FE_SRC}` | `frontend/src/` | Source code |
| `{FE_PAGES}` | `frontend/src/pages/` | Page-level components |
| `{FE_COMPONENTS}` | `frontend/src/components/` | Reusable UI components |
| `{FE_API}` | `frontend/src/api/` | Axios config + API helpers |
| `{FE_SERVICES}` | `frontend/src/services/` | Service layer |
| `{FE_HOOKS}` | `frontend/src/hooks/` | Custom React hooks |
| `{FE_CONTEXT}` | `frontend/src/context/` | React Context providers |
| `{FE_UTILS}` | `frontend/src/utils/` | Utility functions |
| `{FE_LAYOUT}` | `frontend/src/layouts/` | Layout components |
| `{FE_CONSTANTS}` | `frontend/src/constants/` | Form configs, UI tokens |
| `{BE_ROOT}` | `backend/` | Express project root |
| `{BE_SRC}` | `backend/src/` | Backend source code |
| `{BE_MODELS}` | `backend/src/models/` | Mongoose models |
| `{BE_SERVICES}` | `backend/src/services/` | Business logic services |
| `{BE_ROUTES}` | `backend/src/routes/` | Express route handlers |
| `{BE_MIDDLEWARES}` | `backend/src/middlewares/` | Express middleware |
| `{BE_CRUD}` | `backend/src/crud/` | CRUD helpers |
| `{BE_HELPER}` | `backend/src/helper/` | Helper utilities |
| `{BRAIN_DIR}` | `knowledge_brain/` | Module brain storage |
| `{WORKFLOW_DIR}` | `.agent/workflows/` | Workflow definitions |

## Module Registry

> Each module has a backend model folder and a frontend page/component folder.

| Module | FE Page Dir | FE Component Dir | Backend Models | Status |
|--------|-------------|------------------|----------------|--------|
| Attendance | `pages/Attendance/` | — | `Attendance`, `Regularization`, `Shift`, `Holiday`, `Leave`, `LeavePolicy`, `leave_types` | Active |
| HR | `pages/HR/` | `components/role/` | `Employee`, `Department`, `Designation`, `Role`, `hr_policies` | Active |
| Tickets | `pages/Tickets/` | — | `Ticket`, `comments_threads` | Active |
| Tasks | `pages/tasks/` | — | `Tasks`, `MileStone`, `Todo` | Active |
| Master-Data | `pages/Master-Data/` | `components/MasterData/` | — | Active |
| CRM | `pages/CRM/` | — | `Client`, `LeadType`, `ReferenceType` | Active |
| Dashboard | `pages/Dashboard/` | — | `DailyActivity` | Active |
| Settings | `pages/Settings/` | — | — | Active |
| Payroll | `pages/Payroll/` | — | `Payroll`, `PayrollRun`, `SalaryStructure` | Active |
| Travel-Expenses | `pages/Travel-Expenses/` | — | `Expense` | Active |
| Profile | `pages/Profile/` | — | — | Active |
| PlayGround | `pages/PlayGround/` | — | — | Active |
| [model] | `pages/[model]/` | — | — | Active |
| Core | `api/`, `context/`, `layouts/`, `hooks/` | — | 13+ (Auth, Session, Audit, Notification, etc.) | Active |
| Common | — | `components/Common/` | — | Active |
| role | — | `components/role/` | — | Active |
| Static | — | `components/Static/` | — | Active |

## Agent Behavioral Rules

| Rule ID | Rule |
|---------|------|
| AGENT-001 | Never modify database collections directly — always show the aggregation/update pipeline first |
| AGENT-002 | Never delete code — comment with reason |
| AGENT-003 | Never modify `node_modules/` or framework core |
| AGENT-004 | When editing shared components, test ALL pages that use them |
| AGENT-005 | Never test against production URLs — always use `{LOCALHOST_FE}` / `{LOCALHOST_BE}` |
| AGENT-006 | Never skip a workflow step silently — state what, why, and impact |
| AGENT-007 | If `.agent/.env` is missing or wrong, run `/validate-workflows` Pre-Flight first |
| AGENT-008 | Never modify `axiosInstance.js` or `authProvider.jsx` without explicit approval |
| AGENT-009 | No TypeScript — all frontend code is `.jsx`/`.js` |
| AGENT-010 | API calls must use `useGenericAPI.js` — no raw axios calls in pages |

> **First time on a new machine?** Run `/validate-workflows` — the Pre-Flight auto-detects all local settings.
