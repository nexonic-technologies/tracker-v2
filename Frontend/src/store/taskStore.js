import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const useTaskStore = create(
  devtools(
    persist(
      (set, get) => ({
        // State
        tasks: [],
        selectedTaskId: null,
        pendingMutations: [], // Queue of unsent updates
        syncStatus: 'idle', // idle, syncing, error

        // Actions
        setTasks: (tasks) => set({ tasks }),
        
        addTask: (task) => set((state) => ({
          tasks: [...state.tasks, task]
        })),

        updateTask: (taskId, updates) => set((state) => ({
          tasks: state.tasks.map(t =>
            t._id === taskId ? { ...t, ...updates } : t
          )
        })),

        deleteTask: (taskId) => set((state) => ({
          tasks: state.tasks.filter(t => t._id !== taskId)
        })),

        // Optimistic mutations queue
        queueMutation: (mutationId, taskId, updates, apiAction) => set((state) => ({
          pendingMutations: [
            ...state.pendingMutations,
            { id: mutationId, taskId, updates, apiAction, timestamp: Date.now() }
          ],
          tasks: state.tasks.map(t =>
            t._id === taskId ? { ...t, ...updates } : t
          )
        })),

        removeMutation: (mutationId) => set((state) => ({
          pendingMutations: state.pendingMutations.filter(m => m.id !== mutationId)
        })),

        // Handle sync failures
        revertMutation: (mutationId, originalTask) => set((state) => ({
          pendingMutations: state.pendingMutations.filter(m => m.id !== mutationId),
          tasks: state.tasks.map(t =>
            t._id === originalTask._id ? originalTask : t
          )
        })),

        setSyncStatus: (status) => set({ syncStatus: status })
      }),
      {
        name: 'task-store',
        partialize: (state) => ({
          tasks: state.tasks,
          selectedTaskId: state.selectedTaskId
          // Don't persist pendingMutations or syncStatus for now to avoid cross-session issues
        })
      }
    )
  )
);

export default useTaskStore;
