import models from "../../models/Collection.js";

import fcmService from "../../services/fcmService.js";
import { sendNotification } from "../notificationService.js";
import { resolveActor } from "../workflow/actorResolver.js";
import NotificationDispatcher from "../../services/NotificationDispatcher.js";

class ApprovalEngine {
  /**
   * Initialize approval workflow for a request (Leave or Regularization)
   * @param {String} modelName - 'leaves' or 'regularizations'
   * @param {Object} document - Mongoose document instance
   */
  async initializeWorkflow(modelName, document) {
    try {
      const deptId = document.departmentId;
      const empId = document.employeeId;

      // Find active approval workflow for this department and request type
      let workflow = null;
      if (deptId) {
        workflow = await models.workflows.findOne({
          modelName,
          triggerType: 'Approval',
          'conditions.departmentId': deptId,
          isActive: true
        }).lean();
      }

      if (!workflow || !workflow.steps || workflow.steps.length === 0) {
        // Fallback: Default reporting manager single approval
        const employee = await models.employees.findById(empId)
          .populate('professionalInfo.reportingManager')
          .lean();

        const fallbackManagerId = employee?.professionalInfo?.reportingManager?._id;
        if (!fallbackManagerId) {
          throw new Error("No reporting manager or workflow steps found for this employee.");
        }

        document.managerId = fallbackManagerId;
        document.currentStepIndex = 0;
        document.approvals = [{
          stepIndex: 0,
          approverId: fallbackManagerId,
          approverType: 'Reporting Manager',
          status: 'Pending'
        }];
        await document.save();
        await this.notifyApprover(modelName, document, fallbackManagerId);
        return;
      }

      // Populate workflow details
      document.workflowId = workflow._id;
      document.currentStepIndex = 0;
      document.approvals = [];

      // Resolve the first step approver
      const firstStep = workflow.steps[0];
      const resolvedApproverId = await this.resolveApprover(firstStep, empId, deptId);

      if (!resolvedApproverId) {
        throw new Error(`Failed to resolve approver for step 1 of type: ${firstStep.approverType}`);
      }

      document.managerId = resolvedApproverId;

      // Initialize steps structure in document
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const stepApproverId = i === 0 ? resolvedApproverId : null; // lazy resolve subsequent steps
        document.approvals.push({
          stepIndex: i,
          approverId: stepApproverId,
          approverType: step.actorType || step.approverType,
          status: i === 0 ? 'Pending' : 'Pending', // initialized as pending
        });
      }

      await document.save();
      await this.notifyApprover(modelName, document, resolvedApproverId);
    } catch (error) {
      console.error(`[ApprovalEngine] Initialization failed for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Advance approval workflow to the next step or finalize
   * @param {Object} document - Mongoose document instance
   * @param {String} approverId - User ID actioning the step
   * @param {String} status - 'Approved' or 'Rejected'
   * @param {String} comment - Action comment
   */
  async advanceWorkflow(document, approverId, status, comment) {
    try {
      const modelName = document.constructor.modelName; // Mongoose collection name e.g. 'leaves'

      // Auto-fallback check for legacy or uninitialized workflow records
      if (!document.approvals || document.approvals.length === 0) {
        document.approvals = [{
          stepIndex: 0,
          status: 'Pending',
          approverId: document.managerId || approverId,
          approverType: 'Manager'
        }];
        document.currentStepIndex = 0;
      }

      const currentIndex = document.currentStepIndex || 0;
      const activeApproval = document.approvals.find(a => a.stepIndex === currentIndex);

      if (!activeApproval) {
        throw new Error("Active approval step not found in the workflow.");
      }

      // Update current step
      activeApproval.status = status;
      activeApproval.comment = comment;
      activeApproval.approverId = approverId;
      activeApproval.actionedAt = new Date();

      if (status === 'Rejected') {
        document.status = 'Rejected';
        document.rejectedBy = approverId;
        document.rejectedAt = new Date();

        // Dynamic comments resolution
        if (document.schema.path('approverComment')) {
          document.approverComment = comment;
        } else if (document.schema.path('managerComments')) {
          document.managerComments = comment;
        } else if (document.schema.path('comments')) {
          document.comments = comment;
        } else if (document.schema.path('notes')) {
          document.notes = comment;
        }

        await document.save();
        await this.notifyEmployee(modelName, document, 'Rejected', approverId);
        return { finalized: true, status: 'Rejected' };
      }

      // If status is 'Approved', check if there are subsequent steps
      const totalSteps = document.approvals.length;
      if (currentIndex + 1 < totalSteps) {
        // Load the workflow configuration
        const workflow = await models.workflows.findById(document.workflowId).lean();
        if (!workflow) {
          throw new Error("Workflow configuration not found.");
        }

        const nextIndex = currentIndex + 1;
        const nextStepConfig = workflow.steps[nextIndex];
        const nextApproverId = await this.resolveApprover(nextStepConfig, document.employeeId, document.departmentId);

        if (!nextApproverId) {
          throw new Error(`Failed to resolve next step approver of type: ${nextStepConfig.approverType}`);
        }

        document.currentStepIndex = nextIndex;
        document.managerId = nextApproverId;
        document.approvals[nextIndex].approverId = nextApproverId;
        document.approvals[nextIndex].status = 'Pending';

        await document.save();
        await this.notifyApprover(modelName, document, nextApproverId);
        return { finalized: false, status: 'Pending' };
      }

      // All steps approved -> Finalize request
      document.status = 'Approved';
      document.approvedBy = approverId;
      document.approvedAt = new Date();

      // Dynamic comments resolution
      if (document.schema.path('approverComment')) {
        document.approverComment = comment;
      } else if (document.schema.path('managerComments')) {
        document.managerComments = comment;
      } else if (document.schema.path('comments')) {
        document.comments = comment;
      } else if (document.schema.path('notes')) {
        document.notes = comment;
      }

      await document.save();
      await this.notifyEmployee(modelName, document, 'Approved', approverId);
      return { finalized: true, status: 'Approved' };
    } catch (error) {
      console.error("[ApprovalEngine] Advance workflow error:", error);
      throw error;
    }
  }

  /**
   * Escalate active pending steps to next level due to timeout
   */
  async escalate(document) {
    try {
      const modelName = document.constructor.modelName;
      const currentIndex = document.currentStepIndex;
      const activeApproval = document.approvals.find(a => a.stepIndex === currentIndex);

      if (!activeApproval || activeApproval.status !== 'Pending') return;

      // Mark current step as Escalated
      activeApproval.status = 'Escalated';
      activeApproval.comment = 'Automatically escalated due to approval timeout.';
      activeApproval.actionedAt = new Date();

      // Resolve the next hierarchy level for escalation
      let escalatedApproverId = null;

      if (activeApproval.approverType === 'Reporting Manager') {
        // Escalate to Department Manager
        const dept = await models.departments.findById(document.departmentId).select('manager').lean();
        escalatedApproverId = dept?.manager;
      }

      if (!escalatedApproverId || escalatedApproverId.toString() === activeApproval.approverId?.toString()) {
        // Fallback: Escalate to HR Role
        const hrRole = await models.roles.findOne({ name: { $regex: /HR/i }, isActive: true }).select('_id').lean();
        if (hrRole) {
          const hrEmp = await models.employees.findOne({ 'professionalInfo.role': hrRole._id, status: 'Active' }).select('_id').lean();
          escalatedApproverId = hrEmp?._id;
        }
      }

      if (!escalatedApproverId) {
        console.warn(`[ApprovalEngine] Could not resolve escalation path for document ${document._id}`);
        // Restore to Pending since we couldn't escalate
        activeApproval.status = 'Pending';
        activeApproval.comment = undefined;
        return;
      }

      document.managerId = escalatedApproverId;

      // Update or create next step if it doesn't exist
      const totalSteps = document.approvals.length;
      if (currentIndex + 1 < totalSteps) {
        // Direct the workflow to execute next step with escalated approver
        document.currentStepIndex = currentIndex + 1;
        document.approvals[currentIndex + 1].approverId = escalatedApproverId;
        document.approvals[currentIndex + 1].status = 'Pending';
      } else {
        // Add a new ad-hoc escalation step at the end
        document.approvals.push({
          stepIndex: totalSteps,
          approverId: escalatedApproverId,
          approverType: 'HR (Escalated)',
          status: 'Pending'
        });
        document.currentStepIndex = totalSteps;
      }

      await document.save();

      // Send notifications to escalated manager
      await this.notifyApprover(modelName, document, escalatedApproverId, true);
    } catch (error) {
      console.error("[ApprovalEngine] Escalation failed:", error);
    }
  }

  /**
  async resolveApprover(step, employeeId, departmentId) {
    return resolveActor(step, employeeId, departmentId);
  }

  /**
   * Send notification to current reviewer
   */
  async notifyApprover(modelName, document, approverId, isEscalation = false) {
    try {
      let typeLabel = 'Request';
      let relatedModel = 'System';
      if (modelName === 'leaves') {
        typeLabel = 'Leave';
        relatedModel = 'Leave';
      } else if (modelName === 'regularizations') {
        typeLabel = 'Regularization';
        relatedModel = 'Regularization';
      } else if (modelName === 'assets_allocations') {
        typeLabel = 'Asset Allocation';
        relatedModel = 'AssetAllocation';
      } else if (modelName === 'assets_incidents') {
        typeLabel = 'Asset Incident';
        relatedModel = 'AssetIncident';
      } else if (modelName === 'employee_task_queue_requests') {
        typeLabel = 'Task Queue Request';
        relatedModel = 'EmployeeTaskQueueRequest';
      }

      const title = isEscalation ? `Escalated: ${typeLabel} Request` : `New ${typeLabel} Request`;
      const message = isEscalation
        ? `Escalated: Review ${document.employeeName || 'employee'}'s pending ${typeLabel} request.`
        : `${document.employeeName || 'An employee'} submitted a ${typeLabel} request requiring your review.`;

      // Dispatch unified notification
      await NotificationDispatcher.dispatch({
        recipients: [approverId.toString()],
        sender: document.employeeId || document.createdBy,
        title,
        message,
        type: `${modelName}_request`,
        meta: { model: modelName, modelId: document._id },
        path: `/${modelName}`
      });
    } catch (e) {
      console.error(`[ApprovalEngine] Notify approver failed:`, e.message);
    }
  }

