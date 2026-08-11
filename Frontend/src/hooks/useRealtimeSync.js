import { useEffect, useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import { socketService } from '../services/socketService';
import { useAuth } from '../context/authProvider';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
});

export const useRealtimeSync = () => {
  const store = useTaskStore();
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // We assume token might be handled by cookies (withCredentials), or passed here if needed.
    const token = localStorage.getItem('token') || '';
    
    socketService.connect(user.id || user._id, token);

    // Listen for task updates
    const unsubUpdate = socketService.on('task:updated', (payload) => {
      const { taskId, updates } = payload;
      store.updateTask(taskId, updates);
    });

    const unsubCreate = socketService.on('task:created', (task) => {
      store.addTask(task);
    });

    const unsubConnect = socketService.on('socket:connected', () => {
      setIsConnected(true);
      syncPendingMutations();
    });

    const unsubDisconnect = socketService.on('socket:disconnected', () => {
      setIsConnected(false);
    });

    return () => {
      unsubUpdate();
      unsubCreate();
      unsubConnect();
      unsubDisconnect();
      socketService.disconnect();
    };
  }, [user]);

  const syncPendingMutations = async () => {
    const { pendingMutations, removeMutation } = useTaskStore.getState();
    const mutations = [...pendingMutations];

    for (const mutation of mutations) {
      try {
        if (mutation.apiAction === 'updateTask') {
          await api.patch(`/populate/Tasks/${mutation.taskId}`, mutation.updates);
        }
        removeMutation(mutation.id);
      } catch (error) {
        console.error('Failed to sync mutation:', error);
        // Leave in queue for retry
      }
    }
  };

  return { isConnected };
};
