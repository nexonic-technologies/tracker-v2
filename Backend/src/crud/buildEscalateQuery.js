import { getModel } from "../utils/appRegistry.js";
import escalationEngine from "../utils/workflow/escalationEngine.js";

/**
 * Handles custom 'escalate' action dynamically for any model
 */
export default async function buildEscalateQuery(ctx) {
  const {
    role,
    userId,
    modelName,
    docId,
    filter = {},
    body = {},
    policy,
    tenantContext
  } = ctx;

  const Model = tenantContext?.getModel ? tenantContext.getModel(modelName) : getModel(modelName);
  if (!Model) throw new Error(`Invalid model: ${modelName}`);

  // 1. Check permission using standard update policy
  if (!policy?.permissions?.update) {
    throw new Error(`⛔ Role "${role}" has no permission to escalate/update "${modelName}"`);
  }

  // 2. Fetch the document to escalate
  const doc = docId 
    ? await Model.findById(docId) 
    : await Model.findOne(filter);

  if (!doc) {
    throw new Error(`${modelName} document not found`);
  }

  const reason = body.reason || "Manually escalated via system action";

  // 3. Trigger escalation via dynamic EscalationEngine
  const result = await escalationEngine.escalate(modelName, doc, "Manual", reason);

  if (!result.success) {
    throw new Error(`Escalation failed: ${result.reason}`);
  }

  return {
    success: true,
    message: `Escalation successful to level ${result.level}`,
    escalatedTo: result.targetUserId,
    escalationLevel: result.level
  };
}
