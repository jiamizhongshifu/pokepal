import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * One motion language: every transition and animation reads its curve from src/brand-tokens.css (--ease-*), and
 * anything shorter than 600ms reads its duration there too (--motion-press / quick / base / move / reward). Slow
 * loops and walks (600ms and longer) may name their own length, never their own curve.
 */
const EXEMPT = new Set(['src/brand-tokens.css', 'src/screens/story-adventure-preview.css']);
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : name.endsWith('.css') ? [path] : [];
  });
}
const TOKENS = new Set([...readFileSync('src/brand-tokens.css', 'utf8').matchAll(/--((?:motion|ease)-[a-z]+)\s*:/g)].map(m => m[1]));
const seconds = (t: string) => t.endsWith('ms') ? parseFloat(t) / 1000 : parseFloat(t);

test('transitions and animations use the motion tokens', () => {
  const wrong: string[] = [];
  for (const path of files('src')) {
    if (EXEMPT.has(path)) continue;
    const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [bad] of css.matchAll(/var\(--[\w-]*var\(/g)) wrong.push(`${path}: broken variable ${bad}`);
    for (const [name] of css.matchAll(/var\(--(?:motion|ease)-[a-z]+\)/g)) if (!TOKENS.has(name.slice(6, -1))) wrong.push(`${path}: unknown ${name}`);
    // Each item of a transition or animation shorthand that has a duration also names its curve (no browser default).
    for (const [, value] of css.matchAll(/(?:transition|animation)\s*:([^;{}]*)/g))
      for (const part of value.split(/,(?![^(]*\))/))
        if (/var\(--(?:brand-)?motion-|\d\s*m?s\b/.test(part) && !/var\(--ease-[a-z]+\)|\blinear\b|steps\(/.test(part)) wrong.push(`${path}: ${part.trim()} (no curve)`);
    for (const [decl, prop, value] of css.matchAll(/(transition|animation)(?:-duration|-timing-function)?\s*:([^;{}]*)/g)) {
      void prop;
      if (/cubic-bezier\(|\bease(?:-in|-out|-in-out)?\b/.test(value.replace(/var\(--ease-[a-z]+\)/g, ''))) wrong.push(`${path}: ${decl.trim()} (curve)`);
      for (const t of value.replace(/var\([^)]*\)/g, '').match(/(?<![\w.-])\d*\.?\d+m?s\b/g) ?? []) {
        const s = seconds(t);
        if (s > 0.001 && s < 0.6) wrong.push(`${path}: ${decl.trim()} (${t})`);
      }
    }
  }
  assert.deepEqual(wrong, [], 'Use var(--ease-standard | exit | spring | breathe) and var(--motion-press | quick | base | move | reward) from src/brand-tokens.css; only loops and walks of 600ms or more may give their own length.');
});
