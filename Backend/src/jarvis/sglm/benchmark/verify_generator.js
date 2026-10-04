import { generateBenchmarkDataset, generateReasoningCase } from './DeterministicKnowledgeGenerator.js';
import { createBenchmarkConfig } from './BenchmarkConfig.js';

function verifyGenerator() {
  console.log('========================================================================================');
  console.log('  VERIFYING DETERMINISTIC KNOWLEDGE GENERATOR & REPRODUCIBILITY');
  console.log('========================================================================================\n');

  const config = createBenchmarkConfig({
    factCounts: [2, 3, 5, 10],
    hopCounts: [1, 2, 3],
    seeds: [101],
    casesPerCell: 2,
  });

  // 1. Run generation twice with same config
  const run1 = generateBenchmarkDataset(config);
  const run2 = generateBenchmarkDataset(config);

  console.log(`[Run 1] Generated Cases: ${run1.totalCases} | Hash: ${run1.datasetHash}`);
  console.log(`[Run 2] Generated Cases: ${run2.totalCases} | Hash: ${run2.datasetHash}`);

  if (run1.datasetHash !== run2.datasetHash) {
    throw new Error('FAILED: Dataset generation is not deterministic!');
  }
  console.log('✓ Cryptographic Determinism: PASSED (Hashes match identically).\n');

  // 2. Inspect 1-hop, 2-hop, 3-hop representative cases
  console.log('--- REPRESENTATIVE MULTI-HOP GENERATION EXAMPLES ---\n');

  const hop1Case = run1.dataset.find(c => c.hopCount === 1 && c.factCount === 3);
  console.log(`[1-Hop Case] (ID: ${hop1Case.caseId}) | Position: ${hop1Case.positionBucket}`);
  console.log(`  Context:  ${hop1Case.contextText}`);
  console.log(`  Query:    ${hop1Case.queryText}`);
  console.log(`  Expected: ${hop1Case.expectedAnswer}`);
  console.log(`  Target Chain: ${hop1Case.targetChain.map(f => `${f.sub}->(${f.rel})->${f.obj}`).join(' | ')}\n`);

  const hop2Case = run1.dataset.find(c => c.hopCount === 2 && c.factCount === 5);
  console.log(`[2-Hop Case] (ID: ${hop2Case.caseId}) | Position: ${hop2Case.positionBucket} | Form: ${hop2Case.queryForm}`);
  console.log(`  Context:  ${hop2Case.contextText}`);
  console.log(`  Query:    ${hop2Case.queryText}`);
  console.log(`  Expected: ${hop2Case.expectedAnswer}`);
  console.log(`  Target Chain: ${hop2Case.targetChain.map(f => `${f.sub}->(${f.rel})->${f.obj}`).join(' | ')}\n`);

  const hop3Case = run1.dataset.find(c => c.hopCount === 3 && c.factCount === 10);
  console.log(`[3-Hop Case] (ID: ${hop3Case.caseId}) | Position: ${hop3Case.positionBucket} | Form: ${hop3Case.queryForm}`);
  console.log(`  Context:  ${hop3Case.contextText}`);
  console.log(`  Query:    ${hop3Case.queryText}`);
  console.log(`  Expected: ${hop3Case.expectedAnswer}`);
  console.log(`  Target Chain: ${hop3Case.targetChain.map(f => `${f.sub}->(${f.rel})->${f.obj}`).join(' | ')}\n`);

  console.log('✓ All verification checks passed.');
}

verifyGenerator();
