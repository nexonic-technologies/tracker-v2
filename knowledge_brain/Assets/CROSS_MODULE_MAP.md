# Cross Module Map: Assets

## Outbound References (Mongoose Schema relations)
| Target Collection | Source Collection | Reference Field | Purpose |
|---|---|---|---|
| **employees** | `assets` | `createdBy` | Audit of creator |
| **employees** | `assets` | `currentAllocatedTo` | Holder reference for query projection |
| **employees** | `assets_allocations` | `employeeId` | Target assignee |
| **employees** | `assets_allocations` | `managerId` | Manager responsible for approval |
| **employees** | `assets_incidents` | `employeeId` | Person responsible for damage/loss |
| **employees** | `assets_repairs` | `createdBy` | Authorizer of repair order |
| **departments** | `assets_allocations` | `departmentId` | Department visibility scope |
| **departments** | `assets_incidents` | `departmentId` | Department responsibility scope |
| **approvalworkflows** | `assets_allocations` | `workflowId` | Workflow instance status |
| **approvalworkflows** | `assets_incidents` | `workflowId` | Workflow instance status |
| **payrolls** | `assets_incidents` | `recoveryPayrollId` | Triggers salary deduction |
| **assets_categories** | `assets` | `categoryId` | Equipment category classification |
| **assets_purchases** | `assets` | `purchaseId` | Procurement order reference |
