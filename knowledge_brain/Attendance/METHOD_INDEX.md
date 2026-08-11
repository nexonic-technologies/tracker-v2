# Method & Model Index: Attendance

## Models (Alphabetical)
| Model | Source File |
|---|---|
| Attendance | Attendance.js |
| DailyActivity | DailyActivity.js |
| Leave | Leave.js |
| LeavePolicy | LeavePolicy.js |
| leave_types | leave_types.js |
| Regularization | Regularization.js |
| Shift | Shift.js |

## Service Functions (Alphabetical)
| Function | Service File | Notes |
|---|---|---|
| `afterCreate` | leaves.js | Triggers approval workflows |
| `afterUpdate` | leaves.js | Processes balance decs / increments |
| `afterUpdate` | leavepolicy.js | Rollover and propagate changes to active employee profiles |
| `beforeCreate` | leaves.js | Validates request balance and overlapping dates |
| `beforeUpdate` | leaves.js | Evaluates approvals |
| `beforeUpdate` | leavepolicy.js | Handles active / expired policy immutability checks |
