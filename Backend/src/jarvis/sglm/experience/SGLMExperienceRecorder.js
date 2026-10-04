/**
 * SGLMExperienceRecorder.js
 *
 * STEP 1: SGLM Execution Experience Recorder.
 *
 * Purpose:
 * Preserves the complete raw execution of the current SGLM neural model at every stage
 * without interpretation, without LLMs, without regex heuristics, and without JavaScript
 * deciding the answer.
 *
 * Captures:
 * 1. Original natural-language query
 * 2. Tokenized query
 * 3. Context / memory input actually provided
 * 4. Raw memory query & raw memory results (if memory is involved)
 * 5. Full tokenized sequence & token spans
 * 6. SGLM forward-pass output & raw logits
 * 7. Token probabilities / confidence distribution
 * 8. Attention tensors (self-attention per layer & head, copy-head attention per head, ensemble attention)
 * 9. Relevant intermediate / hidden tensors (x0, xFinal, xCopy, xQuery, salience weights)
 * 10. Raw neural final output (pure argmax from neural probability distribution)
 * 11. Ground-truth expected result comparison (strict equality)
 * 12. Full execution metadata (hyperparameters, timing, shapes)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SGLMExperienceRecorder {
  constructor({ storageDir = null } = {}) {
    this.storageDir = storageDir || path.resolve(__dirname, 'records');
    this._ensureStorageDir();
  }

  _ensureStorageDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  _computeNorm(arr) {
    if (!arr) return 0;
    let sumSq = 0;
    for (let i = 0; i < arr.length; i++) sumSq += arr[i] * arr[i];
    return Math.sqrt(sumSq);
  }

  /**
   * Captures raw neural computation from a forward pass.
   * Pure data extraction — zero interpretation.
   */
  _captureNeuralComputation({ model, tokenizer, tokenIds, querySpan, forwardRes, qPos }) {
    const { logits, tokenProbs, copyWeights, headWeights, cache } = forwardRes;
    const T = tokenIds.length;
    const v = model.vocabSize;

    // 1. Token Sequence Information
    const tokens = [];
    for (let pos = 0; pos < T; pos++) {
      const id = tokenIds[pos];
      tokens.push({
        pos,
        id,
        token: tokenizer ? tokenizer.decode([id]).trim() : `tok_${id}`,
      });
    }

    // 2. Query Salience Weights (if present in cache)
    const querySalience = [];
    if (cache && cache.queryWeights && querySpan) {
      const qS = querySpan[0];
      const qE = querySpan[1];
      for (let q = qS; q <= qE; q++) {
        const id = tokenIds[q];
        const tok = tokenizer ? tokenizer.decode([id]).trim() : `tok_${id}`;
        querySalience.push({
          pos: q,
          id,
          token: tok,
          salienceWeight: cache.queryWeights[q - qS],
        });
      }
    }

    // 3. Raw Logits & Token Probabilities at Output Position
    const outputPosLogits = [];
    const outputPosProbs = [];
    const rankedCandidates = [];

    for (let c = 0; c < v; c++) {
      const logitVal = logits ? logits[qPos * v + c] : null;
      const probVal = tokenProbs ? tokenProbs[qPos * v + c] : 0;
      const tokWord = tokenizer ? tokenizer.decode([c]).trim() : `tok_${c}`;

      outputPosLogits.push(logitVal);
      outputPosProbs.push(probVal);

      if (probVal > 1e-7 || (logitVal !== null && logitVal > -50)) {
        rankedCandidates.push({
          id: c,
          token: tokWord,
          prob: probVal,
          logit: logitVal,
        });
      }
    }

    rankedCandidates.sort((a, b) => b.prob - a.prob);

    // 4. Copy Head Attention Tensors
    const nH = model.nCopyHeads || 1;
    const copyHeadAttentionPerHead = [];
    if (headWeights) {
      for (let h = 0; h < nH; h++) {
        const headOffset = h * T * T;
        const weightsFromQPos = [];
        for (let p = 0; p < T; p++) {
          weightsFromQPos.push(headWeights[headOffset + qPos * T + p]);
        }
        copyHeadAttentionPerHead.push({
          headIndex: h,
          weightsFromOutputPos: weightsFromQPos,
        });
      }
    }

    const ensembleCopyWeightsFromQPos = [];
    if (copyWeights) {
      for (let p = 0; p < T; p++) {
        ensembleCopyWeightsFromQPos.push(copyWeights[qPos * T + p]);
      }
    }

    // 5. Self-Attention Tensors (from Transformer Block caches)
    const selfAttentionPerLayer = [];
    if (cache && Array.isArray(cache.layerCaches)) {
      cache.layerCaches.forEach((lCache, layerIdx) => {
        if (lCache && lCache.attnWeights) {
          const nSelfHeads = model.nHeads || 1;
          const headsAttn = [];
          for (let h = 0; h < nSelfHeads; h++) {
            const hOff = h * T * T;
            const fromQ = [];
            for (let p = 0; p < T; p++) {
              fromQ.push(lCache.attnWeights[hOff + qPos * T + p]);
            }
            headsAttn.push({ headIndex: h, weightsFromOutputPos: fromQ });
          }
          selfAttentionPerLayer.push({
            layerIndex: layerIdx,
            nHeads: nSelfHeads,
            heads: headsAttn,
          });
        }
      });
    }

    // 6. Intermediate Vector Norms & State Shapes
    const intermediateStates = {
      x0Norm: cache?.x0 ? this._computeNorm(cache.x0.subarray(qPos * model.dModel, (qPos + 1) * model.dModel)) : null,
      xFinalNorm: cache?.xFinal ? this._computeNorm(cache.xFinal.subarray(qPos * model.dModel, (qPos + 1) * model.dModel)) : null,
      xCopyNorm: cache?.xCopy ? this._computeNorm(cache.xCopy.subarray(qPos * model.dModel, (qPos + 1) * model.dModel)) : null,
      xQueryNorm: cache?.xQuery ? this._computeNorm(cache.xQuery) : null,
      queryVector: cache?.xQuery ? Array.from(cache.xQuery) : null,
    };

    // 7. Raw Neural Selection (Strict Argmax — zero JavaScript overriding)
    const topPredictedCandidate = rankedCandidates[0] || { id: -1, token: '', prob: 0, logit: 0 };

    return {
      tokens,
      querySalience,
      outputPosition: qPos,
      outputPositionLogits: outputPosLogits,
      outputPositionProbabilities: outputPosProbs,
      rankedCandidates: rankedCandidates.slice(0, 15), // top 15 ranked candidates
      rawLogitsTensor: {
        shape: [T, v],
        fullData: Array.from(logits),
      },
      tokenProbabilitiesTensor: {
        shape: [T, v],
        fullData: Array.from(tokenProbs),
      },
      attentionTensors: {
        selfAttention: {
          shape: [model.nLayers, model.nHeads, T, T],
          layers: selfAttentionPerLayer,
        },
        copyHeadAttention: {
          shape: [nH, T, T],
          heads: copyHeadAttentionPerHead,
        },
        ensembleCopyWeights: {
          shape: [T, T],
          fromOutputPos: ensembleCopyWeightsFromQPos,
        },
      },
      intermediateStates,
      rawArgmaxPrediction: {
        id: topPredictedCandidate.id,
        token: topPredictedCandidate.token,
        probability: topPredictedCandidate.prob,
        logit: topPredictedCandidate.logit,
        selectionMethod: 'RAW_NEURAL_ARGMAX',
      },
    };
  }

  /**
   * Records a Direct Context execution (e.g. 1-hop audit case with in-memory context).
   */
  recordDirectExecution({
    model,
    tokenizer,
    contextText,
    queryText,
    groundTruth = null,
    metadata = {},
  }) {
    const startTime = Date.now();
    const executionId = `sglm_exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // STAGE 1: QUERY INGESTION
    const queryTokens = tokenizer.encode(queryText, { addBos: false });
    const stageQuery = {
      stage: 'QUERY_INGESTION',
      stageIndex: 1,
      queryText,
      tokenizedQuery: {
        tokens: queryTokens.map((id) => tokenizer.decode([id]).trim()),
        tokenIds: Array.from(queryTokens),
      },
    };

    // STAGE 2: CONTEXT / INPUT PREPARATION
    const fullPrompt = `${contextText} ${queryText}`;
    const tokenIds = tokenizer.encode(fullPrompt, { addBos: true });
    const contextTokens = tokenizer.encode(contextText, { addBos: true });
    const querySpan = [contextTokens.length, tokenIds.length - 1];
    const T = tokenIds.length;
    const qPos = T - 1;

    const stageContext = {
      stage: 'CONTEXT_PREPARATION',
      stageIndex: 2,
      contextSource: 'DIRECT_INPUT',
      contextText,
      contextTokenCount: contextTokens.length,
      fullPrompt,
      totalSequenceLength: T,
      contextSpan: [0, contextTokens.length - 1],
      querySpan,
    };

    // STAGE 3: SGLM RAW FORWARD COMPUTATION
    const fwdStartTime = Date.now();
    const forwardRes = model.forward(tokenIds, true, true, true, 20.0, querySpan);
    const forwardDurationMs = Date.now() - fwdStartTime;

    const neuralComp = this._captureNeuralComputation({
      model,
      tokenizer,
      tokenIds,
      querySpan,
      forwardRes,
      qPos,
    });

    const stageComputation = {
      stage: 'SGLM_RAW_COMPUTATION',
      stageIndex: 3,
      forwardDurationMs,
      computation: neuralComp,
    };

    // STAGE 4: FINAL OUTPUT & GROUND TRUTH COMPARISON
    const predictedToken = neuralComp.rawArgmaxPrediction.token;
    const exactMatch = groundTruth !== null ? (predictedToken.toLowerCase() === groundTruth.toLowerCase()) : null;

    const stageFinalOutput = {
      stage: 'FINAL_OUTPUT',
      stageIndex: 4,
      predictedTokenId: neuralComp.rawArgmaxPrediction.id,
      predictedToken,
      probability: neuralComp.rawArgmaxPrediction.probability,
      logit: neuralComp.rawArgmaxPrediction.logit,
      selectionMethod: 'RAW_NEURAL_ARGMAX',
      groundTruthExpected: groundTruth,
      exactMatch,
    };

    const totalDurationMs = Date.now() - startTime;

    const fullRecord = {
      recordVersion: '1.0.0',
      executionId,
      timestamp: new Date().toISOString(),
      executionType: 'DIRECT_CONTEXT_QUERY',
      metadata: {
        modelClass: model.constructor.name,
        dModel: model.dModel,
        nLayers: model.nLayers,
        nHeads: model.nHeads,
        nCopyHeads: model.nCopyHeads,
        maxSeqLen: model.maxSeqLen,
        vocabSize: model.vocabSize,
        positionEncoding: model.positionEncoding,
        totalDurationMs,
        ...metadata,
      },
      pipelineTrace: [
        stageQuery,
        stageContext,
        stageComputation,
        stageFinalOutput,
      ],
    };

    this.saveRecord(fullRecord);
    return fullRecord;
  }

  /**
   * Records an SGLMBrain execution (contacts memory, retrieves, derives facts, forwards).
   */
  async recordBrainExecution({
    sglmBrain,
    queryText,
    groundTruth = null,
    metadata = {},
  }) {
    const startTime = Date.now();
    const executionId = `sglm_exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { model, tokenizer } = sglmBrain;

    // STAGE 1: QUERY INGESTION
    const queryTokens = tokenizer.encode(queryText, { addBos: false });
    const stageQuery = {
      stage: 'QUERY',
      stageIndex: 1,
      queryText,
      tokenizedQuery: {
        tokens: queryTokens.map((id) => tokenizer.decode([id]).trim()),
        tokenIds: Array.from(queryTokens),
      },
    };

    // STAGE 2: SGLM RAW COMPUTATION (Initial Query Processing)
    const queryTokensWithBos = tokenizer.encode(queryText, { addBos: true });
    const queryInitFwdStart = Date.now();
    const queryInitFwdRes = model.forward(queryTokensWithBos, false, false, false, 1.0, null);
    const queryInitFwdDurationMs = Date.now() - queryInitFwdStart;

    const queryInitComp = this._captureNeuralComputation({
      model,
      tokenizer,
      tokenIds: queryTokensWithBos,
      querySpan: null,
      forwardRes: queryInitFwdRes,
      qPos: queryTokensWithBos.length - 1,
    });

    const stageQueryInitComputation = {
      stage: 'SGLM_RAW_COMPUTATION_QUERY_INIT',
      stageIndex: 2,
      inputTokens: queryTokensWithBos.map((id) => ({ id, token: tokenizer.decode([id]).trim() })),
      forwardDurationMs: queryInitFwdDurationMs,
      computation: queryInitComp,
    };

    // STAGE 3: MEMORY ACCESS
    const memStartTime = Date.now();
    const rawMemory = await sglmBrain.retrieveFromMemory();
    const memDurationMs = Date.now() - memStartTime;

    const rawMemoryStr = rawMemory
      .map((item) => (typeof item === 'string' ? item : JSON.stringify(item.content || item)))
      .join(' ');
    const rawMemoryTokenCount = tokenizer.encode(rawMemoryStr).length;

    const compactFacts = rawMemory
      .map((item) => sglmBrain.toCompactSemanticFact(item))
      .filter(Boolean);

    const compactMemoryText = compactFacts.join(' ');
    const contextTokens = tokenizer.encode(compactMemoryText, { addBos: true });
    const compactMemoryTokenCount = contextTokens.length;

    const stageMemory = {
      stage: 'MEMORY_ACCESS',
      stageIndex: 3,
      storeType: sglmBrain.memoryStore?.constructor?.name || 'Unknown',
      memoryAccessDurationMs: memDurationMs,
      rawDocumentsCount: rawMemory.length,
      rawDocumentsSample: rawMemory.slice(0, 5).map((r) => r.content || r),
      rawMemoryTokenCount,
      compactFactsCount: compactFacts.length,
      compactFacts,
      compactMemoryTokenCount,
    };

    // STAGE 4: SGLM RAW FORWARD COMPUTATION (Full Context + Query)
    const fullPrompt = `${compactMemoryText} ${queryText}`;
    const tokenIds = tokenizer.encode(fullPrompt, { addBos: true });
    const querySpan = [contextTokens.length, tokenIds.length - 1];
    const T = tokenIds.length;
    const qPos = T - 1;

    const fwdStartTime = Date.now();
    const forwardRes = model.forward(tokenIds, true, true, true, 20.0, querySpan);
    const forwardDurationMs = Date.now() - fwdStartTime;

    const neuralComp = this._captureNeuralComputation({
      model,
      tokenizer,
      tokenIds,
      querySpan,
      forwardRes,
      qPos,
    });

    const stageComputation = {
      stage: 'SGLM_RAW_COMPUTATION_FULL',
      stageIndex: 4,
      fullPrompt,
      totalSequenceLength: T,
      contextSpan: [0, contextTokens.length - 1],
      querySpan,
      forwardDurationMs,
      computation: neuralComp,
    };

    // STAGE 5: FINAL OUTPUT & GROUND TRUTH COMPARISON
    const predictedToken = neuralComp.rawArgmaxPrediction.token;
    const exactMatch = groundTruth !== null ? (predictedToken.toLowerCase() === groundTruth.toLowerCase()) : null;

    const stageFinalOutput = {
      stage: 'FINAL_OUTPUT',
      stageIndex: 5,
      predictedTokenId: neuralComp.rawArgmaxPrediction.id,
      predictedToken,
      probability: neuralComp.rawArgmaxPrediction.probability,
      logit: neuralComp.rawArgmaxPrediction.logit,
      selectionMethod: 'RAW_NEURAL_ARGMAX',
      groundTruthExpected: groundTruth,
      exactMatch,
    };

    const totalDurationMs = Date.now() - startTime;

    const fullRecord = {
      recordVersion: '1.0.0',
      executionId,
      timestamp: new Date().toISOString(),
      executionType: 'BRAIN_STORED_MEMORY_QUERY',
      metadata: {
        modelClass: model.constructor.name,
        dModel: model.dModel,
        nLayers: model.nLayers,
        nHeads: model.nHeads,
        nCopyHeads: model.nCopyHeads,
        maxSeqLen: model.maxSeqLen,
        vocabSize: model.vocabSize,
        positionEncoding: model.positionEncoding,
        totalDurationMs,
        ...metadata,
      },
      pipelineTrace: [
        stageQuery,
        stageQueryInitComputation,
        stageMemory,
        stageComputation,
        stageFinalOutput,
      ],
    };

    this.saveRecord(fullRecord);
    return fullRecord;
  }

  saveRecord(record) {
    const filePath = path.join(this.storageDir, `${record.executionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
    return filePath;
  }

  loadRecord(executionId) {
    const filePath = path.join(this.storageDir, `${executionId}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Record not found: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  getLatestRecord() {
    const files = fs.readdirSync(this.storageDir).filter((f) => f.endsWith('.json'));
    if (files.length === 0) return null;
    files.sort((a, b) => {
      const statA = fs.statSync(path.join(this.storageDir, a));
      const statB = fs.statSync(path.join(this.storageDir, b));
      return statB.mtimeMs - statA.mtimeMs;
    });
    return this.loadRecord(files[0].replace('.json', ''));
  }

  /**
   * Generates a clean, transparent, uninterpreted string summary of the trace.
   */
  formatTraceSummary(record) {
    const lines = [];
    lines.push('========================================================================================');
    lines.push(`  SGLM RAW EXPERIENCE RECORD: ${record.executionId}`);
    lines.push(`  Timestamp : ${record.timestamp}`);
    lines.push(`  Type      : ${record.executionType}`);
    lines.push('========================================================================================');

    for (const stage of record.pipelineTrace) {
      lines.push(`\n>>> STAGE ${stage.stageIndex}: [${stage.stage}]`);

      if (stage.stage === 'QUERY' || stage.stage === 'QUERY_INGESTION') {
        lines.push(`  Query Text      : "${stage.queryText}"`);
        lines.push(`  Tokenized Query : [${stage.tokenizedQuery.tokens.join(', ')}]`);
        lines.push(`  Token IDs       : [${stage.tokenizedQuery.tokenIds.join(', ')}]`);
      }

      if (stage.stage === 'SGLM_RAW_COMPUTATION_QUERY_INIT') {
        const c = stage.computation;
        lines.push(`  Forward Duration: ${stage.forwardDurationMs} ms`);
        lines.push(`  Query Tokens    : [${stage.inputTokens.map(t => t.token).join(', ')}]`);
        lines.push(`  Top 3 Initial Candidates on Query Alone:`);
        c.rankedCandidates.slice(0, 3).forEach((cand, idx) => {
          lines.push(`    ${idx + 1}. "${cand.token}" (id: ${cand.id}) -> P = ${(cand.prob * 100).toFixed(2)}%`);
        });
      }

      if (stage.stage === 'CONTEXT_PREPARATION') {
        lines.push(`  Context Source  : ${stage.contextSource}`);
        lines.push(`  Context Tokens  : ${stage.contextTokenCount}`);
        lines.push(`  Total Seq Len   : ${stage.totalSequenceLength}`);
        lines.push(`  Query Span      : [${stage.querySpan.join(' .. ')}]`);
      }

      if (stage.stage === 'MEMORY_ACCESS') {
        lines.push(`  Memory Store    : ${stage.storeType}`);
        lines.push(`  Raw Docs Count  : ${stage.rawDocumentsCount}`);
        lines.push(`  Raw Tokens      : ${stage.rawMemoryTokenCount}`);
        lines.push(`  Compact Facts   : ${stage.compactFactsCount} facts derived`);
        lines.push(`  Compact Tokens  : ${stage.compactMemoryTokenCount}`);
        lines.push(`  Duration        : ${stage.memoryAccessDurationMs} ms`);
        if (stage.compactFacts && stage.compactFacts.length > 0) {
          lines.push(`  Sample Derived Facts:`);
          stage.compactFacts.slice(0, 3).forEach((f, idx) => {
            lines.push(`    [Fact ${idx + 1}] "${f}"`);
          });
        }
      }

      if (stage.stage === 'SGLM_RAW_COMPUTATION' || stage.stage === 'SGLM_RAW_COMPUTATION_FULL') {
        const c = stage.computation;
        lines.push(`  Forward Duration: ${stage.forwardDurationMs} ms`);
        lines.push(`  Output Position : [${c.outputPosition}] (Token: "${c.tokens[c.outputPosition]?.token}")`);
        if (c.querySalience && c.querySalience.length > 0) {
          lines.push(`  Query Salience Weights:`);
          c.querySalience.forEach((qs) => {
            lines.push(`    pos ${qs.pos} ["${qs.token}"]: ${(qs.salienceWeight * 100).toFixed(2)}%`);
          });
        }

        lines.push(`  Top 5 Neural Candidates at Output Position:`);
        c.rankedCandidates.slice(0, 5).forEach((cand, idx) => {
          lines.push(`    ${idx + 1}. "${cand.token}" (id: ${cand.id}) -> P = ${(cand.prob * 100).toFixed(2)}% (logit: ${cand.logit !== null ? cand.logit.toFixed(4) : 'N/A'})`);
        });

        lines.push(`  Attention Allocation from Output Position:`);
        lines.push(`    Copy Head Ensemble: [Max Attention = ${(Math.max(...c.attentionTensors.ensembleCopyWeights.fromOutputPos) * 100).toFixed(2)}%]`);
        lines.push(`  Intermediate Norms:`);
        lines.push(`    x0Norm: ${c.intermediateStates.x0Norm?.toFixed(4)}, xFinalNorm: ${c.intermediateStates.xFinalNorm?.toFixed(4)}, xQueryNorm: ${c.intermediateStates.xQueryNorm?.toFixed(4)}`);
      }

      if (stage.stage === 'FINAL_OUTPUT') {
        lines.push(`  Predicted Token : "${stage.predictedToken}" (id: ${stage.predictedTokenId})`);
        lines.push(`  Confidence      : ${(stage.probability * 100).toFixed(2)}%`);
        lines.push(`  Ground Truth    : "${stage.groundTruthExpected}"`);
        lines.push(`  Exact Match     : ${stage.exactMatch ? 'TRUE' : 'FALSE'}`);
        lines.push(`  Selection Method: ${stage.selectionMethod} (No JS logic applied)`);
      }
    }

    lines.push('\n========================================================================================');
    return lines.join('\n');
  }
}

export default SGLMExperienceRecorder;
