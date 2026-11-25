import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { GUIDES } from '../../src/data/onboarding';

/**
 * Words the interface keeps the same everywhere (design system README, 内容与语气). Grown-ups' text calls the child
 * 孩子; the two places are 学习路线 and 我的小岛 and the first page is the start page; a tap is 点. Code comments and the
 * names analytics events are filed under are not interface text.
 */
const BANNED: [word: string, instead: string][] = [['宝宝', '孩子'], ['岛屿', '小岛 / 我的小岛'], ['首页', '开始页 / 学习路线'], ['点击', '点']];
/** Not interface text: a creature's growth tier is called 宝宝 (a baby creature); analytics names the welcome screen 首页. */
const EXEMPT: Record<string, string[]> = { 'src/data/creatures.ts': ['宝宝'], 'src/lib/analyticsPolicy.ts': ['首页'] };

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}
const withoutComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

test('interface text uses the agreed words for the child, the places and a tap', () => {
  const found: string[] = [];
  for (const path of sources('src')) {
    const code = withoutComments(readFileSync(path, 'utf8'));
    for (const [word, instead] of BANNED) if (code.includes(word) && !EXEMPT[path]?.includes(word)) found.push(`${path}: “${word}” → ${instead}`);
  }
  assert.deepEqual(found, []);
});

test('help never tells a child an answer was wrong', () => {
  // 不错 (well done) is praise, not a verdict.
  const wrong = Object.entries(GUIDES).filter(([, g]) => /错/.test(`${g.title}${g.voice}`.replace(/不错/g, ''))).map(([id, g]) => `${id}: ${g.voice}`);
  assert.deepEqual(wrong, [], 'Say what to try next instead (没找到也没关系，再试一次就好).');
});
