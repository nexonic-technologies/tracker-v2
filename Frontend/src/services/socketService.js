import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }

  connect(userId, token) {
    if (this.socket?.connected) return;

    const isDev = import.meta.env.DEV;
    const socketUrl = isDev ? window.location.origin : (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || '/');

    this.socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: this.maxReconnectAttempts,
      autoConnect: true,
      transports: ['websocket', 'polling'] // Fallback to polling
    });

    this.setupListeners(userId);
  }

  setupListeners(userId) {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected', this.socket.id);
      this.reconnectAttempts = 0;
      this.emit('socket:connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.emit('socket:disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('socket:error', error);
    });

    // Task events from server
    this.socket.on('task:updated', (payload) => {
      this.emit('task:updated', payload);
    });

    this.socket.on('task:created', (payload) => {
      this.emit('task:created', payload);
    });

    this.socket.on('task:deleted', (taskId) => {
      this.emit('task:deleted', taskId);
    });

    this.socket.on('comment:added', (payload) => {
      this.emit('comment:added', payload);
    });

    this.socket.on('activity:logged', (payload) => {
      this.emit('activity:logged', payload);
    });

    // Subscribe to user's tasks
    this.socket.emit('subscribe:tasks', { userId });
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
