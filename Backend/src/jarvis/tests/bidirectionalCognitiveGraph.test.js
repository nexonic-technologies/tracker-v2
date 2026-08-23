import assert from 'assert';
import { buildJarvis } from '../index.js';
import { defaultTokenRegistry } from '../tokens/TokenRegistry.js';
import { defaultRelationshipGraph } from '../tokens/RelationshipGraph.js';

async function runTests() {
  console.log('\n======================================================');
  console.log('🤖 J.A.R.V.I.S. Cognitive Graph & Ingestion Test Suite');
  console.log('======================================================\n');

  const mockLLM = {
    async chat({ systemPrompt = '', userMessage = '' }) {
      // 1. Knowledge Graph Extraction Engine (Teacher Distillation)
      if (systemPrompt.includes('Knowledge Graph Extraction') || systemPrompt.includes('triples')) {
        if (userMessage.includes('I am from country India')) {
          return {
            text: JSON.stringify({
              triples: [{ subject: 'User', relation: 'from_country', object: 'India' }],
            }),
          };
        }
        if (userMessage.includes('Chennai is the capital of Tamil Nadu')) {
          return {
            text: JSON.stringify({
              triples: [{ subject: 'Tamil Nadu', relation: 'has_capital', object: 'Chennai' }],
            }),
          };
        }
        if (userMessage.toLowerCase().includes('capital of india') || userMessage.toLowerCase().includes('delhi')) {
          return {
            text: JSON.stringify({
              triples: [{ subject: 'India', relation: 'has_capital', object: 'Delhi' }],
            }),
          };
        }
        if (userMessage.toLowerCase().includes('abdul kalam')) {
          return {
            text: JSON.stringify({
              triples: [
                { subject: 'India', relation: 'president_from_2002_to_2007', object: 'Abdul Kalam' },
                { subject: 'Abdul Kalam', relation: 'president_of', object: 'India' },
              ],
            }),
          };
        }
        return { text: JSON.stringify({ triples: [] }) };
      }

      // 2. Intent Classification Engine
      if (systemPrompt.includes('Intent Classification')) {
        if (userMessage.toLowerCase().includes('abdul kalam') || userMessage.toLowerCase().includes('capital of india')) {
          return {
            text: JSON.stringify({
              type: 'search_query',
              taskCategory: 'discovery',
              requiresTools: true,
              targetTools: ['browser.search'],
              parameters: { query: userMessage },
              confidence: 0.95,
            }),
          };
        }
        return {
          text: JSON.stringify({
            type: 'general_conversation',
            taskCategory: 'chat',
            requiresTools: false,
            targetTools: [],
            parameters: {},
            confidence: 0.5,
          }),
        };
      }

      return { text: 'Understood, sir.' };
    },
  };

  const jarvis = buildJarvis({ llmManager: mockLLM });

  // ---------------------------------------------------------
  // TEST 1: Explicit Knowledge Learning (Tokens & Triples)
  // ---------------------------------------------------------
  console.log('--- TEST 1: Explicit Knowledge Learning ---');
  
  const ctx1 = await jarvis.handle({ utterance: 'Remember this: I am from country India' });
  console.log('User Input 1: "Remember this: I am from country India"');
  console.log('Response 1:', ctx1.response);
  
  const userToken = defaultTokenRegistry.lookup('User');
  const indiaToken = defaultTokenRegistry.lookup('India');
  assert.ok(userToken, 'User token should be registered');
  assert.ok(indiaToken, 'India token should be registered');
  assert.ok(defaultRelationshipGraph.hasEdge(userToken.id, 'from_country', indiaToken.id), 'User -> from_country -> India edge should exist');
  console.log('✅ Edge Verified: (User) ──[from_country]──► (India)\n');

  const ctx2 = await jarvis.handle({ utterance: 'Remember Chennai is the capital of Tamil Nadu' });
  console.log('User Input 2: "Remember Chennai is the capital of Tamil Nadu"');
  console.log('Response 2:', ctx2.response);

  const tnToken = defaultTokenRegistry.lookup('Tamil Nadu');
  const chennaiToken = defaultTokenRegistry.lookup('Chennai');
  assert.ok(tnToken, 'Tamil Nadu token should be registered');
  assert.ok(chennaiToken, 'Chennai token should be registered');
  assert.ok(defaultRelationshipGraph.hasEdge(tnToken.id, 'has_capital', chennaiToken.id), 'Tamil Nadu -> has_capital -> Chennai edge should exist');
  console.log('✅ Edge Verified: (Tamil Nadu) ──[has_capital]──► (Chennai)\n');

  // ---------------------------------------------------------
  // TEST 2: Multi-Variation Offline Resolution (0 LLM Tokens)
  // ---------------------------------------------------------
  console.log('--- TEST 2: Multi-Variation Offline Resolution (0 LLM API Tokens) ---');
  const variations = [
    'What is the capital of Tamil Nadu?',
    "What's Tamil Nadu's capital?",
    'Tamil Nadu capital?',
    "Tell me Tamil Nadu's capital city.",
    'Which city is the capital of Tamil Nadu?',
    'Name the capital of Tamil Nadu.',
    'Can you tell me the capital city of Tamil Nadu?',
  ];

  for (const q of variations) {
    const resCtx = await jarvis.handle({ utterance: q });
    console.log(`Query: "${q}"`);
    console.log(`  -> Offline Resolved: ${resCtx.offlineResolved}`);
    console.log(`  -> Answer: "${resCtx.response}"`);
    assert.strictEqual(resCtx.offlineResolved, true, `Query "${q}" should resolve offline`);
    assert.ok(resCtx.response.includes('Chennai'), `Response must contain Chennai`);
  }
  console.log('✅ All 7 Natural Language Variations Resolved Offline with 0 LLM Tokens!\n');

  // ---------------------------------------------------------
  // TEST 3: Epistemic Gap Discovery & Automatic Ingestion
  // ---------------------------------------------------------
  console.log('--- TEST 3: Epistemic Gap Discovery & Graph Mutation ---');
  console.log('Querying fact not yet in graph: "What is the capital of India?"');
  
  const gapCtx = await jarvis.handle({ utterance: 'What is the capital of India?' });
  console.log(`  -> Intent Type: ${gapCtx.intent.type}`);
  console.log(`  -> Tool Executed: ${gapCtx.toolResults?.[0]?.tool}`);
  console.log(`  -> Discovery Result: "${gapCtx.response}"`);
  
  assert.ok(gapCtx.toolResults?.some(t => t.tool === 'browser.search'), 'Should trigger browser.search tool for epistemic gap');
  
  // Verify that the discovered fact was ingested into the graph
  const delhiToken = defaultTokenRegistry.lookup('Delhi');
  assert.ok(delhiToken, 'Delhi token should be registered from discovery');
  assert.ok(defaultRelationshipGraph.hasEdge(indiaToken.id, 'has_capital', delhiToken.id), 'India -> has_capital -> Delhi edge should now exist in graph');
  console.log('✅ Discovery Ingested: (India) ──[has_capital]──► (Delhi)');

  // Subsequent query must now resolve offline without tools or LLM!
  const subsequentCtx = await jarvis.handle({ utterance: "India's capital city?" });
  console.log('Subsequent Query: "India\'s capital city?"');
  console.log(`  -> Offline Resolved: ${subsequentCtx.offlineResolved}`);
  console.log(`  -> Answer: "${subsequentCtx.response}"`);
  assert.strictEqual(subsequentCtx.offlineResolved, true, 'Subsequent query should resolve offline from graph');
  assert.ok(subsequentCtx.response.includes('Delhi'), 'Answer must contain Delhi');
  console.log('✅ Subsequent query resolved completely offline from newly learned graph!\n');

  // ---------------------------------------------------------
  // TEST 4: Bidirectional Response & Artifact Entity Harvesting
  // ---------------------------------------------------------
  console.log('--- TEST 4: Bidirectional Response Entity Harvesting ---');
  const mockTicketResponse = `### 📋 Ticket: Integrate AI into Leave Approval
1. Lifecycle Hook: Modify backend/src/services/leave.service.js beforeApproval hook.
2. Security: Validate via policyEngine and ABAC dynamic rules.`;

  const harvestCtx = {
    utterance: 'Draft leave AI ticket',
    response: mockTicketResponse,
    offlineResolved: false,
    toolResults: [],
    log: () => {},
  };

  await jarvis.stages.learningAnalyst.analyze(harvestCtx);

  const fileToken = defaultTokenRegistry.lookup('backend/src/services/leave.service.js');
  const hookToken = defaultTokenRegistry.lookup('beforeApproval');
  const engineToken = defaultTokenRegistry.lookup('policyEngine');
  const abacToken = defaultTokenRegistry.lookup('ABAC');

  assert.ok(fileToken, 'Code file token should be harvested from response');
  assert.ok(hookToken, 'Hook token should be harvested from response');
  assert.ok(engineToken, 'Engine token should be harvested from response');
  assert.ok(abacToken, 'ABAC token should be harvested from response');
  // ---------------------------------------------------------
  // TEST 5: Real-World Conversation Learning & Follow-up Query
  // ---------------------------------------------------------
  console.log('--- TEST 5: Conversational Learning & Follow-up Offline Resolution ---');
  console.log('Turn 1: User asks "what you know about abdul kalam"');
  
  const kalamCtx = await jarvis.handle({ utterance: 'what you know about abdul kalam' });
  console.log('Turn 1 Response:', kalamCtx.response);

  // Turn 2: Follow-up question about the exact fact just discussed
  console.log('\nTurn 2: User asks "who is india president from 2002 to 2007?"');
  const followUpCtx = await jarvis.handle({ utterance: 'who is india president from 2002 to 2007?' });
  console.log(`  -> Offline Resolved: ${followUpCtx.offlineResolved}`);
  console.log(`  -> Answer: "${followUpCtx.response}"`);
  
  assert.strictEqual(followUpCtx.offlineResolved, true, 'Follow-up query should resolve offline from newly absorbed graph fact');
  assert.ok(followUpCtx.response.includes('Abdul Kalam'), 'Answer must contain Abdul Kalam');
  console.log('✅ Follow-up historical query resolved completely offline with 0 LLM Tokens!\n');

  console.log('======================================================');
  console.log('🎉 ALL J.A.R.V.I.S. COGNITIVE GRAPH TESTS PASSED (100%)');
  console.log('======================================================\n');

  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
