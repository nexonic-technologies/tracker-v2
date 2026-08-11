# Method & Model Index: Feed

## Models (Alphabetical)
| Model | Mongoose Name | Source File |
|---|---|---|
| **FeedChannel** | `feed_channels` | `FeedChannel.js` |
| **FeedComment** | `feed_comments` | `FeedComment.js` |
| **FeedGroup** | `feed_groups` | `FeedGroup.js` |
| **FeedPost** | `feed_posts` | `FeedPost.js` |

## Service Hooks & Helper Functions
| Function Name | File | Description |
|---|---|---|
| **beforeCreate** | `services/feed_posts.js` | Author mapping and defaults initialization |
| **afterCreate** | `services/feed_posts.js` | Notification broadcaster (Mentions & Groups/Channels) |
| **afterUpdate** | `services/feed_posts.js` | Reaction alert triggers |
| **beforeRead** | `services/feed_posts.js` | Security/visibility scopes filter |
| **beforeUpdate** | `services/feed_posts.js` | Blocks client-side modifications on stats |
| **afterCreate** | `services/feed_comments.js` | Increments comment count & notifies author/followers |
| **afterDelete** | `services/feed_comments.js` | Decrements comment count on post |
