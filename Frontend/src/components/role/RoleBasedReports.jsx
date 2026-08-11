import React, { useState, useEffect } from 'react';
import { usePermission } from '../../context/permissionProvider';
import { useAuth } from '../../context/authProvider';
import axiosInstance from '../../api/axiosInstance';

// Manager Reports Component
const ManagerReports = () => (
  <div className="space-y-4">
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Team Reports</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-medium text-blue-800">Team Performance</h4>
          <p className="text-2xl font-bold text-blue-600">85%</p>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <h4 className="font-medium text-green-800">Tasks Completed</h4>
          <p className="text-2xl font-bold text-green-600">156</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded">
          <h4 className="font-medium text-yellow-800">Attendance Rate</h4>
          <p className="text-2xl font-bold text-yellow-600">92%</p>
        </div>
        <div className="bg-purple-50 p-4 rounded">
          <h4 className="font-medium text-purple-800">Budget Utilization</h4>
          <p className="text-2xl font-bold text-purple-600">78%</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-3">Available Reports</h4>
        <div className="space-y-2">
          <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
            📊 Team Attendance Report
          </button>
          <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
            📈 Task Performance Report
          </button>
          <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
            💰 Team Expense Report
          </button>
          <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
            📅 Leave Summary Report
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-3">Quick Actions</h4>
        <div className="space-y-2">
          <button className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600">
            Generate Monthly Report
          </button>
          <button className="w-full bg-green-500 text-white p-3 rounded hover:bg-green-600">
            Export Team Data
          </button>
          <button className="w-full bg-purple-500 text-white p-3 rounded hover:bg-purple-600">
            Schedule Report
          </button>
        </div>
      </div>
    </div>
  </div>
);

// HR Reports Component
const HRReports = () => (
  <div className="space-y-4">
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">HR Analytics Dashboard</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-indigo-50 p-4 rounded">
          <h4 className="font-medium text-indigo-800">Total Employees</h4>
          <p className="text-2xl font-bold text-indigo-600">125</p>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <h4 className="font-medium text-green-800">Avg Attendance</h4>
          <p className="text-2xl font-bold text-green-600">94%</p>
        </div>
        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-medium text-blue-800">Active Projects</h4>
          <p className="text-2xl font-bold text-blue-600">28</p>
        </div>
        <div className="bg-purple-50 p-4 rounded">
          <h4 className="font-medium text-purple-800">Departments</h4>
          <p className="text-2xl font-bold text-purple-600">8</p>
        </div>
        <div className="bg-orange-50 p-4 rounded">
          <h4 className="font-medium text-orange-800">Satisfaction</h4>
          <p className="text-2xl font-bold text-orange-600">4.2/5</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-3">Attendance Reports</h4>
        <div className="space-y-2">
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📊 Daily Attendance Summary
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📈 Monthly Attendance Trends
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📅 Department-wise Attendance
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            🏖️ Leave Pattern Analysis
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-3">Performance Reports</h4>
        <div className="space-y-2">
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            🎯 Employee Performance
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📊 Task Completion Rates
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            🏆 Top Performers
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📈 Productivity Metrics
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-3">Financial Reports</h4>
        <div className="space-y-2">
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            💰 Expense Analysis
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            💳 Payroll Summary
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📊 Budget vs Actual
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📈 Cost per Employee
          </button>
        </div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg shadow">
      <h4 className="font-medium mb-3">Advanced Analytics</h4>
      <div className="flex gap-2 flex-wrap">
        <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          📊 Executive Dashboard
        </button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          📈 Predictive Analytics
        </button>
        <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          📋 Custom Reports
        </button>
        <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
          📅 Scheduled Reports
        </button>
        <button className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
          📤 Export Center
        </button>
        <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
          ⚙️ Report Builder
        </button>
      </div>
    </div>
  </div>
);

