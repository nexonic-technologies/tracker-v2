# Data Flow: Attendance

## API Payloads
Extracted from React Components targeting the generic API endpoint.

- **[id].jsx** -> `POST /populate/read/daily_activities/${id}`
- **add-daily-activity.jsx** -> `POST /populate/create/daily_activities`
- **index.jsx** -> `POST /populate/read/daily_activities`
- **index.jsx** -> `GET /populate/read/attendances?filter=${encodeURIComponent(filter)}`
- **index.jsx** -> `POST /populate/create/attendances`
- **index.jsx** -> `PUT /populate/update/attendances/${todayRec._id}`
- **leave-regularization.jsx** -> `POST /populate/read/employees/${user.id}`
- **leave-regularization.jsx** -> `POST /populate/read/attendances`
- **leave-regularization.jsx** -> `POST /populate/read/employees/${user.id}`
- **leave-regularization.jsx** -> `POST /populate/create/leaves`
- **leave-regularization.jsx** -> `POST /populate/create/regularizations`
- **model.jsx** -> `GET /populate/read/leaves/${id}`
- **pending-approvals.jsx** -> `GET /populate/read/leaves`
- **pending-approvals.jsx** -> `GET /populate/read/regularizations`
