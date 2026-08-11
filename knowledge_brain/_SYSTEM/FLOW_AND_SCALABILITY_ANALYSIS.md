---
Purpose: Analyze request flow pathways, evaluate API capacity thresholds, and detail concurrency locking bottlenecks.
Audience: Platform Engineers, DevOps Engineers, and System Architects.
Status: ARCHITECTURAL_RECOMMENDATION
Related Documents:
  - [System Architecture Guide](file:///E:/Loigmax/Tracker/knowledge_brain/_SYSTEM/SYSTEM_ARCHITECTURE_GUIDE.md)
  - [Architectural Decision Records](file:///E:/Loigmax/Tracker/knowledge_brain/_SYSTEM/ARCHITECTURAL_DECISION_RECORDS.md)
  - [Shared Collections](file:///E:/Loigmax/Tracker/knowledge_brain/_SYSTEM/SHARED_COLLECTIONS.md)
Owner: Core Platform Team
Last Review: 2026-06-27
Architecture Version: 2.2.0
---

# Tracker Platform: Flow & Scalability Analysis

This document provides a technical evaluation of the Tracker runtime under concurrent workload, details identified bottleneck paths, and provides architectural recommendations for scale.

---

## 1. Current Behaviour

### 1.1 Mutation Execution Pathway
All create, update, and delete actions routing through the dynamic endpoint undergo the following sequence:
1. **Access Check**: Policy verification is executed against configurations in `access_policies.json`.
2. **Dynamic Service Check**: If a service exists in `backend/src/services/` (cached via `servicesCache.js`), the engine loads the hooks.
3. **Write Execution**: Database writes are completed by `crud/build[Action]Query.js`.
4. **Audit Logger**: Update and delete mutations trigger `saveAuditLog` to write change traces to the `AuditLog` collection.

---

## 2. Known Constraints (Confirmed Bottlenecks)

### 2.1 Global Concurrency Middleware Bypass
The middleware `raceConditionMiddleware` is registered globally in [index.js](file:///E:/Loigmax/Tracker/backend/src/index.js):
```javascript
app.use(raceConditionMiddleware({ enabled: true }));
```
Because global middleware executes before Express routes match path parameters, `req.params` is empty `{}` during this evaluation. The middleware attempts to extract `docId` via `req.params.id`, which resolves as `undefined`, causing the locking engine to skip execution.

### 2.2 In-Memory Locking Limits
The `raceConditionHandler` utilizes local Maps (`this.locks` and `this.versions`) to manage transaction locking states. Under clustered environments (multiple Node.js instances or containerized nodes behind a load balancer), locking contexts are isolated to individual processes, allowing race conditions to bypass the gates.

### 2.3 Dynamic Import Overhead
Dynamic resolution of services executes an asynchronous dynamic `import()` on every write transaction inside [buildUpdateQuery.js](file:///E:/Loigmax/Tracker/backend/src/crud/buildUpdateQuery.js) and [buildCreateQuery.js](file:///E:/Loigmax/Tracker/backend/src/crud/buildCreateQuery.js). Under high concurrent load, this dynamic file system resolution blocks the V8 compilation threads.

### 2.4 Missing Audit Paths
Creation mutations executed inside [buildCreateQuery.js](file:///E:/Loigmax/Tracker/backend/src/crud/buildCreateQuery.js) do not call `saveAuditLog`. As a result, document initialization traces are missing from the audit trails.

---

## 3. Performance Assumptions (600 Concurrent Users)

The following operational metrics are estimated system load parameters based on standard enterprise usage patterns:

- **RPS (Requests Per Second) Assumption**: 600 active concurrent users generate an average of **60 RPS** (assuming 1 request per user every 10 seconds).
- **Peak Burst Assumption**: A 9:00 AM clock-in burst generates **140 RPS** (assuming 100 simultaneous user logins inside a 5-second window loading a dashboard containing 7 API calls).
- **Mongoose Populate Multiplier**: A single operational read (e.g. `employees`) referencing designations, departments, roles, and managers executes **5 separate MongoDB operations** under the hood.
- **Database Load Assumption**: A peak load of 140 RPS requires the database to process **700 MongoDB operations per second**.

---

## 4. Capacity Planning & Limits

To prevent connection exhaustion and latency spikes, we establish the following operational thresholds:

### Infrastructure Threshold Table

| Traffic State | Avg API Latency | MongoDB CPU Load | Connection Pool | Expected System Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Optimal** | < 80 ms | 10% - 25% | < 20 active connections | Instant page loads, responsive SPA widgets. |
| **Peak Load** | 150 ms - 300 ms | 45% - 60% | 20 - 50 active connections | Light lag, normal system execution. |
| **Congested** | > 2,000 ms | 90% - 100% | > 80 active connections | Event loop blocked, Gateway timeouts. |

---

## 5. Architectural Recommendations

### 5.1 Relocate Locking Middleware
Register the `raceConditionMiddleware` inside the parameterized router file [populateRoutes.js](file:///E:/Loigmax/Tracker/backend/src/routes/populateRoutes.js) instead of globally in `index.js`. This guarantees that `req.params.id` is fully parsed and available to the lock extractor.

### 5.2 Transition to Redis Distributed Locking
Replace the local Map variables in [raceConditionHandler.js](file:///E:/Loigmax/Tracker/backend/src/services/raceConditionHandler.js) with a Redis-backed key-value store to support horizontal scaling across clustered processes.

### 5.3 Static Service Caching at Bootstrap
Modify [servicesCache.js](file:///E:/Loigmax/Tracker/backend/src/utils/servicesCache.js) to pre-load and cache the service class instances at boot time, eliminating the runtime `import()` file system checks on write actions.

### 5.4 Centralized Mongoose Audit Plugin
Instead of calling `saveAuditLog` manually inside individual query builder files, implement a Mongoose plugin that hooks into `post('save')`, `post('findOneAndUpdate')`, and `post('findOneAndDelete')` globally. Utilize Node's `AsyncLocalStorage` to capture the request context (user, role, IP) seamlessly.
