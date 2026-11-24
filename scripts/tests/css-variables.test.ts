import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** A style that reads a variable nobody defines silently falls back (the slider turned browser blue); every var() must exist. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(css|tsx?)$/.test(name) ? [path] : [];
  });
}

test('every CSS variable that is read is defined somewhere', () => {
  const all = files('src').map(f => [f, readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')] as const);
  const defined = new Set(all.flatMap(([, s]) => [...s.matchAll(/(?:^|[;{\s(,])--([\w-]+)\s*:|['"]--([\w-]+)['"]/g)].map(m => m[1] ?? m[2])));
  const missing: string[] = [];
  for (const [f, s] of all) for (const [, name, fallback] of s.matchAll(/var\(--([\w-]+)\s*(,)?/g)) if (!defined.has(name) && !fallback) missing.push(`${f}: --${name}`);
  assert.deepEqual([...new Set(missing)], [], 'Define the variable (src/brand-tokens.css for shared ones) or read an existing token.');
});
