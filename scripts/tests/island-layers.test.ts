import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ISLAND_PIECES, LAYER_AREA } from '../../src/island/islandLayers';

test('every island piece has its vector file, an area, and a box inside the picture', () => {
 const dir = 'public/scenes/flat-v1/layers/island-map';
 assert.ok(existsSync(`${dir}/base.svg`), 'run python3 scripts/art/vectorize.py island-map');
 for (const [name, b] of ISLAND_PIECES) {
  assert.ok(existsSync(`${dir}/${name}.svg`), `${name}.svg is missing: run python3 scripts/art/vectorize.py island-map`);
  assert.ok(LAYER_AREA[name], `${name} has no area in src/island/islandLayers.ts`);
  assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= 100.5 && b.y + b.h <= 100.5 && b.w > 1, `${name} sits outside the picture`);
 }
});
