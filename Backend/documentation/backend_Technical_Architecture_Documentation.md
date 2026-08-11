# Backend Platform Architecture Documentation

## 1. Executive Summary: Architectural Intent

### The Problem Traditional Backends Fail to Solve

Traditional backend architectures enforce a rigid coupling between business logic and deployment cycles. Every new feature, workflow modification, or policy change requires code changes, testing, and redeployment. This creates several systemic failures at scale:

1. **Deployment Friction**: Business rule changes require engineering intervention, release cycles, and production deployments.
2. **Controller Proliferation**: Each entity spawns dedicated controllers, routes, and service files, creating exponential code growth.
3. **Policy Fragmentation**: Access control logic becomes scattered across middleware, controllers, and database queries.
4. **Lifecycle Rigidity**: Hardcoded hooks prevent runtime modification of approval chains, notifications, and state transitions.
5. **Multi-Tenant Impossibility**: Per-tenant customization requires code branching or complex conditional logic.

### Why Controller-Based Systems Break at Scale

Controller-per-model architectures assume static business requirements. In enterprise reality:

- A `LeaveController` handling three approval levels today must handle five tomorrow.
- A `TicketController` with status transitions must accommodate client-specific workflows.
- A `TaskController` optimized for one team's process becomes a bottleneck for others.

Each modification risks regression across the entire model surface area.

### Why This Platform Intentionally Removes Static Controllers

This backend operates on a fundamentally different principle: **the database IS the configuration layer**. Instead of encoding business logic in controllers, the system:

- Stores access policies as database documents (`access_policies` model)
- Resolves CRUD operations dynamically via `populateHelper`
- Applies lifecycle hooks through auto-discovered services
- Enforces field-level permissions through the policy engine
- Enables workflow evolution without code changes

### What Makes This Backend Fundamentally Different

| Traditional Architecture | This Platform |
|--------------------------|---------------|
| Controllers define behavior | Policies define behavior |
| Routes per entity | Single unified route |
| Hardcoded validations | Policy-driven sanitization |
| Static lifecycle hooks | Service-based optional hooks |
| Code deploys for changes | Data updates for changes |
| Role checks in code | Role enforcement in engine |

---

## 2. Current System Reality: As-Built Architecture

### System Entry Point

The backend initializes through `src/index.js`:

```
src/index.js
├── Express application setup
├── Middleware chain:
│   ├── express.json (body parsing)
│   ├── cookieParser (session cookies)
│   ├── cors (origin validation)
│   ├── agentAuthMiddleware (external agent JWT)
│   ├── requestTracer (request ID injection)
│   └── apiHitLogger (request logging)
├── Route registration:
│   ├── /api/agent → agentRoutes
│   ├── /api/agent-invite → agentInviteRoutes
│   ├── /api/auth → AuthRouter
│   ├── /api/populate → populateHelper  [PRIMARY]
│   ├── /api/files → fileRoutes
│   ├── /api → locationRoutes, bankRoutes
│   └── /api/config → configRoutes
├── Socket.io initialization
├── Memory management intervals
└── Graceful shutdown handlers
```

### Directory Structure

```
src/
├── Config/
│   ├── ConnectDB.js           # MongoDB connection
│   └── defaultPopulateFields.js # Per-model populate defaults
├── Controller/
│   └── AuthController.js      # Authentication logic
├── crud/
│   ├── buildCreateQuery.js    # Create operation handler
│   ├── buildReadQuery.js      # Read/List operation handler
│   ├── buildUpdateQuery.js    # Update operation handler
│   ├── buildDeleteQuery.js    # Soft-delete operation handler
│   └── buildReportQuery.js    # Aggregation/report handler
├── helper/
│   └── populateHelper.js      # Central execution engine
├── middlewares/
│   ├── agentAuthMiddleware.js # External agent JWT validation
│   ├── apiHitLogger.js        # Request logging
│   ├── auth.js                # Internal auth middleware
│   ├── errorHandler.js        # Global error handler
│   ├── multerConfig.js        # File upload configuration
│   ├── notificationMessagePrasher.js # Notification templates
│   ├── performanceMiddleware.js # Query performance monitoring
│   └── requestTracer.js       # Request ID injection
├── models/
│   ├── Collection.js          # Model registry (29+ models)
│   ├── access_policies.js      # Policy schema
│   ├── Employee.js            # User entity
│   ├── Session.js             # Session management
│   ├── AuditLog.js            # Audit trail
│   └── [26+ domain models]
├── routes/
│   └── populateRoutes.js      # Unified API routing
├── services/
│   ├── [model-name].js        # Lifecycle hook implementations
│   └── [19 service files]
└── utils/
    ├── policy/
    │   ├── policyEngine.js    # Core policy enforcement
    │   └── registry/
    │       ├── index.js       # Registry function map
    │       ├── isSelf.js      # Self-ownership check
    │       ├── isManager.js   # Hierarchy check
    │       ├── isAssigned.js  # Assignment check
    │       └── [9 registry functions]
    ├── cache.js               # Policy cache layer
    ├── servicesCache.js       # Service file discovery
    ├── Validator.js           # Input validation engine
    ├── sanitizeRead.js        # Read field sanitization
    ├── sanitizeWrite.js       # Write field sanitization
    ├── sanitizeUpdate.js      # Update field sanitization
    ├── auditLogger.js         # Audit log persistence
    ├── registryExecutor.js    # ABAC rule execution
    ├── filterParser.js        # Query filter parsing
    ├── mongoFilterCompiler.js # MongoDB filter building
    ├── safeAggregator.js      # Aggregation safety limits
    └── queryOptimizer.js      # Query performance optimization
```

