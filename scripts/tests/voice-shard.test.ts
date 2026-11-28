import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceShard } from '../../src/lib/voiceShard.js';

test('voice keys retain their published index locations', () => {
  assert.equal(voiceShard('en|Hello!'), 49);
  assert.equal(voiceShard('zh|你好'), 50);
  assert.equal(voiceShard('en~slow|Hello!'), 124);
  assert.equal(voiceShard('zh|🌴'), 17);
});
