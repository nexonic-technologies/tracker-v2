# Data Flow: Common

## API Payloads
Extracted from React Components targeting the generic API endpoint.

- **AddComment.jsx** -> `PUT /populate/update/comments_threads/${threadId}`
- **PriorityTasks.jsx** -> `GET /populate/read/tasks?filter=${encodeURIComponent(
            JSON.stringify(filter)
          )}&limit=5&sort={`
