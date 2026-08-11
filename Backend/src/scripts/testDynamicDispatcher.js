// src/scripts/testDynamicDispatcher.js
import { encrypt, decrypt } from '../utils/cryptoHelper.js';

console.log('🧪 Running Dynamic Notification Dispatcher Dry Run Tests...');

// 1. Test Crypto Helper
try {
  const secretKey = '{"private_key": "test_private_key_data", "client_email": "test@fcm.iam.gserviceaccount.com"}';
  const encrypted = encrypt(secretKey);
  const decrypted = decrypt(encrypted);

  if (decrypted === secretKey) {
    console.log('✅ CryptoHelper Encryption/Decryption: PASS');
  } else {
    console.error('❌ CryptoHelper Encryption/Decryption: FAIL (Mismatched result)');
  }
} catch (e) {
  console.error('❌ CryptoHelper Encryption/Decryption: FAIL with error:', e.message);
}

// 2. Test Template Variables Interpolation Function
function getPathValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function interpolateTemplate(template, context) {
  if (!template) return '';
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const resolvedVal = getPathValue(context, path.trim());
    return resolvedVal !== undefined && resolvedVal !== null ? resolvedVal.toString() : '';
  });
}

try {
  const template = 'Hello {{actor.basicInfo.firstName}}, task "{{new.title}}" changed status from {{old.status}} to {{new.status}} on {{date}}.';
  const context = {
    new: { title: 'Fix Auth Bugs', status: 'In Progress' },
    old: { status: 'Pending' },
    actor: { basicInfo: { firstName: 'Arun' } },
    date: '2026-07-12'
  };

  const output = interpolateTemplate(template, context);
  const expected = 'Hello Arun, task "Fix Auth Bugs" changed status from Pending to In Progress on 2026-07-12.';

  if (output === expected) {
    console.log('✅ Template Interpolator: PASS');
  } else {
    console.error('❌ Template Interpolator: FAIL\nExpected:', expected, '\nGot:', output);
  }
} catch (e) {
  console.error('❌ Template Interpolator: FAIL with error:', e.message);
}

// 3. Test Condition Operator Evaluator Logic
function evaluateCondition(cond, doc, beforeSnapshot, trigger) {
  const { field, operator, value } = cond;
  const newValue = getPathValue(doc, field);

  switch (operator) {
    case 'equals':
      return newValue?.toString() === value?.toString();
    case 'not_equals':
      return newValue?.toString() !== value?.toString();
    case 'changed':
      if (trigger !== 'update') return false;
      const getOldValue = (f, d, s) => (s && Object.prototype.hasOwnProperty.call(s, f) ? s[f] : getPathValue(d, f));
      const oldValue = getOldValue(field, doc, beforeSnapshot);
      return oldValue?.toString() !== newValue?.toString();
    case 'exists':
      return newValue !== undefined && newValue !== null;
    case 'contains':
      return Array.isArray(newValue) && newValue.map(x => x?.toString()).includes(value?.toString());
    case 'in':
      return Array.isArray(value) && value.map(x => x?.toString()).includes(newValue?.toString());
    case 'gt':
      return Number(newValue) > Number(value);
    case 'gte':
      return Number(newValue) >= Number(value);
    case 'lt':
      return Number(newValue) < Number(value);
    case 'lte':
      return Number(newValue) <= Number(value);
    case 'regex':
      return new RegExp(value, 'i').test(newValue?.toString());
    default:
      return false;
  }
}

try {
  const doc = { status: 'In Progress', priority: 5, assignedTo: ['user1', 'user2'] };
  const beforeSnapshot = { status: 'Pending' };

  const tests = [
    { cond: { field: 'status', operator: 'changed' }, trigger: 'update', expected: true },
    { cond: { field: 'status', operator: 'equals', value: 'In Progress' }, trigger: 'update', expected: true },
    { cond: { field: 'priority', operator: 'gt', value: 3 }, trigger: 'create', expected: true },
    { cond: { field: 'assignedTo', operator: 'contains', value: 'user2' }, trigger: 'create', expected: true },
    { cond: { field: 'status', operator: 'in', value: ['In Progress', 'Completed'] }, trigger: 'create', expected: true }
  ];

  let passed = true;
  tests.forEach((t, idx) => {
    const result = evaluateCondition(t.cond, doc, beforeSnapshot, t.trigger);
    if (result !== t.expected) {
      console.error(`❌ Operator Test ${idx + 1} (${t.cond.operator}): FAIL (Expected ${t.expected}, Got ${result})`);
      passed = false;
    }
  });

  if (passed) {
    console.log('✅ Operator Evaluation Rules: PASS');
  }
} catch (e) {
  console.error('❌ Operator Evaluation Rules: FAIL with error:', e.message);
}

console.log('🏁 Dry run tests completed.');
