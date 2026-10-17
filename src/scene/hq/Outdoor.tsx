import { pathDetailClear } from '../detailClearance';
import { surfaceTexture } from '../surfaceTextures';
import { PATH_CURVES, PLAZA } from '../landscape';
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FENCE, HAMMOCK_PALMS, LAMPS, PALMS, PARASOL } from "../layout";
import { terrainHeight } from "./Terrain";
import { stoneGeometry } from "./stoneGeometry";

/**
 * 动森式户外摆设（程序化建模）：踏石小路、遮阳伞 + 浴巾 + 精灵球沙滩球、椰子树间的吊床、
 * 帐篷后的木栅栏、夜里会亮的圆灯。造型圆润、配色干净，和场景其他道具统一。
 */
function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const std = (color: string, rough = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, envMapIntensity: 0.45, ...extra });

/** 条纹贴图（浴巾、吊床） */
function stripeTexture(colors: string[], n: number, vertical = false) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const ctx = cv.getContext("2d")!;
  const w = 128 / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[i % colors.length];
    if (vertical) ctx.fillRect(i * w, 0, w + 1, 128);
    else ctx.fillRect(0, i * w, 128, w + 1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- 踏石小路 ----------

function SteppingStones() {
  const { geo, mat, items } = useMemo(() => {
    const r = rand(42);
    const items: THREE.Matrix4[] = [];
    const colors: THREE.Color[] = [];
    const placed:THREE.Vector3[]=[];
    for (const curve of PATH_CURVES) {
      const len = curve.getLength();
      const n = Math.floor(len / 0.94);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t);
        const side = new THREE.Vector3(-tan.z, 0, tan.x).multiplyScalar((i % 2 ? 1 : -1) * 0.1 + (r() - 0.5) * 0.06);
        p.add(side);
        if(!pathDetailClear(p.x,p.z)||Math.hypot(p.x-PLAZA.x,p.z-PLAZA.z)<PLAZA.r+.08||placed.some(q=>q.distanceTo(p)<.65))continue;
        placed.push(p.clone());
        const s = 0.26 + r() * 0.06;
        items.push(new THREE.Matrix4().compose(
          new THREE.Vector3(p.x, terrainHeight(p.x, p.z) - 0.005, p.z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * Math.PI * 2, 0)),
          new THREE.Vector3(s * 2 * (1 + (r() - 0.5) * 0.25), .055, s * 2 * (1 + (r() - 0.5) * 0.25))
        ));
        const v = 0.92 + r() * 0.12;
        colors.push(new THREE.Color("#ffffff").multiplyScalar(v));
      }
    }
    return { geo: stoneGeometry("path", 4), mat: std("#ffffff", 0.93, { vertexColors: true }), items: { m: items, c: colors } };
  }, []);
  return (
    <instancedMesh
      name="stepping-stones"
      args={[geo, mat, items.m.length]}
      receiveShadow
      ref={(im) => {
        if (!im) return;
        items.m.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, items.c[i]); });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.computeBoundingSphere();
      }}
    />
  );
}

