import { StepStatus } from '../core/ExecutionStep.js';

export class PolicyEngine {
  constructor({ toolRegistry } = {}) {
    this.toolRegistry = toolRegistry;
  }

  async evaluate(step, ctx) {
    step.setStatus(StepStatus.POLICY_EVALUATION);

    const isSuperAdmin = ctx.user?.isSuperAdmin || ctx.roleMeta?.isSuperAdmin || ctx.role === 'Super Admin';

    // Mutating actions require confirmation
    if (step.requiresConfirmation && !ctx.intent?.isConfirmation && !isSuperAdmin && !ctx.confirmed) {
      step.setStatus(StepStatus.AWAITING_CONFIRMATION);
      step.setPolicyDecision({
        approved: false,
        reason: `Action "${step.tool}" requires explicit user confirmation before modifying records.`,
      });
      return false;
    }

    step.setPolicyDecision({
      approved: true,
      reason: 'Action approved under security policy.',
    });
    return true;
  }
}

export default PolicyEngine;
