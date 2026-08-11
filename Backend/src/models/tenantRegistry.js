import mongoose from "mongoose";
import { buildSchemaFromDefinition } from "../tenant/dynamicSchemaEngine.js";
import employees from "./Employee.js";
import departments from "./Department.js";
import designations from "./Designation.js";
import leave_types from "./LeaveTypes.js";
import leavepolicy from "./LeavePolicy.js";
import attendances from "./Attendance.js";
import sidebars from "./SideBar.js";
import task_types from "./TaskType.js";
import clients from "./Client.js";
import daily_activities from "./DailyActivity.js";
import api_hit_logs from "./ApiHitLog.js";
import project_types from "./ProjectType.js";
import access_policies from "./AccessPolicies.js";
import roles from "./Role.js";
import notifications from "./notification.js";
import leaves from "./Leave.js";
import tasks from "./Tasks.js";
import comments_threads from "./CommentsThreads.js";
import team_messages from "./TeamMessage.js";
import session from "./Session.js";
import todos from "./Todo.js";
import auditlog from "./AuditLog.js";
import errorlog from "./ErrorLog.js";
import expenses from "./Expense.js";
import payrolls from "./Payroll.js";
import tickets from "./Ticket.js";
import { Shift as shifts, ShiftAssignment as shiftassignments } from "./Shift.js";
import hrpolicies from "./HRPolicy.js";
import agents from "./Agent.js";
import agent_tokens from "./AgentToken.js";
import milestones from "./MileStone.js";
import regularizations from "./Regularization.js";
import email_configs from "./EmailConfig.js";
import reference_types from "./ReferenceType.js";
import lead_types from "./LeadType.js";
import feed_groups from "./FeedGroup.js";
import feed_channels from "./FeedChannel.js";
import feed_posts from "./FeedPost.js";
import feed_comments from "./FeedComment.js";
import NotificationReceptionist from "./NotificationReceptionist.js";
import notification_preferences from "./NotificationPreference.js";
import products from "./products.js";
import quotations from "./Quotation.js";
import crm_meetings from "./CRMMeeting.js";
import salary_structures from "./SalaryStructure.js";
import payroll_runs from "./PayrollRun.js";
import holidays from "./Holiday.js";
import status_configs from "./StatusConfig.js";
import status_mappings from "./StatusMapping.js";
import dashboard_widgets from "./DashboardWidget.js";
import activity_logs from "./ActivityLog.js";
import time_tracker_sessions from "./TimeTrackerSession.js";
import workflows from "./Workflow.js";
import wfh_requests from "./WFHRequest.js";
import comp_off_requests from "./CompOffRequest.js";
import resources from "./Resource.js";
import capabilities from "./Capability.js";
import grants from "./Grant.js";
import attendance_policies from "./AttendancePolicy.js";
import leave_transactions from "./LeaveTransaction.js";
import payments from "./Payment.js";
import general_settings from "./GeneralSettings.js";
import operational_events from "./OperationalEvent.js";
import notificationrules from "./NotificationRule.js";
import notification_deliveries from "./NotificationDelivery.js";
import permission_audits from "./PermissionAudit.js";
import permissionversions from "./PermissionVersion.js";
import job_categories from "./JobCategory.js";
import job_types from "./JobType.js";
import crm_activities from "./CRMActivity.js";
import job_openings from "./JobOpening.js";
import candidates from "./Candidate.js";
import onboardings from "./Onboarding.js";
import onboarding_templates from "./OnboardingTemplate.js";
import employee_documents from "./EmployeeDocument.js";
import employee_life_cycle_histories from "./EmployeeLifecycleHistory.js";
import company from "./Company.js";
import serviceproviders from "./ServiceProvider.js";
import contacts from "./Contact.js";
import quotation_revisions from "./QuotationRevision.js";
import order_acknowledgements from "./OrderAcknowledgement.js";
import payment_journals from "./PaymentJournal.js";
import clients_ledgers from "./ClientLedger.js";
import period_closures from "./PeriodClosure.js";
import assets_categories from "./AssetCategory.js";
import assets from "./Asset.js";
import assets_allocations from "./AssetAllocation.js";
import assets_incidents from "./AssetIncident.js";
import assets_repairs from "./AssetRepair.js";
import assets_vendors from "./AssetVendor.js";
import assets_purchases from "./AssetPurchase.js";
import assets_invoices from "./AssetInvoice.js";
import assets_payments from "./AssetPayment.js";
import assets_stock_ledgers from "./AssetStockLedger.js";
import ticket_comments from "./TicketComment.js";
import ticket_comment_reads from "./TicketCommentRead.js";
import ticket_attachments from "./TicketAttachment.js";
import ticket_activity_logs from "./TicketActivityLog.js";
import ticket_assignments from "./TicketAssignment.js";
import ticket_participants from "./TicketParticipant.js";
import ticket_status_history from "./TicketStatusHistory.js";
import sprints from "./Sprint.js";
import employee_task_queues from "./EmployeeTaskQueue.js";
import employee_task_queue_requests from "./EmployeeTaskQueueRequest.js";
export const MODULE_METADATA = {
  core: { name: 'Core Platform & System Engine', description: 'Essential core settings, security policies, roles, sessions, and system audit logs', icon: 'Shield', isCore: true },
  hrms: { name: 'HRMS Core Personnel Suite', description: 'Unified personnel suite: employee lifecycle, onboardings, employee documents, and HR policies', icon: 'Users', isCore: false },
  attendance: { name: 'Attendance & Leave Management', description: 'Daily attendance tracking, shift scheduling, leaves, regularizations, and WFH requests', icon: 'Clock', isCore: false },
  payroll: { name: 'Payroll Engine & Compensation', description: 'Salary structures, monthly payroll runs, expenses, and payment journals', icon: 'DollarSign', isCore: false },
  tasks: { name: 'Tasks & Agile Project Tracker', description: 'Sprint planning, tasks, task queues, and project types', icon: 'CheckSquare', isCore: false },
  tickets: { name: 'Helpdesk & Ticket System', description: 'Support tickets, internal comments, attachments, status history, and assignments', icon: 'LifeBuoy', isCore: false },
  crm: { name: 'CRM & Client Management', description: 'Client leads, meetings, quotations, order acknowledgements, and client ledgers', icon: 'Briefcase', isCore: false },
  assets: { name: 'Asset Lifecycle Management', description: 'Asset catalog, allocations, repairs, incidents, purchases, and vendors', icon: 'Package', isCore: false },
  recruitment: { name: 'Recruitment & Job Openings', description: 'Job openings, categories, candidate tracking, and interviews', icon: 'UserPlus', isCore: false },
  feed: { name: 'Team Feeds & Notifications', description: 'Company announcements, channel feeds, team messaging, and notifications', icon: 'Bell', isCore: false },
};