### Model Registry

The `Collection.js` file exports all 29 Mongoose models:

```javascript
const models = {
  access_policies,    // Policy definitions
  employees,         // User/Employee entity
  departments,       // Organizational units
  designations,      // Job titles
  roles,             // Role definitions
  leave_types,        // Leave type master
  leavepolicy,       // Leave policy rules
  leaves,            // Leave requests
  attendances,       // Attendance records
  regularizations,   // Attendance corrections
  shifts,            // Work shift definitions
  tasks,             // Task management
  task_types,         // Task categorization
  tickets,           // Support tickets
  clients,           // Client entities
  daily_activities,   // Time tracking
  project_types,      // Project categorization
  comments_threads,   // Discussion threads
  notifications,     // Push notifications
  todos,             // Personal tasks
  expenses,          // Expense tracking
  payrolls,          // Payroll records
  hrpolicies,        // HR policy documents
  agents,            // External agent users
  milestones,        // Project milestones
  session,           // Active sessions
  auditlog,          // Audit trail
  errorlog,          // Error tracking
  api_hit_logs,        // API usage tracking
  sidebars,          // Menu configuration
  email_configs,      // Email settings
  reference_types,    // Reference data
  lead_types          // Lead categorization
};
```

### Middleware Chain

Requests flow through a defined middleware sequence:

1. **`express.json`**: Parses JSON body with 10MB limit
2. **`cookieParser`**: Extracts cookies for session tokens
3. **`cors`**: Validates origin against whitelist and LAN regex
4. **`agentAuthMiddleware`**: Validates external agent JWTs before auth
5. **`requestTracer`**: Attaches unique request ID for tracing
6. **`apiHitLogger`**: Logs request metadata to ApiHitLog model
7. **Route handlers**: Process business logic
8. **`errorHandler`**: Catches and formats errors

### Authentication System

The `AuthController.js` implements:

- **Login**: Validates credentials, creates JWT with rotating secrets, establishes session
- **Session Management**: Device-bound sessions with unique secrets per session
- **Token Refresh**: JTI-based replay protection with full secret rotation
- **Logout**: Deactivates sessions, clears cookies
- **Push Token Storage**: Associates FCM tokens with sessions

Session schema stores:
- `generatedToken`: Access token, secret, and expiry
- `refreshToken`: Refresh token, secret, JTI, and expiry
- `deviceUUID`: Device binding
- `platform`: Web/mobile differentiation
- `fcmToken`: Push notification token

---

## 3. Core Execution Engine: Populate as the Spine

### populateHelper as Execution Engine

The `populateHelper.js` file (495 lines) serves as the central API resolver:

```javascript
router.all("/:action/:model", authMiddleware, upload.fields([...]), populateHelper);
router.all("/:action/:model/:id", authMiddleware, upload.fields([...]), populateHelper);
```

Every CRUD request flows through this single handler:

```
POST /api/populate/create/employees     → Create employee
GET  /api/populate/read/employees       → List employees
GET  /api/populate/read/employees/:id   → Get single employee
PUT  /api/populate/update/employees/:id → Update employee
DELETE /api/populate/delete/employees/:id → Soft-delete employee
```

