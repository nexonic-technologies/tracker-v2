# System Architecture Diagrams

## 1. Request Flow with Rate Limiting & Queuing

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                           │
│  GET /api/populate/read/tasks                                   │
│  Headers:                                                        │
│  - Authorization: Bearer TOKEN                                  │
│  - x-device-uuid: device-abc123                                 │
│  - x-source: mobile                                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  1. Device Fingerprinting            │
        │  ─────────────────────────────────   │
        │  Extract / Generate fingerprint      │
        │  Result: "device_abc123"             │
        │  Type: device-uuid (high confidence) │
        └──────────────┬───────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │  2. Rate Limit Check                 │
        │  ─────────────────────────────────   │
        │  Fingerprint: device_abc123          │
        │  Per-second: 7/10 ✓                  │
        │  Per-minute: 287/300 ✓               │
        │  Per-hour: 3500/3600 ✓               │
        │  Status: ALLOWED                     │
        └──────────────┬───────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │  3. Request Queue Check              │
        │  ─────────────────────────────────   │
        │  Queue length: 0                     │
        │  Concurrent requests: 0              │
        │  Status: PROCESS IMMEDIATELY         │
        └──────────────┬───────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │  4. Race Condition Handler           │
        │  ─────────────────────────────────   │
        │  Lock check: N/A (GET request)       │
        │  Status: PROCEED                     │
        └──────────────┬───────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │  5. Route Handler (populateHelper)   │
        │  ─────────────────────────────────   │
        │  Model: tasks                        │
        │  Action: read                        │
        │  Filter: { status: "active" }        │
        └──────────────┬───────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │  6. Database Query                   │
        │  ─────────────────────────────────   │
        │  buildQuery(...) in policyEngine     │
        │  Apply role-based access control     │
        │  Return: [task1, task2, task3]       │
        └──────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              CLIENT RESPONSE (200 OK)                    │
│  ───────────────────────────────────────────────────────│
│  RESPONSE BODY:                                          │
│  {                                                       │
│    "success": true,                                      │
│    "count": 3,                                           │
│    "data": [                                             │
│      { "_id": "id1", "title": "Task 1", ... },          │
│      { "_id": "id2", "title": "Task 2", ... },          │
│      { "_id": "id3", "title": "Task 3", ... }           │
│    ],                                                    │
│    "rateLimit": {                                        │
│      "remaining": { "second": 7, "minute": 287 }        │
│    }                                                     │
│  }                                                       │
│  ───────────────────────────────────────────────────────│
│  RESPONSE HEADERS:                                       │
│  - RateLimit-Limit-Second: 10                           │
│  - RateLimit-Remaining-Second: 7                        │
│  - RateLimit-Reset-Second: 1234567890                   │
│  - RateLimit-Limit-Minute: 300                          │
│  - RateLimit-Remaining-Minute: 287                      │
│  - X-Device-Fingerprint: device_abc123                  │
└──────────────────────────────────────────────────────────┘
```

---

## 2. UPDATE Request with Race Condition Handling

```
┌──────────────────────────────────────────────────────────┐
│                   CLIENT MUTATION REQUEST                │
│  PUT /api/populate/update/documents/doc_id               │
│  Body: { "status": "completed" }                         │
│  Headers: x-device-uuid: device-abc123                   │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  Device Fingerprinting             │
        │  Result: device_abc123             │
        └────────────────┬────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  Rate Limit Check                  │
        │  Status: ALLOWED                   │
        └────────────────┬────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────────────┐
        │  5. Race Condition Handler                     │
        │  ─────────────────────────────────────────   │
        │  Document ID: doc_id                           │
        │  Action: ACQUIRE LOCK                          │
        │                                                 │
        │  ┌─────────────────────────────────────────┐  │
        │  │ LOCK TABLE (In Memory)                  │  │
        │  ├─────────────────────────────────────────┤  │
        │  │ lock_doc_id = {                         │  │
        │  │   lockId: "doc_id_device_abc_123456",  │  │
        │  │   fingerprint: "device_abc123",         │  │
        │  │   expiresAt: now + 30000ms,             │  │
        │  │   version: 5                            │  │
        │  │ }                                       │  │
        │  └─────────────────────────────────────────┘  │
        │                                                 │
        │  Status: LOCK ACQUIRED                         │
        │  Current Version: 5                            │
        └────────────────┬────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────────────┐
        │  6. Database Update                            │
        │  ─────────────────────────────────────────   │
        │  Check version match: __v === 5 ✓              │
        │  Update document: { status: "completed" }      │
        │  Increment version: __v = 6                    │
        │  Return: { _id, __v: 6, ... }                  │
        └────────────────┬────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────────────┐
        │  7. Release Lock                               │
        │  ─────────────────────────────────────────   │
        │  Lock removed from table                       │
        │  Status: LOCK RELEASED                         │
        └────────────────┬────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│            CLIENT RESPONSE (200 OK)                      │
