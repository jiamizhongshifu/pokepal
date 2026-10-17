import { DECOR_LAYOUT, DECOR_POSTS, DECOR_STONES } from './decorationLayout';
import type { FurnitureId } from '../lib/islandLiving';
/**
 * 家园场景布局：《风/波》式热带海岛 + 宝可梦世界道具。
 *
 * 比例约定：1 个单位 ≈ 1 米。宝可梦按真实身高轻度压缩显示（皮卡丘约 0.75 米、卡比兽约 1.8 米、拉普拉斯约 2 米），
 * 道具按同一比例摆放：帐篷约 2 米高，原木凳约 0.45 米高刚好够小宝可梦坐，椰子树约 6~8 米，礁石 1.5~2 米。
 */
export interface Placement {
  m: string;
  x: number;
  z: number;
  /** 相对地面的高度偏移；abs=true 时为绝对高度 */
  y?: number;
  abs?: boolean;
  r?: number;
  s?: number;
  /** 非等比缩放（覆盖 s） */
  sv?: [number, number, number];
  /** 绕 x / z 轴倾斜（度） */
  tilt?: [number, number];
  shadow?: boolean;
  /** 程序化道具的款式（花色等） */
  v?: number;
}

/** 岛屿：椭圆形，中央是浅色沙地广场，后半圈是一条茂密草带，外圈沙滩伸进海里 */
export const ISLAND = { cx: -2, cz: -2, rx: 13.5, rz: 11.4, beach: 1.3 };
export let islandExpansion=0;
export function configureIslandExpansion(level:number){islandExpansion=Math.max(0,Math.min(2,level));}
export const northScale=()=>1+islandExpansion*.32;
export const islandK = (x: number, z: number) => Math.hypot((x - ISLAND.cx) / ISLAND.rx, (z - ISLAND.cz) / (ISLAND.rz*(z<ISLAND.cz?northScale():1)));
export function onIsland(deg: number, k: number) {
  const a = (deg * Math.PI) / 180;
  return { x: ISLAND.cx + Math.cos(a) * ISLAND.rx * k, z: ISLAND.cz + Math.sin(a) * ISLAND.rz * k * (Math.sin(a)<0?northScale():1) };
}
const sstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** 草带遮罩（0~1）：只在岛的后半圈（远离镜头）形成一条不规则的草带，前面和中央都是沙地 */
export function grassMask(x: number, z: number) {
  const k = islandK(x, z);
  const n = Math.sin(x * 1.3) * 0.045 + Math.cos(z * 1.7 + x * 0.4) * 0.035 + Math.sin(x * 3.1 + z * 2.3) * 0.015;
  const inner = 0.72 + n;
  const outer = 1.0 + n * 0.5;
  const band = sstep(inner - 0.05, inner + 0.05, k) * (1 - sstep(outer - 0.04, outer + 0.03, k));
  const back = sstep(1.6, -0.6, z - ISLAND.cz + Math.sin(x * 0.5) * 0.4);
  return band * back;
}

// ---------- 功能区 ----------
export const CAMPFIRE = { x: 0.4, z: -5.7 };
export const TENT = { x: -6.8, z: -6.8 };
/** 冥想石（超梦）：岸边一块约 1 米高的岩石，顶面高度 top */
export const HIGH_ROCK = { x: 10.4, z: 4.6, top: 0.86 };
/** 栈桥：从东岸伸进海里，桥面高出海面约 0.4 米 */
export const PIER = { x: 10.7, z: -0.2, deck: 0.28 };
export const PIER_LENGTH_SCALE = .75;

/** 石组以真实尺寸建模，碰撞和遮蔽共用同一份布局。 */
export const COAST_ROCKS: { x: number; z: number; size: [number, number, number]; yaw: number; top?: number }[] = [
  { ...HIGH_ROCK, size: [2.05, 0.9, 1.75], yaw: 0.25 },
  { x: 11.35, z: 5.2, size: [0.72, 0.34, 0.65], yaw: -0.4 },
  { ...onIsland(-24, 1.27), size: [1.4, 0.72, 1.15], yaw: 0.5 },
  { ...onIsland(-15, 1.33), size: [0.95, 0.46, 0.8], yaw: 2.1 },
  { ...onIsland(62, 1.22), size: [1.2, 0.58, 1.0], yaw: -0.5 },
  { ...onIsland(160, 1.25), size: [0.9, 0.44, 0.75], yaw: 0.2 }
];

