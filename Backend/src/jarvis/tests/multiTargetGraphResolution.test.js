import assert from 'assert';
import { buildJarvis } from '../index.js';
import { defaultTokenRegistry } from '../tokens/TokenRegistry.js';
import { defaultRelationshipGraph } from '../tokens/RelationshipGraph.js';

async function testDynamicGraphDisambiguation() {
  console.log('\n======================================================');
  console.log('🤖 J.A.R.V.I.S. Multi-Target & Alias Graph Resolution');
  console.log('======================================================\n');

  const mockLLM = {
    async chat() {
      return { text: 'fallback' };
    },
  };

  const jarvis = buildJarvis({ llmManager: mockLLM });

  // Setup: Simulate factual knowledge ingested about Jyothika (with Jothika spelling)
  const tJyo = defaultTokenRegistry.register({ canonical: 'Jyothika', type: 'entity' });
  const tJoth = defaultTokenRegistry.register({ canonical: 'Jothika', type: 'entity' });
  const tF = defaultTokenRegistry.register({ canonical: 'five Filmfare Awards South', type: 'entity' });
  const tTN = defaultTokenRegistry.register({ canonical: 'six Tamil Nadu State Film Awards', type: 'entity' });
  const tK = defaultTokenRegistry.register({ canonical: 'Kalaimamani Award', type: 'entity' });
  const tNat = defaultTokenRegistry.register({ canonical: 'National Film Award', type: 'entity' });

  defaultRelationshipGraph.add(tJyo.id, 'has_alternate_spelling', tJoth.id);
  defaultRelationshipGraph.add(tJyo.id, 'won_awards', tF.id);
  defaultRelationshipGraph.add(tJyo.id, 'won_awards', tTN.id);
  defaultRelationshipGraph.add(tJyo.id, 'won_awards', tK.id);
  defaultRelationshipGraph.add(tJyo.id, 'won_awards', tNat.id);

  console.log('--- Test 1: Query Filmfare Awards using alternate spelling "jothika" ---');
  const res1 = await jarvis.handle({ utterance: 'how many flimfare awards south does jothika win?' });
  console.log('Utterance: "how many flimfare awards south does jothika win?"');
  console.log('  -> Offline Resolved:', res1.offlineResolved);
  console.log('  -> Response:', res1.response);
  assert.strictEqual(res1.offlineResolved, true, 'Must resolve offline from graph');
  assert.ok(res1.response.includes('five Filmfare Awards South'), 'Must match Filmfare Awards South');

  console.log('\n--- Test 2: Query Tamil Nadu State Film Awards using alternate spelling "jothika" ---');
  const res2 = await jarvis.handle({ utterance: 'how many tamil nadu state flim awards does jothika win?' });
  console.log('Utterance: "how many tamil nadu state flim awards does jothika win?"');
  console.log('  -> Offline Resolved:', res2.offlineResolved);
  console.log('  -> Response:', res2.response);
  assert.strictEqual(res2.offlineResolved, true, 'Must resolve offline from graph');
  assert.ok(res2.response.includes('six Tamil Nadu State Film Awards'), 'Must match Tamil Nadu State Film Awards');

  console.log('\n--- Test 3: Query Kalaimamani Award ---');
  const res3 = await jarvis.handle({ utterance: 'did jyothika win kalaimamani award?' });
  console.log('Utterance: "did jyothika win kalaimamani award?"');
  console.log('  -> Offline Resolved:', res3.offlineResolved);
  console.log('  -> Response:', res3.response);
  assert.strictEqual(res3.offlineResolved, true, 'Must resolve offline from graph');
  assert.ok(res3.response.includes('Kalaimamani Award'), 'Must match Kalaimamani Award');

  console.log('\n✅ ALL MULTI-TARGET & ALIAS GRAPH RESOLUTION TESTS PASSED (0 API TOKENS)!');
}

testDynamicGraphDisambiguation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