│  ───────────────────────────────────────────────────────│
│  {                                                       │
│    "success": true,                                      │
│    "data": {                                             │
│      "_id": "doc_id",                                    │
│      "status": "completed",                              │
│      "__v": 6                                            │
│    },                                                    │
│    "lock": {                                             │
│      "docId": "doc_id",                                  │
│      "version": 6                                        │
│    }                                                     │
│  }                                                       │
│  ───────────────────────────────────────────────────────│
│  Headers:                                                │
│  - RateLimit-Remaining-Second: 7                        │
│  - X-Device-Fingerprint: device_abc123                  │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Concurrent Update Conflict Scenario

```
SCENARIO: Two devices try to update the same document

TIME: T0
┌────────────────────────────────┐    ┌────────────────────────────────┐
│  DEVICE A                      │    │  DEVICE B                      │
│  Fingerprint: device_aaa111    │    │  Fingerprint: device_bbb222    │
│                                │    │                                │
│  Fetch document:               │    │  Fetch document:               │
│  - Status: pending             │    │  - Status: pending             │
│  - __v: 5                      │    │  - __v: 5                      │
└────────────────────────────────┘    └────────────────────────────────┘

TIME: T1
┌────────────────────────────────┐
│  DEVICE A                      │
│                                │
│  PUT /api/populate/update/doc  │
│  Body: { status: "approved" }  │
│                                │
│  → Acquire lock ✓              │
│  → Check version: __v = 5 ✓    │
│  → Update DB                   │
│  → Increment __v to 6          │
│  → Release lock                │
│                                │
│  Response 200 OK ✓             │
└────────────────────────────────┘

TIME: T2
                    ┌────────────────────────────────┐
                    │  DEVICE B                      │
                    │                                │
                    │  PUT /api/populate/update/doc  │
                    │  Body: { status: "rejected" }  │
                    │                                │
                    │  → Acquire lock ✓              │
                    │  → Check version: __v = 6      │
                    │                                │
                    │  VERSION MISMATCH!             │
                    │  Expected __v = 5, got 6       │
                    │  → Release lock                │
                    │                                │
                    │  Response 409 CONFLICT         │
                    │  {                             │
                    │    "success": false,           │
                    │    "conflict": true,           │
                    │    "reason": "version_mismatch"│
                    │  }                             │
                    │                                │
                    │  ACTION: Retry with backoff    │
                    └────────────────────────────────┘

TIME: T3+ (Client Retry)
                    ┌────────────────────────────────┐
                    │  DEVICE B (RETRY)              │
                    │                                │
                    │  1. Fetch document again       │
                    │     - New __v: 6               │
                    │  2. PUT with new version       │
                    │  3. Lock acquired ✓            │
                    │  4. Version check: __v = 6 ✓   │
                    │  5. Update successful          │
                    │  6. Increment __v to 7         │
                    │  7. Response 200 OK ✓          │
                    └────────────────────────────────┘
```

---

## 4. Rate Limit Violation Progression

