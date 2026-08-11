# HR Module Brain

## Overview
This module contains models and services for HR management, employee lifecycle tracking, onboarding automation, and salary revision management.

## Backend Models
| Model | File | Key Fields / Ref | Notes |
|---|---|---|---|
| Employee | Employee.js | `salaryStructure` (Ref: salary_structures), `isDeleted` | Enforces optimistic concurrency (`__v`), soft-delete, and SalaryStructure ref |
| EmployeeLifecycleHistory | EmployeeLifecycleHistory.js | `employeeId`, `changeType`, `effectiveDate`, `previousValue`, `newValue` | Immutable career timeline & audit history log |
| Onboarding | Onboarding.js | `employeeId`, `candidateId`, `status`, `completionPercent`, `checklist` | 8-state onboarding machine with SLA tracking |
| OnboardingTemplate | OnboardingTemplate.js | `department`, `designation`, `employmentType`, `checklist` | Configurable onboarding checklist template |
| hr_policies | hr_policies.js | `status`, `metaStatus`, `applicableDepartments` | Status driven by status_configs |
| Department | Department.js | `name`, `leavePolicy` | Refs: leave_policies |
| Designation | Designation.js | `title`, `level` | Org designation master |
| Role | Role.js | `name`, `permissionVersion` | CBAC permission role master |

## Backend Services (Business Logic Hooks)
| Service File | Description / Functionality |
|---|---|
| lifecycleHistoryService.js | Centralized utility for recording career lifecycle events (joining, promotion, transfer, salary revision, status change) |
| salaryRevisionService.js | Centralized service for versioning SalaryStructure documents, closing effective date windows, updating Employee.salaryStructure pointer, and logging history |
| employee_life_cycle_histories.js | Service hook for EmployeeLifecycleHistory model |
| employees.js | Hook enforcing salaryDetails mutation guard, optimistic concurrency `__v` checks, and automatic history logging |
| candidates.js | Candidate stage hooks including atomic transaction Hire flow with salaryRevisionService & lifecycleHistoryService initialization |
| OnboardingCron.js | Scheduled daily SLA check at 08:00 AM for target date breach detection and notification reminders |
