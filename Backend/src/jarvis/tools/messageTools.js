import TeamMessage from '../../models/TeamMessage.js';
import { defaultLLMManager } from '../providers/LLMManager.js';

export const messageTools = [
  {
    name: 'messages.summarizeUnread',
    description: 'Summarize unread or recent conversation/group messages into key takeaways and action items',
    risk: 'low',
    requiresConfirmation: false,
    async handler(params, ctx) {
      const { conversationId, limit = 30 } = params;
      if (!conversationId) {
        return { error: 'conversationId is required to summarize messages' };
      }

      const rawMessages = await TeamMessage.find({
        conversationId,
        isDeleted: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .limit(Math.min(limit, 50))
        .populate('sender', 'basicInfo email')
        .lean();

      if (rawMessages.length === 0) {
        return {
          hasMessages: false,
          summary: 'No messages found in this conversation to summarize.',
        };
      }

      // Reverse to chronological order
      const chronological = rawMessages.reverse();
      const formattedTranscript = chronological
        .map((m) => {
          const sender = m.sender?.basicInfo
            ? `${m.sender.basicInfo.firstName || ''} ${m.sender.basicInfo.lastName || ''}`.trim()
            : 'Team Member';
          return `${sender}: "${m.message}"`;
        })
        .join('\n');

      const systemPrompt = `You are an elite Team Communication Intelligence Assistant for Workhub ERP.
Analyze the following group / conversation transcript and produce a crisp, executive-grade Catch-Up Digest.

Format requirements:
1. 📌 **Key Topics Discussed**: 2-3 concise bullet points.
2. 🎯 **Action Items & Decisions**: Clear actions with assignee name if mentioned.
3. ⚡ **Urgent Notes / Blockers**: Any pending questions or alerts.
Keep it dense, informative, and readable in 15 seconds.`;

      const userPrompt = `Conversation Messages (${chronological.length} total):
${formattedTranscript}

Generate the Catch-Up Digest now:`;

      const res = await defaultLLMManager.chat({
        systemPrompt,
        userMessage: userPrompt,
      });

      return {
        hasMessages: true,
        messageCount: chronological.length,
        summary: res.text,
        generatedAt: new Date().toISOString(),
      };
    },
  },
];

export default messageTools;
