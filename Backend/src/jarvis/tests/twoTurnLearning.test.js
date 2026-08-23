import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../../Config/ConnectDB.js';
import defaultJarvis from '../index.js';

async function testPythonLearning() {
  await connectDB();

  console.log('=== Test 1: Math Subtraction Execution (Checking 3 - 2 = 1) ===');
  const mathCtx = await defaultJarvis.handle({ userId: 'dev', utterance: 'what is 3 - 2' });
  console.log('Math Response:', mathCtx.response);
  console.log('Math Offline Matched:', mathCtx.offlineResolved ? '✓ YES (0 API TOKENS)' : '✗ NO');

  console.log('\n=== Test 2: Teaching Python Print Output ===');
  console.log('Turn A: Asking "in python what will be the output print(\\"Hello World\\")"');
  const pyCtx1 = await defaultJarvis.handle({
    userId: 'dev',
    utterance: 'in python what will be the output print("Hello World")',
  });
  console.log('Turn A Response:', pyCtx1.response);
  console.log('Turn A Offline Matched:', pyCtx1.offlineResolved ? 'YES' : 'NO (Used LLM Teacher)');

  console.log('\nTurn B: Asking "in python what will be the output print(\\"Workhub ERP\\")" (Should be OFFLINE)');
  const pyCtx2 = await defaultJarvis.handle({
    userId: 'dev',
    utterance: 'in python what will be the output print("Workhub ERP")',
  });
  console.log('Turn B Response:', pyCtx2.response);
  console.log('Turn B Offline Matched:', pyCtx2.offlineResolved ? '✓ YES (0 API TOKENS)' : '✗ NO');
  console.log('Turn B Matched Template:', pyCtx2.intent?.matchedTemplate);
  console.log('Turn B Extracted Params:', pyCtx2.intent?.parameters);
}

testPythonLearning()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  });
