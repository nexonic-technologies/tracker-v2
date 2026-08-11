// models/collection.js
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
import leaves from "./Leave.js"
import tasks from "./Tasks.js"
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
import permission_audit from "./PermissionAudit.js";
import permissionversions from "./PermissionVersion.js";
import dashboard_schemas from "./DashboardSchema.js";

// Activity-Centric Work Model
import job_categories from "./JobCategory.js";
import job_types from "./JobType.js";

// CRM & Recruitment
import crm_activities from "./CRMActivity.js";
import job_openings from "./JobOpening.js";
import candidates from "./Candidate.js";
import onboardings from "./Onboarding.js";
import onboarding_templates from "./OnboardingTemplate.js";
import employee_documents from "./EmployeeDocument.js";
import employee_life_cycle_histories from "./EmployeeLifecycleHistory.js";
import company from "./Company.js";


// CRM Pipeline Models
import serviceproviders from "./ServiceProvider.js";
import contacts from "./Contact.js";
import quotation_revisions from "./QuotationRevision.js";
import order_acknowledgements from "./OrderAcknowledgement.js";
import payment_journals from "./PaymentJournal.js";
import clients_ledgers from "./ClientLedger.js";
import period_closures from "./PeriodClosure.js";

// Asset Management
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

// Ticket Sub-entities
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


const models = {
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
  // Asset Management
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
  // Activity-Centric Work Model
  job_categories,
  job_types,
  crm_activities,
  job_openings,
  candidates,
  onboardings,
  onboarding_templates,
  company,
  // CRM
  serviceproviders,
  contacts,
  quotations,
  quotation_revisions,
  order_acknowledgements,
  payment_journals,
  clients_ledgers,
  period_closures,
  sprints,
  employee_task_queues,
  employee_task_queue_requests,
  operational_events,
  employee_documents,
  employee_life_cycle_histories,
  permission_audit,
  permissionversions,
  dashboard_schemas,
};

import { getTenantModel } from "../tenant/tenantContext.js";
import { getCanonicalModelName } from "./canonicalModelMap.js";

const dynamicModelsProxy = new Proxy(models, {
  get(target, prop) {
    if (typeof prop === "symbol") return target[prop];

    // 1. Try active tenant database connection lookup
    const tenantModel = getTenantModel(prop);
    if (tenantModel) return tenantModel;

    // 2. Direct static target lookup
    if (target[prop]) return target[prop];

    // 3. Canonical model name lookup (e.g. ErrorLog, Session, ApiHitLog)
    const canonicalName = getCanonicalModelName(prop);
    if (target[canonicalName]) return target[canonicalName];

    // 4. Normalized string fallback (e.g. "error_logs" -> "errorlog", "sessions" -> "session")
    const lowerProp = String(prop).toLowerCase();
    if (target[lowerProp]) return target[lowerProp];

    const cleanProp = lowerProp.replace(/[^a-z0-9]/g, '');
    for (const k of Object.keys(target)) {
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanK === cleanProp || cleanK + 's' === cleanProp || cleanProp + 's' === cleanK) {
        return target[k];
      }
    }

    return target[prop];
  }
});

export default dynamicModelsProxy;


