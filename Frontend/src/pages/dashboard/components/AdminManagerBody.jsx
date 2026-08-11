import React from 'react';
import { Users, UserCheck, Ban, Calendar } from 'lucide-react';
import StatCard from '../../../components/Common/StatCard';
import TableGenerator from '../../../components/Common/TableGenerator';
import QuickActions from './QuickActions';
import PendingLeaves from './PendingLeaves';

/**
 * Dashboard body for admin / manager variants.
 *
 * Props:
 *   stats         — { totalEmployees, presentToday }
 *   pendingLeaves — array of pending leave documents
 *   quickActions  — action links from role config
 *   loading       — boolean
 */
export default function AdminManagerBody({ stats, pendingLeaves, quickActions, loading }) {
  const onLeave = (stats?.totalEmployees || 0) - (stats?.presentToday || 0);

  return (
    <>
      {/* Org-level stat row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Employees"  value={stats?.totalEmployees || 0} icon={Users}     color="blue"   loading={loading} />
        <StatCard title="Present Today"    value={stats?.presentToday || 0}   icon={UserCheck}  color="green"  loading={loading} />
        <StatCard title="On Leave"         value={onLeave}                     icon={Ban}        color="yellow" loading={loading} />
        <StatCard title="Pending Leaves"   value={pendingLeaves.length}        icon={Calendar}   color="orange" loading={loading} />
      </div>

      {/* Actions + table + leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <QuickActions actions={quickActions} />
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
        </div>
        <div className="space-y-6">
          <PendingLeaves leaves={pendingLeaves} />
        </div>
      </div>
    </>
  );
}
