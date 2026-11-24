import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every variable in src/brand-tokens.css is used somewhere, so the palette never collects names nobody reads.
 * RESERVED lists the few that the design system documents for new pages before any page uses them.
 */
const RESERVED = new Set(['space-1', 'space-3', 'space-4', 'space-5', 'space-6', 'space-7', 'brand-gem-ink', 'brand-streak-ink', 'brand-success', 'brand-radius-card', 'brand-radius-sheet']);
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(css|tsx?)$/.test(name) ? [path] : [];
  });
}

test('every token is used or reserved for new pages', () => {
  const tokens = readFileSync('src/brand-tokens.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const names = [...new Set([...tokens.matchAll(/--([\w-]+)\s*:/g)].map(m => m[1]))];
  const source = files('src').map(f => readFileSync(f, 'utf8')).join('\n');
  const unused = names.filter(n => !RESERVED.has(n) && !new RegExp(`var\\(--${n}[),\\s]|['"]--${n}['"]`).test(source));
  assert.deepEqual(unused, [], 'Use the token or delete it from src/brand-tokens.css (and the design system); a token kept for new pages goes into RESERVED here.');
  const stale = [...RESERVED].filter(n => !names.includes(n));
  assert.deepEqual(stale, [], 'RESERVED names a token that no longer exists.');
});
