// Backend/src/services/business/calculate.js

/**
 * Pure, reusable calculation pipeline runner for Tracker.
 * Sequentially executes an explicit array of handler functions against context state.
 * Supports clean short-circuiting when state.stop is true (e.g., Holiday or Full Leave applied).
 * 
 * @param {Object} params
 * @param {Object} params.context - Input state (employee, date, punches, policy, shift, etc.)
 * @param {Array<Function>} params.handlers - Explicit array of business handler functions
 * @returns {Promise<Object>} Final computed state
 */
export async function calculate({ context, handlers }) {
  let state = { ...context };

  for (const handler of handlers) {
    if (typeof handler === 'function') {
      state = await handler(state);
      if (state && state.stop) break; // Pipeline short-circuit
    }
  }

  return state;
}

export default calculate;
