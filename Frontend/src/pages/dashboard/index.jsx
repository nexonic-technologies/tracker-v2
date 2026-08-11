import React from 'react';
import { Users, UserCheck, Ban, Calendar, Clock, CheckSquare } from 'lucide-react';
import { MODULES } from '../../constants/uiTokens';
import { useAuth } from '../../context/authProvider';
import { useUserRole } from '../../hooks/useUserRole';

import { getRoleConfig } from './config/dashboardConfig';
import { useWidgetPermissions } from './hooks/useWidgetPermissions';
import { useDashboardData } from './hooks/useDashboardData';

// V1 components
import DashboardLoader from './components/DashboardLoader';
import DashboardHero from './components/DashboardHero';
import QuickActions from './components/QuickActions';
import PendingLeaves from './components/PendingLeaves';
import StatCard from '../../components/Common/StatCard';
import TableGenerator from '../../components/Common/TableGenerator';
import PriorityTasks from '../../components/Common/PriorityTasks';
import RecentActivity from '../../components/role/Employee/RecentActivity';

// V2 components
import V2AlertBanner from './components/V2AlertBanner';
import V2WorkforcePulse from './components/V2WorkforcePulse';
import V2StatsRow from './components/V2StatsRow';
import V2ActionCenter from './components/V2ActionCenter';
import V2TeamAttendanceGrid from './components/V2TeamAttendanceGrid';
import V2EmployeeHeader from './components/V2EmployeeHeader';
import V2EmployeeTasks from './components/V2EmployeeTasks';
import V2EmployeeLeaveBalance from './components/V2EmployeeLeaveBalance';

