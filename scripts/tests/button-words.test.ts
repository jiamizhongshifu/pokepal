import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** A button's words say where it goes: one that says "回小岛" must open the island, not the learning path. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : name.endsWith('.tsx') ? [path] : [];
  });
}

test('buttons that say they go to the island open the island', () => {
  const wrong: string[] = [];
  for (const path of files('src')) {
    const source = readFileSync(path, 'utf8');
    for (const [button, handler, words] of source.matchAll(/<button\b[^>]*?onClick=\{([^}]*\}?\)?)\}[^>]*>((?:(?!<\/button>)[\s\S]){0,240})<\/button>/g)) {
      if (!/回小岛|去小岛|回到小岛/.test(words) || !/go\(\{\s*name:\s*['"]home['"]/.test(handler)) continue;
      if (!/view:\s*['"]island['"]|station|companion/.test(handler)) wrong.push(`${path}: ${button.slice(0, 120)}`);
    }
  }
  assert.deepEqual(wrong, [], "A button that says 回小岛 must go to { name: 'home', view: 'island' } (or a station or companion on it); { name: 'home' } alone is the learning path.");
});

test('handing "leave" to a child page that labels it 回小岛 opens the island', () => {
  // GuidedDiary's 回小岛 button calls the onLeave it is given, so the place is decided where onLeave is passed.
  assert.match(readFileSync('src/components/GuidedDiary.tsx', 'utf8'), /onClick=\{onLeave\}>回小岛/);
  const wrong = files('src').flatMap(path => [...readFileSync(path, 'utf8').matchAll(/onLeave=\{([^}]*\}?\)?)\}/g)]
    .filter(([, handler]) => /go\(\{\s*name:\s*['"]home['"]/.test(handler) && !/view:\s*['"]island['"]/.test(handler)).map(([m]) => `${path}: ${m}`));
  assert.deepEqual(wrong, [], "onLeave leads to a 回小岛 button: pass go({ name: 'home', view: 'island' }).");
});
