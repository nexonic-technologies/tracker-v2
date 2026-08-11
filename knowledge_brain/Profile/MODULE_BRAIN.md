# Profile Module Brain

## Overview
This module manages the employee profile data, including basic info, address, professional details, bank account details, CTC structure, and identification documents. It includes 1 frontend screen (`me/index.tsx`) in the mobile app and maps to the `employees` backend model.

## Backend Models
| Model | File | Lines | Key Fields | Notes |
|---|---|---|---|---|
| Employee | Employee.js | — | `basicInfo` (firstName, lastName, email, phone, dob, profileImage), `professionalInfo` (doj, designation, role, department, reportingManager), `accountDetails`, `salaryDetails`, `personalDocuments` | Ref collections: roles, designations, departments, employees |

## Dynamic API Usage
| File | Method | URL | Target Model | Purpose |
|---|---|---|---|---|
| index.tsx | GET | `/populate/read/employees/${userId}?populateFields=...` | employees | Fetches detailed info about the employee, populating reportingManager, teamLead, and designation profiles. |
| index.tsx | PUT | `/populate/update/employees/${userId}` | employees | Updates the employee profile record (uses multipart/form-data headers to optionally upload a new avatar image). |
