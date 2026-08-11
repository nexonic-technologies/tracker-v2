import React from 'react';
import { usePermission } from '../../context/permissionProvider';

// Employee Attendance Component
const EmployeeAttendance = () => (
  <div className="space-y-4">
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">My Attendance</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded">
          <h4 className="font-medium text-green-800">Present Days</h4>
          <p className="text-2xl font-bold text-green-600">22</p>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <h4 className="font-medium text-red-800">Absent Days</h4>
          <p className="text-2xl font-bold text-red-600">2</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded">
          <h4 className="font-medium text-yellow-800">Late Arrivals</h4>
          <p className="text-2xl font-bold text-yellow-600">3</p>
        </div>
        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-medium text-blue-800">Avg Hours</h4>
          <p className="text-2xl font-bold text-blue-600">8.5</p>
        </div>
      </div>
    </div>
    <div className="bg-white p-6 rounded-lg shadow">
      <h4 className="font-medium mb-3">Today's Status</h4>
      <div className="flex gap-4 items-center">
        <div className="bg-green-100 p-3 rounded">
          <span className="text-green-800 font-medium">Check In: 9:15 AM</span>
        </div>
        <div className="bg-gray-100 p-3 rounded">
          <span className="text-gray-800 font-medium">Check Out: --:--</span>
        </div>
        <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          Check Out
        </button>
      </div>
    </div>
    <div className="bg-white p-6 rounded-lg shadow">
      <h4 className="font-medium mb-3">Quick Actions</h4>
      <div className="flex gap-2">
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Request Leave
        </button>
        <button className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">
          Regularization
        </button>
        <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
          View Calendar
        </button>
      </div>
    </div>
  </div>
);

// Manager Attendance Component
const ManagerAttendance = () => (
  <div className="space-y-4">
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Team Attendance</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-medium text-blue-800">Team Size</h4>
          <p className="text-2xl font-bold text-blue-600">15</p>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <h4 className="font-medium text-green-800">Present Today</h4>
          <p className="text-2xl font-bold text-green-600">13</p>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <h4 className="font-medium text-red-800">Absent Today</h4>
          <p className="text-2xl font-bold text-red-600">2</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded">
          <h4 className="font-medium text-yellow-800">On Leave</h4>
          <p className="text-2xl font-bold text-yellow-600">1</p>
        </div>
        <div className="bg-purple-50 p-4 rounded">
          <h4 className="font-medium text-purple-800">Attendance %</h4>
          <p className="text-2xl font-bold text-purple-600">87%</p>
        </div>
      </div>
    </div>
    <div className="bg-white p-6 rounded-lg shadow">
      <h4 className="font-medium mb-3">My Attendance</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-100 p-3 rounded">
          <span className="text-green-800 font-medium">Present: 24 days</span>
        </div>
        <div className="bg-blue-100 p-3 rounded">
          <span className="text-blue-800 font-medium">Check In: 9:00 AM</span>
        </div>
        <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          Check Out
        </button>
      </div>
    </div>
    <div className="bg-white p-6 rounded-lg shadow">
      <h4 className="font-medium mb-3">Manager Actions</h4>
      <div className="flex gap-2 flex-wrap">
        <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          Approve Leaves
        </button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Team Reports
        </button>
        <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
          Regularizations
        </button>
        <button className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
          Schedule Review
        </button>
      </div>
    </div>
  </div>
);

// HR/Super Admin Attendance Component
const HRAttendance = () => (
  <div className="space-y-4">
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Organization Attendance</h3>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-indigo-50 p-4 rounded">
          <h4 className="font-medium text-indigo-800">Total Employees</h4>
          <p className="text-2xl font-bold text-indigo-600">125</p>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <h4 className="font-medium text-green-800">Present Today</h4>
          <p className="text-2xl font-bold text-green-600">118</p>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <h4 className="font-medium text-red-800">Absent Today</h4>
          <p className="text-2xl font-bold text-red-600">7</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded">
          <h4 className="font-medium text-yellow-800">On Leave</h4>
          <p className="text-2xl font-bold text-yellow-600">5</p>
        </div>
        <div className="bg-purple-50 p-4 rounded">
          <h4 className="font-medium text-purple-800">Avg Attendance</h4>
          <p className="text-2xl font-bold text-purple-600">94%</p>
        </div>
        <div className="bg-orange-50 p-4 rounded">
          <h4 className="font-medium text-orange-800">Departments</h4>
          <p className="text-2xl font-bold text-orange-600">8</p>
        </div>
      </div>
    </div>
    <div className="bg-white p-6 rounded-lg shadow">
      <h4 className="font-medium mb-3">Pending Approvals</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-100 p-3 rounded">
          <span className="text-yellow-800 font-medium">Leave Requests: 12</span>
        </div>
        <div className="bg-blue-100 p-3 rounded">
          <span className="text-blue-800 font-medium">Regularizations: 8</span>
        </div>
        <div className="bg-purple-100 p-3 rounded">
          <span className="text-purple-800 font-medium">Time Adjustments: 5</span>
        </div>
      </div>
    </div>
    <div className="bg-white p-6 rounded-lg shadow">
      <h4 className="font-medium mb-3">HR Actions</h4>
      <div className="flex gap-2 flex-wrap">
        <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          Attendance Analytics
        </button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Department Reports
        </button>
        <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          Policy Management
        </button>
        <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
          Bulk Approvals
        </button>
        <button className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
          Shift Management
        </button>
        <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
          Export Data
        </button>
      </div>
    </div>
  </div>
);

// Main Role-Based Attendance Component
const RoleBasedAttendance = () => {
  const { hasCapability, loading } = usePermission();

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  const renderAttendanceComponent = () => {
    if (hasCapability("attendance:all:read")) {
      return <HRAttendance />;
    }
    if (hasCapability("attendance:team:read")) {
      return <ManagerAttendance />;
    }
    return <EmployeeAttendance />;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Attendance Management</h2>
      </div>
      {renderAttendanceComponent()}
    </div>
  );
};

export default RoleBasedAttendance;