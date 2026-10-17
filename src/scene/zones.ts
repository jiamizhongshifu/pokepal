import type { Pokemon } from "../types";
import type { ZoneKey } from "../data/behaviors";
import { BERRY_BUSHES, CAMPFIRE, CUSHIONS, HIGH_ROCK, ISLAND, OBSTACLES, PALMS, TENT, islandK, obstacleDist, onIsland } from "./layout";

export interface Spot { x: number; z: number; y?: number }
export interface Effect { id: number; kind: "pet" | "feed" | "night"; icon: string; at: number }

/** 场景里的身高（米）：按真实身高轻度压缩，大小差异明显但小宝可梦也够大、好点 */
export function sceneHeight(p: Pokemon) {
  return Math.min(2.3, Math.max(0.62, 0.5 + (p.heightCm / 100) * 0.62));
}

export const WATER_Y = -0.16;
const ring = (cx: number, cz: number, r: number, n: number, start = 0, y?: number): Spot[] =>
  Array.from({ length: n }, (_, i) => {
    const a = start + (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, y };
  });

/** 固定位置（stay 轨迹用），同一区域的宝可梦依次占位 */
const FIXED: Partial<Record<ZoneKey, Spot[]>> = {
  // 篝火：原木凳上 + 食盆旁
  campfire: [
    { x: CAMPFIRE.x - 2.0, z: CAMPFIRE.z + 0.55, y: 0.42 }, { x: CAMPFIRE.x + 2.0, z: CAMPFIRE.z + 0.55, y: 0.42 },
    { x: CAMPFIRE.x - 0.7, z: CAMPFIRE.z - 1.5, y: 0.42 }, { x: CAMPFIRE.x + 0.7, z: CAMPFIRE.z - 1.5, y: 0.42 },
    { x: CAMPFIRE.x + 1.3, z: CAMPFIRE.z + 2.1 }, { x: CAMPFIRE.x - 1.4, z: CAMPFIRE.z + 2.0 },
    { x: CAMPFIRE.x + 2.9, z: CAMPFIRE.z + 0.6 }, { x: CAMPFIRE.x - 2.9, z: CAMPFIRE.z + 1.4 },
    { x: CAMPFIRE.x, z: CAMPFIRE.z + 2.6 }, { x: CAMPFIRE.x + 2.2, z: CAMPFIRE.z + 1.9 }
  ],
  // 睡觉的地方：帐篷周围几块安静的沙地
  beds: CUSHIONS.map((c) => ({ x: c.x, z: c.z + 0.05 })),
  // 晒太阳：沙地广场上阳光最好的几块空地
  sunny: [{ x: 2.4, z: 0.2 }, { x: -4.4, z: 1.2 }, { x: 3.6, z: 1.8 }, { x: -2.6, z: -0.2 }, { x: 0.8, z: 2.2 }, { x: -6.2, z: 2.4 }],
  // 帐篷门口
  tent: [{ x: TENT.x + 0.6, z: TENT.z + 1.9 }, { x: TENT.x - 1.0, z: TENT.z + 1.8 }, { x: TENT.x + 1.9, z: TENT.z + 1.2 }],
  // 礁石脚下
  rocks: [onIsland(-24, 1.2), onIsland(-18, 1.25), onIsland(-30, 1.17), onIsland(62, 1.13)],
  // 冥想石顶（超梦冥想）
  highrock: [{ x: HIGH_ROCK.x, z: HIGH_ROCK.z, y: HIGH_ROCK.top }],
  // 椰子树下
  palms: PALMS.slice(0, 8).map((p) => {
    const dx = ISLAND.cx - p.x, dz = ISLAND.cz - p.z, l = Math.hypot(dx, dz);
    return { x: p.x + (dx / l) * 1.0, z: p.z + (dz / l) * 1.0 };
  }),
  // 树果丛前
  bushes: BERRY_BUSHES.map((b) => {
    const dx = ISLAND.cx - b.x, dz = ISLAND.cz - b.z, l = Math.hypot(dx, dz);
    // 站在树冠外沿之外（树冠半径约 0.95×s，再留出半个宝可梦的宽度）
    return { x: b.x + (dx / l) * (1.0 * b.s + 0.55), z: b.z + (dz / l) * (1.0 * b.s + 0.55) };
  }),
  // 海边站着
  shore: [onIsland(18, 1.18), onIsland(30, 1.17), onIsland(62, 1.16), onIsland(48, 1.15), onIsland(-26, 1.2)],
  // 浅滩（一半身子在水里）
  shallows: [onIsland(18, 1.36), onIsland(32, 1.34), onIsland(60, 1.37), onIsland(46, 1.33), onIsland(76, 1.36)].map((s) => ({ ...s, y: WATER_Y })),
  sea: [onIsland(22, 1.7), onIsland(58, 1.8), onIsland(38, 1.65)].map((s) => ({ ...s, y: WATER_Y })),
  farsea: [{ x: 15, z: -8, y: WATER_Y }],
  meadow: [{ x: 0, z: 0.6 }, { x: -2, z: 1.4 }, { x: 2, z: 1.0 }],
  moonlit: [{ x: -0.6, z: 0.8 }],
  sky: [{ x: 0, z: -1, y: 3 }]
};

