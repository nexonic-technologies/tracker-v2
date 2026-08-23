import { getGlobalModels } from '../../models/global/index.js';

export class TraceStore {
  get model() {
    return getGlobalModels().JarvisTrace;
  }

  /**
   * Persist a full JarvisContext trace to Global MongoDB.
   * @param {import('./JarvisContext.js').JarvisContext} ctx
   */
  async persist(ctx) {
    try {
      if (!this.model) return null;
      const doc = {
        traceId: ctx.traceId,
        userId: String(ctx.userId || ctx.employeeId || 'anonymous'),
        tenantSlug: ctx.tenantSlug || 'admin',
        utterance: ctx.utterance,
        response: ctx.response,
        intent: ctx.intent,
        executionPlan: ctx.executionPlan ? ctx.executionPlan.toJSON() : null,
        toolResults: ctx.toolResults,
        trace: ctx.trace,
        verified: ctx.verified === true,
        offlineResolved: Boolean(ctx.offlineResolved),
      };

      await this.model.updateOne({ traceId: ctx.traceId }, { $set: doc }, { upsert: true });
      return ctx.traceId;
    } catch (err) {
      console.warn('[TraceStore] Trace persist notice:', err.message);
      return null;
    }
  }

  async getTrace(traceId) {
    try {
      if (!this.model) return null;
      return await this.model.findOne({ traceId }).lean();
    } catch (err) {
      return null;
    }
  }
}

export const defaultTraceStore = new TraceStore();
export default defaultTraceStore;
