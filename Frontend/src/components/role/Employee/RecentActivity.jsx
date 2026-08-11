import { useState, useEffect } from 'react';
import { Clock, User, FileText, Calendar, CheckSquare, ArrowRight } from 'lucide-react';
import axiosInstance from '../../../api/axiosInstance';
import { useAuth } from '../../../context/authProvider';
import ProfileImage from '../../Common/ProfileImage';

const RecentActivity = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const fetchRecentActivities = async () => {
    try {
      setLoading(true);
      
      const [employeesRes, tasksRes, leavesRes, attendancesRes] = await Promise.all([
        axiosInstance.get('/populate/read/employees?limit=2&sort={"createdAt":-1}'),
        axiosInstance.get('/populate/read/tasks?limit=2&sort={"createdAt":-1}'),
        axiosInstance.get('/populate/read/leaves?limit=1&sort={"createdAt":-1}'),
        axiosInstance.get('/populate/read/attendances?limit=2&sort={"createdAt":-1}')
      ]);

      const recentActivities = [
        ...(employeesRes.data?.data || []).map(emp => ({
          id: emp._id,
          type: 'employee',
          title: 'New Employee Joined',
          description: `${emp.basicInfo?.firstName} ${emp.basicInfo?.lastName}`,
          time: emp.createdAt,
          icon: User,
          avatar: emp.basicInfo?.profileImage,
          firstName: emp.basicInfo?.firstName,
          lastName: emp.basicInfo?.lastName
        })),
        ...(tasksRes.data?.data || []).map(task => ({
          id: task._id,
          type: 'task',
          title: 'New Task Created',
          description: task.title,
          time: task.createdAt,
          icon: CheckSquare
        })),
        ...(leavesRes.data?.data || []).map(leave => ({
          id: leave._id,
          type: 'leave',
          title: 'Leave Request',
          description: `${leave.employee?.basicInfo?.firstName || 'Employee'} requested leave`,
          time: leave.createdAt,
          icon: Calendar
        })),
        ...(attendancesRes.data?.data || []).map(att => ({
          id: att._id,
          type: 'attendance',
          title: 'Attendance Update',
          description: `${att.employee?.basicInfo?.firstName || 'Employee'} - ${att.status}`,
          time: att.createdAt,
          icon: Clock
        }))
      ];

      const sortedActivities = recentActivities
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 5);

      setActivities(sortedActivities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getTypeClasses = (type) => {
    const colors = {
      employee: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400 ring-green-100/50 dark:ring-green-950/20',
      task: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 ring-blue-100/50 dark:ring-blue-950/20',
      leave: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 ring-amber-100/50 dark:ring-amber-950/20',
      attendance: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 ring-purple-100/50 dark:ring-purple-950/20'
    };
    return colors[type] || 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-450 ring-gray-100 dark:ring-gray-950';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 h-96 flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
        <div className="space-y-5 flex-1 relative pl-6">
          <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-zinc-800" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center space-x-4 relative">
              <div className="w-5 h-5 bg-gray-250 dark:bg-zinc-700 rounded-full z-10 ring-4 ring-white dark:ring-zinc-900" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-250 dark:bg-zinc-700 rounded w-2/3" />
                <div className="h-3 bg-gray-200 dark:bg-zinc-800/80 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl h-96 flex flex-col relative overflow-hidden shadow-sm">
      <div className="p-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Recent Activity</h3>
        </div>
      </div>
      
      {/* Scrollable list container */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 relative scrollbar-thin">
        {/* Timeline connector line */}
        {activities.length > 0 && (
          <div className="absolute left-[31px] top-4 bottom-4 w-[2px] bg-gray-100 dark:bg-zinc-800/80 pointer-events-none z-0" />
        )}

        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <Clock className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No recent activity found</p>
          </div>
        ) : (
          <div className="space-y-4 relative z-10">
            {activities.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <div 
                  key={activity.id} 
                  className="group flex items-start space-x-3 p-2.5 rounded-xl hover:bg-gray-50/80 dark:hover:bg-zinc-850/30 transition-all duration-300"
                >
                  {/* Icon with colored bg, dynamic ring accent on hover */}
                  <div className={`p-2 rounded-full ${getTypeClasses(activity.type)} ring-4 ring-white dark:ring-zinc-900 group-hover:scale-110 transition-transform duration-300 flex-shrink-0 z-10 relative`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-450 transition-colors truncate">
                        {activity.title}
                      </p>
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {formatTime(activity.time)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      {activity.avatar && (
                        <ProfileImage
                          profileImage={activity.avatar}
                          firstName={activity.firstName}
                          lastName={activity.lastName}
                          size="xs"
                        />
                      )}
                      <p className="text-xs text-gray-605 dark:text-gray-400 truncate">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Smooth fade-out overlay above the footer button */}
      {activities.length > 0 && (
        <div className="absolute bottom-[57px] left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent dark:from-zinc-900 to-transparent pointer-events-none z-20" />
      )}
      
      {activities.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-150 dark:border-zinc-800 flex-shrink-0 bg-white dark:bg-zinc-900 z-30">
          <button className="group flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors">
            View all activity
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;