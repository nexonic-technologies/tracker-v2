# SACRED RULE: Scalable Anti-Hardcode Architecture & No Temporary Patches (ZERO TOLERANCE)

## Purpose
Enforces absolute, uncompromising long-term platform stability over quick temporary patches across all backend and frontend tasks. This rule is SACRED and MANDATORY WITHOUT EXCEPTION.

## Uncompromising Behavioral Laws
1. **SACRED LAW: Zero Ad-Hoc `if` Checks & Zero Hardcoding**: NEVER propose, write, or accept ad-hoc `if` checks in application code that attempt to decide business logic, access, or feature availability on behalf of the engine. Do not define `if` checks to guess or pre-resolve permissions—let the Policy Engine, database registries, and schema contracts resolve execution paths declaratively.
2. **SACRED LAW: Schema Single Source of Truth**: Security capabilities, role permissions, and access controls MUST be governed strictly by database schema flags (e.g. `Role.isSuperAdmin` / `UserLogin.isSuperAdmin` boolean properties), dynamic access policies, or environment configurations — NEVER hardcoded string titles or hardcoded ObjectIds.
3. **SACRED LAW: Root Cause & Scalability First**: Before writing any line of code, analyze the underlying architecture to design the most scalable, robust, anti-hardcode solution. Always use Planning Mode for structural changes.
4. **SACRED LAW: Clean Policy Execution**: In policy validation, engine layers, middleware, and controllers, if `user.isSuperAdmin` (or `roleMeta.isSuperAdmin`) is `true`, immediately bypass policy checks cleanly. Otherwise, evaluate the dynamic policy rules cleanly without redundant role-id matching or string heuristics.
5. **SACRED LAW: Zero Role-Scoping on Models (Multi-Tenant SaaS Architecture)**: Any newly implemented or existing model MUST NEVER be restricted by hardcoding role string title comparisons (e.g. `if (role === 'Finance Manager')` or `allowedRoles = [...]`). Because this product provides multi-organization SaaS solutions where each organization configures unique policies, access control is governed strictly by the dynamic Policy Engine (`policyEngine.js`). Never pre-check or scope model access with string role logic in routes or controllers—if a user lacks permission, the Policy Engine evaluates database policies and handles access rejection cleanly.
6. **SACRED LAW: Mandatory Frontend Design Skill (Every UI Page Without Exception)**: Before creating, modifying, or reviewing ANY UI page, component, dashboard, form, or layout — the agent MUST read and apply ALL rules from `.agent/skills/frontend-design/SKILL.md`. This file is NEVER optional. It contains Sacred UI Design Laws including Information-First Density (content defines space, containers do not), 2026-Grade Visual Standards (glass surfaces, semantic HSL tokens, micro-interactions, command-grade search), and the Anti-Pattern Rejection Checklist. Building UI without reading this file first is a strict violation.
7. **SACRED LAW: Proactive Architectural Defense & Zero-Drift Engineering**: Even if the user suggests, approves, or asks for an ad-hoc shortcut or temporary denormalization (such as mass-mutating document arrays across thousands of records, procedural fallback chains, or dual sources of truth), the agent MUST NEVER blindly implement it. The agent is duty-bound to proactively debate, defend, and propose superior enterprise architecture (transactional ledgers, pure declarative hierarchies, event-driven derivations, and single sources of truth). Never allow architectural degradation or technical debt under any circumstance.
8. **SACRED LAW: Pure Page-Only `src/pages` Routing Integrity (ZERO TOLERANCE)**: In the Frontend (`src/pages/`), ONLY files that represent true top-level page routes (screens directly mapped to browser URLs) may exist. Reusable components, sub-components, widgets, data grids, sidebars, layout wrappers, helpers, configs, or utilities MUST NEVER be created inside `src/pages/`. Because the application uses automatic file-based routing (`vite-plugin-pages` / `~react-pages`), every file in `src/pages/` is automatically registered as a live page route. Placing components or utilities in `src/pages/` generates phantom, broken routes. All components must live strictly in `src/components/` (or `src/widgets/`, `src/layouts/`, `src/utils/`, `src/services/`).
9. **SACRED LAW: Epistemic Gap & Teacher-Bootstrapped Knowledge Growth (ZERO STRING HARDCODING)**: J.A.R.V.I.S. is a self-evolving Neuro-Symbolic Cognitive Brain, NOT a static chatbot or hardcoded string template system. NEVER write ad-hoc string concatenation or heuristic text stitching (`narrative.push(...)`, `sample.join(...)`, `You have X unread...`) in application tools or realizers. When J.A.R.V.I.S. encounters an unknown vocabulary, intention, or novel multi-document synthesis task that it has not yet learned, it delegates the epistemic gap to the LLM Teacher. The teacher's response is immediately ingested into MongoDB Global Brain (`jarvis_memories`) and Knowledge Graph (`jarvis_relationships`) by `LearningAnalyst` to expand J.A.R.V.I.S.'s internal cognitive representation. All subsequent interactions resolve strictly from J.A.R.V.I.S.'s own internal brain in 0 API tokens (<5ms).
10. **SACRED LAW: Mandatory Version Increment & Dedicated Branch Isolation (ZERO UNVERSIONED UPDATES)**:
    - **Never Commit on Protected Branches**: The agent MUST NEVER perform work, commit, or complete updates directly on `main` or `staging`. Every update, bug fix, refactor, or feature MUST be developed on a dedicated new branch (e.g. `feat/<name>`, `bug-fix/<issue>`, `refactor/<module>`, `hotfix/<patch>`).
    - **Mandatory Version Increment Upon Task Completion**: Every completed update, fix, or feature MUST bump and synchronize the project version. The deployment verification gate (`scripts/verify-deploy-version.mjs`) strictly rejects and halts builds on Render (Backend) and Vercel (Frontend) if the codebase SemVer is not strictly higher than the live deployed version. Failure to increment the version blocks deployments.
    - **Centralized Version Tool Execution**: The version bump MUST ALWAYS be executed via the centralized versioning script (`npm run version:bump patch` for patches/fixes, `npm run version:bump minor` for new features/modules, or `npm run version:bump major` for breaking changes). Never manually edit disparate `version` fields. The script guarantees atomic synchronization across `version.json`, root `package.json`, `Backend/package.json`, `Frontend/package.json`, `Frontend/public/version.json`, `tracker_mobile/pubspec.yaml`, and `releaseNotes.json`.
    - **Branch Migration Protocol**: Before initiating work or upon completing the task, ensure the working tree is cleanly moved to the new dedicated branch (`git checkout -b <branch-name>`), verify the version gate passes (`npm run verify:backend`, `npm run verify:frontend`), and commit cleanly with SemVer notes.

