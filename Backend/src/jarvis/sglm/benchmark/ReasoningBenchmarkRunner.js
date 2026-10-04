/**
 * ReasoningBenchmarkRunner.js
 * 
 * Central execution engine for the Generic SGLM Reasoning Benchmark.
 * Evaluates models across the full HOP x FACT_COUNT matrix, measuring:
 * - Answer Accuracy
 * - Target Fact Routing
 * - Multi-Hop Intermediate Identification
 * - Position Robustness (Early, Middle, Late)
 * - Query Sensitivity (Counterfactual query responsiveness)
 * 
 * Outputs machine-readable JSON and human-readable capability matrices.
 */

import fs from 'fs';
import path from 'path';
import { generateBenchmarkDataset, generateTrainingBatch } from './DeterministicKnowledgeGenerator.js';
import { createBenchmarkConfig } from './BenchmarkConfig.js';
import { TransparentInspectableTokenizer } from '../kernel/TransparentInspectableTokenizer.js';
import { MultiHeadCopyTransformer } from '../kernel/MultiHeadCopyTransformer.js';
import { AnalyticalAdamWTrainer } from '../kernel/AnalyticalAdamWTrainer.js';

export class ReasoningBenchmarkRunner {
  constructor(config = {}) {
    this.config = createBenchmarkConfig(config);
  }

  /**
   * Initializes tokenizer with standard vocabulary, relations, and entity pools.
   */
  _setupTokenizer() {
    const tokenizer = new TransparentInspectableTokenizer();
    
    // Register training and eval entities
    for (const ent of this.config.entityPools.train) tokenizer.resolveOrRegister(ent);
    for (const ent of this.config.entityPools.eval) tokenizer.resolveOrRegister(ent);

    // Register relations and syntax words
    const syntaxTokens = [
      'Who', 'is', 'of', '?', '.', 'What', 'Tell', 'me', 'the', "'s", 'Which',
      'brother', 'father', 'mother', 'sister', 'mentor', 'friend', 'capital'
    ];
    for (const rel of this.config.relations) {
      tokenizer.resolveOrRegister(rel.name);
      tokenizer.resolveOrRegister(rel.questionWord);
    }
    for (const tok of syntaxTokens) tokenizer.resolveOrRegister(tok);

    return tokenizer;
  }