### Request Processing Pipeline

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. NORMALIZE INPUTS                                         │
│    ├─ Extract action, model, id from params                 │
│    ├─ Parse fields, filter, populateFields from query       │
│    ├─ Handle type-based field selection (summary/detailed)  │
│    └─ Normalize filter (JSON/expression/key-value)          │
├─────────────────────────────────────────────────────────────┤
│ 2. SPECIAL CASE HANDLERS                                    │
│    ├─ Agent client products query                           │
│    └─ Bulk upsert for access policies                       │
├─────────────────────────────────────────────────────────────┤
│ 3. POPULATE FIELD RESOLUTION                                │
│    ├─ Load DEFAULT_POPULATE_FIELDS for model                │
│    ├─ Parse user overrides (array/object/string formats)    │
│    └─ Merge into finalPopulate object                       │
├─────────────────────────────────────────────────────────────┤
│ 4. FILE UPLOAD HANDLING                                     │
│    ├─ Process single file (req.file)                        │
│    └─ Process multiple attachments (req.files.attachments)  │
├─────────────────────────────────────────────────────────────┤
│ 5. INVOKE POLICY ENGINE                                     │
│    └─ buildQuery({role, userId, action, modelName, ...})    │
├─────────────────────────────────────────────────────────────┤
│ 6. RETURN RESPONSE                                          │
│    ├─ 201 for create, 200 for others                        │
│    └─ { success, count, data, type }                        │
└─────────────────────────────────────────────────────────────┘
```

### policyEngine.buildQuery: The Core Function

```javascript
export async function buildQuery({
  role,
  userId,
  action,
  modelName,
  docId,
  fields,
  body,
  filter,
  populateFields,
  returnFilter
}) {
  // 1. Validate model exists
  const Model = models[modelName];
  if (!Model) throw new Error(`Model "${modelName}" not found`);

  // 2. Load policy from cache
  const policy = getPolicy(role, modelName);

  // 3. FAIL-CLOSED: No policy = blocked
  if (!policy) {
    throw new Error(`⛔ CRITICAL SECURITY: No policy defined for role '${role}' on model '${modelName}'`);
  }

  // 4. Validate inputs against policy
  const { filter: safeFilter, fields: safeFields, body: safeBody } = validator({
    action, modelName, role, userId, docId, filter, fields, body, policy, getPolicy
  });

  // 5. Import correct CRUD handler dynamically
  const crudFile = path.resolve(..., `../../crud/build${capitalize(action)}Query.js`);
  const crudHandler = (await import(pathToFileURL(crudFile).href)).default;

  // 6. Execute with sanitized data
  return await crudHandler({
    modelName, role, userId, docId,
    fields: safeFields, body: safeBody, filter: safeFilter,
    populateFields, policy, getService
  });
}
```

### CRUD Handler Structure

Each handler follows a consistent pattern:

```javascript
export default async function buildXQuery({
  role, userId, modelName, docId, filter, fields, body, populateFields, policy
}) {
  // 1. PERMISSION CHECK
  if (!policy?.permissions?.[action]) {
    throw new Error(`⛔ Role "${role}" has no ${ACTION} permission on "${modelName}"`);
  }

  // 2. SANITIZATION
  body = sanitizeWrite({ body, policy, action });

  // 3. REGISTRY EXECUTION (ABAC)
  const registryOutput = await runRegistry({ role, userId, modelName, action, policy });
  if (registryOutput?.filter) filter = registryOutput.filter;

  // 4. SERVICE LIFECYCLE HOOKS
  const serviceInstance = loadService(modelName);
  if (typeof serviceInstance?.beforeX === "function") {
    body = await serviceInstance.beforeX({ role, userId, body, ... });
  }

  // 5. DATABASE OPERATION
  const result = await Model.findByIdAndUpdate(docId, { $set: body }, ...);

  // 6. AFTER HOOKS + AUDIT
  if (typeof serviceInstance?.afterX === "function") {
    await serviceInstance.afterX({ role, userId, docId, data: result });
  }
  await saveAuditLog({ action, modelName, userId, role, docId, beforeDoc, afterDoc });

  return result;
}
```

### Populate: Not a Shortcut, The System Contract

Population is the mechanism by which:

1. **References are resolved**: ObjectID fields become full documents
2. **Field projections are enforced**: Only policy-allowed fields are returned
3. **Cross-model access is validated**: Lookups require read permission on target model
4. **Nested data is protected**: Populated documents respect target model's policy

The `DEFAULT_POPULATE_FIELDS` configuration defines server-side defaults:

```javascript
export const DEFAULT_POPULATE_FIELDS = {
  employees: {
    'professionalInfo.designation': 'title',
    'professionalInfo.department': 'name',
    'professionalInfo.role': 'name',
    'professionalInfo.reportingManager': 'basicInfo.firstName,basicInfo.lastName'
  },
  leaves: {
    'employee': 'basicInfo.firstName,basicInfo.lastName',
    'leaveType': 'name',
    'approvedBy': 'basicInfo.firstName,basicInfo.lastName'
  }
  // ... per-model configurations
};
```

Frontend overrides merge with defaults:

```javascript
// Request with custom populate
GET /api/populate/read/leaves?populateFields={"employee":"basicInfo.firstName,basicInfo.email"}

