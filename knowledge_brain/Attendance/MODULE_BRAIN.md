# Attendance Module Brain

## Overview
This module contains 7 models, 3 services, and 9 frontend files.

## Backend Models
| Model | File | Lines | Key Fields | Notes |
|---|---|---|---|---|
| Attendance | Attendance.js | 46 | status | Refs: employees, leave_types |
| DailyActivity | DailyActivity.js | 26 | `status` (String, no enum), `metaStatus` (String, default: active) | Status driven by status_configs. Refs: clients, project_types, employees, task_types |
| Leave | Leave.js | 33 | `status` (String, no enum), `metaStatus` (String, default: active) | Status driven by status_configs. Refs: employees, departments, leave_types |
| LeavePolicy | LeavePolicy.js | ~25 | `status`, `effectiveFrom`, `effectiveTo`, `version` | Refs: leave_types, roles, departments, designations |
| leave_types | leave_types.js | 23 | — | |
| Regularization | Regularization.js | 46 | `status` (String, no enum), `metaStatus` (String, default: active) | Status driven by status_configs. Refs: employees, departments, attendances |
| Shift | Shift.js | 43 | — | Refs: Employee, Shift |

> **Dynamic status (as of 2026-06-10)**: Leave, Regularization, DailyActivity — all had hardcoded `enum: ['Pending','Approved','Rejected']` removed. Status values now come from `status_configss` collection. `metaStatus` (default: `'active'`) added for record lifecycle tracking.

## Backend Services (Business Logic Hooks)
| Service File | Lines | Exported Functions | Notes |
|---|---|---|---|
| attendances.js | 141 | — | |
| leaves.js | 221 | `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate` | Handles request validation and balance adjustments |
| regularizations.js | 141 | — | |
| leavepolicy.js | ~180 | `beforeUpdate`, `afterUpdate` | Immutability checks + balance propagation to employees |

## Dynamic API Usage
| File | Method | URL | Target Model |
|---|---|---|---|
| [id].jsx | POST | /populate/read/daily_activities/${id} | daily_activities |
| add-daily-activity.jsx | POST | /populate/create/daily_activities | daily_activities |
| index.jsx | POST | /populate/read/daily_activities | daily_activities |
| index.jsx | GET | /populate/read/attendances?filter=${encodeURIComponent(filter)} | attendances?filter=${encodeURIComponent(filter)} |
| index.jsx | POST | /populate/create/attendances | attendances |
| index.jsx | PUT | /populate/update/attendances/${todayRec._id} | attendances |
| leave-regularization.jsx | POST | /populate/read/employees/${user.id} | employees |
| leave-regularization.jsx | POST | /populate/read/attendances | attendances |
| leave-regularization.jsx | POST | /populate/read/employees/${user.id} | employees |
| leave-regularization.jsx | POST | /populate/create/leaves | leaves |
| leave-regularization.jsx | POST | /populate/create/regularizations | regularizations |
| model.jsx | GET | /populate/read/leaves/${id} | leaves |
| pending-approvals.jsx | GET | /populate/read/leaves | leaves |
| pending-approvals.jsx | GET | /populate/read/regularizations | regularizations |