/** 精灵球睡垫：直径按要睡的宝可梦大小给几档 */
export const CUSHIONS: { x: number; z: number; d: number }[] = [
  { x: -9.4, z: -8.3, d: 1.5 }, { x: -6.6, z: -10.0, d: 1.2 },
  { x: -4.3, z: -9.6, d: 1.4 }, { x: -10.0, z: -5.7, d: 1.1 },
  { x: -1.0, z: -9.2, d: 1.3 }, { x: -11.4, z: -7.0, d: 1.0 }
];
/** 树果丛：橙橙果（蓝）、桃桃果（粉）、樱子果（红） */
export const BERRY_BUSHES: { x: number; z: number; berry: "oran" | "pecha" | "cheri"; s: number }[] = [
  { x: 5.4, z: -7.7, berry: "oran", s: 0.85 },
  { x: 8.7, z: -3.2, berry: "pecha", s: 0.85 },
  { x: -10.8, z: -5.3, berry: "cheri", s: 0.8 },
  { x: 4.7, z: 3.2, berry: "oran", s: 1.2 }
];
/** 篝火边的宝可梦食盆 */
export const BOWLS: { x: number; z: number }[] = [
  { x: CAMPFIRE.x + 1.3, z: CAMPFIRE.z + 1.5 },
  { x: CAMPFIRE.x - 1.4, z: CAMPFIRE.z + 1.4 },
  { x: CAMPFIRE.x - 2.6, z: CAMPFIRE.z + 1.6 }
];
export const SIGN = { x: 2.5, z: 4.7 };

// ---------- 海岸椰树：不再围成等距的一圈，低矮的两棵保留吊床锚点 ----------
export interface PalmSpot { x: number; z: number; s: number; r: number; lean: number; variant: number; y?: number }
const palmRing: [number, number, number][] = [
  [-150, 1.06, 1.2], [-112, .96, 1.38], [-70, .94, 1.18],
  [-28, 1.08, 1.3], [-5, 1.12, 1.05], [150, 1.08, 1.14], [172, 1.05, 1.3]
];
export const PALMS: PalmSpot[] = palmRing.map(([deg, k, s], i) => {
  const { x, z } = onIsland(deg, k);
  return { x, z, s:s*.88, r: -deg + 90, lean: 0.25 + (i % 3) * 0.1, variant: i % 3 };
});

// ---------- 高精度模型（Poly Haven，CC0，Blender 减面后约 5k~20k 面） ----------
export const HQ_DIR = "/models/hq/";
const logSeat = (x: number, z: number, r: number): Placement => ({ m: "log_seat", x, z, r });
const shell = (deg: number, k: number, r: number, s = 1.7): Placement => ({ ...onIsland(deg, k), m: "lambis_shell", r, s, y: -0.01 });
export const HQ_PROPS: Placement[] = [
  // 篝火：石砌火塘（直径约 1.8 米）+ 三根原木长凳（程序化建模，长 1.9 米、高 0.42 米，小宝可梦刚好坐上去）
  logSeat(CAMPFIRE.x - 2.0, CAMPFIRE.z, 90),
  logSeat(CAMPFIRE.x + 2.0, CAMPFIRE.z, 92),
  logSeat(CAMPFIRE.x, CAMPFIRE.z - 1.9, 4),
  // 帐篷边的露营物资
  { m: "wooden_crate_01", x: TENT.x - 0.6, z: TENT.z - 2.5, r: 75, s: 1.1 },
  { m: "wooden_lantern_01", x: TENT.x - 0.6, z: TENT.z - 2.5, r: 20, s: 1.15, y: 0.39 },
  { m: "wooden_bucket_01", x: TENT.x - 0.5, z: TENT.z + 2.4, r: 40, s: 1.2 },
  { m: "wicker_basket_01", x: TENT.x - 1.95, z: TENT.z + 0.6, r: -20, s: 1.7 },
  // 栈桥
  { m: "pier", x: PIER.x, z: PIER.z, r: -90, sv:[1,1,PIER_LENGTH_SCALE], abs: true, y: PIER.deck - 2.6 },
  // 沙滩上的海螺壳
  shell(70, 0.95, 30), shell(100, 1.1, 160, 1.4), shell(20, 1.12, 260), shell(130, 1.02, 80, 1.5), shell(-5, 1.18, 200, 1.3),
  // 动森式圆团花灌木（程序化，见 Garden.tsx）：只种在草地台地和岛边缘，不挡宝可梦。v 是花色
  { m: "shrub", x: -10.6, z: -8.7, s: 0.7, r: 20, v: 0 },
  { m: "shrub", x: -10.5, z: -7.6, s: 0.9, r: 200, v: 2 },
  { m: "shrub", x: -8.7, z: -9.2, s: 0.85, r: 40, v: 1 },
  // 雪松：台地后方两棵，丰富天际线层次（位置由脚本挑出，和椰子树、果树都不重叠）
  { m: "cedar", x: -5.3, z: -12.2, s: 1.15, r: 0 },
  { m: "cedar", x: 0.5, z: -12.7, s: 0.82, r: 40 },
  // 沙滩上的海星
  { ...onIsland(30, 1.15), m: "starfish", r: 20, v: 0 },
  { ...onIsland(78, 1.12), m: "starfish", r: 70, v: 1 },
  { ...onIsland(118, 1.1), m: "starfish", r: 140, v: 0 },
  { ...onIsland(152, 1.13), m: "starfish", r: 210, v: 1 },
  { ...onIsland(-4, 1.21), m: "starfish", r: 300, v: 0 }
];

