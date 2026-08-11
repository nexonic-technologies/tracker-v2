export default function feed_commentsService() {
  return {
    async beforeCreate(ctx) {
      const { body, userId, role } = ctx;
      body.author = userId;
      body.authorModel = role === 'agent' ? 'agents' : 'employees';
    },

    // Ensure the author is set to the current user
    async afterCreate(ctx) {
      const { modelName, docId, userId } = ctx;
      try {
        const { default: models } = await import('../models/Collection.js');
        const { default: fcmService } = await import('./fcmService.js');
        const { generateNotification } = await import('../middlewares/notificationMessagePrasher.js');

        const commentDoc = await models.feed_comments.findById(docId)
          .populate('author', 'basicInfo.firstName basicInfo.lastName name');

        if (!commentDoc || !commentDoc.postId) return;

        // Increment commentsCount on the feed post
        const post = await models.feed_posts.findByIdAndUpdate(
          commentDoc.postId,
          { $inc: { commentsCount: 1 } },
          { new: true }
        );

        if (!post) return;

        const commenterName = commentDoc.authorModel === 'agents'
          ? (commentDoc.author?.name || 'Someone')
          : (`${commentDoc.author?.basicInfo?.firstName || ''} ${commentDoc.author?.basicInfo?.lastName || ''}`.trim() || 'Someone');

        const receivers = [];

        // Notify post author
        if (post.author.toString() !== userId.toString()) {
          receivers.push(post.author);
        }

        // Notify post followers
        if (post.followers && post.followers.length > 0) {
          receivers.push(...post.followers);
        }

        if (receivers.length > 0) {
          const commentMsg = generateNotification(commenterName, { type: 'comment' }, 'feed_comments');
          await fcmService.dispatchNotification({
            type: 'comment',
            title: 'New Comment',
            message: commentMsg,
            sender: userId,
            meta: { model: 'feed_posts', modelId: post._id },
            receiversArray: receivers
          });
        }

      } catch (error) {
        console.error('feed_comments afterCreate error:', error);
      }
    },

    async afterDelete(ctx) {
      const { doc, userId } = ctx;
      try {
        const { default: models } = await import('../models/Collection.js');

        if (doc && doc.postId) {
          await models.feed_posts.findByIdAndUpdate(
            doc.postId,
            { $inc: { commentsCount: -1 } }
          );
        }
      } catch (error) {
        console.error('feed_comments afterDelete error:', error);
      }
    }
  };
}
