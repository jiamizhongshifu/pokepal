// 用 Tripo API（V3）把宝可梦官方立绘生成为 3D 模型，并尝试绑骨 + 套待机/走路动画。
// 生成的模型放在 public/models/pokemon/<id>.glb，并登记到 src/data/pokemonModels.json，
// 家园场景会自动用 3D 模型替换立绘立牌。仅供家庭内部使用。
//
// 用法：
//   TRIPO_API_KEY=tsk_xxx node scripts/tripo-generate.mjs 25 1 4 7
//   TRIPO_API_KEY=tsk_xxx node scripts/tripo-generate.mjs 25 --no-rig     只生成静态模型
//   node scripts/tripo-generate.mjs 25 --dry                               只打印将要做什么
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const BASE = "https://openapi.tripo3d.com/v3";
const KEY = process.env.TRIPO_API_KEY;
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const NO_RIG = args.includes("--no-rig");
const FORCE = args.includes("--force");
const ids = args.filter((a) => /^\d+$/.test(a)).map(Number);

const MODEL_VERSION = "P1-20260311"; // 低多边形 + PBR，和 Kenney 场景风格一致
const FACE_LIMIT = 8000; // iPad 上几十只同屏也流畅
const RIG_VERSION = "v2.5-20260210";
const ANIMATIONS = ["preset:idle", "preset:walk"];
const MANIFEST = path.join(ROOT, "src/data/pokemonModels.json");
const OUT_DIR = path.join(ROOT, "public/models/pokemon");

if (!ids.length) {
  console.log("请传入宝可梦编号，例如：node scripts/tripo-generate.mjs 25 1 4 7");
  process.exit(1);
}
if (!KEY && !DRY) {
  console.log("缺少 TRIPO_API_KEY 环境变量。在 https://platform.tripo3d.ai 创建 API Key 后再运行，或加 --dry 预览。");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true, () => false);

async function api(method, url, body, isForm = false) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(BASE + url, {
      method,
      headers: { Authorization: `Bearer ${KEY}`, ...(body && !isForm ? { "Content-Type": "application/json" } : {}) },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined
    });
    if (res.status === 429) {
      await sleep(6000 * (attempt + 1)); // 上传限速约 10 次/分钟
      continue;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || (json.code !== undefined && json.code !== 0)) {
      throw new Error(`${method} ${url} → ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
    }
    return json.data ?? json;
  }
  throw new Error(`${method} ${url} 多次被限流`);
}

async function waitTask(taskId, label) {
  let last = -1;
  for (;;) {
    const t = await api("GET", `/tasks/${taskId}`);
    if (t.progress !== last) {
      process.stdout.write(`\r  ${label} ${t.status} ${t.progress ?? 0}%   `);
      last = t.progress;
    }
    if (t.status === "success") {
      process.stdout.write("\n");
      return t;
    }
    if (["failed", "cancelled", "banned", "expired"].includes(t.status)) throw new Error(`${label} 任务 ${t.status}`);
    await sleep(2500);
  }
}

async function download(url, file) {
  // 模型链接 5 分钟过期，拿到就立刻下载
  const r = await fetch(url);
  if (!r.ok) throw new Error(`下载失败 ${r.status}`);
  await writeFile(file, Buffer.from(await r.arrayBuffer()));
}

function pickModelUrl(output) {
  if (!output) return null;
  if (typeof output.model_url === "string") return output.model_url;
  const urls = output.model_urls;
  if (Array.isArray(urls)) return urls[0]?.url ?? urls[0];
  if (urls && typeof urls === "object") return Object.values(urls)[0];
  return null;
}

async function generate(id) {
  const art = path.join(ROOT, "public/pokemon/art", `${id}.png`);
  const out = path.join(OUT_DIR, `${id}.glb`);
  if (!(await exists(art))) throw new Error(`找不到立绘 ${art}，先运行 npm run fetch:pokemon`);
  if ((await exists(out)) && !FORCE) {
    console.log(`#${id} 已有模型，跳过（加 --force 重新生成）`);
    return out;
  }
  console.log(`#${id} 开始：上传立绘 → 生成模型${NO_RIG ? "" : " → 绑骨 → 动画"}`);
  if (DRY) return out;

  const form = new FormData();
  form.append("file", new Blob([await readFile(art)], { type: "image/png" }), `${id}.png`);
  const { file_token } = await api("POST", "/files", form, true);

  const gen = await api("POST", "/generation/image-to-model", {
    model: MODEL_VERSION,
    file: { type: "png", file_token },
    face_limit: FACE_LIMIT,
    texture: true,
    pbr: true,
    orientation: "align_image"
  });
  const model = await waitTask(gen.task_id, "生成模型");
  let finalTask = model;

  if (!NO_RIG) {
    try {
      const check = await api("POST", "/animations/rig-check", { original_model_task_id: gen.task_id });
      const checked = check.task_id ? await waitTask(check.task_id, "绑骨检查") : { output: check };
      const riggable = checked.output?.riggable ?? check.riggable;
      const rigType = checked.output?.rig_type ?? check.rig_type ?? "biped";
      if (riggable) {
        const rig = await api("POST", "/animations/rig", {
          original_model_task_id: gen.task_id,
          rig_type: rigType,
          spec: "tripo",
          out_format: "glb",
          model_version: RIG_VERSION
        });
        await waitTask(rig.task_id, `绑骨(${rigType})`);
        const anim = await api("POST", "/animations/retarget", {
          original_model_task_id: rig.task_id,
          animations: ANIMATIONS,
          out_format: "glb",
          bake_animation: true,
          export_with_geometry: true
        });
        finalTask = await waitTask(anim.task_id, "套动画");
      } else {
        console.log("  这个模型不适合绑骨，使用静态模型（家园里会有走动和弹跳效果）");
      }
    } catch (e) {
      console.log(`  绑骨/动画失败，退回静态模型：${e.message}`);
      finalTask = model;
    }
  }

  const url = pickModelUrl(finalTask.output) ?? pickModelUrl(model.output);
  if (!url) throw new Error("任务成功但没有返回模型链接");
  await download(url, out);
  console.log(`  ✓ 已保存 ${path.relative(ROOT, out)}`);
  return out;
}

await mkdir(OUT_DIR, { recursive: true });
if (KEY && !DRY) {
  const bal = await api("GET", "/account/balance").catch(() => null);
  if (bal) console.log(`Tripo 余额：${bal.balance}（冻结 ${bal.frozen}）`);
}
const manifest = JSON.parse(await readFile(MANIFEST, "utf8").catch(() => "{}"));
for (const id of ids) {
  try {
    await generate(id);
    if (!DRY) {
      manifest[id] = { file: `${id}.glb` };
      await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
    }
  } catch (e) {
    console.error(`#${id} 失败：${e.message}`);
  }
}
console.log(DRY ? "预览结束，未调用 API。" : "完成。重新构建后家园会使用新模型：npm run build");
