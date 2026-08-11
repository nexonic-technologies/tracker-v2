// src/utils/ProviderRegistry.js

class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  /**
   * Registers a messaging channel provider adapter.
   * @param {string} name - e.g. 'socket', 'fcm', 'expo', 'email'
   * @param {object} provider - Object implementing { send({ recipientId, token, title, body, data, notificationId }) }
   */
  register(name, provider) {
    this.providers.set(name, provider);
  }

  /**
   * Retrieves a registered messaging channel provider.
   * @param {string} name 
   * @returns {object|undefined}
   */
  get(name) {
    return this.providers.get(name);
  }
}

const registry = new ProviderRegistry();

// ─── Register Default Providers ──────────────────────────────────────────────

// 1. SOCKET.IO PROVIDER (Real-time in-app alerts)
registry.register('socket', {
  async send({ recipientId, title, body, data, notificationId }) {
    try {
      const { io } = await import('../index.js');
      if (!io) return false;

      const receiverStr = recipientId.toString();
      const socketsInRoom = await io.in(receiverStr).fetchSockets();

      if (socketsInRoom.length > 0) {
        io.to(receiverStr).emit("notification", {
          id: notificationId?.toString(),
          title,
          message: body,
          createdAt: new Date(),
          sender: data?.sender?.toString()
        });
        return true; // Sent successfully
      }
      return false; // User is offline
    } catch (err) {
      console.error('[ProviderRegistry] Socket send failed:', err.message);
      return false;
    }
  }
});

// 2. EXPO PUSH PROVIDER (Mobile Expo tokens)
registry.register('expo', {
  async send({ token, title, body, data }) {
    try {
      const { sendPush } = await import('../utils/pushSender.js');
      await sendPush({
        pushToken: token,
        title,
        body,
        data
      });
      return true;
    } catch (err) {
      console.error('[ProviderRegistry] Expo send failed:', err.message);
      throw err;
    }
  }
});

export default registry;
