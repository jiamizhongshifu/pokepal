import test from 'node:test';
import assert from 'node:assert/strict';
import { newSave, prepareForPlay, rollover } from '../../src/lib/saveLifecycle';
import { validateSave } from '../../src/lib/saveValidation';
import { todayStr } from '../../src/lib/date';

test('independent new islands have independent settings and task progress', () => {
  const a = newSave(), b = newSave();
  a.settings.favorites.length = 0;
  a.daily.boardDone[0] = true;
  assert.deepEqual(b.settings.favorites, [1001]);
  assert.deepEqual(b.daily.boardDone, [false, false, false, false]);
});

test('opening a previous day archives it once and preserves historical completed tasks', () => {
  const raw = newSave();
  raw.daily.date = '2020-01-01';
  raw.daily.board.pop();
  raw.daily.boardDone = [true, false, true];
  raw.daily.tasksCompleted = 2;
  raw.daily.words = ['letter:A', 'apple'];
  const copy = structuredClone(raw);
  const loaded = validateSave(raw);
  prepareForPlay(loaded);
  assert.equal(loaded.history.length, 1);
  assert.equal(loaded.history[0].tasksCompleted, 2);
  assert.equal(loaded.history[0].words, 1);
  assert.equal(loaded.daily.date, todayStr());
  const before = structuredClone(loaded);
  rollover(loaded);
  assert.deepEqual(loaded, before);
  assert.deepEqual(raw, copy);
});
