// # 🚀 Project Roadmap - HR Admin & Task Platform

// This document outlines the phased development plan for the internal HR Admin Panel + Task/Activity Management system.  
// It defines **scope**, **deliverables**, and **exit criteria** for each phase.

// ---

// ## 📌 Phase 1 - Core Foundation
// **Goal:** Replace PHP Tracker + Google Forms with a unified system for attendance & daily activity logging.  

// ### Scope
// - Employee Check-in / Check-out (with timestamps)
// - Daily Activity Form  
//   - Static Header: Project, Client
//   - Fields: Task Type (Bug/CR/Support), Description, Time Taken
//   - Add multiple activities under same Project+Client
//   - Constraint: If project/client changes → new form required
// - Basic Report Export (per employee, per day)

// ### Deliverables
// - Frontend (React): Attendance + Activity UI
// - Backend (Node/Express): APIs for activities
// - Database (MongoDB): Collections → `attendance`, `activities`, `projects`, `clients`
// - Authentication: Reuse existing login

// ### Exit Criteria
// - Employees no longer need PHP tool or Google Form
// - Managers can pull at least a daily activity report

// ---

// ## 📌 Phase 2 - Task Management
// **Goal:** Replace Zoho Connect for task assignment & tracking.  

// ### Scope
// - Task Creation Form (Zoho-style)
//   - Board, Client, Task Title, Notes, User Story, Observations
//   - Impacts, Acceptance Criteria, Priority, Repeated Task (Y/N)
//   - Assignment: Manager OR specific Developer
// - Task Board View (Kanban style)
// - Task Statuses: Open, In-Progress, Completed
// - Notifications (basic email/push)

// ### Deliverables
// - Frontend: Task Board + Forms
// - Backend: Task API, assignment logic
// - DB: `tasks`, `boards`, `task_comments`

// ### Exit Criteria
// - Managers assign tasks only via system (Zoho not needed)
// - Developers receive + update tasks within system

// ---

// ## 📌 Phase 3 - HR Admin Essentials
// **Goal:** Centralize HR documents.  

// ### Scope
// - Payslip Upload/Access (PDF)
// - Offer Letter Management
// - Course / Training Materials
// - Employee Profile Page (linked docs)

// ### Deliverables
// - Frontend: HR Panel
// - Backend: Secure file storage APIs
// - DB: `employee_docs`

// ### Exit Criteria
// - HR stops sending manual docs (offer letters, payslips)
// - Employees access all HR docs in portal

// ---

// ## 📌 Phase 4 - Reports & Performance
// **Goal:** Insight + tracking for management.  

// ### Scope
// - Reports by: Client, Task Type, Employee, Time
// - Performance Dashboard (per user, per team, per project)
// - Export (CSV, PDF)

// ### Deliverables
// - Frontend: Dashboards + Charts
// - Backend: Aggregation APIs
// - DB: Aggregated reporting collections (or views)

// ### Exit Criteria
// - Managers can evaluate performance & client work distribution
// - No manual collation needed

// ---

// ## 📊 Phase Tracking (Example Table)

// | Phase | Status   | Start Date | End Date | Exit Criteria Met? |
// |-------|----------|------------|----------|---------------------|
// | 1     | ⏳ In Progress | 2025-08-20 | TBD      | No                  |
// | 2     | ⏸ Planned     | TBD        | TBD      | -                   |
// | 3     | ⏸ Planned     | TBD        | TBD      | -                   |
// | 4     | ⏸ Planned     | TBD        | TBD      | -                   |

// ---

// ## 🔑 Notes
// - Each phase must have a **clear exit criteria** before starting the next.  
// - Architecture will be designed to allow gradual rollout.  
// - Employee feedback will guide scope adjustments.