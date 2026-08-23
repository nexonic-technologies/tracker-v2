import test from 'node:test';
import assert from 'node:assert/strict';
import { JarvisCore } from '../core/JarvisCore.js';
import { IntentClassifier } from '../stages/IntentClassifier.js';
import { ResponseGenerator } from '../stages/ResponseGenerator.js';
import { TokenRegistry, TokenType, TokenStatus } from '../tokens/TokenRegistry.js';
import { RelationshipGraph } from '../tokens/RelationshipGraph.js';
import { RelationRegistry } from '../reasoning/RelationRegistry.js';
import { GraphReasoner } from '../reasoning/GraphReasoner.js';
import { DatasetDistiller } from '../neural/DatasetDistiller.js';
import { NeuralResponseRealizer } from '../neural/NeuralResponseRealizer.js';
import { LearningAnalyst } from '../stages/LearningAnalyst.js';

test('🌐 J.A.R.V.I.S. Shared Vocabulary & Neural Response Generation Suite', async (t) => {
  console.log('\n========================================================================');
  console.log('🔬 J.A.R.V.I.S. Shared Vocabulary & Response Generation Suite');
  console.log('========================================================================\n');

  // 1. Setup unified symbolic & neural universe with ONE canonical vocabulary
  const tokenRegistry = new TokenRegistry();
  const graph = new RelationshipGraph();
  const relationRegistry = new RelationRegistry({ graph, tokenRegistry });
  const reasoner = new GraphReasoner({ graph, tokenRegistry, relationRegistry });
  const responseRealizer = new NeuralResponseRealizer({ tokenRegistry, relationRegistry });

  const intentClassifier = new IntentClassifier({
    tokenRegistry,
    graph,
    reasoner,
    neuralResolver: null,
    llmManager: {
      chat: async () => ({ text: JSON.stringify({ type: 'llm_fallback', confidence: 0.9 }) }),
    },
  });

  const responseGenerator = new ResponseGenerator({
    llmManager: { chat: async () => ({ text: 'Mock LLM Response' }) },
    responseRealizer,
  });

  const learningAnalyst = new LearningAnalyst({
    tokenRegistry,
    graph,
    relationRegistry,
  });

  const jarvis = new JarvisCore({
    intentClassifier,
    responseGenerator,
    learningAnalyst,
  });

  // Teach foundational fact: "Eclipse Engine was engineered by Nira Sol"
  const sTok = tokenRegistry.register({ canonical: 'Eclipse Engine', type: TokenType.ENTITY });
  const tTok = tokenRegistry.register({ canonical: 'Nira Sol', type: TokenType.ENTITY });
  const rTok = tokenRegistry.register({ canonical: 'engineered_by', type: TokenType.PROPERTY });
  const invTok = tokenRegistry.register({ canonical: 'engineered', type: TokenType.PROPERTY });

  graph.add(sTok.id, 'engineered_by', tTok.id);
  graph.add(tTok.id, 'engineered', sTok.id);
  relationRegistry.registerInverse('engineered_by', 'engineered');

  // Teach second fact: "Moonstone Device was engineered by Kira Sol"
  const sTok2 = tokenRegistry.register({ canonical: 'Moonstone Device', type: TokenType.ENTITY });
  const tTok2 = tokenRegistry.register({ canonical: 'Kira Sol', type: TokenType.ENTITY });
  graph.add(sTok2.id, 'engineered_by', tTok2.id);
  graph.add(tTok2.id, 'engineered', sTok2.id);

  // --- TEST 1: Shared Canonical Vocabulary Invariant ---
  await t.test('1. Shared Canonical Token Identity Across All Layers', async () => {
    // Lookup via TokenRegistry
    const lookedUpS = tokenRegistry.lookup('Eclipse Engine');
    const lookedUpT = tokenRegistry.lookup('Nira Sol');
    assert.ok(lookedUpS, 'Subject token must resolve in TokenRegistry');
    assert.ok(lookedUpT, 'Target token must resolve in TokenRegistry');
    assert.equal(lookedUpS.id, sTok.id, 'Token IDs must match canonical registration');

    // DatasetDistiller must consume these exact token IDs
    const distiller = new DatasetDistiller({ tokenRegistry, graph, relationRegistry });
    const surfaceResponses = distiller.distillSurfaceResponses('Eclipse Engine', 'engineered_by', 'Nira Sol');

    assert.ok(surfaceResponses.concise, 'Should produce concise surface response');
    assert.ok(surfaceResponses.passive, 'Should produce passive surface response');
    assert.ok(surfaceResponses.active, 'Should produce active surface response');
    console.log('  -> Distilled Surface Forms:', surfaceResponses);
  });

  // --- TEST 2: Multi-Surface Generative Realization from Single Semantic Fact ---
  await t.test('2. Multi-Surface Realization (Knowledge ≠ Language)', async () => {
    const semanticFact = responseRealizer.createSemanticFact({
      subjectToken: sTok,
      relation: 'engineered_by',
      targetToken: tTok,
      confidence: 1.0,
    });

    const concise = responseRealizer.realize(semanticFact, { style: 'concise' });
    const passive = responseRealizer.realize(semanticFact, { style: 'passive' });
    const active = responseRealizer.realize(semanticFact, { style: 'active' });
    const conversational = responseRealizer.realize(semanticFact, { style: 'conversational' });

    console.log('  [Concise]       :', concise);
    console.log('  [Passive]       :', passive);
    console.log('  [Active]        :', active);
    console.log('  [Conversational]:', conversational);

    assert.equal(concise, 'Eclipse Engine — engineered by: Nira Sol.');
    assert.equal(passive, 'Eclipse Engine was engineered by Nira Sol.');
    assert.equal(active, 'Nira Sol engineered Eclipse Engine.');
    assert.match(conversational, /Nira Sol.*engineering.*Eclipse Engine/i);
  });

  // --- TEST 3: Semantic Fact Preservation & Natural Surface Realization in Runtime Query ---
  await t.test('3. Semantic Fact Object Flow & Natural Surface Adaptation in Runtime Query', async () => {
    // 3a. Direct Interrogative Query -> Natural Passive Realization
    const ctx1 = await jarvis.handle({ utterance: 'Who was the Eclipse Engine engineered by?' });
    assert.equal(ctx1.offlineResolved, true);
    assert.ok(ctx1.semanticFact, 'ctx must contain validated semanticFact object');
    assert.equal(ctx1.response, 'The Eclipse Engine was engineered by Nira Sol.');

    // 3b. Conversational / Explanatory Query -> Conversational Realization
    const ctx2 = await jarvis.handle({ utterance: 'Who was responsible for engineering the Eclipse Engine?' });
    assert.equal(ctx2.offlineResolved, true);
    assert.equal(ctx2.response, 'According to my records, Nira Sol was responsible for engineering the Eclipse Engine.');

    // 3c. Terse Query -> Concise Realization
    const ctx3 = await jarvis.handle({ utterance: 'Eclipse Engine engineered_by?' });
    assert.equal(ctx3.offlineResolved, true);
    assert.equal(ctx3.response, 'Eclipse Engine — engineered by: Nira Sol.');

    console.log('  [Passive Query Resp]       :', ctx1.response);
    console.log('  [Conversational Query Resp]:', ctx2.response);
    console.log('  [Concise Query Resp]       :', ctx3.response);
  });

  // --- TEST 4: Wrong Relation Rejection Matrix (Must Not Generate Engineered Fact) ---
  await t.test('4. Wrong Relation Rejection Matrix (Must Not Hallucinate Fact)', async () => {
    const negativeQueries = [
      'Who owns the Eclipse Engine?',
      'Who founded the Eclipse Engine?',
      'Who discovered the Eclipse Engine?',
      'Who established the Eclipse Engine?',
      'Who designed the Eclipse Engine?',
    ];

    for (const q of negativeQueries) {
      const ctx = await jarvis.handle({ utterance: q, disableLLM: true });
      assert.equal(ctx.intent.source, 'local_knowledge_guard', `Query "${q}" must be rejected by local_knowledge_guard`);
      assert.doesNotMatch(ctx.response, /Nira Sol/i, `Query "${q}" must NOT leak Nira Sol`);
      assert.match(ctx.response, /I recognize Eclipse Engine, but I have not learned/i);
      console.log(`  [REJECTED] "${q}" -> "${ctx.response}"`);
    }
  });

  // --- TEST 5: Unknown Entity Protection ---
  await t.test('5. Unknown Entity Protection (Qaltrix-882)', async () => {
    const ctx = await jarvis.handle({ utterance: 'Who engineered Qaltrix-882?', disableLLM: true });
    assert.equal(ctx.intent.source, 'local_knowledge_guard');
    assert.match(ctx.response, /not recognize/i);
  });

  // --- TEST 6: Entity Collision Protection (Blackstar Device vs Moonstone Device) ---
  await t.test('6. Entity Collision Protection (Blackstar Device)', async () => {
    const ctx = await jarvis.handle({ utterance: 'Who engineered the Blackstar Device?', disableLLM: true });
    assert.equal(ctx.intent.source, 'local_knowledge_guard');
    assert.doesNotMatch(ctx.response, /Kira Sol/i);
  });

  // --- TEST 7: Controlled Vocabulary Promotion Lifecycle ---
  await t.test('7. Controlled Vocabulary Promotion Lifecycle', async () => {
    // 1. One arbitrary observation creates a CANDIDATE token
    const candidate = tokenRegistry.recordCandidate('Quantum Resonator', { source: 'llm_observation' });
    assert.equal(candidate.status, TokenStatus.CANDIDATE);
    assert.equal(candidate.metadata.observationCount, 1);

    // 2. Candidate is NOT yet in active vocabulary
    assert.equal(tokenRegistry.lookup('Quantum Resonator').status, TokenStatus.CANDIDATE);

    // 3. Repeated observations accumulate evidence
    tokenRegistry.recordCandidate('Quantum Resonator');
    tokenRegistry.recordCandidate('Quantum Resonator');
    assert.equal(tokenRegistry.lookup('Quantum Resonator').metadata.observationCount, 3);

    // 4. Promotion after evidence threshold
    tokenRegistry.promoteCandidate('Quantum Resonator', { threshold: 3 });
    assert.equal(tokenRegistry.lookup('Quantum Resonator').status, TokenStatus.ACTIVE);
    console.log('  -> Successfully promoted token "Quantum Resonator" to ACTIVE based on evidence');
  });

  // --- TEST 8: Human Correction Learning Signal ---
  await t.test('8. Human Correction Learning Signal Capture', async () => {
    const correction = learningAnalyst.recordHumanCorrection({
      utterance: 'Employee was absent yesterday',
      generatedOutput: 'Employee was marked absent.',
      correctedOutput: 'No, employee was on approved casual leave.',
      context: { employeeId: 'EMP-101', date: '2026-08-22' },
    });

    assert.ok(correction);
    assert.equal(correction.type, 'HUMAN_CORRECTION');
    assert.equal(correction.weight, 3.0);
    assert.equal(correction.source, 'human_correction');
    console.log('  -> Captured Human Correction Learning Signal:', correction.id);
  });

  // --- TEST 9: Neural Parameter Checkpointing (State Serialization & Deserialization) ---
  await t.test('9. Neural Parameter Checkpointing State Serialization', async () => {
    const { JarvisNeuralCore } = await import('../neural/JarvisNeuralCore.js');
    const coreA = new JarvisNeuralCore();

    // Modify a weight to simulate gradient updates
    coreA.weights.wte[0] = 0.987654321;
    coreA.t = 42;

    const state = coreA.serializeWeights();
    assert.equal(state.t, 42);
    assert.equal(state.weights.wte[0], 0.987654321);

    const coreB = new JarvisNeuralCore();
    assert.notEqual(coreB.weights.wte[0], 0.987654321);

    const restored = coreB.deserializeWeights(state);
    assert.equal(restored, true);
    assert.equal(coreB.weights.wte[0], 0.987654321);
    assert.equal(coreB.t, 42);
    console.log('  -> Successfully verified neural parameter checkpoint serialization & restoration.');
  });
});
