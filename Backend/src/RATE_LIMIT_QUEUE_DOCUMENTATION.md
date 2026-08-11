# Rate Limiting, Request Queueing & Race Condition Handling

Comprehensive guide to the AWS API Gateway-style rate limiting, request queueing, and race condition handling system implemented in the Loigmax backend.

## Overview

This system implements three critical features to ensure reliable, scalable API operations:

1. **Device Fingerprinting & Rate Limiting** - Control request frequency per device
2. **Request Queueing** - Prevent concurrent modification conflicts
3. **Race Condition Handling** - Optimistic locking with version control

---

## 1. Device Fingerprinting

### What is Device Fingerprinting?

Device fingerprinting creates a unique identifier for each client device using multiple factors:
- Device UUID (if provided via `x-device-uuid` header)
- User-Agent parsing (Browser, OS, Version)
- IP Address
- Device Model
- Application source

### How to Use

#### Client-Side Implementation

**Send Device UUID (Recommended)**

```javascript
// Client code - send unique device identifier
const deviceUuid = localStorage.getItem('deviceUuid') || generateUUID();
localStorage.setItem('deviceUuid', deviceUuid);

const response = await fetch('/api/populate/read/tasks/1', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-device-uuid': deviceUuid,
    'x-source': 'mobile' // or 'web', 'flutter', etc.
  }
});
```

**Without Device UUID**

The system will automatically generate a composite fingerprint from browser/OS info:

```javascript
// No special headers needed - fingerprint is automatic
const response = await fetch('/api/populate/read/tasks/1', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

#### Server-Side Usage

```javascript
import { getFingerprint, getDeviceInfo } from './utils/deviceFingerprint.js';

// In any route handler
app.get('/api/some-endpoint', (req, res) => {
  const fingerprint = getFingerprint(req);
  // fingerprint.fingerprint: 'device_uuid' or 'composite_hash'
  // fingerprint.type: 'device-uuid' or 'composite'
  // fingerprint.confidence: 'high' or 'medium'
  // fingerprint.components: { browser, os, ipAddress, ... }

  const deviceInfo = getDeviceInfo(req);
  // { fingerprint, type, confidence, name, os, model, ipAddress, source }

  console.log(`Request from ${deviceInfo.name} on ${deviceInfo.os}`);
  res.json({ success: true });
});
```

### Response Headers

The system automatically adds rate limit information to all responses:

```http
HTTP/1.1 200 OK
RateLimit-Limit-Second: 10
RateLimit-Remaining-Second: 7
RateLimit-Reset-Second: 1234567890

RateLimit-Limit-Minute: 300
RateLimit-Remaining-Minute: 289
RateLimit-Reset-Minute: 1234567920
```

---

## 2. Rate Limiting

### How It Works

The rate limiter prevents abuse by limiting requests per device across three time windows:

| Window | Default Limit | Burst Allowed |
|--------|--------------|---------------|
| Per Second | 10 req/s | ×1.5 = 15 req/s |
| Per Minute | 300 req/min | — |
| Per Hour | 3,600 req/hr | — |

Route-specific limits override defaults:

```
/auth/login     → 2 req/s, 20 req/min
/auth/register  → 1 req/s, 10 req/min
/bulk-upsert    → 5 req/s, 50 req/min
/read           → 20 req/s, 500 req/min
```

### Error Responses

When rate limit is exceeded, you receive HTTP 429:

```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "reason": "rate_limit_exceeded_second",
  "retryAfter": 1,
  "violations": 3
}
```

Response Headers:

```http
HTTP/1.1 429 Too Many Requests
RateLimit-Reset: 1
Retry-After: 1
```

### Progressive Blocking

After 3 violations within a time window, the device is temporarily blocked:

- **Violation 1-2**: Normal rate limit rejection
- **Violation 3**: 1 second block
- **Violation 4**: 2 second block (exponential backoff)
- **Violation 5+**: Up to 1 hour block

### Admin Management

Administrators can manage rate limits via `/api/admin` endpoints.

#### Get Rate Limit Status

```bash
curl -X GET http://localhost:3000/api/admin/rate-limit/status/device_abc123 \
  -H "Authorization: Bearer <admin-token>"
```

Response:
```json
{
  "success": true,
  "data": {
    "fingerprint": "device_abc123",
    "status": "active",
    "violations": 0,
    "blocked": false,
    "requestCount": 5,
    "lastRequest": "2024-05-27T12:00:00.000Z"
  }
}
```

#### Reset Rate Limit

```bash
curl -X POST http://localhost:3000/api/admin/rate-limit/reset/device_abc123 \
  -H "Authorization: Bearer <admin-token>"
```

#### Update Rate Limit Config

```bash
curl -X PUT http://localhost:3000/api/admin/rate-limit/config \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "requestsPerSecond": 20,
    "requestsPerMinute": 500,
    "requestsPerHour": 5000,
    "burstAllowance": 1.5,
    "routeOverrides": {
      "auth/login": { "requestsPerSecond": 2, "requestsPerMinute": 20 }
    }
  }'
