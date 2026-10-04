import { AnalyticalAdamWTrainer } from '../kernel/AnalyticalAdamWTrainer.js';

export const RELATION_TRAINING_PAIRS = [
  // 1-Fact Contexts (Length: ~13 tokens) - Forces model to learn (Subject + Relation) without competing facts
  { ctx: 'Neha is friend of Meera .', q: 'Who is friend of Neha ?', ans: 'Meera' },
  { ctx: 'Kumar is father of Ravi .', q: 'Who is father of Kumar ?', ans: 'Ravi' },
  { ctx: 'Tarun is brother of Varun .', q: 'Who is brother of Tarun ?', ans: 'Varun' },
  { ctx: 'Sneha is mentor of Pooja .', q: 'Who is mentor of Sneha ?', ans: 'Pooja' },
  { ctx: 'Amit is father of Rohan .', q: 'Who is father of Amit ?', ans: 'Rohan' },
  { ctx: 'Rohan is friend of Tanya .', q: 'Who is friend of Rohan ?', ans: 'Tanya' },
  { ctx: 'Sneha is sister of Tanya .', q: 'Who is sister of Sneha ?', ans: 'Tanya' },
  { ctx: 'Amit is brother of Meera .', q: 'Who is brother of Amit ?', ans: 'Meera' },

  // 2-Fact Contexts: Same Subject, Different Relations (Length: ~19 tokens) - Critical Disambiguation
  { ctx: 'Neha is friend of Meera . Neha is mentor of Pooja .', q: 'Who is friend of Neha ?', ans: 'Meera' },
  { ctx: 'Neha is friend of Meera . Neha is mentor of Pooja .', q: 'Who is mentor of Neha ?', ans: 'Pooja' },
  { ctx: 'Kumar is father of Ravi . Kumar is friend of Rohan .', q: 'Who is father of Kumar ?', ans: 'Ravi' },
  { ctx: 'Kumar is father of Ravi . Kumar is friend of Rohan .', q: 'Who is friend of Kumar ?', ans: 'Rohan' },
  { ctx: 'Tarun is brother of Varun . Tarun is mentor of Tanya .', q: 'Who is brother of Tarun ?', ans: 'Varun' },
  { ctx: 'Tarun is brother of Varun . Tarun is mentor of Tanya .', q: 'Who is mentor of Tarun ?', ans: 'Tanya' },
  { ctx: 'Amit is father of Rohan . Amit is brother of Meera .', q: 'Who is father of Amit ?', ans: 'Rohan' },
  { ctx: 'Amit is father of Rohan . Amit is brother of Meera .', q: 'Who is brother of Amit ?', ans: 'Meera' },
  { ctx: 'Sneha is mentor of Pooja . Sneha is sister of Tanya .', q: 'Who is mentor of Sneha ?', ans: 'Pooja' },
  { ctx: 'Sneha is mentor of Pooja . Sneha is sister of Tanya .', q: 'Who is sister of Sneha ?', ans: 'Tanya' },
  { ctx: 'Neha is mentor of Pooja . Neha is friend of Meera .', q: 'Who is friend of Neha ?', ans: 'Meera' },
  { ctx: 'Neha is mentor of Pooja . Neha is friend of Meera .', q: 'Who is mentor of Neha ?', ans: 'Pooja' },

  // 2-Fact Contexts: Different Subjects, Same Relation (Length: ~19 tokens) - Subject Specificity
  { ctx: 'Neha is mentor of Meera . Kumar is mentor of Ravi .', q: 'Who is mentor of Neha ?', ans: 'Meera' },
  { ctx: 'Neha is mentor of Meera . Kumar is mentor of Ravi .', q: 'Who is mentor of Kumar ?', ans: 'Ravi' },
  { ctx: 'Amit is brother of Rohan . Tarun is brother of Varun .', q: 'Who is brother of Amit ?', ans: 'Rohan' },
  { ctx: 'Amit is brother of Rohan . Tarun is brother of Varun .', q: 'Who is brother of Tarun ?', ans: 'Varun' },
  { ctx: 'Sneha is friend of Pooja . Rohan is friend of Tanya .', q: 'Who is friend of Sneha ?', ans: 'Pooja' },
  { ctx: 'Sneha is friend of Pooja . Rohan is friend of Tanya .', q: 'Who is friend of Rohan ?', ans: 'Tanya' },
  { ctx: 'Kumar is father of Ravi . Amit is father of Tanya .', q: 'Who is father of Kumar ?', ans: 'Ravi' },
  { ctx: 'Kumar is father of Ravi . Amit is father of Tanya .', q: 'Who is father of Amit ?', ans: 'Tanya' },

  // 3-Fact Contexts (Length: ~25 tokens) - Breaks fixed positional indices across sequence
  { ctx: 'Neha is friend of Meera . Kumar is father of Ravi . Tarun is brother of Varun .', q: 'Who is father of Kumar ?', ans: 'Ravi' },
  { ctx: 'Neha is friend of Meera . Kumar is father of Ravi . Tarun is brother of Varun .', q: 'Who is brother of Tarun ?', ans: 'Varun' },
  { ctx: 'Neha is friend of Meera . Kumar is father of Ravi . Tarun is brother of Varun .', q: 'Who is friend of Neha ?', ans: 'Meera' },
  { ctx: 'Amit is brother of Meera . Sneha is sister of Tanya . Neha is mentor of Pooja .', q: 'Who is sister of Sneha ?', ans: 'Tanya' },
  { ctx: 'Amit is brother of Meera . Sneha is sister of Tanya . Neha is mentor of Pooja .', q: 'Who is mentor of Neha ?', ans: 'Pooja' },
  { ctx: 'Amit is brother of Meera . Sneha is sister of Tanya . Neha is mentor of Pooja .', q: 'Who is brother of Amit ?', ans: 'Meera' },
];

