---
name: FCM Job Queue Integration
description: Instructions and standards for managing asynchronous FCM Push Notifications via the JobQueue system.
---

# FCM Job Queue Integration Skill

## Overview
This skill provides instructions for handling Firebase Cloud Messaging (FCM) operations asynchronously using the local `JobQueue` implementation instead of synchronous fire-and-forget dispatches.

## Why Use JobQueue for FCM?
- Prevents API endpoints from hanging or failing due to upstream FCM latencies.
- Implements robust retry mechanisms for transient network issues.
- Ensures the `NotificationReceptionist` trackers accurately reflect the push status (`pending`, `sent`, `failed`).

## Standards
1. **Never use synchronous FCM multicast**: Always wrap `admin.messaging().sendEachForMulticast()` inside a job handler to be queued.
2. **Dedicated Queue Instance**: Use the `fcmQueue` configured in `fcmService.js` (Concurrency: 5, Batch Size: 100, Retries: 3).
3. **Error Propagation**: Any error encountered during `sendMulticast` must be explicitly thrown (re-thrown) so that the `JobQueue` can catch it and schedule a retry.
4. **Data Isolation**: Pass only the necessary serializable object structures (like `contentDoc`, `receptionistDocs`, `tokens`) to the job payload, avoiding complex objects where possible.

## Execution Example
```javascript
// Add push request to the Job Queue
fcmQueue.add({
  handler: async (data) => {
    // This will execute asynchronously and retry upon failure
    await this.sendMulticast(data.contentDoc, data.receptionistDocs, data.tokens);
  },
  data: {
    contentDoc,
    receptionistDocs,
    tokens
  }
});
```

When addressing any FCM or notification delivery bug in the future, first check the queue status and ensure jobs are not failing and exhausting their retries.