// Super Admin Reports Component
const SuperAdminReports = () => (
  <div className="space-y-4">
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Executive Analytics</h3>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-red-50 p-4 rounded">
          <h4 className="font-medium text-red-800">System Health</h4>
          <p className="text-2xl font-bold text-red-600">98%</p>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <h4 className="font-medium text-green-800">User Adoption</h4>
          <p className="text-2xl font-bold text-green-600">89%</p>
        </div>
        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-medium text-blue-800">Data Accuracy</h4>
          <p className="text-2xl font-bold text-blue-600">96%</p>
        </div>
        <div className="bg-purple-50 p-4 rounded">
          <h4 className="font-medium text-purple-800">ROI</h4>
          <p className="text-2xl font-bold text-purple-600">245%</p>
        </div>
        <div className="bg-orange-50 p-4 rounded">
          <h4 className="font-medium text-orange-800">Cost Savings</h4>
          <p className="text-2xl font-bold text-orange-600">₹2.5L</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded">
          <h4 className="font-medium text-indigo-800">Efficiency</h4>
          <p className="text-2xl font-bold text-indigo-600">92%</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-3">System Reports</h4>
        <div className="space-y-2">
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            🖥️ System Usage Analytics
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📊 Performance Metrics
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            🔒 Security Audit
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📈 Growth Analytics
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-3">Business Intelligence</h4>
        <div className="space-y-2">
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📊 Executive Dashboard
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📈 Trend Analysis
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            🎯 KPI Monitoring
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📋 Strategic Reports
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-3">Compliance Reports</h4>
        <div className="space-y-2">
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📋 Audit Reports
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            🔒 Data Privacy
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📊 Regulatory Compliance
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📈 Risk Assessment
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-3">Advanced Analytics</h4>
        <div className="space-y-2">
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            🤖 AI Insights
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            🔮 Predictive Models
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📊 Data Mining
          </button>
          <button className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 text-sm">
            📈 Forecasting
          </button>
        </div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg shadow">
      <h4 className="font-medium mb-3">Super Admin Tools</h4>
      <div className="flex gap-2 flex-wrap">
        <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          🚀 System Overview
        </button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          📊 Multi-tenant Analytics
        </button>
        <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          🔧 Configuration Reports
        </button>
        <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
          📈 Performance Optimization
        </button>
        <button className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
          🎯 Business Metrics
        </button>
        <button className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600">
          📋 Custom Dashboards
        </button>
        <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
          ⚙️ Advanced Settings
        </button>
      </div>
    </div>
  </div>
);

// Employee Reports Component
const EmployeeReports = ({ userId }) => {
  const [data, setData] = useState({
    attendance: { rate: 0, total: 0 },
    tasks: { completed: 0, total: 0 },
    leaves: { taken: 0, available: 0 },
    performance: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        // console.log('Fetching reports for user:', userId);

        const [attendanceRes, tasksRes, leavesRes] = await Promise.all([
          axiosInstance.post('/populate/read/attendances'),
          axiosInstance.post('/populate/read/tasks'),
          axiosInstance.post('/populate/read/leaves')
        ]);

        // console.log('API responses:', { attendanceRes, tasksRes, leavesRes });

        const attendance = attendanceRes.data?.data?.filter(a => a.employee === userId) || [];
        const tasks = tasksRes.data?.data?.filter(t => t.assignedTo === userId) || [];
        const leaves = leavesRes.data?.data?.filter(l => l.employee === userId) || [];

        const attendanceRate = attendance.length > 0 ?
          Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0;

        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const approvedLeaves = leaves.filter(l => l.status === 'approved').length;

        setData({
          attendance: { rate: attendanceRate, total: attendance.length },
          tasks: { completed: completedTasks, total: tasks.length },
          leaves: { taken: approvedLeaves, available: 24 - approvedLeaves },
          performance: Math.min(4.5, (attendanceRate / 100) * 5)
        });
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) return <div className="flex justify-center p-8">Loading reports...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">My Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <h4 className="font-medium text-blue-800">My Attendance</h4>
            <p className="text-2xl font-bold text-blue-600">{data.attendance.rate}%</p>
            <p className="text-sm text-blue-600">{data.attendance.total} days</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <h4 className="font-medium text-green-800">Tasks Completed</h4>
            <p className="text-2xl font-bold text-green-600">{data.tasks.completed}</p>
            <p className="text-sm text-green-600">of {data.tasks.total} total</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded">
            <h4 className="font-medium text-yellow-800">Leaves Taken</h4>
            <p className="text-2xl font-bold text-yellow-600">{data.leaves.taken}</p>
            <p className="text-sm text-yellow-600">{data.leaves.available} remaining</p>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <h4 className="font-medium text-purple-800">Performance</h4>
            <p className="text-2xl font-bold text-purple-600">{data.performance.toFixed(1)}/5</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-medium mb-3">My Reports</h4>
          <div className="space-y-2">
            <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
              📊 My Attendance Report
            </button>
            <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
              📈 My Task Report
            </button>
            <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
              📅 My Leave Summary
            </button>
            <button className="w-full text-left p-3 bg-gray-50 rounded hover:bg-gray-100">
              💰 My Expense Report
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-medium mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <button className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600">
              Download My Report
            </button>
            <button className="w-full bg-green-500 text-white p-3 rounded hover:bg-green-600">
              View Performance
            </button>
            <button className="w-full bg-purple-500 text-white p-3 rounded hover:bg-purple-600">
              Export Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Role-Based Reports Component
const RoleBasedReports = () => {
  const { hasCapability, loading, userProfile } = usePermission();
  const userId = userProfile?.id;

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  const renderReportsComponent = () => {
    if (hasCapability("reports:system:read")) {
      return <SuperAdminReports />;
    }
    if (hasCapability("reports:all:read")) {
      return <HRReports />;
    }
    if (hasCapability("reports:team:read")) {
      return <ManagerReports />;
    }
    return <EmployeeReports userId={userId} />;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Reports & Analytics</h2>
      </div>
      {renderReportsComponent()}
    </div>
  );
};

export default RoleBasedReports;