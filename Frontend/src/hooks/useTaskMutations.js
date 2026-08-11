import { useCallback } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useNotification } from '../context/notificationProvider';
import { nanoid } from 'nanoid';
// We assume we have some API utility, otherwise we will use axios or a local proxy
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
});

export const useTaskMutations = () => {
  const store = useTaskStore();
  const { notifyError, notifySuccess } = useNotification();

  const updateTaskOptimistic = useCallback(async (taskId, updates) => {
    const originalTask = store.tasks.find(t => t._id === taskId);
    
    // Optimistic update
    const mutationId = nanoid();
    store.queueMutation(mutationId, taskId, updates, 'updateTask');

    try {
      // In the real system, Populate Engine uses patch request
      const response = await api.patch(`/populate/Tasks/${taskId}`, updates);
      
      store.removeMutation(mutationId);
      store.updateTask(taskId, response.data);
      // Optional: notifySuccess('Task updated');
      return response.data;
    } catch (error) {
      store.revertMutation(mutationId, originalTask);
      notifyError(`Failed to update: ${error.message || 'Unknown error'}`);
      throw error;
    }
  }, [store, notifyError, notifySuccess]);

  return { updateTaskOptimistic };
};
