#!/usr/bin/env node
/**
 * 检查批量生成的小精灵美术，并拼出人工审图用的总览图。
 * 用法：node scripts/art/check.mjs [--sheet]
 * 自动检查：应有的文件都在；立绘与表情为带透明通道的 PNG；四角透明；角色没有碰到画面边缘（未被裁切）。
 * --sheet：在 output/rebrand/ 生成 stages-overview.jpg 与 expressions-overview.jpg（浅灰底，便于看清透明图）。
 * 依赖 ImageMagick（magick / montage）。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const sprites = JSON.parse(readFileSync(resolve(root, 'src/data/creatures.json'), 'utf8'));
const dir = resolve(root, 'output/rebrand/sprites');
const magick = (...args) => execFileSync('magick', args, { encoding: 'utf8' }).trim();

const expected = sprites.flatMap(s => [...s.stages.map((_, i) => [s, `stage-${i + 1}.png`]), [s, 'expressions.png']]);
const issues = [];
for (const [s, file] of expected) {
 const path = resolve(dir, s.id, file);
 if (!existsSync(path)) { issues.push(`${s.id}/${file}：缺少`); continue; }
 const [channels, opaque] = magick(path, '-format', '%[channels] %[opaque]', 'info:').split(' ');
 if (!channels.includes('a') || opaque === 'True') { issues.push(`${s.id}/${file}：没有透明背景`); continue; }
 // Border band 4px wide: any clearly visible pixel there means the art touches or is cut by the edge.
 const edge = Number(magick(path, '-alpha', 'extract', '(', '+clone', '-shave', '4x4', '-fill', 'black', '-colorize', '100', '-bordercolor', 'white', '-border', '4', ')', '-compose', 'multiply', '-composite', '-format', '%[fx:maxima]', 'info:'));
 if (edge > 0.5) issues.push(`${s.id}/${file}：角色碰到画面边缘，可能被裁切`);
}
console.log(`检查 ${expected.length} 个文件，问题 ${issues.length} 个`);
issues.forEach(i => console.log(`- ${i}`));

if (process.argv.includes('--sheet')) {
 const font = ['/System/Library/Fonts/Supplemental/Arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'].find(existsSync);
 const sheet = (items, tile, size, out) => {
  const present = items.filter(([s, f]) => existsSync(resolve(dir, s.id, f)));
  execFileSync('montage', [...(font ? ['-font', font] : []), ...present.flatMap(([s, f, label]) => ['-label', label, resolve(dir, s.id, f)]), '-tile', tile, '-geometry', size, '-pointsize', '22', '-background', '#e9eef2', resolve(root, 'output/rebrand', out)]);
 };
 sheet(sprites.flatMap(s => s.stages.map((st, i) => [s, `stage-${i + 1}.png`, `${st.nameEn} ${st.nameZh}`])), '6x', '300x300+6+6', 'stages-overview.jpg');
 sheet(sprites.map(s => [s, 'expressions.png', `${s.stages[0].nameEn} ${s.stages[0].nameZh}`]), '2x', '780x520+8+8', 'expressions-overview.jpg');
 console.log('总览图：output/rebrand/stages-overview.jpg、output/rebrand/expressions-overview.jpg');
}
process.exit(issues.length ? 1 : 0);
