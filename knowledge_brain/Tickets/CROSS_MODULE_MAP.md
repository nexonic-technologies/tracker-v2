# Cross Module Map: Tickets

## Outbound References (Mongoose Schema relations)
| Target Collection | Source Collection | Reference Field | Purpose |
|---|---|---|---|
| **employees** | `tickets` | `createdBy` | Author of support ticket |
| **employees** | `tickets` | `assignedTo` | Developers resolving the issue |
| **employees** | `tickets` | `accountManager` | Account manager override |
| **employees** | `tickets` | `convertedBy` | Employee converting ticket to task |
| **employees** | `ticket_comments` | `commentedBy` | Author of the comment |
| **employees** | `ticket_comment_reads` | `userId` | User reading the comment |
| **employees** | `ticket_attachments` | `uploadedBy` | Author uploading files |
| **employees** | `ticket_activity_logs` | `performedBy` | Audit trace actor |
| **employees** | `ticket_assignments` | `assignedTo` / `assignedBy` | Allocation tracking |
| **employees** | `ticket_participants` | `userId` | Subscribed watcher/owner |
| **employees** | `ticket_status_history` | `changedBy` | Actor changing ticket status |
| **agents** | `tickets` | `createdBy` | Customer agent filing issue |
| **agents** | `ticket_comments` | `commentedBy` | External agent commenting |
| **agents** | `ticket_comment_reads` | `userId` | External agent reading comment |
| **agents** | `ticket_attachments` | `uploadedBy` | External agent uploading |
| **agents** | `ticket_activity_logs` | `performedBy` | External agent action log |
| **agents** | `ticket_assignments` | `assignedByModel` | Creator reference |
| **agents** | `ticket_participants` | `userId` | Subscribed agent |
| **agents** | `ticket_status_history` | `changedBy` | Actor changing status |
| **clients** | `tickets` | `clientId` | Customer company reference |
| **project_types** | `tickets` | `projectTypeId` | Category classification |
| **products** | `tickets` | `productId` | Target software product |
| **task_types** | `tickets` | `type` | Task type template |
| **tasks** | `tickets` | `linkedTaskId` | Associated developer task |
| **milestones** | `tickets` | `milestoneId` | Project milestone linkage |
| **Department** | `tickets` | `department` | Owning group |
| **ticket_attachments** | `ticket_comments` | `attachments` | References to uploaded files |
