import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultJarvis } from '../index.js';
import { defaultTokenRegistry } from '../tokens/TokenRegistry.js';
import { defaultRelationshipGraph } from '../tokens/RelationshipGraph.js';

test('🧠 J.A.R.V.I.S. Multi-Turn Discourse & Anaphora Context Resolution', async () => {
  const sessionId = `test_session_${Date.now()}`;
  const userId = 'test_user_discourse';

  // 1. Ingest Factual Knowledge into Graph
  const pToken = defaultTokenRegistry.lookup('Parasakthi') || defaultTokenRegistry.register({ canonical: 'Parasakthi', type: 'entity' });
  const yearToken = defaultTokenRegistry.lookup('2026') || defaultTokenRegistry.register({ canonical: '2026', type: 'entity' });
  const leadToken = defaultTokenRegistry.lookup('Sivaji Ganesan') || defaultTokenRegistry.register({ canonical: 'Sivaji Ganesan', type: 'entity' });

  defaultRelationshipGraph.addRelationship(pToken.id, 'release_year', yearToken.id, 1.0);
  defaultRelationshipGraph.addRelationship(pToken.id, 'lead', leadToken.id, 1.0);

  // 2. Turn 1: Explicit initial entity query
  const turn1 = await defaultJarvis.handle({
    userId,
    sessionId,
    utterance: 'Parasakhthi movie release year?',
  });

  console.log('[Turn 1 Resp]:', turn1.response, '| Offline:', turn1.offlineResolved);
  assert.equal(turn1.offlineResolved, true, 'Turn 1 must resolve offline via knowledge graph');
  assert.match(turn1.response, /2026/, 'Turn 1 must output 2026');

  // 3. Turn 2: Follow-up elliptical query without mentioning Parasakthi
  const turn2 = await defaultJarvis.handle({
    userId,
    sessionId,
    utterance: 'Who is the lead?',
  });

  console.log('[Turn 2 Resp]:', turn2.response, '| Offline:', turn2.offlineResolved);
  assert.equal(turn2.offlineResolved, true, 'Turn 2 must resolve offline by inheriting focal entity from discourse');
  assert.match(turn2.response, /Sivaji Ganesan/i, 'Turn 2 must resolve Sivaji Ganesan as the lead of Parasakthi');

  console.log('✅ Multi-turn discourse anaphora successfully resolved with 0 API tokens!');
});
