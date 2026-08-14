// src/services/aiSummarizer.js
// Enterprise AI Work Summarization Service
// Primary: OpenRouter (openrouter/auto)
// Fallback: OpenAI (gpt-5.4-mini / gpt-4o-mini)

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "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";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Builds the AI system & user prompt for daily standup summarization.
 */
function buildPrompt({ employeeName, date, activities = [], commits = [] }) {
  const activitiesList = activities.length > 0
    ? activities.map((a, i) => `${i + 1}. [${a.client?.name || a.clientName || 'General'}] (${a.taskType?.name || a.taskTypeName || 'Task'}) ${a.activity || a.description || ''} - ${a.hours || 0}h`).join('\n')
    : 'No manual activities logged.';

  const commitsList = commits.length > 0
    ? commits.map((c, i) => `${i + 1}. [${c.hash || c.sha?.substring(0, 7) || 'commit'}] ${c.message} (${c.time || ''})`).join('\n')
    : 'No git commits detected for this date.';

  const formattedDate = new Date(date || Date.now()).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const systemPrompt = `You are an elite Engineering & Operations Standup Assistant for Workhub ERP.
Your task is to take raw daily activities and git commits for an employee and generate a crisp, executive-grade, professional Daily Work Summary.

Format rules:
1. Use clean Markdown with bold bullet points.
2. Group accomplishments by Client / Feature / Project.
3. Include:
   - 🎯 **Key Accomplishments**: Clear bullet points describing what was shipped, fixed, or designed.
   - 💼 **Client & Project Progress**: Summary of client deliverables.
   - 🐙 **Code & Git Milestones**: Brief mention of core technical commits if available.
   - 🚀 **Next Steps / Priorities**: Logical follow-ups for tomorrow.
4. Keep it concise, executive-friendly, and ready to paste into Slack, Microsoft Teams, or daily checkout emails.`;

  const userPrompt = `Employee: ${employeeName || 'Team Member'}
Date: ${formattedDate}

--- LOGGED ACTIVITIES ---
${activitiesList}

--- DETECTED GIT COMMITS ---
${commitsList}

Please generate the structured Daily Standup & Work Summary now.`;

  return { systemPrompt, userPrompt };
}

/**
 * Executes chat completion via OpenRouter.
 */
async function callOpenRouter(systemPrompt, userPrompt) {
  if (!OPENROUTER_API_KEY) throw new Error("OpenRouter API key missing");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://workhub-tracker.com",
      "X-Title": "Workhub ERP Daily Tracker"
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1200
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim();
}

/**
 * Executes chat completion via OpenAI as fallback.
 */
async function callOpenAI(systemPrompt, userPrompt) {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key missing");

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
      temperature: 0.3,
      max_tokens: 1200
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim();
}

/**
 * Generates Daily Work Summary with automatic OpenRouter -> OpenAI fallback.
 *
 * @param {Object} params
 * @param {string} params.employeeName
 * @param {Date|string} params.date
 * @param {Array} params.activities
 * @param {Array} params.commits
 * @returns {Promise<Object>} { summary, engineUsed, timestamp }
 */
export async function generateDailyWorkSummary(params) {
  const { systemPrompt, userPrompt } = buildPrompt(params);

  // 1. Try OpenRouter First
  try {
    const summary = await callOpenRouter(systemPrompt, userPrompt);
    if (summary) {
      return {
        success: true,
        summary,
        engine: "openrouter",
        model: OPENROUTER_MODEL,
        generatedAt: new Date().toISOString()
      };
    }
  } catch (orError) {
    console.warn("OpenRouter generation failed, falling back to OpenAI:", orError.message);
  }

  // 2. Fallback to OpenAI
  try {
    const summary = await callOpenAI(systemPrompt, userPrompt);
    if (summary) {
      return {
        success: true,
        summary,
        engine: "openai",
        model: OPENAI_MODEL,
        generatedAt: new Date().toISOString()
      };
    }
  } catch (oaiError) {
    console.error("OpenAI generation failed as well:", oaiError.message);
    throw new Error(`AI Summary Generation failed on both OpenRouter and OpenAI: ${oaiError.message}`);
  }

  throw new Error("Unable to generate AI summary at this time.");
}

export default {
  generateDailyWorkSummary
};
