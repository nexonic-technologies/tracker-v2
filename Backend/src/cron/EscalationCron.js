import cron from "node-cron";
import models from "../models/Collection.js";

import escalationEngine from "../utils/workflow/escalationEngine.js";

// Non-terminal/active statuses map for different modules
const ACTIVE_STATUS_FILTERS = {
  leaves: { status: "Pending" },
  regularizations: { status: "Pending" },
  wfh_requests: { status: "Pending" },
  comp_off_requests: { status: "Pending" },
  assets_allocations: { status: "Pending" },
  assets_incidents: { status: "Pending" },
  tasks: { status: { $nin: ["Completed", "Done"] } },
  tickets: { status: { $nin: ["Resolved", "Closed"] } }
};

export const jobs = [
  {
    name: "EscalationCron",
    defaultExpression: "0 * * * *",
    run: async () => {
      try {
        const now = new Date();
        // console.log("🕐 [Cron] Scanning active escalation workflows...");

        // Fetch all active escalation configurations
        const activeConfigs = await models.workflows.find({ triggerType: "Escalation", isActive: true }).lean();

        for (const config of activeConfigs) {
          const modelName = config.modelName;
          const targetModel = models[modelName];

          if (!targetModel) {
            console.warn(`[EscalationCron] Model not found in collections registry: ${modelName}`);
            continue;
          }

          // Build base query
          const baseStatusFilter = ACTIVE_STATUS_FILTERS[modelName] || { status: { $nin: ["Approved", "Rejected", "Completed", "Closed", "Done", "Resolved"] } };

          const query = {
            ...baseStatusFilter,
            metaStatus: "active"
          };

          // Add conditions if configured
          if (config.conditions?.departmentId) {
            query.departmentId = config.conditions.departmentId;
          }

          if (config.conditions?.priorityLevel) {
            // Handle priority field variations across schemas
            query.$or = [
              { priorityLevel: config.conditions.priorityLevel },
              { priority: config.conditions.priorityLevel }
            ];
          }

          // Fetch documents matching query
          const documents = await targetModel.find(query);

          for (const doc of documents) {
            const currentLevel = doc.escalationLevel || 0;
            const nextStepConfig = config.steps.find(s => s.level === currentLevel + 1);

            if (!nextStepConfig) {
              // No further escalation levels configured
              continue;
            }

            const timeoutHours = nextStepConfig.timeoutHours || 72;

            // Determine base date: either last escalation timestamp or creation/update timestamp
            let baseDate = doc.updatedAt || doc.createdAt;
            if (doc.escalationHistory && doc.escalationHistory.length > 0) {
              // Sort escalation history to find the latest escalation date
              const sortedHistory = [...doc.escalationHistory].sort((a, b) => new Date(b.escalatedAt) - new Date(a.escalatedAt));
              baseDate = sortedHistory[0].escalatedAt;
            }

            const elapsedMs = now - new Date(baseDate);
            const limitMs = timeoutHours * 60 * 60 * 1000;

            if (elapsedMs >= limitMs) {
              console.log(`[EscalationCron] Auto-Escalating ${modelName} ID: ${doc._id} (L${currentLevel} -> L${nextStepConfig.level})`);
              await escalationEngine.escalate(modelName, doc, "Auto");
            }
          }
        }
      } catch (error) {
        console.error("❌ [EscalationCron] Failed scanning escalation timeouts:", error);
      }
    }
  }
];
