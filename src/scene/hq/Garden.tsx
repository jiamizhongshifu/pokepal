import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HQ_PROPS, type Placement } from "../layout";
import { terrainHeight } from "./Terrain";

/**
 * 动森式园艺道具（程序化建模）：
 * - 花灌木：几个圆团拼成的矮灌木，表面点缀五瓣小花（扶桑 / 杜鹃那样的一丛一丛）；
 * - 雪松：分层的圆锥树冠，每层下沿是波浪形的“裙边”；
 * - 海星：圆润的五角星，躺在沙滩上。
 */
function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const SHRUB_FLOWERS = ["#e8433a", "#f37fb0", "#f6d33c", "#ffffff"];

function smoothLumps(lumps: { c: THREE.Vector3; r: number }[], dark: THREE.Color, light: THREE.Color, seed: number, yMin: number, yMax: number) {
  const parts: THREE.BufferGeometry[] = [];
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (const L of lumps) {
    const g = new THREE.IcosahedronGeometry(L.r, 3);
    g.deleteAttribute("uv");
    g.deleteAttribute("normal");
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = v.clone().normalize();
      const bump = Math.sin(n.x * 10 + seed) * Math.sin(n.y * 9) * Math.sin(n.z * 10 + seed * 0.7);
      v.multiplyScalar(1 + bump * 0.05).add(L.c);
      pos.setXYZ(i, v.x, v.y, v.z);
      const t = THREE.MathUtils.clamp((v.y - yMin) / (yMax - yMin), 0, 1);
      c.copy(dark).lerp(light, t * 0.85 + bump * 0.1).multiplyScalar(0.75 + 0.25 * t);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = mergeVertices(g, 1e-4);
    m.computeVertexNormals();
    parts.push(m);
  }
  return mergeGeometries(parts, false)!;
}

/** 一丛灌木：返回叶团几何和花朵的位置 / 朝向 */
export function shrubGeometry(seed: number) {
  const r = rand(seed);
  const lumps = [{ c: new THREE.Vector3(0, 0.42, 0), r: 0.42 }];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + r() * 0.6;
    lumps.push({ c: new THREE.Vector3(Math.cos(a) * 0.36, 0.3 + r() * 0.12, Math.sin(a) * 0.36), r: 0.27 + r() * 0.07 });
  }
  const geo = smoothLumps(lumps, new THREE.Color("#2c7a35"), new THREE.Color("#6cbf4c"), seed, 0.05, 0.85);
  const flowers: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (let k = 0; k < 22; k++) {
    const L = lumps[Math.floor(r() * lumps.length)];
    const n = new THREE.Vector3(r() - 0.5, r() * 0.9 + 0.1, r() - 0.5).normalize();
    flowers.push({ p: L.c.clone().addScaledVector(n, L.r * 1.02), n });
  }
  return { geo, flowers };
}

/** 五瓣小花（扁平），花心另算 */
function flowerGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const s = new THREE.SphereGeometry(0.045, 8, 6);
    s.scale(0.75, 0.22, 1);
    s.translate(0, 0, 0.05);
    s.rotateY(a);
    s.deleteAttribute("uv");
    parts.push(s);
  }
  const g = mergeGeometries(parts, false)!;
  g.rotateX(Math.PI / 2); // 让花朵的“正面”朝 +z，方便按法线对齐
  return g;
}

