import { DECOR_RESERVED } from '../decorationLayout';
import { landscapeAt, pathDistance } from '../landscape';
import { createWildflowers } from '../wildflowers';
import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BERRY_BUSHES, GRASS_CLEAR, ISLAND, northScale, OBSTACLES, grassMask, obstacleDist } from "../layout";
import { terrainHeight } from "./Terrain";
import { aoAt } from "./ao";

/**
 * 草地上的小草丛和花（参考《集合啦！动物森友会》）：
 * - 小草丛：6~7 片宽叶向外拱起的矮草（约 15 厘米），稀疏点缀在草地台地上；
 * - 花：郁金香、波斯菊、三色堇，以疏密有致的小花簇散落在各区域边缘。
 * 都是程序化建模 + InstancedMesh；花瓣用实例色上色，茎叶保持绿色；顶点着色器做轻微的风吹摆动。
 */
function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

type Part = { pos: number[]; col: number[]; petal: number[]; bend: number[] };
const newPart = (): Part => ({ pos: [], col: [], petal: [], bend: [] });
function toGeo(p: Part) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p.pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(p.col, 3));
  g.setAttribute("aPetal", new THREE.Float32BufferAttribute(p.petal, 1));
  g.setAttribute("aBend", new THREE.Float32BufferAttribute(p.bend, 1));
  g.computeVertexNormals();
  return g;
}
/** 把普通几何体转成带颜色 / 花瓣标记的部件 */
function fromGeometry(src: THREE.BufferGeometry, color: THREE.Color, petal: number, maxY: number): THREE.BufferGeometry {
  const g = src.index ? src.toNonIndexed() : src.clone();
  g.deleteAttribute("uv");
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3), pet = new Float32Array(n), bend = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    col.set([color.r, color.g, color.b], i * 3);
    pet[i] = petal;
    bend[i] = Math.max(0, g.attributes.position.getY(i) / maxY) ** 2;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aPetal", new THREE.BufferAttribute(pet, 1));
  g.setAttribute("aBend", new THREE.BufferAttribute(bend, 1));
  return g;
}

/** 一片拱起的尖叶（中间略宽、两端尖），沿 yaw 方向伸出 */
function leaf(p: Part, yaw: number, len: number, width: number, lift: number, base: THREE.Color, tip: THREE.Color, y0 = 0, petal = 0) {
  const SEG = 5;
  const ca = Math.cos(yaw), sa = Math.sin(yaw);
  const pt = (t: number, side: number) => {
    const w = width * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.08)) * (1 - t * 0.3);
    const out = len * t;
    const up = lift * Math.sin(t * Math.PI * 0.75) + y0;
    // 叶片中脉微微隆起（V 形），更有体积感
    const fold = Math.abs(side) * w * 0.35;
    return [out * ca - side * w * sa, up - fold + 0.004, out * sa + side * w * ca];
  };
  const c = new THREE.Color();
  for (let i = 0; i < SEG; i++) {
    const t0 = i / SEG, t1 = (i + 1) / SEG;
    const q = [pt(t0, -1), pt(t0, 0), pt(t0, 1), pt(t1, -1), pt(t1, 0), pt(t1, 1)];
    const tris = [[0, 1, 3], [1, 4, 3], [1, 2, 4], [2, 5, 4]];
    for (const tri of tris)
      for (const k of tri) {
        const v = q[k];
        const t = k < 3 ? t0 : t1;
        p.pos.push(v[0], v[1], v[2]);
        c.copy(base).lerp(tip, t);
        if (k === 1 || k === 4) c.multiplyScalar(1.08); // 中脉稍亮
        p.col.push(c.r, c.g, c.b);
        p.petal.push(petal);
        p.bend.push(t * t);
      }
  }
}

