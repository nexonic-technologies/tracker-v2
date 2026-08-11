import { Link } from "react-router-dom";
import {
  CheckSquare,
  Clock,
  Calendar,
  ClipboardList,
  ArrowRight
} from "lucide-react";

import StatCard from "../../Common/StatCard";
import PriorityTasks from "../../Common/PriorityTasks";
import RecentActivity from "./RecentActivity";

export default function EmployeeDashboard({ stats }) {
  const attendanceColor =
    stats?.attendanceStatus === "check-in"
      ? "green"
      : stats?.attendanceStatus === "check-out"
        ? "yellow"
        : "red";

  const quickActions = [
    { to: "/Attendance/leaves", icon: Calendar, label: "Apply Leave" },
    { to: "/tasks/my-tasks", icon: CheckSquare, label: "View Tasks" },
    { to: "/Attendance/Daily-tracker", icon: Clock, label: "Daily Tracker" },
    { to: "/Attendance/leave-regularization", icon: ClipboardList, label: "Regularize" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          title="Today's Attendance"
          value={
            stats?.attendanceStatus === "check-in"
              ? "Checked In"
              : stats?.attendanceStatus === "check-out"
                ? "Checked Out"
                : "Not Started"
          }
          icon={Clock}
          color={attendanceColor}
        />

        <StatCard
          title="Leave Balance"
          value={stats?.leaveBalance || 0}
          subtitle="days remaining"
          icon={Calendar}
          color="yellow"
        />

        <StatCard
          title="My Tasks"
          value={stats?.myTasks || 0}
          subtitle="assigned to me"
          icon={CheckSquare}
          color="blue"
        />
      </div>

      <section className="tracker-card-plain p-6">
        <h3 className="text-lg font-semibold text-ink mb-5 tracking-tight">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="group p-4 bg-surface border border-hairline hover:border-[var(--module-accent)] rounded-tracker-md transition-colors flex flex-col justify-between min-h-[7rem]"
            >
              <div className="lmx-icon-tile w-fit">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-medium text-sm text-ink">{label}</span>
                <ArrowRight className="h-4 w-4 text-ink-subtle group-hover:text-ink group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PriorityTasks />
        </div>
        <RecentActivity />
      </div>
    </div>
  );
}
