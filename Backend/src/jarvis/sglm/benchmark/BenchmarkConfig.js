/**
 * BenchmarkConfig.js
 * 
 * Generic configuration object for SGLM Reasoning Benchmark.
 * Supports arbitrary extension of fact counts, hop counts, seeds,
 * relation sets, and query forms without modifying harness logic.
 */

export const DEFAULT_BENCHMARK_CONFIG = {
  // Fact count sweep (number of facts in context: target chain + distractors)
  factCounts: [2, 3, 5, 10, 20, 50],
  
  // Hop count sweep (reasoning chain depth: 1-hop, 2-hop, 3-hop, etc.)
  hopCounts: [1, 2, 3],
  
  // Model evaluation seeds
  seeds: [42, 101, 2026, 777, 9999],
  
  // Extensible relation library with semantics and question form mappings
  relations: [
    { name: 'brother', type: 'person', questionWord: 'Who', prep: 'of' },
    { name: 'father',  type: 'person', questionWord: 'Who', prep: 'of' },
    { name: 'mother',  type: 'person', questionWord: 'Who', prep: 'of' },
    { name: 'sister',  type: 'person', questionWord: 'Who', prep: 'of' },
    { name: 'mentor',  type: 'person', questionWord: 'Who', prep: 'of' },
    { name: 'friend',  type: 'person', questionWord: 'Who', prep: 'of' },
    { name: 'capital', type: 'place',  questionWord: 'What', prep: 'of' },
  ],

  // Multiple query formulations
  queryForms: ['standard', 'saxon'],

  // Entity Pools (Strict separation between training and held-out evaluation)
  entityPools: {
    // Standard training entities pool (A-Z, A1-Z1)
    train: (() => {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const pool = [];
      for (let i = 0; i < alphabet.length; i++) pool.push(alphabet[i]);
      for (let i = 0; i < alphabet.length; i++) pool.push(`${alphabet[i]}1`);
      for (let i = 0; i < alphabet.length; i++) pool.push(`${alphabet[i]}2`);
      return pool;
    })(),

    // Strictly held-out evaluation entities pool (never seen during training)
    eval: (() => {
      const pool = [];
      for (let i = 1; i <= 100; i++) {
        pool.push(`E${i}_eval`);
        pool.push(`T${i}_eval`);
      }
      return pool;
    })()
  },

  // Number of benchmark evaluation cases per (hop, factCount) cell per seed
  casesPerCell: 6,

  // Position buckets to guarantee balance
  positionBuckets: ['early', 'middle', 'late'],

  // Max sequence length limit for safety
  maxSeqLen: 512,

  // Output directories
  outputDir: './Backend/src/jarvis/sglm/benchmark/results'
};

/**
 * Creates a merged config with user overrides.
 */
export function createBenchmarkConfig(overrides = {}) {
  return {
    ...DEFAULT_BENCHMARK_CONFIG,
    ...overrides,
    relations: overrides.relations || DEFAULT_BENCHMARK_CONFIG.relations,
    factCounts: overrides.factCounts || DEFAULT_BENCHMARK_CONFIG.factCounts,
    hopCounts: overrides.hopCounts || DEFAULT_BENCHMARK_CONFIG.hopCounts,
    seeds: overrides.seeds || DEFAULT_BENCHMARK_CONFIG.seeds,
  };
}
