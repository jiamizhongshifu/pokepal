import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { scenePieces } from '../../src/data/sceneLayers';
import { PATH_ART, STORY_BACKGROUNDS } from '../../src/data/sceneArt';
import { LAYER_AREA } from '../../src/island/islandLayers';

const RUN = 'run python3 scripts/art/vectorize.py';
test('every vector piece has its file and a box inside the picture; island pieces belong to an area', () => {
 for (const scene of ['island-map', 'learning-path'] as const) {
  const dir = `public/scenes/flat-v1/layers/${scene}`;
  for (const [name, b] of scenePieces(scene)) {
   assert.ok(existsSync(`${dir}/${name}.svg`), `${scene}/${name}.svg is missing: ${RUN} ${scene}`);
   assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= 100.5 && b.y + b.h <= 100.5 && b.w > 1, `${scene}/${name} sits outside the picture`);
   if (scene === 'island-map') assert.ok(LAYER_AREA[name], `${name} has no area in src/island/islandLayers.ts`);
  }
 }
});

test('every scene ground and background is a vector file', () => {
 for (const scene of ['island-map', ...PATH_ART]) assert.ok(existsSync(`public/scenes/flat-v1/layers/${scene}/base.svg`), `${scene} has no vector ground: ${RUN} ${scene}`);
 for (const bg of STORY_BACKGROUNDS) assert.ok(existsSync(`public/scenes/flat-v1/story-bg/${bg}.svg`), `${bg}: ${RUN} --whole ${bg}`);
 assert.ok(existsSync('public/scenes/flat-v1/world/diary-desk.svg'), `${RUN} --whole diary-desk`);
});

test('icons and props are vector files, and no screen asks for a painted bitmap of the scene art', async () => {
 const { ICON_ASSETS } = await import('../../src/icons/generated');
 // The app's home-screen icon (/icons/icon-512.png) stays a PNG: install prompts need one.
 for (const [name, url] of Object.entries(ICON_ASSETS).filter(([, u]) => u.startsWith('/scenes/'))) {
  assert.ok(url.endsWith('.svg'), `${name} points at ${url}: run python3 scripts/art/vectorize.py --assets icon prop and use the .svg`);
  assert.ok(existsSync(`public${url}`), `${name}: public${url} is missing (${RUN} --assets icon prop)`);
 }
 const { execFileSync } = await import('node:child_process');
 let hits = '';
 try { hits = execFileSync('git', ['grep', '-n', 'flat-v1[^\'"`]*\\.webp', '--', 'src', 'index.html'], { encoding: 'utf8' }).trim(); } catch { /* git grep exits 1 when nothing matches */ }
 assert.equal(hits, '', 'Scene art, props and icons are .svg; point at the vector file instead.');
});
