import test from 'node:test';
import assert from 'node:assert/strict';
import { JarvisCore } from '../core/JarvisCore.js';
import { IntentClassifier } from '../stages/IntentClassifier.js';
import { TokenRegistry, TokenType } from '../tokens/TokenRegistry.js';
import { RelationshipGraph } from '../tokens/RelationshipGraph.js';
import { RelationRegistry } from '../reasoning/RelationRegistry.js';
import { GraphReasoner } from '../reasoning/GraphReasoner.js';

test('🛡️ J.A.R.V.I.S. Relation Integrity & Negative Matrix Suite', async (t) => {
  console.log('\n========================================================================');
  console.log('🔬 J.A.R.V.I.S. Relation Integrity & Boundary Verification Suite');
  console.log('========================================================================\n');

  // 1. Setup isolated clean symbolic universe
  const tokenRegistry = new TokenRegistry();
  const graph = new RelationshipGraph();
  const relationRegistry = new RelationRegistry({ graph, tokenRegistry });
  const reasoner = new GraphReasoner({ graph, tokenRegistry, relationRegistry });

  const intentClassifier = new IntentClassifier({
    tokenRegistry,
    graph,
    reasoner,
    neuralResolver: null,
    llmManager: {
      chat: async () => ({ text: JSON.stringify({ type: 'llm_fallback', confidence: 0.9 }) }),
    },
  });

  const jarvis = new JarvisCore({ intentClassifier });

  // Ingest facts from specification
  const facts = [
    { s: 'Eclipse Engine', r: 'engineered_by', t: 'Nira Sol', inv: 'engineered' },
    { s: 'Eclipse Archive', r: 'established_by', t: 'Kiran Vale', inv: 'established' },
    { s: 'Aurora Device', r: 'engineered_by', t: 'Lyra Venn', inv: 'engineered' },
    { s: 'Aurora Archive', r: 'established_by', t: 'Taren Vox', inv: 'established' },
    { s: 'Aurora Core', r: 'discovered_by', t: 'Nira Sol', inv: 'discovered' },
    { s: 'Nova Observatory', r: 'founded_by', t: 'Elara Voss', inv: 'founded' },
    { s: 'Zephyr Archive', r: 'established_by', t: 'Liora Venn', inv: 'established' },
    { s: 'Moonstone Device', r: 'engineered_by', t: 'Kira Sol', inv: 'engineered' },
  ];

  for (const f of facts) {
    const sTok = tokenRegistry.lookup(f.s) || tokenRegistry.register({ canonical: f.s, type: TokenType.ENTITY });
    const tTok = tokenRegistry.lookup(f.t) || tokenRegistry.register({ canonical: f.t, type: TokenType.ENTITY });
    tokenRegistry.register({ canonical: f.r, type: TokenType.PROPERTY });
    graph.add(sTok.id, f.r, tTok.id);
    if (f.inv) {
      tokenRegistry.register({ canonical: f.inv, type: TokenType.PROPERTY });
      graph.add(tTok.id, f.inv, sTok.id);
      relationRegistry.registerInverse(f.r, f.inv);
    }
  }

  // --- TEST GROUP 1: Entity + Correct Relation (MUST PASS) ---
  await t.test('1. Valid Entity + Correct Relation Positive Resolutions', async () => {
    const positiveCases = [
      { q: 'Who engineered the Eclipse Engine?', expect: 'Nira Sol' },
      { q: 'Who established the Eclipse Archive?', expect: 'Kiran Vale' },
      { q: 'Who engineered the Aurora Device?', expect: 'Lyra Venn' },
      { q: 'Who established the Aurora Archive?', expect: 'Taren Vox' },
      { q: 'Who discovered the Aurora Core?', expect: 'Nira Sol' },
      { q: 'Who founded the Nova Observatory?', expect: 'Elara Voss' },
      { q: 'Who established the Zephyr Archive?', expect: 'Liora Venn' },
      { q: 'Who engineered the Moonstone Device?', expect: 'Kira Sol' },
    ];

    for (const c of positiveCases) {
      const ctx = await jarvis.handle({ utterance: c.q, disableLLM: true });
      console.log(`  [POS] "${c.q}" -> "${ctx.response}" (source: ${ctx.intent.source})`);
      assert.equal(ctx.intent.source, 'local_relationship_graph');
      assert.match(ctx.response, new RegExp(c.expect, 'i'));
    }
  });

  // --- TEST GROUP 2: Entity + Wrong Relation (MUST RETURN LOCAL UNKNOWN) ---
  await t.test('2. Valid Entity + Mismatched Relation Negative Matrix (MUST BE LOCAL UNKNOWN)', async () => {
    const negativeCases = [
      { q: 'Who established the Eclipse Engine?', entity: 'Eclipse Engine' },
      { q: 'Who owns the Eclipse Engine?', entity: 'Eclipse Engine' },
      { q: 'Who discovered the Eclipse Engine?', entity: 'Eclipse Engine' },
      { q: 'Who engineered the Eclipse Archive?', entity: 'Eclipse Archive' },
      { q: 'Who owns the Eclipse Archive?', entity: 'Eclipse Archive' },
      { q: 'Who discovered the Aurora Device?', entity: 'Aurora Device' },
      { q: 'Who engineered the Aurora Archive?', entity: 'Aurora Archive' },
      { q: 'Who owns the Aurora Archive?', entity: 'Aurora Archive' },
      { q: 'Who established the Aurora Core?', entity: 'Aurora Core' },
      { q: 'Who engineered the Aurora Core?', entity: 'Aurora Core' },
      { q: 'Who owns the Nova Observatory?', entity: 'Nova Observatory' },
      { q: 'Who discovered the Nova Observatory?', entity: 'Nova Observatory' },
      { q: 'Who owns the Zephyr Archive?', entity: 'Zephyr Archive' },
      { q: 'Who founded the Zephyr Archive?', entity: 'Zephyr Archive' },
      { q: 'Who discovered the Zephyr Archive?', entity: 'Zephyr Archive' },
    ];

    for (const c of negativeCases) {
      const ctx = await jarvis.handle({ utterance: c.q, disableLLM: false });
      console.log(`  [NEG] "${c.q}" -> "${ctx.response}" (source: ${ctx.intent.source})`);
      assert.equal(ctx.intent.source, 'local_knowledge_guard', `Query "${c.q}" must be rejected by local_knowledge_guard`);
      assert.match(ctx.response, new RegExp(`I recognize ${c.entity}.*not learned`, 'i'));
    }
  });

  // --- TEST GROUP 3: Entity Collision Protection ---
  await t.test('3. Entity Collision Protection (Blackstar Device vs Moonstone Device)', async () => {
    const ctx = await jarvis.handle({ utterance: 'Who engineered the Blackstar Device?', disableLLM: true });
    console.log(`  [COLLISION] "Who engineered the Blackstar Device?" -> "${ctx.response}" (source: ${ctx.intent.source})`);
    assert.notEqual(ctx.intent.source, 'local_relationship_graph', 'Must not match Moonstone Device');
    assert.doesNotMatch(ctx.response, /Kira Sol/i, 'Must not return Kira Sol');
  });

  // --- TEST GROUP 4: Unknown Entity Boundary ---
  await t.test('4. Unknown Entity Boundary (Qaltrix-882)', async () => {
    const ctx = await jarvis.handle({ utterance: 'Who engineered Qaltrix-882?', disableLLM: true });
    console.log(`  [UNKNOWN] "Who engineered Qaltrix-882?" -> "${ctx.response}" (source: ${ctx.intent.source})`);
    assert.equal(ctx.intent.source, 'local_knowledge_guard');
    assert.match(ctx.response, /not recognize/i);
  });

  // --- TEST GROUP 5: Cross-Entity Generic Noun Contamination Test ---
  await t.test('5. Cross-Entity Generic Noun Contamination Test', async () => {
    const archives = [
      { name: 'Silver Archive', r: 'established_by', t: 'Mira Vale' },
      { name: 'Golden Archive', r: 'established_by', t: 'Taren Vox' },
      { name: 'Black Archive', r: 'established_by', t: 'Varek Dan' },
    ];

    for (const a of archives) {
      const sTok = tokenRegistry.register({ canonical: a.name, type: TokenType.ENTITY });
      const tTok = tokenRegistry.register({ canonical: a.t, type: TokenType.ENTITY });
      graph.add(sTok.id, a.r, tTok.id);
      graph.add(tTok.id, 'established', sTok.id);
      relationRegistry.registerInverse(a.r, 'established');
    }

    const testPairs = [
      { q: 'Who established the Silver Archive?', expect: 'Mira Vale', reject: ['Taren Vox', 'Varek Dan'] },
      { q: 'Who established the Golden Archive?', expect: 'Taren Vox', reject: ['Mira Vale', 'Varek Dan'] },
      { q: 'Who established the Black Archive?', expect: 'Varek Dan', reject: ['Mira Vale', 'Taren Vox'] },
    ];

    for (const tp of testPairs) {
      const ctx = await jarvis.handle({ utterance: tp.q, disableLLM: true });
      assert.equal(ctx.intent.source, 'local_relationship_graph');
      assert.match(ctx.response, new RegExp(tp.expect, 'i'));
      for (const rej of tp.reject) {
        assert.doesNotMatch(ctx.response, new RegExp(rej, 'i'));
      }
    }
  });
});
