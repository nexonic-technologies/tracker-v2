import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../../Config/ConnectDB.js';
import defaultJarvis from '../index.js';

async function testMath() {
  await connectDB();

  console.log('--- Testing J.A.R.V.I.S. Math Operations ---');

  const testCases = [
    { utterance: 'what is 99 + 1', expected: 100 },
    { utterance: 'what is 99 - 1', expected: 98 },
    { utterance: 'what is 10 - 2', expected: 8 },
    { utterance: 'what is 20 * 4', expected: 80 },
    { utterance: 'what is 100 / 5', expected: 20 },
  ];

  for (const tc of testCases) {
    console.log(`\nInput: "${tc.utterance}"`);
    const ctx = await defaultJarvis.handle({ userId: 'dev', utterance: tc.utterance });
    console.log('Response:', ctx.response);
    console.log('Offline Matched:', ctx.offlineResolved ? '✓ YES (0 API TOKENS)' : '✗ NO (Used LLM)');
  }
}

testMath()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
