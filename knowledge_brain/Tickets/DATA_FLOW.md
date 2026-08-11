# Data Flow: Tickets

## Dynamic API Payloads
Extracted from React dashboard pages targeting the generic `/populate` endpoint:

### 1. Support Dashboard (`tickets/index.jsx` & `my-tickets.jsx`)
- **Query Tickets**: `POST /populate/read/tickets`
  - Payload: `{ sort: { createdAt: -1 }, populateFields: [{ path: "createdBy" }, { path: "assignedTo" }, { path: "linkedTaskId" }] }`
- **File New Ticket**: `POST /populate/create/tickets`
  - Payload: `{ title: "Issue Title", description: "Details", productId: "prod_id", type: "type_id", priority: "High" }`
- **Update Ticket Info**: `PUT /populate/update/tickets/:id`
  - Payload: `{ title, priority, assignedTo: ["emp_id_1", "emp_id_2"], milestoneId }`

### 2. Comments Thread & Internal Notes
- **Query Comments**: `POST /populate/read/ticket_comments`
  - Payload: `{ filter: { ticketId: "ticket_id" }, populateFields: [{ path: "commentedBy", select: "basicInfo" }] }`
- **Submit Public/Private Comment**: `POST /populate/create/ticket_comments`
  - Payload: `{ ticketId: "ticket_id", message: "Comment body text", isPublic: true }`
  - *Note*: `ticketCommentsService` automatically intercept to adjust status (`Waiting For Admin` or `Waiting For Client`).
- **Mark Comment Read**: `POST /populate/create/ticket_comment_reads`
  - Payload: `{ commentId: "comment_id" }`

### 3. Attachments & Logs
- **Upload Attachment**: `POST /populate/create/ticket_attachments`
  - Content-Type: `multipart/form-data`
  - Files attached to `attachments` field.
  - Body payload: `{ ticketId: "ticket_id" }`
- **Query Activity History**: `POST /populate/read/ticket_activity_logs`
  - Payload: `{ filter: { ticketId: "ticket_id" }, sort: { createdAt: -1 } }`

### 4. Developer Task Synchronization
- **Convert Ticket to Developer Task**: `POST /populate/create/tasks` (from Admin UI)
  - Payload: `{ title, description, priority, linkedTicketId: "ticket_id" }`
  - *Side Effect*: Updates Ticket `isConvertedToTask = true`, `linkedTaskId = task_id`, `convertedAt = now`.
- **Automatic Status Sync**:
  - Updating a Task status triggers `TicketTaskSyncService.syncTaskStatusToTicket` to auto-advance the Ticket's status (e.g. `Completed` ➔ `Resolved`).
