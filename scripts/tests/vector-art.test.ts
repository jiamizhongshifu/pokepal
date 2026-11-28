import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { scenePieces } from '../../src/data/sceneLayers';
import { PATH_ART, STORY_BACKGROUNDS } from '../../src/data/sceneArt';
import { LAYER_AREA } from '../../src/island/islandLayers';

const RUN = 'run python3 scripts/art/vectorize.py';
test('media: every vector piece has its file and a box inside the picture; island pieces belong to an area', () => {
 for (const scene of ['island-map', 'learning-path'] as const) {
  const dir = `public/scenes/flat-v1/layers/${scene}`;
  for (const [name, b] of scenePieces(scene)) {
   assert.ok(existsSync(`${dir}/${name}.svg`), `${scene}/${name}.svg is missing: ${RUN} ${scene}`);
   assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= 100.5 && b.y + b.h <= 100.5 && b.w > 1, `${scene}/${name} sits outside the picture`);
   if (scene === 'island-map') assert.ok(LAYER_AREA[name], `${name} has no area in src/island/islandLayers.ts`);
  }
 }
});

test('media: every scene ground and background is a vector file', () => {
 for (const scene of ['island-map', ...PATH_ART]) assert.ok(existsSync(`public/scenes/flat-v1/layers/${scene}/base.svg`), `${scene} has no vector ground: ${RUN} ${scene}`);
 for (const scene of ['island-map', ...PATH_ART]) for (const side of ['left', 'right']) assert.ok(existsSync(`public/scenes/flat-v1/layers/${scene}/side-${side}.svg`), `${scene} has no wide-screen ${side} side: ${RUN} --sides ${scene}`);
 for (const bg of STORY_BACKGROUNDS) assert.ok(existsSync(`public/scenes/flat-v1/story-bg/${bg}.svg`), `${bg}: ${RUN} --whole ${bg}`);
 assert.ok(existsSync('public/scenes/flat-v1/world/diary-desk.svg'), `${RUN} --whole diary-desk`);
});

test('media: icons, props and creatures are vector files, and no screen asks for a painted bitmap', async () => {
 const { ICON_ASSETS } = await import('../../src/icons/generated');
 // The app's home-screen icon (/icons/icon-512.png) stays a PNG: install prompts need one.
 for (const [name, url] of Object.entries(ICON_ASSETS).filter(([, u]) => u.startsWith('/scenes/'))) {
  assert.ok(url.endsWith('.svg'), `${name} points at ${url}: run python3 scripts/art/vectorize.py --assets icon prop and use the .svg`);
  assert.ok(existsSync(`public${url}`), `${name}: public${url} is missing (${RUN} --assets icon prop)`);
 }
 const { execFileSync } = await import('node:child_process');
 let hits = '';
 try { hits = execFileSync('git', ['grep', '-n', '\\.webp', '--', 'src', 'index.html'], { encoding: 'utf8' }).trim(); } catch { /* git grep exits 1 when nothing matches */ }
 assert.equal(hits, '', 'Scene art, props, icons and creatures are .svg; point at the vector file instead.');
 // Every creature picture the packager made (stages, avatars, baby expressions) has its vector twin.
 const sprites = JSON.parse(readFileSync('public/sprites/manifest.json', 'utf8')) as { sprites: Record<string, { stages: string[]; avatars: string[]; expressions: string[] }> };
 for (const e of Object.values(sprites.sprites)) for (const f of [...e.stages, ...e.avatars, ...e.expressions]) {
  const svg = `public/sprites/${f.replace(/\.webp$/, '.svg')}`;
  assert.ok(existsSync(svg), `${svg} is missing: ${RUN} --assets sprites`);
 }
});

test('no scene or picture is blurred: the art is vector and is extended, never smeared', async () => {
  const { readdirSync } = await import('node:fs');
  const files = (readdirSync('src', { recursive: true }) as string[]).filter(f => f.endsWith('.css')).map(f => `src/${f}`);
  // The story-adventure preview is a design sketch outside the product.
  const blurred = files.filter(f => f !== 'src/screens/story-adventure-preview.css' && /filter\s*:[^;}]*blur\(/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(blurred, [], 'To fill a screen of another shape, extend the scene: its flat sky and water colours above and below (sceneEdge), its painted continuation at the sides (SceneFill). See .scene-host in src/styles.css.');
});