// ---------- 动森式户外摆设（程序化，见 Outdoor.tsx） ----------
/** 踏石小路：从前方海滩通到篝火，再分一支到帐篷门口（平铺在地上，可以走） */
export const PATH_ROUTES: [number, number][][] = [
  [[4,-.3],[4.5,-1.5],[4.9,-2.4],[7,-2.7]],
  [[0.9, 7.0], [0.3, 4.8], [0.6, 2.0], [0.1, 0.8], [0.4, -0.5]],
  [[0.1, 0.8], [2.2, 0.2], [4.0, -0.3], [5.4, -2.3], [8.3, -1.0], [10.4, -0.2]],
  [[0.1, 0.8], [-3.0, 2.2], [-4.0, 3.5], [-6.3, 4.6]],
  [[0.1, 0.8], [-2.8, -0.7], [-3.6, -3.0], [-4.6, -4.2], [-6.8, -4.1]],
  [[-2.8, -0.7], [-4.4, 0.0], [-6.0, 0.2], [-8.6, -0.1]],
  [[0.1, 0.8], [1.1, -1.5], [0.0, -3.5]]
];
/** 遮阳伞 + 浴巾 + 沙滩球（左前方沙滩） */
export const PICNIC = { x: -2.5, z: 6.1 };
export const PARASOL = { x: -4.9, z: 5.0 };
/** Cloth outline includes a margin for petals; it remains walkable. */
export const BEACH_TOWEL = {x:PARASOL.x+.2,z:PARASOL.z+.1,r:1.1};
/** 吊床：挂在左侧海滩两棵椰子树之间（前面没有遮挡） */
export const HAMMOCK_PALMS: [number, number] = [6, 5];
/** 木栅栏：沿帐篷背后的一段弧 */
export const FENCE = { cx: TENT.x, cz: TENT.z, r: 2.35, from: -168, to: -86 };
/** 动森式圆灯：栈桥口、营地后方、路牌旁；夜里会亮 */
export const LAMPS: { x: number; z: number }[] = [
  // 岸侧灯柱与同步外移的栈桥保持净距。
  { x: 9.45, z: 0.65 },
  { x: -1.8, z: -9.3 },
  { x: -11.5, z: 1.7 }
];


/** New districts use the same coordinates for props, interaction targets and collision. */
export const PLAYGROUND = {
  ball: { x: -7.8, z: 1.0 },
  music: { x: -11.2, z: -1.5 },
  sand: { x: -6.8, z: -2.3 },
  windmill: { x: 6.8, z: -1.0 }
};

/** Raised beds sit behind a continuous front access lane. */
export const FARM_PLOTS = [{x:2.7,z:-4.5},{x:4.9,z:-4.5},{x:7.1,z:-4.5}];
export const FARM_ENTRY = {x:4.9,z:-2.4};

