// src/utils/moduleMapping.js

export const ROUTE_MODULE_MAP = {
  '/dashboard': 'core',
  '/settings': 'core',
  '/profile': 'core',
  '/search': 'core',
  '/policies': 'core',
  '/feed': 'feed',
  '/hrms': 'hrms',
  '/employees': 'hrms',
  '/departments': 'hrms',
  '/designations': 'hrms',
  '/teams': 'hrms',
  '/attendance': 'attendance',
  '/leaves': 'attendance',
  '/payroll': 'payroll',
  '/accounts': 'payroll',
  '/travel-expenses': 'payroll',
  '/tasks': 'tasks',
  '/tickets': 'tickets',
  '/crm': 'crm',
  '/assets': 'assets',
  '/recruitment': 'recruitment',
  '/candidates': 'recruitment',

  // Master Data explicit sub-route mappings
  '/master-data/departments': 'hrms',
  '/master-data/designations': 'hrms',
  '/master-data/employees': 'hrms',
  '/master-data/hr-policies': 'hrms',
  '/master-data/attendance-policies': 'attendance',
  '/master-data/leave-policies': 'attendance',
  '/master-data/leave-types': 'attendance',
  '/master-data/leave-transactions': 'attendance',
  '/master-data/shifts': 'attendance',
  '/master-data/holidays': 'attendance',
  '/master-data/task-types': 'tasks',
  '/master-data/project-types': 'tasks',
  '/master-data/milestones': 'tasks',
  '/master-data/job-types': 'core',
  '/master-data/job-categories': 'core',
  '/master-data/clients': 'crm',
  '/master-data/contacts': 'crm',
  '/master-data/service-providers': 'core',
  '/master-data/reference-types': 'core',
  '/master-data/lead-types': 'crm',
  '/master-data/products': 'core',
  '/master-data/agents': 'core',
  '/master-data/assets': 'assets',
  '/master-data/roles': 'core',
  '/master-data/workflows': 'core',
  '/master-data/status-master': 'core'
};

/**
 * Resolves standard module key ('core', 'hrms', 'attendance', 'payroll', 'tasks', 'tickets', 'crm', 'assets', 'recruitment', 'feed')
 * based on mainRoute or title.
 */
export function resolveModuleKey(mainRoute = '', title = '') {
  const routeLower = (mainRoute || '').trim().toLowerCase();
  const titleLower = (title || '').trim().toLowerCase();

  for (const [routePrefix, modKey] of Object.entries(ROUTE_MODULE_MAP)) {
    if (routeLower === routePrefix || routeLower.startsWith(routePrefix + '/')) {
      return modKey;
    }
  }

  if (titleLower.includes('dashboard') || titleLower.includes('setting')) return 'core';
  if (titleLower.includes('employee') || titleLower.includes('hrms') || titleLower.includes('department')) return 'hrms';
  if (titleLower.includes('attendance') || titleLower.includes('shift') || titleLower.includes('leave')) return 'attendance';
  if (titleLower.includes('payroll') || titleLower.includes('salary') || titleLower.includes('expense')) return 'payroll';
  if (titleLower.includes('task') || titleLower.includes('sprint') || titleLower.includes('project') || titleLower.includes('milestone')) return 'tasks';
  if (titleLower.includes('ticket')) return 'tickets';
  if (titleLower.includes('crm') || titleLower.includes('client')) return 'crm';
  if (titleLower.includes('asset')) return 'assets';
  if (titleLower.includes('recruitment') || titleLower.includes('candidate') || titleLower.includes('job')) return 'recruitment';
  if (titleLower.includes('feed')) return 'feed';

  return 'core';
}