// ---------- 遮阳伞 + 浴巾 + 沙滩球 ----------
function Parasol() {
  const parts = useMemo(() => {
    // 伞面：8 片红白相间，边缘是扇贝形
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const k = i / 16;
      prof.push(new THREE.Vector2(1.15 * k, 0.32 * (1 - k * k)));
    }
    const canopy = new THREE.LatheGeometry(prof.reverse(), 64);
    const pos = canopy.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const red = new THREE.Color("#e8453c"), white = new THREE.Color("#fbf7ef");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
      const a = Math.atan2(z, x);
      const rr = Math.hypot(x, z) / 1.15;
      const panel = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8) % 2;
      // 扇贝边：每片伞面的外沿中间略微下垂
      const scallop = Math.abs(Math.sin(a * 4));
      pos.setY(i, y - rr * rr * 0.06 * (1 - scallop));
      const c = panel ? red : white;
      col.set([c.r, c.g, c.b], i * 3);
    }
    canopy.setAttribute("color", new THREE.BufferAttribute(col, 3));
    canopy.computeVertexNormals();
    const towel = new THREE.PlaneGeometry(0.85, 1.7);
    towel.rotateX(-Math.PI / 2);
    return {
      canopy,
      canopyMat: new THREE.MeshStandardMaterial({ bumpMap: surfaceTexture("weave"), bumpScale: .012, vertexColors: true, roughness: 0.85, side: THREE.DoubleSide, envMapIntensity: 0.45 }),
      pole: std("#f4efe6", 0.6),
      towel,
      towelMat: new THREE.MeshStandardMaterial({ map: stripeTexture(["#3ab6e6", "#ffffff", "#ffd84a", "#ffffff"], 8), bumpMap: surfaceTexture("weave"), bumpScale: .008, roughness: 0.95, envMapIntensity: 0.4 }),
      ballTop: std("#e8453c", 0.45),
      ballBottom: std("#fbf7ef", 0.45),
      ballBand: std("#2a2a33", 0.6)
    };
  }, []);
  const y = terrainHeight(PARASOL.x, PARASOL.z);
  return (
    <group position={[PARASOL.x, y, PARASOL.z]}>
      <group rotation-z={0.12}>
        <mesh material={parts.pole} position-y={1.0} castShadow><cylinderGeometry args={[0.035, 0.04, 2.0, 12]} /></mesh>
        <mesh geometry={parts.canopy} material={parts.canopyMat} position-y={1.82} castShadow receiveShadow />
        <mesh material={parts.pole} position-y={2.18}><sphereGeometry args={[0.06, 12, 10]} /></mesh>
      </group>
      {/* 浴巾在伞荫里 */}
      <mesh geometry={parts.towel} material={parts.towelMat} position={[0.2, 0.02, 0.1]} rotation-y={0.35} receiveShadow />
      {/* 精灵球配色的沙滩球 */}
      <group position={[-.65, 0.2, .55]} rotation={[0.3, 0.6, 0.2]}>
        <mesh material={parts.ballTop} castShadow><sphereGeometry args={[0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <mesh material={parts.ballBottom} castShadow><sphereGeometry args={[0.2, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /></mesh>
        <mesh material={parts.ballBand} rotation-x={Math.PI / 2}><torusGeometry args={[0.2, 0.018, 8, 32]} /></mesh>
        <mesh material={parts.ballBottom} position-z={0.195} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 0.02, 16]} /></mesh>
      </group>
    </group>
  );
}

// ---------- 吊床 ----------
function Hammock() {
  const built = useMemo(() => {
    const [ia, ib] = HAMMOCK_PALMS;
    const A = new THREE.Vector3(PALMS[ia].x, 0, PALMS[ia].z);
    const B = new THREE.Vector3(PALMS[ib].x, 0, PALMS[ib].z);
    const dir = B.clone().sub(A).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const yA = terrainHeight(A.x, A.z) + 1.15, yB = terrainHeight(B.x, B.z) + 1.15;
    // 两端撑杆离树干各 0.45 米，中间吊着一片下垂的布
    const a2 = A.clone().addScaledVector(dir, 0.4), b2 = B.clone().addScaledVector(dir, -0.4);
    const cloth = new ParametricGeometry((u, v, t) => {
      const p = a2.clone().lerp(b2, u);
      const sag = Math.sin(Math.PI * u);
      const across = (v - 0.5) * 2;
      const w = 0.36 * (0.75 + 0.25 * sag);
      p.addScaledVector(side, across * w);
      const yTop = THREE.MathUtils.lerp(yA, yB, u) - 0.12;
      p.y = yTop - 0.45 * sag - 0.12 * (1 - across * across) * sag;
      t.copy(p);
    }, 40, 12);
    const ropes: THREE.BufferGeometry[] = [];
    for (const [end, anchor, y] of [[a2, A, yA], [b2, B, yB]] as const) {
      for (const s of [-1, 1]) {
        const p0 = new THREE.Vector3(anchor.x, y, anchor.z).addScaledVector(dir, end === a2 ? 0.1 : -0.1);
        const p1 = end.clone().addScaledVector(side, s * 0.27);
        p1.y = y - 0.12;
        ropes.push(new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 1, 0.012, 5, false));
      }
      // 撑杆
      const bar = new THREE.CylinderGeometry(0.025, 0.025, 0.62, 8);
      bar.rotateX(Math.PI / 2);
      bar.lookAt(side);
      bar.translate(end.x, y - 0.12, end.z);
      ropes.push(bar);
      // 绑在树干上的绳圈
      const ring = new THREE.TorusGeometry(0.2, 0.02, 6, 20);
      ring.rotateX(Math.PI / 2);
      ring.translate(anchor.x, y, anchor.z);
      ropes.push(ring);
    }
    ropes.forEach((g) => g.deleteAttribute("uv"));
    return {
      cloth,
      clothMat: new THREE.MeshStandardMaterial({ map: stripeTexture(["#2fb8ea", "#ffffff", "#2fb8ea", "#ffd84a"], 10, true), bumpMap: surfaceTexture("weave"), bumpScale: .008, roughness: 0.9, side: THREE.DoubleSide, envMapIntensity: 0.4 }),
      ropes: mergeGeometries(ropes.map((g) => (g.index ? g.toNonIndexed() : g)), false)!,
      ropeMat: std("#e9dcc0", 0.9)
    };
  }, []);
  return (
    <group>
      <mesh geometry={built.cloth} material={built.clothMat} castShadow receiveShadow />
      <mesh geometry={built.ropes} material={built.ropeMat} castShadow />
    </group>
  );
}

