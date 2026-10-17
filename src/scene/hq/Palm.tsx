import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALMS, type PalmSpot } from "../layout";
import { terrainHeight } from './Terrain';

/**
 * 程序化建模的椰子树（参考《集合啦！动物森友会》）：一节一节鼓起的环纹树干、一串饱满的椰子、
 * 8 片宽大的锯齿叶（每片叶是一整片带锯齿边的叶面，中脉隆起、两侧下垂）。叶片随风摆动。
 */

// 简单的确定性随机
function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const C_TRUNK_A = new THREE.Color("#8e6238");
const C_TRUNK_B = new THREE.Color("#c39463");
const C_LEAF_BASE = new THREE.Color("#91bc65");
const C_LEAF_MID = new THREE.Color("#74aa53");
const C_LEAF_TIP = new THREE.Color("#537f40");
const C_RIB = new THREE.Color("#b0cd87");
const C_COCO = new THREE.Color("#9aa63e");

interface Built { geo: THREE.BufferGeometry; top: THREE.Vector3 }

/** 给几何体写入顶点色和摆动权重（0=不动，1=叶尖最大） */
function paint(geo: THREE.BufferGeometry, color: (i: number, p: THREE.Vector3) => THREE.Color, sway: (i: number, p: THREE.Vector3) => number) {
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const sw = new Float32Array(pos.count);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const c = color(i, v);
    col.set([c.r, c.g, c.b], i * 3);
    sw[i] = sway(i, v);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aSway", new THREE.BufferAttribute(sw, 1));
  return geo;
}

