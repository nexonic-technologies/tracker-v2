# Data Flow: Core

## API Payloads
Extracted from React Components targeting the generic API endpoint.

- **Teams.jsx** -> `POST /populate/read/employees`
- **useGenericAPI.js** -> `POST /populate/create/${model}`
- **useGenericAPI.js** -> `PUT /populate/update/${model}/${id}`
- **useGenericAPI.js** -> `DELETE /populate/delete/${model}/${id}`
- **useGenericAPI.js** -> `POST /populate/bulk-create/${model}`
- **useGenericAPI.js** -> `PUT /populate/bulk-update/${model}`
- **useGenericAPI.js** -> `DELETE /populate/bulk-delete/${model}`