function rawFixedSpot(zone: ZoneKey, slot: number): Spot {
  const list = FIXED[zone] ?? FIXED.meadow!;
  if (slot < list.length) return list[slot];
  const base = list[slot % list.length];
  const a = slot * 2.4;
  return { x: base.x + Math.cos(a) * 0.9, z: base.z + Math.sin(a) * 0.9, y: base.y };
}

/** 固定位置：落在障碍里（树果丛、栈桥、路牌……）时，沿螺旋就近挪到空地；坐在凳子 / 石头上的座位（有正高度）保持不变 */
export function fixedSpot(zone: ZoneKey, slot: number): Spot {
  const s = rawFixedSpot(zone, slot);
  if (zone === "sky" || (s.y !== undefined && s.y > 0)) return s;
  const water = s.y !== undefined && s.y < 0;
  const ok = (x: number, z: number) => (water ? freeWater(x, z) : free(x, z, 0.25));
  if (ok(s.x, s.z)) return s;
  for (let i = 1; i < 60; i++) {
    const a = i * 2.39996;
    const r = 0.25 * Math.sqrt(i) * 1.4;
    const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (ok(x, z)) return { ...s, x, z };
  }
  return s;
}

const free = (x: number, z: number, pad = 0.4) => !OBSTACLES.some((o) => obstacleDist(o, x, z) < o.r + pad);
/** 水里的目标点只需要避开栈桥这类水上障碍 */
const freeWater = (x: number, z: number, pad = 0.6) => !OBSTACLES.some((o) => o.water && obstacleDist(o, x, z) < o.r + pad);

/** 区域内随机一点（roam 轨迹用） */
export function randomSpot(zone: ZoneKey): Spot {
  for (let i = 0; i < 60; i++) {
    let s: Spot;
    switch (zone) {
      case "shore":
        s = onIsland(16 + Math.random() * 134, 1.1 + Math.random() * 0.12); // 只在栈桥南侧，免得来回穿过栈桥
        break;
      case "shallows":
        s = { ...onIsland(16 + Math.random() * 96, 1.33 + Math.random() * 0.1), y: WATER_Y };
        break;
      case "sea":
        s = { ...onIsland(16 + Math.random() * 84, 1.5 + Math.random() * 0.45), y: WATER_Y };
        break;
      case "sky":
        s = { x: -6 + Math.random() * 13, z: -5 + Math.random() * 7, y: 2 + Math.random() * 1.4 };
        break;
      case "bushes": {
        const b = FIXED.bushes![Math.floor(Math.random() * FIXED.bushes!.length)];
        s = { x: b.x + (Math.random() - 0.5) * 1.6, z: b.z + (Math.random() - 0.5) * 1.6 };
        break;
      }
      case "tent":
        s = { x: TENT.x + (Math.random() - 0.5) * 5, z: TENT.z + 1.5 + Math.random() * 2.5 };
        break;
      default: {
        // 中央草坪：前沿不超过 z=2.6，免得走到底部按钮后面
        s = { x: ISLAND.cx + (Math.random() * 2 - 1) * ISLAND.rx * 0.78, z: -1.6 + Math.random() * 4.2 };
        if (islandK(s.x, s.z) > 0.8) continue;
      }
    }
    if (s.y === undefined ? !free(s.x, s.z) : !freeWater(s.x, s.z)) continue;
    return s;
  }
  return { x: -1, z: 1 };
}

/** 巡逻 / 沿海岸路线（patrol、shoreline 轨迹用） */
export function pathPoints(zone: ZoneKey): Spot[] {
  if (zone === "tent") return ring(TENT.x, TENT.z + 0.6, 2.7, 8, 0.4).filter((s) => free(s.x, s.z, 0.1));
  if (zone === "shore") return Array.from({ length: 12 }, (_, i) => onIsland(17 + i * 13, 1.16 + (i % 2) * 0.05)).filter((p) => free(p.x, p.z, 0.2));
  return [randomSpot(zone), randomSpot(zone), randomSpot(zone)];
}

/** 绕圈（circle 轨迹用）：天空、远海、月光草坪 */
export function circleOf(zone: ZoneKey, altitude = 0): { cx: number; cz: number; r: number; y: number } {
  if (zone === "sky") return { cx: -0.5, cz: -1.8, r: 5.2, y: altitude || 3 };
  if (zone === "farsea") return { cx: 20, cz: -10, r: 4, y: WATER_Y };
  if (zone === "moonlit") return { cx: -0.6, cz: 0.8, r: 1.3, y: 0 };
  return { cx: 0, cz: 0, r: 3, y: altitude };
}

/** 区域默认轨迹 */
export function defaultPath(zone: ZoneKey): "roam" | "stay" | "patrol" | "circle" | "shoreline" {
  if (["campfire", "beds", "sunny", "highrock", "rocks", "palms"].includes(zone)) return "stay";
  if (zone === "sky" || zone === "farsea" || zone === "moonlit") return "circle";
  return "roam";
}
