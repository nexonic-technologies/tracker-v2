import { IntentClassifier } from '../stages/IntentClassifier.js';

async function runTest() {
  console.log('--- Testing J.A.R.V.I.S. Parametric Slot Matching ---');
  const classifier = new IntentClassifier();

  // Test 1: Match "what is {a:number} + {b:number}" against "what is 2 + 3"
  const template1 = 'what is {a:number} + {b:number}';
  const utterance1 = 'what is 2 + 3';
  const extracted1 = classifier._matchTemplate(template1, utterance1);
  console.log(`[Test 1] Template: "${template1}" | Utterance: "${utterance1}"`);
  console.log('Result:', extracted1);
  if (extracted1?.a === 2 && extracted1?.b === 3) {
    console.log('✓ PASS: Exactly extracted numeric variables offline without LLM!');
  } else {
    console.error('✗ FAIL');
    process.exit(1);
  }

  // Test 2: Match "apply {type:string} leave for {days:number} days" against "apply sick leave for 5 days"
  const template2 = 'apply {type:string} leave for {days:number} days';
  const utterance2 = 'apply sick leave for 5 days';
  const extracted2 = classifier._matchTemplate(template2, utterance2);
  console.log(`\n[Test 2] Template: "${template2}" | Utterance: "${utterance2}"`);
  console.log('Result:', extracted2);
  if (extracted2?.type === 'sick' && extracted2?.days === 5) {
    console.log('✓ PASS: Exactly extracted typed HRMS variables offline without LLM!');
  } else {
    console.error('✗ FAIL');
    process.exit(1);
  }

  console.log('\n✓ ALL PARAMETRIC OFFLINE MATCHING TESTS PASSED (0 API TOKENS)!');
}

runTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
