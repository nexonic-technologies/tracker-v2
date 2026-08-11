# Data Flow: Master-Data

## API Payloads
Extracted from React Components targeting the generic API endpoint.

- **index.jsx** -> `POST /populate/read/clients`
- **index.jsx** -> `GET /populate/read/agents?populateFields=${encodeURIComponent(JSON.stringify(populateFields))}`
- **index.jsx** -> `DELETE /populate/delete/clients/${row._id}`
- **index.jsx** -> `PUT /populate/update/clients/${row._id}`
- **index.jsx** -> `POST /populate/create/agents`
- **index.jsx** -> `PUT /populate/update/clients/${editingClient._id}`
- **index.jsx** -> `POST /populate/create/clients`
- **index.jsx** -> `POST /populate/read/departments`
- **index.jsx** -> `DELETE /populate/delete/departments/${row._id}`
- **index.jsx** -> `PUT /populate/update/departments/${row._id}`
- **index.jsx** -> `PUT /populate/update/departments/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/departments`
- **index.jsx** -> `POST /populate/read/designations`
- **index.jsx** -> `DELETE /populate/delete/designations/${row._id}`
- **index.jsx** -> `PUT /populate/update/designations/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/designations`
- **index.jsx** -> `POST /populate/read/employees`
- **index.jsx** -> `POST /populate/read/departments`
- **index.jsx** -> `POST /populate/read/designations`
- **index.jsx** -> `POST /populate/read/roles`
- **index.jsx** -> `POST /populate/read/employees`
- **index.jsx** -> `DELETE /populate/delete/employees/${row._id}`
- **index.jsx** -> `PUT /populate/update/employees/${row._id}`
- **index.jsx** -> `PUT /populate/update/employees/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/employees`
- **index.jsx** -> `POST /populate/read/hrpolicies`
- **index.jsx** -> `DELETE /populate/delete/hrpolicies/${row._id}`
- **index.jsx** -> `PUT /populate/update/hrpolicies/${row._id}`
- **index.jsx** -> `PUT /populate/update/hrpolicies/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/hrpolicies`
- **index.jsx** -> `POST /populate/read/lead_types`
- **index.jsx** -> `DELETE /populate/delete/lead_types/${row._id}`
- **index.jsx** -> `PUT /populate/update/lead_types/${row._id}`
- **index.jsx** -> `PUT /populate/update/lead_types/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/lead_types`
- **index.jsx** -> `POST /populate/read/leavepolicy`
- **index.jsx** -> `DELETE /populate/delete/leavepolicy/${row._id}`
- **index.jsx** -> `PUT /populate/update/leavepolicy/${row._id}`
- **index.jsx** -> `PUT /populate/update/leavepolicy/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/leavepolicy`
- **index.jsx** -> `POST /populate/read/leave_types`
- **index.jsx** -> `DELETE /populate/delete/leave_types/${row._id}`
- **index.jsx** -> `PUT /populate/update/leave_types/${row._id}`
- **index.jsx** -> `PUT /populate/update/leave_types/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/leave_types`
- **index.jsx** -> `POST /populate/read/milestones`
- **index.jsx** -> `DELETE /populate/delete/milestones/${row._id}`
- **index.jsx** -> `PUT /populate/update/milestones/${row._id}`
- **index.jsx** -> `PUT /populate/update/milestones/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/milestones`
- **index.jsx** -> `POST /populate/read/project_types`
- **index.jsx** -> `DELETE /populate/delete/project_types/${row._id}`
- **index.jsx** -> `PUT /populate/update/project_types/${row._id}`
- **index.jsx** -> `PUT /populate/update/project_types/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/project_types`
- **index.jsx** -> `POST /populate/read/reference_types`
- **index.jsx** -> `DELETE /populate/delete/reference_types/${row._id}`
- **index.jsx** -> `PUT /populate/update/reference_types/${row._id}`
- **index.jsx** -> `PUT /populate/update/reference_types/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/reference_types`
- **index.jsx** -> `POST /populate/read/roles`
- **index.jsx** -> `DELETE /populate/delete/roles/${row._id}`
- **index.jsx** -> `PUT /populate/update/roles/${row._id}`
- **index.jsx** -> `PUT /populate/update/roles/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/roles`
- **index.jsx** -> `POST /populate/read/shifts`
- **index.jsx** -> `DELETE /populate/delete/shifts/${row._id}`
- **index.jsx** -> `PUT /populate/update/shifts/${row._id}`
- **index.jsx** -> `PUT /populate/update/shifts/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/shifts`
- **index.jsx** -> `POST /populate/read/task_types`
- **index.jsx** -> `DELETE /populate/delete/task_types/${row._id}`
- **index.jsx** -> `PUT /populate/update/task_types/${row._id}`
- **index.jsx** -> `PUT /populate/update/task_types/${editingItem._id}`
- **index.jsx** -> `POST /populate/create/task_types`

## Status-Master UI (added 2026-06-10)

The Status Master page (`frontend/src/pages/Master-Data/Status-Master/index.jsx`) manages two collections:

### status_configs Panel
| Component | Method | URL | Payload |
|---|---|---|---|
| status_configsPanel | GET | `/api/config/status-configs` | — returns all status_configs docs |
| status_configsPanel | PUT | `/api/config/status-configs/:modelName` | `{ metaStatuses[], workflowStatuses[] }` (strip `_id`, `__v`, timestamps before send) |

### status_mapping Panel
| Component | Method | URL | Payload |
|---|---|---|---|
| status_mappingPanel | GET | `/api/config/status-mappings` | — returns all status_mapping docs |
| status_mappingPanel | PUT | `/api/config/status-mappings/:id` | `{ sourceModel, targetModel, linkField, reverseLinkField, mappings[], isActive }` (strip `_id`, `__v`, timestamps before send) |

> ⚠️ **Known gotcha**: `_id` must be deleted from the payload before PUT or Mongoose throws `Field "_id" cannot be modified`. This was fixed in the Status-Master save handlers (2026-06-10).

