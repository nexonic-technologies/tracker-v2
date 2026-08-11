# Tracker Mobile API Documentation

This document describes the structure of the Node.js/Express backend APIs, specifically focusing on the dynamic **Populate API** layer, the parameters it supports, and the endpoints required for the Flutter mobile application.

---

## 1. The Populate API Architecture

Instead of having hundreds of static routes, the backend uses a generic **Access Policy and Populate CRUD router** mapped to:
*   **Without ID:** `POST /api/populate/:action/:model` (or `GET`/`PUT`/`DELETE` based on action)
*   **With ID:** `POST /api/populate/:action/:model/:id`

### Dynamic Variables
*   `action`: Can be `read`, `create`, `update`, `delete`, `bulk-upsert`, or `statistics`.
*   `model`: The name of the database collection in lowercase plural (e.g., `tickets`, `tasks`, `daily_activities`, `employees`, `clients`, `task_types`).

---

## 2. Common Request Parameters (Query or Request Body)

For **`read`** actions, parameters can be passed in either the query string (`GET` style) or in the JSON body (`POST` style). Passing parameters in the JSON body is recommended to avoid URL length limit issues.

| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `fields` | String \| Array | Comma-separated list of document properties to return. Optimizes DB queries. | `"title,priority,status,ticketId"` |
| `filter` | String \| Object | JSON string representing MongoDB filter query, or `key=value` string. | `{"status": "Open", "createdBy": "user_id"}` |
| `populateFields` | String \| Object | Maps reference fields to sub-fields you want to pull. | `{"assignedTo": "basicInfo.firstName", "clientId": "name"}` |
| `sort` | String \| Object | Sort direction mapping. Default is `{"createdAt": -1}`. | `{"createdAt": -1}` |
| `page` | Number | Page number for pagination (starts at 1). | `1` |
| `limit` | Number | Number of items per page (maximum: 100). | `20` |
| `type` | Number | Optimized preset selector. `1` = summary, `2` = detailed, `3` = statistics. | `1` |

---

## 3. Global Response Envelope

All populate endpoints return a unified JSON response payload:

```json
{
  "success": true,
  "count": 3,
  "data": [ ... ],
  "rateLimit": {
    "allowed": true,
    "remaining": {
      "second": 9,
      "minute": 284,
      "hour": 3533
    },
    "resetAt": {
      "second": 1781768736389,
      "minute": 1781768795389,
      "hour": 1781772335389
    }
  }
}
```

---

## 4. Endpoint Specifications

### A. Authentication
*   **Login**
    *   **Method:** `POST`
    *   **URL:** `/api/auth/login`
    *   **Payload:**
        ```json
        {
          "workEmail": "user@company.com",
          "password": "yourpassword",
          "platform": "mobile",
          "deviceUUID": "unique_hardware_id"
        }
        ```
    *   **Response:**
        ```json
        {
          "success": true,
          "accessToken": "eyJhbGciOi...",
          "sessionId": "session_mongodb_id"
        }
        ```

---

### B. Tickets Module
*   **Read Tickets (My Tickets)**
    *   **Method:** `POST` (or `GET` with Query Params)
    *   **URL:** `/api/populate/read/tickets`
    *   **Payload:**
        ```json
        {
          "fields": "title,type,priority,status,dueDate,createdAt,assignedTo,createdBy,ticketId",
          "limit": 1000
        }
        ```
    *   *Note: Filter by creator or assignee client-side, or use filter parameter.*

*   **Create Ticket**
    *   **Method:** `POST`
    *   **URL:** `/api/populate/create/tickets`
    *   **Payload:**
        ```json
        {
          "title": "Bug in login flow",
          "userStory": "Steps to reproduce: ...",
          "priority": "High", // 'Low', 'Medium', 'High', 'Critical'
          "type": "Bug", // 'Bug', 'Feature', 'Enhancement', 'Support'
          "product": "Workhub ERP",
          "dueDate": "2026-06-25",
          "createdBy": "current_user_id",
          "status": "Open"
        }
        ```

*   **Update Ticket**
    *   **Method:** `PUT` / `POST`
    *   **URL:** `/api/populate/update/tickets/:id`
    *   **Payload:** Properties to update (e.g. `{"status": "In Progress"}`).

---

### C. Tasks Module
*   **Read Tasks**
    *   **Method:** `POST`
    *   **URL:** `/api/populate/read/tasks`
    *   **Payload:**
        ```json
        {
          "limit": 500,
          "populateFields": {
            "clientId": "name",
            "projectTypeId": "name",
            "assignedTo": "basicInfo.firstName,basicInfo.lastName"
          }
        }
        ```

*   **Create Task**
    *   **Method:** `POST`
    *   **URL:** `/api/populate/create/tasks`

---

### D. Daily Activity (Daily Tracker)
*   **Read Daily Logged Activities**
    *   **Method:** `POST`
    *   **URL:** `/api/populate/read/daily_activities`
    *   **Payload:**
        ```json
        {
          "filter": {
            "user": "current_user_id",
            "date": {
              "$gte": "2026-06-18T00:00:00.000Z",
              "$lte": "2026-06-18T23:59:59.999Z"
            }
          },
          "populateFields": {
            "client": "name",
            "projectType": "name",
            "taskType": "name"
          }
        }
        ```

*   **Log Activity**
    *   **Method:** `POST`
    *   **URL:** `/api/populate/create/daily_activities`
    *   **Payload:**
        ```json
        {
          "user": "current_user_id",
          "client": "client_mongodb_id",
          "projectType": "project_type_mongodb_id",
          "taskType": "task_type_mongodb_id",
          "activity": "Completed design system specifications and refactored tickets page",
          "date": "2026-06-18T00:00:00.000Z"
        }
        ```

---

### E. Configuration & Meta Data (For dropdown forms)
*   **Read Clients & Sub Project Types**
    *   **Method:** `GET`
    *   **URL:** `/api/populate/read/clients`
    *   **Query Params:** `populateFields={"project_types":"name"}` (Returns all clients with their child project lists).

*   **Read Task Types**
    *   **Method:** `GET`
    *   **URL:** `/api/populate/read/task_types`
    *   *(Populates basic task category IDs and display names)*
