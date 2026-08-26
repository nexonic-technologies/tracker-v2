/**
 * Dashboard Engine — Quick Action Widget (§2.1 Registry Widget #9)
 *
 * Configurable action-centric buttons:
 * - Check In / Check Out (Direct attendance punch execution with live feedback)
 * - Create Task (Route to /tasks/form)
 * - Create Ticket (Route to /tickets/form)
 * - Custom actions configured in Dashboard Builder
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerWidget } from '../registry/widgetRegistry';
import { WIDGET_CATEGORIES } from '../registry/widgetManifest';
import { useAuth } from '../../../context/authProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import axiosInstance from '../../../api/axiosInstance';
import toast from 'react-hot-toast';
import {
  Plus, Calendar, Users, Clock,
  FileText, Briefcase, CheckSquare, ClipboardList,
  LogIn, LogOut, Ticket, CheckCircle2, Loader2,
  Sparkles, ArrowRight
} from 'lucide-react';

const ICON_MAP = {
  Plus, Calendar, Users, Clock,
  FileText, Briefcase, CheckSquare, ClipboardList,
  LogIn, LogOut, Ticket, CheckCircle2, Sparkles
};

// All available standard action definitions
const ALL_ACTIONS = [
  { id: 'punch', type: 'punch', label: 'Check In / Out', icon: 'LogIn', module: 'attendance' },
  { id: 'view_attendance', type: 'route', label: 'Attendance', icon: 'Clock', to: '/attendance', module: 'attendance' },
  { id: 'create_task', type: 'route', label: 'Create Task', icon: 'CheckSquare', to: '/tasks/form', module: 'tasks' },
  { id: 'my_tasks', type: 'route', label: 'My Tasks', icon: 'CheckSquare', to: '/tasks/my-tasks', module: 'tasks' },
  { id: 'create_ticket', type: 'route', label: 'Create Ticket', icon: 'Ticket', to: '/tickets/form', module: 'tickets' },
  { id: 'my_tickets', type: 'route', label: 'My Tickets', icon: 'Ticket', to: '/tickets/my-tickets', module: 'tickets' },
];

function QuickActionWidget({ config, data }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermissions();
  const userId = user?.id || user?._id;

  const canPunchIn = can('create', 'attendances');
  const canPunchOut = can('update', 'attendances');

  const [punchLoading, setPunchLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const { preset = 'all', enabledActionIds } = config;

  // Filter actions by preset or explicit selection
  let actionList = [];
  if (config.actions && config.actions.length > 0) {
    actionList = config.actions;
  } else if (Array.isArray(enabledActionIds) && enabledActionIds.length > 0) {
    actionList = ALL_ACTIONS.filter(a => enabledActionIds.includes(a.id));
  } else if (preset === 'attendance_only') {
    actionList = ALL_ACTIONS.filter(a => a.module === 'attendance');
  } else if (preset === 'tasks_tickets') {
    actionList = ALL_ACTIONS.filter(a => a.module === 'tasks' || a.module === 'tickets');
  } else if (preset === 'tasks_only') {
    actionList = ALL_ACTIONS.filter(a => a.module === 'tasks');
  } else if (preset === 'tickets_only') {
    actionList = ALL_ACTIONS.filter(a => a.module === 'tickets');
  } else {
    // Default 4 actions
    actionList = [
      ALL_ACTIONS[0], // Punch
      ALL_ACTIONS[2], // Create Task
      ALL_ACTIONS[4], // Create Ticket
      ALL_ACTIONS[1], // View Attendance
    ];
  }

  // Execute direct attendance punch
  const handlePunch = async () => {
    if (!userId) {
      toast.error('Authentication required');
      return;
    }
    if (isCheckedIn && !canPunchOut) {
      toast.error('Check-out managed by Admin');
      return;
    }
    if (!isCheckedIn && !canPunchIn) {
      toast.error('Check-in managed by Admin');
      return;
    }
    setPunchLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // 1. Fetch today's existing attendance record
      const readRes = await axiosInstance.post('/populate/read/attendances', {
        filter: { employee: userId, date: today },
        limit: 1
      });
      const existing = readRes.data?.data?.[0];

      if (existing) {
        // Standard Update
        const isCurrentlyIn = Boolean(existing.checkIn && (!existing.checkOut || (existing.punches?.length > 0 && !existing.punches[existing.punches.length - 1].checkOut)));
        const updatePayload = isCurrentlyIn ? { checkOut: now } : { checkIn: now };

        const res = await axiosInstance.put(`/populate/update/attendances/${existing._id}`, updatePayload);
        if (res.data?.success || res.data?.data) {
          setIsCheckedIn(!isCurrentlyIn);
          toast.success(isCurrentlyIn ? 'Checked Out successfully' : 'Checked In successfully! Have a great day.');
        }
      } else {
        // Standard Create
        const res = await axiosInstance.post('/populate/create/attendances', {
          employee: userId,
          date: today,
          checkIn: now
        });
        if (res.data?.success || res.data?.data) {
          setIsCheckedIn(true);
          toast.success('Checked In successfully! Have a great day.');
        }
      }
    } catch (err) {
      navigate('/attendance');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleActionClick = (act) => {
    if (act.type === 'punch' || act.id === 'punch') {
      handlePunch();
    } else if (act.to) {
      navigate(act.to);
    }
  };

  return (
    <div className={`grid ${actionList.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-2'} gap-2.5 h-full items-center`}>
      {actionList.map((act, idx) => {
        const isPunch = act.type === 'punch' || act.id === 'punch';
        const canPunch = isCheckedIn ? canPunchOut : canPunchIn;
        const isActionDisabled = isPunch ? (punchLoading || !canPunch) : false;
        const IconComponent = act.icon ? (typeof act.icon === 'string' ? ICON_MAP[act.icon] : act.icon) : Plus;

        return (
          <button
            key={act.id || idx}
            onClick={() => handleActionClick(act)}
            disabled={isActionDisabled}
            title={isPunch && !canPunch ? (isCheckedIn ? 'Check-out managed by Admin' : 'Check-in managed by Admin') : undefined}
            type="button"
            className={`group relative flex items-center gap-3 p-3 rounded-[var(--tracker-radius-md)] bg-[var(--tracker-surface-1)] hover:bg-[var(--tracker-surface-2)] border border-[var(--tracker-border)] hover:border-[var(--brand-solid)] transition-all duration-200 text-left text-xs font-semibold text-[var(--tracker-ink)] shadow-xs hover:shadow-sm ${
              isActionDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div className="p-2 rounded-xl bg-[var(--tracker-surface)] text-[var(--brand-solid)] group-hover:bg-[var(--brand-solid)] group-hover:text-white transition-colors duration-200 flex-shrink-0">
              {isPunch && punchLoading ? (
                <Loader2 size={15} className="animate-spin text-[var(--brand-solid)]" />
              ) : (
                <IconComponent size={15} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block truncate font-medium">
                {isPunch && !canPunch
                  ? (isCheckedIn ? 'Check Out (Admin)' : 'Check In (Admin)')
                  : (act.label || 'Action')}
              </span>
              <span className="block text-[10px] text-[var(--tracker-ink-subtle)] font-normal truncate">
                {isPunch ? (isPunch && !canPunch ? 'Managed by Admin' : 'Quick Punch') : 'Direct Action'}
              </span>
            </div>
            <ArrowRight size={12} className="text-[var(--tracker-ink-subtle)] opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
          </button>
        );
      })}
    </div>
  );
}

const manifest = {
  id: 'quickActions',
  name: 'Multi-Action Matrix',
  icon: 'Zap',
  category: WIDGET_CATEGORIES.ACTIONS,
  configurable: true,
  supportedDataTypes: ['array'],
  sizeConstraints: { minW: 3, maxW: 12, minH: 2, maxH: 4, defaultW: 6, defaultH: 2 },
  configSchema: [
    { type: 'textbox', name: 'title', label: 'Title' },
    { type: 'select', name: 'preset', label: 'Module Action Preset', options: [
      { value: 'all', label: 'All Modules (Standard 4 Actions)' },
      { value: 'attendance_only', label: 'Attendance Only (Punch & Log)' },
      { value: 'tasks_tickets', label: 'Tasks & Tickets Suite' },
      { value: 'tasks_only', label: 'Task Management Only' },
      { value: 'tickets_only', label: 'HelpDesk Tickets Only' },
    ]},
    { type: 'actionsSelector', name: 'enabledActionIds', label: 'Select Specific Actions', options: [
      { value: 'punch', label: 'Check In / Out (Attendance)' },
      { value: 'view_attendance', label: 'View Attendance Logs' },
      { value: 'create_task', label: 'Create New Task' },
      { value: 'my_tasks', label: 'My Tasks List' },
      { value: 'create_ticket', label: 'Create Support Ticket' },
      { value: 'my_tickets', label: 'My Ticket Queue' },
    ]},
  ],
  defaultConfig: {
    title: 'Quick Actions',
    preset: 'all',
  },
};

registerWidget('quickActions', QuickActionWidget, manifest);
export default QuickActionWidget;
