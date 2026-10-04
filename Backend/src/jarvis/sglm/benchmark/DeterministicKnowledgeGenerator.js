/**
 * DeterministicKnowledgeGenerator.js
 * 
 * Generates synthetic multi-hop reasoning graphs, distractor facts,
 * shuffled natural-language contexts, and diverse query formulations.
 * 
 * Implements strict separation:
 * - SGLM receives only the natural-language prompt text.
 * - Ground truth chain, fact spans, and target entities are preserved
 *   strictly in benchmark metadata for scoring.
 */

import crypto from 'crypto';

/**
 * 32-bit deterministic PRNG (Mulberry32).
 */
export function createRng(seed) {
  let a = (seed ^ 0x9E3779B9) >>> 0;
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a single deterministic benchmark test case.
 */
export function generateReasoningCase({
  seed,
  hopCount,
  factCount,
  caseIndex,
  relations,
  entityPool,
  queryForm = 'standard',
  forcedPositionBucket = null, // 'early', 'middle', 'late', or null for random
}) {
  if (factCount < hopCount) {
    throw new Error(`factCount (${factCount}) cannot be smaller than hopCount (${hopCount})`);
  }

  // Deterministic seed derivation
  const caseSeed = (seed * 1000003) ^ (hopCount * 1009) ^ (factCount * 31) ^ (caseIndex * 7919);
  const rng = createRng(caseSeed);

  // 1. Sample distinct entities for the target reasoning chain: E0 -> E1 -> ... -> E_hop
  const neededChainEntities = hopCount + 1;
  const shuffledPool = [...entityPool];
  for (let i = shuffledPool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
  }

  const chainEntities = shuffledPool.slice(0, neededChainEntities);
  const remainingPool = shuffledPool.slice(neededChainEntities);

  // 2. Form the target multi-hop chain
  const targetChain = [];
  for (let h = 0; h < hopCount; h++) {
    const rel = relations[Math.floor(rng() * relations.length)];
    const fact = {
      sub: chainEntities[h],
      rel: rel.name,
      obj: chainEntities[h + 1],
      isTarget: true,
      hopIndex: h,
      meta: rel,
    };
    targetChain.push(fact);
  }
  const expectedAnswer = chainEntities[hopCount];
  const initialSubject = chainEntities[0];

  // 3. Generate (factCount - hopCount) distractor facts
  const distractorCount = factCount - hopCount;
  const distractorFacts = [];
  let poolCursor = 0;

  for (let d = 0; d < distractorCount; d++) {
    let sub, obj;
    if (poolCursor + 1 < remainingPool.length) {
      sub = remainingPool[poolCursor++];
      obj = remainingPool[poolCursor++];
    } else {
      // Fallback: create fresh distractor symbol
      sub = `D${d}_A_${caseIndex}`;
      obj = `D${d}_B_${caseIndex}`;
    }
    const rel = relations[Math.floor(rng() * relations.length)];
    distractorFacts.push({
      sub,
      rel: rel.name,
      obj,
      isTarget: false,
      hopIndex: -1,
      meta: rel,
    });
  }

  // 4. Assemble and order facts (Early, Middle, Late position control)
  // Determine position bucket if not forced
  const positionBucket = forcedPositionBucket || ['early', 'middle', 'late'][Math.floor(rng() * 3)];
  
  // Create all facts array
  let allFacts = [];
  if (distractorCount === 0) {
    allFacts = [...targetChain];
  } else {
    // Insert target chain according to position bucket
    // Early: target chain placed near start
    // Middle: target chain placed in the middle
    // Late: target chain placed near end
    let insertStart;
    if (positionBucket === 'early') {
      insertStart = 0;
    } else if (positionBucket === 'late') {
      insertStart = distractorFacts.length;
    } else { // middle
      insertStart = Math.floor(distractorFacts.length / 2);
    }

    allFacts = [...distractorFacts];
    allFacts.splice(insertStart, 0, ...targetChain);

    // Minor local jitter within distractors to avoid fixed patterns
    for (let i = 0; i < allFacts.length; i++) {
      if (!allFacts[i].isTarget && rng() < 0.2) {
        const swapWith = Math.floor(rng() * allFacts.length);
        if (!allFacts[swapWith].isTarget) {
          [allFacts[i], allFacts[swapWith]] = [allFacts[swapWith], allFacts[i]];
        }
      }
    }
  }

  // Re-verify average target position in context
  const targetIndices = [];
  for (let i = 0; i < allFacts.length; i++) {
    if (allFacts[i].isTarget) targetIndices.push(i);
  }
  const avgTargetPos = targetIndices.reduce((s, idx) => s + idx, 0) / (targetIndices.length || 1);
  const normalizedPos = avgTargetPos / (allFacts.length - 1 || 1);
  let resolvedBucket = 'middle';
  if (normalizedPos <= 0.33) resolvedBucket = 'early';
  else if (normalizedPos >= 0.67) resolvedBucket = 'late';

  // 5. Generate Natural Language Context
  const factClauses = allFacts.map(f => `${f.sub} is ${f.rel} of ${f.obj}`);
  const contextText = factClauses.join(' . ') + ' .';

  // 6. Generate Natural Language Query
  const finalRelMeta = targetChain[targetChain.length - 1].meta;
  const qWord = finalRelMeta.questionWord;

  let queryText = '';
  if (queryForm === 'saxon') {
    // Saxon genitive multi-hop:
    // 1-hop: Who is A's brother ?
    // 2-hop: Who is A's brother's father ?
    // 3-hop: Who is A's brother's father's mother ?
    let expr = initialSubject;
    for (let h = 0; h < hopCount; h++) {
      expr = `${expr}'s ${targetChain[h].rel}`;
    }
    queryText = `${qWord} is ${expr} ?`;
  } else {
    // Standard prepositional multi-hop:
    // 1-hop: Who is brother of A ?
    // 2-hop: Who is father of brother of A ?
    // 3-hop: Who is mother of father of brother of A ?
    let relChain = '';
    for (let h = hopCount - 1; h >= 0; h--) {
      relChain += `${targetChain[h].rel} of `;
    }
    queryText = `${qWord} is ${relChain}${initialSubject} ?`;
  }

  // Full Natural Language Prompt presented to SGLM
  const fullPrompt = `${contextText} ${queryText}`;

  // 7. Counterfactual Sensitivity Query (Queries an unrelated distractor fact in same context)
  let sensitivityCase = null;
  if (distractorFacts.length > 0) {
    const distractorToQuery = distractorFacts[0];
    const dQWord = distractorToQuery.meta.questionWord;
    const distractorQueryText = `${dQWord} is ${distractorToQuery.rel} of ${distractorToQuery.sub} ?`;
    sensitivityCase = {
      queryText: distractorQueryText,
      fullPrompt: `${contextText} ${distractorQueryText}`,
      expectedAnswer: distractorToQuery.obj,
      targetSub: distractorToQuery.sub,
      targetRel: distractorToQuery.rel,
    };
  }

  const caseId = `CASE_S${seed}_H${hopCount}_F${factCount}_C${caseIndex}`;

  if (globalThis.__SGLM_TRACE__) {
    console.log(`[FILE: DeterministicKnowledgeGenerator.js]`);
    console.log(`[LINE: 204]`);
    console.log(`[FUNCTION: generateReasoningCase()]`);
    console.log(`[ACTION: DATASET_GENERATED]\n`);
    console.log(`Facts (${allFacts.length}):`);
    allFacts.forEach((f, idx) => {
      console.log(`  Fact ${idx + 1}: ${f.sub} is ${f.rel} of ${f.obj} .${f.isTarget ? ' [TARGET FACT]' : ''}`);
    });
    console.log(`\nQuestion:\n  ${queryText}`);
    console.log(`\nExpected answer:\n  ${expectedAnswer}\n`);
  }

  return {
    caseId,
    seed,
    hopCount,
    factCount,
    caseIndex,
    queryForm,
    positionBucket: resolvedBucket,
    avgTargetPos,
    contextText,
    queryText,
    fullPrompt,
    expectedAnswer,
    initialSubject,
    targetChain,
    allFacts,
    distractorFacts,
    sensitivityCase,
  };
}

/**
 * Generates an entire benchmark evaluation suite across parameters.
 */
export function generateBenchmarkDataset(config) {
  const dataset = [];
  const { seeds, hopCounts, factCounts, casesPerCell, relations, entityPools, queryForms } = config;

  for (const seed of seeds) {
    for (const hopCount of hopCounts) {
      for (const factCount of factCounts) {
        if (factCount < hopCount) continue; // Invalid: fact count must be >= hop depth

        for (let c = 0; c < casesPerCell; c++) {
          const queryForm = queryForms[c % queryForms.length];
          const bucket = config.positionBuckets[c % config.positionBuckets.length];

          const testCase = generateReasoningCase({
            seed,
            hopCount,
            factCount,
            caseIndex: c,
            relations,
            entityPool: entityPools.eval,
            queryForm,
            forcedPositionBucket: bucket,
          });
          dataset.push(testCase);
        }
      }
    }
  }

  // Compute dataset SHA-256 hash for absolute reproducibility verification
  const hash = crypto.createHash('sha256');
  for (const item of dataset) {
    hash.update(`${item.caseId}|${item.fullPrompt}|${item.expectedAnswer}`);
  }
  const datasetHash = hash.digest('hex');

  return {
    dataset,
    datasetHash,
    totalCases: dataset.length,
    config,
  };
}

/**
 * Generates training batches (disjoint from evaluation entities).
 */
export function generateTrainingBatch({
  seed = 42,
  batchSize = 80,
  maxFacts = 4,
  factCount = null,
  relations,
  entityPool,
  tokenizer,
}) {
  const rng = createRng(seed);
  const trainBatch = [];

  for (let i = 0; i < batchSize; i++) {
    const numFacts = factCount ? factCount : (Math.floor(rng() * maxFacts) + 1);
    const testCase = generateReasoningCase({
      seed: seed + i * 17,
      hopCount: 1, // standard 1-hop pre-training
      factCount: Math.max(2, numFacts),
      caseIndex: i,
      relations,
      entityPool,
      queryForm: 'standard',
    });

    const promptTokens = tokenizer.encode(testCase.fullPrompt, { addBos: true });
    const targetId = tokenizer.resolveOrRegister(testCase.expectedAnswer);
    const fullTokens = [...promptTokens, targetId];

    const contextTokens = tokenizer.encode(testCase.contextText, { addBos: true });
    const qStart = contextTokens.length;
    const qEnd = promptTokens.length - 1;

    trainBatch.push({
      input: fullTokens.slice(0, -1),
      target: fullTokens.slice(1),
      lossMask: fullTokens.slice(0, -1).map((_, idx) => idx === fullTokens.length - 2 ? 1 : 0),
      preventSelfCopy: true,
      maskBOS: true,
      normQK: true,
      copyScale: 20.0,
      querySpan: [qStart, qEnd],
    });
  }

  return trainBatch;
}