// populateHelper merges:
finalPopulate = {
  ...DEFAULT_POPULATE_FIELDS['leaves'],  // Server defaults
  ...userPopulateOverrides                // Frontend overrides win
};
```

---

## 4. Backend Philosophy: Why We Do This

### Why Backend Code Must Remain Boring and Stable

The backend exists to enforce invariants, not implement features. Feature logic belongs in data; invariant enforcement belongs in code.

**Invariants (coded)**:
- Authentication must validate credentials
- Authorization must check policies
- Audit logs must be written
- Field sanitization must occur

**Features (data-driven)**:
- Which roles can read which fields
- What fields are required for a model
- Which approvals are needed for status transitions
- Who receives notifications for events

### Why Business Logic Must Move to Data

When business logic lives in code:

```javascript
// Hardcoded approval logic
if (leave.status === 'Pending' && user.role === 'Manager') {
  await approve(leave);
}
```

Changing "Manager" to "HR Manager" requires:
1. Code change
2. Code review
3. Testing
4. Deployment
5. Verification

When business logic lives in data:

```javascript
// Policy-driven
const canApprove = policy.conditions?.update?.some(
  c => c.registry === 'isManager' && c.fields?.includes('status')
);
```

Changing approval logic requires:
1. Update access_policies document
2. Cache refresh (automatic or triggered)

### Why Frontend Should Never Require Backend Redeploys

The frontend communicates intent, not implementation:

```javascript
// Frontend request
POST /api/populate/create/leaves
{
  "employeeId": "...",
  "leaveType": "...",
  "startDate": "...",
  "endDate": "..."
}
```

The backend:
1. Validates user has `create` permission on `leaves`
2. Sanitizes body to remove forbidden fields
3. Runs lifecycle hooks for notifications
4. Returns created document

Adding a new field to leaves:
1. Update Mongoose schema
2. Update access_policies to allow field
3. Frontend can immediately use field

No controller changes. No route changes. No service modifications for basic CRUD.

### Why Enterprise Systems Evolve via Documents, Not Code

Enterprise software requirements change constantly:
- New approval workflows
- Role-based visibility rules
- Client-specific customizations
- Compliance-driven access restrictions

Document-driven evolution enables:
- **Non-technical configuration**: Admins modify policies without developers
- **Audit trails**: Policy changes are database records
- **Rollback capability**: Restore previous policy versions
- **Multi-tenant isolation**: Per-organization policies without code branches

---

## 5. Frontend Responsibility and Power Boundary

### What Frontend Can Define

The frontend has authority over:

1. **Entity Creation** (within policy bounds)
   - Any model registered in `Collection.js`
   - Any fields allowed by `allowAccess.create`
   - Any relationships defined in schema

2. **Field Selection**
   - Which fields to retrieve via `fields` parameter
   - Which references to populate via `populateFields`
   - Type-based presets via `type=1|2|3`

3. **Filter Expressions**
   - Query conditions via `filter` parameter
   - Aggregation pipelines via `aggregate=true&stages=[...]`
   - Sort ordering via `sort` parameter

4. **Pagination Control**
   - Page number via `page` parameter
   - Results per page via `limit` parameter (max 100)

### What Frontend Cannot Control

The frontend has no authority over:

1. **Permission Grants**
   - Cannot bypass `permissions.create/read/update/delete`
   - Cannot access models without policy
   - Cannot expand allowed fields beyond policy

2. **Field Restrictions**
   - Cannot read `forbiddenAccess.read` fields
   - Cannot write `forbiddenAccess.create/update` fields
   - Cannot filter by forbidden fields

3. **Audit Suppression**
   - Cannot disable audit logging
   - Cannot modify audit records
   - Cannot access audit bypasses

4. **Service Execution**
   - Lifecycle hooks always execute
   - Cannot skip beforeCreate/afterUpdate hooks
   - Cannot bypass validation

5. **Cross-Model Access**
   - Aggregation `$lookup` requires read permission on target
   - Population requires accessible populate fields
   - No implicit cross-tenant access

### How Frontend Safely Creates Entities

```javascript
// SAFE REQUEST: Fields validated against policy
POST /api/populate/create/employees
{
  "basicInfo": { "firstName": "John", "lastName": "Doe" },
  "professionalInfo": { "employeeId": "EMP001" }
}

// BLOCKED: authInfo not in allowAccess.create
POST /api/populate/create/employees
{
  "authInfo": { "password": "malicious" }  // ← Stripped by sanitizeWrite
}

// BLOCKED: Model without policy
POST /api/populate/create/nonexistent
→ Error: "⛔ CRITICAL SECURITY: No policy defined for role 'X' on model 'nonexistent'"
```

### Why Backend Remains Final Authority

All frontend requests are:

1. **Authenticated**: JWT validated through authMiddleware
2. **Policy-Checked**: Role must have model permission
3. **Field-Sanitized**: Forbidden fields removed
4. **Registry-Evaluated**: ABAC rules applied
5. **Hook-Processed**: Business logic executed
6. **Audit-Logged**: Changes recorded

The frontend proposes; the backend disposes.

---

## 6. Dynamic Workflow and Lifecycle Evolution

### Hardcoded Lifecycle Hooks Become Data-Driven

Current service files implement lifecycle hooks:

```javascript
// src/services/leaves.js
export default function leaves() {
  return {
    afterCreate: async ({ modelName, docId, userId }) => {
      // Send notification to manager
    },
    beforeUpdate: async ({ body, docId }) => {
      body._oldStatus = (await Leave.findById(docId)).status;
    },
    afterUpdate: async ({ modelName, userId, docId, body }) => {
      // Handle status transitions
      if (prevStatus !== 'Approved' && newStatus === 'Approved') {
        // Deduct leave balance
        // Create attendance records
      }
    }
  };
}
```

These hooks are currently code-defined but the pattern enables transition to data-driven workflows:

```javascript
// Future: Workflow defined in database
{
  "model": "leaves",
  "trigger": "update",
  "condition": { "oldStatus": "Pending", "newStatus": "Approved" },
  "actions": [
    { "type": "updateField", "target": "employee.leaveStatus", "operation": "deduct" },
    { "type": "createRecord", "model": "attendances", "template": "leaveAttendance" },
    { "type": "sendNotification", "recipient": "employeeId", "template": "leaveApproved" }
  ]
}
```

### Approval Chain Structures

The current registry supports approval patterns:

**Single Approval**:
```javascript
// Policy conditions
{
  "conditions": {
    "update": [
      { "registry": "isManager", "effect": "allow", "fields": ["status"] }
    ]
  }
}
// Only reporting manager can change status
```

**Multi-Layer Approval**:
```javascript
// Future: Chained approvals
{
  "approvers": ["reportingManager", "hrManager", "director"],
  "mode": "sequential",  // Must approve in order
  "requiredCount": "ALL" // All must approve
}
```

**ANY vs ALL**:
```javascript
// ANY: First available approver
{ "requiredCount": 1, "mode": "ANY" }

