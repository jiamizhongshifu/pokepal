import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Brand colours live only in src/brand-tokens.css; screens read the variables so a palette fix reaches every page.
const RETIRED = /#(58cc02|58a700|3f9a00|89e219|777777|7a8a86|6d8b7e)\b|rgba\(88,\s*204,\s*2\b/i;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(css|tsx?)$/.test(name) ? [path] : [];
  });
}

test('screens use brand variables instead of retired low-contrast colours', () => {
  const offenders = files('src').filter(path => !path.endsWith('brand-tokens.css')).flatMap(path => readFileSync(path, 'utf8').split('\n').flatMap((line, i) => RETIRED.test(line) ? [`${path}:${i + 1}`] : []));
  assert.deepEqual(offenders, [], 'Replace these with var(--brand-primary), var(--brand-primary-deep), or var(--muted) from src/brand-tokens.css');
});
