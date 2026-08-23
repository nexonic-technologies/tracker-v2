import { StepStatus } from '../core/ExecutionStep.js';
import { defaultToolRegistry } from '../tools/ToolRegistry.js';

export class ToolEngine {
  constructor(toolRegistry, policyEngine) {
    this.toolRegistry = toolRegistry || defaultToolRegistry;
    this.policyEngine = policyEngine;
  }

  async execute(ctx) {
    ctx.executionPlan.start();

    for (const step of ctx.executionPlan.steps) {
      const isApproved = await this.policyEngine.evaluate(step, ctx);

      if (!isApproved) {
        ctx.toolResults.push({
          tool: step.tool,
          params: step.arguments,
          pendingAuthorization: true,
          reason: step.policyDecision?.reason,
        });
        continue;
      }

      const tool = this.toolRegistry.getTool(step.tool);
      if (!tool) {
        step.setError(`Unrecognized tool: "${step.tool}"`);
        ctx.toolResults.push({ tool: step.tool, error: step.error });
        continue;
      }

      step.setStatus(StepStatus.EXECUTING);
      try {
        const fn = tool.handler || tool.execute;
        const output = await fn.call(tool, step.arguments, ctx);
        step.setResult(output);
        ctx.toolResults.push({
          tool: step.tool,
          params: step.arguments,
          executed: true,
          data: output,
        });
      } catch (err) {
        step.setError(err);
        ctx.toolResults.push({
          tool: step.tool,
          error: err.message,
        });
      }
    }

    ctx.executionPlan.finish();
    ctx.log('ToolEngine', `Executed tools (results: ${ctx.toolResults.length})`);
    return ctx;
  }
}

export default ToolEngine;
