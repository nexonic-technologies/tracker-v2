---
trigger: always_on
---

# Rule: Auto-Verification & Code Philosophy Audit

## Purpose
Governs how the AI agent approaches development and verification for the **Tracker
backend** (Node.js/Express + MongoDB, Populate Engine-driven). Prioritizes platform
integrity over the speed of any single feature.

**Scope:** Backend only (`/src` — models, services, policies, engine). Frontend
(React/Flutter) is out of scope and must never be pulled into a `verify system` run.

---

## Execution Trigger

| Trigger | When | Scope |
|---|---|---|
| **Pre-code check** | Before writing any code | Section 0 only |
| **`verify [model]`** | User names a model, e.g. `verify Ticket` | Scoped — see §11 |
| **`verify system`** | Full-system verification requested | No exceptions — see §12 |
| **Implicit** ("completed"/"run tests") | End of task, no scope given | Treated as `verify [model]` for each model touched |

1. **Pre-code:** Perform the Platform Philosophy Check (Section 0), state a formal decision.
2. **On `verify [model]`/`verify system`:** The AI agent **MUST NOT** execute any verification or registry scripts automatically. The agent must write/complete the scripts, provide the execution command to the user, and wait for the user to run them manually and paste the console response.
3. Both scoped commands end in a CTO Verdict (§10) with scope metadata attached.

---

## 0. Platform Philosophy Check (First Gate)
1. **Platform Extension vs. Business Module:** Core capability (query caching, auth
   guard, notification type) or domain feature (asset incident field)?
2. **Redundancy Check:** Does this logic already exist in another service/utility/config map?
3. **Solve via Configuration:** Can this be a config change (`status_mapping`,
   `status_configs`, `access_policies`, `ApprovalWorkflow`) instead of new code?
4. **Engine Evolution:** If it forces a change to `buildReadQuery.js` etc. or needs
   a hacky override, recommend improving the engine instead of bypassing it.
5. **Principle Preservation:** Does this violate *"controllers are generic; domain
   rules live strictly in service hooks"*?

### Decision (pick exactly one)
`✓ Configuration Change` · `✓ Business Module Change` · `✓ Platform Enhancement` · `✓ Architectural Refactor`

*Protect the platform before protecting the feature.*

---

## 1. Audit Severity
**🔴 Blocking:** Platform Philosophy Alignment · Architecture Compliance ·
Security & ABAC · Business Rule Placement · Regression · Data Integrity/Transactions.
**🟠 Warning:** Documentation · Performance · Future Scalability · DX · Platform Leverage.
**🟢 Informational:** Score Card · Refactoring Opportunities · Framework Improvement Ideas.

---

## 2. Architecture Compliance (🔴)
* **Zero Raw Handlers:** No custom Express routes for standard CRUD — everything
  flows through `populateHelper` (`/api/populate/:action/:model`).
* **Existing Engine Reuse:** Reuses existing filters/registries/status maps? If a
  new helper is introduced, justify why existing ones were insufficient.
* **Engine Bypasses:** Flag direct DB queries inside custom utilities/routers instead
  of the ABAC policy query framework.

---

## 3. Business Rule Audit (🔴/🟠)
* **Logic Location (🔴):** All business rules live in `/src/services/` lifecycle hooks only.
* **Idempotency (🔴):** Safe to run twice? (webhook/cron/queue retries)
* **Valid Status Transitions (🔴):** Validated against `status_configs.js`.
* **Deterministic Calculations (🔴):** Payroll/overtime math must be deterministic.
* **Transaction Boundaries (🔴):** Side effects (notifications, linked updates) fire
  only after a successful commit.

---

## 4. Performance Audit (🟠)
* **Complexity:** `O(1)` by-ID · `O(log n)` compound index · `O(n)` collection scan · `O(n²)` N+1.
* **Index Usage:** Match against `databaseIndexer.js`; warn on collection scans.
* **Populate Cost:** Check depth/width of populate trees; project minimal fields on nested arrays.

---

## 5. Future Scalability Audit (🟠)
Identify the first bottleneck at `100 → 1M` docs: `CPU` / `Memory` / `MongoDB` /
`Redis` / `Queue` / `Network` / `Dev Productivity` / `Human Ops`.

---

