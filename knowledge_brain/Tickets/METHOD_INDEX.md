# Method & Model Index: Tickets

## Models (Alphabetical)
| Model | Mongoose Name | Source File |
|---|---|---|
| **Ticket** | `tickets` | `Ticket.js` |
| **TicketActivityLog** | `ticket_activity_logs` | `TicketActivityLog.js` |
| **TicketAssignment** | `ticket_assignments` | `TicketAssignment.js` |
| **TicketAttachment** | `ticket_attachments` | `TicketAttachment.js` |
| **TicketComment** | `ticket_comments` | `TicketComment.js` |
| **TicketCommentRead** | `ticket_comment_reads` | `TicketCommentRead.js` |
| **TicketParticipant** | `ticket_participants` | `TicketParticipant.js` |
| **TicketStatusHistory** | `ticket_status_history` | `TicketStatusHistory.js` |

## Service Hooks & Helper Functions
| Function Name | File | Description |
|---|---|---|
| **beforeCreate** | `services/tickets.js` | Status/type defaults and Agent mapping |
| **afterCreate** | `services/tickets.js` | Participant mapping and initial logs |
| **beforeCreate** | `services/ticket_comments.js` | Agent public checks and client isolation |
| **afterCreate** | `services/ticket_comments.js` | Dynamic status routing and read marks |
| **beforeCreate** | `services/ticket_attachments.js` | Multer payload parsing helper |
| **afterCreate** | `services/ticket_attachments.js` | Parent ticket touch & activity logger |
| **syncTaskStatusToTicket** | `services/ticketTaskSync.js` | Updates ticket status on task state changes |
| **syncTaskAssignmentToTicket**| `services/ticketTaskSync.js` | Updates ticket assignedTo developer |
| **getSyncStatus** | `services/ticketTaskSync.js` | Status health and linking check |