```

#### Whitelist a Device

```bash
curl -X POST http://localhost:3000/api/admin/rate-limit/whitelist \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fingerprint": "device_trusted123",
    "reason": "Internal testing device"
  }'
```

---

## 3. Request Queueing

### Purpose

Prevents race conditions by serializing concurrent requests from the same device for the same document.

### How It Works

- Each device fingerprint has its own request queue
- Requests are processed sequentially per device (max 2 concurrent)
- Queue size limited to 100 requests
- Individual request timeout: 30 seconds

### Configuration

```javascript
// In requestQueue.js
const requestQueue = new RequestQueue({
  maxConcurrentPerDevice: 2,      // Max parallel requests per device
  maxQueueSize: 100,              // Max queued requests per device
  requestTimeout: 30000,          // 30 second timeout per request
  cleanupInterval: 60 * 60 * 1000 // Cleanup every hour
});
```

### Queue Entry Status

```json
{
  "position": 0,
  "queueLength": 3,
  "metrics": {
    "queued": 100,
    "processed": 95,
    "failed": 2,
    "totalWaitTime": 45000
  },
  "queue": [
    {
      "id": "device_xyz_1234567890_abc",
      "priority": "normal",
      "status": "queued",
      "createdAt": "2024-05-27T12:00:00.000Z"
    }
  ]
}
```

### Admin Management

#### Get Queue Stats

```bash
curl -X GET http://localhost:3000/api/admin/queue/stats \
  -H "Authorization: Bearer <admin-token>"
```

Response:
```json
{
  "success": true,
  "data": {
    "trackedDevices": 150,
    "totalQueued": 5000,
    "totalProcessed": 4950,
    "totalFailed": 15,
    "currentlyProcessing": 35,
    "avgQueueSize": 2.3,
    "successRate": "99.70%"
  }
}
```

#### Clear Device Queue

```bash
curl -X POST http://localhost:3000/api/admin/queue/clear/device_abc123 \
  -H "Authorization: Bearer <admin-token>"
```

#### Update Queue Config

```bash
curl -X PUT http://localhost:3000/api/admin/queue/config \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "maxConcurrentPerDevice": 3,
    "maxQueueSize": 200,
    "requestTimeout": 45000
  }'
```

---

## 4. Race Condition Handling

### Optimistic Locking

Uses MongoDB `__v` version field for optimistic concurrency control:

```javascript
// Document schema must include __v field
{
  _id: ObjectId,
  __v: 0,  // Version field
  name: "Task",
  data: {}
}
```

### Lock Acquisition

For update/create operations, the system acquires a lock:

```javascript
// Lock acquired automatically on mutation requests
req.lock = {
  docId: "507f1f77bcf86cd799439011",
  lockId: "507f1f77bcf86cd799439011_device_xyz_123456",
  version: 0  // Current document version
}
```

### Conflict Detection

If another device modifies the document, you receive HTTP 409:

```json
{
  "success": false,
  "message": "Document is being modified by another device",
  "reason": "lock_held_by_another_device",
  "conflict": true,
  "waitTime": 5
}
```

### Server Response (on success)

```json
{
  "success": true,
  "data": { /* updated document */ },
  "lock": {
    "docId": "507f1f77bcf86cd799439011",
    "version": 1
  }
}
```

### Admin Management

#### Get All Active Locks

```bash
curl -X GET http://localhost:3000/api/admin/locks/all \
  -H "Authorization: Bearer <admin-token>"
```

Response:
```json
{
  "success": true,
  "count": 23,
  "data": [
    {
      "lockId": "507f1f77bcf86cd799439011_device_xyz_123456",
      "docId": "507f1f77bcf86cd799439011",
      "fingerprint": "device_xyz",
      "priority": "normal",
      "remainingTime": 25000,
      "renewals": 0
    }
  ]
}
```

#### Check Lock Status

```bash
curl -X GET http://localhost:3000/api/admin/locks/status/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <admin-token>"
```

#### Force Release Lock

```bash
curl -X POST http://localhost:3000/api/admin/locks/force-release/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Device unresponsive" }'
```

#### Update Lock Config

```bash
curl -X PUT http://localhost:3000/api/admin/locks/config \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "lockTimeout": 45000,
    "maxRetries": 5,
    "retryDelay": 200
  }'
```

---

## 5. System Health Monitoring

### Get Overall Health

```bash
curl -X GET http://localhost:3000/api/admin/system/health \
  -H "Authorization: Bearer <admin-token>"
