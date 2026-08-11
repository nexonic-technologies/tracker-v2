# Cross Module Map: Feed

## Outbound References (Mongoose Schema relations)
| Target Collection | Source Collection | Reference Field | Purpose |
|---|---|---|---|
| **employees** | `feed_posts` | `author` | Creator of the post |
| **employees** | `feed_posts` | `mentions` | Tagged users notified |
| **employees** | `feed_posts` | `pinnedBy` | List of employees who pinned the post |
| **employees** | `feed_posts` | `bookmarkedBy` | List of employees who bookmarked the post |
| **employees** | `feed_posts` | `followers` | Users watching for comment notifications |
| **employees** | `feed_posts` | `reactions.employee` | User who reacted to the post |
| **employees** | `feed_posts` | `viewedBy.employee` | User who viewed the post |
| **employees** | `feed_comments` | `author` | Creator of the comment |
| **employees** | `feed_comments` | `mentions` | Tagged users in comments |
| **employees** | `feed_comments` | `reactions.employee` | User who reacted to the comment |
| **employees** | `feed_comments` | `replies.author` | Creator of nested comment reply |
| **employees** | `feed_comments` | `replies.mentions` | Tagged users in reply |
| **employees** | `feed_groups` | `members.employee` | Enrolled member of the group |
| **employees** | `feed_groups` | `createdBy` | Owner of the group |
| **employees** | `feed_channels` | `members.employee` | Enrolled member of the channel |
| **employees** | `feed_channels` | `createdBy` | Owner of the channel |
| **feed_groups** | `feed_posts` | `group` | Scope visibility filter |
| **feed_groups** | `feed_channels` | `groups` | Subscribed groups in channel |
| **feed_channels** | `feed_posts` | `channel` | Scope visibility filter |
| **feed_posts** | `feed_comments` | `postId` | Parent post connection |
