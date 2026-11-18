#!/usr/bin/env node
/**
 * 用 Codex 内置生图批量生成原创小精灵美术。
 * 用法：
 *   CODEX_MODEL=gpt-6-sol node scripts/art/generate.mjs standard [id...]     每只的标准立绘（方图）
 *   CODEX_MODEL=gpt-6-sol node scripts/art/generate.mjs expressions [id...]  每只的 8 个表情动作（需先有 standard）
 * 选项：--force 覆盖已有图片；--jobs=4 并发数。
 * 画风参考图：output/rebrand/style-reference.png（本地美术资料，不入库）。
 * 产物：output/rebrand/sprites/<id>/<kind>.png，旁边的 <kind>.json 记录提示词、参考图、模型与时间，作为生成来源记录。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const style = readFileSync(resolve(here, 'style.txt'), 'utf8');
const sprites = JSON.parse(readFileSync(resolve(here, 'sprites.json'), 'utf8'));
const styleReference = resolve(root, 'output/rebrand/style-reference.png');
const outRoot = resolve(root, 'output/rebrand/sprites');

const stageText = (s, i) => `"${s.stages[i].nameEn}" (${s.type} type), ${s.stages[i].body}`;
const describe = (s, i = 0) => `${stageText(s, i)}. It must not look like: ${s.not}.`;
export const EXPRESSIONS = ['waving hello', 'cheering with both arms up and small confetti shapes', 'surprised with a round open mouth', 'thinking with one hand on its chin, looking up', 'giggling with eyes closed', 'sleepy and yawning', 'proud, chest puffed out, with a small star shape', 'a little sad with one tear'];

const KINDS = {
 standard: {
  size: 'square 1024x1024',
  refs: () => [styleReference],
  prompt: s => `Draw ONE character: ${describe(s)}\nFull body, front three-quarter view, standing in a friendly happy pose with one arm waving, centered with generous margin, plain white background, a soft light-grey oval ground shadow. The first attached image is the STYLE reference only: copy its drawing style exactly, but not its characters.\n\n${style}`,
 },
 line: {
  size: 'landscape 1536x1024',
  refs: () => [styleReference],
  prompt: s => `Draw the growth line of ONE original creature species in three stages, left to right, standing on one shared baseline with a soft light-grey ground shadow under each, plain white background, small rounded arrow shapes between stages (no text):\n${s.stages.map((_, i) => `Stage ${i + 1} (${['baby, smallest and roundest', 'young, medium size', 'grown, largest and most elaborate'][i]}): ${stageText(s, i)}.`).join('\n')}\nAll three stages clearly belong to the same species: same colors and the same signature feature, growing in size and detail. It must not look like: ${s.not}. The first attached image is the STYLE reference only: copy its drawing style exactly, but not its characters.\n\n${style}`,
 },
 expressions: {
  size: 'landscape 1536x1024',
  refs: s => [styleReference, resolve(outRoot, s.id, 'standard.png')],
  prompt: s => `Draw an expression sheet for ONE character: ${describe(s)}\nThe second attached image shows exactly this character: keep its body shape, colors, proportions and features identical in every pose. The first attached image is the STYLE reference only.\nShow 8 poses in a 4x2 grid, same scale, each with a soft light-grey ground shadow, plain white background: ${EXPRESSIONS.map((e, i) => `(${i + 1}) ${e}`).join(', ')}. Only the face, arms and small effect shapes change between poses.\n\n${style}`,
 },
};

function run(kind, sprite, force) {
 const spec = KINDS[kind];
 const dir = resolve(outRoot, sprite.id);
 const file = `${kind}.png`;
 if (!force && existsSync(resolve(dir, file))) return Promise.resolve({ id: sprite.id, skipped: true });
 const refs = spec.refs(sprite);
 const missing = refs.filter(r => !existsSync(r));
 if (missing.length) return Promise.resolve({ id: sprite.id, error: `missing reference ${missing.join(', ')}` });
 mkdirSync(dir, { recursive: true });
 const prompt = spec.prompt(sprite);
 writeFileSync(resolve(dir, `${kind}.prompt.txt`), prompt);
 const task = `Read ${kind}.prompt.txt in the current directory and generate exactly that image with your built-in image generation tool (highest quality, ${spec.size}). Save it in the current directory as ${file}. Do not create or change any other files.`;
 const args = ['exec', '--skip-git-repo-check', '-s', 'workspace-write', '-C', dir, ...refs.flatMap(r => ['-i', r]), ...(process.env.CODEX_MODEL ? ['-m', process.env.CODEX_MODEL] : []), task];
 return new Promise(done => {
  const child = spawn('codex', args, { stdio: ['ignore', 'ignore', 'ignore'] });
  child.on('close', code => {
   const ok = code === 0 && existsSync(resolve(dir, file));
   if (ok) writeFileSync(resolve(dir, `${kind}.json`), JSON.stringify({ sprite: sprite.id, kind, tool: 'codex exec image_gen', model: process.env.CODEX_MODEL ?? 'codex default', references: refs.map(r => r.replace(root + '/', '')), generatedAt: new Date().toISOString(), prompt: `${kind}.prompt.txt` }, null, 1));
   done({ id: sprite.id, ok, code });
  });
 });
}

const [kind, ...rest] = process.argv.slice(2);
if (!KINDS[kind]) { console.error(`用法：node scripts/art/generate.mjs <${Object.keys(KINDS).join('|')}> [id...] [--force] [--jobs=4]`); process.exit(2); }
const force = rest.includes('--force');
const jobs = Number(rest.find(a => a.startsWith('--jobs='))?.split('=')[1] ?? 4);
const ids = rest.filter(a => !a.startsWith('--'));
const unknown = ids.filter(id => !sprites.some(s => s.id === id));
if (unknown.length) { console.error(`未知精灵：${unknown.join(', ')}`); process.exit(2); }
const queue = sprites.filter(s => !ids.length || ids.includes(s.id));
const results = [];
await Promise.all(Array.from({ length: Math.max(1, jobs) }, async () => {
 while (queue.length) { const s = queue.shift(); const r = await run(kind, s, force); results.push(r); console.log(JSON.stringify(r)); }
}));
const failed = results.filter(r => r.error || r.ok === false);
console.log(`完成 ${kind}：生成 ${results.filter(r => r.ok).length}，跳过 ${results.filter(r => r.skipped).length}，失败 ${failed.length}`);
process.exit(failed.length ? 1 : 0);
