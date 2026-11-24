import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextStreak, streakLabel, STREAK_SHOWN_FROM } from '../../src/lib/roundStreak';

test('a run grows on first-try answers and a miss quietly ends it', () => {
  let s = 0;
  for (const ok of [true, true, true]) s = nextStreak(s, ok);
  assert.equal(s, 3);
  assert.equal(nextStreak(s, false), 0);
  assert.equal(nextStreak(0, true), 1);
});

test('the run is only named once it is worth celebrating', () => {
  assert.equal(streakLabel(STREAK_SHOWN_FROM - 1), null);
  assert.equal(streakLabel(0), null);
  assert.equal(streakLabel(3), '连着找对 3 个');
  assert.equal(streakLabel(5), '连着找对 5 个');
});
