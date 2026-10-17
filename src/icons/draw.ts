/**
 * 图标绘制工具：64×64 画布，统一的深靛蓝描边 + 主视觉色板 + 白色高光，
 * 与宝可梦 30 周年视觉系统（蓝 / 紫 / 品红 / 金）保持一致。
 */
export const INK = "#0d2740";
export const C = {
  yellow: "#ffd84a",
  gold: "#ffb423",
  orange: "#ff9246",
  red: "#ff5568",
  pink: "#ff9fd0",
  rose: "#ffc6e3",
  blue: "#58b9ff",
  deep: "#3f74ff",
  violet: "#8a68ff",
  lilac: "#c9b6ff",
  sky: "#bfe6ff",
  green: "#63d58c",
  leaf: "#2fb86c",
  brown: "#c98a54",
  dark: "#7a4d2c",
  white: "#ffffff",
  cloud: "#eef3ff",
  gray: "#b8c0e6",
  skin: "#ffd9bb",
  ink: INK
};

const SW = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const rot = (r: number, x: number, y: number) => (r ? ` transform="rotate(${r} ${x} ${y})"` : "");

/** 填色路径（带描边） */
export const p = (d: string, fill: string, extra = "") => `<path d="${d}" fill="${fill}" ${SW}${extra}/>`;
/** 圆 */
export const c = (cx: number, cy: number, r: number, fill: string) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${SW}/>`;
/** 椭圆 */
export const e = (cx: number, cy: number, rx: number, ry: number, fill: string, r = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${SW}${rot(r, cx, cy)}/>`;
/** 圆角矩形 */
export const rect = (x: number, y: number, w: number, h: number, rx: number, fill: string, r = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${SW}${rot(r, x + w / 2, y + h / 2)}/>`;
/** 线条 */
export const line = (d: string, w = 3, color = INK) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
/** 描边线：深色粗线 + 内部浅色细线，用于箭头、叉号等线性图标 */
export const oline = (d: string, inner = C.white, w = 5) => line(d, w + 5) + line(d, w, inner);
/** 无描边的点 / 高光 */
export const dot = (cx: number, cy: number, r: number, fill = INK) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
export const hl = (cx: number, cy: number, rx: number, ry: number, r = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".65"${rot(r, cx, cy)}/>`;
/**
 * 圆角多边形路径：每个角按相邻两边长度切出一段，用二次曲线圆过去（半径默认 2.6，按边长自动收缩）。
 */
export function roundedPath(pts: number[][], radius = 2.6) {
  const n = pts.length;
  const f = (v: number) => +v.toFixed(2);
  let d = "";
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[(i - 1 + n) % n], [x, y] = pts[i], [nx, ny] = pts[(i + 1) % n];
    const l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y);
    const r = Math.min(radius, l1 * 0.45, l2 * 0.45);
    const ax = x + ((px - x) / l1) * r, ay = y + ((py - y) / l1) * r;
    const bx = x + ((nx - x) / l2) * r, by = y + ((ny - y) / l2) * r;
    d += `${i ? "L" : "M"}${f(ax)} ${f(ay)} Q${f(x)} ${f(y)} ${f(bx)} ${f(by)} `;
  }
  return d + "Z";
}
/** 多边形（自动圆角） */
export const poly = (pts: number[][], fill: string, radius = 2.6) => `<path d="${roundedPath(pts, radius)}" fill="${fill}" ${SW}/>`;

/** 星形顶点 */
export function starPts(cx: number, cy: number, R: number, r: number, n = 5, start = -90): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((start + (i * 180) / n) * Math.PI) / 180;
    const rr = i % 2 ? r : R;
    pts.push([+(cx + Math.cos(a) * rr).toFixed(2), +(cy + Math.sin(a) * rr).toFixed(2)]);
  }
  return pts;
}

/** 可爱的脸：两只眼睛带高光 + 小嘴 + 腮红 */
export function face(cx: number, cy: number, gap = 7, opts: { blush?: string; mouth?: boolean; size?: number } = {}) {
  const s = opts.size ?? 2.8;
  let out = dot(cx - gap, cy, s) + dot(cx + gap, cy, s) + dot(cx - gap + 0.9, cy - 1, s * 0.38, "#fff") + dot(cx + gap + 0.9, cy - 1, s * 0.38, "#fff");
  if (opts.mouth !== false) out += line(`M${cx - 2.5} ${cy + 5} Q${cx} ${cy + 7.5} ${cx + 2.5} ${cy + 5}`, 2.2);
  if (opts.blush) out += `<ellipse cx="${cx - gap - 3}" cy="${cy + 4.5}" rx="3" ry="2" fill="${opts.blush}" opacity=".8"/><ellipse cx="${cx + gap + 3}" cy="${cy + 4.5}" rx="3" ry="2" fill="${opts.blush}" opacity=".8"/>`;
  return out;
}

/** 齿轮外形 */
export function gearPath(cx: number, cy: number, R: number, r: number, teeth = 8) {
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const w = step * 0.22;
    for (const [ang, rr] of [[a - step / 2 + w, r], [a - w * 1.2, R], [a + w * 1.2, R], [a + step / 2 - w, r]] as [number, number][]) {
      pts.push(`${(cx + Math.cos(ang) * rr).toFixed(2)} ${(cy + Math.sin(ang) * rr).toFixed(2)}`);
    }
  }
  return roundedPath(pts.map((q) => q.split(" ").map(Number)), 1.6);
}

/** 颜色混合（#rrggbb） */
function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

/**
 * 给图标加体积感：所有带深色描边的填色块，平涂改成“上亮—本色—下暗”的竖向渐变，
 * 像有体积的小玩具，和 3D 场景、宝可梦立绘的质感更统一。高光、点、线条不受影响。
 */
export function shade(body: string): string {
  const colors = new Set<string>();
  const out = body.replace(/<(path|circle|ellipse|rect)([^>]*?) fill="(#[0-9a-fA-F]{6})"([^>]*stroke="#0d2740"[^>]*)>/g, (_m, tag, pre, fill, post) => {
    const f = fill.toLowerCase();
    if (f === INK) return `<${tag}${pre} fill="${fill}"${post}>`;
    colors.add(f);
    return `<${tag}${pre} fill="url(#v${f.slice(1)})"${post}>`;
  });
  if (!colors.size) return body;
  const defs = [...colors]
    .map((f) => {
      const top = mix(f, "#ffffff", f === "#ffffff" ? 0 : 0.38);
      const bottom = mix(f, INK, f === "#ffffff" ? 0.1 : 0.16);
      return `<linearGradient id="v${f.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".55" stop-color="${f}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
    })
    .join("");
  return `<defs>${defs}</defs>${out}`;
}
