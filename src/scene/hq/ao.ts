import * as THREE from "three";
import { PILOT_GARDEN } from '../layout';
import { GROVE_TREES, FARM_PLOTS, BERRY_BUSHES, BOWLS, CAMPFIRE, COAST_ROCKS, HQ_PROPS, ISLAND, PALMS, SIGN, TENT } from "../layout";

/**
 * 烘焙的环境光遮蔽：道具下方和周围的地面会柔和地变暗（帐篷、原木凳、树果丛、椰子树、礁石、睡垫……）。
 * 地面用俯视遮蔽贴图，草叶按位置采样同一份数据。不需要实时计算，几乎不耗性能。
 */
interface Occluder { x: number; z: number; r: number; k: number }
/** 各模型的遮蔽半径与强度 */
const AO_R: Record<string, [number, number]> = {
  wooden_crate_01: [0.85, 0.45], wooden_bucket_01: [0.45, 0.4], wicker_basket_01: [0.55, 0.4],
  lambis_shell: [0.22, 0.3],
  shrub: [0.95, 0.45], cedar: [1.5, 0.5]
};

export const OCCLUDERS: Occluder[] = [
  {...PILOT_GARDEN.tree,r:1.5,k:.4},
  ...GROVE_TREES.map(p=>({x:p.x,z:p.z,r:1.4*p.s,k:.3})),
  ...FARM_PLOTS.map(p=>({...p,r:1.25,k:.25})),
  { x: TENT.x, z: TENT.z, r: 2.6, k: 0.6 },
  { x: CAMPFIRE.x, z: CAMPFIRE.z, r: 1.9, k: 0.28 },
  ...HQ_PROPS.filter((p) => p.m === "log_seat").map((p) => ({ x: p.x, z: p.z, r: 1.2, k: 0.5 })),
  ...HQ_PROPS.filter((p) => AO_R[p.m]).map((p) => ({ x: p.x, z: p.z, r: AO_R[p.m][0] * (p.m === "shrub" ? (p.s ?? 1) : 1), k: AO_R[p.m][1] })),
  ...BERRY_BUSHES.map((b) => ({ x: b.x, z: b.z, r: 1.25 * b.s, k: 0.55 })),
  ...BOWLS.map((b) => ({ x: b.x, z: b.z, r: 0.42, k: 0.35 })),
  { x: SIGN.x, z: SIGN.z, r: 0.45, k: 0.35 },
  ...PALMS.map((p) => ({ x: p.x, z: p.z, r: 0.75, k: 0.45 })),
  ...COAST_ROCKS.map((p) => ({ x: p.x, z: p.z, r: Math.max(p.size[0], p.size[2]) * 0.65, k: 0.38 }))
];

/** 某点的遮蔽系数：1 = 完全不遮挡，越小越暗 */
export function aoAt(x: number, z: number) {
  let v = 1;
  for (const o of OCCLUDERS) {
    const d = Math.hypot(x - o.x, z - o.z) / o.r;
    if (d < 1) v *= 1 - o.k * (1 - d) * (1 - d);
  }
  return v;
}

/** 地面范围（与 Terrain 的平面一致） */
export const AO_RECT = { minX: ISLAND.cx - 32, minZ: ISLAND.cz - 32, size: 64 };

let aoTex: THREE.CanvasTexture | null = null;
/** 俯视遮蔽贴图：白底 + 道具位置的柔和暗斑（乘法混合叠加） */
export function aoTexture() {
  if (aoTex) return aoTex;
  const N = 1024;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, N, N);
  ctx.globalCompositeOperation = "multiply";
  const px = (v: number) => (v / AO_RECT.size) * N;
  for (const o of OCCLUDERS) {
    const cx = px(o.x - AO_RECT.minX), cy = px(o.z - AO_RECT.minZ), r = px(o.r);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const dark = Math.round(255 * (1 - o.k));
    g.addColorStop(0, `rgb(${dark},${dark},${dark})`);
    g.addColorStop(0.45, `rgb(${Math.round(255 - (255 - dark) * 0.45)},${Math.round(255 - (255 - dark) * 0.45)},${Math.round(255 - (255 - dark) * 0.45)})`);
    g.addColorStop(1, "#fff");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  aoTex = new THREE.CanvasTexture(cv);
  aoTex.colorSpace = THREE.NoColorSpace;
  return aoTex;
}
