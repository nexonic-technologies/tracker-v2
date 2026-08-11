# Data Flow: tasks

## API Payloads
Extracted from React Components targeting the generic API endpoint.

- **CreateTaskModal.jsx** -> `POST /populate/create/tasks`
- **index.jsx** -> `GET /populate/read/tasks`
- **index.jsx** -> `POST /populate/read/clients/${task.clientId}`
- **index.jsx** -> `POST /populate/read/project_types/${task.projectTypeId}`
- **index.jsx** -> `POST /populate/read/clients`
- **index.jsx** -> `POST /populate/read/employees`
- **index.jsx** -> `POST /populate/read/task_types`
- **index.jsx** -> `POST /populate/read/tasks/${taskId}`
- **index.jsx** -> `POST /populate/read/clients/${clientId}`
- **my-tasks.jsx** -> `POST /populate/read/tasks`
- **my-tasks.jsx** -> `POST /populate/read/employees`
- **my-tasks.jsx** -> `POST /populate/read/task_types`
- **my-tasks.jsx** -> `POST /populate/read/tasks/${task._id}`
- **reports.jsx** -> `POST /populate/report/tasks`
- **TaskModal.jsx** -> `GET /populate/read/tasks/${task._id}?populateFields=${encodeURIComponent(JSON.stringify(populateFields))}`
- **TaskModal.jsx** -> `GET /populate/read/employees/${userId}?fields=basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage`
- **TaskModal.jsx** -> `POST /populate/read/employees`
- **TaskModal.jsx** -> `GET /populate/read/employees/${comment.commentedBy}?fields=basicInfo.firstName,basicInfo.lastName`
- **TaskModal.jsx** -> `GET /populate/read/employees/${userId}?fields=basicInfo.firstName,basicInfo.lastName,basicInfo.profileImage`
- **TaskModal.jsx** -> `PUT /populate/update/comments_threads/${finalThreadId}`
- **updateTaskById.js** -> `PUT /populate/update/tasks/${taskId}`
- **[id].jsx** -> `GET /populate/read/tasks/${id}?populateFields=${encodeURIComponent(JSON.stringify(populateFields))}`
