import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ISLAND, grassMask } from "../layout";
import { terrainHeight } from "./Terrain";

/**
 * 动森式的天空和小生命：
 * - 卡通云：几个圆团拼成、底部压平，上白下淡蓝，在远处慢慢飘；
 * - 蝴蝶：白天在草地台地的花丛上方扑扇翅膀；
 * - 萤火虫：傍晚和夜里在草丛上方一闪一闪。
 */
function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

// ---------- 卡通云 ----------
function cloudGeometry(seed: number) {
  const r = rand(seed);
  const parts: THREE.BufferGeometry[] = [];
  const n = 5 + Math.floor(r() * 4);
  const lumps: { x: number; y: number; z: number; s: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    const mid = 1 - Math.abs(t) * 1.4; // 中间的团更大更高
    lumps.push({ x: t * 6.5 + (r() - 0.5) * 0.6, y: mid * 1.1 + r() * 0.4, z: (r() - 0.5) * 1.4, s: 1.2 + mid * 1.1 + r() * 0.4 });
  }
  const top = new THREE.Color("#ffffff"), bottom = new THREE.Color("#d6e6f7");
  const c = new THREE.Color();
  for (const L of lumps) {
    const g = new THREE.IcosahedronGeometry(L.s, 3);
    g.deleteAttribute("uv");
    g.deleteAttribute("normal");
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + L.x, z = pos.getZ(i) * 0.8 + L.z;
      // 底部压平：所有云团的底都在同一个平面上
      const y = Math.max(-0.2, pos.getY(i) + L.y);
      pos.setXYZ(i, x, y, z);
      c.copy(bottom).lerp(top, THREE.MathUtils.smoothstep(y, -0.2, 1.2));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = mergeVertices(g, 1e-4);
    m.computeVertexNormals();
    parts.push(m);
  }
  return mergeGeometries(parts, false)!;
}

const CLOUDS = [
  { x: -34, y: 15, z: -58, s: 1.3, seed: 3 },
  { x: -6, y: 19, z: -66, s: 1.6, seed: 11 },
  { x: 24, y: 16, z: -60, s: 1.2, seed: 19 },
  { x: 48, y: 13, z: -42, s: 1.0, seed: 27 },
  { x: -56, y: 12, z: -34, s: 1.0, seed: 35 },
  { x: 8, y: 23, z: -80, s: 1.9, seed: 43 },
  { x: 62, y: 18, z: -70, s: 1.4, seed: 51 }
];

export function CartoonClouds({ night,wind=.25,cover=0 }: { night: boolean;wind?:number;cover?:number }) {
  const geos = useMemo(() => CLOUDS.map((c) => cloudGeometry(c.seed)), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: "#ffffff", emissiveIntensity: 0.35, envMapIntensity: 0.3 }), []);
  mat.emissiveIntensity = night ? 0.02 : 0.35;
  mat.color.set(night ? "#5a6a90" : "#ffffff").lerp(new THREE.Color(night?"#3a4b62":"#a8bdc7"),cover*.7);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const cloudTime=useRef(0);
  useFrame((_,dt) => {
    const t = cloudTime.current+=Math.min(dt,.05)*(.6+wind);
    CLOUDS.forEach((c, i) => {
      const m = refs.current[i];
      if (!m) return;
      // 慢慢向右飘，飘出视野后从左边回来
      const span = 160;
      const x = ((c.x + t * (0.35 + i * 0.04) + span / 2) % span + span) % span - span / 2;
      m.position.set(x, c.y + Math.sin(t * 0.1 + i) * 0.3, c.z);
    });
  });
  return (
    <>
      {CLOUDS.map((c, i) => (
        <mesh key={i} ref={(m) => (refs.current[i] = m)} geometry={geos[i]} material={mat} scale={c.s} />
      ))}
    </>
  );
}

// ---------- 蝴蝶 ----------
function wingGeometry() {
  // 一侧翅膀：上翅大、下翅小的圆润形状
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.05, 0.12, 0.2, 0.16, 0.2, 0.06);
  s.bezierCurveTo(0.2, 0.0, 0.12, -0.02, 0.06, -0.01);
  s.bezierCurveTo(0.14, -0.04, 0.13, -0.12, 0.06, -0.11);
  s.bezierCurveTo(0.02, -0.1, 0.0, -0.04, 0, 0);
  const g = new THREE.ShapeGeometry(s, 10);
  g.rotateX(-Math.PI / 2);
  return g;
}
const BUTTERFLY_COLORS = ["#ffd84a", "#ffffff", "#7fc8ff", "#ff9fd0", "#ffb04a", "#c9b6ff"];

