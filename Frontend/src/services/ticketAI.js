// src/services/ticketAI.js
// Enterprise AI Ticket Generation Engine for Workhub ERP
// Primary: OpenRouter (openrouter/auto)
// Fallback: OpenAI (gpt-4o-mini)

const OPENROUTER_API_KEY = "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";
const OPENROUTER_MODEL = "openrouter/auto";

const OPENAI_API_KEY = "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";
const OPENAI_MODEL = "gpt-4o-mini";

function buildTicketPrompt({ title, clientName, productName }) {
  const systemPrompt = `You are an expert Product Manager and Software Engineering Lead at a top SaaS company called Workhub ERP.
Your task is to take a brief ticket title and generate a complete, professional software support/bug/feature ticket.

You MUST respond with ONLY a valid JSON object — no markdown, no code fences, no explanation. Just raw JSON.

The JSON must have exactly these keys:
{
  "title": "Refined, precise ticket title (clear and actionable, max 80 chars)",
  "userStory": "As a [user type], I want to [action] so that [benefit]. Include 3-5 bullet points of detailed context.",
  "impactAnalysis": "Which system areas are affected, user segments impacted, business risk level (Low/Medium/High), and estimated scope.",
  "acceptanceCriteria": "Numbered list of 3-6 specific, testable conditions that must be true for this ticket to be considered resolved.",
  "description": "Internal engineering notes: technical root cause hypothesis, affected endpoints or components, debugging approach, and any known workarounds.",
  "priority": "Low | Medium | High ",
  "suggestedDueDate": "ISO date string YYYY-MM-DD (estimate based on complexity, 3-14 days from today)"
}`;

  const today = new Date().toISOString().split('T')[0];
  const userPrompt = `Ticket Title: "${title}"
Client: ${clientName || 'Internal'}
Product: ${productName || 'Workhub ERP'}
Today's Date: ${today}

Generate a complete, professional ticket for this. Output ONLY the JSON object.`;

  return { systemPrompt, userPrompt };
}

async function callAI(systemPrompt, userPrompt, useOpenAI = false) {
  if (useOpenAI) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`OpenAI error (${response.status})`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim();
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://workhub-tracker.com",
      "X-Title": "Workhub ERP Ticket AI"
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: 1500
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`OpenRouter error (${response.status})`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim();
}

/**
 * Generates a complete ticket from a title using dual-engine AI with fallback.
 *
 * @param {Object} params
 * @param {string} params.title - The raw ticket title input
 * @param {string} [params.clientName] - Client name for context
 * @param {string} [params.productName] - Product name for context
 * @returns {Promise<Object>} { title, userStory, impactAnalysis, acceptanceCriteria, description, priority, suggestedDueDate, engine }
 */
export async function generateTicketWithAI({ title, clientName, productName }) {
  if (!title?.trim()) throw new Error("Ticket title is required to generate AI content.");

  const { systemPrompt, userPrompt } = buildTicketPrompt({ title, clientName, productName });

  let rawContent = null;
  let engine = null;

  // 1. Try OpenRouter first
  try {
    rawContent = await callAI(systemPrompt, userPrompt, false);
    engine = "OpenRouter";
  } catch (err) {
    console.warn("OpenRouter ticket AI failed, falling back to OpenAI:", err.message);
  }

  // 2. Fallback to OpenAI
  if (!rawContent) {
    try {
      rawContent = await callAI(systemPrompt, userPrompt, true);
      engine = "OpenAI";
    } catch (err) {
      throw new Error(`AI Ticket Generation failed on both engines: ${err.message}`);
    }
  }

  // Parse and validate JSON
  try {
    const cleaned = rawContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      title: parsed.title || title,
      userStory: parsed.userStory || '',
      impactAnalysis: parsed.impactAnalysis || '',
      acceptanceCriteria: parsed.acceptanceCriteria || '',
      description: parsed.description || '',
      priority: parsed.priority || 'Medium',
      suggestedDueDate: parsed.suggestedDueDate || '',
      engine
    };
  } catch (parseErr) {
    throw new Error(`AI response could not be parsed as JSON. Engine: ${engine}`);
  }
}

export default { generateTicketWithAI };