export const MODULE_DEFINITIONS = {
  core: [
    'general_settings', 'access_policies', 'roles', 'session', 'audit_log', 'error_log',
    'sidebars', 'api_hit_logs', 'capabilities', 'grants', 'status_configs', 'status_mappings', 'activity_logs',
    'notifications', 'notification_receptionists', 'notification_preferences', 'notification_rules', 'notification_deliveries',
    'employees', 'departments', 'designations', 'company', 'clients', 'contacts', 'service_providers',
    'products', 'project_types',
    'dashboard_widgets', 'email_configs', 'permission_audits', 'permission_versions', 'workflows'
  ],
  hrms: [
    'employee_documents', 'employee_lifecycle_histories', 'employee_life_cycle_histories',
    'onboardings', 'onboarding_templates', 'hr_policies', 'hrpolicies'
  ],
  attendance: [
    'attendances', 'shifts', 'shift_assignments', 'shiftassignments', 'attendance_policies', 'regularizations', 'wfh_requests', 'comp_off_requests', 'holidays',
    'leaves', 'leave_types', 'leave_policy', 'leavepolicy', 'leave_transactions'
  ],
  payroll: [
    'payrolls', 'payroll_runs', 'salary_structures', 'expenses', 'payments', 'payment_journals'
  ],
  tasks: [
    'tasks', 'task_types', 'sprints', 'todos', 'employee_task_queues', 'employee_task_queue_requests'
  ],
  tickets: [
    'tickets', 'ticket_comments', 'ticket_comment_reads', 'ticket_attachments',
    'ticket_activity_logs', 'ticket_assignments', 'ticket_participants', 'ticket_status_history'
  ],
  crm: [
    'crm_activities', 'crm_meetings', 'quotations', 'quotation_revisions',
    'order_acknowledgements', 'client_ledgers', 'period_closures', 'reference_types', 'lead_types'
  ],
  assets: [
    'assets', 'assets_categories', 'asset_allocations', 'assets_incidents', 'assets_repairs', 'assets_vendors', 'assets_purchases', 'assets_invoices', 'assets_payments', 'assets_stock_ledgers'
  ],
  recruitment: [
    'job_categories', 'job_types', 'job_openings', 'candidates'
  ],
  feed: [
    'feed_groups', 'feed_channels', 'feed_posts', 'feed_comments', 'team_messages', 'comments_threads'
  ]
};