```

Response:
```json
{
  "success": true,
  "data": {
    "rateLimit": {
      "trackedDevices": 450,
      "totalRequests": 125000,
      "blockedDevices": 3,
      "totalViolations": 12
    },
    "queue": {
      "trackedDevices": 180,
      "totalQueued": 8500,
      "totalProcessed": 8450,
      "totalFailed": 25,
      "currentlyProcessing": 45,
      "avgQueueSize": 3.1,
      "successRate": "99.71%"
    },
    "locks": {
      "trackedDocuments": 1200,
      "activeLocks": 42,
      "expiredLocks": 0,
      "avgVersion": 3.2
    },
    "timestamp": "2024-05-27T12:00:00.000Z",
    "status": "healthy"
  }
}
```

### Emergency Reset

```bash
curl -X POST http://localhost:3000/api/admin/system/reset \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{ "confirmReset": true }'
```

⚠️ **WARNING**: This clears all queues and locks. Use only in emergency situations.

---

## 6. Implementation Examples

### Bulk Upsert with Race Condition Handling

```javascript
// Client code
const payload = [
  {
    filter: { employeeId: "EMP001" },
    body: { status: "active", salary: 50000 }
  },
  {
    filter: { employeeId: "EMP002" },
    body: { status: "inactive", salary: 45000 }
  }
];

const response = await fetch('/api/populate/bulk-upsert/employees', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-device-uuid': deviceUuid,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

const data = await response.json();
console.log('Updated records:', data.count);
console.log('Errors:', data.errors);
console.log('Rate limit remaining:', data.rateLimit.remaining);
```

### Handling Rate Limit 429

```javascript
async function requestWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After')) || 1;
      console.log(`Rate limited. Retrying after ${retryAfter}s (attempt ${attempt}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message);
    }

    return response.json();
  }

  throw new Error('Max retries exceeded');
}

// Usage
const data = await requestWithRetry('/api/populate/read/tasks/1', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Handling Race Conditions (409 Conflict)

```javascript
async function updateWithConflictRetry(docId, updates, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // First, fetch current version
      const current = await fetch(`/api/populate/read/documents/${docId}`);
      const doc = await current.json();

      // Attempt update
      const response = await fetch(`/api/populate/update/documents/${docId}`, {
        method: 'PUT',
        headers: {
          'x-device-uuid': deviceUuid,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updates,
          __v: doc.data.__v  // Include version
        })
      });

      if (response.status === 409) {
        const error = await response.json();
        console.log(`Conflict detected. Retrying... (attempt ${attempt}/${maxRetries})`);
        
        const waitTime = error.waitTime || 1;
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.error(`Attempt ${attempt} failed:`, error.message);
    }
  }
}

// Usage
const updated = await updateWithConflictRetry('docId123', {
  status: 'completed',
  updatedAt: new Date()
});
```

---

## 7. Performance Tuning

### High Load Scenarios

For high-traffic applications, adjust configuration:

```bash
# Increase rate limits
curl -X PUT http://localhost:3000/api/admin/rate-limit/config \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "requestsPerSecond": 50,
    "requestsPerMinute": 1000,
    "requestsPerHour": 10000,
    "burstAllowance": 2
  }'

# Increase queue concurrency
curl -X PUT http://localhost:3000/api/admin/queue/config \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "maxConcurrentPerDevice": 5,
    "maxQueueSize": 500,
    "requestTimeout": 60000
  }'
```

### Memory Optimization

The system automatically:
- Cleans up expired locks every hour
- Removes inactive queue records after 1 hour
- Limits memory overhead with smart cleanup

Monitor memory usage in `/api/admin/system/health`:

```json
{
  "rateLimit": {
    "memoryUsage": {
      "rss": 1234567890,
      "heapTotal": 987654321,
      "heapUsed": 456789012,
      "external": 12345678
    }
  }
}
```

---

## 8. Security Considerations

1. **Device UUID**: Generate unique UUIDs per device and persist securely
2. **Fingerprint Spoofing**: Composite fingerprints are harder to spoof than IP alone
3. **Admin Endpoints**: Require Super Admin role - never expose to clients
4. **Rate Limit Whitelist**: Only whitelist internal/trusted services
5. **Log Violations**: Monitor rate limit violations for attack detection

---

## 9. Troubleshooting

### "Rate limit exceeded" constantly

- **Cause**: Device fingerprint changing (network change)
- **Solution**: Send consistent `x-device-uuid` header

### "Document is being modified" (409)

- **Cause**: Concurrent updates from multiple devices
- **Solution**: Implement exponential backoff retry with version checking

### High queue backlog

- **Cause**: Slow operations blocking device queue
- **Solution**: Optimize database queries, increase `maxConcurrentPerDevice`

### Memory leaks

- **Cause**: Too many tracked devices/locks without cleanup
- **Solution**: Reduce `cleanupInterval` or increase available memory

---

## Files Modified/Created

- ✅ `src/utils/deviceFingerprint.js` - Device fingerprinting
- ✅ `src/middlewares/rateLimitMiddleware.js` - Rate limiting
- ✅ `src/services/requestQueue.js` - Request queueing
- ✅ `src/services/raceConditionHandler.js` - Race condition handling
- ✅ `src/routes/adminSystemRoutes.js` - Admin endpoints
- ✅ `src/index.js` - Middleware integration
- ✅ `src/helper/populateHelper.js` - Queue + lock integration
