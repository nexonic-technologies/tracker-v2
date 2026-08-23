import { defaultLLMManager } from '../providers/LLMManager.js';

export const summarizerTools = [
  {
    name: 'summarizer.generateDailySummary',
    description: 'Generate structured executive daily standup summary from activities and git commits',
    risk: 'low',
    requiresConfirmation: false,
    async handler(params) {
      const { employeeName, date, activities = [], commits = [] } = params;

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
        year: 'numeric',
      });

      const systemPrompt = `You are an elite Engineering & Operations Standup Assistant for Workhub ERP.
Your task is to take raw daily activities and git commits for an employee and generate a crisp, executive-grade Daily Work Summary.
Format rules:
1. Group accomplishments by Client / Feature / Project.
2. Include:
   - 🎯 **Key Accomplishments**: What was shipped, fixed, or designed.
   - 💼 **Client & Project Progress**: Deliverables summary.
   - 🐙 **Code & Git Milestones**: Brief mention of core technical commits.
   - 🚀 **Next Steps / Priorities**: Logical follow-ups for tomorrow.
3. Keep it concise, executive-friendly, and ready to paste into Slack, Teams, or daily checkout emails.`;

      const userPrompt = `Employee: ${employeeName || 'Team Member'}
Date: ${formattedDate}

--- LOGGED ACTIVITIES ---
${activitiesList}

--- DETECTED GIT COMMITS ---
${commitsList}

Generate the structured Daily Standup & Work Summary now.`;

      const res = await defaultLLMManager.chat({
        systemPrompt,
        userMessage: userPrompt,
      });

      return {
        success: true,
        summary: res.text,
        provider: res.providerName,
        generatedAt: new Date().toISOString(),
      };
    },
  },
];

export default summarizerTools;
