import React from 'react';
import { usePermission } from '../../context/permissionProvider';

// Employee Tasks Component
const EmployeeTasks = () => (
  <div className="space-y-4">
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">My Tasks</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 p-4 rounded">
          <h4 className="font-medium text-red-800">To Do</h4>
          <p className="text-2xl font-bold text-red-600">6</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded">
          <h4 className="font-medium text-yellow-800">In Progress</h4>
          <p className="text-2xl font-bold text-yellow-600">3</p>
        </div>
        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-medium text-blue-800">Review</h4>
          <p className="text-2xl font-bold text-blue-600">2</p>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <h4 className="font-medium text-green-800">Completed</h4>
          <p className="text-2xl font-bold text-green-600">15</p>
        </div>
      </div>
    </div>
    <div className="bg-white p-6 rounded-lg shadow">
      <h4 className="font-medium mb-3">Quick Actions</h4>
      <div className="flex gap-2">
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          View My Tasks
        </button>
        <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          Update Progress
        </button>
      </div>
    </div>
  </div>
);

// Manager Tasks Component
const ManagerTasks = () => (
  <div className="space-y-4">
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Team Tasks Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-purple-50 p-4 rounded">
          <h4 className="font-medium text-purple-800">Total Tasks</h4>
          <p className="text-2xl font-bold text-purple-600">45</p>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <h4 className="font-medium text-red-800">Overdue</h4>
          <p className="text-2xl font-bold text-red-600">4</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded">
          <h4 className="font-medium text-yellow-800">In Progress</h4>
          <p className="text-2xl font-bold text-yellow-600">12</p>
        </div>
        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-medium text-blue-800">My Tasks</h4>
          <p className="text-2xl font-bold text-blue-600">8</p>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <h4 className="font-medium text-green-800">Completed</h4>
          <p className="text-2xl font-bold text-green-600">21</p>
        </div>
      </div>
    </div>
    <div className="bg-white p-6 rounded-lg shadow">
      <h4 className="font-medium mb-3">Manager Actions</h4>
      <div className="flex gap-2 flex-wrap">
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Assign Tasks
        </button>
        <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          Team Performance
        </button>
        <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
          Review Tasks
        </button>
        <button className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
          Create Task
        </button>
      </div>
    </div>
  </div>
);

// HR/Super Admin Tasks Component
const HRTasks = () => (
  <div className="space-y-4">
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Organization Tasks</h3>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-indigo-50 p-4 rounded">
          <h4 className="font-medium text-indigo-800">All Tasks</h4>
          <p className="text-2xl font-bold text-indigo-600">156</p>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <h4 className="font-medium text-red-800">Critical</h4>
          <p className="text-2xl font-bold text-red-600">8</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded">
          <h4 className="font-medium text-yellow-800">Active</h4>
          <p className="text-2xl font-bold text-yellow-600">67</p>
        </div>
        <div className="bg-blue-50 p-4 rounded">
          <h4 className="font-medium text-blue-800">Departments</h4>
          <p className="text-2xl font-bold text-blue-600">12</p>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <h4 className="font-medium text-green-800">Completed</h4>
          <p className="text-2xl font-bold text-green-600">81</p>
        </div>
        <div className="bg-purple-50 p-4 rounded">
          <h4 className="font-medium text-purple-800">Productivity</h4>
          <p className="text-2xl font-bold text-purple-600">87%</p>
        </div>
      </div>
    </div>
    <div className="bg-white p-6 rounded-lg shadow">
      <h4 className="font-medium mb-3">HR Actions</h4>
      <div className="flex gap-2 flex-wrap">
        <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          Task Analytics
        </button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Department Reports
        </button>
        <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
          Performance Metrics
        </button>
        <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
          Resource Planning
        </button>
        <button className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
          Task Templates
        </button>
      </div>
    </div>
  </div>
);

// Main Role-Based Tasks Component
const RoleBasedTasks = () => {
  const { hasCapability, loading, userProfile } = usePermission();
  const userId = userProfile?.id;

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  // Give full admin access to specific user ID
  const isFullAccessUser = userId === '68d8b98af397d1d97620ba97';

  const renderTasksComponent = () => {
    if (isFullAccessUser || hasCapability("tasks:all:read")) {
      return <HRTasks />;
    }

    if (hasCapability("tasks:team:read")) {
      return <ManagerTasks />;
    }

    return <EmployeeTasks />;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Tasks Management</h2>
      </div>
      {renderTasksComponent()}
    </div>
  );
};

export default RoleBasedTasks;