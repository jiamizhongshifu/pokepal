#!/usr/bin/env node
/**
 * 把审过的小精灵美术整理成游戏素材：public/sprites/<id>/
 *   stage-<n>.webp      每个阶段的立绘：裁掉透明边后按统一边距放进 1024 方图（大小不再随生成构图漂移）
 *   avatar-<n>.webp     每个阶段的 256px 头像
 *   expr-<k>.webp       宝宝期 8 个表情（从 4x2 表情表切出，顺序同 generate.mjs 的 EXPRESSIONS）
 *   public/sprites/manifest.json  文件清单
 * 以及场景：public/scenes/flat-v1/<group>/<id>.webp（world 世界插画、story-bg 绘本背景、prop 透明底道具、icon 界面图标、app 应用图标，另写 public/icons/icon-192/512.png）与 manifest.json
 * 用法：node scripts/art/package.mjs
 * 依赖 ImageMagick。public/sprites/ 与 public/scenes/ 属于本地媒体，不入库（见 .gitignore 与 OPEN_SOURCE.md）。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPRESSION_KEYS } from './expressions.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const sprites = JSON.parse(readFileSync(resolve(root, 'src/data/creatures.json'), 'utf8'));
const source = resolve(root, 'output/rebrand/sprites');
const target = resolve(root, 'public/sprites');
const magick = (...args) => execFileSync('magick', args, { encoding: 'utf8' }).trim();

/** Crop to the clearly visible art (alpha above 8%; generated PNGs carry faint near-transparent specks that defeat a plain trim), then fit it into a square with the same relative padding for every sprite. */
const fit = (input, output, size, fill = 0.86) => {
 const inner = Math.round(size * fill);
 const box = magick(input, '-alpha', 'extract', '-threshold', '8%', '-format', '%@', 'info:');
 magick(input, '-crop', box, '+repage', '-resize', `${inner}x${inner}`, '-background', 'none', '-gravity', 'center', '-extent', `${size}x${size}`, '-define', 'webp:lossless=false', '-quality', '90', output);
};
/** Mean alpha of each column (axis 'x') or row (axis 'y') of an image region. */
const profile = (input, axis, crop) => {
 const size = axis === 'x' ? `${crop.w}x1!` : `1x${crop.h}!`;
 return magick(input, '-crop', `${crop.w}x${crop.h}+${crop.x}+${crop.y}`, '+repage', '-alpha', 'extract', '-filter', 'box', '-resize', size, '-depth', '8', 'txt:-')
  .split('\n').slice(1).map(line => Number(/gray\((\d+(?:\.\d+)?)/.exec(line)?.[1] ?? /\((\d+)/.exec(line)?.[1] ?? 0));
};
/** Cut where the art is emptiest near each expected grid line, so uneven grids are split between poses, not through them. */
const cuts = (values, parts) => Array.from({ length: parts - 1 }, (_, i) => {
 const expected = Math.round(values.length * (i + 1) / parts), reach = Math.round(values.length / parts / 2.5);
 let best = expected;
 for (let p = expected - reach; p <= expected + reach; p++) if (values[p] < values[best] || (values[p] === values[best] && Math.abs(p - expected) < Math.abs(best - expected))) best = p;
 return best;
});
/** A cut line that still crosses visible art (mean alpha above ~1%) goes through a pose. */
const CUT_LIMIT = 3;

const manifest = { version: 1, expressions: EXPRESSION_KEYS, sprites: {} };
const warnings = [];
for (const s of sprites) {
 const out = resolve(target, s.id);
 mkdirSync(out, { recursive: true });
 const entry = { stages: [], avatars: [], expressions: [] };
 s.stages.forEach((_, i) => {
  const input = resolve(source, s.id, `stage-${i + 1}.png`);
  if (!existsSync(input)) { warnings.push(`${s.id} stage-${i + 1} 缺少`); return; }
  fit(input, resolve(out, `stage-${i + 1}.webp`), 1024);
  fit(input, resolve(out, `avatar-${i + 1}.webp`), 256, 0.92);
  entry.stages.push(`${s.id}/stage-${i + 1}.webp`);
  entry.avatars.push(`${s.id}/avatar-${i + 1}.webp`);
 });
 const sheet = resolve(source, s.id, 'expressions.png');
 if (existsSync(sheet)) {
  const [w, h] = magick(sheet, '-format', '%w %h', 'info:').split(' ').map(Number);
  const rowProfile = profile(sheet, 'y', { x: 0, y: 0, w, h });
  const [rowCut] = cuts(rowProfile, 2);
  if (rowProfile[rowCut] > CUT_LIMIT) warnings.push(`${s.id} 表情表两行之间没有空隙，切分可能切到角色`);
  const rows = [[0, rowCut], [rowCut, h]];
  const cells = rows.flatMap(([y0, y1], row) => {
   const colProfile = profile(sheet, 'x', { x: 0, y: y0, w, h: y1 - y0 });
   const colCuts = cuts(colProfile, 4);
   colCuts.forEach((x, i) => { if (colProfile[x] > CUT_LIMIT) warnings.push(`${s.id} 第 ${row + 1} 行第 ${i + 1} 条切缝穿过了角色`); });
   const xs = [0, ...colCuts, w];
   return xs.slice(0, 4).map((x0, i) => ({ x: x0, y: y0, w: xs[i + 1] - x0, h: y1 - y0 }));
  });
  EXPRESSION_KEYS.forEach((key, k) => {
   const cell = resolve(out, `.cell-${k}.png`), c = cells[k];
   magick(sheet, '-crop', `${c.w}x${c.h}+${c.x}+${c.y}`, '+repage', cell);
   fit(cell, resolve(out, `expr-${key}.webp`), 512);
   execFileSync('rm', [cell]);
   entry.expressions.push(`${s.id}/expr-${key}.webp`);
  });
 } else warnings.push(`${s.id} 表情表缺少`);
 manifest.sprites[s.id] = entry;
}
writeFileSync(resolve(target, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
const count = Object.values(manifest.sprites).reduce((n, e) => n + e.stages.length + e.avatars.length + e.expressions.length, 0);
console.log(`已整理 ${Object.keys(manifest.sprites).length} 种精灵、${count} 个素材到 public/sprites/`);

// Scenes: full-bleed backgrounds keep their framing; transparent art is cropped to what is visible.
const scenes = JSON.parse(readFileSync(resolve(here, 'scenes.json'), 'utf8')).scenes;
const sceneTarget = resolve(root, 'public/scenes/flat-v1');
const sceneManifest = { version: 1, scenes: {} };
for (const sc of scenes) {
 const input = resolve(root, 'output/rebrand/scenes', sc.id, `${sc.id}.png`);
 if (!existsSync(input)) { warnings.push(`场景 ${sc.id} 缺少`); continue; }
 const transparent = sc.group === 'prop' || sc.group === 'icon' || sc.transparent;
 if (transparent && magick(input, '-format', '%[opaque]', 'info:') === 'True') { warnings.push(`场景 ${sc.id} 应为透明底`); continue; }
 mkdirSync(resolve(sceneTarget, sc.group), { recursive: true });
 const output = resolve(sceneTarget, sc.group, `${sc.id}.webp`);
 if (sc.group === 'prop') fit(input, output, 512);
 else if (sc.group === 'icon') fit(input, output, 256);
 else if (sc.group === 'app') {
  magick(input, '-resize', '512x512', '-quality', '90', output);
  for (const px of [192, 512]) magick(input, '-resize', `${px}x${px}`, '-strip', resolve(root, `public/icons/icon-${px}.png`));
 }
 else if (transparent) magick(input, '-crop', magick(input, '-alpha', 'extract', '-threshold', '8%', '-format', '%@', 'info:'), '+repage', '-quality', '88', output);
 else magick(input, '-resize', '1536x1536>', '-quality', '85', output);
 sceneManifest.scenes[sc.id] = { group: sc.group, file: `${sc.group}/${sc.id}.webp` };
}
writeFileSync(resolve(sceneTarget, 'manifest.json'), JSON.stringify(sceneManifest, null, 1) + '\n');
console.log(`已整理 ${Object.keys(sceneManifest.scenes).length} 个场景与道具到 public/scenes/flat-v1/`);
warnings.forEach(w => console.log(`- ${w}`));
process.exit(warnings.length ? 1 : 0);
