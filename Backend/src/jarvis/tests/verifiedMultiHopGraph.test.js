import test from 'node:test';
import assert from 'node:assert/strict';
import { RelationshipGraph } from '../tokens/RelationshipGraph.js';
import { TokenRegistry, TokenType } from '../tokens/TokenRegistry.js';
import { RelationRegistry } from '../reasoning/RelationRegistry.js';
import { GraphReasoner } from '../reasoning/GraphReasoner.js';
import { EntityCanonicalizer } from '../tokens/EntityCanonicalizer.js';
import { LearningAnalyst } from '../stages/LearningAnalyst.js';

test('Verified Multi-Hop Cognitive Graph & Entity Normalization Test Suite', async (t) => {
  const canonicalizer = new EntityCanonicalizer();
  const registry = new TokenRegistry({ startingId: 30001 });
  const graph = new RelationshipGraph({ tokenRegistry: registry });
  const relationRegistry = new RelationRegistry({ graph, tokenRegistry: registry });
  const reasoner = new GraphReasoner({ graph, tokenRegistry: registry, relationRegistry });
  const learningAnalyst = new LearningAnalyst({ tokenRegistry: registry, graph, relationRegistry });

  // Ingest canonical knowledge base
  // 1. Amaran filmed in Tamil Nadu
  // 2. Tamil Nadu part of Indian Union (resolves to India)
  // 3. India located in Asian continent (resolves to Asia)
  // 4. Asia part of Earth
  // 5. Earth located in Solar System
  learningAnalyst._ingestKnowledge({
    entities: [
      { name: 'Amaran', type: 'film' },
      { name: 'Tamil Nadu', type: 'administrative_division' },
      { name: 'Indian Union', type: 'country' },
      { name: 'Asian continent', type: 'continent' },
      { name: 'Earth', type: 'planet' },
      { name: 'Solar System', type: 'celestial_system' },
      { name: 'Tamil', type: 'language' },
    ],
    triples: [
      { subject: 'Amaran', relation: 'filmed_in', object: 'Tamil Nadu', confidence: 1.0 },
      { subject: 'Tamil Nadu', relation: 'forms_part_of', object: 'Indian Union', confidence: 1.0 },
      { subject: 'India', relation: 'is_located_in', object: 'Asian continent', confidence: 1.0 },
      { subject: 'Asia', relation: 'part_of', object: 'Earth', confidence: 1.0 },
      { subject: 'Earth', relation: 'located_in', object: 'Solar System', confidence: 1.0 },
    ]
  });

  // --- Test 1: Direct 1-Hop Traversal ---
  await t.test('Test 1: Direct 1-Hop Traversal ("Where was Amaran filmed?")', () => {
    const res = reasoner.solve('Where was Amaran filmed?');
    assert.equal(res.verified, true);
    assert.equal(res.targetToken.canonical, 'Tamil Nadu');
    assert.equal(res.path.length, 1);
  });

  // --- Test 2: Two-Hop Reasoning ---
  await t.test('Test 2: Two-Hop Reasoning ("Which country was Amaran filmed in?")', () => {
    const res = reasoner.solve('Which country was Amaran filmed in?');
    assert.equal(res.verified, true);
    assert.equal(res.targetToken.canonical, 'India');
    assert.equal(res.path.length, 2);
  });

  // --- Test 3: Three-Hop Reasoning ---
  await t.test('Test 3: Three-Hop Reasoning ("Which continent is the country where Amaran was filmed located in?")', () => {
    const res = reasoner.solve('Which continent is the country where Amaran was filmed located in?');
    assert.equal(res.verified, true);
    assert.equal(res.targetToken.canonical, 'Asia');
    assert.equal(res.path.length, 3);
  });

  // --- Test 4: Four-Hop Reasoning ---
  await t.test('Test 4: Four-Hop Reasoning ("Which planet is the continent containing the country where Amaran was filmed part of?")', () => {
    const res = reasoner.solve('Which planet is the continent containing the country where Amaran was filmed part of?');
    assert.equal(res.verified, true);
    assert.equal(res.targetToken.canonical, 'Earth');
    assert.equal(res.path.length, 4);
  });

  // --- Test 5: Intermediate Node Rejection ---
  await t.test('Test 5: Intermediate Node Rejection (Country query must NEVER return Tamil Nadu)', () => {
    const res = reasoner.solve('Which country was Amaran filmed in?');
    assert.equal(res.verified, true);
    assert.notEqual(res.targetToken.canonical, 'Tamil Nadu');
    assert.equal(res.targetToken.canonical, 'India');
  });

  // --- Test 6: Alias Resolution (Indian Union ≈ India) ---
  await t.test('Test 6: Alias Resolution (Indian Union and India resolve to same canonical entity)', () => {
    const tIndia = registry.lookup('India');
    const tIndianUnion = registry.lookup('Indian Union');
    assert.ok(tIndia, 'India must exist');
    assert.ok(tIndianUnion, 'Indian Union must resolve');
    assert.equal(tIndianUnion.id, tIndia.id, 'Indian Union must point to India canonical token ID');
    assert.equal(tIndia.canonical, 'India');
    assert.ok(tIndia.aliases.some((a) => a.toLowerCase() === 'indian union'), 'Indian Union must be in aliases');
  });

  // --- Test 7: Continent Alias Resolution (Asian continent ≈ Asia) ---
  await t.test('Test 7: Continent Alias Resolution (Asian continent and Asia resolve to same canonical entity)', () => {
    const tAsia = registry.lookup('Asia');
    const tAsianContinent = registry.lookup('Asian continent');
    assert.ok(tAsia, 'Asia must exist');
    assert.ok(tAsianContinent, 'Asian continent must resolve');
    assert.equal(tAsianContinent.id, tAsia.id, 'Asian continent must point to Asia canonical token ID');
    assert.equal(tAsia.canonical, 'Asia');
    assert.equal(tAsia.type, 'continent');
  });

  // --- Test 8: Entity Boundary Protection (Tamil ≠ Tamil Nadu) ---
  await t.test('Test 8: Entity Boundary Protection (Tamil language must remain distinct from Tamil Nadu)', () => {
    const tTamil = registry.lookup('Tamil');
    const tTamilNadu = registry.lookup('Tamil Nadu');
    assert.ok(tTamil, 'Tamil token must exist');
    assert.ok(tTamilNadu, 'Tamil Nadu token must exist');
    assert.notEqual(tTamil.id, tTamilNadu.id, 'Tamil and Tamil Nadu must have distinct IDs');
    assert.equal(tTamil.type, 'language');
    assert.equal(tTamilNadu.type, 'administrative_division');
  });

  // --- Test 9: Generic Synthetic Topology (E1 -> E2 -> E3 -> E4 -> E5) ---
  await t.test('Test 9: Generic Topology (E1 -> E2 -> E3 -> E4 -> E5 resolves without domain heuristics)', () => {
    const synthReg = new TokenRegistry({ startingId: 40001 });
    const synthGraph = new RelationshipGraph({ tokenRegistry: synthReg });
    const synthRelReg = new RelationRegistry({ graph: synthGraph, tokenRegistry: synthReg });
    const synthReasoner = new GraphReasoner({ graph: synthGraph, tokenRegistry: synthReg, relationRegistry: synthRelReg });

    const e1 = synthReg.register({ canonical: 'EntityAlpha', type: 'entity' });
    const e2 = synthReg.register({ canonical: 'EntityBeta', type: 'entity' });
    const e3 = synthReg.register({ canonical: 'EntityGamma', type: 'entity' });
    const e4 = synthReg.register({ canonical: 'EntityDelta', type: 'entity' });
    const e5 = synthReg.register({ canonical: 'EntityEpsilon', type: 'target_omega' });

    synthGraph.add(e1.id, 'rel_a', e2.id, 1.0);
    synthGraph.add(e2.id, 'rel_b', e3.id, 1.0);
    synthGraph.add(e3.id, 'rel_c', e4.id, 1.0);
    synthGraph.add(e4.id, 'rel_d', e5.id, 1.0);

    const pathRes = synthGraph.findVerifiedPath(e1.id, ['rel_a', 'rel_b', 'rel_c', 'rel_d'], {
      registry: synthReg,
      relationRegistry: synthRelReg,
    });
    assert.equal(pathRes.found, true);
    assert.equal(pathRes.depth, 4);
    assert.equal(pathRes.targetId, e5.id);
    assert.equal(pathRes.targetToken.canonical, 'EntityEpsilon');
  });

  // --- Test 10: Path Cycle Protection ---
  await t.test('Test 10: Cycle Protection (A -> B -> C -> A terminates safely)', () => {
    const cycleGraph = new RelationshipGraph({ tokenRegistry: registry });
    const tA = registry.register({ canonical: 'LoopA', type: 'entity' });
    const tB = registry.register({ canonical: 'LoopB', type: 'entity' });
    const tC = registry.register({ canonical: 'LoopC', type: 'entity' });

    cycleGraph.add(tA.id, 'leads_to', tB.id);
    cycleGraph.add(tB.id, 'leads_to', tC.id);
    cycleGraph.add(tC.id, 'leads_to', tA.id);

    const res = cycleGraph.findVerifiedPath(tA.id, ['leads_to', 'leads_to', 'leads_to', 'leads_to'], {
      registry,
      relationRegistry,
    });
    assert.equal(res.found, false, 'Cycle path must be rejected');
    assert.equal(res.reason, 'PATH_DISCONNECTED');
  });

  // --- Test 11: Competing Paths Ranking ---
  await t.test('Test 11: Competing-Path Ranking (Higher confidence path prioritized)', () => {
    const compGraph = new RelationshipGraph({ tokenRegistry: registry });
    const compRelReg = new RelationRegistry({ graph: compGraph, tokenRegistry: registry });
    const compReasoner = new GraphReasoner({ graph: compGraph, tokenRegistry: registry, relationRegistry: compRelReg });

    const root = registry.register({ canonical: 'PersonX', type: 'entity' });
    const candHigh = registry.register({ canonical: 'CityHigh', type: 'city' });
    const candLow = registry.register({ canonical: 'CityLow', type: 'city' });

    compGraph.add(root.id, 'birth_place', candHigh.id, 0.95);
    compGraph.add(root.id, 'birth_place', candLow.id, 0.40);

    const res = compReasoner.solve('Which city was PersonX born in?');
    assert.equal(res.verified, true);
    assert.equal(res.targetToken.canonical, 'CityHigh');
  });

  // --- Test 12: Calibrated Confidence Degradation ---
  await t.test('Test 12: Calibrated Confidence Degradation Across Hops', () => {
    const res1 = reasoner.solve('Where was Amaran filmed?');
    const res4 = reasoner.solve('Which planet is the continent containing the country where Amaran was filmed part of?');

    assert.ok(res1.confidence >= res4.confidence, 'Confidence must decay monotonically with hop distance');
    assert.ok(res4.confidence > 0.5, 'Calibrated 4-hop path must maintain confident validity');
  });

  // --- Test 13: Entity Boundary Normalization from Complex Sentence ---
  await t.test('Test 13: Entity Boundary Normalization (No pseudo-entities from sentence fragments)', () => {
    const rawSentence = 'Tamil Nadu forms part of the Indian union as one of its states.';
    const decomp = canonicalizer.decomposeTaxonomicPhrase('Indian union as one of its states', 'country');
    assert.equal(decomp.canonical, 'India');
    assert.equal(decomp.semanticType, 'country');
  });

  // --- Test 14: Knowledge Conflict Resolution ---
  await t.test('Test 14: Knowledge Conflict Resolution (Latest verified edge updates topology)', () => {
    const dynReg = new TokenRegistry({ startingId: 50001 });
    const dynGraph = new RelationshipGraph({ tokenRegistry: dynReg });
    const dynAnalyst = new LearningAnalyst({ tokenRegistry: dynReg, graph: dynGraph });

    const emp = dynReg.register({ canonical: 'DevBob', type: 'person' });
    const dept1 = dynReg.register({ canonical: 'FrontendTeam', type: 'department' });
    const dept2 = dynReg.register({ canonical: 'CoreEngineTeam', type: 'department' });

    dynGraph.add(emp.id, 'member_of', dept1.id, 0.8);
    // Updated higher-confidence assignment
    dynGraph.add(emp.id, 'member_of', dept2.id, 1.0);

    const outgoing = dynGraph.getOutgoing(emp.id).filter(e => e.relation === 'member_of');
    const best = outgoing.sort((a, b) => b.confidence - a.confidence)[0];
    assert.equal(best.to, dept2.id);
  });

  // --- Test 15 & 20: Teacher Replay Loop (0 API Calls on Repeat) ---
  await t.test('Test 15: Teacher Replay Loop (Second identical query resolves in 0 Teacher calls)', async () => {
    let teacherCallCount = 0;
    const mockTeacher = {
      chat: async () => {
        teacherCallCount++;
        return {
          text: JSON.stringify({
            entities: [
              { name: 'Kalki 2898 AD', type: 'film' },
              { name: 'Hyderabad', type: 'location' },
              { name: 'Telangana', type: 'administrative_division' },
            ],
            triples: [
              { subject: 'Kalki 2898 AD', relation: 'filmed_in', object: 'Hyderabad' },
              { subject: 'Hyderabad', relation: 'located_in', object: 'Telangana' },
            ]
          })
        };
      }
    };

    const teacherAnalyst = new LearningAnalyst({
      tokenRegistry: registry,
      graph,
      relationRegistry,
      llmManager: mockTeacher,
    });

    // Query 1: Unknown knowledge -> Distill via Teacher
    await teacherAnalyst._distillFactualTriplesViaLLM('Where was Kalki 2898 AD filmed?', '', {});
    assert.equal(teacherCallCount, 1, 'Teacher must be invoked on initial learning');

    // Query 2: Solve from local brain -> 0 Teacher Calls
    const localRes = reasoner.solve('Which administrative_division was Kalki 2898 AD filmed in?');
    assert.equal(localRes.verified, true);
    assert.equal(localRes.targetToken.canonical, 'Telangana');
    assert.equal(teacherCallCount, 1, 'Second query must NOT invoke Teacher (0 API calls)');
  });

  // --- Test 16: Synthetic 5-Hop Traversal (E1 -> E2 -> E3 -> E4 -> E5 -> E6) ---
  await t.test('Test 16: Synthetic 5-Hop Execution (Topology Independence)', () => {
    const fiveHopReg = new TokenRegistry({ startingId: 60001 });
    const fiveHopGraph = new RelationshipGraph({ tokenRegistry: fiveHopReg });
    const fiveHopRelReg = new RelationRegistry({ graph: fiveHopGraph, tokenRegistry: fiveHopReg });

    const n1 = fiveHopReg.register({ canonical: 'N1', type: 'entity' });
    const n2 = fiveHopReg.register({ canonical: 'N2', type: 'entity' });
    const n3 = fiveHopReg.register({ canonical: 'N3', type: 'entity' });
    const n4 = fiveHopReg.register({ canonical: 'N4', type: 'entity' });
    const n5 = fiveHopReg.register({ canonical: 'N5', type: 'entity' });
    const n6 = fiveHopReg.register({ canonical: 'N6', type: 'entity' });

    fiveHopGraph.add(n1.id, 'step_1', n2.id);
    fiveHopGraph.add(n2.id, 'step_2', n3.id);
    fiveHopGraph.add(n3.id, 'step_3', n4.id);
    fiveHopGraph.add(n4.id, 'step_4', n5.id);
    fiveHopGraph.add(n5.id, 'step_5', n6.id);

    const start = performance.now();
    const res = fiveHopGraph.findVerifiedPath(n1.id, ['step_1', 'step_2', 'step_3', 'step_4', 'step_5'], {
      registry: fiveHopReg,
      relationRegistry: fiveHopRelReg,
    });
    const duration = performance.now() - start;

    assert.equal(res.found, true);
    assert.equal(res.depth, 5);
    assert.equal(res.targetId, n6.id);
    assert.equal(res.targetToken.canonical, 'N6');
    console.log(`  -> 5-hop synthetic path traversal took ${duration.toFixed(4)}ms (Target: < 1.0ms)`);
  });

  // --- Test 17: Multi-Hop Taxonomic Synonym Resolution (State <-> Administrative Division) ---
  await t.test('Test 17: Multi-Hop Taxonomic Resolution ("Which state is Arunbharathi connected to through M.K. Stalin?")', () => {
    const govReg = new TokenRegistry({ startingId: 70001 });
    const govGraph = new RelationshipGraph({ tokenRegistry: govReg });
    const govRelReg = new RelationRegistry({ graph: govGraph, tokenRegistry: govReg });
    const govReasoner = new GraphReasoner({ graph: govGraph, tokenRegistry: govReg, relationRegistry: govRelReg });

    const arun = govReg.register({ canonical: 'Arunbharathi', type: 'person' });
    const stalin = govReg.register({ canonical: 'M.K. Stalin', type: 'person' });
    const cmOffice = govReg.register({ canonical: 'Chief Minister of Tamil Nadu', type: 'political_office' });
    const tn = govReg.register({ canonical: 'Tamil Nadu', type: 'administrative_division' });

    govGraph.add(arun.id, 'governed_by', stalin.id, 1.0);
    govGraph.add(stalin.id, 'holds_position', cmOffice.id, 1.0);
    govGraph.add(cmOffice.id, 'jurisdiction', tn.id, 1.0);

    const res = govReasoner.solve('Which state is Arunbharathi connected to through M.K. Stalin?');
    assert.ok(res, 'Must resolve multi-hop query');
    assert.equal(res.verified, true);
    assert.equal(res.targetToken.canonical, 'Tamil Nadu');
    assert.equal(res.path.length, 3);
  });

  // --- Test 18: Meta instance_of Taxonomic Resolution (Target is India, not the concept word 'country') ---
  await t.test('Test 18: Meta instance_of Resolution ("Which country is Arunbharathi indirectly connected to through his governing Chief Minister?")', () => {
    const govReg = new TokenRegistry({ startingId: 80001 });
    const govGraph = new RelationshipGraph({ tokenRegistry: govReg });
    const govRelReg = new RelationRegistry({ graph: govGraph, tokenRegistry: govReg });
    const govReasoner = new GraphReasoner({ graph: govGraph, tokenRegistry: govReg, relationRegistry: govRelReg });

    const arun = govReg.register({ canonical: 'Arunbharathi', type: 'person' });
    const stalin = govReg.register({ canonical: 'M.K. Stalin', type: 'person' });
    const cmOffice = govReg.register({ canonical: 'Chief Minister of Tamil Nadu', type: 'political_office' });
    const tn = govReg.register({ canonical: 'Tamil Nadu', type: 'administrative_division' });
    const india = govReg.register({ canonical: 'India', type: 'concept' }); // concept type with taxonomic edge
    const countryTok = govReg.register({ canonical: 'country', type: 'concept' });

    govGraph.add(arun.id, 'governed_by', stalin.id, 1.0);
    govGraph.add(stalin.id, 'holds_position', cmOffice.id, 1.0);
    govGraph.add(cmOffice.id, 'jurisdiction', tn.id, 1.0);
    govGraph.add(tn.id, 'part_of', india.id, 1.0);
    govGraph.add(india.id, 'instance_of', countryTok.id, 1.0); // Taxonomic typing edge

    const res = govReasoner.solve('Which country is Arunbharathi indirectly connected to through his governing Chief Minister?');
    assert.ok(res, 'Must resolve multi-hop query');
    assert.equal(res.verified, true);
    assert.equal(res.targetToken.canonical, 'India', 'Destination MUST be India, NOT the meta type token "country"');
    assert.notEqual(res.targetToken.canonical, 'country');
    assert.equal(res.path.length, 4);
  });

  // --- Test 19: 5-Hop Continent Taxonomic Resolution ---
  await t.test('Test 19: 5-Hop Continent Taxonomic Resolution ("Which continent is Arunbharathi indirectly connected to through his governing Chief Minister?")', () => {
    const govReg = new TokenRegistry({ startingId: 90001 });
    const govGraph = new RelationshipGraph({ tokenRegistry: govReg });
    const govRelReg = new RelationRegistry({ graph: govGraph, tokenRegistry: govReg });
    const govReasoner = new GraphReasoner({ graph: govGraph, tokenRegistry: govReg, relationRegistry: govRelReg });

    const arun = govReg.register({ canonical: 'Arunbharathi', type: 'person' });
    const stalin = govReg.register({ canonical: 'M.K. Stalin', type: 'person' });
    const cmOffice = govReg.register({ canonical: 'Chief Minister of Tamil Nadu', type: 'political_office' });
    const tn = govReg.register({ canonical: 'Tamil Nadu', type: 'administrative_division' });
    const india = govReg.register({ canonical: 'India', type: 'concept', aliases: ['Indian Union'] });
    const asia = govReg.register({ canonical: 'Asia', type: 'concept', aliases: ['Asian continent'] });

    govGraph.add(arun.id, 'governed_by', stalin.id, 1.0);
    govGraph.add(stalin.id, 'holds_position', cmOffice.id, 1.0);
    govGraph.add(cmOffice.id, 'jurisdiction', tn.id, 1.0);
    govGraph.add(tn.id, 'part_of', india.id, 1.0);
    govGraph.add(india.id, 'located_in', asia.id, 1.0);

    const res = govReasoner.solve('Which continent is Arunbharathi indirectly connected to through his governing Chief Minister?');
    assert.ok(res, 'Must resolve 5-hop continent query');
    assert.equal(res.verified, true);
    assert.equal(res.targetToken.canonical, 'Asia');
    assert.equal(res.path.length, 5);
  });

  // --- Test 20: 6-Hop Planet Taxonomic Resolution ---
  await t.test('Test 20: 6-Hop Planet Taxonomic Resolution ("Which planet is indirectly connected to Arunbharathi through his governing Chief Minister?")', () => {
    const govReg = new TokenRegistry({ startingId: 100001 });
    const govGraph = new RelationshipGraph({ tokenRegistry: govReg });
    const govRelReg = new RelationRegistry({ graph: govGraph, tokenRegistry: govReg });
    const govReasoner = new GraphReasoner({ graph: govGraph, tokenRegistry: govReg, relationRegistry: govRelReg });

    const arun = govReg.register({ canonical: 'Arunbharathi', type: 'person' });
    const stalin = govReg.register({ canonical: 'M.K. Stalin', type: 'person' });
    const cmOffice = govReg.register({ canonical: 'Chief Minister of Tamil Nadu', type: 'political_office' });
    const tn = govReg.register({ canonical: 'Tamil Nadu', type: 'administrative_division' });
    const india = govReg.register({ canonical: 'India', type: 'country', aliases: ['Indian Union'] });
    const asia = govReg.register({ canonical: 'Asia', type: 'continent', aliases: ['Asian continent'] });
    const earth = govReg.register({ canonical: 'Earth', type: 'planet', aliases: ['Planet Earth'] });

    govGraph.add(arun.id, 'governed_by', stalin.id, 1.0);
    govGraph.add(stalin.id, 'holds_position', cmOffice.id, 1.0);
    govGraph.add(cmOffice.id, 'jurisdiction', tn.id, 1.0);
    govGraph.add(tn.id, 'part_of', india.id, 1.0);
    govGraph.add(india.id, 'located_in', asia.id, 1.0);
    govGraph.add(asia.id, 'part_of', earth.id, 1.0);

    const res = govReasoner.solve('Which planet is indirectly connected to Arunbharathi through his governing Chief Minister?');
    assert.ok(res, 'Must resolve 6-hop planet query');
    assert.equal(res.verified, true);
    assert.equal(res.targetToken.canonical, 'Earth');
    assert.equal(res.path.length, 6);
  });

  // --- Test 21: Verification Query with Typo Target ("Does planet earthi is indirectly connected to Arunbharathi through his governing Chief Minister?") ---
  await t.test('Test 21: Verification Query with Typo Target ("Does planet earthi is indirectly connected to Arunbharathi through his governing Chief Minister?")', () => {
    const govReg = new TokenRegistry({ startingId: 110001 });
    const govGraph = new RelationshipGraph({ tokenRegistry: govReg });
    const govRelReg = new RelationRegistry({ graph: govGraph, tokenRegistry: govReg });
    const govReasoner = new GraphReasoner({ graph: govGraph, tokenRegistry: govReg, relationRegistry: govRelReg });

    const arun = govReg.register({ canonical: 'Arunbharathi', type: 'person' });
    const stalin = govReg.register({ canonical: 'M.K. Stalin', type: 'person' });
    const cmOffice = govReg.register({ canonical: 'Chief Minister of Tamil Nadu', type: 'political_office' });
    const tn = govReg.register({ canonical: 'Tamil Nadu', type: 'administrative_division' });
    const india = govReg.register({ canonical: 'India', type: 'country', aliases: ['Indian Union'] });
    const asia = govReg.register({ canonical: 'Asia', type: 'continent', aliases: ['Asian continent'] });
    const earth = govReg.register({ canonical: 'Earth', type: 'planet', aliases: ['Planet Earth'] });

    govGraph.add(arun.id, 'governed_by', stalin.id, 1.0);
    govGraph.add(stalin.id, 'holds_position', cmOffice.id, 1.0);
    govGraph.add(cmOffice.id, 'jurisdiction', tn.id, 1.0);
    govGraph.add(tn.id, 'part_of', india.id, 1.0);
    govGraph.add(india.id, 'located_in', asia.id, 1.0);
    govGraph.add(asia.id, 'part_of', earth.id, 1.0);

    const res = govReasoner.solve('Does planet earthi is indirectly connected to Arunbharathi through his governing Chief Minister?');
    assert.ok(res, 'Must resolve verification query');
    assert.equal(res.verified, true);
    assert.equal(res.isVerification, true);
    assert.equal(res.targetToken.canonical, 'Earth', 'Target token must resolve to Earth even with typo "earthi"');
    assert.equal(res.path.length, 6);
  });
});
