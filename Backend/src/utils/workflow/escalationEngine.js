import models from "../../models/Collection.js";

import fcmService from "../notification/fcmService.js";
import { sendNotification } from "../notificationService.js";
import { resolveActor } from "./actorResolver.js";
import NotificationDispatcher from "../notification/NotificationDispatcher.js";

class EscalationEngine {
  /**
   * Find matching active escalation workflow configuration for a document
   * @param {String} modelName 
   * @param {Object} document 
   */
  async findMatchingConfig(modelName, document) {
    try {
      const deptId = document.departmentId;
      const priority = document.priorityLevel || document.priority;

      // 1. Try to find config with both matching department and priority
      let query = { modelName, triggerType: 'Escalation', isActive: true };
      if (deptId) query['conditions.departmentId'] = deptId;
      if (priority) query['conditions.priorityLevel'] = priority;

      let config = await models.workflows.findOne(query).lean();
      
      // 2. Fallback: query without priority matching
      if (!config && priority) {
        delete query['conditions.priorityLevel'];
        config = await models.workflows.findOne(query).lean();
      }

      // 3. Fallback: query global/default model config (no department or priority)
      if (!config) {
        config = await models.workflows.findOne({ 
          modelName, 
          triggerType: 'Escalation',
          isActive: true,
          'conditions.departmentId': { $exists: false }
        }).lean();
      }

      return config;
    } catch (error) {
      console.error("[EscalationEngine] Error searching config:", error);
      return null;
    }
  }

  /**
   * Performs the escalation step updates on the document
   * @param {String} modelName 
   * @param {Object} document 
   * @param {String} triggeredBy - 'Auto' | 'Manual'
   * @param {String} [reason] - Optional manual trigger reason
   */
  async escalate(modelName, document, triggeredBy = 'Auto', reason = '') {
    try {
      const config = await this.findMatchingConfig(modelName, document);
      if (!config || !config.steps || config.steps.length === 0) {
        console.warn(`[EscalationEngine] No active escalation policy found for ${modelName}`);
        return { success: false, reason: "No policy found" };
      }

      const currentLevel = document.escalationLevel || 0;
      const nextStep = config.steps.find(s => s.level === currentLevel + 1);

      if (!nextStep) {
        console.log(`[EscalationEngine] Document ${document._id} is already at the maximum escalation level (${currentLevel}).`);
        return { success: false, reason: "Max level reached" };
      }

      // Resolve the escalation target actor
      const empId = document.employeeId || document.createdBy;
      const deptId = document.departmentId;
      const targetUserId = await resolveActor(nextStep, empId, deptId);

      if (!targetUserId) {
        console.error(`[EscalationEngine] Failed to resolve target actor for level ${nextStep.level}`);
        return { success: false, reason: "Failed to resolve actor" };
      }

      // Save previous assignees/manager
      const previousAssignees = document.assignedTo || (document.managerId ? [document.managerId] : []);

      // Record Escalation History
      if (!document.escalationHistory) {
        document.escalationHistory = [];
      }

      document.isEscalated = true;
      document.escalationLevel = nextStep.level;
      document.escalationHistory.push({
        level: nextStep.level,
        escalatedTo: targetUserId,
        triggeredBy,
        reason: reason || `Automatically escalated to level ${nextStep.level} due to SLA timeout.`,
        previousAssignees,
        escalatedAt: new Date()
      });

      // Apply step actions
      const actions = nextStep.actions || ['SendNotification'];

      if (actions.includes('ChangeAssignee')) {
        if (Array.isArray(document.assignedTo)) {
          if (!document.assignedTo.some(id => id.toString() === targetUserId.toString())) {
            document.assignedTo.push(targetUserId);
          }
        } else {
          document.managerId = targetUserId;
        }
      }

      if (actions.includes('AddFollower') && Array.isArray(document.followers)) {
        if (!document.followers.some(f => f.toString() === targetUserId.toString())) {
          document.followers.push(targetUserId);
        }
      }

      if (actions.includes('UpdateStatus') && nextStep.updateStatusTo) {
        document.status = nextStep.updateStatusTo;
      }

      await document.save();

      // Dispatch Notifications
      if (actions.includes('SendNotification')) {
        await this.notifyEscalation(modelName, document, targetUserId, nextStep.level);
      }

      console.log(`[EscalationEngine] Escalated ${modelName} ${document._id} to level ${nextStep.level} (User: ${targetUserId})`);
      return { success: true, level: nextStep.level, targetUserId };
    } catch (error) {
      console.error(`[EscalationEngine] Escalation failed for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Helper to notify targets of escalation
   */
  async notifyEscalation(modelName, document, targetUserId, level) {
    try {
      const typeLabel = modelName.toUpperCase();
      const title = `Escalated: ${typeLabel} SLA Breach (L${level})`;
      const message = `Attention: ${typeLabel} request ${document.ticketId || document._id} has breached SLA limits and is escalated to you (Level ${level}).`;

      // Dispatch unified escalation notification
      await NotificationDispatcher.dispatch({
        recipients: [targetUserId.toString()],
        sender: document.employeeId || document.createdBy,
        title,
        message,
        type: `${modelName}_escalation`,
        meta: { model: modelName, modelId: document._id },
        path: `/${modelName === 'tickets' ? 'tickets' : 'tasks'}/${document._id}`
      });
    } catch (error) {
      console.error("[EscalationEngine] Failed to dispatch notifications:", error.message);
    }
  }
}

export default new EscalationEngine();