  /**
   * Trains a fresh model checkpoint for a given seed.
   */
  _trainCheckpoint(seedVal, tokenizer) {
    const model = new MultiHeadCopyTransformer({
      vocabSize: tokenizer.vocabSize + 20,
      dModel: 64,
      nLayers: 2,
      nHeads: 4,
      nCopyHeads: 2,
      maxSeqLen: this.config.maxSeqLen,
      copyWeight: 1.0,
      positionEncoding: 'rope',
      rng: (() => {
        let a = (seedVal ^ 0xABCD9876) >>> 0;
        return function() {
          let t = (a += 0x6D2B79F5);
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      })(),
    });

    const trainer = new AnalyticalAdamWTrainer({
      model,
      learningRate: 0.001,
      weightDecay: 0.0001,
    });

    const trainBatch = generateTrainingBatch({
      seed: seedVal,
      batchSize: 80,
      maxFacts: 4,
      relations: this.config.relations,
      entityPool: this.config.entityPools.train,
      tokenizer,
    });

    let finalLoss = 0;
    for (let ep = 1; ep <= 35; ep++) {
      const res = trainer.trainBatch(trainBatch);
      finalLoss = res.meanLoss;
    }

    return { model, finalLoss };
  }

  /**
   * Evaluates a single reasoning case on a model.
   */
  _evaluateCase(model, tokenizer, testCase) {
    const tokenIds = tokenizer.encode(testCase.fullPrompt, { addBos: true });
    const contextTokens = tokenizer.encode(testCase.contextText, { addBos: true });
    
    const qStart = contextTokens.length;
    const qEnd = tokenIds.length - 1;
    const querySpan = [qStart, qEnd];

    const forwardRes = model.forward(tokenIds, true, true, true, 20.0, querySpan);
    const { tokenProbs, copyWeights } = forwardRes;
    const T = tokenIds.length;
    const qPos = T - 1;

    // 1. Top Predicted Token
    let maxP = -Infinity, predId = 0;
    for (let c = 0; c < model.vocabSize; c++) {
      const p = tokenProbs[qPos * model.vocabSize + c];
      if (p > maxP) {
        maxP = p;
        predId = c;
      }
    }
    const predWord = tokenizer.decode([predId]).trim();
    const isAnswerCorrect = (predWord === testCase.expectedAnswer);

    // 2. Fact Spans & Internal Routing Analysis
    let curIdx = 1; // start after BOS
    const factSpans = [];
    for (let f = 0; f < testCase.allFacts.length; f++) {
      const clauseTokens = tokenizer.encode(`${testCase.allFacts[f].sub} is ${testCase.allFacts[f].rel} of ${testCase.allFacts[f].obj} .`, { addBos: false });
      const start = curIdx;
      const end = curIdx + clauseTokens.length - 1;
      factSpans.push({ fact: testCase.allFacts[f], start, end, factIndex: f });
      curIdx = end + 1;
    }

    // Measure copy/retrieval attention mass per fact
    const factAttn = [];
    for (const fs of factSpans) {
      let mass = 0;
      for (let p = fs.start; p <= Math.min(fs.end, T - 1); p++) {
        mass += copyWeights[qPos * T + p];
      }
      factAttn.push({ fact: fs.fact, factIndex: fs.factIndex, mass });
    }
    factAttn.sort((a, b) => b.mass - a.mass);

    // Target Fact Identification: Does top routed fact belong to the target reasoning chain?
    const topRouted = factAttn[0];
    const isTargetFactRouted = topRouted ? topRouted.fact.isTarget : false;

    // Multi-Hop Intermediate Tracking
    const intermediateHopRouted = testCase.targetChain.map(targetHop => {
      const match = factAttn.find(fa => fa.fact.sub === targetHop.sub && fa.fact.rel === targetHop.rel && fa.fact.obj === targetHop.obj);
      return match ? match.mass : 0;
    });

    // 3. Counterfactual Query Sensitivity Check
    let querySensitive = null;
    if (testCase.sensitivityCase) {
      const altTokenIds = tokenizer.encode(testCase.sensitivityCase.fullPrompt, { addBos: true });
      const altContextTokens = tokenizer.encode(testCase.contextText, { addBos: true });
      const altQSpan = [altContextTokens.length, altTokenIds.length - 1];

      const altRes = model.forward(altTokenIds, true, true, true, 20.0, altQSpan);
      let altMaxP = -Infinity, altPredId = 0;
      const altQPos = altTokenIds.length - 1;
      for (let c = 0; c < model.vocabSize; c++) {
        const p = altRes.tokenProbs[altQPos * model.vocabSize + c];
        if (p > altMaxP) {
          altMaxP = p;
          altPredId = c;
        }
      }
      const altPredWord = tokenizer.decode([altPredId]).trim();
      
      // Sensitive if the model produced a different prediction when asked a different question
      querySensitive = (altPredWord !== predWord);
    }

    return {
      caseId: testCase.caseId,
      seed: testCase.seed,
      hopCount: testCase.hopCount,
      factCount: testCase.factCount,
      positionBucket: testCase.positionBucket,
      queryForm: testCase.queryForm,
      expectedAnswer: testCase.expectedAnswer,
      predictedAnswer: predWord,
      isAnswerCorrect,
      isTargetFactRouted,
      topRoutedFact: topRouted ? `${topRouted.fact.sub} is ${topRouted.fact.rel} of ${topRouted.fact.obj}` : 'none',
      topRoutedMass: topRouted ? topRouted.mass : 0,
      intermediateHopRouted,
      querySensitive,
    };
  }

  /**
   * Runs the full benchmark sweep across the HOP x FACT_COUNT matrix and all seeds.
   */
  async run() {
    console.log('========================================================================================');
    console.log('  STARTING GENERIC SGLM REASONING BENCHMARK SUITE');
    console.log('========================================================================================');

    const startTime = Date.now();
    const tokenizer = this._setupTokenizer();
    
    // 1. Generate Deterministic Evaluation Dataset
    const { dataset, datasetHash, totalCases } = generateBenchmarkDataset(this.config);
    console.log(`[Dataset] Generated ${totalCases} deterministic test cases.`);
    console.log(`[Dataset] Cryptographic SHA-256 Hash: ${datasetHash}\n`);

    const detailedCaseLogs = [];
    const matrixStats = {}; // [hop][fact] -> stats
    const positionStats = { early: { correct: 0, total: 0 }, middle: { correct: 0, total: 0 }, late: { correct: 0, total: 0 } };
    let totalSensitivityTested = 0;
    let totalSensitivityPassed = 0;

    // Initialize matrix cells
    for (const h of this.config.hopCounts) {
      matrixStats[h] = {};
      for (const f of this.config.factCounts) {
        if (f < h) continue;
        matrixStats[h][f] = {
          total: 0,
          correctAnswer: 0,
          targetRouted: 0,
          earlyCorrect: 0, earlyTotal: 0,
          midCorrect: 0, midTotal: 0,
          lateCorrect: 0, lateTotal: 0,
          sensitivityPassed: 0, sensitivityTotal: 0,
        };
      }
    }

    // 2. Iterate over seeds
    for (const seed of this.config.seeds) {
      process.stdout.write(`[Seed ${seed}] Training fresh model checkpoint... `);
      const { model, finalLoss } = this._trainCheckpoint(seed, tokenizer);
      console.log(`converged (Loss: ${finalLoss.toFixed(4)}). Running evaluations...`);

      const seedCases = dataset.filter(c => c.seed === seed);

      for (const testCase of seedCases) {
        const evalRes = this._evaluateCase(model, tokenizer, testCase);
        detailedCaseLogs.push(evalRes);

        const cell = matrixStats[testCase.hopCount][testCase.factCount];
        cell.total++;
        if (evalRes.isAnswerCorrect) cell.correctAnswer++;
        if (evalRes.isTargetFactRouted) cell.targetRouted++;

        // Position tracking
        const pBucket = testCase.positionBucket;
        positionStats[pBucket].total++;
        if (evalRes.isAnswerCorrect) positionStats[pBucket].correct++;

        if (pBucket === 'early') {
          cell.earlyTotal++;
          if (evalRes.isAnswerCorrect) cell.earlyCorrect++;
        } else if (pBucket === 'late') {
          cell.lateTotal++;
          if (evalRes.isAnswerCorrect) cell.lateCorrect++;
        } else {
          cell.midTotal++;
          if (evalRes.isAnswerCorrect) cell.midCorrect++;
        }

        // Sensitivity tracking
        if (evalRes.querySensitive !== null) {
          totalSensitivityTested++;
          cell.sensitivityTotal++;
          if (evalRes.querySensitive) {
            totalSensitivityPassed++;
            cell.sensitivityPassed++;
          }
        }
      }
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    // 3. Render and format reports
    const matrixReport = this._renderCapabilityMatrix(matrixStats);
    const positionReport = this._renderPositionReport(positionStats);
    const sensitivityReport = this._renderSensitivityReport(totalSensitivityPassed, totalSensitivityTested);

    console.log('\n' + matrixReport);
    console.log(positionReport);
    console.log(sensitivityReport);

    // 4. Save Machine-Readable JSON Result
    const resultsPayload = {
      benchmarkVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      durationSeconds: parseFloat(durationSeconds),
      datasetHash,
      totalCases,
      config: this.config,
      matrixStats,
      positionStats,
      querySensitivityOverall: totalSensitivityTested > 0 ? (totalSensitivityPassed / totalSensitivityTested) : null,
      detailedCaseLogs,
    };

    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    const jsonPath = path.join(this.config.outputDir, `benchmark_results_${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(resultsPayload, null, 2), 'utf8');
    console.log(`\n[Output] Full machine-readable benchmark results saved to:`);
    console.log(`         ${jsonPath}`);

    return {
      resultsPayload,
      matrixReport,
      positionReport,
      sensitivityReport,
      jsonPath,
    };
  }

  /**
   * Formats the HOP x FACT_COUNT capability matrix table.
   */
  _renderCapabilityMatrix(matrixStats) {
    const factHeaders = this.config.factCounts.map(f => String(f).padStart(8)).join('');
    let str = '';
    str += '========================================================================================\n';
    str += '  SGLM REASONING CAPABILITY MATRIX (Aggregate Accuracy across Seeds)\n';
    str += '========================================================================================\n';
    str += `Facts ->${factHeaders}\n`;
    str += '----------------------------------------------------------------------------------------\n';

    for (const h of this.config.hopCounts) {
      let row = `${h} Hop`.padEnd(8);
      for (const f of this.config.factCounts) {
        if (f < h) {
          row += '       -';
        } else {
          const cell = matrixStats[h][f];
          const acc = cell.total > 0 ? ((cell.correctAnswer / cell.total) * 100).toFixed(1) + '%' : 'N/A';
          row += acc.padStart(8);
        }
      }
      str += row + '\n';
    }
    str += '========================================================================================\n';
    return str;
  }

  /**
   * Formats the Position Robustness report table.
   */
  _renderPositionReport(positionStats) {
    let str = '';
    str += '========================================================================================\n';
    str += '  POSITION ROBUSTNESS BREAKDOWN (Target Chain Placement Invariance)\n';
    str += '========================================================================================\n';
    
    const eAcc = positionStats.early.total > 0 ? ((positionStats.early.correct / positionStats.early.total) * 100).toFixed(1) + '%' : 'N/A';
    const mAcc = positionStats.middle.total > 0 ? ((positionStats.middle.correct / positionStats.middle.total) * 100).toFixed(1) + '%' : 'N/A';
    const lAcc = positionStats.late.total > 0 ? ((positionStats.late.correct / positionStats.late.total) * 100).toFixed(1) + '%' : 'N/A';

    str += `  Target Early  (First 33% of context):  ${eAcc.padStart(7)} (${positionStats.early.correct}/${positionStats.early.total})\n`;
    str += `  Target Middle (Middle 33% of context): ${mAcc.padStart(7)} (${positionStats.middle.correct}/${positionStats.middle.total})\n`;
    str += `  Target Late   (Last 33% of context):   ${lAcc.padStart(7)} (${positionStats.late.correct}/${positionStats.late.total})\n`;
    str += '========================================================================================\n';
    return str;
  }

  /**
   * Formats the Query Sensitivity report.
   */
  _renderSensitivityReport(passed, total) {
    const rate = total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : 'N/A';
    let str = '';
    str += '========================================================================================\n';
    str += '  QUERY SENSITIVITY INDEX (Counterfactual Query Routing)\n';
    str += '========================================================================================\n';
    str += `  Rate of Prediction Alteration under Divergent Query: ${rate} (${passed}/${total})\n`;
    str += `  [Criterion] > 75% = High Query Sensitivity | < 40% = Fixed Shortcut / Context Dominance\n`;
    str += '========================================================================================\n';
    return str;
  }
}
