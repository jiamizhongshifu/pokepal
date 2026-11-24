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
