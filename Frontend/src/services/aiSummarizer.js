// src/services/aiSummarizer.js
// Enterprise AI Standup & Work Summary Engine for Workhub ERP
// Primary: OpenRouter (openrouter/auto)
// Fallback: OpenAI (gpt-4o-mini / gpt-5.4-mini)

const OPENROUTER_API_KEY = "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";
const OPENROUTER_MODEL = "openrouter/auto";

const OPENAI_API_KEY = "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";
const OPENAI_MODEL = "gpt-4o-mini";

/**
 * Builds the AI system & user prompt for daily standup summarization.
 */
function buildPrompt({ employeeName, date, activities = [], gitCommits = [] }) {
  const activitiesList = activities.length > 0
    ? activities.map((a, i) => {
        const clientName = a.client?.name || a.clientName || 'Internal / General';
        const taskName = a.taskType?.name || a.taskTypeName || 'Task';
        const desc = a.activity || a.description || 'Activity logged';
        const hrs = a.hours ? `${a.hours}h` : '';
        return `${i + 1}. [${clientName}] (${taskName}) ${desc} ${hrs}`.trim();
      }).join('\n')
    : 'No manual activities logged for this day.';

  const commitsList = gitCommits.length > 0
    ? gitCommits.map((c, i) => `${i + 1}. [${c.hash || 'commit'}] ${c.message} (${c.time || ''})`).join('\n')
    : 'No git commits attached.';

  const formattedDate = new Date(date || Date.now()).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const systemPrompt = `You are an elite Engineering & Operations Standup Assistant for Workhub ERP.
Your task is to take raw daily activities and git commits for an employee and generate a crisp, executive-grade, professional Daily Work Summary.

Format guidelines:
1. Use clean Markdown with bold bullet points.
2. Group accomplishments cleanly by Client, Project, or Major Feature.
3. Structure sections:
   - 🎯 **Key Accomplishments**: Clear, impactful bullet points of completed work and bug fixes.
   - 💼 **Client Deliverables & Tasks**: Progress summary per client.
   - 🐙 **Code & Git Milestones**: Technical highlights from git commits.
   - 🚀 **Next Priorities**: Follow-ups for the next working session.
4. Keep it concise, executive-friendly, and ready to paste into Slack, Microsoft Teams, or checkout emails.`;

  const userPrompt = `Employee: ${employeeName || 'Team Member'}
Date: ${formattedDate}

--- LOGGED ACTIVITIES ---
${activitiesList}

--- GIT COMMITS ---
${commitsList}

Please generate the structured Daily Standup & Work Summary now.`;

  return { systemPrompt, userPrompt };
}

/**
 * Calls OpenRouter API.
 */
async function callOpenRouter(systemPrompt, userPrompt) {
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
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim();
}

/**
 * Calls OpenAI API as fallback.
 */
async function callOpenAI(systemPrompt, userPrompt) {
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
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim();
}

/**
 * Generates structured standup summary with dual-engine fallback.
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
        engine: "OpenRouter (auto)",
        generatedAt: new Date().toISOString()
      };
    }
  } catch (orError) {
    console.warn("OpenRouter API failed, falling back to OpenAI:", orError.message);
  }

  // 2. Fallback to OpenAI
  try {
    const summary = await callOpenAI(systemPrompt, userPrompt);
    if (summary) {
      return {
        success: true,
        summary,
        engine: `OpenAI (${OPENAI_MODEL})`,
        generatedAt: new Date().toISOString()
      };
    }
  } catch (oaiError) {
    console.error("OpenAI API failed as fallback:", oaiError.message);
    throw new Error(`AI Summary generation failed on both OpenRouter and OpenAI. Error: ${oaiError.message}`);
  }

  throw new Error("Unable to generate AI summary at this time.");
}

export default {
  generateDailyWorkSummary
};
