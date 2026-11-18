#!/usr/bin/env node
/**
 * 用 Codex 内置生图批量生成原创小精灵美术。
 * 用法（CODEX_MODEL 填当前账号可用的模型）：
 *   CODEX_MODEL=gpt-6-sol node scripts/art/generate.mjs line [id...]         三阶段进化线（设定图，白底）
 *   CODEX_MODEL=gpt-6-sol node scripts/art/generate.mjs stage [id...]        每个阶段的标准立绘（透明底，需先有 line）
 *   CODEX_MODEL=gpt-6-sol node scripts/art/generate.mjs expressions [id...]  宝宝期 8 个表情（透明底，需先有 stage-1）
 * 选项：--force 覆盖已有图片；--jobs=4 并发数；--stage=1 只生成某个阶段。
 * 画风参考图：output/rebrand/style-reference.png（本地美术资料，不入库）。
 * 产物：output/rebrand/sprites/<id>/<文件>.png，旁边的 .json 记录提示词、参考图、模型与时间，作为生成来源记录。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPRESSION_PROMPTS } from './expressions.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const style = readFileSync(resolve(here, 'style.txt'), 'utf8');
const sprites = JSON.parse(readFileSync(resolve(here, 'sprites.json'), 'utf8'));
const styleReference = resolve(root, 'output/rebrand/style-reference.png');
const outRoot = resolve(root, 'output/rebrand/sprites');
const at = (s, file) => resolve(outRoot, s.id, file);

const STAGE_LABEL = ['baby, smallest and roundest', 'young, medium size', 'grown, largest and most elaborate'];
const stageText = (s, i) => `"${s.stages[i].nameEn}" (${s.type} type), ${s.stages[i].body}`;
const avoid = s => `It must not look like: ${s.not}.`;
const TRANSPARENT = 'Fully transparent background (PNG with alpha), no ground shadow, no floor, no backdrop, no frame; the character is centered with generous margin and nothing is cropped.';

/** Each kind lists the images one species needs; a variant is one output file. */
const KINDS = {
 line: {
  variants: s => [{
   file: 'line.png', size: 'landscape 1536x1024', refs: [styleReference],
   prompt: `Draw the growth line of ONE original creature species in three stages, left to right, standing on one shared baseline with a soft light-grey ground shadow under each, plain white background, small rounded arrow shapes between stages (no text):\n${s.stages.map((_, i) => `Stage ${i + 1} (${STAGE_LABEL[i]}): ${stageText(s, i)}.`).join('\n')}\nAll three stages clearly belong to the same species: same colors and the same signature feature, growing in size and detail. ${avoid(s)} The first attached image is the STYLE reference only: copy its drawing style exactly, but not its characters.\n\n${style}`,
  }],
 },
 stage: {
  variants: s => s.stages.map((_, i) => ({
   file: `stage-${i + 1}.png`, stage: i + 1, size: 'square 1024x1024', refs: [styleReference, at(s, 'line.png')],
   prompt: `Draw ONE character only: stage ${i + 1} of the growth line in the second attached image (counting left to right), ${stageText(s, i)}.\nMatch that stage exactly: same body shape, proportions, colors, markings and signature feature. Full body, front three-quarter view, a friendly happy standing pose. ${TRANSPARENT}\n${avoid(s)} The first attached image is the STYLE reference only.\n\n${style}`,
  })),
 },
 expressions: {
  variants: s => [{
   file: 'expressions.png', size: 'landscape 1536x1024', refs: [styleReference, at(s, 'stage-1.png')],
   prompt: `Draw an expression sheet for ONE character: ${stageText(s, 0)}.\nThe second attached image shows exactly this character: keep its body shape, colors, proportions and features identical in every pose. The first attached image is the STYLE reference only.\nShow 8 poses in an even 4x2 grid with equal cells and clear empty space between cells, same scale, ${TRANSPARENT.replace('the character is centered', 'each pose is centered in its cell')}\nPoses: ${EXPRESSION_PROMPTS.map((e, i) => `(${i + 1}) ${e}`).join(', ')}. Only the face, arms and small effect shapes change between poses; no text or symbols.\n${avoid(s)}\n\n${style}`,
  }],
 },
};

function run(sprite, v, force) {
 const dir = resolve(outRoot, sprite.id);
 const base = v.file.replace(/\.png$/, '');
 if (!force && existsSync(resolve(dir, v.file))) return Promise.resolve({ id: sprite.id, file: v.file, skipped: true });
 const missing = v.refs.filter(r => !existsSync(r));
 if (missing.length) return Promise.resolve({ id: sprite.id, file: v.file, error: `missing reference ${missing.map(m => m.replace(root + '/', '')).join(', ')}` });
 mkdirSync(dir, { recursive: true });
 writeFileSync(resolve(dir, `${base}.prompt.txt`), v.prompt);
 const task = `Read ${base}.prompt.txt in the current directory and generate exactly that image with your built-in image generation tool (highest quality, ${v.size}). Save it in the current directory as ${v.file}. Do not create or change any other files.`;
 const args = ['exec', '--skip-git-repo-check', '-s', 'workspace-write', '-C', dir, ...v.refs.flatMap(r => ['-i', r]), ...(process.env.CODEX_MODEL ? ['-m', process.env.CODEX_MODEL] : []), task];
 return new Promise(done => {
  const child = spawn('codex', args, { stdio: ['ignore', 'ignore', 'ignore'] });
  child.on('close', code => {
   const ok = code === 0 && existsSync(resolve(dir, v.file));
   if (ok) writeFileSync(resolve(dir, `${base}.json`), JSON.stringify({ sprite: sprite.id, file: v.file, tool: 'codex exec image_gen', model: process.env.CODEX_MODEL ?? 'codex default', references: v.refs.map(r => r.replace(root + '/', '')), generatedAt: new Date().toISOString(), prompt: `${base}.prompt.txt` }, null, 1));
   done({ id: sprite.id, file: v.file, ok, code });
  });
 });
}

const [kind, ...rest] = process.argv.slice(2);
if (!KINDS[kind]) { console.error(`用法：node scripts/art/generate.mjs <${Object.keys(KINDS).join('|')}> [id...] [--force] [--jobs=4] [--stage=1]`); process.exit(2); }
const option = name => rest.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
const force = rest.includes('--force');
const jobs = Math.max(1, Number(option('jobs') ?? 4));
const onlyStage = option('stage') ? Number(option('stage')) : undefined;
const ids = rest.filter(a => !a.startsWith('--'));
const unknown = ids.filter(id => !sprites.some(s => s.id === id));
if (unknown.length) { console.error(`未知精灵：${unknown.join(', ')}`); process.exit(2); }
const queue = sprites.filter(s => !ids.length || ids.includes(s.id)).flatMap(s => KINDS[kind].variants(s).filter(v => onlyStage === undefined || v.stage === onlyStage).map(v => [s, v]));
const results = [];
await Promise.all(Array.from({ length: jobs }, async () => {
 while (queue.length) { const [s, v] = queue.shift(); const r = await run(s, v, force); results.push(r); console.log(JSON.stringify(r)); }
}));
const failed = results.filter(r => r.error || r.ok === false);
console.log(`完成 ${kind}：生成 ${results.filter(r => r.ok).length}，跳过 ${results.filter(r => r.skipped).length}，失败 ${failed.length}`);
process.exit(failed.length ? 1 : 0);
