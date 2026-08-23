import test from 'node:test';
import assert from 'node:assert/strict';
import { RelationshipGraph } from '../tokens/RelationshipGraph.js';
import { TokenRegistry, TokenType } from '../tokens/TokenRegistry.js';
import { RelationRegistry } from '../reasoning/RelationRegistry.js';

test('Verified Multi-Hop Cognitive Graph Test Suite', async (t) => {
  // Setup fresh isolated memory instances
  const registry = new TokenRegistry();
  const graph = new RelationshipGraph();
  const relationRegistry = new RelationRegistry({ graph, tokenRegistry: registry });

  // Register nodes
  const tA = registry.register({ canonical: 'NodeA', type: TokenType.ENTITY });
  const tB = registry.register({ canonical: 'NodeB', type: TokenType.ENTITY });
  const tC = registry.register({ canonical: 'NodeC', type: TokenType.ENTITY });
  const tD = registry.register({ canonical: 'NodeD', type: TokenType.ENTITY });
  const tE = registry.register({ canonical: 'NodeE', type: TokenType.ENTITY });
  const tF = registry.register({ canonical: 'NodeF', type: TokenType.ENTITY });
  const tX = registry.register({ canonical: 'NodeX', type: TokenType.ENTITY });

  // Register relations
  graph.add(tA.id, 'step1', tB.id, 1.0);
  graph.add(tB.id, 'step2', tC.id, 1.0);
  graph.add(tC.id, 'step3', tD.id, 1.0);
  graph.add(tD.id, 'step4', tE.id, 1.0);
  graph.add(tE.id, 'step5', tF.id, 1.0);
  graph.add(tX.id, 'step2', tC.id, 1.0);

  // --- Test 1: 1-Hop Connected Path ---
  await t.test('1. Deterministic 1-Hop Traversal (A -> B)', () => {
    const res = graph.findVerifiedPath(tA.id, ['step1'], { registry, relationRegistry });
    assert.equal(res.found, true);
    assert.equal(res.validated, true);
    assert.equal(res.depth, 1);
    assert.equal(res.targetId, tB.id);
    assert.equal(res.targetToken.canonical, 'NodeB');
  });

  // --- Test 2: 2-Hop Connected Path ---
  await t.test('2. Deterministic 2-Hop Traversal (A -> B -> C)', () => {
    const res = graph.findVerifiedPath(tA.id, ['step1', 'step2'], { registry, relationRegistry });
    assert.equal(res.found, true);
    assert.equal(res.validated, true);
    assert.equal(res.depth, 2);
    assert.equal(res.targetId, tC.id);
    assert.equal(res.targetToken.canonical, 'NodeC');
    assert.equal(res.nodes.length, 3);
  });

  // --- Test 3: 3-Hop Connected Path ---
  await t.test('3. Deterministic 3-Hop Traversal (A -> B -> C -> D)', () => {
    const res = graph.findVerifiedPath(tA.id, ['step1', 'step2', 'step3'], { registry, relationRegistry });
    assert.equal(res.found, true);
    assert.equal(res.validated, true);
    assert.equal(res.depth, 3);
    assert.equal(res.targetId, tD.id);
    assert.equal(res.targetToken.canonical, 'NodeD');
  });

  // --- Test 4: Critical Anti-Hallucination Disconnected Path ---
  // A -> step1 -> B exists, X -> step2 -> C exists.
  // Querying A -> step1 -> step2 MUST fail (A -> B -> C does not exist if B has no step2 to C)
  await t.test('4. Critical Anti-Hallucination Disconnection Guard', () => {
    const isoGraph = new RelationshipGraph();
    isoGraph.add(tA.id, 'step1', tB.id);
    isoGraph.add(tX.id, 'step2', tC.id); // Disconnected middle node

    const res = isoGraph.findVerifiedPath(tA.id, ['step1', 'step2'], { registry, relationRegistry });
    assert.equal(res.found, false);
    assert.equal(res.validated, false);
    assert.equal(res.reason, 'PATH_DISCONNECTED');
    assert.equal(res.brokenAtHop, 2);
  });

  // --- Test 5: Broken Middle Edge Rejection ---
  await t.test('5. Broken Middle Edge Rejection (A -> B, B -> C, X -> D)', () => {
    const isoGraph = new RelationshipGraph();
    isoGraph.add(tA.id, 'step1', tB.id);
    isoGraph.add(tB.id, 'step2', tC.id);
    isoGraph.add(tX.id, 'step3', tD.id); // D is connected to X, NOT C

    const res = isoGraph.findVerifiedPath(tA.id, ['step1', 'step2', 'step3'], { registry, relationRegistry });
    assert.equal(res.found, false);
    assert.equal(res.validated, false);
    assert.equal(res.reason, 'PATH_DISCONNECTED');
    assert.equal(res.brokenAtHop, 3);
  });

  // --- Test 6: Branch Collision Prevention ---
  await t.test('6. Branch Collision Isolation', () => {
    const branchGraph = new RelationshipGraph();
    const tBranch1 = registry.register({ canonical: 'Branch1', type: TokenType.ENTITY });
    const tBranch2 = registry.register({ canonical: 'Branch2', type: TokenType.ENTITY });
    const tLeaf1 = registry.register({ canonical: 'Leaf1', type: TokenType.ENTITY });
    const tLeaf2 = registry.register({ canonical: 'Leaf2', type: TokenType.ENTITY });

    branchGraph.add(tA.id, 'route', tBranch1.id);
    branchGraph.add(tBranch1.id, 'subroute', tLeaf1.id);

    branchGraph.add(tA.id, 'route', tBranch2.id);
    branchGraph.add(tBranch2.id, 'subroute', tLeaf2.id);

    const res = branchGraph.findVerifiedPath(tA.id, ['route', 'subroute'], { registry, relationRegistry });
    assert.equal(res.found, true);
    assert.equal(res.validated, true);
    // Verified path should stay strictly within its own branch
    const pathNodes = res.nodes.map(n => n.tokenId);
    const validBranch1 = pathNodes.includes(tBranch1.id) && pathNodes.includes(tLeaf1.id) && !pathNodes.includes(tLeaf2.id);
    const validBranch2 = pathNodes.includes(tBranch2.id) && pathNodes.includes(tLeaf2.id) && !pathNodes.includes(tLeaf1.id);
    assert.equal(validBranch1 || validBranch2, true);
  });

  // --- Test 7: Cycle Protection ---
  await t.test('7. Path Cycle Protection (A -> B -> C -> A)', () => {
    const cycleGraph = new RelationshipGraph();
    cycleGraph.add(tA.id, 'loop', tB.id);
    cycleGraph.add(tB.id, 'loop', tC.id);
    cycleGraph.add(tC.id, 'loop', tA.id);

    // Traversal should terminate safely without infinite loop
    const res = cycleGraph.findVerifiedPath(tA.id, ['loop', 'loop', 'loop', 'loop'], { registry, relationRegistry });
    assert.equal(res.found, false); // Cycle rejected
    assert.equal(res.reason, 'PATH_DISCONNECTED');
  });

  // --- Test 8: Reverse Traversal Integration ---
  await t.test('8. Reverse Edge Traversal (Parasakthi -> director -> Sudha Kongara)', () => {
    const movieGraph = new RelationshipGraph();
    const tMovie = registry.register({ canonical: 'Parasakthi', type: TokenType.ENTITY });
    const tDirector = registry.register({ canonical: 'Sudha Kongara', type: TokenType.ENTITY });
    relationRegistry.registerInverse('director', 'directed');

    movieGraph.add(tMovie.id, 'director', tDirector.id);

    // Reverse query: start from Sudha Kongara -> directed -> Parasakthi
    const res = movieGraph.findVerifiedPath(tDirector.id, ['directed'], { registry, relationRegistry });
    assert.equal(res.found, true);
    assert.equal(res.validated, true);
    assert.equal(res.targetId, tMovie.id);
    assert.equal(res.targetToken.canonical, 'Parasakthi');
  });

  // --- Test 9: Multi-Constraint Constellation Intersection ---
  await t.test('9. Constellation Intersection ([director: Sudha Kongara] ∩ [type: Movie] ∩ [year: 2026])', () => {
    const constGraph = new RelationshipGraph();
    const tMovie1 = registry.register({ canonical: 'Parasakthi', type: TokenType.ENTITY });
    const tMovie2 = registry.register({ canonical: 'Andhra Andhagadu', type: TokenType.ENTITY });
    const tDirector = registry.register({ canonical: 'Sudha Kongara', type: TokenType.ENTITY });
    const tType = registry.register({ canonical: 'Movie', type: TokenType.CONCEPT });
    const tYear2026 = registry.register({ canonical: '2026', type: TokenType.ENTITY });
    const tYear2008 = registry.register({ canonical: '2008', type: TokenType.ENTITY });

    // Movie 1: Parasakthi (Sudha Kongara, Movie, 2026)
    constGraph.add(tMovie1.id, 'director', tDirector.id);
    constGraph.add(tMovie1.id, 'type', tType.id);
    constGraph.add(tMovie1.id, 'release_year', tYear2026.id);

    // Movie 2: Andhra Andhagadu (Sudha Kongara, Movie, 2008)
    constGraph.add(tMovie2.id, 'director', tDirector.id);
    constGraph.add(tMovie2.id, 'type', tType.id);
    constGraph.add(tMovie2.id, 'release_year', tYear2008.id);

    const result = constGraph.findConstellationIntersection([
      { relation: 'director', targetId: tDirector.id },
      { relation: 'type', targetId: tType.id },
      { relation: 'release_year', targetId: tYear2026.id },
    ], { registry, relationRegistry });

    assert.equal(result.found, true);
    assert.equal(result.count, 1);
    assert.equal(result.candidateIds[0], tMovie1.id);
    assert.equal(result.entities[0].canonical, 'Parasakthi');
  });

  // --- Test 10: Wrong Relation at Hop 2 Rejection ---
  await t.test('10. Wrong Relation at Hop 2 Rejection', () => {
    const res = graph.findVerifiedPath(tA.id, ['step1', 'wrong_relation', 'step3'], { registry, relationRegistry });
    assert.equal(res.found, false);
    assert.equal(res.validated, false);
    assert.equal(res.brokenAtHop, 2);
  });

  // --- Test 11: 5-Hop Scalability & Performance Benchmark ---
  await t.test('11. 5-Hop Path Execution (A -> B -> C -> D -> E -> F)', () => {
    const start = performance.now();
    const res = graph.findVerifiedPath(tA.id, ['step1', 'step2', 'step3', 'step4', 'step5'], { registry, relationRegistry });
    const duration = performance.now() - start;

    assert.equal(res.found, true);
    assert.equal(res.validated, true);
    assert.equal(res.depth, 5);
    assert.equal(res.targetId, tF.id);
    assert.equal(res.targetToken.canonical, 'NodeF');
    console.log(`  -> 5-hop path traversal took ${duration.toFixed(4)}ms (Target: < 1.0ms)`);
  });
});