```
┌──────────────────────────────────────────────────────────┐
│         RATE LIMIT VIOLATION PROGRESSION                 │
│  (Per Device Fingerprint)                                │
└──────────────────────────────────────────────────────────┘

NORMAL OPERATION:
┌────────────┐
│ Device ABC │
│ Requests:  │
│ 1 ✓ 2 ✓ 3 ✓ 4 ✓ 5 ✓ ...
│ Status: OK │
└────────────┘


VIOLATION #1 (Requests exceed per-second limit):
┌────────────────────────────────────────────────────────┐
│ Time: T1                                               │
│ Requests: 1 ✓ 2 ✓ 3 ✓ ... 10 ✓ 11 ✗ LIMIT EXCEEDED   │
│ Status: 429 Too Many Requests                          │
│ Violations: 1/3                                        │
│ Response:                                              │
│ {                                                      │
│   "success": false,                                    │
│   "reason": "rate_limit_exceeded_second",              │
│   "retryAfter": 1,                                     │
│   "violations": 1                                      │
│ }                                                      │
└────────────────────────────────────────────────────────┘


VIOLATION #2 (Another burst):
┌────────────────────────────────────────────────────────┐
│ Time: T2 (≈1 second later)                             │
│ Requests: 12 ✓ 13 ✓ ... 20 ✓ 21 ✗ LIMIT EXCEEDED      │
│ Status: 429 Too Many Requests                          │
│ Violations: 2/3                                        │
│ Response:                                              │
│ {                                                      │
│   "violations": 2                                      │
│ }                                                      │
└────────────────────────────────────────────────────────┘


VIOLATION #3 (BLOCKING ACTIVATED):
┌────────────────────────────────────────────────────────┐
│ Time: T3 (≈2 seconds later)                            │
│ Requests: 22 ✗ BLOCKED                                 │
│ Status: 429 Too Many Requests                          │
│ Violations: 3/3 → DEVICE BLOCKED FOR 1 SECOND          │
│ Response:                                              │
│ {                                                      │
│   "success": false,                                    │
│   "reason": "device_temporarily_blocked",              │
│   "retryAfter": 1,                                     │
│   "violations": 3                                      │
│ }                                                      │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ BLOCKING DURATION (Exponential Backoff)          │  │
│ │                                                  │  │
│ │ Violation Count  │  Block Duration              │  │
│ │ ─────────────────┼─────────────────────────────  │  │
│ │ 1-2             │  Soft rejection (no block)    │  │
│ │ 3               │  1 second                     │  │
│ │ 4               │  2 seconds (2^1)              │  │
│ │ 5               │  4 seconds (2^2)              │  │
│ │ 6               │  8 seconds (2^3)              │  │
│ │ 7               │  16 seconds (2^4)             │  │
│ │ 8               │  32 seconds (2^5)             │  │
│ │ 9               │  64 seconds (2^6)             │  │
│ │ 10+             │  3600 seconds max (1 hour)    │  │
│ └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘


RECOVERY:
┌────────────────────────────────────────────────────────┐
│ Time: T4 (≥1 second later)                             │
│ Block expires, violations reset to 2                   │
│ Status: Can make requests again ✓                      │
│                                                        │
│ Key: Each successful request decrements violations      │
│ So: Don't hammer the server - backoff helps recovery  │
└────────────────────────────────────────────────────────┘
```

---

## 5. Request Queue State Machine

```
┌────────────────────────────────────────────────────────────────┐
│              REQUEST QUEUE STATE MACHINE                       │
│           (Per Device Fingerprint)                             │
└────────────────────────────────────────────────────────────────┘


INITIAL STATE:
┌─────────────────────────────────┐
│ Queue = []                      │
│ Processing = 0                  │
│ Max Concurrent = 2              │
│ Max Queue Size = 100            │
└─────────────────────────────────┘


REQUEST 1 ARRIVES:
              ┌──────────────────────┐
              │ Request 1            │
              │ Priority: normal     │
              └────────┬─────────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │ Queue Empty?             │
        │ Processing < Max (0<2)?  │
        │ YES                      │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ START PROCESSING         │
        │ Processing = 1           │
        │ Status: PROCESSING       │
        └──────────────────────────┘


REQUEST 2 ARRIVES:
              ┌──────────────────────┐
              │ Request 2            │
              │ Priority: normal     │
              └────────┬─────────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │ Queue Empty?             │
        │ Processing < Max (1<2)?  │
        │ YES                      │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ START PROCESSING         │
        │ Processing = 2           │
        │ Status: PROCESSING       │
        └──────────────────────────┘


REQUEST 3 ARRIVES:
              ┌──────────────────────┐
              │ Request 3            │
              │ Priority: normal     │
              └────────┬─────────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │ Queue Empty?             │
        │ Processing < Max (2<2)?  │
        │ NO - QUEUE IT            │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ ADD TO QUEUE             │
        │ Queue = [Request 3]      │
        │ Status: QUEUED           │
        └──────────────────────────┘


REQUEST 4 ARRIVES (HIGH PRIORITY):
              ┌──────────────────────┐
              │ Request 4            │
              │ Priority: HIGH       │
              └────────┬─────────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │ ADD TO QUEUE (PRIORITY)  │
        │ Insert at front of queue │
        │ Queue = [4, 3]           │
        │ Status: QUEUED           │
        └──────────────────────────┘


REQUEST 1 COMPLETES:
        ┌──────────────────────────┐
        │ Request 1: COMPLETE ✓    │
        │ Processing = 1           │
        │ Time to complete: 45ms   │
        │ Return: 200 OK           │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ PROCESS NEXT IN QUEUE    │
        │ Dequeue: Request 4       │
        │ Processing = 2           │
        │ Queue = [3]              │
        │ Status: PROCESSING       │
        └──────────────────────────┘


REQUEST 2 COMPLETES:
        ┌──────────────────────────┐
        │ Request 2: COMPLETE ✓    │
        │ Processing = 1           │
        │ Return: 200 OK           │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ PROCESS NEXT IN QUEUE    │
        │ Dequeue: Request 3       │
        │ Processing = 2           │
        │ Queue = []               │
        │ Status: PROCESSING       │
        └──────────────────────────┘


QUEUE FULL SCENARIO:
        ┌──────────────────────────┐
        │ Queue Length = 100       │
        │ New Request Arrives      │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ QUEUE FULL!              │
        │ Return: 503 Service      │
        │ Unavailable              │
        │ Client should backoff    │
        └──────────────────────────┘
```

