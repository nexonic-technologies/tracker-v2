import { JarvisContext } from './JarvisContext.js';
import { defaultTraceStore } from './TraceStore.js';

/**
 * J.A.R.V.I.S. Core Runtime
 * Manages the deterministic stage pipeline execution.
 */
export class JarvisCore {
  constructor(stages = {}) {
    this.stages = stages;
    this.traceStore = defaultTraceStore;
  }

  async handle(input) {
    const ctx = input instanceof JarvisContext ? input : new JarvisContext(input);
    const {
      contextManager,
      memoryStore,
      intentClassifier,
      taskPlanner,
      toolEngine,
      verifier,
      learningAnalyst,
      responseGenerator,
    } = this.stages;

    if (contextManager) await contextManager.enrich(ctx);
    if (memoryStore) await memoryStore.retrieve(ctx);
    if (intentClassifier) await intentClassifier.classify(ctx);
    if (taskPlanner) await taskPlanner.plan(ctx);
    if (toolEngine) await toolEngine.execute(ctx);
    if (verifier) await verifier.verify(ctx);
    if (responseGenerator) await responseGenerator.generate(ctx);

    // Meta-learning & pattern consolidation phase
    if (learningAnalyst) {
      try {
        await learningAnalyst.analyze(ctx);
      } catch (err) {
        console.warn('[JarvisCore] Learning analysis notice:', err.message);
      }
    }

    // Update discourse context state for session
    if (ctx.sessionId) {
      const { defaultConversationContextTracker } = await import('../stages/ConversationContextTracker.js').catch(() => ({}));
      if (defaultConversationContextTracker) {
        try {
          await defaultConversationContextTracker.updateTurn(
            ctx.sessionId,
            ctx.userId,
            ctx.utterance,
            ctx.response,
            {
              recognizedTokens: ctx.semanticFact ? [
                { id: ctx.semanticFact.subjectTokenId, canonical: ctx.semanticFact.subjectCanonical, type: 'entity' },
                { id: ctx.semanticFact.targetTokenId, canonical: ctx.semanticFact.targetCanonical, type: 'entity' },
              ].filter(t => t.canonical) : (ctx.tokens?.filter(t => t.type === 'entity') || []),
              predicate: ctx.semanticFact?.relationCanonical || ctx.intent?.parameters?.relation,
              offlineResolved: ctx.offlineResolved,
              intent: ctx.intent,
            }
          );
        } catch {}
      }
    }

    // Persist full audit trace to Global MongoDB
    this.traceStore.persist(ctx).catch(() => {});

    return ctx;
  }
}

export default JarvisCore;
