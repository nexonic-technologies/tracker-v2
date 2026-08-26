import { strict as assert } from 'assert';
import { TokenRegistry, TokenType } from '../tokens/TokenRegistry.js';
import { RelationshipGraph } from '../tokens/RelationshipGraph.js';
import { RelationRegistry } from '../reasoning/RelationRegistry.js';
import { SemanticQueryParser } from '../reasoning/SemanticQueryParser.js';
import { GraphReasoner } from '../reasoning/GraphReasoner.js';
import { EpistemicGapAnalyzer, EpistemicStatus } from '../reasoning/EpistemicGapAnalyzer.js';
import { LearningAnalyst } from '../stages/LearningAnalyst.js';

console.log('\n===============================================================');
console.log('🧪 J.A.R.V.I.S. Multi-Hop Cognitive Reasoning Test Suite (14 Tests)');
console.log('===============================================================\n');

function createIsolatedCognitiveSystem() {
  const tokenRegistry = new TokenRegistry({ startingId: 20000 });
  const graph = new RelationshipGraph({ tokenRegistry });
  const relationRegistry = new RelationRegistry({ graph, tokenRegistry });
  const queryParser = new SemanticQueryParser({ tokenRegistry, relationRegistry, graph });
  const reasoner = new GraphReasoner({
    graph,
    tokenRegistry,
    relationRegistry,
    queryParser,
  });
  const epistemicAnalyzer = new EpistemicGapAnalyzer();
  const learningAnalyst = new LearningAnalyst({ tokenRegistry, graph, relationRegistry });

  return { tokenRegistry, graph, relationRegistry, queryParser, reasoner, epistemicAnalyzer, learningAnalyst };
}

function populateStandardGeographyKnowledge(sys) {
  const { tokenRegistry, graph, relationRegistry } = sys;

  // 1. Entities and Types
  const amaran = tokenRegistry.register({ canonical: 'Amaran', type: 'movie' });
  const tamilNadu = tokenRegistry.register({ canonical: 'Tamil Nadu', type: 'state' });
  const india = tokenRegistry.register({ canonical: 'India', type: 'country' });
  const asia = tokenRegistry.register({ canonical: 'Asia', type: 'continent' });
  const earth = tokenRegistry.register({ canonical: 'Earth', type: 'planet' });

  // 2. Factual Relationships
  graph.add(amaran.id, 'filmed_in', tamilNadu.id, 1.0);
  graph.add(tamilNadu.id, 'part_of', india.id, 1.0);
  graph.add(india.id, 'located_in', asia.id, 1.0);
  graph.add(asia.id, 'part_of', earth.id, 1.0);

  // 3. Register Inverse Relations dynamically
  relationRegistry.registerInverse('filmed_in', 'contains_film');
  relationRegistry.registerInverse('part_of', 'has_part');
  relationRegistry.registerInverse('located_in', 'contains_location');

  return { amaran, tamilNadu, india, asia, earth };
}

let passed = 0;
let failed = 0;

