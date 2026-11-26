import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every setting a parent can keep changes something: it is read by the game itself, not only by the parent centre
 * that shows it and the check that loads it. A setting whose feature was removed (island narration once stayed as a
 * switch that did nothing) is taken out of Settings, the parent centre and saveValidation together.
 */
const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
});
const ONLY_SHOWS = ['src/types.ts', 'src/lib/saveValidation.ts', 'src/screens/Parent.tsx'];

test('every saved setting is used by the game, not only shown and validated', () => {
  const types = readFileSync('src/types.ts', 'utf8');
  const body = /export interface Settings \{([\s\S]*?)\n\}/.exec(types)![1];
  const keys = [...body.matchAll(/^\s+([a-zA-Z]+)\??:/gm)].map(m => m[1]);
  assert.ok(keys.length > 5, 'Settings keys were found');
  const sources = files('src').filter(path => !ONLY_SHOWS.includes(path)).map(path => readFileSync(path, 'utf8')).join('\n');
  const unused = keys.filter(key => !new RegExp(`\\b${key}\\b`).test(sources));
  assert.deepEqual(unused, [], 'Read this setting where it takes effect, or remove it from Settings, the parent centre and saveValidation.');
});
