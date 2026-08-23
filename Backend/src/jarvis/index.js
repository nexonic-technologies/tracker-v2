import { JarvisCore } from './core/JarvisCore.js';
import { JarvisContext } from './core/JarvisContext.js';
import { ContextManager } from './stages/ContextManager.js';
import { MemoryStore } from './stages/MemoryStore.js';
import { IntentClassifier } from './stages/IntentClassifier.js';
import { TaskPlanner } from './stages/TaskPlanner.js';
import { PolicyEngine } from './stages/PolicyEngine.js';
import { ToolEngine } from './stages/ToolEngine.js';
import { Verifier } from './stages/Verifier.js';
import { LearningAnalyst } from './stages/LearningAnalyst.js';
import { ResponseGenerator } from './stages/ResponseGenerator.js';
import { ToolRegistry, defaultToolRegistry } from './tools/ToolRegistry.js';
import { defaultTokenEngine } from './tokens/TokenEngine.js';
import { defaultMongoBrainMemoryStore } from './providers/MongoBrainMemoryStore.js';
import { defaultLLMManager } from './providers/LLMManager.js';

export function buildJarvis({ toolRegistry = defaultToolRegistry, llmManager = defaultLLMManager } = {}) {
  const policyEngine = new PolicyEngine({ toolRegistry });
  const toolEngine = new ToolEngine(toolRegistry, policyEngine);

  return new JarvisCore({
    contextManager: new ContextManager(),
    memoryStore: new MemoryStore({
      brainMemory: defaultMongoBrainMemoryStore,
      tokenEngine: defaultTokenEngine,
    }),
    intentClassifier: new IntentClassifier({
      toolRegistry,
      llmManager,
    }),
    taskPlanner: new TaskPlanner(),
    toolEngine,
    verifier: new Verifier(),
    learningAnalyst: new LearningAnalyst({
      brainMemory: defaultMongoBrainMemoryStore,
      llmManager,
    }),
    responseGenerator: new ResponseGenerator({
      llmManager,
    }),
  });
}

export const defaultJarvis = buildJarvis();
export { JarvisCore, JarvisContext, defaultTokenEngine, defaultMongoBrainMemoryStore, defaultLLMManager };
export default defaultJarvis;
