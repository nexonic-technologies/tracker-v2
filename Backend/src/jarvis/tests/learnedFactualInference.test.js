import assert from 'assert';
import { buildJarvis } from '../index.js';
import { defaultTokenRegistry } from '../tokens/TokenRegistry.js';
import { defaultRelationshipGraph } from '../tokens/RelationshipGraph.js';

async function testLearnedFactualInference() {
  console.log('\n=================================================================');
  console.log('🤖 J.A.R.V.I.S. Learned Factual Inference & Zero Contamination Test');
  console.log('=================================================================\n');

  // Build isolated test instance of J.A.R.V.I.S.
  const mockLLM = {
    async chat({ userMessage = '' } = {}) {
      return { text: 'fallback_llm_should_not_be_called_for_offline_hits' };
    },
  };

  const jarvis = buildJarvis({ llmManager: mockLLM });

  // -------------------------------------------------------------
  // Test A — Learning: Teacher imparts factual knowledge to J.A.R.V.I.S.
  // -------------------------------------------------------------
  console.log('--- TEST A: Knowledge Ingestion ---');
  const tNayan = defaultTokenRegistry.register({ canonical: 'Nayanthara', type: 'entity' });
  const tFilmfare = defaultTokenRegistry.register({ canonical: 'five Filmfare Awards South', type: 'entity' });
  const tBirth = defaultTokenRegistry.register({ canonical: '1980', type: 'entity' });

  defaultRelationshipGraph.add(tNayan.id, 'won_award', tFilmfare.id, 1.0);
  defaultRelationshipGraph.add(tNayan.id, 'birth_year', tBirth.id, 1.0);

  const initialOutgoing = defaultRelationshipGraph.getOutgoing(tNayan.id);
  const initialOutgoingCount = initialOutgoing.length;
  console.log(`Initial Nayanthara edges: ${initialOutgoingCount}`);
  assert.ok(initialOutgoingCount >= 2, 'Nayanthara must have at least 2 initial edges');

  // -------------------------------------------------------------
  // Test B — Query must NOT mutate the persistent RelationshipGraph
  // -------------------------------------------------------------
  console.log('\n--- TEST B: Query Processing Graph Immutability (Zero Contamination) ---');
  const q1 = 'how many Filmfare awards South Nayanthara won?';
  const r1 = await jarvis.handle({ utterance: q1 });
  console.log(`Query: "${q1}"`);
  console.log('  -> Offline Resolved:', r1.offlineResolved);
  console.log('  -> Response:', r1.response);

  // Check that NO bogus edges were added to Nayanthara or Filmfare
  const tFilmfareLookup = defaultTokenRegistry.lookup('filmfare');
  if (tFilmfareLookup) {
    const filmfareOutgoing = defaultRelationshipGraph.getOutgoing(tFilmfareLookup.id);
    const hasBogusEdge = filmfareOutgoing.some((e) => e.relation === 'related_to');
    assert.strictEqual(hasBogusEdge, false, 'Filmfare must NOT have synthetic related_to edges');
  }

  const nayanAfterQ1 = defaultRelationshipGraph.getOutgoing(tNayan.id);
  const hasWonRelatedEdge = nayanAfterQ1.some((e) => e.relation === 'related_to');
  assert.strictEqual(hasWonRelatedEdge, false, 'Nayanthara must NOT have synthetic related_to edges');
  assert.strictEqual(nayanAfterQ1.length, initialOutgoingCount, 'Graph edge count must remain strictly constant after query');
  console.log('  ✓ Verified: Zero knowledge graph contamination from query parsing.');

  // -------------------------------------------------------------
  // Test C — Factual Resolution
  // -------------------------------------------------------------
  console.log('\n--- TEST C: Factual Resolution ---');
  assert.strictEqual(r1.offlineResolved, true, 'Must resolve offline from graph');
  assert.ok(r1.response.includes('five Filmfare Awards South') || r1.response.includes('Filmfare Awards South'), 'Should answer five Filmfare Awards South');
  console.log('  ✓ Response contains:', r1.response);

  // -------------------------------------------------------------
  // Test D — Verification
  // -------------------------------------------------------------
  console.log('\n--- TEST D: Verification ("does Nayanthara won 5 filmfare awards south?") ---');
  const q2 = 'does Nayanthara won 5 filmfare awards south?';
  const r2 = await jarvis.handle({ utterance: q2 });
  console.log(`Query: "${q2}"`);
  console.log('  -> Offline Resolved:', r2.offlineResolved);
  console.log('  -> Response:', r2.response);
  assert.strictEqual(r2.offlineResolved, true, 'Verification query must resolve offline');
  assert.ok(r2.response.includes('five Filmfare Awards South') || r2.response.includes('Filmfare Awards South') || r2.response.toLowerCase().includes('yes'), 'Verification must confirm affirmative fact');
  console.log('  ✓ Verified affirmative answer:', r2.response);

  // -------------------------------------------------------------
  // Test E — Property Lookup
  // -------------------------------------------------------------
  console.log('\n--- TEST E: Property Lookup ("nayanthara born in?") ---');
  const q3 = 'nayanthara born in?';
  const r3 = await jarvis.handle({ utterance: q3 });
  console.log(`Query: "${q3}"`);
  console.log('  -> Offline Resolved:', r3.offlineResolved);
  console.log('  -> Response:', r3.response);
  assert.strictEqual(r3.offlineResolved, true, 'Property query must resolve offline');
  assert.ok(r3.response.includes('1980'), 'Must resolve birth year 1980');
  console.log('  ✓ Verified birth year:', r3.response);

  // -------------------------------------------------------------
  // Test F — Regression Against Contamination (Multi-Cycle Stability)
  // -------------------------------------------------------------
  console.log('\n--- TEST F: Multi-Cycle Regression Against Self-Reinforcing Contamination ---');
  for (let cycle = 1; cycle <= 3; cycle++) {
    console.log(`\nCycle ${cycle}:`);
    const c1 = await jarvis.handle({ utterance: q1 });
    const c2 = await jarvis.handle({ utterance: q2 });
    const c3 = await jarvis.handle({ utterance: q3 });

    assert.strictEqual(c1.offlineResolved, true);
    assert.strictEqual(c2.offlineResolved, true);
    assert.strictEqual(c3.offlineResolved, true);

    assert.ok(c1.response.includes('Filmfare Awards South'));
    assert.ok(c2.response.includes('Filmfare Awards South') || c2.response.toLowerCase().includes('yes'));
    assert.ok(c3.response.includes('1980'));
    console.log(`  ✓ Cycle ${cycle} verified stable`);
  }

  const finalNayanEdges = defaultRelationshipGraph.getOutgoing(tNayan.id);
  assert.strictEqual(finalNayanEdges.length, initialOutgoingCount, 'Knowledge graph must have identical edge count after all query cycles');

  console.log('\n=================================================================');
  console.log('🎉 ALL LEARNED FACTUAL INFERENCE & ZERO CONTAMINATION TESTS PASSED!');
  console.log('=================================================================\n');
}

testLearnedFactualInference()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
