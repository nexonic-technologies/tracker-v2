import { defaultLLMManager } from '../providers/LLMManager.js';
import { defaultNeuralResponseRealizer } from '../neural/NeuralResponseRealizer.js';

export class ResponseGenerator {
  constructor({ llmManager, responseRealizer } = {}) {
    this.llmManager = llmManager || defaultLLMManager;
    this.responseRealizer = responseRealizer || defaultNeuralResponseRealizer;
  }

  async generate(ctx) {
    // 0. Validated Semantic Fact Realization (Multi-Surface Generative Support)
    if (ctx.semanticFact && ctx.semanticFact.validated === true) {
      if (ctx.requestedStyle) {
        const styled = this.responseRealizer.realize(ctx.semanticFact, { style: ctx.requestedStyle });
        if (styled) {
          ctx.response = styled;
        }
      } else {
        const styled = this.responseRealizer.realizeFromUtterance(ctx.semanticFact, ctx.utterance);
        if (styled) {
          ctx.response = styled;
        }
      }
    }

    // 1. Learned Conversational Dialogue Realization in J.A.R.V.I.S. Persona
    if (ctx.intent?.type === 'learned_conversational_response' || ctx.intent?.taskCategory === 'conversation') {
      const dynamicResponse = this.responseRealizer.realizeDialogue(ctx.intent, ctx);
      if (dynamicResponse) {
        ctx.response = dynamicResponse;
        ctx.log('ResponseGenerator', 'Synthesized dynamic conversational dialogue in J.A.R.V.I.S. persona');
        return ctx;
      }
    }

    // 1.1 Direct Pre-Resolved Offline Response (e.g. Local Graph hit)
    if (ctx.response && ctx.offlineResolved) {
      ctx.log('ResponseGenerator', 'Emitted pre-resolved offline response');
      return ctx;
    }

    // 2. Explicit Learning Confirmation
    if (ctx.intent?.type === 'explicit_learning' || /^remember/i.test(ctx.utterance || '')) {
      ctx.response = ctx.response || `I have permanently committed that to my memory and knowledge graph, sir. I will remember it across all sessions.`;
      ctx.log('ResponseGenerator', 'Emitted memory confirmation response');
      return ctx;
    }

    // 3. Direct Learned Response Template (Offline 0-API formatting)
    if (ctx.intent?.responseTemplate && (!ctx.toolResults || !ctx.toolResults.some((r) => r.error))) {
      let text = ctx.intent.responseTemplate;
      const params = ctx.intent.parameters || {};
      const requiredSlots = (text.match(/\{(\w+)\}/g) || []).map((s) => s.slice(1, -1));

      // Strictly validate that ALL required slots are present and not dummy placeholder strings
      const allSlotsValid = requiredSlots.length > 0 && requiredSlots.every((slot) => params[slot] !== undefined && params[slot] !== 'string' && params[slot] !== '');

      if (allSlotsValid) {
        for (const [key, val] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${key}\\}`, 'gi'), String(val));
        }
        ctx.response = text;
        ctx.log('ResponseGenerator', 'Emitted template response offline');
        return ctx;
      }
    }

    // 4. If tools executed with results
    const executedTools = (ctx.toolResults || []).filter((r) => r.executed && !r.error && r.data);
    const failedTools = (ctx.toolResults || []).filter((r) => r.error);
    const pendingAuth = (ctx.toolResults || []).find((r) => r.pendingAuthorization);

    if (pendingAuth) {
      ctx.response = `Certainly, sir. Modifying records via **${pendingAuth.tool}** requires your explicit authorization. Would you like me to proceed with confirmation?`;
      ctx.actionPayload = {
        tool: pendingAuth.tool,
        params: pendingAuth.params,
        requiresConfirmation: true,
      };
      ctx.log('ResponseGenerator', 'Emitted authorization request');
      return ctx;
    }

    // If an offline tool failed, mark offlineResolved = false so telemetry is 100% honest
    if (failedTools.length > 0) {
      ctx.offlineResolved = false;
      ctx.toolFailed = true;
    }

    if (executedTools.length > 0) {
      const toolOutput = executedTools[0].data;

      // Declarative Browser Discovery Fact Result (Synthesized with context)
      if (executedTools[0].tool === 'browser.search') {
        ctx.offlineResolved = false;
        const systemPrompt = `You are J.A.R.V.I.S., an articulate, highly intelligent AI assistant.
Provide a clear, insightful, and well-structured answer to the user's inquiry based on the discovery context.`;

        try {
          const res = await this.llmManager.chat({
            systemPrompt,
            userMessage: `User Question: "${ctx.utterance}"\nDiscovery Context: ${JSON.stringify(toolOutput)}`,
          });

          if (res.providerName === 'OfflineFallback' || res.text.includes('Operating in local offline resilience mode')) {
            if (toolOutput.discovered && toolOutput.fact) {
              ctx.response = `${toolOutput.title ? `**${toolOutput.title}**:\n` : ''}${toolOutput.fact}`;
            } else {
              ctx.response = `I searched for information regarding "${ctx.utterance}", but was unable to find definitive live results at the moment, sir.`;
            }
          } else {
            ctx.response = res.text;
          }

          ctx.actionPayload = { type: 'discovery_result', data: toolOutput };
          return ctx;
        } catch {
          ctx.response = toolOutput.fact || `Based on my discovery, here is the information for "${ctx.utterance}".`;
          ctx.actionPayload = { type: 'discovery_result', data: toolOutput };
          return ctx;
        }
      }

      // 4.1 Specialized Notification Realizer
      if (executedTools[0].tool === 'notifications.getDigest') {
        const headline = await this.responseRealizer.realizeDigest(toolOutput, ctx);
        ctx.response = headline;
        ctx.actionPayload = { type: 'notification_digest', data: { ...toolOutput, summaryHeadline: headline } };
        ctx.log('ResponseGenerator', 'Emitted notification digest response via NeuralResponseRealizer');
        return ctx;
      }

      // 4.2 Unified Generative Tool Output Synthesis (Sacred Law 9 Compliant)
      // Delegated to LLM Teacher on first encounter -> learned into Brain by LearningAnalyst
      ctx.offlineResolved = false;
      const systemPrompt = `You are J.A.R.V.I.S., an articulate, professional AI assistant for Workhub ERP.
Present the following tool execution output to the user with respectful clarity and helpfulness.
Address the user respectfully as "sir" or "ma'am".`;

      try {
        const res = await this.llmManager.chat({
          systemPrompt,
          userMessage: `User Utterance: "${ctx.utterance}"\nTool: "${executedTools[0].tool}"\nTool Result: ${JSON.stringify(toolOutput)}`,
        });
        ctx.response = res.text;
        ctx.actionPayload = { type: `${executedTools[0].tool.replace(/\./g, '_')}_result`, data: toolOutput };
      } catch {
        ctx.response = `Task completed successfully, sir. Output: ${JSON.stringify(toolOutput)}`;
        ctx.actionPayload = { data: toolOutput };
      }
      return ctx;
    }

    // 4. Conversational query turn via LLM (Marks offlineResolved = false)
    ctx.offlineResolved = false;
    try {
      const res = await this.llmManager.chat({
        systemPrompt: `You are J.A.R.V.I.S., an elite AI assistant embedded inside Workhub HRMS ERP. Address the user with respect ("sir" or "ma'am"), professional clarity, and helpfulness.`,
        userMessage: ctx.utterance,
        history: ctx.conversationHistory || [],
      });
      ctx.response = res.text;
    } catch {
      ctx.response = `At your service, sir. I have registered your message: "${ctx.utterance}".`;
    }

    ctx.log('ResponseGenerator', 'Generated response via LLM');
    return ctx;
  }
}

export const defaultResponseGenerator = new ResponseGenerator();
export default defaultResponseGenerator;
