# Master-Data Module Brain

## Overview
This module contains 2 backend models (status_configs, status_mapping), 0 services, and 15+ frontend files including the Status Master UI.

## Backend Models
| Model | File | Lines | Key Fields | Notes |
|---|---|---|---|---|
| status_configs | status_configs.js | ~55 | `modelName`, `label`, `metaStatuses[]`, `workflowStatuses[]` | One doc per workflow model. Seeded via `seedstatus_configss.js`. No enum — fully dynamic. |
| status_mapping | status_mapping.js | 44 | `sourceModel`, `targetModel`, `linkField`, `reverseLinkField`, `mappings[]`, `isActive` | Defines how one model's status changes propagate to a linked model. Used by `ticketTaskSync.js`. |

### status_configs Schema Detail
```
metaStatuses[]:   { key, label, color, order, isDefault }  // record lifecycle
workflowStatuses[]: { key, label, color, order, isDefault, isTerminal }  // operational pipeline
```

### status_mapping Schema Detail
```
mappings[]: { sourceStatus: String, targetStatus: String }
// e.g. tasks "Completed" → tickets "Completed"
```

## Dynamic API Usage
| File | Method | URL | Target Model |
|---|---|---|---|
| index.jsx | POST | /populate/read/clients | clients |
| index.jsx | GET | /populate/read/agents?populateFields=${encodeURIComponent(JSON.stringify(populateFields))} | agents?populateFields=${encodeURIComponent(JSON.stringify(populateFields))} |
| index.jsx | DELETE | /populate/delete/clients/${row._id} | clients |
| index.jsx | PUT | /populate/update/clients/${row._id} | clients |
| index.jsx | POST | /populate/create/agents | agents |
| index.jsx | PUT | /populate/update/clients/${editingClient._id} | clients |
| index.jsx | POST | /populate/create/clients | clients |
| index.jsx | POST | /populate/read/departments | departments |
| index.jsx | DELETE | /populate/delete/departments/${row._id} | departments |
| index.jsx | PUT | /populate/update/departments/${row._id} | departments |
| index.jsx | PUT | /populate/update/departments/${editingItem._id} | departments |
| index.jsx | POST | /populate/create/departments | departments |
| index.jsx | POST | /populate/read/designations | designations |
| index.jsx | DELETE | /populate/delete/designations/${row._id} | designations |
| index.jsx | PUT | /populate/update/designations/${editingItem._id} | designations |
| index.jsx | POST | /populate/create/designations | designations |
| index.jsx | POST | /populate/read/employees | employees |
| index.jsx | POST | /populate/read/departments | departments |
| index.jsx | POST | /populate/read/designations | designations |
| index.jsx | POST | /populate/read/roles | roles |
| index.jsx | POST | /populate/read/employees | employees |
| index.jsx | DELETE | /populate/delete/employees/${row._id} | employees |
| index.jsx | PUT | /populate/update/employees/${row._id} | employees |
| index.jsx | PUT | /populate/update/employees/${editingItem._id} | employees |
| index.jsx | POST | /populate/create/employees | employees |
| index.jsx | POST | /populate/read/hrpolicies | hrpolicies |
| index.jsx | DELETE | /populate/delete/hrpolicies/${row._id} | hrpolicies |
| index.jsx | PUT | /populate/update/hrpolicies/${row._id} | hrpolicies |
| index.jsx | PUT | /populate/update/hrpolicies/${editingItem._id} | hrpolicies |
| index.jsx | POST | /populate/create/hrpolicies | hrpolicies |
| index.jsx | POST | /populate/read/lead_types | lead_types |
| index.jsx | DELETE | /populate/delete/lead_types/${row._id} | lead_types |
| index.jsx | PUT | /populate/update/lead_types/${row._id} | lead_types |
| index.jsx | PUT | /populate/update/lead_types/${editingItem._id} | lead_types |
| index.jsx | POST | /populate/create/lead_types | lead_types |
| index.jsx | POST | /populate/read/leavepolicy | leavepolicy |
| index.jsx | DELETE | /populate/delete/leavepolicy/${row._id} | leavepolicy |
| index.jsx | PUT | /populate/update/leavepolicy/${row._id} | leavepolicy |
| index.jsx | PUT | /populate/update/leavepolicy/${editingItem._id} | leavepolicy |
| index.jsx | POST | /populate/create/leavepolicy | leavepolicy |
| index.jsx | POST | /populate/read/leave_types | leave_types |
| index.jsx | DELETE | /populate/delete/leave_types/${row._id} | leave_types |
| index.jsx | PUT | /populate/update/leave_types/${row._id} | leave_types |
| index.jsx | PUT | /populate/update/leave_types/${editingItem._id} | leave_types |
| index.jsx | POST | /populate/create/leave_types | leave_types |
| index.jsx | POST | /populate/read/milestones | milestones |
| index.jsx | DELETE | /populate/delete/milestones/${row._id} | milestones |
| index.jsx | PUT | /populate/update/milestones/${row._id} | milestones |
| index.jsx | PUT | /populate/update/milestones/${editingItem._id} | milestones |
| index.jsx | POST | /populate/create/milestones | milestones |
