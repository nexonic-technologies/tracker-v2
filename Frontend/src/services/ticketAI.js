// src/services/ticketAI.js
// Enterprise AI Ticket Generation Engine powered by Jarvis Backend
import axiosInstance from '../api/axiosInstance.js';

/**
 * Generates a complete ticket proposal using Jarvis Backend AI Gateway.
 *
 * @param {Object} params
 * @param {string} params.title - Raw ticket title input
 * @param {string} [params.clientName] - Client name for context
 * @param {string} [params.productName] - Product name for context
 * @param {string} [params.rawDescription] - Optional initial user notes
 * @returns {Promise<Object>} { title, userStory, impactAnalysis, acceptanceCriteria, description, priority, suggestedDueDate }
 */
export async function generateTicketWithAI({ title, clientName, productName, rawDescription = '' }) {
  if (!title?.trim()) {
    throw new Error('Ticket title is required to generate AI content.');
  }

  const res = await axiosInstance.post('/jarvis/ticket-assist', {
    rawTitle: title,
    rawDescription,
    client: clientName,
    category: productName,
  });

  const data = res.data;
  return {
    title: data.refinedTitle || title,
    userStory: data.userStory || '',
    impactAnalysis: data.impactAnalysis || '',
    acceptanceCriteria: data.acceptanceCriteria || '',
    description: data.formattedDescription || data.description || '',
    priority: data.suggestedPriority || 'Medium',
    suggestedDueDate: data.suggestedDueDate || '',
    type: data.suggestedType || 'Bug',
    engine: 'JarvisAI',
  };
}

export default { generateTicketWithAI };
