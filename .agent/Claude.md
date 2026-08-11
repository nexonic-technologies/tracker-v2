## ⛔ STEP ZERO — BEFORE ANY TASK (NON-NEGOTIABLE)

> **This block overrides everything below. No exceptions. No shortcuts.**

Before writing ANY code, running ANY grep/search, or reading ANY source file, you MUST:

### 1. Load the Knowledge Brain skill

Read `.agent/skills/knowledge-brain/SKILL.md` — this is the mandatory pre-task system that governs all code work in this repo. It provides the pre-read sequence (system brain → module brain → related skills) and post-write update rules.

### 2. For UI / styling tasks

Also read `.agent/skills/frontend-ui-tokens/SKILL.md` — enforces theme-aware (light/dark) and responsive layouts on every page.

### 3. THEN proceed with code investigation

Only after Steps 1-2 are complete may you run grep, read source files, or write code.

**Violation of this order is a rule failure** — even if the fix turns out correct, the process was wrong.

---

# Project Rules — Workhub ERP Tracker System

> These rules apply to every conversation in this workspace. They are non-negotiable.

---

## 1. Framework & Coding Standards

### Frontend (React + Vite + JavaScript)
| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite 7 |
| Language | JavaScript (`.jsx` for components, `.js` for utilities/hooks) |
| Styling | Tailwind CSS 4 + `tokens.css` + MUI 7 |
| API client | `axiosInstance.js` → `useGenericAPI.js` hook |
| Routing | `react-router-dom` in `App.jsx` → `BaseLayout` |
| Forms | `FormPageLayout.jsx` + `{Module}/form.jsx` |
| Toasts | `react-hot-toast` |
| Socket | `socket.io-client` via `useSocket.js` |
| Push | Firebase FCM via `services/firebase.js` |
| Context | `authProvider.jsx`, `themeProvider.jsx`, `notificationProvider.jsx` |

- **Use `.jsx` for components, `.js` for utilities/hooks** — never `.tsx`/`.ts`
- Functional components only with React hooks
- API calls: always use `useGenericAPI.js` — never create raw axios calls
- Theme: light/dark via `.dark` class on `<html>`, toggled by `ThemeToggler`
- Design tokens from `styles/tokens.css` and `constants/uiTokens.js`
- `data-module` attribute on page wrappers for per-module accent colors
- No TypeScript, no React Query/TanStack

### Backend (Express 5 + Mongoose 8 + MongoDB)
| Layer | Technology |
|-------|------------|
| Runtime | Node.js, ES Modules (`"type": "module"`) |
| Framework | Express 5 |
| Database | MongoDB via Mongoose 8 |
| Auth | JWT (`jsonwebtoken`) |
| WebSocket | Socket.io 4 |
| Queue | Bull + Redis (ioredis) |
| Cache | Redis |
| Files | S3 (`@aws-sdk/client-s3`) |

- Models in `models/` — Mongoose schemas with `isDeleted` soft-delete pattern
- Routes in `routes/` — Express routers, thin orchestration
- Services in `services/` — business logic (thick services, thin routes)
- Middleware in `middlewares/` — auth, rate limiting, error handling
- Generic CRUD: `populateRoutes.js` → `POST /populate/:action/:model/:id`
- Pagination: `page`/`limit` in request body

---

## 2. API & Data Flow

Standard trace:
```
Browser → React (pages/components)
       → useGenericAPI / axiosInstance
       → /populate/:action/:model/:id
       → populateRoutes + services
       → Mongoose → MongoDB
       → response → UI state
```

- `POST /populate/read/:model` — list with filter/pagination
- `POST /populate/create/:model` — create
- `PUT /populate/update/:model/:id` — update
- `DELETE /populate/delete/:model/:id` — soft delete
- `POST /populate/bulk-create/:model` — bulk insert
- `PUT /populate/bulk-update/:model` — bulk update
- `DELETE /populate/bulk-delete/:model` — bulk delete

---

## 3. Frontend Conventions

- State management hierarchy: Component state → Context → URL params
- Custom hooks in `hooks/`, named `use{Feature}`
- Pages in `pages/`, reusable components in `components/`, layout in `layouts/`
- Form constants in `constants/{Module}Form.js`
- Utility functions in `utils/`
- Error handling: every API call must handle errors with try/catch + toast
- Imports: relative within a module, absolute from `src/` root for cross-module

