import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle } from 'lucide-react';
import ProfileImage from '../../../components/Common/ProfileImage';


export default function PendingLeaves({ leaves = [] }) {
  return (
    <section className="lmx-section-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--module-accent)]" />
          <h3 className="text-sm font-semibold text-ink">Pending Leave Requests</h3>
          {leaves.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {leaves.length}
            </span>
          )}
        </div>
        <Link
          to="/Attendance/leaves"
          className="text-xs font-medium text-[var(--module-accent)] hover:underline"
        >
          View All
        </Link>
      </div>

      {leaves.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-ink-subtle">
          <CheckCircle className="h-8 w-8 mb-2" />
          <p className="text-sm">No pending requests</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaves.slice(0, 4).map((leave) => (
            <div key={leave._id} className="flex items-center gap-3 p-3 bg-surface-1 rounded-tracker-md">
              <ProfileImage
                profileImage={leave.employeeId?.basicInfo?.profileImage}
                firstName={leave.employeeId?.basicInfo?.firstName}
                lastName={leave.employeeId?.basicInfo?.lastName}
                size="sm"
                className="h-8 w-8 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                  {leave.employeeId?.basicInfo?.firstName} {leave.employeeId?.basicInfo?.lastName}
                </p>
                <p className="text-xs text-ink-muted truncate">
                  {leave.leaveType?.name || 'Leave'} &middot; {leave.fromDate?.split('T')[0]}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {leave.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
