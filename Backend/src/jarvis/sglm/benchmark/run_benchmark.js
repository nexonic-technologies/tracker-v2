#!/usr/bin/env node
/**
 * run_benchmark.js
 * 
 * Executable CLI entrypoint for the Generic SGLM Reasoning Benchmark.
 * 
 * Usage examples:
 *   node .\Backend\src\jarvis\sglm\benchmark\run_benchmark.js --quick
 *   node .\Backend\src\jarvis\sglm\benchmark\run_benchmark.js --facts=2,3,5,10 --hops=1,2,3 --seeds=101
 *   node .\Backend\src\jarvis\sglm\benchmark\run_benchmark.js --facts=2,3,5,10,20,50 --hops=1,2,3 --seeds=42,101,2026,777,9999
 */

import { ReasoningBenchmarkRunner } from './ReasoningBenchmarkRunner.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const configOverrides = {};

  for (const arg of args) {
    if (arg === '--quick') {
      configOverrides.factCounts = [2, 3, 5];
      configOverrides.hopCounts = [1, 2];
      configOverrides.seeds = [101];
      configOverrides.casesPerCell = 3;
    } else if (arg.startsWith('--facts=')) {
      configOverrides.factCounts = arg.split('=')[1].split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
    } else if (arg.startsWith('--hops=')) {
      configOverrides.hopCounts = arg.split('=')[1].split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
    } else if (arg.startsWith('--seeds=')) {
      configOverrides.seeds = arg.split('=')[1].split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
    } else if (arg.startsWith('--cases=')) {
      const c = parseInt(arg.split('=')[1], 10);
      if (!isNaN(c)) configOverrides.casesPerCell = c;
    } else if (arg.startsWith('--output=')) {
      configOverrides.outputDir = arg.split('=')[1].trim();
    }
  }

  return configOverrides;
}

async function main() {
  const overrides = parseArgs();
  const runner = new ReasoningBenchmarkRunner(overrides);
  await runner.run();
}

main().catch(err => {
  console.error('\n[Benchmark Error]:', err);
  process.exit(1);
});
