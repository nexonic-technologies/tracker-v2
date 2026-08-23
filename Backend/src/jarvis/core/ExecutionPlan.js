import { ExecutionStep, StepStatus } from './ExecutionStep.js';

/**
 * Represents a complete, multi-step execution plan produced by the TaskPlanner.
 */
export class ExecutionPlan {
  constructor({
    planId,
    traceId,
    goal = '',
    createdBy = 'llm-planner',
    dryRun = false,
    steps = [],
  } = {}) {
    this.planId = planId || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.traceId = traceId || `trace_${Date.now()}`;
    this.goal = goal;
    this.createdBy = createdBy;
    this.dryRun = Boolean(dryRun);
    this.steps = steps.map((s) => (s instanceof ExecutionStep ? s : ExecutionStep.fromJSON(s)));
    this.status = 'pending';
    this.timings = {
      created: new Date().toISOString(),
    };
  }

  addStep(step) {
    const inst = step instanceof ExecutionStep ? step : new ExecutionStep(step);
    this.steps.push(inst);
    return inst;
  }

  getStep(stepId) {
    return this.steps.find((s) => s.id === stepId);
  }

  getPendingSteps() {
    return this.steps.filter((s) =>
      [StepStatus.PENDING, StepStatus.CONFIRMED, StepStatus.AWAITING_CONFIRMATION].includes(s.status)
    );
  }

  hasPendingConfirmation() {
    return this.steps.some((s) => s.status === StepStatus.AWAITING_CONFIRMATION);
  }

  isFinished() {
    return (
      this.steps.length > 0 &&
      this.steps.every((s) =>
        [StepStatus.COMPLETED, StepStatus.FAILED, StepStatus.BLOCKED, StepStatus.REJECTED, StepStatus.SKIPPED].includes(
          s.status
        )
      )
    );
  }

  start() {
    this.status = 'in_progress';
    this.timings.started = new Date().toISOString();
  }

  finish() {
    const hasFailures = this.steps.some((s) => s.status === StepStatus.FAILED || s.status === StepStatus.BLOCKED);
    this.status = hasFailures ? 'failed' : 'completed';
    this.timings.finished = new Date().toISOString();
    if (this.timings.started) {
      this.timings.durationMs = new Date(this.timings.finished).getTime() - new Date(this.timings.started).getTime();
    }
  }

  toJSON() {
    return {
      planId: this.planId,
      traceId: this.traceId,
      goal: this.goal,
      createdBy: this.createdBy,
      dryRun: this.dryRun,
      status: this.status,
      timings: this.timings,
      steps: this.steps.map((s) => s.toJSON()),
    };
  }

  static fromJSON(json) {
    const plan = new ExecutionPlan({
      planId: json.planId,
      traceId: json.traceId,
      goal: json.goal,
      createdBy: json.createdBy,
      dryRun: json.dryRun,
      steps: (json.steps || []).map((s) => ExecutionStep.fromJSON(s)),
    });
    plan.status = json.status || 'pending';
    plan.timings = json.timings || { created: new Date().toISOString() };
    return plan;
  }
}

export default ExecutionPlan;
