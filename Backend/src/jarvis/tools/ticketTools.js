import { defaultLLMManager } from '../providers/LLMManager.js';

export const ticketTools = [
  {
    name: 'tickets.draftAssist',
    description: 'Refine, expand and structure a ticket title and description from brief user notes',
    risk: 'low',
    requiresConfirmation: false,
    async handler(params) {
      const { rawTitle = '', rawDescription = '', priority, client, category } = params;

      const systemPrompt = `You are an expert Agile Quality & Technical Support Engineer for Workhub ERP.
Given rough notes or a brief issue title from a user, refine and format a professional, structured Ticket Description.
Output schema:
- **Overview**: 1-2 sentence crisp problem statement.
- **Expected Behavior**: What should occur.
- **Observed / Current Behavior**: What is failing.
- **Reproduction Steps**: Step-by-step numbered steps.
- **Impact & Urgency Suggestion**: Brief assessment.

Return ONLY a clean JSON object with this exact shape:
{
  "refinedTitle": "string",
  "formattedDescription": "markdown string",
  "suggestedPriority": "Low" | "Medium" | "High" | "Critical",
  "suggestedType": "Bug" | "Feature" | "Task" | "Support"
}`;

      const userPrompt = `Input Title: "${rawTitle}"
Input Notes: "${rawDescription}"
Existing Priority: "${priority || 'None'}"
Client/Project: "${client || 'General'}"
Category: "${category || 'General'}"`;

      const res = await defaultLLMManager.chat({
        systemPrompt,
        userMessage: userPrompt,
      });

      let clean = res.text.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
      }

      try {
        const parsed = JSON.parse(clean);
        return {
          success: true,
          ...parsed,
        };
      } catch {
        return {
          success: true,
          refinedTitle: rawTitle || 'Issue Draft',
          formattedDescription: res.text,
          suggestedPriority: priority || 'Medium',
          suggestedType: 'Bug',
        };
      }
    },
  },
];

export default ticketTools;