export function tuftGeometry() {
  const p = newPart();
  const r = rand(91);
  const base = new THREE.Color("#628c49"), tip = new THREE.Color("#aecb7e");
  const n = 7;
  for (let i = 0; i < n; i++) leaf(p, (i / n) * Math.PI * 2 + r() * 0.4, 0.13 + r() * 0.06, 0.03, 0.09 + r() * 0.06, base, tip, 0, 1);
  // 中心几片更直立
  for (let i = 0; i < 3; i++) leaf(p, r() * Math.PI * 2, 0.05, 0.022, 0.17 + r() * 0.04, base, tip, 0, 1);
  return toGeo(p);
}

const GREEN = new THREE.Color("#729955");
const WHITE = new THREE.Color("#ffffff");
function stemAndLeaves(height: number, leaves: number) {
  const stem = new THREE.CylinderGeometry(0.008, 0.011, height, 5, 1);
  stem.translate(0, height / 2, 0);
  const parts = [fromGeometry(stem, GREEN, 0, height)];
  const p = newPart();
  for (let i = 0; i < leaves; i++) leaf(p, i * 2.4 + 0.5, 0.1, 0.03, 0.07, new THREE.Color("#628c49"), new THREE.Color("#7cc954"));
  parts.push(toGeo(p));
  return parts;
}
function tulipGeometry() {
  const h = 0.2;
  const parts = stemAndLeaves(h, 2);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const s = new THREE.SphereGeometry(0.03, 10, 8);
    s.scale(0.85, 1.6, 0.55);
    s.translate(0, 0.035, 0.012);
    s.rotateX(-0.12);
    s.rotateY(a);
    s.translate(0, h, 0);
    parts.push(fromGeometry(s, WHITE, 1, h + 0.08));
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false)!;
}
function cosmosGeometry() {
  const h = 0.24;
  const parts = stemAndLeaves(h, 2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = new THREE.SphereGeometry(0.03, 8, 6);
    s.scale(0.6, 0.12, 1.2);
    s.translate(0, 0, 0.042);
    s.rotateX(-0.35); // 花盘朝上偏前
    s.rotateY(a);
    s.translate(0, h, 0);
    parts.push(fromGeometry(s, WHITE, 1, h + 0.05));
  }
  const c = new THREE.SphereGeometry(0.018, 10, 8);
  c.scale(1, 0.6, 1);
  c.translate(0, h + 0.006, 0);
  parts.push(fromGeometry(c, new THREE.Color("#f4c430"), 0, h + 0.05));
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false)!;
}
function pansyGeometry() {
  const h = 0.1;
  const parts = stemAndLeaves(h, 3);
  const r = 0.032;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const s = new THREE.SphereGeometry(r, 10, 6);
    s.scale(1, 0.25, 0.9);
    s.translate(0, 0, r * 0.8);
    s.rotateX(-0.5);
    s.rotateY(a);
    s.translate(0, h, 0);
    parts.push(fromGeometry(s, WHITE, 1, h + 0.05));
  }
  const c = new THREE.SphereGeometry(0.012, 8, 6);
  c.translate(0, h + 0.01, 0);
  parts.push(fromGeometry(c, new THREE.Color("#3a2a4a"), 0, h + 0.05));
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false)!;
}

