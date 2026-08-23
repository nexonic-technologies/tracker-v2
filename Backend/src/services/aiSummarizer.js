// src/services/aiSummarizer.js
// Enterprise AI Work Summarization Service powered by Jarvis
import defaultJarvis from '../jarvis/index.js';
import { defaultToolRegistry } from '../jarvis/tools/ToolRegistry.js';

/**
 * Generates Daily Work Summary using the central Jarvis pipeline.
 *
 * @param {Object} params
 * @param {string} params.employeeName
 * @param {Date|string} params.date
 * @param {Array} params.activities
 * @param {Array} params.commits
 * @returns {Promise<Object>} { success, summary, provider, generatedAt }
 */
export async function generateDailyWorkSummary(params) {
  const tool = defaultToolRegistry.getTool('summarizer.generateDailySummary');
  if (!tool) {
    throw new Error('Summarizer tool not registered in Jarvis engine');
  }

  return await tool.handler(params);
}

export default {
  generateDailyWorkSummary,
};