function buildPalm(seed: number, height = 4.2): Built {
  const r = rng(seed);
  const parts: THREE.BufferGeometry[] = [];

  // ---- 树干：沿弯曲曲线的锥形管，环纹用顶点色深浅交替 ----
  const bend = 0.6 + r() * 0.5;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(bend * 0.25, height * 0.33, 0),
    new THREE.Vector3(bend * 0.7, height * 0.68, 0),
    new THREE.Vector3(bend, height, 0)
  ]);
  const SEG = 96;
  const RAD = 12;
  const RINGS = 13; // 树干节数
  const trunk = new THREE.TubeGeometry(curve, SEG, 0.16, RAD, false);
  // 锥形 + 一节一节鼓起的环纹
  const tp = trunk.attributes.position;
  const center = new THREE.Vector3();
  const bulge = (t: number) => {
    const f = (t * RINGS) % 1;
    return 1 + 0.13 * Math.sin(Math.PI * Math.min(1, f * 1.15));
  };
  for (let i = 0; i < tp.count; i++) {
    const ring = Math.floor(i / (RAD + 1));
    const t = ring / SEG;
    curve.getPointAt(Math.min(1, t), center);
    const scale = (1.3 - t * 0.5) * bulge(t);
    tp.setXYZ(i, center.x + (tp.getX(i) - center.x) * scale, center.y + (tp.getY(i) - center.y) * scale, center.z + (tp.getZ(i) - center.z) * scale);
  }
  trunk.computeVertexNormals();
  parts.push(
    paint(
      trunk,
      (i) => {
        const ring = Math.floor(i / (RAD + 1));
        // 每节交界处是深色环线；树干贴地处更暗（地面遮蔽），越往上越亮
        const t = ring / SEG;
        const f = (t * RINGS) % 1;
        const edge = f < 0.12 || f > 0.94;
        return (edge ? C_TRUNK_A : C_TRUNK_B).clone().multiplyScalar(0.7 + 0.3 * Math.min(1, t * 4));
      },
      (_, p) => Math.max(0, p.y / height) * 0.15
    )
  );
  const top = curve.getPointAt(1);

  // ---- 椰子串 ----
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + r();
    const s = new THREE.SphereGeometry(0.17, 16, 12);
    s.translate(top.x + Math.cos(a) * 0.2, top.y - 0.2 - r() * 0.06, top.z + Math.sin(a) * 0.2);
    parts.push(paint(s, () => C_COCO, () => 0.1));
  }

  // ---- 宽大的锯齿叶 ----
  const FRONDS = 8;
  for (let f = 0; f < FRONDS; f++) {
    const yaw = (f / FRONDS) * Math.PI * 2 + r() * 0.35;
    const up = f % 4 === 0 ? 0.5 : 0.2 + r() * 0.25; // 少数叶片向上，大多数向外再下垂
    const len = 2.0 + r() * 0.5;
    const droop = 0.85 + r() * 0.45;
    const dir = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const rachis = (t: number) =>
      new THREE.Vector3(top.x + dir.x * len * t, top.y + 0.05 + up * len * t - droop * t * t * len * 0.75, top.z + dir.z * len * t);
    const N = 22;
    const positions: number[] = [];
    const colors: number[] = [];
    const sways: number[] = [];
    const push = (v: THREE.Vector3, c: THREE.Color, w: number) => {
      positions.push(v.x, v.y, v.z);
      colors.push(c.r, c.g, c.b);
      sways.push(w);
    };
    const halfW = (t: number) => 0.34 * Math.sin(Math.PI * Math.pow(t, 0.75)) * (1 - t * 0.15) + 0.01;
    const leafCol = (t: number) => (t < 0.2 ? C_LEAF_BASE.clone().lerp(C_LEAF_MID, t / 0.2) : C_LEAF_MID.clone().lerp(C_LEAF_TIP, (t - 0.2) / 0.8));
    for (const sgn of [1, -1]) {
      for (let i = 0; i < N; i++) {
        const t0 = i / N, t1 = (i + 1) / N;
        const m0 = rachis(t0), m1 = rachis(t1);
        // 锯齿：每段的外缘点向叶尖方向错开，形成一排向前的齿
        const tTooth = Math.min(1, t1 + 0.35 / N);
        const tNotch = t0 + 0.15 / N;
        const edgeAt = (t: number, k: number) => {
          const p = rachis(t);
          const w = halfW(t) * k;
          // 两侧向下垂（中脉隆起）
          return p.add(side.clone().multiplyScalar(sgn * w)).add(new THREE.Vector3(0, -w * 0.45, 0));
        };
        const notch = edgeAt(tNotch, 0.55);
        const tooth = edgeAt(tTooth, 1.0);
        const cRib = C_RIB.clone().lerp(leafCol(t0), 0.35);
        const c0 = leafCol(t0), c1 = leafCol(t1);
        const sw0 = 0.25 + t0 * 0.75, sw1 = 0.25 + t1 * 0.75;
        push(m0, cRib, sw0); push(notch, c0, sw0); push(tooth, c1, sw1);
        push(m0, cRib, sw0); push(tooth, c1, sw1); push(m1, cRib, sw1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setAttribute("aSway", new THREE.Float32BufferAttribute(sways, 1));
    g.computeVertexNormals();
    parts.push(g);
  }
  // 统一属性后合并
  parts.forEach((p) => {
    if (p.index) {
      const ni = p.toNonIndexed();
      p.copy(ni);
    }
    p.deleteAttribute("uv");
  });
  const geo = mergeGeometries(parts, false)!;
  geo.computeBoundingSphere();
  return { geo, top };
}

/** 叶片随风摆动：按 aSway 权重在顶点着色器里做正弦位移 */
function makeMaterial() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8, metalness: 0, envMapIntensity: 0.45 });
  const uniforms = { uTime: { value: 0 },uWind:{value:1} };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;shader.uniforms.uWind=uniforms.uWind;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aSway;\nuniform float uTime;\nuniform float uWind;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 iw = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
        #else
          vec3 iw = vec3(0.0);
        #endif
        float ph = uTime * 1.6 + iw.x * 0.4 + iw.z * 0.3;
        transformed.x += sin(ph + position.y * 0.6) * 0.08 * aSway * uWind;
        transformed.z += cos(ph * 0.8 + position.x) * 0.05 * aSway * uWind;
        transformed.y += sin(ph * 1.3 + position.x * 2.0) * 0.04 * aSway * uWind;`
      );
  };
  return { mat, uniforms };
}

export function Palms({ spots = PALMS, shadows = true, wind=.25 }: { spots?: PalmSpot[]; shadows?: boolean;wind?:number } = {}) {
  const variants = useMemo(() => [buildPalm(7, 4.0), buildPalm(23, 4.6), buildPalm(51, 3.6)], []);
  const { mat, uniforms } = useMemo(makeMaterial, []);
  useFrame((_, dt) => {
    uniforms.uTime.value += Math.min(dt,.05);uniforms.uWind.value=THREE.MathUtils.damp(uniforms.uWind.value,.4+wind*2,1,Math.min(dt,.05));
  });
  const groups = useMemo(() => {
    return variants.map((_, vi) => {
      const list = spots.filter((p) => p.variant === vi);
      const m = new THREE.Matrix4();
      return list.map((p) => {
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (p.r * Math.PI) / 180, p.lean * 0.3));
        return m.clone().compose(new THREE.Vector3(p.x, p.y ?? terrainHeight(p.x,p.z)-.025, p.z), q, new THREE.Vector3(p.s, p.s, p.s));
      });
    });
  }, [variants, spots]);
  return (
    <>
      {variants.map((v, vi) => (
        <instancedMesh
          key={vi}
          args={[v.geo, mat, groups[vi].length]}
          castShadow={shadows}
          receiveShadow={shadows}
          ref={(im) => {
            if (!im) return;
            groups[vi].forEach((mx, i) => im.setMatrixAt(i, mx));
            im.instanceMatrix.needsUpdate = true;
            im.computeBoundingSphere();
          }}
        />
      ))}
    </>
  );
}
