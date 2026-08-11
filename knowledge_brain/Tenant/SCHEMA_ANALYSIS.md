# Tenant Module — Schema Analysis

Analysis of MongoDB schemas, indexing strategies, and collection attributes in the Global DB and Tenant databases.

## 1. Global DB Collections

### 1.1 `tenants` (`Tenant.js`)
- **Collection Name**: `tracker_global.tenants`
- **Purpose**: Stores root metadata, subscription parameters, billing cycle, license expiry, and payment status for each tenant.
- **Key Fields**:
  - `tenantId` (String, required, unique index)
  - `name` (String, required)
  - `slug` (String, required, unique index, lowercase)
  - `dbName` (String, required, unique index)
  - `ownerEmail` (String, required, lowercase)
  - `status` (Enum: `Active`, `Suspended`, `Provisioning`, `Deleted`, `Inactive`, `Canceled`)
  - `plan` (String, default: `Professional`)
  - `billingCycle` (Enum: `Monthly`, `Annual`, `Lifetime`, default: `Annual`)
  - `licenseExpiredAt` (Date, indexed)
  - `paymentStatus` (Enum: `Paid`, `PastDue`, `Unpaid`, `Trial`, `Refunded`, default: `Paid`, indexed)
  - `licenseStatus` (Enum: `Valid`, `Expired`, `GracePeriod`, `Suspended`, default: `Valid`, indexed)
  - `enabledModules` (Array of `Module` ObjectId refs)
  - `settings.maxUsers` (Number, default: 50)
- **Indexes**: `{ tenantId: 1 }`, `{ slug: 1 }`, `{ dbName: 1 }`, `{ status: 1 }`, `{ licenseExpiredAt: 1 }`, `{ paymentStatus: 1 }`

### 1.2 `provisioningruns` (`ProvisioningRun.js`)
- **Collection Name**: `tracker_global.provisioningruns`
- **Purpose**: Real-time progress logger for 9-step atomic tenant creation.
- **Key Fields**:
  - `runId` (String, required, unique index)
  - `tenantId` (String)
  - `tenantName` (String, required)
  - `slug` (String, required)
  - `status` (Enum: `running`, `completed`, `failed`)
  - `currentStep` (Number, default: 0)
  - `totalSteps` (Number, default: 9)
  - `steps` (Array of step objects)
  - `verification` (Mixed object containing 100% verification stats)
- **Indexes**: `{ runId: 1 }`, `{ status: 1 }`

---

## 2. Tenant DB Seeded Baseline Schemas

| Model Name | Primary Collection | Indexing Strategy | Seeded Baseline Content |
|---|---|---|---|
| `roles` | `roles` | `{ isSuperAdmin: 1 }` | `Super Admin` role (`_id: 6a25cbc1cd36294f5e578696`, level 10) |
| `departments` | `departments` | `{ name: 1 }` | `Super Admin` department |
| `designations` | `designations` | `{ title: 1 }` | `Super Admin` designation |
| `employees` | `employees` | `{ 'authInfo.workEmail': 1 }` | Owner employee record (capacity bounded by `maxUsers`) |
| `access_policies`| `access_policies` | `{ role: 1, modelName: 1 }` | Full wildcard access policies for `Super Admin` across all models |
| `sidebars` | `sidebars` | `{ order: 1 }, { moduleKey: 1 }` | Entitled sidebar tree copied from `tracker_global.sidebars` |
| `capabilities` | `capabilities` | `{ key: 1 }` | UI capabilities mapped from `PAGE_CAPABILITY_MAPPING` |