// ALL: Every approver must approve
{ "requiredCount": "ALL", "mode": "ALL" }

// MINIMUM: At least N approvers
{ "requiredCount": 2, "mode": "MINIMUM" }
```

### Workflow State Transitions

Status transitions can be governed by data:

```javascript
// Ticket status workflow
{
  "model": "tickets",
  "transitions": {
    "Open": { "allowed": ["In Progress", "Cancelled"], "roles": ["agent", "admin"] },
    "In Progress": { "allowed": ["Resolved", "Open"], "roles": ["agent"] },
    "Resolved": { "allowed": ["Closed", "Open"], "roles": ["manager"] },
    "Closed": { "allowed": [], "roles": [] }  // Terminal state
  }
}
```

The `validateFieldUpdateRules.js` utility can enforce these:

```javascript
validateFieldUpdateRules({ body, modelName, role, userId });
// Throws if status transition is invalid for role
```

---

## 7. Failure Modes

### Misconfigured Policies

**Scenario**: AccessPolicy created with wrong role ObjectID
- **Impact**: Role has no access to any models
- **Detection**: Users report "No policy defined" errors
- **Recovery**: Correct role reference in access_policies

**Scenario**: `allowAccess.read` missing required fields
- **Impact**: Frontend receives empty objects
- **Detection**: Incomplete data in responses
- **Recovery**: Add fields to allowAccess list

**Scenario**: `forbiddenAccess` blocks critical operational fields
- **Impact**: Operations fail silently (fields stripped)
- **Detection**: Updates don't persist expected values
- **Recovery**: Remove fields from forbiddenAccess

### Broken Workflows

**Scenario**: Service file has syntax error
- **Impact**: CRUD operation throws on import
- **Detection**: HTTP 500 with "Failed to import" error
- **Recovery**: Fix syntax error, restart server

**Scenario**: Lifecycle hook throws unhandled exception
- **Impact**: Operation may partially complete
- **Detection**: Audit log shows beforeDoc but not afterDoc
- **Recovery**: Add try-catch, implement compensating transactions

**Scenario**: Circular notification loop
- **Impact**: Infinite notifications, resource exhaustion
- **Detection**: Memory/CPU spike, notification flood
- **Recovery**: Add cycle detection in notification service

### Unsafe Filters

**Scenario**: Frontend sends unindexed filter
- **Impact**: Collection scans, slow queries
- **Detection**: Query timeout, high CPU
- **Recovery**: Add index, implement query optimizer limits

**Scenario**: Frontend exploits aggregation for data exfiltration
- **Impact**: Unauthorized data access via $lookup
- **Detection**: Aggregation attempts on forbidden models
- **Prevention**: `buildReadQuery` validates $lookup targets

**Scenario**: Regex injection via filter
- **Impact**: ReDoS (Regular Expression Denial of Service)
- **Detection**: Hung queries, timeout errors
- **Prevention**: Sanitize regex patterns, set maxTimeMS

### Frontend Misuse

**Scenario**: Frontend requests all fields without pagination
- **Impact**: Memory exhaustion, timeout
- **Prevention**: Limit enforced at 100 items per page

**Scenario**: Frontend creates malformed populateFields
- **Impact**: Invalid population, missing data
- **Detection**: Parse warnings in logs
- **Recovery**: Frontend validation, graceful fallback

**Scenario**: Frontend sends body with forbidden fields
- **Impact**: None (sanitized), but indicates misunderstanding
- **Detection**: Repeated sanitization warnings
- **Recovery**: Frontend code review, API documentation

### Version Drift

**Scenario**: Policy cache stale after database update
- **Impact**: Old permissions enforced
- **Detection**: Expected changes don't take effect
- **Recovery**: Cache refresh via `/api/config/refresh-cache`

**Scenario**: Model schema updated, policy not updated
- **Impact**: New fields inaccessible
- **Detection**: "Field not allowed" errors
- **Recovery**: Update access_policies for new fields

### Audit Gaps

**Scenario**: Audit write fails silently
- **Impact**: Missing audit trail
- **Detection**: Gap in audit log sequence
- **Recovery**: Queue audit writes, implement retry

**Scenario**: Before/after document capture fails
- **Impact**: Incomplete change history
- **Detection**: Audit log has empty before/after
- **Recovery**: Defensive null checks, log failures

### Performance Degradation

**Scenario**: Unbounded aggregation pipeline
- **Impact**: Memory exhaustion
- **Prevention**: `safeAggregator.js` limits: max 9 lookups, 25 total stages

**Scenario**: Population of large arrays
- **Impact**: Document size explosion
- **Detection**: Slow responses, memory warnings
- **Prevention**: Select specific populate fields

**Scenario**: Unindexed policy lookups
- **Impact**: Slow authentication
- **Prevention**: Compound index on `{role: 1, modelName: 1}`

### Security Loopholes

**Scenario**: Policy with `allowAccess: ["*"]` on sensitive model
- **Impact**: Full field exposure
- **Detection**: Security audit
- **Prevention**: No wildcard on authInfo, salary, etc.

**Scenario**: Registry function returns overly permissive filter
- **Impact**: Data leakage beyond intended scope
- **Detection**: Authorization audit
- **Prevention**: Registry code review, test coverage

**Scenario**: JWT secret exposure
- **Impact**: Token forgery
- **Prevention**: Session-bound secrets, secret rotation

---

## 8. Prevention and Guardrails

### Validation Layers

1. **Input Validation (Validator.js)**
   - Conditional rule evaluation
   - Field access validation
   - Body field validation
   - Filter field validation
   - Aggregation lookup validation

2. **Sanitization (sanitize*.js)**
   - `sanitizeRead`: Removes forbidden read fields
   - `sanitizeWrite`: Removes forbidden create fields
   - `sanitizeUpdate`: Removes forbidden update fields
   - `sanitizePopulated`: Filters populated document fields

3. **Schema Validation (Mongoose)**
   - Type enforcement
   - Required field validation
   - Enum constraints
   - Reference validation

### Strict Defaults

```javascript
// policyEngine.js - FAIL-CLOSED
if (!policy) {
  throw new Error(`⛔ CRITICAL SECURITY: No policy defined...`);
}

