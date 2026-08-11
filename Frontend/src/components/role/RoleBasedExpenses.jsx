import { useState, useEffect } from "react";
import { usePermission } from "../../context/permissionProvider";
import { useAuth } from "../../context/authProvider";
import axiosInstance from "../../api/axiosInstance";
import StatCard from "../Common/StatCard";
import { Clock, CheckCircle2, XCircle, BadgeDollarSign } from "lucide-react";

/* ── Shared stat grid ── */
const ExpenseStats = ({ stats, loading, tiles }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {tiles.map(({ title, key, icon, color }) => (
      <StatCard key={key} title={title} value={stats[key] ?? 0} icon={icon} color={color} loading={loading} />
    ))}
  </div>
);

const EMPLOYEE_TILES = [
  { title: "Pending",  key: "pending",  icon: Clock,           color: "yellow" },
  { title: "Approved", key: "approved", icon: CheckCircle2,    color: "green"  },
  { title: "Rejected", key: "rejected", icon: XCircle,         color: "red"    },
];

const MANAGER_TILES = [
  { title: "Pending Approval", key: "pending",     icon: Clock,           color: "yellow" },
  { title: "Approved",         key: "approved",    icon: CheckCircle2,    color: "green"  },
  { title: "Rejected",         key: "rejected",    icon: XCircle,         color: "red"    },
  { title: "Total Amount",     key: "totalAmount", icon: BadgeDollarSign, color: "purple" },
];

/* ════════════════════════════════════════ */
const RoleBasedExpenses = ({ onRefresh }) => {
  const { user } = useAuth();
  const { hasCapability, loading } = usePermission();
  const userId = user?.id || user?._id;
  const [stats, setStats]       = useState({ pending: 0, approved: 0, rejected: 0, totalAmount: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (loading || !userId) return;
    fetchStats();
  }, [loading, userId]);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const filter = !hasCapability("expenses:team:read") ? { employeeId: userId } : {};
      const res = await axiosInstance.post("/populate/read/expenses", { filter, type: 3 });
      const d = res?.data?.data || res?.data?.stats || {};
      setStats({
        pending:     d.pending     || 0,
        approved:    d.approved    || 0,
        rejected:    d.rejected    || 0,
        totalAmount: d.totalAmount || d.totalDayTotal || 0,
      });
    } catch (e) {
      console.error("Failed to fetch expense stats:", e);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-24">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--module-payroll)] border-t-transparent animate-spin" />
      </div>
    );

  const isManager = hasCapability("expenses:team:read");
  const tiles     = isManager ? MANAGER_TILES : EMPLOYEE_TILES;
  const heading   = isManager ? "Team Expenses" : "My Expenses";

  return (
    <div data-module="payroll" className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-[var(--module-payroll)]" />
        <h3 className="text-[15px] font-semibold text-ink">{heading}</h3>
      </div>
      <ExpenseStats stats={stats} loading={statsLoading} tiles={tiles} />
    </div>
  );
};

export default RoleBasedExpenses;
