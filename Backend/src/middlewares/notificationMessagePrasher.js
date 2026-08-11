/**
 * Generate notification message based on type/status
 * @param {string} userName - Name of the employee who triggered the event
 * @param {object} status - Payload for message formatting
 * @param {string} modelName - Type of model (attendances, leaves, tasks, etc.)
 * @returns {string} - Formatted notification message
 */
export function generateNotification(userName, status, modelName) {
  // ==========================================================
  // ATTENDANCE (NO CHANGE — YOUR ORIGINAL CODE)
  // ==========================================================
  if (modelName === "attendances") {
    switch (status) {
      case "Present":
        return `${userName} has checked in for today.`;
      case "Leave":
        return `${userName} applied for leave (${status.leaveType || "N/A"
          }), kindly review it.`;
      case "pending":
        return `${userName} requested ${status.request || "attendance update"
          }, kindly review it.`;
      case "Overtime":
        return `${userName} requested ${status.hours || 0
          } hour(s) overtime, kindly review it.`;
      case "Early check-out":
        return `${userName} has checked out early, kindly review it.`;
      default:
        return `${userName} has requested ${status}`;
    }
  }

  // ==========================================================
  // LEAVES (NO CHANGE — YOUR EXISTING FORMAT)
  // ==========================================================
  if (modelName === "leaves") {
    if (status?.leaveReason) {
      return `${userName} has request ${status?.leaveName} for ${status?.leaveReason}`;
    } else {
      return `${userName} your ${status?.leaveName} has been ${status?.leaveStatus}`;
    }
  }

  // ==========================================================
  // TASKS (NEW)
  // status.type can be: "created", "assigned", "status", "comment"
  // ==========================================================
  if (modelName === "tasks") {
    switch (status?.type) {
      case "created":
        return `${userName} created a new task`;

      case "assigned":
        return `${userName} assigned you to a task`;

      case "status":
        return `${userName} updated task status to ${status.newStatus}`;

      case "comment":
        if (status.isMention) {
          return `${userName} mentioned you in a comment`;
        }
        return `${userName} commented on a task`;

      default:
        return `${userName} updated a task`;
    }
  }

  // ==========================================================
  // EMPLOYEES (HR Management)
  // ==========================================================
  if (modelName === "employees") {
    switch (status?.type) {
      case "created":
        return `New employee ${userName} has been added to the system`;
      case "profile_updated":
        return `${userName} updated their profile information`;
      case "status_changed":
        return `${userName}'s employment status changed to ${status.newStatus}`;
      case "promotion":
        return `${userName} has been promoted to ${status.newDesignation}`;
      case "department_transfer":
        return `${userName} has been transferred to ${status.newDepartment}`;
      default:
        return `${userName}'s employee record was updated`;
    }
  }

  // ==========================================================
  // DAILY ACTIVITIES
  // ==========================================================
  if (modelName === "daily_activities") {
    switch (status?.type) {
      case "submitted":
        return `${userName} submitted daily activity report`;
      case "approved":
        return `Your daily activity report has been approved by ${userName}`;
      case "rejected":
        return `Your daily activity report was rejected by ${userName}`;
      default:
        return `${userName} updated daily activity`;
    }
  }

  // ==========================================================
  // PERFORMANCE & APPRAISALS
  // ==========================================================
  if (modelName === "appraisals" || modelName === "performance") {
    switch (status?.type) {
      case "review_started":
        return `${userName} started your performance review`;
      case "self_assessment":
        return `${userName} completed self-assessment`;
      case "review_completed":
        return `Your performance review has been completed by ${userName}`;
      case "goal_assigned":
        return `${userName} assigned you new performance goals`;
      default:
        return `${userName} updated performance record`;
    }
  }

  // ==========================================================
  // DEPARTMENTS & ORGANIZATIONAL
  // ==========================================================
  if (modelName === "departments") {
    switch (status?.type) {
      case "created":
        return `New department '${status.departmentName}' has been created`;
      case "head_assigned":
        return `${userName} has been assigned as department head`;
      case "member_added":
        return `You have been added to ${status.departmentName} department`;
      default:
        return `Department information updated by ${userName}`;
    }
  }

  // ==========================================================
  // PAYROLL & SALARY
  // ==========================================================
  if (modelName === "payroll" || modelName === "salary") {
    switch (status?.type) {
      case "processed":
        return `Your salary for ${status.month} has been processed`;
      case "slip_generated":
        return `Salary slip for ${status.month} is now available`;
      case "bonus_added":
        return `${userName} added bonus of ${status.amount} to your account`;
      case "deduction_applied":
        return `Deduction of ${status.amount} applied by ${userName}`;
      default:
        return `Payroll update by ${userName}`;
    }
  }

  // ==========================================================
  // EXPENSES & REIMBURSEMENTS
  // ==========================================================
  if (modelName === "expenses" || modelName === "reimbursements") {
    switch (status?.type) {
      case "submitted":
        return `${userName} submitted expense claim of ${status.amount}`;
      case "approved":
        return `Your expense claim has been approved by ${userName}`;
      case "rejected":
        return `Your expense claim was rejected by ${userName}: ${status.reason}`;
      case "reimbursed":
        return `Expense reimbursement of ${status.amount} has been processed`;
      default:
        return `${userName} updated expense record`;
    }
  }

  // ==========================================================
  // TRAINING & DEVELOPMENT
  // ==========================================================
  if (modelName === "training" || modelName === "courses") {
    switch (status?.type) {
      case "enrolled":
        return `${userName} enrolled you in '${status.courseName}' training`;
      case "completed":
        return `${userName} completed '${status.courseName}' training`;
      case "certificate_issued":
        return `Certificate issued for '${status.courseName}' completion`;
      case "reminder":
        return `Reminder: '${status.courseName}' training starts ${status.startDate}`;
      default:
        return `Training update by ${userName}`;
    }
  }

  // ==========================================================
  // ANNOUNCEMENTS & COMMUNICATIONS
  // ==========================================================
  if (modelName === "announcements" || modelName === "communications") {
    switch (status?.type) {
      case "company_wide":
        return `Company Announcement: ${status.title}`;
      case "department":
        return `Department Announcement: ${status.title}`;
      case "urgent":
        return `🚨 URGENT: ${status.title}`;
      case "policy_update":
        return `Policy Update: ${status.title} - Please review`;
      default:
        return `New announcement: ${status.title}`;
    }
  }

  // ==========================================================
  // MEETINGS & CALENDAR
  // ==========================================================
  if (modelName === "meetings" || modelName === "calendar") {
    switch (status?.type) {
      case "scheduled":
        return `${userName} scheduled a meeting: ${status.title}`;
      case "reminder":
        return `Meeting reminder: ${status.title} in ${status.timeLeft}`;
      case "cancelled":
        return `Meeting cancelled: ${status.title}`;
      case "rescheduled":
        return `Meeting rescheduled: ${status.title} to ${status.newTime}`;
      default:
        return `Meeting update by ${userName}`;
    }
  }

  // ==========================================================
  // FEED POSTS & COMMENTS
  // ==========================================================
  if (modelName === "feed_posts") {
    switch (status?.type) {
      case "mention":
        return `${userName} mentioned you in a post`;
      case "group_post":
        return `${userName} posted in ${status.groupName}`;
      case "channel_post":
        return `${userName} posted in ${status.channelName}`;
      case "reaction":
        return `${userName} reacted to your post`;
      default:
        return `${userName} created a post`;
    }
  }

  if (modelName === "feed_comments") {
    switch (status?.type) {
      case "comment":
        return `${userName} commented on a post`;
      default:
        return `${userName} added a comment`;
    }
  }

  // ==========================================================
  // GENERIC FALLBACK
  // ==========================================================
  return `${userName} performed an update`;
}
