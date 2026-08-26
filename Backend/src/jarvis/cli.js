import readline from 'readline';
import dotenv from 'dotenv';
import defaultJarvis from './index.js';
import connectDB from '../Config/ConnectDB.js';
import { defaultTokenEngine } from './tokens/TokenEngine.js';
import { defaultMongoBrainMemoryStore } from './providers/MongoBrainMemoryStore.js';

dotenv.config();

import { defaultRelationshipGraph } from './tokens/RelationshipGraph.js';
import { defaultTokenRegistry } from './tokens/TokenRegistry.js';
import { defaultGraphReasoner } from './reasoning/GraphReasoner.js';
import { defaultModularExpertSpawner } from './neural/ModularExpertSpawner.js';
import { defaultCapacityGovernor } from './neural/CapacityGovernor.js';
import { defaultJarvisNeuralCore } from './neural/JarvisNeuralCore.js';
import { defaultDatasetDistiller } from './neural/DatasetDistiller.js';
import { defaultJarvisTokenizer } from './neural/JarvisTokenizer.js';

function printTrace(ctx) {
  console.log('\n--- J.A.R.V.I.S. Pipeline Trace ---');
  for (const entry of ctx.trace || []) {
    const extra = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    console.log(`[${entry.stage}] ${entry.message}${extra}`);
  }
  console.log('-----------------------------------\n');
}

export let activeExecutionMode = 'full'; // 'full' | 'graph' | 'neural' | 'hybrid'

export async function runTurn(utterance, { showTrace = false, mode = activeExecutionMode } = {}) {
  const startTime = performance.now();

  // Mode C: Pure Neural Execution (Graph OFF, LLM OFF)
  if (mode === 'neural') {
    const promptTokens = defaultJarvisTokenizer.encode(utterance, { addBos: true });
    const generatedTokens = defaultJarvisNeuralCore.generate(promptTokens, { maxNewTokens: 25 });
    const fullText = defaultJarvisTokenizer.decode(generatedTokens);
    const generatedResponse = fullText.slice(utterance.length).trim() || 'No neural activation above threshold.';
    const duration = (performance.now() - startTime).toFixed(2);

    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log(`║ MODE: NEURAL ONLY (Graph OFF, LLM OFF) | Latency: ${duration.padEnd(6)} ms | Cost: 0 TOKENS ║`);
    console.log(`║ Source: JarvisNeuralCore (θ = ${defaultJarvisNeuralCore.weights.wte.length + defaultJarvisNeuralCore.weights.head.length} weights) ║`);
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\nJARVIS (Neural Core θ):');
    console.log(generatedResponse + '\n');
    return { response: generatedResponse, offlineResolved: true, mode: 'neural' };
  }

  // Handle standard, graph, or hybrid pipeline
  const ctx = await defaultJarvis.handle({
    userId: 'admin-cli-user',
    employeeId: 'cli_dev',
    tenantSlug: 'admin',
    utterance,
    disableLLM: mode === 'graph' || mode === 'hybrid',
  });
  const duration = (performance.now() - startTime).toFixed(2);

  if (showTrace) {
    printTrace(ctx);
  }

  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║ Mode: ${mode.toUpperCase().padEnd(7)} | Latency: ${duration.padEnd(8)} ms | Cost: ${ctx.offlineResolved ? '0 TOKENS (Offline)' : 'LLM Billed'} ║`);
  console.log(`║ Execution Pathway  : ${(ctx.intent?.type || 'dynamic_query').padEnd(20)} | Source: ${(ctx.intent?.source || 'graph_engine').padEnd(15)} ║`);
  if (ctx.intent?.reasoningResult) {
    console.log(`║ Traversal Depth    : ${String(ctx.intent.reasoningResult.hopCount + ' Hop(s)').padEnd(20)} | Target Type: ${String(ctx.intent.reasoningResult.targetType || 'entity').padEnd(14)} ║`);
  }
  if (ctx.intent?.customAnswer) {
    console.log(`║ Graph Provenance   : ${ctx.intent.customAnswer.slice(0, 56).padEnd(56)} ║`);
  }
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

  console.log('\nJARVIS:');
  console.log(ctx.response + '\n');
  return ctx;
}

function printStats() {
  const tokenCount = defaultTokenRegistry.size || 0;
  const edgeCount = defaultRelationshipGraph.size || 0;
  const reverseLookups = defaultRelationshipGraph.reverseAdjacency?.size || 0;
  const postingTerms = defaultTokenRegistry.wordToTokenIds?.size || 0;

  const baseParams = Object.values(defaultJarvisNeuralCore.weights).reduce((acc, t) => acc + t.length, 0);
  const totalParams = defaultModularExpertSpawner.getTotalParameters() || baseParams;
  const expertCount = defaultModularExpertSpawner.experts.size;

  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║               J.A.R.V.I.S. LIVE COGNITIVE & NEURAL DASHBOARD                 ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log('║ 1. SYMBOLIC COGNITIVE MEMORY (BrainDB & Graph)                               ║');
  console.log(`║    • Registered Entity/Concept Tokens : ${tokenCount.toString().padEnd(36)} ║`);
  console.log(`║    • Relational Directed Edges       : ${edgeCount.toString().padEnd(36)} ║`);
  console.log(`║    • Reverse Adjacency Inverted Map  : ${reverseLookups.toString().padEnd(36)} ║`);
  console.log(`║    • Inverted Index Posting Terms    : ${postingTerms.toString().padEnd(36)} ║`);
  console.log('╟──────────────────────────────────────────────────────────────────────────────╢');
  console.log('║ 2. NEURAL PARAMETER CORE (Trainable Weights θ)                               ║');
  console.log(`║    • Base Model Parameters (θ₀)      : ${baseParams.toLocaleString().padEnd(36)} ║`);
  console.log(`║    • Spawned Modular Experts (Δθ)    : ${expertCount.toString().padEnd(36)} ║`);
  console.log(`║    • Cumulative Trainable Weights (θ): ${totalParams.toLocaleString().padEnd(36)} ║`);
  console.log(`║    • Active Tokenizer Vocabulary (V) : ${defaultJarvisTokenizer.vocabSize.toString().padEnd(36)} ║`);
  console.log('╟──────────────────────────────────────────────────────────────────────────────╢');
  console.log('║ 3. REASONING & DISTILLATION STATUS                                           ║');
  console.log(`║    • Syntactic Frame Generators      : ${defaultDatasetDistiller.syntacticFrames.length.toString().padEnd(36)} ║`);
  console.log(`║    • Deterministic Execution Engine  : N-Hop Variable-Binding Solver (Active) ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
}