function runTest(name, testFn) {
  try {
    testFn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}\n`);
    failed++;
  }
}

// -------------------------------------------------------------
// Test 1: Direct 1-Hop Query
// -------------------------------------------------------------
runTest('Test 1: Direct 1-Hop ("Where was Amaran filmed?")', () => {
  const sys = createIsolatedCognitiveSystem();
  populateStandardGeographyKnowledge(sys);

  const res = sys.reasoner.solve('Where was Amaran filmed?');
  assert.ok(res, 'Should resolve direct query');
  assert.equal(res.status, 'verified');
  assert.equal(res.value, 'Tamil Nadu');
  assert.equal(res.targetType, 'state');
});

// -------------------------------------------------------------
// Test 2: Country Inference (2 Hops)
// -------------------------------------------------------------
runTest('Test 2: Country Inference 2-Hop ("Which country was Amaran filmed in?")', () => {
  const sys = createIsolatedCognitiveSystem();
  populateStandardGeographyKnowledge(sys);

  const res = sys.reasoner.solve('Which country was Amaran filmed in?');
  assert.ok(res, 'Should resolve country query');
  assert.equal(res.status, 'verified');
  assert.equal(res.value, 'India', 'Must reach country India, NOT state Tamil Nadu');
  assert.equal(res.hopCount, 2);
  assert.equal(res.targetType, 'country');
  assert.ok(res.confidence >= 0.90, 'Confidence should be high for 2-hop verified path');
});

// -------------------------------------------------------------
// Test 3: Continent Inference (3 Hops)
// -------------------------------------------------------------
runTest('Test 3: Continent Inference 3-Hop ("Which continent is the country where Amaran was filmed located in?")', () => {
  const sys = createIsolatedCognitiveSystem();
  populateStandardGeographyKnowledge(sys);

  const res = sys.reasoner.solve('Which continent is the country where Amaran was filmed located in?');
  assert.ok(res, 'Should resolve continent query');
  assert.equal(res.status, 'verified');
  assert.equal(res.value, 'Asia', 'Must reach continent Asia');
  assert.equal(res.hopCount, 3);
  assert.equal(res.targetType, 'continent');
});

// -------------------------------------------------------------
// Test 4: Deep 4-Hop Chain
// -------------------------------------------------------------
runTest('Test 4: Deep 4-Hop Chain ("Which planet is the continent containing the country where Amaran was filmed part of?")', () => {
  const sys = createIsolatedCognitiveSystem();
  populateStandardGeographyKnowledge(sys);

  const res = sys.reasoner.solve('Which planet is the continent containing the country where Amaran was filmed part of?');
  assert.ok(res, 'Should resolve deep planet query');
  assert.equal(res.status, 'verified');
  assert.equal(res.value, 'Earth', 'Must reach planet Earth');
  assert.equal(res.hopCount, 4);
  assert.equal(res.targetType, 'planet');
  assert.ok(res.explanation.includes('Amaran') && res.explanation.includes('Earth'), 'Explanation must include provenance');
});

// -------------------------------------------------------------
// Test 5: Wrong Intermediate Candidate Rejection
// -------------------------------------------------------------
runTest('Test 5: Wrong Intermediate Rejection (Country query NEVER returns state)', () => {
  const sys = createIsolatedCognitiveSystem();
  populateStandardGeographyKnowledge(sys);

  const res = sys.reasoner.solve('Which country was Amaran filmed in?');
  assert.notEqual(res.value, 'Tamil Nadu', 'Tamil Nadu is a state, must not satisfy country query');
  assert.equal(res.value, 'India');
});

// -------------------------------------------------------------
// Test 6: Cycle & Ping-Pong Protection
// -------------------------------------------------------------
runTest('Test 6: Cycle & Ping-Pong Protection (Inverse edges do not cause infinite loops)', () => {
  const sys = createIsolatedCognitiveSystem();
  const { amaran, tamilNadu, india } = populateStandardGeographyKnowledge(sys);

  // Add explicit bidirectional inverse edges to create tight cycles
  sys.graph.add(tamilNadu.id, 'contains_film', amaran.id, 1.0);
  sys.graph.add(india.id, 'has_part', tamilNadu.id, 1.0);

  const startTime = Date.now();
  const res = sys.reasoner.solve('Which country was Amaran filmed in?');
  const elapsed = Date.now() - startTime;

  assert.ok(elapsed < 100, 'Traversal should terminate in <100ms with direction-aware cycle protection');
  assert.ok(res, 'Should resolve successfully despite cyclic edges');
  assert.equal(res.value, 'India');
});

// -------------------------------------------------------------
// Test 7: Competing Paths Ranking
// -------------------------------------------------------------
runTest('Test 7: Competing Paths Ranking (Target-typed path wins over unrelated branch)', () => {
  const sys = createIsolatedCognitiveSystem();
  const { amaran, tamilNadu } = populateStandardGeographyKnowledge(sys);

  // Add an unrelated competing branch
  const festival = sys.tokenRegistry.register({ canonical: 'Pongal Festival', type: 'culture' });
  sys.graph.add(tamilNadu.id, 'celebrates', festival.id, 1.0);

  const res = sys.reasoner.solve('Which country was Amaran filmed in?');
  assert.equal(res.value, 'India', 'Country path must beat culture path');
});

// -------------------------------------------------------------
// Test 8: Calibrated Multi-Hop Confidence Degradation
// -------------------------------------------------------------
runTest('Test 8: Calibrated Confidence Degradation with Depth', () => {
  const sys = createIsolatedCognitiveSystem();
  populateStandardGeographyKnowledge(sys);

  const res1 = sys.reasoner.solve('Where was Amaran filmed?'); // 1 hop
  const res2 = sys.reasoner.solve('Which country was Amaran filmed in?'); // 2 hops
  const res3 = sys.reasoner.solve('Which continent is the country where Amaran was filmed located in?'); // 3 hops
  const res4 = sys.reasoner.solve('Which planet is the continent containing the country where Amaran was filmed part of?'); // 4 hops

  assert.ok(res1.confidence >= res2.confidence, '1-hop confidence >= 2-hop confidence');
  assert.ok(res2.confidence >= res3.confidence, '2-hop confidence >= 3-hop confidence');
  assert.ok(res3.confidence >= res4.confidence, '3-hop confidence >= 4-hop confidence');
  assert.ok(res4.confidence >= 0.70, '4-hop verified path must still maintain high confidence (>= 0.70)');
});

// -------------------------------------------------------------
// Test 9: Epistemic Gap Analyzer Classification
// -------------------------------------------------------------
runTest('Test 9: Epistemic Gap Analyzer (KNOWN vs UNCERTAIN vs UNKNOWN)', () => {
  const sys = createIsolatedCognitiveSystem();
  populateStandardGeographyKnowledge(sys);

  const planKnown = sys.queryParser.parse('Which country was Amaran filmed in?');
  const resKnown = sys.reasoner.solve(planKnown);
  const analysisKnown = sys.epistemicAnalyzer.analyze(resKnown, planKnown);
  assert.equal(analysisKnown.status, EpistemicStatus.KNOWN);
  assert.equal(analysisKnown.shouldEscalate, false);

  const planUnknown = sys.queryParser.parse('Which galaxy is Amaran located in?');
  const resUnknown = sys.reasoner.solve(planUnknown);
  const analysisUnknown = sys.epistemicAnalyzer.analyze(resUnknown, planUnknown);
  assert.equal(analysisUnknown.status, EpistemicStatus.UNKNOWN);
  assert.equal(analysisUnknown.shouldEscalate, true);
});

// -------------------------------------------------------------
// Test 10: Generic Graph Isomorphism (ZERO HARDCODING PROOF)
// -------------------------------------------------------------
runTest('Test 10: Generic Graph Isomorphism (Arbitrary Synthetic Topology E1 -> E2 -> E3 -> E4 -> E5)', () => {
  const sys = createIsolatedCognitiveSystem();
  const { tokenRegistry, graph, reasoner } = sys;

  // Create completely abstract synthetic entities with no real-world names
  const e1 = tokenRegistry.register({ canonical: 'SyntheticAlpha_99', type: 'quantum_device' });
  const e2 = tokenRegistry.register({ canonical: 'ModuleBeta_77', type: 'sub_unit' });
  const e3 = tokenRegistry.register({ canonical: 'ClusterGamma_55', type: 'compute_node' });
  const e4 = tokenRegistry.register({ canonical: 'SectorDelta_33', type: 'datacenter_zone' });
  const e5 = tokenRegistry.register({ canonical: 'FacilityOmega_11', type: 'super_cluster' });

  graph.add(e1.id, 'integrates_with', e2.id, 1.0);
  graph.add(e2.id, 'routes_to', e3.id, 1.0);
  graph.add(e3.id, 'hosted_in', e4.id, 1.0);
  graph.add(e4.id, 'managed_by', e5.id, 1.0);

  const res = reasoner.solve('Which super_cluster is SyntheticAlpha_99 managed by?');
  assert.ok(res, 'Should resolve synthetic graph query');
  assert.equal(res.value, 'FacilityOmega_11');
  assert.equal(res.hopCount, 4);
  assert.equal(res.targetType, 'super_cluster');
});

// -------------------------------------------------------------
// Test 11: Teacher-Learning-Replay Loop (Zero Token Local Resolution)
// -------------------------------------------------------------
runTest('Test 11: Teacher Learning Replay Loop', () => {
  const sys = createIsolatedCognitiveSystem();
  const { tokenRegistry, graph, reasoner } = sys;

  // 1. Initial State: Unknown entity
  const initialPlan = sys.queryParser.parse('Which country was Kanguva filmed in?');
  const initialRes = reasoner.solve(initialPlan);
  assert.equal(initialRes, null, 'Initial query should return null before learning');

  // 2. Teacher Ingestion Phase
  const kanguva = tokenRegistry.register({ canonical: 'Kanguva', type: 'movie' });
  const goa = tokenRegistry.register({ canonical: 'Goa', type: 'state' });
  const india = tokenRegistry.register({ canonical: 'India', type: 'country' });
  graph.add(kanguva.id, 'filmed_in', goa.id, 1.0);
  graph.add(goa.id, 'part_of', india.id, 1.0);

  // 3. Re-play Original Query Locally: Must resolve in 0 tokens
  const replayPlan = sys.queryParser.parse('Which country was Kanguva filmed in?');
  const replayRes = reasoner.solve(replayPlan);
  assert.ok(replayRes, 'Replayed query should resolve after learning');
  assert.equal(replayRes.value, 'India');
  assert.equal(replayRes.hopCount, 2);
  assert.equal(replayRes.provenance, 'local_graph');
});

// -------------------------------------------------------------
// Test 12: Knowledge Conflict & Contradiction Handling
// -------------------------------------------------------------
runTest('Test 12: Knowledge Conflict Handling (Higher confidence path prevails)', () => {
  const sys = createIsolatedCognitiveSystem();
  const { amaran, tamilNadu, india } = populateStandardGeographyKnowledge(sys);

  // Add low-confidence contradictory edge
  const fakeCountry = sys.tokenRegistry.register({ canonical: 'FakeCountry_X', type: 'country' });
  sys.graph.add(tamilNadu.id, 'part_of', fakeCountry.id, 0.2); // Low confidence 0.2

  const res = sys.reasoner.solve('Which country was Amaran filmed in?');
  assert.equal(res.value, 'India', 'High-confidence path (1.0) must beat contradictory low-confidence path (0.2)');
  assert.ok(res.confidence > 0.85);
});

// -------------------------------------------------------------
// Test 13: LLM Teacher Knowledge Distillation Ingestion
// -------------------------------------------------------------
runTest('Test 13: Teacher Knowledge Ingestion Contract (Entities + Triples)', () => {
  const sys = createIsolatedCognitiveSystem();

  // Clean structured output from LLM Teacher
  const teacherOutput = {
    entities: [
      { name: 'Kalki', type: 'movie' },
      { name: 'Hyderabad', type: 'city' },
      { name: 'Telangana', type: 'state' },
      { name: 'India', type: 'country' },
    ],
    triples: [
      { subject: 'Kalki', relation: 'filmed_in', object: 'Hyderabad' },
      { subject: 'Hyderabad', relation: 'located_in', object: 'Telangana' },
      { subject: 'Telangana', relation: 'part_of', object: 'India' },
    ],
  };

  sys.learningAnalyst._ingestKnowledge(teacherOutput);

  // Verify entities registered with accurate semantic types in TokenRegistry
  const kalkiTok = sys.tokenRegistry.lookup('Kalki');
  assert.ok(kalkiTok, 'Kalki must be registered');
  assert.equal(kalkiTok.type, 'movie');

  const hydTok = sys.tokenRegistry.lookup('Hyderabad');
  assert.ok(hydTok, 'Hyderabad must be registered');
  assert.equal(hydTok.type, 'city');

  // Verify multi-hop country reasoning over learned teacher knowledge
  const resCountry = sys.reasoner.solve('Which country was Kalki filmed in?');
  assert.ok(resCountry, 'Must resolve country query over newly learned knowledge');
  assert.equal(resCountry.value, 'India');
  assert.equal(resCountry.hopCount, 3);
});

// -------------------------------------------------------------
// Test 14: Multi-Hop Target Type Rejection over Teacher Knowledge
// -------------------------------------------------------------
runTest('Test 14: Target Type Discrimination over Teacher Ingested Knowledge', () => {
  const sys = createIsolatedCognitiveSystem();

  sys.learningAnalyst._ingestKnowledge({
    entities: [
      { name: 'Dune', type: 'movie' },
      { name: 'Wadi Rum', type: 'location' },
      { name: 'Jordan', type: 'country' },
      { name: 'Asia', type: 'continent' },
      { name: 'Earth', type: 'planet' },
    ],
    triples: [
      { subject: 'Dune', relation: 'filmed_in', object: 'Wadi Rum' },
      { subject: 'Wadi Rum', relation: 'located_in', object: 'Jordan' },
      { subject: 'Jordan', relation: 'part_of', object: 'Asia' },
      { subject: 'Asia', relation: 'part_of', object: 'Earth' },
    ],
  });

  // Target: continent -> must return Asia (hop 3), NOT Jordan (hop 2) or Wadi Rum (hop 1)
  const resContinent = sys.reasoner.solve('Which continent is the country where Dune was filmed located in?');
  assert.ok(resContinent);
  assert.equal(resContinent.value, 'Asia');
  assert.equal(resContinent.hopCount, 3);

  // Target: planet -> must return Earth (hop 4)
  const resPlanet = sys.reasoner.solve('Which planet is the continent containing the country where Dune was filmed part of?');
  assert.ok(resPlanet);
  assert.equal(resPlanet.value, 'Earth');
  assert.equal(resPlanet.hopCount, 4);
});

console.log('\n===============================================================');
console.log(`📊 Multi-Hop Reasoning Results: ${passed} Passed, ${failed} Failed`);
console.log('===============================================================\n');

if (failed > 0) {
  process.exit(1);
}
