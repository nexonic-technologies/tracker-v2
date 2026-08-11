import { useState, useEffect, useCallback, useMemo } from 'react';
import { TaskService } from '@services';
import toast from 'react-hot-toast';

/**
 * Custom domain hook for Task Management.
 * Follows 4-tier model: Page -> Hook -> Service -> API -> Axios
 */
export function useTasks(initialOptions = {}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('kanban'); // 'kanban' | 'list' | 'gantt' | 'employeeGantt' | 'sprint'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const fetchTasks = useCallback(async (options = initialOptions) => {
    setLoading(true);
    setError(null);
    try {
      const data = await TaskService.getTasks(options);
      setTasks(data?.data || data || []);
    } catch (err) {
      console.error('useTasks fetch error:', err);
      setError(err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [initialOptions]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateTaskStatus = useCallback(async (taskId, newStatus) => {
    try {
      // Optimistic state update
      setTasks((prev) =>
        prev.map((task) => (task._id === taskId ? { ...task, status: newStatus } : task))
      );
      await TaskService.updateTask(taskId, { status: newStatus });
      toast.success(`Task moved to ${newStatus}`);
    } catch (err) {
      console.error('useTasks status update error:', err);
      toast.error('Failed to update task status');
      fetchTasks(); // Revert on failure
    }
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = searchQuery
        ? (task.title || '').toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesStatus = selectedStatus !== 'all' ? task.status === selectedStatus : true;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, selectedStatus]);

  return {
    tasks: filteredTasks,
    allTasks: tasks,
    loading,
    error,
    activeView,
    setActiveView,
    searchQuery,
    setSearchQuery,
    selectedStatus,
    setSelectedStatus,
    fetchTasks,
    updateTaskStatus,
  };
}