/** 岛上的果树和休憩长椅；鲜花由地表植被统一散布。 */
export const PILOT_GARDEN = {
  tree: { x: 8.5, z: 2.7 },
  // 小路西侧的休憩区，座面朝向东侧草坪。
  bench: { x: -1.9, z: 3.8, yaw: Math.PI / 2 }
};
/** 树冠留在功能区外缘；树干、地面阴影、伙伴活动使用同一份位置。 */
export type GroveKind = 'broadleaf' | 'birch' | 'blossom';
export const GROVE_TREES: {id:string;kind:GroveKind;x:number;z:number;s:number;yaw:number;approach?:{x:number;z:number}}[] = [
  {id:'camp-canopy',kind:'broadleaf',x:-9.4,z:-9.8,s:1,yaw:.5,approach:{x:-1.6,z:0}},
  {id:'camp-edge',kind:'broadleaf',x:-12,z:-6.7,s:.78,yaw:2.2,approach:{x:-1.6,z:1.5}},
  {id:'play-shade',kind:'broadleaf',x:-9.7,z:2.7,s:.72,yaw:1.3},
  {id:'picnic-blossom',kind:'blossom',x:-7.7,z:4.9,s:.8,yaw:.3},
  {id:'orchard-birch',kind:'birch',x:4.8,z:-10.2,s:1,yaw:1.8,approach:{x:0,z:-1.6}},
  {id:'orchard-blossom',kind:'blossom',x:8.1,z:-8.6,s:.65,yaw:2.5,approach:{x:1.6,z:0}}
];
export const GRASS_CLEAR: { x: number; z: number; r: number }[] = [
  ...FARM_PLOTS.map(p=>({...p,r:1.7})),
  {...FARM_ENTRY,r:1.5},
  ...Object.values(PLAYGROUND).map(p => ({ ...p, r: 1.5 })),
  { ...PILOT_GARDEN.bench, r: 1.1 },
  { ...PICNIC, r: 1.6 },
  BEACH_TOWEL,
  { x: CAMPFIRE.x, z: CAMPFIRE.z, r: 3.0 },
  { x: TENT.x, z: TENT.z, r: 2.6 },
  ...CUSHIONS.map((c) => ({ x: c.x, z: c.z, r: c.d * 0.8 })),
  { x: SIGN.x, z: SIGN.z, r: 0.8 }
];

/**
 * 宝可梦走动时要绕开的障碍：圆形（中心 + 半径），或胶囊形（线段 x,z → x2,z2 + 半径）。
 * water=true 的障碍水里的宝可梦也要绕开（栈桥）。
 */
