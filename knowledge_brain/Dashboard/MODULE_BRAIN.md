# Dashboard Module Brain

## Overview
This module handles role-based dashboards for different users. The main dashboard screen `dashboard/index.tsx` detects the logged-in user's role and renders one of the four child components: EmployeeDashboard, ManagerDashboard, HRDashboard, or SuperAdminDashboard.

## Role-Based Layouts
| Role Dashboard Component | File | Displayed Widgets & Metrics |
|---|---|---|
| `EmployeeDashboard` | EmployeeDashboard.tsx | Check-in status, leave balance, pending leaves count, active tasks, monthly attendance summary. |
| `ManagerDashboard` | ManagerDashboard.tsx | Team count, checked-in count, open tasks, team pending leaves. |
| `HRDashboard` | HRDashboard.tsx | Total active employees, checked-in today, on leave today, pending approvals. |
| `SuperAdminDashboard` | SuperAdminDashboard.tsx | High-level system activity logs, system-wide employee counts. |

## Dynamic API Usage
| File | Method | URL | Target Model | Purpose |
|---|---|---|---|---|
| index.tsx | GET | `/populate/read/roles/${user.role}` | roles | Fetches the full role document to verify lowercase role name. |
| index.tsx | GET | `/populate/read/attendances` | attendances | Employee: checking if checked-in today. |
| index.tsx | GET | `/populate/read/leaves` | leaves | Employee: fetches my leaves to count Pending status. |
| index.tsx | GET | `/populate/read/tasks` | tasks | Employee: fetches assigned tasks. |
| index.tsx | GET | `/populate/read/employees` | employees | Manager/HR/Admin: fetches count of active employees. |
| index.tsx | GET | `/populate/read/attendances` | attendances | Manager/HR: checks today's attendance roster. |
| index.tsx | GET | `/populate/read/tasks` | tasks | Manager: checks team tasks queue. |
| index.tsx | GET | `/populate/read/leaves` | leaves | Manager/HR: checks pending leaves for approvals list. |