export function Butterflies({ active }: { active: boolean }) {
  const wing = useMemo(wingGeometry, []);
  const homes = useMemo(() => {
    // 在草地台地上找几个花丛中心
    const r = rand(77);
    const out: { x: number; z: number; color: string; phase: number }[] = [];
    let guard = 0;
    while (out.length < 6 && guard++ < 3000) {
      const x = ISLAND.cx + (r() * 2 - 1) * ISLAND.rx;
      const z = ISLAND.cz + (r() * 2 - 1) * ISLAND.rz;
      if (grassMask(x, z) < 0.75) continue;
      out.push({ x, z, color: BUTTERFLY_COLORS[out.length % BUTTERFLY_COLORS.length], phase: r() * 10 });
    }
    return out;
  }, []);
  const mats = useMemo(() => homes.map((h) => new THREE.MeshStandardMaterial({ color: h.color, side: THREE.DoubleSide, roughness: 0.6, emissive: h.color, emissiveIntensity: 0.15 })), [homes]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    homes.forEach((h, i) => {
      const g = groups.current[i];
      if (!g) return;
      g.visible = active;
      if (!active) return;
      const p = t * 0.5 + h.phase;
      const x = h.x + Math.sin(p) * 1.1 + Math.sin(p * 2.3) * 0.3;
      const z = h.z + Math.cos(p * 0.8) * 0.9;
      const y = terrainHeight(h.x, h.z) + 0.55 + Math.sin(p * 3.1) * 0.25 + Math.abs(Math.sin(t * 7 + i)) * 0.05;
      const dx = Math.cos(p) * 1.1 + Math.cos(p * 2.3) * 0.69, dz = -Math.sin(p * 0.8) * 0.72;
      g.position.set(x, y, z);
      g.rotation.y = Math.atan2(dx, dz);
      const flap = Math.sin(t * 16 + i) * 0.9;
      (g.children[0] as THREE.Object3D).rotation.z = 0.25 + flap;
      (g.children[1] as THREE.Object3D).rotation.z = -0.25 - flap;
    });
  });
  return (
    <>
      {homes.map((_, i) => (
        <group key={i} name={`garden-butterfly-${i}`} ref={(g) => (groups.current[i] = g)} scale={0.56}>
          <mesh geometry={wing} material={mats[i]} rotation-y={Math.PI / 2} />
          <mesh geometry={wing} material={mats[i]} rotation-y={Math.PI / 2} scale={[1, 1, -1]} />
        </group>
      ))}
    </>
  );
}

// ---------- 萤火虫 ----------
const FIREFLY_VERT = /* glsl */ `
  uniform float uTime;
  attribute float aSeed;
  varying float vA;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.4 + aSeed * 20.0) * 0.6;
    p.z += cos(uTime * 0.35 + aSeed * 13.0) * 0.6;
    p.y += sin(uTime * 0.6 + aSeed * 7.0) * 0.25;
    vA = pow(0.5 + 0.5 * sin(uTime * 2.2 + aSeed * 40.0), 3.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = 70.0 / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const FIREFLY_FRAG = /* glsl */ `
  uniform float uOn;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vA * uOn;
    gl_FragColor = vec4(vec3(1.0, 0.95, 0.55) * 1.6, a);
  }
`;
export function Fireflies({ active }: { active: boolean }) {
  const { geo, mat } = useMemo(() => {
    const r = rand(9);
    const pos: number[] = [], seed: number[] = [];
    let guard = 0;
    while (seed.length < 36 && guard++ < 4000) {
      const x = ISLAND.cx + (r() * 2 - 1) * ISLAND.rx;
      const z = ISLAND.cz + (r() * 2 - 1) * ISLAND.rz;
      if (grassMask(x, z) < 0.5) continue;
      pos.push(x, terrainHeight(x, z) + 0.4 + r() * 0.6, z);
      seed.push(r());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({ vertexShader: FIREFLY_VERT, fragmentShader: FIREFLY_FRAG, uniforms: { uTime: { value: 0 }, uOn: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    return { geo: g, mat: m };
  }, []);
  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt;
    mat.uniforms.uOn.value = THREE.MathUtils.lerp(mat.uniforms.uOn.value, active ? 1 : 0, 0.05);
  });
  return <points geometry={geo} material={mat} renderOrder={21} frustumCulled={false} />;
}