export interface Obstacle { x: number; z: number; r: number; x2?: number; z2?: number; water?: boolean; decoration?: boolean; height?:number; airRadius?:number; canopyBottom?:number }
/** 栈桥占地：按模型的纵向缩放同步桥面中心线，宽约 2.5 米 */
export const PIER_SPAN = { x1: PIER.x + 0.85 * PIER_LENGTH_SCALE, x2: PIER.x + 7.65 * PIER_LENGTH_SCALE, z: PIER.z + 0.03, r: 1.28 };
/** 点到障碍的最近点（圆形障碍就是圆心） */
export function obstacleNearest(o: Obstacle, x: number, z: number) {
  if (o.x2 === undefined || o.z2 === undefined) return { x: o.x, z: o.z };
  const vx = o.x2 - o.x, vz = o.z2 - o.z;
  const t = Math.max(0, Math.min(1, ((x - o.x) * vx + (z - o.z) * vz) / (vx * vx + vz * vz)));
  return { x: o.x + vx * t, z: o.z + vz * t };
}
export function obstacleDist(o: Obstacle, x: number, z: number) {
  const c = obstacleNearest(o, x, z);
  return Math.hypot(x - c.x, z - c.z);
}
const OBSTACLE_R: Record<string, number> = { wooden_crate_01: 0.55, wooden_bucket_01: 0.3, wicker_basket_01: 0.4, shrub: 0.95, cedar: 1.25 };
export const OBSTACLES: Obstacle[] = [
  ...GROVE_TREES.map(p=>({x:p.x,z:p.z,r:.4*p.s,height:4.2*p.s,airRadius:1.65*p.s,canopyBottom:1.35*p.s})),
  {x:2,z:-5.65,x2:7.8,z2:-5.65,r:.09},
  {x:1.7,z:-3.5,r:.2},
  ...FARM_PLOTS.map(p=>({x:p.x-.35,z:p.z,x2:p.x+.35,z2:p.z,r:.65})),
  { ...PLAYGROUND.music, r: 1.12 },
  { ...PLAYGROUND.sand, r:1.24,height:.22 },
  { ...PLAYGROUND.ball, r:.85,height:1.1 },
  ...[-.85,.85].map(dx=>({x:PLAYGROUND.ball.x+dx,z:PLAYGROUND.ball.z-.6,r:.1,height:.75})),
  { ...PLAYGROUND.windmill, r: 0.3 },
  { ...PILOT_GARDEN.tree, r: 1.1,height:3.2,airRadius:1.5 },
  { x: PILOT_GARDEN.bench.x, z: PILOT_GARDEN.bench.z - 0.7, x2: PILOT_GARDEN.bench.x, z2: PILOT_GARDEN.bench.z + 0.7, r: 0.42 },
  { x: TENT.x, z: TENT.z, r: 1.9 },
  ...HQ_PROPS.filter((p) => p.m === "log_seat").map((p) => {const a=(p.r??0)*Math.PI/180,dx=Math.cos(a)*.75,dz=-Math.sin(a)*.75;return {x:p.x-dx,z:p.z-dz,x2:p.x+dx,z2:p.z+dz,r:.25,height:.45};}),
  ...HQ_PROPS.filter((p) => OBSTACLE_R[p.m]).map((p) => ({ x: p.x, z: p.z, r: OBSTACLE_R[p.m] * (p.m === "shrub" ? (p.s ?? 1) : 1),height:(p.m==="cedar"?3.4:p.m==="shrub"?1.4:1)*(p.s??1) })),
  ...PALMS.map((p) => ({ x: p.x, z: p.z, r: 0.6,height:8*p.s,airRadius:1.8*p.s,canopyBottom:4.3*p.s })),
  ...BERRY_BUSHES.map((b) => ({ x: b.x, z: b.z, r: 1.2 * b.s,height:2.4*b.s })),
  { x: SIGN.x, z: SIGN.z, r: 0.5 },
  ...COAST_ROCKS.map((p) => ({ x: p.x, z: p.z, r: Math.max(p.size[0], p.size[2]) / 2,water:true,height:p.size[1] })),
  { ...CAMPFIRE, r: 1.0 },
  { x: PARASOL.x, z: PARASOL.z, r: 0.45 },
  ...LAMPS.map((l) => ({ x: l.x, z: l.z, r: 0.3 })),
  { x: PALMS[HAMMOCK_PALMS[0]].x, z: PALMS[HAMMOCK_PALMS[0]].z, x2: PALMS[HAMMOCK_PALMS[1]].x, z2: PALMS[HAMMOCK_PALMS[1]].z, r: 0.5 },
  ...Array.from({ length: 6 }, (_, i) => {
    const a = ((FENCE.from + ((FENCE.to - FENCE.from) * (i + 0.5)) / 6) * Math.PI) / 180;
    return { x: FENCE.cx + Math.cos(a) * FENCE.r, z: FENCE.cz + Math.sin(a) * FENCE.r, r: 0.35 };
  }),
  // 栈桥：桥面沿 x 方向伸进海里，陆上和水里的宝可梦都不从桥柱里穿过
  { x: PIER_SPAN.x1, z: PIER_SPAN.z, x2: PIER_SPAN.x2, z2: PIER_SPAN.z, r: PIER_SPAN.r, water: true }
];

const baseObstacleCount=OBSTACLES.length;
let decorationKey='';
export let decorationRevision=0;
export function configureIslandDecorations(items:readonly FurnitureId[]){
 const key=[...items].sort().join(',');if(key===decorationKey)return;
 decorationKey=key;decorationRevision++;
 const added:Obstacle[]=items.flatMap(id=>id==='flags'?DECOR_POSTS:id==='stones'?DECOR_STONES:DECOR_LAYOUT[id]?.solid?[DECOR_LAYOUT[id]]:[]);
 OBSTACLES.splice(baseObstacleCount,OBSTACLES.length-baseObstacleCount,...added.map(o=>({...o,decoration:true})));
}
export const BASE_OBSTACLES=OBSTACLES.slice();
