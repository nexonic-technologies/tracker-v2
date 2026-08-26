/**
 * Enterprise LLM Manager
 * Provides multi-provider chat completions with OpenRouter -> OpenAI -> Gemini fallback.
 * Strictly driven by environment variables.
 */
export class LLMManager {
  constructor() {
    this._refreshKeys();
  }

  _clean(val) {
    if (!val) return '';
    return String(val).trim().replace(/^["']|["']$/g, '');
  }

  _refreshKeys() {
    this.openRouterKey = this._clean(process.env.OPENROUTER_API_KEY);
    this.openRouterModel = this._clean(process.env.OPENROUTER_MODEL) || 'meta-llama/llama-3.3-70b-instruct:free';

    this.openAiKey = this._clean(process.env.OPENAI_API_KEY);
    this.openAiModel = this._clean(process.env.OPENAI_MODEL) || 'gpt-4o-mini';

    this.geminiKey = this._clean(process.env.GEMINI_API_KEY);
    this.geminiModel = this._clean(process.env.GEMINI_MODEL) || 'gemini-1.5-flash';
  }

  isAvailable() {
    this._refreshKeys();
    return Boolean(this.openRouterKey || this.openAiKey || this.geminiKey);
  }

  async _callOpenRouter({ systemPrompt, userMessage, history = [], model }) {
    this._refreshKeys();
    const key = this.openRouterKey;
    if (!key) throw new Error('OpenRouter API key not configured in environment');

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    for (const h of history) {
      if (h.role && h.content) messages.push({ role: h.role, content: h.content });
    }
    messages.push({ role: 'user', content: userMessage });

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://workhub.logimax.com',
        'X-Title': 'Workhub Jarvis AI',
      },
      body: JSON.stringify({
        model: model || this.openRouterModel,
        messages,
        temperature: 0.3,
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(18000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  async _callOpenAI({ systemPrompt, userMessage, history = [], model }) {
    this._refreshKeys();
    const key = this.openAiKey;
    if (!key) throw new Error('OpenAI API key not configured in environment');

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    for (const h of history) {
      if (h.role && h.content) messages.push({ role: h.role, content: h.content });
    }
    messages.push({ role: 'user', content: userMessage });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model || this.openAiModel,
        messages,
        temperature: 0.3,
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(18000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  async _callGemini({ systemPrompt, userMessage, history = [], model }) {
    this._refreshKeys();
    const key = this.geminiKey;
    if (!key) throw new Error('Gemini API key not configured');

    const contents = [];
    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: `System Instruction:\n${systemPrompt}` }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
    }
    for (const h of history) {
      if (h.role && h.content) {
        contents.push({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const targetModel = model || this.geminiModel || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
      signal: AbortSignal.timeout(18000),
    });

    if (!response.ok) {
      const errText = await response.text();
      // If 1.5-flash failed, auto-fallback to 2.0-flash
      if (targetModel !== 'gemini-2.0-flash') {
        return this._callGemini({ systemPrompt, userMessage, history, model: 'gemini-2.0-flash' });
      }
      throw new Error(`Gemini error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }

  async generate({ systemPrompt = '', userMessage = '', history = [], model = null }) {
    const res = await this.chat({ systemPrompt, userMessage, history, targetModel: model ? { modelId: model } : null });
    return res.text;
  }

  async chat({ systemPrompt = '', history = [], userMessage = '', targetModel = null }) {
    this._refreshKeys();
    const defaultSystemPrompt = `You are J.A.R.V.I.S., an elite, highly intelligent AI assistant for Workhub HRMS ERP. Speak concisely, clearly, and address the user with British wit, professionalism, and respect ("sir" or "ma'am").`;
    const activeSystemPrompt = systemPrompt || defaultSystemPrompt;

    const providerErrors = [];

    // 1. Try OpenRouter
    if (this.openRouterKey) {
      try {
        const text = await this._callOpenRouter({
          systemPrompt: activeSystemPrompt,
          userMessage,
          history,
          model: targetModel?.modelId,
        });
        if (text) return { text, providerName: 'OpenRouter' };
      } catch (err) {
        console.warn('[LLMManager] OpenRouter error:', err.message);
        providerErrors.push(`OpenRouter: ${err.message}`);
      }
    }

    // 2. Try Gemini
    if (this.geminiKey) {
      try {
        const text = await this._callGemini({
          systemPrompt: activeSystemPrompt,
          userMessage,
          history,
        });
        if (text) return { text, providerName: 'Gemini' };
      } catch (err) {
        console.warn('[LLMManager] Gemini error:', err.message);
        providerErrors.push(`Gemini: ${err.message}`);
      }
    }

    // 3. Try OpenAI Fallback
    if (this.openAiKey) {
      try {
        const text = await this._callOpenAI({
          systemPrompt: activeSystemPrompt,
          userMessage,
          history,
          model: targetModel?.modelId,
        });
        if (text) return { text, providerName: 'OpenAI' };
      } catch (err) {
        console.warn('[LLMManager] OpenAI error:', err.message);
        providerErrors.push(`OpenAI: ${err.message}`);
      }
    }

    // 4. Graceful offline fallback
    if (activeSystemPrompt.includes('JSON')) {
      if (activeSystemPrompt.includes('Knowledge Graph Extraction') || activeSystemPrompt.includes('triples')) {
        return {
          text: JSON.stringify({ triples: [] }),
          providerName: 'OfflineFallback',
          error: providerErrors.join(' | '),
        };
      }
      if (activeSystemPrompt.includes('Intent Classification')) {
        return {
          text: JSON.stringify({
            type: 'general_query',
            taskCategory: 'chat',
            requiresTools: false,
            targetTools: [],
            parameters: {},
            confidence: 0.5,
          }),
          providerName: 'OfflineFallback',
          error: providerErrors.join(' | '),
        };
      }
      return {
        text: JSON.stringify({ success: true }),
        providerName: 'OfflineFallback',
        error: providerErrors.join(' | '),
      };
    }

    const cleanMsg = userMessage.length > 80 ? userMessage.slice(0, 80) + '...' : userMessage;
    const errorDetails = providerErrors.length > 0 ? ` (${providerErrors.join('; ')})` : ' (No external LLM API keys configured)';

    return {
      text: `External LLM request failed${errorDetails}. Operating in local offline resilience mode for: "${cleanMsg}".`,
      providerName: 'OfflineFallback',
      error: providerErrors.join(' | '),
    };
  }
}

export const defaultLLMManager = new LLMManager();
export default defaultLLMManager;
