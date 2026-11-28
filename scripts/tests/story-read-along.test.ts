import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STORIES } from '../../src/data/stories';
import { allStoryEditions } from '../../src/data/storyLevels';
import { alignTiming, storyLineWords, storyTokens, storyWordGloss, storyWordVoice, wordAt, type RawTiming } from '../../src/lib/storyWords';
import { voiceKey } from '../../src/lib/voiceKey';

const pages = allStoryEditions(STORIES).flatMap(s => s.pages);

test('tokens rebuild every story sentence exactly and number only real words', () => {
 for (const { en } of pages) {
  const tokens = storyTokens(en);
  assert.equal(tokens.map(t => t.text).join(''), en);
  assert.deepEqual(tokens.flatMap(t => t.index === undefined ? [] : [t.index]), storyLineWords(en).map((_, i) => i));
 }
 assert.deepEqual(storyLineWords('Let’s wash them first.'), ["let's", 'wash', 'them', 'first']);
});

test('every word a child can tap has a Chinese meaning and a single-word recording text', () => {
 const missing = new Set(pages.flatMap(p => storyLineWords(p.en)).filter(w => !storyWordGloss(w)));
 assert.deepEqual([...missing], []);
 assert.equal(storyWordVoice('berry'), 'Berry');
 assert.equal(storyWordVoice("bubbo's"), "Bubbo's");
 assert.equal(storyWordVoice('i'), 'I');
 assert.equal(storyWordGloss('turn'), '轮到');
});

test('provider pieces merge onto contractions; any mismatch disables highlighting', () => {
 const raw: RawTiming = { w: ['Yes,', 'but', 'dirty.', 'Let’', 's', 'wash'], t: [0.36, 0.9, 1.2, 2.86, 2.9, 2.96], end: 3.2 };
 assert.deepEqual(alignTiming(raw, 'Yes, but dirty. Let’s wash'), { w: ['yes', 'but', 'dirty', "let's", 'wash'], t: [0.36, 0.9, 1.2, 2.86, 2.96], end: 3.2 });
 assert.equal(alignTiming(raw, 'Yes, but dirty. Let’s go'), undefined);
 assert.equal(alignTiming({ ...raw, w: [...raw.w, 'extra'], t: [...raw.t, 3.1] }, 'Yes, but dirty. Let’s wash'), undefined);
 assert.equal(alignTiming({ ...raw, t: [0.36, 0.2, 1.2, 2.86, 2.9, 2.96] }, 'Yes, but dirty. Let’s wash'), undefined);
 assert.equal(alignTiming(undefined, 'Yes'), undefined);
});

test('a word stays lit from its start until the next word; nothing is lit in leading silence or after the end', () => {
 const timing = { w: ['a', 'red', 'apple'], t: [0.4, 0.8, 1.1], end: 1.6 };
 assert.deepEqual([0, 0.39, 0.4, 0.79, 0.8, 1.2, 1.59, 1.6].map(s => wordAt(timing, s)), [-1, -1, 0, 0, 1, 2, 2, -1]);
});

test('media: every picture-book sentence has aligned word timings at both paces in the local voice pack', () => {
 const timings = JSON.parse(readFileSync('public/voice/timings.json', 'utf8')) as Record<string, RawTiming>;
 const manifest = JSON.parse(readFileSync('public/voice/manifest.json', 'utf8')) as Record<string, string>;
 for (const { en } of pages) for (const pace of ['normal', 'slow'] as const) {
  const key = voiceKey('en', en, pace);
  assert.ok(manifest[key], key);
  assert.ok(alignTiming(timings[key], en), `timing ${key}`);
 }
 for (const word of new Set(pages.flatMap(p => storyLineWords(p.en)))) assert.ok(manifest[voiceKey('en', storyWordVoice(word))], word);
});
