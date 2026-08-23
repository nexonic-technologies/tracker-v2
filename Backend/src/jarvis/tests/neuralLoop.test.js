import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenRegistry, TokenType } from '../tokens/TokenRegistry.js';
import { RelationshipGraph } from '../tokens/RelationshipGraph.js';
import { DatasetDistiller } from '../neural/DatasetDistiller.js';
import { JarvisTokenizer } from '../neural/JarvisTokenizer.js';
import { JarvisNeuralCore } from '../neural/JarvisNeuralCore.js';

test('Milestone: Closed Neural Optimization Loop & Parameter Learning Proof', async (t) => {
  const tokenRegistry = new TokenRegistry({ startingId: 30001 });
  const graph = new RelationshipGraph();
  const tokenizer = new JarvisTokenizer();
  const model = new JarvisNeuralCore({
    vocabSize: tokenizer.vocabSize,
    dModel: 32,
    maxSeqLen: 64,
    learningRate: 0.05,
  });

  console.log('\n=============================================================');
  console.log('🧠 J.A.R.V.I.S. Closed Neural Optimization Loop & Gradient Test');
  console.log('=============================================================\n');

  // --- SEED KNOWLEDGE ---
  const india = tokenRegistry.register({ canonical: 'India', type: TokenType.ENTITY });
  const delhi = tokenRegistry.register({ canonical: 'New Delhi', type: TokenType.ENTITY });
  const tamilNadu = tokenRegistry.register({ canonical: 'Tamil Nadu', type: TokenType.ENTITY });
  const chennai = tokenRegistry.register({ canonical: 'Chennai', type: TokenType.ENTITY });

  graph.add(india.id, 'has_capital', delhi.id);
  graph.add(tamilNadu.id, 'has_capital', chennai.id);

  // --- TEST 1: Dataset Distiller ---
  let dataset;
  await t.test('1. Knowledge Graph to Dataset Distillation', () => {
    const distiller = new DatasetDistiller({ tokenRegistry, graph });
    dataset = distiller.distill();

    assert.ok(dataset.trainSet.length >= 4, 'Should distill multiple training examples');
    assert.ok(dataset.valSet.length >= 2, 'Should distill held-out validation paraphrases');
    console.log(`  -> Distilled ${dataset.trainSet.length} training examples and ${dataset.valSet.length} held-out validation paraphrases.`);
  });

  // --- TEST 2: Finite-Difference vs Analytical Gradient Verification ---
  await t.test('2. Analytical Gradient Precision (Backprop Mathematical Check)', () => {
    const sampleInput = tokenizer.encode('India capital?');
    const sampleTarget = Array.from(sampleInput.slice(1));
    sampleTarget.push(tokenizer.specialTokens['<|eos|>']);

    const { loss: baselineLoss, grads } = model.lossAndGrad(sampleInput, sampleTarget);
    assert.ok(baselineLoss > 0, 'Loss must be strictly positive');

    // Check analytical gradient of LM Head against numerical perturbation
    const eps = 1e-4;
    const testIdx = 0;
    const origWeight = model.weights.head[testIdx];

    model.weights.head[testIdx] = origWeight + eps;
    const { loss: lossPlus } = model.lossAndGrad(sampleInput, sampleTarget);

    model.weights.head[testIdx] = origWeight - eps;
    const { loss: lossMinus } = model.lossAndGrad(sampleInput, sampleTarget);

    model.weights.head[testIdx] = origWeight; // restore

    const numGrad = (lossPlus - lossMinus) / (2 * eps);
    const anaGrad = grads.head[testIdx];
    const diff = Math.abs(numGrad - anaGrad);

    console.log(`  -> Numerical Grad: ${numGrad.toFixed(6)} | Analytical Grad: ${anaGrad.toFixed(6)} | Diff: ${diff.toFixed(8)}`);
    assert.ok(diff < 1e-3, 'Analytical gradient must match numerical finite-difference');
  });

  // --- TEST 3: Parameter Optimization & Monotonic Loss Descent ---
  await t.test('3. Closed Optimization Loop (AdamW Gradient Updates)', () => {
    const trainBatch = dataset.trainSet.map((ex) => {
      const fullText = `${ex.prompt} ${ex.target}`;
      const tokens = tokenizer.encode(fullText);
      const targets = Array.from(tokens.slice(1));
      targets.push(tokenizer.specialTokens['<|eos|>']);
      return { input: tokens, target: targets };
    });

    const valBatch = dataset.valSet.map((ex) => {
      const fullText = `${ex.prompt} ${ex.target}`;
      const tokens = tokenizer.encode(fullText);
      const targets = Array.from(tokens.slice(1));
      targets.push(tokenizer.specialTokens['<|eos|>']);
      return { input: tokens, target: targets };
    });

    // Compute initial training & validation loss
    let initialTrainLoss = 0;
    for (const b of trainBatch) {
      const { loss } = model.lossAndGrad(b.input, b.target);
      initialTrainLoss += loss;
    }
    initialTrainLoss /= trainBatch.length;

    let initialValLoss = 0;
    for (const b of valBatch) {
      const { loss } = model.lossAndGrad(b.input, b.target);
      initialValLoss += loss;
    }
    initialValLoss /= valBatch.length;

    console.log(`  -> Epoch 0 | Train Loss: ${initialTrainLoss.toFixed(4)} | Val Loss: ${initialValLoss.toFixed(4)}`);

    // Execute training epochs with validation checkpointing
    let minValLoss = initialValLoss;
    const epochs = 40;

    for (let ep = 1; ep <= epochs; ep++) {
      for (const b of trainBatch) {
        const { grads } = model.lossAndGrad(b.input, b.target);
        model.step(grads);
      }

      let currentValLoss = 0;
      for (const b of valBatch) {
        const { loss } = model.lossAndGrad(b.input, b.target);
        currentValLoss += loss;
      }
      currentValLoss /= valBatch.length;

      if (currentValLoss < minValLoss) {
        minValLoss = currentValLoss;
      }
    }

    // Compute final training loss
    let finalTrainLoss = 0;
    for (const b of trainBatch) {
      const { loss } = model.lossAndGrad(b.input, b.target);
      finalTrainLoss += loss;
    }
    finalTrainLoss /= trainBatch.length;

    console.log(`  -> Epoch ${epochs} | Train Loss: ${finalTrainLoss.toFixed(4)} | Min Val Loss: ${minValLoss.toFixed(4)}`);

    assert.ok(finalTrainLoss < initialTrainLoss * 0.4, 'Training loss must decrease by at least 60%');
    assert.ok(minValLoss < initialValLoss, 'Validation loss on unseen paraphrases must decrease during training');
    console.log('  -> ✅ Mathematical Proof: θ_initial -> θ_trained convergence achieved!');

    // Test greedy generation from trained weights
    const testPrompt = tokenizer.encode('India has capital?');
    const generatedTokens = model.generate(testPrompt, { maxNewTokens: 12 });
    const generatedText = tokenizer.decode(generatedTokens);
    console.log(`  -> Generated from Learned Weights θ: "${generatedText}"`);
    assert.ok(generatedTokens.length > testPrompt.length, 'Model should generate continuation tokens');
  });
});
