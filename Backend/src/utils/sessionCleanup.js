import models from '../models/Collection.js';

const Session = models.sessions;

export const cleanupStaleSessions = async () => {
  try {
    const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const result = await Session.updateMany(
      {
        status: 'Active',
        lastUsedAt: { $lt: staleThreshold }
      },
      {
        status: 'DeActive',
        lastUsedAt: new Date()
      }
    );

    if (result.modifiedCount > 0) {
      // console.log(`Auto-deactivated ${result.modifiedCount} stale sessions`);
    }

    return result;
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
};

export const deactivateUserSessions = async (userId, excludeSessionId = null) => {
  try {
    const filter = { userId, status: 'Active' };
    if (excludeSessionId) {
      filter._id = { $ne: excludeSessionId };
    }

    const result = await Session.updateMany(filter, {
      status: 'DeActive',
      lastUsedAt: new Date()
    });

    return result;
  } catch (error) {
    console.error('Error deactivating user sessions:', error);
    throw error;
  }
};