// ---------- 木栅栏 ----------
function Fence() {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const n = 7;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const a = ((FENCE.from + ((FENCE.to - FENCE.from) * i) / (n - 1)) * Math.PI) / 180;
      const x = FENCE.cx + Math.cos(a) * FENCE.r, z = FENCE.cz + Math.sin(a) * FENCE.r;
      const y = terrainHeight(x, z);
      pts.push(new THREE.Vector3(x, y, z));
      // 立柱：方柱 + 尖顶
      const post = new THREE.BoxGeometry(0.11, 0.62, 0.11);
      post.translate(x, y + 0.31, z);
      const cap = new THREE.ConeGeometry(0.085, 0.12, 4);
      cap.rotateY(Math.PI / 4);
      cap.translate(x, y + 0.68, z);
      parts.push(post, cap);
    }
    // 两道横杆
    for (let i = 0; i < n - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      for (const h of [0.22, 0.46]) {
        const len = p.distanceTo(q);
        const rail = new THREE.BoxGeometry(len, 0.06, 0.04);
        const mid = p.clone().lerp(q, 0.5);
        rail.rotateY(-Math.atan2(q.z - p.z, q.x - p.x));
        rail.translate(mid.x, mid.y + h, mid.z);
        parts.push(rail);
      }
    }
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false)!;
  }, []);
  const mat = useMemo(() => std("#d5ae7d", 0.85, {map: surfaceTexture("wood"), bumpMap: surfaceTexture("wood"), bumpScale: .012}), []);
  return <mesh geometry={geo} material={mat} castShadow receiveShadow />;
}

// ---------- 圆灯 ----------
function Lamps({ night }: { night: boolean }) {
  const mats = useMemo(
    () => ({
      post: std("#3b3f4a", 0.5, { metalness: 0.3 }),
      globe: new THREE.MeshStandardMaterial({ color: "#fff6e0", emissive: "#ffd27a", emissiveIntensity: 0.3, roughness: 0.3, envMapIntensity: 0.5 }),
      glow: new THREE.SpriteMaterial({ map: glowTexture(), color: "#ffd27a", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })
    }),
    []
  );
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const on = night ? 1 : 0;
    mats.globe.emissiveIntensity = THREE.MathUtils.lerp(mats.globe.emissiveIntensity, on ? 2.4 + Math.sin(t.current * 2) * 0.1 : 0.3, 0.08);
    mats.glow.opacity = THREE.MathUtils.lerp(mats.glow.opacity, on * 0.85, 0.08);
  });
  return (
    <>
      {LAMPS.map((l, i) => {
        const y = terrainHeight(l.x, l.z);
        return (
          <group key={i} name={`island-lamp-${i}`} position={[l.x, y, l.z]}>
            <mesh material={mats.post} position-y={0.06} castShadow><cylinderGeometry args={[0.13, 0.16, 0.12, 20]} /></mesh>
            <mesh material={mats.post} position-y={0.85} castShadow><cylinderGeometry args={[0.035, 0.045, 1.6, 12]} /></mesh>
            <mesh material={mats.post} position-y={1.66}><cylinderGeometry args={[0.07, 0.05, 0.08, 16]} /></mesh>
            <mesh material={mats.globe} position-y={1.86} castShadow><sphereGeometry args={[0.19, 24, 16]} /></mesh>
            <mesh material={mats.post} position-y={2.06}><sphereGeometry args={[0.05, 12, 8]} /></mesh>
            <sprite material={mats.glow} position-y={1.86} scale={[1.6, 1.6, 1.6]} renderOrder={20} />
          </group>
        );
      })}
    </>
  );
}

let glowTex: THREE.Texture | null = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(cv);
  return glowTex;
}

export function Outdoor({ night }: { night: boolean }) {
  return (
    <>
      <SteppingStones />
      <Parasol />
      <Hammock />
      <Fence />
      <Lamps night={night} />
    </>
  );
}
