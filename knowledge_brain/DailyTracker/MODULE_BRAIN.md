# DailyTracker Module Brain

## Overview
This module manages daily activity tracking, logs client/project/task types associated with work done, and handles user task records. It includes 1 frontend screen (`daily-tracker/index.tsx`) and maps to the `daily_activities` backend model.

## Backend Models
| Model | File | Lines | Key Fields | Notes |
|---|---|---|---|---|
| DailyActivity | DailyActivity.js | 26 | `status` (String, no enum), `metaStatus` (String, default: active) | Refs: clients, project_types, employees, task_types. Controlled by status_configs. |

## Dynamic API Usage
| File | Method | URL | Target Model |
|---|---|---|---|
| index.tsx | GET | `/populate/read/clients?populateFields={"project_types":"name"}` | clients |
| index.tsx | GET | `/populate/read/task_types` | task_types |
| index.tsx | GET | `/populate/read/daily_activities?filter=...` | daily_activities |
| index.tsx | POST | `/populate/create/daily_activities` | daily_activities |
