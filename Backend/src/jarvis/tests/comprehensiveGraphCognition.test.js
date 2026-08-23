import assert from 'assert';
import { buildJarvis } from '../index.js';
import { defaultTokenRegistry } from '../tokens/TokenRegistry.js';
import { defaultRelationshipGraph } from '../tokens/RelationshipGraph.js';

async function testComprehensiveCognition() {
  console.log('\n=================================================================');
  console.log('🤖 J.A.R.V.I.S. Comprehensive Multi-Entity Dynamic Graph Test');
  console.log('=================================================================\n');

  const mockLLM = {
    async chat() {
      return { text: 'fallback_llm_should_not_be_called' };
    },
  };

  const jarvis = buildJarvis({ llmManager: mockLLM });

  // -------------------------------------------------------------
  // Test Entity 1: Nayanthara (Title: Lady Superstar, Awards: Filmfare & Nandi)
  // -------------------------------------------------------------
  const tNayan = defaultTokenRegistry.register({ canonical: 'Nayanthara', type: 'entity' });
  const tLadySuperstar = defaultTokenRegistry.register({ canonical: 'Lady Superstar', type: 'concept' });
  const tNayanFilmfare = defaultTokenRegistry.register({ canonical: 'five Filmfare Awards South', type: 'entity' });
  const tNayanNandi = defaultTokenRegistry.register({ canonical: 'Nandi Award for Sri Rama Rajyam', type: 'entity' });
  const tNayanBirth = defaultTokenRegistry.register({ canonical: '1984', type: 'entity' });

  const tTitle = defaultTokenRegistry.register({ canonical: 'title', type: 'relation' });
  const tNickname = defaultTokenRegistry.register({ canonical: 'nickname', type: 'relation' });
  defaultRelationshipGraph.add(tTitle.id, 'same_as', tNickname.id);

  defaultRelationshipGraph.add(tNayan.id, 'nickname', tLadySuperstar.id);
  defaultRelationshipGraph.add(tNayan.id, 'won_award', tNayanFilmfare.id);
  defaultRelationshipGraph.add(tNayan.id, 'won_award', tNayanNandi.id);
  defaultRelationshipGraph.add(tNayan.id, 'birth_year', tNayanBirth.id);

  // -------------------------------------------------------------
  // Test Entity 2: Anirudh Ravichander (Music Composer, Debut: 3, Song: Why This Kolaveri Di)
  // -------------------------------------------------------------
  const tAnirudh = defaultTokenRegistry.register({ canonical: 'Anirudh Ravichander', type: 'entity' });
  const tMusicDir = defaultTokenRegistry.register({ canonical: 'music composer and playback singer', type: 'concept' });
  const tDebutFilm = defaultTokenRegistry.register({ canonical: '3 (2012 film)', type: 'entity' });
  const tHitSong = defaultTokenRegistry.register({ canonical: 'Why This Kolaveri Di', type: 'entity' });

  defaultRelationshipGraph.add(tAnirudh.id, 'occupation', tMusicDir.id);
  defaultRelationshipGraph.add(tAnirudh.id, 'debut_film', tDebutFilm.id);
  defaultRelationshipGraph.add(tAnirudh.id, 'composed_song', tHitSong.id);

  console.log('--- TEST 1: Forward Query with Synonym Relation (Title / Nickname) ---');
  const q1 = 'what title nayanthara earned?';
  const r1 = await jarvis.handle({ utterance: q1 });
  console.log(`Query: "${q1}"`);
  console.log('  -> Offline Resolved:', r1.offlineResolved);
  console.log('  -> Response:', r1.response);
  assert.strictEqual(r1.offlineResolved, true, 'Should resolve offline from graph');
  assert.ok(r1.response.includes('Lady Superstar'), 'Should answer Lady Superstar');

  console.log('\n--- TEST 2: Reverse Query ("Who is called X?") ---');
  const q2 = 'who is called Lady Superstar?';
  const r2 = await jarvis.handle({ utterance: q2 });
  console.log(`Query: "${q2}"`);
  console.log('  -> Offline Resolved:', r2.offlineResolved);
  console.log('  -> Response:', r2.response);
  assert.strictEqual(r2.offlineResolved, true, 'Should resolve reverse query offline');
  assert.ok(r2.response.includes('Nayanthara'), 'Should identify Nayanthara as Lady Superstar');

  console.log('\n--- TEST 3: Multi-Target Award Disambiguation ---');
  const q3a = 'did nayanthara win nandi award?';
  const r3a = await jarvis.handle({ utterance: q3a });
  console.log(`Query: "${q3a}"`);
  console.log('  -> Offline Resolved:', r3a.offlineResolved);
  console.log('  -> Response:', r3a.response);
  assert.strictEqual(r3a.offlineResolved, true, 'Should resolve Nandi award query');
  assert.ok(r3a.response.includes('Nandi Award for Sri Rama Rajyam'));

  const q3b = 'how many filmfare awards did nayanthara win?';
  const r3b = await jarvis.handle({ utterance: q3b });
  console.log(`Query: "${q3b}"`);
  console.log('  -> Offline Resolved:', r3b.offlineResolved);
  console.log('  -> Response:', r3b.response);
  assert.strictEqual(r3b.offlineResolved, true, 'Should resolve Filmfare award query');
  assert.ok(r3b.response.includes('five Filmfare Awards South'));

  console.log('\n--- TEST 4: Fuzzy Spelling Entity Matching ("anirudh ravichander" vs "anirudh ravichandran") ---');
  const q4 = 'what is the debut film of anirudh ravichandran?';
  const r4 = await jarvis.handle({ utterance: q4 });
  console.log(`Query: "${q4}"`);
  console.log('  -> Offline Resolved:', r4.offlineResolved);
  console.log('  -> Response:', r4.response);
  assert.strictEqual(r4.offlineResolved, true, 'Should resolve fuzzy multi-word token offline');
  assert.ok(r4.response.includes('3 (2012 film)'));

  console.log('\n--- TEST 5: Reverse Property Query on Composer ("Who composed Why This Kolaveri Di?") ---');
  const q5 = 'who composed Why This Kolaveri Di?';
  const r5 = await jarvis.handle({ utterance: q5 });
  console.log(`Query: "${q5}"`);
  console.log('  -> Offline Resolved:', r5.offlineResolved);
  console.log('  -> Response:', r5.response);
  assert.strictEqual(r5.offlineResolved, true, 'Should resolve reverse composition query');
  assert.ok(r5.response.includes('Anirudh Ravichander'));

  console.log('\n=================================================================');
  console.log('🎉 ALL COMPREHENSIVE MULTI-ENTITY GRAPH TESTS PASSED (100% OFFLINE)!');
  console.log('=================================================================\n');
}

testComprehensiveCognition()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