const staticModelMap = {
  general_settings,
  access_policies,
  employees,
  departments,
  designations,
  leave_types,
  leavepolicy,
  attendances,
  sidebars,
  task_types,
  clients,
  daily_activities,
  api_hit_logs,
  project_types,
  roles,
  notifications,
  leaves,
  tasks,
  comments_threads,
  team_messages,
  session,
  todos,
  auditlog,
  errorlog,
  expenses,
  payrolls,
  tickets,
  shifts,
  shiftassignments,
  hrpolicies,
  agents,
  agent_tokens,
  email_configs,
  milestones,
  regularizations,
  reference_types,
  lead_types,
  feed_groups,
  feed_channels,
  feed_posts,
  feed_comments,
  NotificationReceptionist,
  notification_preferences,
  notificationrules,
  notification_deliveries,
  products,
  quotations,
  crm_meetings,
  order_acknowledgements,
  salary_structures,
  payroll_runs,
  holidays,
  status_configs,
  status_mappings,
  dashboard_widgets,
  activity_logs,
  time_tracker_sessions,
  workflows,
  ticket_comments,
  ticket_comment_reads,
  ticket_attachments,
  ticket_activity_logs,
  ticket_assignments,
  ticket_participants,
  ticket_status_history,
  wfh_requests,
  comp_off_requests,
  resources,
  assets_categories,
  assets,
  assets_allocations,
  assets_incidents,
  assets_repairs,
  assets_vendors,
  assets_purchases,
  assets_invoices,
  assets_payments,
  assets_stock_ledgers,
  capabilities,
  grants,
  attendance_policies,
  leave_transactions,
  payments,
  job_categories,
  job_types,
  crm_activities,
  job_openings,
  candidates,
  onboardings,
  onboarding_templates,
  company,
  serviceproviders,
  contacts,
  quotation_revisions,
  payment_journals,
  clients_ledgers,
  period_closures,
  sprints,
  employee_task_queues,
  employee_task_queue_requests,
  operational_events,
  employee_documents,
  employee_life_cycle_histories,
  permission_audits,
  permissionversions,
};

/**
 * Compile tenant models dynamically on a target database connection.
 * Resolves static baseline models AND dynamic ModelDefinition schemas from Global DB.
/**
 * Resolves the set of allowed model keys for a given tenant based on enabledModules.
 * Reuses MODULE_DEFINITIONS as single source of truth.
 * @param {Array<string>} enabledModules
 * @returns {Set<string>|null} Set of allowed model keys, or null if all modules allowed.
 */
