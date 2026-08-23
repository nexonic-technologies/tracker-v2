import { ExecutionPlan } from './ExecutionPlan.js';

/**
 * JarvisContext is the unified state & event accumulator that flows through
 * every stage of the pipeline.
 */
export class JarvisContext {
  constructor({
    userId = 'default-user',
    tenantSlug = 'admin',
    employeeId = null,
    role = null,
    department = null,
    designation = null,
    utterance = '',
    sessionId,
    traceId,
    dryRun = false,
    disableLLM = false,
  } = {}) {
    // --- Identity & Tracing ---
    this.userId = userId;
    this.tenantSlug = tenantSlug;
    this.employeeId = employeeId;
    this.role = role;
    this.department = department;
    this.designation = designation;
    this.utterance = utterance;
    this.sessionId = sessionId || `session-${Date.now()}`;
    this.traceId = traceId || `trace-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.dryRun = Boolean(dryRun);
    this.disableLLM = Boolean(disableLLM);
    this.createdAt = new Date().toISOString();

    // --- History & Working Context ---
    this.conversationHistory = [];
    this.catchUpContext = null;
    this.relevantMemory = [];

    // --- Intent & Cognitive State ---
    this.intent = null;

    // --- Model Selection ---
    this.selectedModel = null;

    // --- Execution Plan & Steps ---
    this.executionPlan = new ExecutionPlan({
      traceId: this.traceId,
      goal: utterance,
      dryRun: this.dryRun,
    });

    // --- Legacy compatibility aliases ---
    this.plan = [];
    this.proposedToolCalls = [];
    this.toolResults = [];

    // --- Verification & Response ---
    this.verified = null;
    this.response = null;
    this.offlineResolved = false;
    this.actionPayload = null;

    // --- Pipeline Audit Trace ---
    this.trace = [];

    // --- Stage Timings ---
    this.stageTimings = {};
  }

  log(stage, message, data) {
    const entry = {
      stage,
      message,
      data: data !== undefined ? data : undefined,
      t: new Date().toISOString(),
    };
    this.trace.push(entry);
    return entry;
  }

  recordTiming(stage, durationMs) {
    this.stageTimings[stage] = durationMs;
  }
}

export default JarvisContext;
