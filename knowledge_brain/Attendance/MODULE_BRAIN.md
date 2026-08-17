# Attendance Module Brain

## Overview
This module governs daily attendance tracking, shift scheduling, punctuality rules, overtime derivation, leave transactions, regularizations, and immutable policy snapshotting.

## Core Architectural Invariant
**Strict Policy-Driven Execution**: Zero hardcoded business thresholds (hours, grace periods, OT caps, LOP multipliers) exist in business handlers. If no valid policy or shift is resolved for an employee on a target date, the engine fails explicitly with `ATTENDANCE_POLICY_REQUIRED` rather than manufacturing fallback values.

### Resolution Precedence
```
AttendancePolicy → Shift → GeneralSettings → REJECT
```

## Backend Models
| Model | File | Key Fields | Notes |
|---|---|---|---|
| `Attendance` | `Attendance.js` | `employee`, `date`, `checkIn`, `checkOut`, `punches[]`, `workHours`, `lateMinutes`, `earlyExitMinutes`, `status`, `snapshot` | Stores frozen `snapshot` capturing exact policy ID, version, shift times, and calculated results. |
| `AttendancePolicy` | `AttendancePolicy.js` | `version`, `status` (Draft/Active/Archived), `effectiveFrom`, `effectiveTo`, `shiftConfig`, `attendanceRules`, `permissionRules`, `lateEscalationRules`, `holidayWorkRules`, `overtimeRules`, `fineAndLopRules` | Immutable versioning: modifying an active policy archives the old document and generates a new version increment. |
| `Shift` | `Shift.js` | `name`, `startTime`, `endTime`, `workingHours`, `breakDuration`, `weeklyOff[]`, `alternateWeeklyOff`, `overtimeThreshold` | Governs scheduled work windows and shift rules. |
| `ShiftAssignment` | `Shift.js` | `employeeId`, `shiftId`, `startDate`, `endDate`, `isActive` | Date-ranged employee shift allocation. |
| `DailyActivity` | `DailyActivity.js` | `status`, `metaStatus` | Activity and timesheet entries. |
| `Leave` | `Leave.js` | `status`, `metaStatus`, `startDate`, `endDate`, `leaveType` | Approved leaves consumed by payroll calculation. |
| `Regularization` | `Regularization.js` | `status`, `metaStatus`, `attendanceId`, `reason` | Clock-in/out regularization workflow. |

## Calculation Pipeline Handlers (`Backend/src/services/business/attendance/`)
| Handler | File | Responsibility | Business Rule Authority |
|---|---|---|---|
| `resolvePolicy` | `resolvePolicy.js` | Resolves effective `AttendancePolicy` and `Shift` | `Employee.professionalInfo.policyAssignments` → `Department.attendancePolicy` → Active Policy. Fails if missing. |
| `status` | `status.js` | Full/half/absent and punctuality evaluation | `AttendancePolicy.attendanceRules` (`fullDayMinHours`, `halfDayMinHours`, `absentMinHours`, grace minutes). |
| `overtime` | `time/overtime.js` | Computes eligible overtime duration | `AttendancePolicy.overtimeRules` → `Shift.overtimeThreshold`. |
| `workHours` | `time/workHours.js` | Total net worked duration & break deduction | `AttendancePolicy.attendanceRules.breakDeductionMinHours` + `Shift.breakDuration`. |
| `fine` | `fine.js` | Computes late fines and LOP day factors | `AttendancePolicy.fineAndLopRules` (`absentLopDays`, `halfDayLopDays`). |
| `permission` | `permission.js` | Offsets lateness with approved permissions | `AttendancePolicy.permissionRules`. |
| `snapshot` | `snapshot.js` | Builds frozen immutable snapshot on Attendance doc | Pure snapshot builder recording policy version and calculation timestamp. |

## Dynamic API Usage
| File | Method | URL | Target Model |
|---|---|---|---|
| `index.jsx` | GET/POST/PUT | `/populate/:action/attendances` | `attendances` |
| `leave-regularization.jsx` | POST | `/populate/:action/leaves`, `/populate/:action/regularizations` | `leaves`, `regularizations` |
| `pending-approvals.jsx` | GET | `/populate/read/leaves`, `/populate/read/regularizations` | `leaves`, `regularizations` |
