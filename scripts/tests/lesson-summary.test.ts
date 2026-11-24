import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonSummary, sittingMinutes } from '../../src/lib/lessonSummary';

const at = (min: number) => min * 60000;

test('a first visit shows new words, first-try finds and the time played', () => {
  assert.deepEqual(lessonSummary({ words: 3, fresh: true, right: 4, total: 5, startedAt: 0, endedAt: at(2) }).map(i => [i.label, i.value]), [['新认识', '3 个词'], ['一次找对', '4 / 5'], ['玩了', '2 分钟']]);
});

test('a repeat visit is named as practice, and a listening-only sitting has no finds to count', () => {
  assert.deepEqual(lessonSummary({ words: 3, fresh: false, right: 0, total: 0, startedAt: 0, endedAt: at(4) }).map(i => [i.label, i.value]), [['又练了', '3 个词'], ['玩了', '4 分钟']]);
});

test('time is whole minutes and never less than one', () => {
  assert.equal(sittingMinutes(0, 20000), 1);
  assert.equal(sittingMinutes(0, at(2.6)), 3);
});

test('nothing in the summary is a percentage', () => {
  assert.ok(lessonSummary({ words: 4, fresh: true, right: 2, total: 6, startedAt: 0, endedAt: at(5) }).every(i => !i.value.includes('%')));
});
