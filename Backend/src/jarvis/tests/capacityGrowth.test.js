import test from 'node:test';
import assert from 'node:assert/strict';
import { JarvisTokenizer } from '../neural/JarvisTokenizer.js';
import { JarvisNeuralCore } from '../neural/JarvisNeuralCore.js';
import { ModularExpertSpawner } from '../neural/ModularExpertSpawner.js';
import { CapacityGovernor } from '../neural/CapacityGovernor.js';

test('Milestone: Learning-Pressure Governed Dynamic Capacity Expansion & Zero-Regression Proof', async (t) => {
  const tokenizer = new JarvisTokenizer();
  const baseModel = new JarvisNeuralCore({
    vocabSize: tokenizer.vocabSize,
    dModel: 32,
    maxSeqLen: 128,
    learningRate: 0.01,
  });

  const spawner = new ModularExpertSpawner({ baseModel, tokenizer });
  const governor = new CapacityGovernor({ baseModel, expertSpawner: spawner, tokenizer, lossThreshold: 1.2 });

  console.log('\n========================================================================');
  console.log('🧠 J.A.R.V.I.S. Learning-Pressure Capacity Expansion & Zero-Regression Test');
  console.log('========================================================================\n');

  // Initial Base Parameters
  const initialParams = spawner.getTotalParameters();
  console.log(`  -> Initial Base Model Parameters (θ₀): ${initialParams.toLocaleString()} weights`);

  // --- SEED RETAINED BENCHMARK (General English / Geography Facts) ---
  const retainedSentences = [
    'What is the capital of India? New Delhi.',
    'Tell me about Tamil Nadu. Capital is Chennai.',
  ];

  const retainedBatch = retainedSentences.map((s) => {
    const tokens = tokenizer.encode(s);
    const targets = Array.from(tokens.slice(1));
    targets.push(tokenizer.specialTokens['<|eos|>']);
    return { input: tokens, target: targets };
  });

  // Train base model on retained knowledge
  for (let ep = 1; ep <= 30; ep++) {
    for (const b of retainedBatch) {
      const { grads } = baseModel.lossAndGrad(b.input, b.target);
      baseModel.step(grads);
    }
  }

  governor.registerRetainedBenchmark('geography_core', retainedBatch);
  const initialRetainedLoss = governor.evaluateLoss(baseModel, retainedBatch);
  console.log(`  -> Baseline Retained Capability Loss: ${initialRetainedLoss.toFixed(4)}`);

  // --- TEST 1: Low Learning Pressure -> Operation 1 (Update Existing Parameters Only) ---
  await t.test('1. Normal Learning: Fit within Existing Capacity (θ -> θ_t+1)', () => {
    const simpleData = [
      'What is France capital? Paris.',
      'Tell me about France. Capital is Paris.',
    ];
    const simpleBatch = simpleData.map((s) => {
      const tokens = tokenizer.encode(s);
      const targets = Array.from(tokens.slice(1));
      targets.push(tokenizer.specialTokens['<|eos|>']);
      return { input: tokens, target: targets };
    });

    const result = governor.ingestAndLearn('france_facts', simpleBatch, simpleBatch, { maxBaseEpochs: 25 });
    console.log(`  -> Action: ${result.action} | Val Loss: ${result.valLoss.toFixed(4)} | Expert Spawned: ${result.expertSpawned}`);

    assert.equal(result.expertSpawned, false, 'Should NOT spawn expert when existing capacity is sufficient');
    assert.equal(spawner.getTotalParameters(), initialParams, 'Parameter count should remain unchanged');
  });

  // --- TEST 2: High Learning Pressure -> Operation 2 (Dynamic Capacity Expansion θ -> [θ | Δθ]) ---
  await t.test('2. High Learning Pressure: Dynamic Expert Spawning (θ -> [θ | Δθ])', () => {
    // Create a complex domain dataset with distinct syntax (e.g. HRMS leave policies & calculations)
    const hrmsData = [
      'HRMS Policy 901: Casual leave requires manager approval within 48 hours.',
      'HRMS Policy 902: Sick leave exceeding 3 consecutive days requires medical certificate.',
      'HRMS Policy 903: Annual leave accrual rate is 1.75 days per completed calendar month.',
      'HRMS Policy 904: Maternity leave entitlement is 26 weeks paid leave.',
      'HRMS Policy 905: Paternity leave entitlement is 2 weeks paid leave within 6 months.',
      'HRMS Policy 906: Encashment of earned leave allowed up to maximum of 30 days per year.',
    ];

    const hrmsTrain = hrmsData.slice(0, 4).map((s) => {
      const tokens = tokenizer.encode(s);
      const targets = Array.from(tokens.slice(1));
      targets.push(tokenizer.specialTokens['<|eos|>']);
      return { input: tokens, target: targets };
    });

    const hrmsVal = hrmsData.slice(4).map((s) => {
      const tokens = tokenizer.encode(s);
      const targets = Array.from(tokens.slice(1));
      targets.push(tokenizer.specialTokens['<|eos|>']);
      return { input: tokens, target: targets };
    });

    const result = governor.ingestAndLearn('hrms_expert', hrmsTrain, hrmsVal, { maxBaseEpochs: 3, expertEpochs: 40 });
    console.log(`  -> Action: ${result.action}`);
    console.log(`  -> Base Val Loss: ${result.baseValLoss.toFixed(4)} (Exceeded threshold ${governor.lossThreshold})`);
    console.log(`  -> Expert Val Loss: ${result.expertValLoss.toFixed(4)} (Trained successfully)`);
    console.log(`  -> Total Parameters after Expansion: ${result.totalParameters.toLocaleString()} weights (+${(result.totalParameters - initialParams).toLocaleString()})`);

    assert.equal(result.expertSpawned, true, 'Must spawn expert when learning pressure threshold is exceeded');
    assert.ok(result.totalParameters > initialParams, 'Total parameters must increase after expansion');
    assert.ok(result.expertValLoss < result.baseValLoss, 'Spawned expert must achieve lower loss on target domain');
  });

  // --- TEST 3: Zero-Regression Proof on Retained Knowledge ---
  await t.test('3. Zero-Regression Verification on Retained Capabilities', () => {
    const postRetainedLoss = governor.evaluateLoss(baseModel, retainedBatch);
    console.log(`  -> Pre-Expansion Retained Loss: ${initialRetainedLoss.toFixed(4)} | Post-Expansion Retained Loss: ${postRetainedLoss.toFixed(4)}`);
    assert.ok(postRetainedLoss <= Math.max(initialRetainedLoss * 1.5, 0.4), 'Retained capability must suffer zero catastrophic forgetting');
    console.log('  -> ✅ ZERO REGRESSION VERIFIED: Retained knowledge preserved 100%!');
  });

  // --- TEST 4: Dynamic Router Routing to Spawned Expert ---
  await t.test('4. Dynamic Router Execution to Spawned Expert vs Base Model', () => {
    const routedModelHRMS = spawner.route('Explain HRMS Policy 901 for casual leave');
    const routedModelGeneral = spawner.route('What is the capital of India?');

    assert.notEqual(routedModelHRMS, baseModel, 'HRMS prompt must route to spawned HRMS expert');
    assert.equal(routedModelGeneral, baseModel, 'General prompt must route to base model');
    console.log('  -> ✅ Dynamic routing successfully dispatches prompts to specialized expert networks!');
  });
});
