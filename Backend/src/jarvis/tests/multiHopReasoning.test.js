import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenRegistry, TokenType } from '../tokens/TokenRegistry.js';
import { RelationshipGraph } from '../tokens/RelationshipGraph.js';
import { RelationRegistry } from '../reasoning/RelationRegistry.js';
import { SemanticQueryParser } from '../reasoning/SemanticQueryParser.js';
import { GraphReasoner } from '../reasoning/GraphReasoner.js';
import { IntentClassifier } from '../stages/IntentClassifier.js';

test('Milestones 2 & 3: Semantic Query Parser AST & N-Hop Graph Reasoning Engine', async (t) => {
  const tokenRegistry = new TokenRegistry({ startingId: 20001 });
  const graph = new RelationshipGraph();
  const relationRegistry = new RelationRegistry();
  const queryParser = new SemanticQueryParser({ tokenRegistry, relationRegistry });
  const reasoner = new GraphReasoner({ graph, tokenRegistry, relationRegistry, queryParser });
  const classifier = new IntentClassifier({ tokenRegistry, graph, reasoner });

  console.log('\n======================================================');
  console.log('🤖 J.A.R.V.I.S. N-Hop Cognitive Reasoning Test Suite');
  console.log('======================================================\n');

  // --- SEED KNOWLEDGE ---
  // Family
  const bob = tokenRegistry.register({ canonical: 'Bob', type: TokenType.ENTITY });
  const mary = tokenRegistry.register({ canonical: 'Mary', type: TokenType.ENTITY });
  const john = tokenRegistry.register({ canonical: 'John', type: TokenType.ENTITY });
  const alice = tokenRegistry.register({ canonical: 'Alice', type: TokenType.ENTITY });
  const charlie = tokenRegistry.register({ canonical: 'Charlie', type: TokenType.ENTITY });

  graph.add(bob.id, 'mother_of', mary.id);
  graph.add(mary.id, 'father_of', john.id);
  graph.add(alice.id, 'parent_of', bob.id);
  graph.add(bob.id, 'father_of', charlie.id);

  // Geography
  const chennai = tokenRegistry.register({ canonical: 'Chennai', type: TokenType.ENTITY });
  const india = tokenRegistry.register({ canonical: 'India', type: TokenType.ENTITY });
  const newDelhi = tokenRegistry.register({ canonical: 'New Delhi', type: TokenType.ENTITY });

  graph.add(chennai.id, 'located_in', india.id);
  graph.add(india.id, 'has_capital', newDelhi.id);

  // Organization
  const devAlice = tokenRegistry.register({ canonical: 'DevAlice', type: TokenType.ENTITY });
  const engDept = tokenRegistry.register({ canonical: 'Engineering', type: 'department', aliases: ['Engineering Department'] });
  const chiefBob = tokenRegistry.register({ canonical: 'ChiefBob', type: TokenType.ENTITY });

  graph.add(devAlice.id, 'works_in', engDept.id);
  graph.add(engDept.id, 'head_of', chiefBob.id);

  // --- TEST 1: Semantic Query Parser AST Generation ---
  await t.test('1. Semantic Query Parser AST Generation', () => {
    const ast = queryParser.parse("Who is the father of Bob's mother?");
    assert.ok(ast, 'Should produce a valid AST');
    assert.equal(ast.queryType, 'multi_hop_property');
    assert.equal(ast.rootEntity.canonical, 'Bob');
    assert.equal(ast.hops.length, 2);
    assert.equal(ast.hops[0].relation, 'mother');
    assert.equal(ast.hops[1].relation, 'father');
    assert.equal(ast.hops[1].targetVariable, '?TARGET');
    console.log('  -> Generated AST successfully:', JSON.stringify(ast, null, 2));
  });

  // --- TEST 2: Multi-Hop 2-Hop Family Proof ---
  await t.test('2. 2-Hop Family Reasoning: Father of Bob\'s Mother', () => {
    const resolved = reasoner.solve("Who is the father of Bob's mother?");
    assert.ok(resolved, 'Should resolve 2-hop family chain');
    assert.equal(resolved.targetToken.canonical, 'John');
    assert.equal(resolved.path.length, 2);
    console.log('  -> Proof:', resolved.explanation);
    assert.equal(resolved.explanation, 'Bob — mother of: Mary, Mary — father of: John');
  });

  // --- TEST 3: Dynamic Composite Macro Reasoning (Grandfather -> parent -> father) ---
  await t.test('3. Dynamic Composite Macro Reasoning: Grandfather of Alice', () => {
    queryParser.registerCompositeMacro('grandfather', ['parent', 'father']);
    const resolved = reasoner.solve('Who is the grandfather of Alice?');
    assert.ok(resolved, 'Should resolve composite grandfather query');
    assert.equal(resolved.targetToken.canonical, 'Charlie');
    assert.equal(resolved.path.length, 2);
    console.log('  -> Proof:', resolved.explanation);
  });

  // --- TEST 4: Multi-Hop Geographic Transitivity ---
  await t.test('4. 2-Hop Geographic Reasoning: Capital of Country where Chennai is located', () => {
    const resolved = reasoner.solve('What is the capital of the country where Chennai is located?');
    assert.ok(resolved, 'Should resolve geographic 2-hop chain');
    assert.equal(resolved.targetToken.canonical, 'New Delhi');
    console.log('  -> Proof:', resolved.explanation);
  });

  // --- TEST 5: Multi-Hop Organizational Hierarchy ---
  await t.test('5. 2-Hop Organizational Hierarchy: Head of DevAlice department', () => {
    const resolved = reasoner.solve('Who is the head of DevAlice department?');
    assert.ok(resolved, 'Should resolve department head chain');
    assert.equal(resolved.targetToken.canonical, 'ChiefBob');
    console.log('  -> Proof:', resolved.explanation);
  });

  // --- TEST 6: End-to-End IntentClassifier Multi-Hop Offline Resolution ---
  await t.test('6. End-to-End IntentClassifier Multi-Hop Integration (0 LLM Tokens)', () => {
    const result = classifier._resolveDynamicGraphKnowledge("Who is the father of Bob's mother?");
    assert.ok(result, 'IntentClassifier should resolve multi-hop query');
    assert.equal(result.target.canonical, 'John');
    assert.ok(result.customAnswer.includes('John'), 'Answer must contain target John');
    console.log('  -> End-to-End Answer:', result.customAnswer);
  });
});