// access_policies.js - Default deny
permissions: {
  read: { type: Boolean, default: false },
  create: { type: Boolean, default: false },
  update: { type: Boolean, default: false },
  delete: { type: Boolean, default: false }
}
```

### Fail-Closed Behavior

| Scenario | Behavior |
|----------|----------|
| No policy for role+model | Request blocked |
| Field not in allowAccess | Field stripped |
| Field in forbiddenAccess | Field stripped |
| Lookup on forbidden model | Aggregation blocked |
| Invalid registry function | Rule skipped (lenient) |
| CRUD handler not found | Request blocked |

### Review Requirements

1. **AccessPolicy Changes**
   - Require audit trail (automatic via collection timestamps)
   - Cache refresh after changes
   - Tested with representative queries

2. **Service File Changes**
   - Code review required
   - Lifecycle hook testing
   - Error handling verification

3. **Schema Changes**
   - Corresponding policy updates
   - Migration testing
   - Index verification

### Version Locking

1. **Policy Cache**
   - Loaded at startup
   - Manual refresh via API
   - Automatic refresh interval (configurable)

2. **Service Cache**
   - Loaded at startup
   - Auto-refresh every 20 minutes
   - Manual refresh available

---

## 9. Scaling and Future Evolution

### Multi-Organization Scaling

The architecture supports multi-tenant deployment through:

1. **Policy Isolation**
   - `access_policies` documents can include `organizationId`
   - Cache partitioned by organization
   - Filter injection includes organization context

2. **Data Isolation**
   - Models include `organizationId` where applicable
   - Registry functions inject organization filter
   - Cross-organization access explicitly blocked

3. **Configuration Isolation**
   - `DEFAULT_POPULATE_FIELDS` extendable per organization
   - Lifecycle hooks can be organization-aware
   - Notification templates per organization

### Multi-Domain Scaling

New business domains require:

1. **Schema Definition**: Add Mongoose model
2. **Model Registration**: Export from `Collection.js`
3. **Policy Creation**: Create AccessPolicy documents
4. **Service (Optional)**: Add lifecycle hooks

No route changes. No controller creation. No middleware modification.

### Why No Backend Rewrite Required

The abstraction layers ensure stability:

| Change Type | Required Modification |
|-------------|----------------------|
| New entity | Model + Policy (data) |
| New field | Schema + Policy (data) |
| New role | Role document + Policies (data) |
| New workflow | Service file (code) or Workflow document (future, data) |
| New approval chain | Policy conditions (data) |
| New validation | Schema constraints (code) |

Only validation invariants require code changes.

### Revision-Based Evolution

Future enhancements:

1. **Policy Versioning**: Audit trail of policy changes
2. **Schema Versioning**: Migration tracking
3. **Workflow Versioning**: Transition rule history
4. **Configuration Snapshots**: Point-in-time recovery

### Commercialization Enablement

This architecture supports:

1. **White-Label Deployment**: Configuration-only customization
2. **Feature Flags**: Policy-driven feature access
3. **Usage Metering**: api_hit_logs enable billing
4. **Tenant Onboarding**: Policy template application

---

## 10. Known Drawbacks and Trade-Offs

### Cognitive Complexity

**Challenge**: Understanding the execution flow requires tracing through multiple layers:
- populateHelper → buildQuery → crud handler → service hooks

**Mitigation**: 
- Comprehensive documentation (this document)
- Consistent patterns across handlers
- Explicit logging at key decision points

### Debugging Challenges

**Challenge**: When a field doesn't appear in response:
- Is it forbidden by policy?
- Is it not in allowAccess?
- Was it stripped by sanitization?
- Did population fail?

**Mitigation**:
- Console logging at sanitization points
- Policy inspection endpoints
- Request tracing with IDs

### Onboarding Cost

**Challenge**: New developers must understand:
- Policy engine mechanics
- Cache behavior
- Registry function contracts
- Service hook patterns

**Mitigation**:
- Structured training program
- Example-driven documentation
- Paired programming for first contributions

### Governance Requirements

**Challenge**: Policy changes require understanding of:
- Security implications
- Field exposure risks
- Performance impacts

**Mitigation**:
- Policy change review process
- Impact analysis tooling
- Automated policy validation

### When NOT to Use This System

This architecture is inappropriate for:

1. **Simple CRUD Applications**: Overhead exceeds benefit for < 5 entities
2. **Read-Heavy Analytics**: Aggregation limits may constrain
3. **Real-Time Systems**: Policy lookup adds latency
4. **Static Requirements**: If business rules never change, why abstract?

---

## 11. Architectural Law

### Non-Negotiable Rules

1. **No Bypass of Policy Engine**
   - All CRUD operations MUST flow through `buildQuery`
   - Direct model access outside policy engine is FORBIDDEN
   - Exception: Internal system operations (cron, migrations)

2. **No Fail-Open Policies**
   - Missing policy MUST block access
   - Missing permission MUST deny operation
   - Ambiguous rules MUST deny

3. **Audit Everything Mutable**
   - Create operations: logged in service hooks
   - Update operations: logged in buildUpdateQuery
   - Delete operations: logged in buildDeleteQuery

4. **Sanitize All User Input**
   - Body: sanitizeWrite before create/update
   - Filter: filterValidator before query
   - Fields: sanitizeRead before projection

### What Must Never Be Dynamic

1. **Authentication Flow**
   - JWT validation
   - Session verification
   - Secret rotation

2. **Core Security Checks**
   - Policy existence validation
   - Permission boolean checks
   - Role matching

3. **Audit Persistence**
   - Audit log creation
   - Before/after capture
   - User attribution

### What Must Always Be Reviewed

1. **AccessPolicy Changes**
   - Any modification to permissions
   - Any expansion of allowAccess
   - Any reduction of forbiddenAccess

2. **Registry Function Changes**
   - Filter generation logic
   - Boolean evaluation logic
   - Context usage

3. **Service Hook Changes**
   - Database operations in hooks
   - External integrations
   - State mutations

### What Future Developers Are Forbidden From Doing

1. **Adding Routes That Bypass populateHelper**
   - Exception: Authentication routes
   - Exception: File serving routes
   - Exception: Health checks

2. **Hardcoding Role IDs**
   - Use role references, not ObjectID strings
   - Query roles by name when needed
   - Never assume role ID stability

3. **Implementing Business Logic in Controllers**
   - Controllers are route handlers only
   - Business logic belongs in services
   - Workflow rules belong in data

4. **Modifying Policy Engine Without Security Review**
   - buildQuery is security-critical
   - Validator is security-critical
   - Registry is security-critical

5. **Disabling Audit Logging**
   - Even in development
   - Even for performance
   - Even temporarily

---

## Appendix A: AccessPolicy Schema Reference

```javascript
{
  role: ObjectId,           // Reference to roles collection
  modelName: String,        // Collection name (lowercase)
  permissions: {
    read: Boolean,          // Can list/view
    create: Boolean,        // Can add new
    update: Boolean,        // Can modify
    delete: Boolean         // Can soft-delete
  },
  forbiddenAccess: {
    read: [String],         // Blocked read fields
    create: [String],       // Blocked create fields
    update: [String],       // Blocked update fields
    delete: [String]        // Blocked delete fields
  },
  allowAccess: {
    read: [String],         // Allowed read fields ("*" = all)
    create: [String],       // Allowed create fields
    update: [String],       // Allowed update fields
    delete: [String]        // Allowed delete fields
  },
  registry: [String],       // Registry function names
  conditions: {
    [action]: [{            // Per-action condition rules
      registry: String,     // Registry function to evaluate
      effect: "allow"|"deny",
      fields: [String]      // Fields affected by this rule
    }]
  }
}
```

---

## Appendix B: Registry Function Contract

```javascript
// Function Signature
function registryFunction(user, record, context) {
  // user: { id: ObjectId, role: ObjectId }
  // record: { ...documentFields } (when available)
  // context: { role, userId, modelName, fields, effect, action }

  // Return types:
  // Boolean: true = allow, false = deny (single record checks)
  // Object: MongoDB filter (list/find queries)
}