---

## 6. Complete System State (Per Device)

```
┌─────────────────────────────────────────────────────────────┐
│               DEVICE STATE SNAPSHOT                         │
│           (device_abc123 at time T)                         │
└─────────────────────────────────────────────────────────────┘

FINGERPRINT INFO:
┌─────────────────────────────────────────────────────────────┐
│ Fingerprint ID:     device_abc123                           │
│ Type:               device-uuid (high confidence)           │
│ Components:                                                 │
│  - Device UUID:     device_abc123                           │
│  - Browser:         Chrome 91.0                             │
│  - OS:              Windows 10                              │
│  - IP Address:      192.168.1.100                           │
│  - Source:          mobile                                  │
└─────────────────────────────────────────────────────────────┘

RATE LIMIT STATE:
┌─────────────────────────────────────────────────────────────┐
│ Requests this second:   7 / 10 ✓                            │
│ Requests this minute:   287 / 300 ✓                         │
│ Requests this hour:     3500 / 3600 ✓                       │
│ Violations:             0                                   │
│ Blocked:                false                               │
│ Last request:           2024-05-27T12:00:15.000Z            │
└─────────────────────────────────────────────────────────────┘

QUEUE STATE:
┌─────────────────────────────────────────────────────────────┐
│ Queued requests:        2                                   │
│ Currently processing:   2                                   │
│ Max concurrent:         2                                   │
│ Queue items:                                                │
│  [1] GET /api/populate/read/tasks      - PROCESSING        │
│  [2] PUT /api/populate/update/task/123 - PROCESSING        │
│  [3] GET /api/populate/read/projects   - QUEUED            │
│  [4] DELETE /api/populate/delete/task/456 - QUEUED        │
│ Avg wait time:          150ms                               │
│ Success rate:           99.5%                               │
└─────────────────────────────────────────────────────────────┘

LOCK STATE:
┌─────────────────────────────────────────────────────────────┐
│ Locks held by this device:   1                              │
│ [1] Document ID: doc_123                                    │
│     Lock ID: doc_123_device_abc_123456                      │
│     Acquired: 2024-05-27T12:00:10.000Z                      │
│     Expires:  2024-05-27T12:00:40.000Z                      │
│     Version:  5                                             │
│     Priority: normal                                        │
│     Time remaining: 25 seconds                              │
└─────────────────────────────────────────────────────────────┘

AGGREGATE STATS:
┌─────────────────────────────────────────────────────────────┐
│ Total requests queued:      150                             │
│ Total requests processed:   147                             │
│ Total requests failed:      2                               │
│ Avg processing time:        85ms                            │
│ Avg wait in queue:          450ms                           │
│ Session duration:           45 minutes                      │
│ Last activity:              30 seconds ago                  │
└─────────────────────────────────────────────────────────────┘
```