## SACRED KNOWLEDGE: Versioning & Branch Lifecycle Pipeline

All code changes must adhere to the standard branch isolation and automated version gate pipeline:

```
[Start Task / Update Request]
     │
     ▼
1. Branch Isolation (`git checkout -b <type>/<task-name>`)
   - Type conventions: `feat/`, `bug-fix/`, `refactor/`, `hotfix/`.
   - Never develop or commit directly on `main` or `staging`.
     │
     ▼
2. Implementation & Quality Verification
   - Implement according to Sacred Laws 1–9.
   - Run tests and code audits.
     │
     ▼
3. Centralized Version Increment (`npm run version:bump <type>`)
   - `patch`: Standard bug fixes, minor UI tweaks, or maintenance.
   - `minor`: New feature modules, schema extensions, or new endpoints.
   - `major`: Breaking platform or architectural revisions.
   - Atomically updates:
     • `version.json`
     • `package.json` (Root, Backend, Frontend)
     • `Frontend/public/version.json`
     • `tracker_mobile/pubspec.yaml`
     • `Backend/src/constants/releaseNotes.json`
     │
     ▼
4. Deployment Gate Pre-Check (`npm run verify:backend` / `verify:frontend`)
   - Ensures codebase version strictly exceeds currently deployed live endpoints.
     │
     ▼
5. Commit & Pull Request
   - Commit changes: `git commit -m "<type>(<scope>): <summary> (vX.Y.Z)"`
   - Push new branch and prepare PR into target branch (`staging` or `main`).
```

## SACRED KNOWLEDGE: Master Populate API Pipeline Architecture

All API requests for standard application entities MUST follow the single, unified Populate Pipeline without exception. Creating raw custom Express router endpoints for standard models is strictly forbidden.

```
[HTTP Request]
     │
     ▼
1. Entry Route Handler (`populateRoutes.js`)
   - Receives HTTP request (`/api/populate/:action/:model` or `/api/populate/:action/:model/:id`).
   - Delegates request directly to `populateHelper.js`.
     │
     ▼
2. Parameter Standardization & Context Builder (`populateHelper.js`)
   - Extracts params (`action`, `model`, `id`, `fields`, `filter`, `body`).
   - Standardizes parameters and merges user populate preferences.
   - Assembles unified context (`makeCtx`) attaching `tenantContext` and `user` (with `isSuperAdmin` schema boolean flag).
     │
     ▼
3. Dynamic Policy & Security Evaluation (`policyEngine.js` -> `buildQuery` -> `Validator.js`)
   - Evaluates request security via `buildQuery`.
   - If `user.isSuperAdmin` schema boolean is `true`, immediately bypasses policy checks cleanly.
   - Otherwise, evaluates dynamic database policies cleanly without hardcoded string role matching.
     │
     ▼
4. Domain Service Hooks (`/src/services/<model>.js`)
   - Executes lifecycle hooks (`beforeCreate`, `beforeUpdate`, `afterCreate`, etc.) strictly within service hooks.
     │
     ▼
5. Tenant Database Execution & Standard Response (`TenantConnectionManager.js` & Mongoose)
   - Executes query against isolated tenant database.
   - Returns standard JSON response `{ success: true, data, count }`.
```
