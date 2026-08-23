import axiosInstance from '../api/axiosInstance.js';

export const jarvisService = {
  /**
   * Send utterance to Jarvis Conversational / HR Assistant.
   */
  async chat({ utterance, sessionId, conversationHistory = [] }) {
    const res = await axiosInstance.post('/jarvis/chat', {
      utterance,
      sessionId,
      conversationHistory,
    });
    return res.data;
  },

  /**
   * Execute an authorized action directly.
   */
  async executeAction({ tool, params = {} }) {
    const res = await axiosInstance.post('/jarvis/execute', {
      tool,
      params,
    });
    return res.data;
  },

  /**
   * Fetch smart notification digest.
   */
  async getNotificationDigest() {
    const res = await axiosInstance.post('/jarvis/notifications/digest', {});
    return res.data;
  },

  /**
   * AI Ticket creation drafting assistance.
   */
  async getTicketAssist({ rawTitle, rawDescription, priority, client, category }) {
    const res = await axiosInstance.post('/jarvis/ticket-assist', {
      rawTitle,
      rawDescription,
      priority,
      client,
      category,
    });
    return res.data;
  },

  /**
   * Daily Standup Summarization.
   */
  async generateWorkSummary({ employeeName, date, activities = [], commits = [] }) {
    const res = await axiosInstance.post('/jarvis/summarize', {
      employeeName,
      date,
      activities,
      commits,
    });
    return res.data;
  },

  /**
   * Team Message & Group Chat AI Summarize / Catch-Up.
   */
  async summarizeMessages({ conversationId, limit = 30 }) {
    const res = await axiosInstance.post('/jarvis/messages/summarize', {
      conversationId,
      limit,
    });
    return res.data;
  },

  /**
   * Self-Learning & Token Engine Stats.
   */
  async getStats() {
    const res = await axiosInstance.get('/jarvis/stats');
    return res.data;
  },
};

export default jarvisService;
