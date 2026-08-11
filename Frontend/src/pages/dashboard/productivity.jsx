import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import {
  TrendingUp,
  DollarSign,
  Users,
  CheckCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import toast from 'react-hot-toast';

const ProductivityDashboard = () => {
  const [data, setData] = useState({
    clientStats: [],
    totals: { totalRevenue: 0, totalExpenses: 0, activeClients: 0 },
    loading: true
  });

  const fetchStats = async () => {
    try {
      const [clientsRes, oasRes, expensesRes, tasksRes, task_typesRes, paymentsRes, employeesRes] = await Promise.all([
        axiosInstance.post('/populate/read/clients', { limit: 1000, select: 'name _id Status' }),
        axiosInstance.post('/populate/read/orderacknowledgments', { filter: { status: 'Approved' }, limit: 1000 }),
        axiosInstance.post('/populate/read/expenses', { filter: { status: 'approved' }, limit: 1000 }),
        axiosInstance.post('/populate/read/tasks', { limit: 5000, select: 'clientId actualHours taskTypeId assignedTo' }),
        axiosInstance.post('/populate/read/task_types', { limit: 100 }),
        axiosInstance.post('/populate/read/payments', { filter: { status: 'Confirmed' }, limit: 1000 }),
        axiosInstance.post('/populate/read/employees', { limit: 1000, select: 'salaryDetails.ctc' })
      ]);

      const clients = clientsRes.data?.data || [];
      const oas = oasRes.data?.data || [];
      const expenses = expensesRes.data?.data || [];
      const tasks = tasksRes.data?.data || [];
      const task_types = task_typesRes.data?.data || [];
      const payments = paymentsRes.data?.data || [];
      const employees = employeesRes.data?.data || [];

      // Map task types to categories for quick lookup
      const typeCategoryMap = {};
      task_types.forEach(t => typeCategoryMap[t._id] = t.category);

      // Average hourly rate calculation (fallback if not specified)
      const getHourlyRate = (empIds) => {
        if (!empIds || empIds.length === 0) return 350; // Default fallback rate
        const relevantEmps = employees.filter(e => empIds.includes(e._id));
        if (relevantEmps.length === 0) return 350;
        const avgCTC = relevantEmps.reduce((sum, e) => sum + (e.salaryDetails?.ctc || 0), 0) / relevantEmps.length;
        return avgCTC / 176; // Approx 176 working hours per month
      };

      // Process client-wise stats
      const clientStats = clients.map(client => {
        const clientOAs = oas.filter(o => o.clientId?._id === client._id || o.clientId === client._id);
        const clientExpenses = expenses.filter(e => e.clientId === client._id);
        const clientTasks = tasks.filter(t => t.clientId === client._id);
        const clientPayments = payments.filter(p => p.clientId === client._id);

        const actualPrice = clientOAs.reduce((sum, o) => sum + (o.committedPrice || 0), 0);
        const reimbursableExpenses = clientExpenses.reduce((sum, e) => sum + (e.dayTotal || 0), 0);
        const getPaid = clientPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Calculate specialized costs
        let devCost = 0;
        let supportCost = 0;
        let resourceUsageHours = 0;

        clientTasks.forEach(task => {
          const hours = task.actualHours || 0;
          resourceUsageHours += hours;
          const rate = getHourlyRate(task.assignedTo);
          const cost = hours * rate;

          const category = typeCategoryMap[task.taskTypeId];
          if (category === 'Development') devCost += cost;
          else if (category === 'Support' || category === 'Meeting') supportCost += cost;
          else devCost += cost; // Default to dev cost for others for now
        });

        const totalCost = reimbursableExpenses + devCost + supportCost;
        const margin = actualPrice - totalCost;

        return {
          name: client.name,
          actualPrice,
          expenses: reimbursableExpenses,
          devCost,
          supportCost,
          resourceUsageHours,
          getPaid,
          balance: actualPrice - getPaid,
          margin,
          marginPercent: actualPrice > 0 ? ((margin / actualPrice) * 100).toFixed(1) : 0
        };
      }).filter(s => s.actualPrice > 0 || s.expenses > 0 || s.resourceUsageHours > 0)
        .sort((a, b) => b.actualPrice - a.actualPrice);

      const totalRevenue = oas.reduce((sum, o) => sum + (o.committedPrice || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.dayTotal || 0), 0);
      const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      setData({
        clientStats,
        totals: {
          totalRevenue,
          totalExpenses,
          totalPaid,
          activeClients: clients.filter(c => c.Status === 'Active').length
        },
        loading: false
      });
    } catch (err) {
      toast.error('Failed to load productivity metrics');
      setData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-12 w-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" data-module="project">
      {/* Header */}
      <div className="flex justify-between items-end bg-surface p-8 rounded-tracker-xl border border-hairline shadow-card relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10">
          <div className="lmx-page-eyebrow mb-2">Business Intelligence</div>
          <h1 className="text-3xl font-black text-ink tracking-tight">Productivity Dashboard</h1>
          <p className="text-ink-muted max-w-md mt-2">Real-time analysis of client revenue vs. operational expenses.</p>
        </div>
        <div className="relative z-10 flex gap-4">
          <button className="tracker-btn-secondary flex items-center gap-2">
            <BarChart3 size={18} />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Committed Revenue', value: '₹' + data.totals.totalRevenue.toLocaleString(), icon: DollarSign, trend: '+12.5%', color: 'brand' },
          { label: 'Total Paid', value: '₹' + data.totals.totalPaid.toLocaleString(), icon: CheckCircle, trend: '+8.2%', color: 'success' },
          { label: 'Total Expenses', value: '₹' + data.totals.totalExpenses.toLocaleString(), icon: TrendingUp, trend: '-2.4%', color: 'danger' },
          { label: 'Active Retainers', value: data.totals.activeClients, icon: Users, trend: '+3', color: 'info' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface p-6 rounded-tracker-xl border border-hairline shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-tracker-lg bg-module-project-light text-module-project`}>
                <stat.icon size={24} />
              </div>
              <div className={`flex items-center text-xs font-bold ${stat.trend.startsWith('+') ? 'text-tracker-success' : 'text-tracker-danger'} bg-canvas px-2 py-1 rounded-full`}>
                {stat.trend.startsWith('+') ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                {stat.trend}
              </div>
            </div>
            <p className="text-xs font-bold text-ink-subtle uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-black text-ink mt-1 tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Expenses Chart */}
        <div className="lg:col-span-2 bg-surface p-6 rounded-tracker-xl border border-hairline shadow-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <TrendingUp size={20} className="text-brand" />
              Resource Usage vs. Revenue by Client
            </h3>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.clientStats} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  tick={{ fontSize: 10, fontWeight: 600 }}
                  stroke="#64748B"
                />
                <YAxis tick={{ fontSize: 10 }} stroke="#64748B" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#F8FAFC' }}
                />
                <Bar dataKey="actualPrice" name="Actual Price (OA)" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="devCost" name="Dev Cost" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="supportCost" name="Support Cost" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profitability Pie */}
        <div className="bg-surface p-6 rounded-tracker-xl border border-hairline shadow-card flex flex-col">
          <h3 className="text-lg font-bold text-ink mb-8 flex items-center gap-2">
            <CheckCircle size={20} className="text-brand" />
            Client Profitability
          </h3>
          <div className="flex-1 flex flex-col justify-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.clientStats}
                    dataKey="margin"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                  >
                    {data.clientStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-4">
              {data.clientStats.slice(0, 5).map((client, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'][i % 5] }} />
                    <span className="font-semibold text-ink-subtle truncate max-w-[120px]">{client.name}</span>
                  </div>
                  <span className="font-bold text-ink">{client.marginPercent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-surface rounded-tracker-xl border border-hairline shadow-card overflow-hidden">
        <div className="p-6 border-b border-hairline">
          <h3 className="text-lg font-bold text-ink">Commercial Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-canvas border-b border-hairline">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-ink-subtle uppercase tracking-widest">Client Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-ink-subtle uppercase tracking-widest">Actual Price</th>
                <th className="px-6 py-4 text-[10px] font-black text-ink-subtle uppercase tracking-widest">Dev Cost</th>
                <th className="px-6 py-4 text-[10px] font-black text-ink-subtle uppercase tracking-widest">Support Cost</th>
                <th className="px-6 py-4 text-[10px] font-black text-ink-subtle uppercase tracking-widest">Paid</th>
                <th className="px-6 py-4 text-[10px] font-black text-ink-subtle uppercase tracking-widest">Balance</th>
                <th className="px-6 py-4 text-[10px] font-black text-ink-subtle uppercase tracking-widest text-right">Profitability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-soft">
              {data.clientStats.map((client, i) => (
                <tr key={i} className="hover:bg-canvas/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-ink">{client.name}</td>
                  <td className="px-6 py-4 text-sm font-medium text-ink">₹{client.actualPrice.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-purple-600">₹{client.devCost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-emerald-600">₹{client.supportCost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-tracker-success">₹{client.getPaid.toLocaleString()}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${client.balance <= 0 ? 'text-tracker-success' : 'text-tracker-danger'}`}>
                    ₹{client.balance.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/5 rounded-full">
                      <div className="w-16 bg-hairline h-1 rounded-full overflow-hidden">
                        <div className="bg-brand h-full" style={{ width: `${Math.min(100, Math.max(0, client.marginPercent))}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-brand uppercase">{client.marginPercent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductivityDashboard;
