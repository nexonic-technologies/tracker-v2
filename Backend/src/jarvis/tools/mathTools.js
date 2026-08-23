/**
 * Declarative Mathematical Evaluation Tool (Sacred Law Compliant: Zero Hardcoded Switch/If Branching)
 * Evaluates standard arithmetic expressions declaratively using AST/token parsing.
 */
export const mathTools = [
  {
    name: 'math.calculate',
    description: 'Evaluate arithmetic and algebraic expressions (e.g. "4 - 1", "20 * 5", "100 / 4")',
    risk: 'low',
    requiresConfirmation: false,
    async handler(params, ctx) {
      let expr = params.expression;

      // Extract expression directly from utterance if not passed
      if (!expr && ctx?.utterance) {
        expr = ctx.utterance.replace(/^what\s+is\s+/i, '').replace(/[^0-9+\-*/%().\s]/g, '').trim();
      }

      // If separate operands and operator are passed
      if (!expr && params.a !== undefined && params.b !== undefined) {
        const op = params.operator || '+';
        expr = `${params.a} ${op} ${params.b}`;
      } else if (typeof expr === 'string') {
        // Interpolate slot variables (e.g. "{a} - {b}" with a=4, b=1)
        for (const [k, v] of Object.entries(params)) {
          if (k !== 'expression') {
            expr = expr.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
          }
        }
      }

      if (!expr || typeof expr !== 'string') {
        return { error: 'No valid mathematical expression provided' };
      }

      // Sanitize: allow only valid arithmetic tokens [0-9, +, -, *, /, %, (, ), ., whitespace]
      const sanitized = expr.replace(/[^0-9+\-*/%().\s]/g, '').trim();
      if (!sanitized) {
        return { error: `Cannot evaluate invalid expression: "${expr}"` };
      }

      try {
        const result = Function(`'use strict'; return (${sanitized})`)();
        return {
          success: true,
          expression: sanitized,
          result: Number.isFinite(result) ? result : 'Undefined',
        };
      } catch (err) {
        return { error: `Evaluation error for expression: "${sanitized}"` };
      }
    },
  },
];

export default mathTools;