  /**
   * Send notification to employee
   */
  async notifyEmployee(modelName, document, status, actionerId) {
    try {
      let typeLabel = 'Request';
      let relatedModel = 'System';
      if (modelName === 'leaves') {
        typeLabel = 'Leave';
        relatedModel = 'Leave';
      } else if (modelName === 'regularizations') {
        typeLabel = 'Regularization';
        relatedModel = 'Regularization';
      } else if (modelName === 'assets_allocations') {
        typeLabel = 'Asset Allocation';
        relatedModel = 'AssetAllocation';
      } else if (modelName === 'assets_incidents') {
        typeLabel = 'Asset Incident';
        relatedModel = 'AssetIncident';
      } else if (modelName === 'employee_task_queue_requests') {
        typeLabel = 'Task Queue Request';
        relatedModel = 'EmployeeTaskQueueRequest';
      }

      const actionName = status === 'Approved' ? 'approved' : 'rejected';
      const title = `${typeLabel} Request ${status}`;
      const message = `Your ${typeLabel} request has been ${actionName}.`;

      // Dispatch unified notification
      await NotificationDispatcher.dispatch({
        recipients: [(document.employeeId || document.createdBy).toString()],
        sender: actionerId,
        title,
        message,
        type: `${modelName}_status`,
        meta: { model: modelName, modelId: document._id },
        path: `/${modelName}`
      });
    } catch (e) {
      console.error(`[ApprovalEngine] Notify employee failed:`, e.message);
    }
  }
}

export default new ApprovalEngine();