/**
 * Trains neural transformer model parameters to bind (Subject + Relation) -> Object
 * and suppress stopword/syntax attention spread.
 * 
 * @param {Object} model - MultiHeadCopyTransformer instance
 * @param {Object} tokenizer - Tokenizer instance
 * @param {Object} [options={}]
 * @param {number} [options.epochs=50]
 * @param {number} [options.learningRate=0.005]
 * @param {Array<Object>} [options.trainingPairs]
 * @returns {Promise<Object>}
 */
export async function trainRelationBinding(model, tokenizer, {
  epochs = 50,
  learningRate = 0.005,
  trainingPairs = null,
  onCheckpoint = null,
  checkpointEpochs = [0, 5, 10, 20, 35, 50],
} = {}) {
  const pairs = trainingPairs || RELATION_TRAINING_PAIRS;

  const trainer = new AnalyticalAdamWTrainer({
    model,
    learningRate,
    beta1: 0.9,
    beta2: 0.98,
    weightDecay: 0.001,
  });

  const trainBatch = [];
  for (const pair of pairs) {
    const fullText = `${pair.ctx} ${pair.q}`;
    const tokenIds = tokenizer.encode(fullText, { addBos: true });
    const ctxToks = tokenizer.encode(pair.ctx, { addBos: true });
    const ansToks = tokenizer.encode(pair.ans, { addBos: false });
    const targetEntityId = ansToks[0];

    const targetTokens = new Int32Array(tokenIds.length);
    const lossMask = new Float64Array(tokenIds.length);
    const qPos = tokenIds.length - 1;
    targetTokens[qPos] = targetEntityId;
    lossMask[qPos] = 1.0;

    trainBatch.push({
      input: tokenIds,
      target: targetTokens,
      lossMask,
      preventSelfCopy: true,
      maskBOS: true,
      normQK: true,
      copyScale: 20.0,
      querySpan: [ctxToks.length, tokenIds.length - 1],
    });
  }

  console.log('\n========================================================================================');
  console.log('SGLM NEURAL PARAMETER TRAINING: MULTI-LENGTH (SUBJECT + RELATION) -> OBJECT BINDING');
  console.log(`  * Total Samples: ${trainBatch.length} (1-fact, 2-fact, 3-fact varied lengths)`);
  console.log(`  * Epochs: ${epochs} | LR: ${learningRate}`);
  console.log('========================================================================================');

  let finalLoss = 0;
  if (onCheckpoint && checkpointEpochs.includes(0)) {
    await onCheckpoint(0, model, tokenizer);
  }

  for (let ep = 1; ep <= epochs; ep++) {
    let epochLoss = 0;
    for (const sample of trainBatch) {
      const { loss, grads } = model.lossAndGrad(
        sample.input, sample.target, sample.lossMask,
        sample.preventSelfCopy, sample.maskBOS, sample.normQK, sample.copyScale, sample.querySpan
      );
      epochLoss += loss;
      trainer.step(grads);
    }
    finalLoss = epochLoss / trainBatch.length;
    if (ep === 1 || ep % 10 === 0 || ep === epochs) {
      console.log(`  [Trainer] Epoch ${String(ep).padStart(2)}/${epochs} | Cross-Entropy Loss: ${finalLoss.toFixed(4)}`);
    }
    if (onCheckpoint && checkpointEpochs.includes(ep)) {
      await onCheckpoint(ep, model, tokenizer);
    }
  }

  return { epochs, finalLoss, sampleCount: trainBatch.length };
}

export default trainRelationBinding;
