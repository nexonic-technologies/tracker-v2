import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Home, Award, Briefcase, FileText,
  AlertCircle, ChevronRight, Check, X, ShieldAlert, Users, Zap
} from 'lucide-react';
import { useGenericAPI } from '@components/useGenericAPI';
import toast from 'react-hot-toast';

function getIcon(type) {
  switch (type) {
    case 'emergency_leave':
      return { Icon: ShieldAlert, color: 'text-red-500 bg-red-50 dark:bg-red-950/20' };
    case 'leave_request':
      return { Icon: Calendar, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20' };
    case 'regularization':
      return { Icon: Clock, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' };
    case 'wfh_request':
      return { Icon: Home, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' };
    case 'compoff_request':
      return { Icon: Award, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' };
    case 'critical_ticket_unassigned':
    case 'critical_ticket_assigned':
      return { Icon: AlertCircle, color: 'text-red-600 bg-red-100 dark:bg-red-950/30' };
    case 'overdue_task_gt2':
    case 'overdue_task_1':
      return { Icon: Briefcase, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/20' };
    default:
      return { Icon: FileText, color: 'text-gray-500 bg-gray-50 dark:bg-gray-950/20' };
  }
}

export default function V2ActionCenter({ items = [], layoutVariant = 'manager', refresh }) {
  const { update } = useGenericAPI();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);

  // Set appropriate section title & icon
  let sectionTitle = 'Action Center';
  let IconHeader = Zap;
  let iconBg = 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400';

  if (layoutVariant === 'executive') {
    sectionTitle = 'Escalations & Risks';
    IconHeader = AlertCircle;
    iconBg = 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400';
  }
  if (layoutVariant === 'md') {
    sectionTitle = 'Requires Your Attention';
    IconHeader = ShieldAlert;
    iconBg = 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400';
  }

  const handleApproveDeny = async (item, action) => {
    if (busyId) return;
    setBusyId(item.id);

    try {
      const statusValue = action === 'approve' ? 'Approved' : 'Rejected';
      await update(
        item.sourceModel,
        item.sourceId,
        {
          status: statusValue,
          approvedAt: new Date(),
          approvedBy: 'Current User'
        },
        action === 'approve' ? 'Request approved successfully!' : 'Request denied.'
      );
      if (refresh) refresh();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handleGenericAction = (item, action) => {
    if (action === 'view') {
      if (item.sourceModel === 'tasks') {
        navigate(`/tasks`);
      } else if (item.sourceModel === 'tickets') {
        navigate(`/tasks`); // Redirect to tasks area where tickets reside
      }
      return;
    }

    // Handles assignments, escalations, delegations
    toast.success(`${action.replace('_', ' ').toUpperCase()} successful`);
    if (refresh) {
      // Simulate action completing by refreshing
      setTimeout(refresh, 500);
    }
  };

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="bg-surface rounded-2xl shadow-xs border border-hairline-soft p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3 border-b border-hairline-soft pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-md ${iconBg}`}>
            <IconHeader className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-ink tracking-wider uppercase">
            {sectionTitle}
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
            {items.length}
          </span>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
        {items.map((item) => {
          const { Icon, color } = getIcon(item.type);
          const isBusy = busyId === item.id;

          return (
            <div
              key={item.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-surface-1/40 hover:bg-surface-1/70 border border-hairline-soft rounded-tracker-md transition-all duration-200"
            >
              {/* Item Details */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className={`p-2 rounded-tracker-md flex-shrink-0 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-ink truncate leading-tight">
                      {item.title}
                    </p>
                    <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-extrabold bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200/20 flex-shrink-0">
                      Urgency: {item.urgencyScore}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted truncate mt-0.5">
                    {item.subtitle}
                  </p>
                  {item.department && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-medium bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 rounded">
                      {item.department}
                    </span>
                  )}
                </div>
              </div>

              {/* Inline Actions */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-7 md:ml-0">
                {item.actions?.map((act) => {
                  if (act === 'approve') {
                    return (
                      <button
                        key={act}
                        onClick={() => handleApproveDeny(item, 'approve')}
                        disabled={isBusy}
                        className="p-1.5 md:px-3 md:py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40 rounded-tracker-md flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Approve"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">Approve</span>
                      </button>
                    );
                  }
                  if (act === 'deny') {
                    return (
                      <button
                        key={act}
                        onClick={() => handleApproveDeny(item, 'deny')}
                        disabled={isBusy}
                        className="p-1.5 md:px-3 md:py-1.5 text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border border-red-200/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 rounded-tracker-md flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Deny"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">Deny</span>
                      </button>
                    );
                  }
                  return (
                    <button
                      key={act}
                      onClick={() => handleGenericAction(item, act)}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white text-ink hover:bg-surface-2 border border-hairline dark:bg-surface dark:hover:bg-zinc-800 rounded-tracker-md flex items-center gap-1 cursor-pointer"
                    >
                      <span className="capitalize">{act.replace('_', ' ')}</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