function cedarGeometry() {
  // 动森式雪松：6 层“软垫”叶层（旋转体：上面是微鼓的圆锥面，下沿圆润地往里卷，有厚度），
  // 层与层大幅重叠，整体厚实饱满；裙边只有很轻的波浪起伏，层越高颜色越亮
  const parts: THREE.BufferGeometry[] = [];
  const tiers = [
    { y: 0.55, r: 1.12, h: 0.9 },
    { y: 0.92, r: 0.98, h: 0.85 },
    { y: 1.28, r: 0.84, h: 0.8 },
    { y: 1.62, r: 0.68, h: 0.75 },
    { y: 1.94, r: 0.5, h: 0.7 },
    { y: 2.24, r: 0.3, h: 0.62 }
  ];
  const dark = new THREE.Color("#2b6c3c"), light = new THREE.Color("#63b35c"), c = new THREE.Color();
  tiers.forEach((t, ti) => {
    // 剖面：顶点 → 微鼓的斜面 → 圆润的下沿 → 往里卷回中轴
    const prof: THREE.Vector2[] = [];
    const N = 14;
    for (let i = 0; i <= N; i++) {
      const k = i / N;
      prof.push(new THREE.Vector2(t.r * k * (1 + 0.12 * Math.sin(Math.PI * k)), t.h * (1 - k) + 0.12 * t.h));
    }
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 0.5;
      prof.push(new THREE.Vector2(t.r * (1 - 0.18 * (1 - Math.cos(a))) , 0.12 * t.h * Math.cos(a)));
    }
    prof.push(new THREE.Vector2(t.r * 0.45, 0.0), new THREE.Vector2(0.001, 0.05 * t.h));
    // LatheGeometry 要求剖面从下往上给点，法线才朝外
    const g = new THREE.LatheGeometry(prof.reverse(), 56);
    g.deleteAttribute("uv");
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const a = Math.atan2(z, x);
      const rr = Math.hypot(x, z) / t.r; // 0 = 中轴，1 = 外沿
      // 外沿轻微的波浪起伏（柔和，不出尖角）
      const wave = 1 + 0.045 * Math.sin(a * 8 + ti * 1.3) * rr * rr;
      pos.setXYZ(i, x * wave, y + t.y - t.h * 0.45, z * wave);
      const top = y / (t.h * 1.12);
      c.copy(dark).lerp(light, top * 0.6 + (ti / tiers.length) * 0.3).multiplyScalar(0.8 + 0.2 * top);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = mergeVertices(g, 1e-4);
    m.computeVertexNormals();
    parts.push(m);
  });
  // 实心树芯：深绿色圆锥，填住叶层之间的缝，不再透出树干
  const core = new THREE.ConeGeometry(0.62, 2.3, 40, 1, true);
  core.deleteAttribute("uv");
  core.translate(0, 0.4 + 1.15, 0);
  const cc = new Float32Array(core.attributes.position.count * 3);
  for (let i = 0; i < core.attributes.position.count; i++) cc.set([dark.r * 0.75, dark.g * 0.75, dark.b * 0.75], i * 3);
  core.setAttribute("color", new THREE.BufferAttribute(cc, 3));
  const cm = mergeVertices(core, 1e-4);
  cm.computeVertexNormals();
  parts.push(cm);
  return mergeGeometries(parts, false)!;
}

function starfishGeometry() {
  const shape = new THREE.Shape();
  const N = 5, R = 0.11, r = 0.045;
  for (let i = 0; i <= N * 2; i++) {
    const a = (i / (N * 2)) * Math.PI * 2 + Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 4, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

export function Garden() {
  const shrubs = HQ_PROPS.filter((p) => p.m === "shrub");
  const cedars = HQ_PROPS.filter((p) => p.m === "cedar");
  const stars = HQ_PROPS.filter((p) => p.m === "starfish");

  const mats = useMemo(
    () => ({
      foliage: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, envMapIntensity: 0.45 }),
      trunk: new THREE.MeshStandardMaterial({ color: "#7a4d2c", roughness: 0.9, envMapIntensity: 0.4 }),
      center: new THREE.MeshStandardMaterial({ color: "#f4c430", roughness: 0.7 }),
      star: [new THREE.MeshStandardMaterial({ color: "#f08a4b", roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: "#f39ab0", roughness: 0.6 })],
      petals: SHRUB_FLOWERS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, side: THREE.DoubleSide, envMapIntensity: 0.4 }))
    }),
    []
  );
  const geos = useMemo(() => ({ flower: flowerGeometry(), center: new THREE.SphereGeometry(0.022, 8, 6), cedar: cedarGeometry(), star: starfishGeometry(), trunk: new THREE.CylinderGeometry(0.1, 0.15, 0.9, 12) }), []);
  const shrubData = useMemo(() => shrubs.map((p, i) => ({ p, ...shrubGeometry(101 + i * 37) })), [shrubs]);

  const place = (p: Placement, lift = 0) => [p.x, terrainHeight(p.x, p.z) - 0.04 + lift, p.z] as [number, number, number];
  const q = new THREE.Quaternion();
  const zAxis = new THREE.Vector3(0, 0, 1);
  return (
    <>
      {shrubData.map(({ p, geo, flowers }, i) => (
        <group key={`s${i}`} position={place(p)} rotation-y={((p.r ?? 0) * Math.PI) / 180} scale={p.s ?? 1}>
          <mesh geometry={geo} material={mats.foliage} castShadow receiveShadow />
          {flowers.map((f, k) => {
            q.setFromUnitVectors(zAxis, f.n);
            return (
              <group key={k} position={f.p} quaternion={q.clone()}>
                <mesh geometry={geos.flower} material={mats.petals[(p.v ?? 0) % mats.petals.length]} />
                <mesh geometry={geos.center} material={mats.center} position-z={0.01} />
              </group>
            );
          })}
        </group>
      ))}
      {cedars.map((p, i) => (
        <group key={`c${i}`} position={place(p)} rotation-y={((p.r ?? 0) * Math.PI) / 180} scale={p.s ?? 1}>
          <mesh geometry={geos.trunk} material={mats.trunk} position-y={0.45} castShadow />
          <mesh geometry={geos.cedar} material={mats.foliage} castShadow receiveShadow />
        </group>
      ))}
      {stars.map((p, i) => (
        <mesh key={`f${i}`} geometry={geos.star} material={mats.star[(p.v ?? 0) % 2]} position={place(p, 0.045)} rotation-y={((p.r ?? 0) * Math.PI) / 180} castShadow receiveShadow />
      ))}
    </>
  );
}
