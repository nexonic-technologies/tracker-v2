/**
 * Step Lifecycle States
 * @readonly
 * @enum {string}
 */
export const StepStatus = {
  PENDING: 'pending',
  POLICY_EVALUATION: 'policy_eval',
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  CONFIRMED: 'confirmed',
  BLOCKED: 'blocked',
  REJECTED: 'rejected',
  EXECUTING: 'executing',
  VERIFYING: 'verifying',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
};

/**
 * Risk Levels for Tool/Argument Invocations
 * @readonly
 * @enum {string}
 */
export const RiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Represents a single discrete action within an ExecutionPlan.
 */
export class ExecutionStep {
  constructor({
    id,
    tool,
    arguments: args = {},
    reason = '',
    risk = RiskLevel.LOW,
    requiresConfirmation = false,
  } = {}) {
    this.id = id || `step_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.tool = tool;
    this.arguments = args;
    this.reason = reason;
    this.risk = risk;
    this.requiresConfirmation = requiresConfirmation;
    this.status = StepStatus.PENDING;
    this.policyDecision = null;
    this.confirmation = null;
    this.result = null;
    this.error = null;
    this.verification = null;
    this.timings = {
      created: new Date().toISOString(),
    };
  }

  setStatus(status) {
    this.status = status;
    if (status === StepStatus.EXECUTING && !this.timings.started) {
      this.timings.started = new Date().toISOString();
    }
    if ([StepStatus.COMPLETED, StepStatus.FAILED, StepStatus.BLOCKED, StepStatus.REJECTED, StepStatus.SKIPPED].includes(status)) {
      this.timings.finished = new Date().toISOString();
      if (this.timings.started) {
        this.timings.durationMs = new Date(this.timings.finished).getTime() - new Date(this.timings.started).getTime();
      }
    }
  }

  setPolicyDecision(decision) {
    this.policyDecision = {
      ...decision,
      evaluatedAt: new Date().toISOString(),
    };
    if (decision.evaluatedRisk) {
      this.risk = decision.evaluatedRisk;
    }
    if (!decision.approved) {
      this.setStatus(StepStatus.BLOCKED);
    }
  }

  setConfirmation(approved, confirmedBy = 'user') {
    this.confirmation = {
      approved,
      confirmedBy,
      confirmedAt: new Date().toISOString(),
    };
    this.setStatus(approved ? StepStatus.CONFIRMED : StepStatus.REJECTED);
  }

  setResult(output) {
    this.result = output;
    this.error = null;
    this.setStatus(StepStatus.VERIFYING);
  }

  setError(err) {
    this.error = typeof err === 'string' ? err : err.message || 'Unknown execution error';
    this.setStatus(StepStatus.FAILED);
  }

  setVerification(verified, note = '') {
    this.verification = {
      verified,
      note,
      verifiedAt: new Date().toISOString(),
    };
    this.setStatus(verified ? StepStatus.COMPLETED : StepStatus.FAILED);
  }

  toJSON() {
    return {
      id: this.id,
      tool: this.tool,
      arguments: this.arguments,
      reason: this.reason,
      risk: this.risk,
      requiresConfirmation: this.requiresConfirmation,
      status: this.status,
      policyDecision: this.policyDecision,
      confirmation: this.confirmation,
      result: this.result,
      error: this.error,
      verification: this.verification,
      timings: this.timings,
    };
  }

  static fromJSON(json) {
    const step = new ExecutionStep({
      id: json.id,
      tool: json.tool,
      arguments: json.arguments,
      reason: json.reason,
      risk: json.risk,
      requiresConfirmation: json.requiresConfirmation,
    });
    step.status = json.status || StepStatus.PENDING;
    step.policyDecision = json.policyDecision || null;
    step.confirmation = json.confirmation || null;
    step.result = json.result !== undefined ? json.result : null;
    step.error = json.error || null;
    step.verification = json.verification || null;
    step.timings = json.timings || { created: new Date().toISOString() };
    return step;
  }
}

export default ExecutionStep;
