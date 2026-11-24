import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moodExpression } from '../../src/lib/answerMood';

test('the buddy cheers for a find, thinks along on a try-again and keeps its usual pose otherwise', () => {
  assert.equal(moodExpression('good'), 'cheer');
  assert.equal(moodExpression('again'), 'thinking');
  assert.equal(moodExpression('idle'), null);
});