## 6. Platform Leverage Audit (🟠)
**(A) Use the Framework** — consumes the existing engine.
**(B) Improve the Framework** — adds a reusable helper/guard other modules inherit.

---

## 7. Developer Experience Audit (🟠)
Can a new dev understand this module fully from **Schema + Service Hook + Policy
rules** alone? If logic leaks into controllers/middleware/external scripts → flag.

---

## 8. Framework Stability Audit (🔴)
Did this touch `buildReadQuery.js`, `policyEngine.js`, `registryExecutor.js`, or
`AuthController.js`? If yes: which modules are affected, is backward compatibility
maintained, is migration documentation required?

---

## 9. Regression & Hidden Dependency Audit (🔴)
Map effects on: *Attendance / Payroll / Notifications / Tasks / Tickets / Dashboard
/ Feeds / Analytics / Approval Workflow*. Run scripts against dependents to confirm
query compilation and hooks still function.

---

## 10. Score Card & CTO Verdict

| Category | Min Score |
|---|---|
| Platform Philosophy | 100 |
| Architecture Compliance | 95 |
| Security & ABAC | 100 |
| Business Rules | 95 |
| Regression | 100 |
| Performance | 75 |
| Documentation | 70 |
| Developer Experience | 70 |
| Platform Leverage | 60 |

```markdown
## CTO Verdict: [APPROVED | APPROVED WITH WARNINGS | REQUIRES ARCHITECTURE REVIEW | REJECTED]

### Scope: [MODEL: <name> | SYSTEM]
### Modules Checked: [list]
### Modules Skipped (must be empty for SYSTEM): [list or "none"]

### Top 3 Risks:
1. ...

### Top 3 Strengths:
1. ...

### Recommended Next Action:
* ...
```

---

## 11. `verify [model]` — Scoped

**Resolution:** a model name resolves to:
`/src/models/<Model>.js`, `/src/services/<model>.service.js`,
`/src/policies/<model>.policy.js`, plus its entries in `status_configs.js`,
`databaseIndexer.js`, `ApprovalWorkflow`. Missing file → 🟠 Warning, not silent skip.

**Runs:** §0, 2, 3, 4, 7 in full; §8 only if the model touches engine-level files.

**§9 is reduced, not skipped:** only check modules with a *declared* dependency
(populate refs, shared status maps, explicit imports) — not the full graph.

**Output:** `Scope: MODEL: <name>` + a `Modules Skipped` list, so a model pass never
silently implies platform-wide coverage.

---

## 12. `verify system` — Full, No Exceptions

* §9's dependency map is expanded fully — every module pair, including transitive
  links through shared hooks/config, not just declared ones.
* No §10 threshold may be downgraded or treated as informational regardless of platform size.
* `Modules Skipped` must be empty. If not, verdict is capped at `REQUIRES ARCHITECTURE REVIEW`.
* Expected to be heavier than `verify [model]` — run before releases, not every commit.

---

## 13. Verification Script Registry (Automation Layer)

**CRITICAL EXECUTION RULE**: The AI agent **MUST NOT** run these scripts automatically. The agent should write/complete them, provide the exact console execution commands to the user, and wait for the user to run them manually and paste the console output.

Scripts live under `/scripts/verify/`. No script yet for a check → flag as an
automation gap (🟠), don't substitute a manual read as equivalent.

| Audit | Script | Checks |
|---|---|---|
| Raw Handlers | `check-raw-routes.js` | Routes outside `populateHelper` |
| Rule Location | `check-service-hooks.js` | Domain logic found outside `/src/services` |
| Status Transitions | `check-status-transitions.js` | Diff vs `status_configs.js` |
| Index Usage | `check-indexes.js` | Filters vs `databaseIndexer.js` |
| Transaction Boundaries | `check-tx-boundaries.js` | Side effects not post-commit |
| Engine Contract Diff | `check-engine-diff.js` | Diff of 4 core engine files vs last verified baseline |
| Dependency Graph | `check-dependency-graph.js` | Import/populate graph (declared-only for §11, transitive for §12) |
| ABAC Field Gates | `check-abac-fields.js` | Sensitive fields vs policy rules |

**Runner:**
```bash
node scripts/verify/run.js --model=Ticket
node scripts/verify/run.js --system
```

Building these scripts out is the highest-leverage next step — it's what turns
"verify" from re-reading files into real automation.