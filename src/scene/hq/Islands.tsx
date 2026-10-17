import { useMemo } from "react";
import * as THREE from "three";
import { Palms } from "./Palm";
import type { PalmSpot } from "../layout";

/**
 * 远处零星分布的小岛（替代原来海里的巨石和远山）：
 * 近处几座小沙洲带椰子树，远处是更高大的林岛；配合高度雾，越远越淡，呈现出远近层次。
 * 岛体是极坐标网格按噪声隆起：水线附近是沙滩，陡坡露出岩壁，坡顶是起伏的林冠。
 */
interface IslandDef { x: number; z: number; R: number; H: number; seed: number; palms: number; rot: number }

const ISLANDS: IslandDef[] = [
  { x: -24, z: -30, R: 5.5, H: 2.6, seed: 3, palms: 5, rot: 0.3 },
  { x: 19, z: -36, R: 4.2, H: 1.8, seed: 7, palms: 4, rot: 1.1 },
  { x: 36, z: -16, R: 6.5, H: 3.6, seed: 11, palms: 5, rot: 2.0 },
  { x: -42, z: -14, R: 7.5, H: 4.8, seed: 17, palms: 4, rot: 0.8 },
  { x: -8, z: -66, R: 15, H: 11, seed: 23, palms: 0, rot: 0.0 },
  { x: 42, z: -74, R: 17, H: 14, seed: 29, palms: 0, rot: 1.7 },
  { x: -58, z: -56, R: 13, H: 8, seed: 31, palms: 0, rot: 2.6 },
  { x: 66, z: -36, R: 10, H: 6.5, seed: 37, palms: 0, rot: 0.5 }
];

function hash(n: number) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}
function noise2(x: number, y: number, seed: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const h = (a: number, b: number) => hash(a * 57 + b * 131 + seed * 977);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(h(ix, iy), h(ix + 1, iy), u), THREE.MathUtils.lerp(h(ix, iy + 1), h(ix + 1, iy + 1), u), v);
}
function fbm(x: number, y: number, seed: number) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < 5; i++) {
    v += a * noise2(x * f, y * f, seed + i * 13);
    f *= 2.1;
    a *= 0.5;
  }
  return v;
}

function islandGeometry(d: IslandDef) {
  const RINGS = 48, SEGS = 112;
  const pos: number[] = [];
  const idx: number[] = [];
  const outer = d.R * 1.25;
  const heightAt = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    // 不规则的海岸线
    const a = Math.atan2(z, x);
    const coast = d.R * (0.82 + fbm(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5, d.seed) * 0.4);
    const t = Math.max(0, 1 - r / coast);
    const n = fbm(x * 0.18 + 10, z * 0.18 + 10, d.seed);
    // 剖面：水线一圈平缓沙滩 → 岸边一段岩壁 → 顶上圆润的林冠
    const beach = THREE.MathUtils.smoothstep(t, 0.0, 0.08) * 0.35;
    const cliff = THREE.MathUtils.smoothstep(t, 0.1, 0.3) * 0.45;
    const dome = Math.pow(Math.max(0, t - 0.2) / 0.8, 0.6) * 0.55;
    let h = (beach / 0.35) * 0.3 + d.H * (cliff + dome) * (0.75 + n * 0.5);
    // 林冠：一团团树冠的起伏
    h += Math.pow(fbm(x * 0.7, z * 0.7, d.seed + 99), 2) * (d.H / 5) * THREE.MathUtils.smoothstep(t, 0.25, 0.4);
    return h - 0.35 + (t <= 0 ? -Math.min(1.5, (r - coast) * 0.4) : 0);
  };
  for (let i = 0; i <= RINGS; i++) {
    const r = Math.pow(i / RINGS, 0.9) * outer;
    for (let j = 0; j < SEGS; j++) {
      const a = (j / SEGS) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, heightAt(x, z), z);
    }
  }
  for (let i = 0; i < RINGS; i++)
    for (let j = 0; j < SEGS; j++) {
      const a = i * SEGS + j, b = i * SEGS + ((j + 1) % SEGS), c = (i + 1) * SEGS + j, e = (i + 1) * SEGS + ((j + 1) % SEGS);
      idx.push(a, b, c, b, e, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // 顶点色：沙滩 / 岩壁 / 草坡 / 林冠
  const nrm = g.attributes.normal;
  const col = new Float32Array(nrm.count * 3);
  const sand = new THREE.Color("#efe6d2"), rock = new THREE.Color("#8f8a80"), grass = new THREE.Color("#5fae3e"), forest = new THREE.Color("#2e7a35"), c = new THREE.Color();
  for (let i = 0; i < nrm.count; i++) {
    const y = pos[i * 3 + 1], x = pos[i * 3], z = pos[i * 3 + 2];
    const slope = nrm.getY(i);
    const n = fbm(x * 0.5, z * 0.5, d.seed + 7);
    c.copy(grass).lerp(forest, THREE.MathUtils.clamp((y / d.H) * 1.6 + n * 0.5 - 0.3, 0, 1));
    // 只有很陡的岩壁露出岩石
    if (slope < 0.62) c.lerp(rock, THREE.MathUtils.smoothstep(0.62 - slope, 0, 0.2));
    if (y < 0.45) c.lerp(sand, THREE.MathUtils.smoothstep(0.45 - y, 0, 0.25));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return { geo: g, heightAt };
}

export function DistantIslands() {
  const built = useMemo(() => ISLANDS.map((d) => ({ d, ...islandGeometry(d) })), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []);
  // 近处小岛的椰子树：种在沙滩和草坡交界处
  const palms = useMemo(() => {
    const out: PalmSpot[] = [];
    built.forEach(({ d, heightAt }) => {
      for (let i = 0; i < d.palms; i++) {
        const a = d.seed + i * 2.3 + hash(d.seed + i) * 0.8;
        const r = d.R * (0.45 + hash(i * 7 + d.seed) * 0.25);
        const lx = Math.cos(a) * r, lz = Math.sin(a) * r;
        const wx = d.x + lx * Math.cos(d.rot) - lz * Math.sin(d.rot);
        const wz = d.z + lx * Math.sin(d.rot) + lz * Math.cos(d.rot);
        out.push({ x: wx, z: wz, y: heightAt(lx, lz) - 0.17, s: 1.5 + hash(i + d.seed * 3) * 0.6, r: hash(i * 3 + d.seed) * 360, lean: 0.2 + hash(i) * 0.3, variant: i % 3 });
      }
    });
    return out;
  }, [built]);
  return (
    <group>
      {built.map(({ d, geo }, i) => (
        <mesh key={i} geometry={geo} material={mat} position={[d.x, -0.12, d.z]} rotation-y={-d.rot} receiveShadow={false} />
      ))}
      <Palms spots={palms} shadows={false} />
    </group>
  );
}