async function runLocalTrainCycle() {
  console.log('\n⚡ Initiating Local Dataset Distillation & Gradient Training Step...');
  const dataset = defaultDatasetDistiller.distill();
  console.log(`  -> Distilled ${dataset.trainSet.length} training pairs from live graph.`);

  if (dataset.trainSet.length === 0) {
    console.log('  -> Notice: Graph currently has 0 triples. Seed facts first (e.g. "Remember Chennai is capital of Tamil Nadu").\n');
    return;
  }

  const trainBatch = dataset.trainSet.map((ex) => {
    const fullText = `${ex.prompt} ${ex.target}`;
    const tokens = defaultJarvisTokenizer.encode(fullText);
    const targets = Array.from(tokens.slice(1));
    targets.push(defaultJarvisTokenizer.specialTokens['<|eos|>']);
    return { input: tokens, target: targets };
  });

  const initialLoss = defaultCapacityGovernor.evaluateLoss(defaultJarvisNeuralCore, trainBatch);
  console.log(`  -> Baseline Loss (θ_before): ${initialLoss.toFixed(4)}`);

  // Run 15 gradient steps
  for (let ep = 1; ep <= 15; ep++) {
    for (const b of trainBatch) {
      const { grads } = defaultJarvisNeuralCore.lossAndGrad(b.input, b.target);
      defaultJarvisNeuralCore.step(grads);
    }
  }

  const finalLoss = defaultCapacityGovernor.evaluateLoss(defaultJarvisNeuralCore, trainBatch);
  console.log(`  -> Optimized Loss (θ_after) : ${finalLoss.toFixed(4)} (Delta: ${(finalLoss - initialLoss).toFixed(4)})`);
  console.log('  -> ✅ θ_t -> θ_t+1 parameter update committed to neural weights.');

  const saved = await defaultJarvisNeuralCore.saveCheckpoint();
  if (saved) {
    console.log('  -> 💾 Neural Checkpoint (θ) persisted to MongoDB (jarvis_memories).\n');
  } else {
    console.log('\n');
  }
}

async function main() {
  if (process.env.MONGO_URI) {
    try {
      await connectDB();
      const loaded = await defaultJarvisNeuralCore.loadCheckpoint();
      if (loaded) {
        console.log('🧠 Loaded latest neural parameter checkpoint (θ) from MongoDB.');
      }
    } catch (err) {
      console.warn('[CLI] Database connection notice:', err.message);
    }
  }

  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        J.A.R.V.I.S. Autonomous Neuro-Symbolic Cognitive REPL                 ║');
  console.log('║  Commands: "stats" (live stats) | "train" (run neural training cycle)         ║');
  console.log('║            "trace on/off"       | "exit" (quit)                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  let showTrace = false;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'jarvis> ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    const lower = input.toLowerCase();
    if (lower === 'exit' || lower === 'quit') {
      console.log('Goodbye, sir. J.A.R.V.I.S. signing off.');
      process.exit(0);
    }

    if (lower === 'cls' || lower === 'clear') {
      console.clear();
      rl.prompt();
      return;
    }

    if (lower === 'trace on') {
      showTrace = true;
      console.log('✓ Pipeline trace display enabled.\n');
      rl.prompt();
      return;
    }

    if (lower === 'trace off') {
      showTrace = false;
      console.log('✓ Pipeline trace display disabled.\n');
      rl.prompt();
      return;
    }

    if (lower.startsWith('mode ')) {
      const targetMode = lower.replace('mode ', '').trim();
      if (['full', 'graph', 'neural', 'hybrid'].includes(targetMode)) {
        activeExecutionMode = targetMode;
        console.log(`✓ Active Brain Execution Mode switched to: [${activeExecutionMode.toUpperCase()}]\n`);
      } else {
        console.log('Invalid mode. Available: "mode graph", "mode neural", "mode hybrid", "mode full"\n');
      }
      rl.prompt();
      return;
    }

    if (lower === 'stats') {
      printStats();
      rl.prompt();
      return;
    }

    if (lower === 'train') {
      await runLocalTrainCycle();
      rl.prompt();
      return;
    }

    try {
      await runTurn(input, { showTrace });
    } catch (err) {
      console.error('Error during turn execution:', err.message);
    }

    rl.prompt();
  });
}

main().catch((err) => {
  console.error('Fatal CLI error:', err);
  process.exit(1);
});