export default function Dashboard() {
  const { user } = useAuth();
  const { userRole, loading: roleLoading } = useUserRole();
  const userId = user?.id || user?._id;

  // 1. Resolve configuration actions
  const roleConfig = getRoleConfig(userRole);

  // 2. Fetch which widgets this role is allowed to see from DB
  const { can, widgets: enabledWidgets, loading: widgetsLoading, hasConfig } = useWidgetPermissions(user?.role);

  // 3. Fetch data via aggregation endpoint
  const { stats, pendingLeaves, dashboardData, loading: dataLoading, refresh } = useDashboardData({
    enabledWidgets,
    userId,
  });

  const loading = roleLoading || widgetsLoading || dataLoading;

  if (loading) return <DashboardLoader />;

  // Empty state if role has no configuration saved yet
  if (!hasConfig && !roleLoading && !widgetsLoading) {
    return (
      <div className="space-y-6 animate-fade-in" data-module={MODULES.project.id}>
        <DashboardHero
          userName={user?.name}
          heroActions={roleConfig.heroActions}
          stats={stats}
        />
        <div className="lmx-section-card p-10 flex flex-col items-center text-center gap-3">
          <div className="lmx-icon-tile w-fit p-4">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-ink">No dashboard widgets configured</h3>
          <p className="text-sm text-ink-muted max-w-sm">
            An administrator needs to enable dashboard widgets for the <strong>{userRole}</strong> role
            in <strong>Settings → Role Permissions → Dashboard Widgets</strong>.
          </p>
        </div>
      </div>
    );
  }

  // Determine if V2 dashboard is enabled (if any V2 widget is checked in the role settings)
  const isV2 =
    can('v2_alert_banner') ||
    can('v2_workforce_pulse') ||
    can('v2_employee_header') ||
    can('v2_action_center') ||
    can('v2_team_attendance_grid') ||
    can('v2_stat_pending_approvals') ||
    can('v2_stat_overdue_tasks') ||
    can('v2_stat_open_tickets') ||
    can('v2_stat_attendance_issues') ||
    can('v2_stat_payroll_status') ||
    can('v2_stat_payroll_cost') ||
    can('v2_stat_workforce_health') ||
    can('v2_stat_financial_exposure') ||
    can('v2_employee_tasks') ||
    can('v2_employee_leave_balance');

  // --- RENDER V2 DASHBOARD LAYOUTS ---
  if (isV2 && dashboardData) {
    const { layoutVariant, pulse, stats: v2Stats, alerts, actionCenter, employee, teamGrid } = dashboardData;

    return (
      <div className="space-y-4 animate-fade-in" data-module={MODULES.project.id}>
        {/* Top Header Row: 3:4 Employee Clock-in Card (Left) & 1:4 Alert Banner (Right) */}
        {(() => {
          const showHeader = can('v2_employee_header');
          const showAlert = can('v2_alert_banner') && alerts && alerts.length > 0;

          if (!showHeader && !showAlert) return null;

          if (showHeader && showAlert) {
            return (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full">
                <div className="sm:col-span-3">
                  <V2EmployeeHeader attendance={employee?.attendance} refresh={refresh} />
                </div>
                <div className="sm:col-span-1">
                  <V2AlertBanner alerts={alerts} />
                </div>
              </div>
            );
          }

          if (showHeader) {
            return (
              <div className="w-full">
                <V2EmployeeHeader attendance={employee?.attendance} refresh={refresh} />
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 w-full">
              <div className="sm:col-start-4 sm:col-span-1">
                <V2AlertBanner alerts={alerts} />
              </div>
            </div>
          );
        })()}

        {can('v2_workforce_pulse') && (
          <V2WorkforcePulse pulse={pulse} scope={layoutVariant === 'manager' ? 'team' : 'org'} />
        )}

        <V2StatsRow stats={v2Stats} can={can} />

        {/* Dynamic cols: Employee Tasks, Action Center, Team Attendance Grid */}
        {(() => {
          const hasMain = can('v2_employee_tasks') || can('v2_action_center');
          const hasSide = can('v2_team_attendance_grid');

          if (!hasMain && !hasSide) return null;

          // Both main panels & side panels allowed
          if (hasMain && hasSide) {
            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                <div className="lg:col-span-2 space-y-4">
                  {can('v2_employee_tasks') && <V2EmployeeTasks tasks={employee?.tasks} />}
                  {can('v2_action_center') && (
                    <V2ActionCenter items={actionCenter} layoutVariant={layoutVariant} refresh={refresh} />
                  )}
                </div>
                <div className="lg:col-span-1 flex flex-col">
                  {can('v2_team_attendance_grid') && <V2TeamAttendanceGrid teamGrid={teamGrid} />}
                </div>
              </div>
            );
          }

          // Only main panels allowed
          if (hasMain) {
            const mainCount = (can('v2_employee_tasks') ? 1 : 0) + (can('v2_action_center') ? 1 : 0);
            return (
              <div className={`grid grid-cols-1 ${mainCount > 1 ? 'lg:grid-cols-2' : ''} gap-4`}>
                {can('v2_employee_tasks') && <V2EmployeeTasks tasks={employee?.tasks} />}
                {can('v2_action_center') && (
                  <V2ActionCenter items={actionCenter} layoutVariant={layoutVariant} refresh={refresh} />
                )}
              </div>
            );
          }

          // Only side panels allowed
          return (
            <div className="grid grid-cols-1 gap-4">
              {can('v2_team_attendance_grid') && <V2TeamAttendanceGrid teamGrid={teamGrid} />}
            </div>
          );
        })()}
      </div>
    );
  }

  // --- RENDER V1 LEGACY FALLBACK ---
  const onLeave = (stats?.totalEmployees || 0) - (stats?.presentToday || 0);

  const orgStats = [
    can('stat_total_employees') && (
      <StatCard key="total_emp" title="Total Employees" value={stats?.totalEmployees || 0} icon={Users} color="blue" loading={dataLoading} />
    ),
    can('stat_present_today') && (
      <StatCard key="present" title="Present Today" value={stats?.presentToday || 0} icon={UserCheck} color="green" loading={dataLoading} />
    ),
    can('stat_on_leave') && (
      <StatCard key="on_leave" title="On Leave" value={onLeave} icon={Ban} color="yellow" loading={dataLoading} />
    ),
    can('stat_pending_leaves') && (
      <StatCard key="pend_leaves" title="Pending Leaves" value={pendingLeaves.length} icon={Calendar} color="orange" loading={dataLoading} />
    ),
  ].filter(Boolean);

  const employeeStats = [
    can('stat_attendance_status') && (
      <StatCard
        key="att_status"
        title="Today's Attendance"
        value={
          stats?.attendanceStatus === 'check-in' ? 'Checked In'
          : stats?.attendanceStatus === 'check-out' ? 'Checked Out'
          : 'Not Started'
        }
        icon={Clock}
        color={
          stats?.attendanceStatus === 'check-in' ? 'green'
          : stats?.attendanceStatus === 'check-out' ? 'yellow'
          : 'red'
        }
        loading={dataLoading}
      />
    ),
    can('stat_leave_balance') && (
      <StatCard key="leave_bal" title="Leave Balance" value={stats?.leaveBalance || 0} subtitle="days remaining" icon={Calendar} color="yellow" loading={dataLoading} />
    ),
    can('stat_my_tasks') && (
      <StatCard key="my_tasks" title="My Tasks" value={stats?.myTasks || 0} subtitle="assigned to me" icon={CheckSquare} color="blue" loading={dataLoading} />
    ),
  ].filter(Boolean);

  const hasOrgStats = orgStats.length > 0;
  const hasEmployeeStats = employeeStats.length > 0;
  const hasLeftPanel = can('quick_actions') || can('recent_tasks_table') || can('priority_tasks');
  const hasRightPanel = can('pending_leaves_list') || can('recent_activity');

  return (
    <div className="space-y-6 animate-fade-in" data-module={MODULES.project.id}>
      <DashboardHero
        userName={user?.name}
        heroActions={roleConfig.heroActions}
        stats={stats}
      />

      {hasOrgStats && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(orgStats.length, 4)} gap-5`}>
          {orgStats}
        </div>
      )}

      {hasEmployeeStats && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(employeeStats.length, 3)} gap-5`}>
          {employeeStats}
        </div>
      )}

      {(hasLeftPanel || hasRightPanel) && (
        <div className={`grid grid-cols-1 ${hasRightPanel ? 'lg:grid-cols-3' : ''} gap-6`}>
          {hasLeftPanel && (
            <div className={`${hasRightPanel ? 'lg:col-span-2' : ''} space-y-6`}>
              {can('quick_actions') && <QuickActions actions={roleConfig.quickActions} />}
              {can('recent_tasks_table') && (
                <TableGenerator
                  model="tasks"
                  title="Recent Tasks"
                  searchable
                  sortable
                  pagination={false}
                  className="max-h-[320px]"
                  autoRefresh
                  refreshInterval={30000}
                />
              )}
              {can('priority_tasks') && <PriorityTasks />}
            </div>
          )}

          {hasRightPanel && (
            <div className="space-y-6">
              {can('pending_leaves_list') && <PendingLeaves leaves={pendingLeaves} />}
              {can('recent_activity') && <RecentActivity />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
