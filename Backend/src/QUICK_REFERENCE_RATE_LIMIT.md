# Rate Limiting & Queueing - Quick Reference

## Essential Concepts

| Component | Purpose | Default |
|-----------|---------|---------|
| **Device Fingerprint** | Unique device identifier | Auto-generated or via `x-device-uuid` |
| **Rate Limiting** | Prevent request abuse | 10/sec, 300/min, 3600/hr |
| **Request Queue** | Serialize concurrent requests | 2 concurrent, 100 max queue |
| **Race Condition Handler** | Prevent concurrent updates | 30s lock timeout, 3 retries |

---

## Client Headers

```http
x-device-uuid: unique-device-identifier
x-source: mobile|web|flutter
```

## Response Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue |
| 201 | Created | Continue |
| 429 | Rate limited | Wait & retry |
| 409 | Conflict (race condition) | Refetch & retry |
| 503 | Queue full | Exponential backoff |

## Rate Limit Headers

```http
RateLimit-Remaining-Second: 7
RateLimit-Remaining-Minute: 289
RateLimit-Reset-Second: 1234567890
Retry-After: 1
```

---

## Common API Calls

### List Tasks (Read - No Rate Limit)
```bash
curl https://api.loigmax.com/api/populate/read/tasks \
  -H "Authorization: Bearer TOKEN" \
  -H "x-device-uuid: device-123"
```

### Update Task (Mutation - Rate Limited + Lock)
```bash
curl -X PUT https://api.loigmax.com/api/populate/update/tasks/id \
  -H "Authorization: Bearer TOKEN" \
  -H "x-device-uuid: device-123" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated"}'
```

### Bulk Upsert (Sequential with Race Handling)
```bash
curl -X POST https://api.loigmax.com/api/populate/bulk-upsert/employees \
  -H "Authorization: Bearer TOKEN" \
  -H "x-device-uuid: device-123" \
  -H "Content-Type: application/json" \
  -d '[
    {"filter": {"id": "1"}, "body": {"status": "active"}},
    {"filter": {"id": "2"}, "body": {"status": "inactive"}}
  ]'
```

---

## Admin Endpoints

### Get System Health
```bash
GET /api/admin/system/health
```

### View Rate Limit Status
```bash
GET /api/admin/rate-limit/status/device_abc123
```

### Reset Rate Limit
```bash
POST /api/admin/rate-limit/reset/device_abc123
```

### View Queue Stats
```bash
GET /api/admin/queue/stats
```

### Clear Device Queue
```bash
POST /api/admin/queue/clear/device_abc123
```

### View All Locks
```bash
GET /api/admin/locks/all
```

### Force Release Lock
```bash
POST /api/admin/locks/force-release/docId
```

---

## Configuration Reference

### Environment Variables
```env
# Rate Limiting
RATE_LIMIT_PER_SECOND=10
RATE_LIMIT_PER_MINUTE=300
RATE_LIMIT_PER_HOUR=3600
RATE_LIMIT_BURST=1.5

# Queue
QUEUE_MAX_CONCURRENT=2
QUEUE_MAX_SIZE=100
QUEUE_TIMEOUT=30000

# Locks
LOCK_TIMEOUT=30000
LOCK_MAX_RETRIES=3
LOCK_RETRY_DELAY=100
```

### Runtime Configuration
```javascript
// Update via admin API
PUT /api/admin/rate-limit/config
{
  "requestsPerSecond": 10,
  "requestsPerMinute": 300,
  "requestsPerHour": 3600,
  "burstAllowance": 1.5,
  "routeOverrides": {
    "auth/login": { "requestsPerSecond": 2 }
  }
}

PUT /api/admin/queue/config
{
  "maxConcurrentPerDevice": 2,
  "maxQueueSize": 100,
  "requestTimeout": 30000
}

PUT /api/admin/locks/config
{
  "lockTimeout": 30000,
  "maxRetries": 3,
  "retryDelay": 100
}
```

---

## Error Handling Patterns

### JavaScript/TypeScript
```javascript
// Retry with exponential backoff
async function requestWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(r => setTimeout(r, delay));
      } else if (error.response?.status === 409) {
        // Conflict - refetch and retry
        continue;
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Flutter/Dart
```dart
Future<Response> requestWithRetry(String url, 
    {int maxRetries = 3}) async {
  for (int i = 0; i < maxRetries; i++) {
    try {
      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'x-device-uuid': deviceUuid,
        },
      );

      if (response.statusCode == 429) {
        int retryAfter = 
            int.parse(response.headers['retry-after'] ?? '1');
        await Future.delayed(
            Duration(seconds: retryAfter));
        continue;
      } else if (response.statusCode == 409) {
        // Handle conflict
        await Future.delayed(
            Duration(milliseconds: 100 * (i + 1)));
        continue;
      }

      return response;
    } catch (e) {
      rethrow;
    }
  }
  throw Exception('Max retries exceeded');
}
```

### React Native
```javascript
import * as SecureStore from 'expo-secure-store';

async function initializeDeviceUUID() {
  let deviceUuid = await SecureStore.getItemAsync('deviceUuid');
  if (!deviceUuid) {
    deviceUuid = generateUUID();
    await SecureStore.setItemAsync('deviceUuid', deviceUuid);
  }
  return deviceUuid;
}

async function apiCall(endpoint, options = {}) {
  const deviceUuid = await initializeDeviceUUID();
  
  return fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'x-device-uuid': deviceUuid,
      'x-source': 'react-native'
    }
  });
}
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

```javascript
// Every 5 minutes, fetch system health
setInterval(async () => {
  const health = await fetch('/api/admin/system/health', {
    headers: { 'Authorization': 'Bearer ADMIN_TOKEN' }
  }).then(r => r.json());

  // Alert if any threshold exceeded
  if (health.data.rateLimit.blockedDevices > 10) {
    sendAlert('HIGH_BLOCKED_DEVICES', health.data);
  }
  if (health.data.queue.currentlyProcessing > 500) {
    sendAlert('HIGH_QUEUE_LOAD', health.data);
  }
  if (health.data.locks.activeLocks > 1000) {
    sendAlert('HIGH_LOCK_CONTENTION', health.data);
  }
}, 5 * 60 * 1000);
```

### Log Analysis

Look for patterns in:
- Devices with high violation counts
- Routes with frequent 429 responses
- Queues with long wait times
- Documents with many concurrent locks

---

## FAQ

**Q: Why is my device getting rate limited?**
A: Most requests from one device exceeded limits. Ensure you're sending consistent `x-device-uuid` header.

**Q: Can I bypass rate limiting?**
A: Only admin-whitelisted devices. Contact system administrator.

**Q: How long does blocking last?**
A: Exponential backoff: 1s → 2s → 4s → ... → max 1 hour. Each successful request decrements.

**Q: Does rate limiting apply to WebSockets?**
A: No, only REST API endpoints.

**Q: Can I update `__v` manually?**
A: No, the system manages it automatically.

**Q: What if lock expires during my operation?**
A: Lock auto-renews on each request. Timeout is 30 seconds of inactivity.

**Q: How to bulk update without queuing?**
A: Send updates separately or contact admin to adjust config.

---

## Implementation Checklist

- [ ] Client sends `x-device-uuid` header
- [ ] Client handles 429 with exponential backoff
- [ ] Client handles 409 with refetch & retry
- [ ] Monitoring dashboard pulls `/api/admin/system/health`
- [ ] Alert rules configured for high violation counts
- [ ] Admin documented on rate limit policy
- [ ] Documentation shared with mobile team