// Example: isSelf
function isSelf(user, record, context) {
  if (!user) return false;
  if (record) {
    return record._id.toString() === user.id;
  }
  return { $or: [{ _id: user.id }, { userId: user.id }] };
}
```

---

## Appendix C: Service Hook Contract

```javascript
// Service file structure
export default function modelName() {
  return {
    // Before create - can modify body, return modified body
    beforeCreate: async ({ body, userId, role }) => body,

    // After create - side effects only
    afterCreate: async ({ modelName, docId, userId, role }) => void,

    // Before read - can modify filter/fields
    beforeRead: async ({ role, userId, docId, filter, fields }) => ({ filter, fields }),

    // After read - can transform result
    afterRead: async ({ role, userId, docId, data }) => data,

    // Before update - can modify body
    beforeUpdate: async ({ role, userId, docId, body, filter, existingDoc }) => body,

    // After update - side effects
    afterUpdate: async ({ role, userId, docId, data, body }) => void,

    // Before delete - validation/side effects
    beforeDelete: async ({ role, userId, docId, filter, modelName }) => void,

    // After delete - cleanup
    afterDelete: async ({ role, userId, docId, modelName, deletedDoc }) => void
  };
}
```

---

## Appendix D: Execution Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HTTP REQUEST                                       │
│  POST /api/populate/update/leaves/507f1f77bcf86cd799439011                   │
│  Body: { "status": "Approved" }                                              │
│  Headers: Authorization: Bearer <jwt>, x-device-uuid: <uuid>                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  MIDDLEWARE CHAIN                                                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ cookieParser    │→ │ cors validation │→ │ agentAuthMiddleware         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ requestTracer   │→ │ apiHitLogger    │→ │ authMiddleware (JWT verify) │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                                                              │
│  req.user = { id, role, department, designation, name, managerId }           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  populateHelper.js                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Extract: action='update', model='leaves', id='507f1f77bcf86cd799...'│    │
│  │ Parse: fields, filter, populateFields from query                    │    │
│  │ Normalize: filter to MongoDB format                                 │    │
│  │ Merge: populateFields with DEFAULT_POPULATE_FIELDS['leaves']        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  buildQuery({ role, userId, action: 'update', modelName: 'leaves', ... })    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  policyEngine.buildQuery                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 1. Validate model: models['leaves'] exists ✓                        │    │
│  │ 2. Load policy: getPolicy(role, 'leaves') from cache                │    │
│  │ 3. FAIL-CLOSED: policy exists ✓                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ validator({ action, modelName, role, userId, body, policy, ... })   │    │
│  │ ├─ conditionsValidator: Check conditional rules                     │    │
│  │ ├─ bodyValidator: Remove forbidden fields from body                 │    │
│  │ ├─ filterValidator: Validate filter fields                          │    │
│  │ └─ aggregateValidator: Check $lookup permissions                    │    │
│  │                                                                     │    │
│  │ Returns: { filter: {}, fields: null, body: { status: 'Approved' } } │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  Import: crud/buildUpdateQuery.js                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  buildUpdateQuery.js                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 1. Permission check: policy.permissions.update === true ✓           │    │
│  │ 2. Sanitize: body = sanitizeUpdate({ body, policy })                 │    │
│  │ 3. Field rules: validateFieldUpdateRules({ body, modelName, ... })  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Registry execution: runRegistry({ role, userId, action, policy })   │    │
│  │ ├─ Evaluate conditions[update] rules                                │    │
│  │ ├─ Execute registry functions (isSelf, isManager, etc.)             │    │
│  │ └─ Merge filter overrides                                           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Load service: services/leaves.js                                    │    │
│  │                                                                     │    │
│  │ beforeUpdate hook:                                                  │    │
│  │ ├─ Fetch existing document                                          │    │
│  │ └─ Store: body._oldStatus = existingDoc.status                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Snapshot: beforeDoc = await Leave.findById(docId).lean()            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ DATABASE OPERATION:                                                 │    │
│  │ updatedDoc = await Leave.findByIdAndUpdate(docId, { $set: body },   │    │
│  │   { new: true, runValidators: true })                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ afterUpdate hook:                                                   │    │
│  │ ├─ Check status transition (Pending → Approved)                     │    │
│  │ ├─ Deduct leave balance from employee.leaveStatus                   │    │
│  │ ├─ Create attendance records for leave dates                        │    │
│  │ └─ Send notification to employee                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Audit log:                                                          │    │
│  │ await saveAuditLog({                                                │    │
│  │   action: 'update', modelName: 'leaves', userId, role, docId,       │    │
│  │   beforeDoc: { status: 'Pending', ... },                            │    │
│  │   afterDoc: { status: 'Approved', ... }                             │    │
│  │ })                                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  Return: updatedDoc                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  HTTP RESPONSE                                                               │
│  Status: 200                                                                 │
│  Body: {                                                                     │
│    "success": true,                                                          │
│    "data": { "_id": "507f1f77...", "status": "Approved", ... }              │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*Document Version: 1.0*
*Last Updated: 2026-01-11*
*Author: Platform Architecture Team*
