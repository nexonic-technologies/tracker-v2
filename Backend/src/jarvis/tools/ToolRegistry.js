import { hrmsTools } from './hrmsTools.js';
import { notificationTools } from './notificationTools.js';
import { summarizerTools } from './summarizerTools.js';
import { ticketTools } from './ticketTools.js';
import { messageTools } from './messageTools.js';
import { mathTools } from './mathTools.js';
import { browserTools } from './browserTools.js';

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this._registerDefaults();
  }

  _registerDefaults() {
    const all = [
      ...hrmsTools,
      ...notificationTools,
      ...summarizerTools,
      ...ticketTools,
      ...messageTools,
      ...mathTools,
      ...browserTools,
    ];
    for (const tool of all) {
      this.registerTool(tool);
    }
  }

  registerTool(tool) {
    if (!tool.name) throw new Error('Tool must have a name');
    this.tools.set(tool.name, tool);
  }

  getTool(name) {
    return this.tools.get(name) || null;
  }

  hasTool(name) {
    return this.tools.has(name);
  }

  getAllTools() {
    return Array.from(this.tools.values());
  }

  getToolSchemas() {
    return this.getAllTools().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters || null,
      risk: t.risk || 'low',
      requiresConfirmation: Boolean(t.requiresConfirmation),
    }));
  }
}

export const defaultToolRegistry = new ToolRegistry();
export default defaultToolRegistry;