export function getAllowedModelKeys(enabledModules = ['*']) {
  const isAllModules = !enabledModules || enabledModules.includes('*') || enabledModules.length === 0;
  if (isAllModules) return null;

  const allowedModelKeys = new Set((MODULE_DEFINITIONS.core || []).map(k => k.toLowerCase()));

  for (const mod of enabledModules) {
    const modKey = typeof mod === 'string' ? mod.toLowerCase() : '';
    const modKeys = MODULE_DEFINITIONS[modKey];
    if (Array.isArray(modKeys)) {
      modKeys.forEach((key) => allowedModelKeys.add(key.toLowerCase()));
    }
  }

  return allowedModelKeys;
}

/**
 * Compile tenant models dynamically on a target database connection.
 * Resolves static baseline models AND dynamic ModelDefinition schemas from Global DB.
 * @param {mongoose.Connection} conn - Connection object returned by baseConn.useDb(dbName)
 * @param {Array<string>} enabledModules - Array of module IDs e.g. ['hrms', 'attendance'] or ['*']
 * @returns {Object} Key-value store of modelName -> compiled Mongoose Model
 */
export async function compileTenantModels(conn, enabledModules = ['*']) {
  const allowedModelKeys = getAllowedModelKeys(enabledModules);
  if (allowedModelKeys) {
    // Query Global DB Module collection for dynamic user-configured collection mappings
    try {
      const { getGlobalModels } = await import('./global/index.js');
      const { Module } = getGlobalModels();
      if (Module) {
        const dbMods = await Module.find({
          $or: [
            { _id: { $in: enabledModules.filter((m) => typeof m === 'string' && m.match(/^[0-9a-fA-F]{24}$/)) } },
            { moduleId: { $in: enabledModules } },
          ],
        }).lean();

        for (const dbMod of dbMods) {
          if (Array.isArray(dbMod.collections)) {
            dbMod.collections.forEach((col) => allowedModelKeys.add(col.toLowerCase()));
          }
        }
      }
    } catch (_) {
      // Non-blocking fallback
    }
  }

  const compiledModels = {};

  // 1. Compile static baseline models
  for (const [key, modelOrSchema] of Object.entries(staticModelMap)) {
    if (!modelOrSchema) continue;

    if (allowedModelKeys && !allowedModelKeys.has(key)) {
      continue;
    }

    let Model = null;
    if (modelOrSchema.schema) {
      const modelName = modelOrSchema.modelName || key;
      Model = conn.models[modelName] || conn.model(modelName, modelOrSchema.schema);
    } else if (modelOrSchema instanceof mongoose.Schema) {
      Model = conn.models[key] || conn.model(key, modelOrSchema);
    } else {
      Model = modelOrSchema;
    }

    if (Model) {
      const modelName = Model.modelName || key;
      const collectionName = Model.collection?.name || key;

      compiledModels[key] = Model;
      compiledModels[key.toLowerCase()] = Model;
      compiledModels[modelName] = Model;
      compiledModels[modelName.toLowerCase()] = Model;
      if (collectionName) {
        compiledModels[collectionName] = Model;
        compiledModels[collectionName.toLowerCase()] = Model;
      }
    }
  }

  // 2. Resolve dynamic ModelDefinition schemas from Global DB (No-Code Engine)
  try {
    const { getGlobalModels } = await import('./global/index.js');
    const { ModelDefinition } = getGlobalModels();
    if (ModelDefinition) {
      const dynamicDefs = await ModelDefinition.find({ status: 'Active' }).lean();
      for (const def of dynamicDefs) {
        const key = def.collectionName || def.modelName.toLowerCase();
        if (allowedModelKeys && !allowedModelKeys.has(key) && !allowedModelKeys.has(def.moduleId)) {
          continue;
        }

        const dynamicSchema = buildSchemaFromDefinition(def);
        compiledModels[key] = conn.models[def.modelName] || conn.model(def.modelName, dynamicSchema);
        compiledModels[def.modelName] = compiledModels[key];
      }
    }
  } catch (_) {
    // Non-blocking fallback if Global DB ModelDefinition is not queried
  }

  return compiledModels;
}

export default staticModelMap;
