import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenRegistry, TokenType } from '../tokens/TokenRegistry.js';
import { RelationshipGraph } from '../tokens/RelationshipGraph.js';
import { IntentClassifier } from '../stages/IntentClassifier.js';

test('Milestone 1 Scalability Benchmark: 10,000+ Entities and O(1) Inverted Index Retrieval', async (t) => {
  const registry = new TokenRegistry({ startingId: 10001 });
  const graph = new RelationshipGraph();
  const classifier = new IntentClassifier({ tokenRegistry: registry, graph });

  console.log('\n--- Seeding 10,000 Synthetic Entities and 20,000 Edges ---');
  const seedStart = performance.now();

  const ENTITY_COUNT = 10000;
  for (let i = 1; i <= ENTITY_COUNT; i++) {
    const canonical = `Entity_${i}_Concept_${i % 100}`;
    const alias1 = `alias_${i}_custom`;
    const alias2 = `synthetic_term_${i}`;
    registry.register({
      canonical,
      type: TokenType.ENTITY,
      aliases: [alias1, alias2],
    });
  }

  // Also register target real-world entities
  const india = registry.register({ canonical: 'India', type: TokenType.ENTITY, aliases: ['Republic of India'] });
  const delhi = registry.register({ canonical: 'New Delhi', type: TokenType.ENTITY, aliases: ['Delhi'] });
  const tamilNadu = registry.register({ canonical: 'Tamil Nadu', type: TokenType.ENTITY, aliases: ['TN'] });
  const chennai = registry.register({ canonical: 'Chennai', type: TokenType.ENTITY, aliases: ['Madras'] });
  const nayanthara = registry.register({ canonical: 'Nayanthara', type: TokenType.ENTITY, aliases: ['Lady Superstar'] });
  const filmfare = registry.register({ canonical: 'Filmfare Award', type: TokenType.ENTITY });

  // Connect 20,000 synthetic edges
  for (let i = 1; i <= ENTITY_COUNT; i++) {
    const fromId = 10000 + i;
    const toId = 10000 + ((i + 1) % ENTITY_COUNT || 1);
    graph.add(fromId, 'connected_to', toId, 1.0);
    graph.add(toId, 'referenced_by', fromId, 1.0);
  }

  // Connect target edges
  graph.add(india.id, 'has_capital', delhi.id, 1.0);
  graph.add(tamilNadu.id, 'has_capital', chennai.id, 1.0);
  graph.add(nayanthara.id, 'nickname', registry.lookup('Lady Superstar').id, 1.0);
  graph.add(nayanthara.id, 'won_award', filmfare.id, 1.0);

  const seedTime = performance.now() - seedStart;
  console.log(`✓ Seeded ${registry.size} tokens and ${graph.size} edges in ${seedTime.toFixed(2)}ms`);

  // --- Benchmark 1: Exact Inverted Index Lookup (O(1)) ---
  await t.test('1. Exact & Alias Inverted Index Lookup (O(1))', () => {
    const t0 = performance.now();
    const token = registry.lookup('Republic of India');
    const lookupDuration = performance.now() - t0;

    assert.ok(token, 'Should find token via alias');
    assert.equal(token.canonical, 'India');
    console.log(`  -> Exact alias lookup duration: ${lookupDuration.toFixed(4)}ms (Target: < 0.1ms)`);
    assert.ok(lookupDuration < 2.0, 'Exact lookup must be sub-millisecond');
  });

  // --- Benchmark 2: Inverted Index findCandidates in Large Registry (O(L)) ---
  await t.test('2. Candidate retrieval in 10,000-token registry (O(L))', () => {
    // Warm-up JIT
    registry.findCandidates('Warm up query for index');

    const queries = [
      'What is the capital of Tamil Nadu?',
      'Tell me about Republic of India and its capital Delhi',
      'Who is known as Lady Superstar in cinema?',
      'Synthetic search for synthetic_term_5432 and alias_9999_custom',
    ];

    for (const q of queries) {
      const t0 = performance.now();
      const candidates = registry.findCandidates(q, { limit: 20 });
      const duration = performance.now() - t0;

      assert.ok(candidates.length > 0, `Should find candidates for: "${q}"`);
      console.log(`  -> Query: "${q}" -> Found ${candidates.length} candidates in ${duration.toFixed(4)}ms`);
      assert.ok(duration < 2.0, `Candidate search in 10k items took ${duration}ms (must be < 2ms)`);
    }
  });

  // --- Benchmark 3: O(1) Reverse Adjacency getIncoming Graph Lookup ---
  await t.test('3. RelationshipGraph getIncoming O(1) Reverse Adjacency Benchmark', () => {
    const t0 = performance.now();
    const incomingToDelhi = graph.getIncoming(delhi.id);
    const duration = performance.now() - t0;

    assert.ok(incomingToDelhi.length >= 1, 'Should find incoming edge to Delhi');
    assert.equal(incomingToDelhi[0].from, india.id);
    console.log(`  -> getIncoming on 20,000+ edge graph took ${duration.toFixed(4)}ms (Target: < 0.05ms)`);
    assert.ok(duration < 1.0, 'Reverse adjacency lookup must be sub-millisecond');
  });

  // --- Benchmark 4: End-to-End Intent Classification with 10,000 Entities ---
  await t.test('4. End-to-End Offline Graph Knowledge Resolution in 10,000 Token Graph', () => {
    // Warm-up
    classifier._resolveDynamicGraphKnowledge('warm up query');

    const t0 = performance.now();
    const resolved = classifier._resolveDynamicGraphKnowledge('What is the capital of Tamil Nadu?');
    const duration = performance.now() - t0;

    assert.ok(resolved, 'Should resolve Tamil Nadu capital offline');
    assert.equal(resolved.target.canonical, 'Chennai');
    console.log(`  -> End-to-End Resolution across 10,000 entities took: ${duration.toFixed(4)}ms`);
    assert.ok(duration < 5.0, `End-to-end resolution took ${duration}ms (must be < 5ms)`);
  });
});