function makeMaterial(uniforms: { uTime: { value: number };uWind:{value:number} }) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8, envMapIntensity: 0.4 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;shader.uniforms.uWind=uniforms.uWind;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uWind;\nattribute float aBend;\nattribute float aPetal;")
      .replace(
        "#include <color_vertex>",
        `#include <color_vertex>
        #ifdef USE_INSTANCING_COLOR
          // 只有花瓣吃实例色，茎叶保持本色（小草丛整株标记为“花瓣”，实例色用来做遮蔽变暗）
          vColor.rgb = mix(color.rgb, color.rgb * instanceColor.rgb, aPetal);
        #endif`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec3 iw = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
        transformed.x += sin(uTime * 1.6 + iw.x * 1.3 + iw.z * 0.7) * 0.025 * aBend * uWind;
        transformed.z += cos(uTime * 1.3 + iw.z * 1.1) * 0.02 * aBend * uWind;`
      )
      .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nobjectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), 0.55));");
  };
  return mat;
}

/** 能种东西的地方：草地台地顶面，避开功能区、障碍和树果丛 */
function plantable(x: number, z: number, pad: number) {
  if (Math.max(grassMask(x,z),landscapeAt(x,z).lawn) < 0.78 || pathDistance(x,z)<1.05) return false;
  if (GRASS_CLEAR.some((c) => Math.hypot(c.x - x, c.z - z) < c.r)) return false;
  if ([...OBSTACLES,...DECOR_RESERVED].some((o) => obstacleDist(o, x, z) < o.r * 0.8 + pad)) return false;
  if (BERRY_BUSHES.some((b) => Math.hypot(b.x - x, b.z - z) < 1.1 * b.s)) return false;
  return true;
}

export function Grass({ lite = false,wind=.25 }: { lite?: boolean;wind?:number }) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 },uWind:{value:1} }), []);
  const mat = useMemo(() => makeMaterial(uniforms), [uniforms]);
  useFrame((_, dt) => {
    uniforms.uTime.value += Math.min(dt,.05);uniforms.uWind.value=THREE.MathUtils.damp(uniforms.uWind.value,.4+wind*2,1,Math.min(dt,.05));
  });
  const geos = useMemo(() => ({ tuft: tuftGeometry(), tulip: tulipGeometry(), cosmos: cosmosGeometry(), pansy: pansyGeometry() }), []);

  const sets = useMemo(() => {
    const r = rand(2024);
    const out: Record<string, { m: THREE.Matrix4[]; c: THREE.Color[] }> = { tuft: { m: [], c: [] }, tulip: { m: [], c: [] }, cosmos: { m: [], c: [] }, pansy: { m: [], c: [] } };
    const put = (kind: string, x: number, z: number, s: number, color: THREE.Color) => {
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(x, terrainHeight(x, z) - 0.005, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.15, r() * Math.PI * 2, (r() - 0.5) * 0.15)),
        new THREE.Vector3(s, s * (0.9 + r() * 0.25), s)
      );
      out[kind].m.push(m);
      out[kind].c.push(color);
    };
    // 小草丛：稀疏散落
    let guard = 0;
    while (out.tuft.m.length < 380 && guard++ < 20000) {
      const x = ISLAND.cx + (r() * 2 - 1) * ISLAND.rx;
      const dz = (r() * 2 - 1) * ISLAND.rz;
      const z = ISLAND.cz + dz * (dz < 0 ? northScale() : 1);
      if (!plantable(x, z, 0.1)) continue;
      const a = aoAt(x, z);
      put("tuft", x, z, 1.0 + r() * .75, new THREE.Color(a, a, a));
    }
    // Distribute loose flower clusters across all districts, keeping walking lanes open.
    for (const flower of createWildflowers()) {
      put(flower.kind, flower.x, flower.z, flower.scale, new THREE.Color(flower.color));
    }
    return out;
  }, []);

  return (
    <>
      {(Object.keys(sets) as (keyof typeof geos)[]).map((k) => {
        const set = sets[k];
        if (!set.m.length) return null;
        const count = k === "tuft" && lite ? Math.floor(set.m.length * 0.6) : set.m.length;
        return (
          <instancedMesh
            key={k + (lite ? "l" : "")}
            name={`island-vegetation-${k}`}
            args={[geos[k], mat, set.m.length]}
            castShadow={k !== "tuft"}
            receiveShadow
            frustumCulled={false}
            ref={(im) => {
              if (!im) return;
              set.m.forEach((mx, i) => {
                im.setMatrixAt(i, mx);
                im.setColorAt(i, set.c[i]);
              });
              im.instanceMatrix.needsUpdate = true;
              if (im.instanceColor) im.instanceColor.needsUpdate = true;
              im.count = count;
            }}
          />
        );
      })}
    </>
  );
}