---

## 4. Backend Conventions

- Mongoose middleware (pre/post hooks) for cascading operations
- Soft deletes: `isDeleted` field on models, always filter `isDeleted: false`
- Agent auth via `agentAuthMiddleware`
- Rate limiting via `rateLimitMiddleware`
- Race condition handling via `raceConditionHandler`
- Request tracing via `requestTracer`
- Error handling via `errorHandler`

---

## 5. Safety & Guardrails

- Never run destructive DB operations (`dropDatabase`, `deleteMany` without filter) without explicit approval
- Never modify `.agent/config.md` or `.agent/workflows/` without approval
- Never modify `axiosInstance.js` or `authProvider.jsx` without explicit approval
- When modifying shared components (`FormRenderer`, `TableGenerator`, `StatCard`, `Pagination`, `SearchBar`), check all pages that import them
- Context providers (`authProvider`, `themeProvider`, `notificationProvider`) are global — treat any change as a change to every module
- Backend uses `useGenericAPI.js` — never create raw axios calls in pages
- Never bypass `agentAuthMiddleware` on routes that modify data

---

## 6. Documentation & Process

- Always update `knowledge_brain/` after changes — see knowledge-brain skill post-task rules
- Reference module brain files: `MODULE_BRAIN.md`, `METHOD_INDEX.md`, `DATA_FLOW.md`, `CROSS_MODULE_MAP.md`
- Keep `METHOD_INDEX.md` entries alphabetical
- Add new module rows to `_SYSTEM/SYSTEM_COVERAGE.md`
- Shared collection changes → update `CROSS_MODULE_MAP.md` + `_SYSTEM/SHARED_COLLECTIONS.md`
- When presenting a fix or plan, show the specific lines changing
- Prioritize bugs by severity: Critical → High → Medium → Low
- If a fix touches more than 3 files, present an implementation plan first
- Reference module names (Attendance, HR, Tickets, Tasks, etc.) in commits

---

## 7. Environment

| Variable | Value |
|----------|-------|
| Frontend dev | `npm run dev` in `frontend/` → `http://localhost:5173` |
| Backend dev | `npm run dev` in `backend/` → `http://localhost:3000` |
| MongoDB | `mongodb://localhost:27017/tracker` |
| Backend models | `backend/src/models/` |
| Backend services | `backend/src/services/` |
| Backend routes | `backend/src/routes/` |
| FE pages | `frontend/src/pages/` |
| FE components | `frontend/src/components/` |
| FE constants | `frontend/src/constants/` |
| Brain | `knowledge_brain/` |

---

## 8. Modules

| Module | FE pages | Backend models |
|--------|----------|----------------|
| Attendance | `pages/Attendance/` | `Attendance.js`, `Regularization.js`, `Shift.js`, `Holiday.js`, `Leave*.js` |
| HR | `pages/HR/` | `Employee.js`, `Department.js`, `Designation.js`, `Role.js`, `hr_policies.js` |
| Tickets | `pages/Tickets/` | `Ticket.js`, `comments_threads.js` |
| Tasks | `pages/tasks/` | `Tasks.js`, `MileStone.js`, `Todo.js` |
| Master-Data | `pages/Master-Data/` | — |
| CRM | `pages/CRM/` | `Client.js`, `LeadType.js`, `ReferenceType.js` |
| Dashboard | `pages/Dashboard/` | `DailyActivity.js` |
| Settings | `pages/Settings/` | — |
| Payroll | `pages/Payroll/` | `Payroll.js`, `PayrollRun.js`, `SalaryStructure.js` |
| Travel-Expenses | `pages/Travel-Expenses/` | `Expense.js` |
| Profile | `pages/Profile/` | — |
| PlayGround | `pages/PlayGround/` | — |
| Core | `context/`, `api/`, `hooks/`, `layouts/` | 13+ models (auth, sessions, notifications, audit, etc.) |
| Common | `components/Common/` | — |
| role | `components/role/` | — |
| Static | `components/Static/` | — |
| [model] | `pages/[model]/` | Generic CRUD pages |
