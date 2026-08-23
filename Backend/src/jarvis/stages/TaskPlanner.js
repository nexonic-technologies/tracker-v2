import { ExecutionStep, RiskLevel } from '../core/ExecutionStep.js';
import { defaultToolRegistry } from '../tools/ToolRegistry.js';

export class TaskPlanner {
  constructor({ toolRegistry } = {}) {
    this.toolRegistry = toolRegistry || defaultToolRegistry;
  }

  async plan(ctx) {
    if (!ctx.intent || !ctx.intent.requiresTools) {
      ctx.log('TaskPlanner', 'No tool execution required for intent');
      return ctx;
    }

    const tools = ctx.intent.targetTools || [];
    for (const toolName of tools) {
      const rawParams = ctx.intent.parameters || {};
      const normalizedArgs = {
        ...rawParams,
        employeeId: ctx.employeeId,
        tenantSlug: ctx.tenantSlug,
      };

      // Ensure required schema fields are systematically satisfied
      const toolDef = this.toolRegistry.getTool(toolName);
      if (toolDef && toolDef.parameters && Array.isArray(toolDef.parameters.required)) {
        for (const reqField of toolDef.parameters.required) {
          if (normalizedArgs[reqField] === undefined || normalizedArgs[reqField] === '') {
            if (reqField === 'query') {
              const values = Object.entries(rawParams)
                .filter(([k, v]) => typeof v === 'string' && v.trim() && !['employeeId', 'tenantSlug'].includes(k))
                .map(([_, v]) => v.trim());
              normalizedArgs.query = values.join(' ') || ctx.utterance || '';
            }
          }
        }
      }

      const step = new ExecutionStep({
        tool: toolName,
        arguments: normalizedArgs,
        reason: `Planner proposed ${toolName} for intent ${ctx.intent.type}`,
        risk: toolName.includes('apply') || toolName.includes('approve') ? RiskLevel.MEDIUM : RiskLevel.LOW,
        requiresConfirmation: toolName.includes('apply') || toolName.includes('approve'),
      });

      ctx.executionPlan.addStep(step);
      ctx.proposedToolCalls.push({
        tool: toolName,
        params: step.arguments,
        requiresConfirmation: step.requiresConfirmation,
      });
    }

    ctx.log('TaskPlanner', `Generated plan with ${ctx.executionPlan.steps.length} step(s)`);
    return ctx;
  }
}

export default TaskPlanner;
