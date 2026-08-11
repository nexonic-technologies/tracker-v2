# FCM Notification Architecture (Core)

## Overview
The platform handles notifications using a dual-collection model and a dedicated Firebase Cloud Messaging (FCM) service backed by a local job queue. 

## Models
1. **NotificationContent (`notifications`)**: Stores the actual notification payload (title, message, type, meta). Created once per event.
2. **NotificationReceptionist (`notification_receptionists`)**: Stores user-specific delivery status. Maps 1-to-many from `notifications` to `employees`. Tracks `isRead`, `isClicked`, `fcmStatus` (pending/sent/failed), and `fcmErrorReason`.

## Services & Middlewares
- **`fcmService.js`**: Core service that handles FCM push notifications. It now utilizes a background `JobQueue` (via `jobQueue.js`) to asynchronously execute `admin.messaging().sendEachForMulticast()`. This ensures the API response is not blocked, network errors are retried securely, and the `NotificationReceptionist` trackers are accurately updated.
- **`notificationMessagePrasher.js`**: Centralized string generator. Evaluates the model context (`type`, `groupName`, `channelName`) and builds the standardized push notification message (e.g., "John posted in a group").
- **`jobQueue.js`**: Simple in-memory queue used by `fcmService.js` for handling concurrent pushes, retry delay mechanisms (5000ms), and batch processing (concurrency: 5) of multicast messages.

## Data Flow (Post/Reaction Example)
1. User creates a FeedPost (`feed_posts`).
2. `feed_posts.js` hook (`afterCreate`) processes mentions, groups, and channels.
3. Hook calls `fcmService.dispatchNotification()`.
4. Service creates `NotificationContent`.
5. Service finds active `sessions` with an `fcmToken` for target users.
6. Service creates `NotificationReceptionist` trackers (`fcmStatus: 'pending'`).
7. Service adds the push job to `fcmQueue` (`JobQueue`).
8. The background queue processes the job, sends Push via FCM, and updates trackers as `sent` or `failed` (including automatic retries for failures).

## Session Integration
- The `Session` model contains an `fcmToken`.
- The token is retrieved client-side via `utils/firebase.js` using the Firebase VAPID key.
- Submitted to the backend via `POST /api/auth/store-push-token`.
