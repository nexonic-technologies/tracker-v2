# tasks Module Brain

## Overview
This module contains 1 model (Tasks), 1 service, and 8 frontend files.

## Backend Models
| Model | File | Lines | Key Fields | Notes |
|---|---|---|---|---|
| Tasks | Tasks.js | 81 | `status` (String, no enum), `metaStatus` (String, default: active) | Status is fully dynamic — values driven by status_configs. `metaStatus` tracks record lifecycle. |

> **status field (as of 2026-06-10)**: No enum. Default: `"Backlogs"`. Workflow options defined in `status_configss` collection (`modelName: 'tasks'`, `workflowStatuses`).
> **metaStatus field**: Default: `"active"`. Lifecycle options: active / inactive / draft / archive / deleted (from `status_configss.metaStatuses`).

## Dynamic API Usage
| File | Method | URL | Target Model |
|---|---|---|---|
| CreateTaskModal.jsx | POST | /populate/create/tasks | tasks |
| index.jsx | GET | /populate/read/tasks | tasks |
| index.jsx | POST | /populate/read/clients/${task.clientId} | clients |
| index.jsx | POST | /populate/read/project_types/${task.projectTypeId} | project_types |
| index.jsx | POST | /populate/read/clients | clients |
| index.jsx | POST | /populate/read/employees | employees |
| index.jsx | POST | /populate/read/task_types | task_types |
| index.jsx | POST | /populate/read/tasks/${taskId} | tasks |
| index.jsx | POST | /populate/read/clients/${clientId} | clients |
| my-tasks.jsx | POST | /populate/read/tasks | tasks |
| my-tasks.jsx | POST | /populate/read/employees | employees |
| my-tasks.jsx | POST | /populate/read/task_types | task_types |
| my-tasks.jsx | POST | /populate/read/tasks/${task._id} | tasks |
| reports.jsx | POST | /populate/report/tasks | tasks |
| TaskModal.jsx | GET | /populate/read/tasks/${task._id}?populateFields=${encodeURIComponent(JSON.stringify(populateFields))} | tasks |
| TaskModal.jsx | GET | /populate/read/employees/${userId}?fields=basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage | employees |
| TaskModal.jsx | POST | /populate/read/employees | employees |
| TaskModal.jsx | GET | /populate/read/employees/${comment.commentedBy}?fields=basicInfo.firstName,basicInfo.lastName | employees |
| TaskModal.jsx | GET | /populate/read/employees/${userId}?fields=basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage | employees |
| TaskModal.jsx | PUT | /populate/update/comments_threads/${finalThreadId} | comments_threads |
| updateTaskById.js | PUT | /populate/update/tasks/${taskId} | tasks |
| [id].jsx | GET | /populate/read/tasks/${id}?populateFields=${encodeURIComponent(JSON.stringify(populateFields))} | tasks |
