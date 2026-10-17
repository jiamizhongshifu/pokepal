import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BERRY_BUSHES, BOWLS, SIGN } from "../layout";
import { terrainHeight } from "./Terrain";

/**
 * 宝可梦世界的道具（程序化建模，尺寸按 1 单位 ≈ 1 米）：
 * 精灵球睡垫、树果丛、宝可梦食盆、精灵球路牌。
 */
const mat = (color: string, rough = 0.6, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

const M = {
  red: mat("#e8402f", 0.5),
  white: mat("#f6f4ee", 0.55),
  black: mat("#24262c", 0.4),
  wood: mat("#a77a4e", 0.8),
  woodDark: mat("#7b5636", 0.85),
  leaf: mat("#3f9e3a", 0.8),
  leafLight: mat("#62bb48", 0.8),
  oran: mat("#2f6fdc", 0.3),
  oranLight: mat("#9cc8ff", 0.3),
  pecha: mat("#ffa3c4", 0.45),
  cheri: mat("#e0262f", 0.25),
  bowl: mat("#3a8de0", 0.35),
  puffA: mat("#ffcf5a", 0.6),
  puffB: mat("#ff8fb8", 0.6),
  puffC: mat("#9fe07a", 0.6)
};


/**
 * 树果丛：约 1.5 米高的灌木。几根枝条 + 两百多片椭圆叶片（带中脉折痕、深浅变化，随风轻摆），
 * 枝头挂着按宝可梦设定做的树果：橙橙果（蓝色圆果 + 叶冠）、桃桃果（粉色桃形）、樱子果（成对的红樱桃）。
 */
type Berry = "oran" | "pecha" | "cheri";

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const LEAF_DARK = new THREE.Color("#527f45");
const LEAF_LIGHT = new THREE.Color("#9fbe6e");

/**
 * 动森式小果树：粗短的树干 + 一团团蓬松的圆形树冠（几个起伏的球团拼成），
 * 树冠上沿偏亮、下沿和内侧偏暗（顶点遮蔽），树果挂在树冠外沿。
 */
function buildBush(seed: number) {
  const r = rng(seed);
  const branches: THREE.BufferGeometry[] = [];
  // 树干：略带弯曲、底部外扩
  const trunkH = 0.62;
  const trunk = new THREE.CylinderGeometry(0.075, 0.12, trunkH, 14, 6);
  const tp = trunk.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const y = tp.getY(i) + trunkH / 2;
    const flare = 1 + Math.max(0, 0.15 - y) * 2.5;
    tp.setXYZ(i, tp.getX(i) * flare + Math.sin(y * 3) * 0.03, y, tp.getZ(i) * flare);
  }
  trunk.computeVertexNormals();
  branches.push(trunk);
  // 树冠：主团 + 周围 7 个小团
  const lumps: { c: THREE.Vector3; r: number }[] = [{ c: new THREE.Vector3(0, 1.0, 0), r: 0.52 }];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r() * 0.5;
    const up = i % 2 ? 0.18 : -0.05;
    lumps.push({ c: new THREE.Vector3(Math.cos(a) * 0.42, 0.95 + up + r() * 0.1, Math.sin(a) * 0.42), r: 0.3 + r() * 0.1 });
  }
  lumps.push({ c: new THREE.Vector3(0.05, 1.35, -0.02), r: 0.34 });
  const parts: THREE.BufferGeometry[] = [];
  const v = new THREE.Vector3();
  for (const L of lumps) {
    const g = new THREE.IcosahedronGeometry(L.r, 4);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = v.clone().normalize();
      // 叶团表面一簇簇的小起伏
      const bump = Math.sin(n.x * 9 + seed) * Math.sin(n.y * 8) * Math.sin(n.z * 9 + seed * 0.3);
      v.multiplyScalar(1 + bump * 0.06);
      v.add(L.c);
      pos.setXYZ(i, v.x, v.y, v.z);
      // 上亮下暗；靠近树冠中心的部分（被其他叶团挡住）更暗
      const top = THREE.MathUtils.clamp((v.y - 0.6) / 1.0, 0, 1);
      const inner = THREE.MathUtils.clamp(Math.hypot(v.x, v.z) / 0.8, 0, 1);
      c.copy(LEAF_DARK).lerp(LEAF_LIGHT, top * 0.75 + bump * 0.15).multiplyScalar(0.72 + 0.28 * Math.max(top, inner));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.deleteAttribute("normal");
    g.deleteAttribute("uv");
    // 二十面体默认是非索引几何（每个面独立顶点），合并后法线才能平滑
    const smooth = mergeVertices(g, 1e-4);
    smooth.computeVertexNormals();
    parts.push(smooth);
  }
  const leaves = mergeGeometries(parts, false)!;
  // 树果：挂在树冠外沿偏下的位置
  const tips: THREE.Vector3[] = [];
  for (let k = 0; k < 7; k++) {
    const L = lumps[1 + (k % 7)];
    const a = Math.atan2(L.c.z, L.c.x) + (r() - 0.5) * 0.5;
    tips.push(new THREE.Vector3(L.c.x + Math.cos(a) * L.r * 0.75, L.c.y - L.r * 0.45, L.c.z + Math.sin(a) * L.r * 0.75));
  }
  return { leaves, branches, tips };
}

const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, envMapIntensity: 0.45 });
leafMat.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = BUSH_TIME;
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nuniform float uTime;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nfloat sw = max(0.0, position.y - 0.6);\ntransformed.x += sin(uTime * 1.2 + position.z * 2.0) * 0.018 * sw;\ntransformed.z += cos(uTime * 1.0 + position.x * 2.0) * 0.014 * sw;");
};
export const BUSH_TIME = { value: 0 };

/** 单个树果（以果柄顶端为原点，向下挂） */
function BerryFruit({ type }: { type: Berry }) {
  if (type === "oran") {
    return (
      <group>
        <mesh position-y={-0.06} material={M.woodDark}><cylinderGeometry args={[0.006, 0.006, 0.12, 4]} /></mesh>
        <mesh position-y={-0.2} scale={[1, 0.92, 1]} castShadow material={M.oran}><sphereGeometry args={[0.1, 18, 14]} /></mesh>
        {/* 顶上一圈小叶冠 */}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.cos(i * 1.256) * 0.05, -0.105, Math.sin(i * 1.256) * 0.05]} rotation={[0, -i * 1.256, 0.9]} material={M.leaf}>
            <coneGeometry args={[0.025, 0.08, 4]} />
          </mesh>
        ))}
        <mesh position={[0.035, -0.17, 0.07]} material={M.oranLight}><sphereGeometry args={[0.028, 8, 6]} /></mesh>
      </group>
    );
  }
  if (type === "pecha") {
    return (
      <group>
        <mesh position-y={-0.06} material={M.woodDark}><cylinderGeometry args={[0.006, 0.006, 0.12, 4]} /></mesh>
        {/* 两瓣拼成的桃形，中间留一道凹痕 */}
        <mesh position={[-0.035, -0.2, 0]} scale={[0.85, 1, 0.95]} castShadow material={M.pecha}><sphereGeometry args={[0.09, 16, 12]} /></mesh>
        <mesh position={[0.035, -0.2, 0]} scale={[0.85, 1, 0.95]} castShadow material={M.pecha}><sphereGeometry args={[0.09, 16, 12]} /></mesh>
        <mesh position={[0, -0.27, 0]} material={M.pecha}><coneGeometry args={[0.05, 0.08, 10]} /></mesh>
        <mesh position={[0.02, -0.11, 0]} rotation-z={-0.8} material={M.leafLight}><coneGeometry args={[0.03, 0.11, 4]} /></mesh>
      </group>
    );
  }
  // 樱子果：V 形果柄连着两颗红樱桃
  return (
    <group>
      <mesh position={[-0.045, -0.1, 0]} rotation-z={-0.45} material={M.leaf}><cylinderGeometry args={[0.006, 0.006, 0.2, 4]} /></mesh>
      <mesh position={[0.045, -0.1, 0]} rotation-z={0.45} material={M.leaf}><cylinderGeometry args={[0.006, 0.006, 0.2, 4]} /></mesh>
      <mesh position={[-0.09, -0.22, 0]} castShadow material={M.cheri}><sphereGeometry args={[0.07, 16, 12]} /></mesh>
      <mesh position={[0.09, -0.22, 0]} castShadow material={M.cheri}><sphereGeometry args={[0.07, 16, 12]} /></mesh>
      <mesh position={[-0.07, -0.19, 0.055]} material={M.white}><sphereGeometry args={[0.015, 6, 4]} /></mesh>
      <mesh position={[0.11, -0.19, 0.055]} material={M.white}><sphereGeometry args={[0.015, 6, 4]} /></mesh>
    </group>
  );
}

export function BerryBush({ x, z, berry, s }: { x: number; z: number; berry: Berry; s: number }) {
  const y = terrainHeight(x, z);
  const bush = useMemo(() => buildBush(Math.floor(Math.abs(x * 131 + z * 71)) + 7), [x, z]);
  return (
    <group position={[x, y, z]} scale={s} rotation-y={x}>
      {bush.branches.map((g, i) => (
        <mesh key={i} geometry={g} material={M.woodDark} castShadow />
      ))}
      <mesh geometry={bush.leaves} material={leafMat} castShadow receiveShadow />
      {bush.tips.map((t, i) => (
        <group key={`f${i}`} position={t}>
          <BerryFruit type={berry} />
        </group>
      ))}
    </group>
  );
}

/** 宝可梦食盆：直径约 0.5 米的蓝色碗，里面放着宝可梦方块零食 */
function Bowl({ x, z }: { x: number; z: number }) {
  const y = terrainHeight(x, z);
  return (
    <group position={[x, y, z]}>
      <mesh position-y={0.09} castShadow receiveShadow material={M.bowl}>
        <cylinderGeometry args={[0.27, 0.2, 0.18, 28, 1, true]} />
      </mesh>
      <mesh position-y={0.01} material={M.bowl}>
        <cylinderGeometry args={[0.2, 0.2, 0.02, 28]} />
      </mesh>
      <mesh position-y={0.18} rotation-x={Math.PI / 2} material={M.white}>
        <torusGeometry args={[0.27, 0.025, 8, 28]} />
      </mesh>
      {[M.puffA, M.puffB, M.puffC].map((pm, i) => (
        <mesh key={i} position={[(i - 1) * 0.11, 0.14, (i % 2) * 0.06 - 0.03]} rotation-y={i} material={pm}>
          <boxGeometry args={[0.1, 0.08, 0.1]} />
        </mesh>
      ))}
    </group>
  );
}

/** 双面木质指示牌：小徽章保留精灵球识别，大箭头让幼儿不用读字。 */
function PokeSign({ x, z }: { x: number; z: number }) {
  const y = terrainHeight(x, z);
  const parts = useMemo(() => {
    const arrow = new THREE.Shape();
    arrow.moveTo(-0.19, -0.065); arrow.lineTo(0.04, -0.065);
    arrow.lineTo(0.04, -0.15); arrow.quadraticCurveTo(0.04, -0.18, 0.075, -0.15);
    arrow.lineTo(0.24, -0.025); arrow.quadraticCurveTo(0.27, 0, 0.24, 0.025);
    arrow.lineTo(0.075, 0.15); arrow.quadraticCurveTo(0.04, 0.18, 0.04, 0.15);
    arrow.lineTo(0.04, 0.065); arrow.lineTo(-0.19, 0.065);
    arrow.quadraticCurveTo(-0.24, 0.065, -0.24, 0); arrow.quadraticCurveTo(-0.24, -0.065, -0.19, -0.065);
    return {
      board: new RoundedBoxGeometry(1.26, 0.64, 0.16, 3, 0.12),
      inset: new RoundedBoxGeometry(1.1, 0.48, 0.035, 3, 0.09),
      arrow: new THREE.ExtrudeGeometry(arrow, { depth: 0.012, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, steps: 1, curveSegments: 6 }),
      ivory: mat("#fff1cf", 0.9), teal: mat("#348b7d", 0.85), coral: mat("#df715c", 0.8), rim: mat("#5c6357", 0.85)
    };
  }, []);
  return (
    <group name="pokeball-wayfinding-sign" position={[x, y, z]} rotation-y={0.35}>
      <mesh position-y={0.62} castShadow material={M.wood}>
        <cylinderGeometry args={[0.085, 0.11, 1.24, 10]} />
      </mesh>
      <mesh position-y={0.06} castShadow material={M.woodDark}>
        <cylinderGeometry args={[0.13, 0.16, 0.12, 12]} />
      </mesh>
      <group position-y={1.28}>
        <mesh geometry={parts.board} material={M.wood} castShadow receiveShadow />
        {[0, Math.PI].map((angle, i) => (
          <group key={i} rotation-y={angle}>
            <mesh position-z={0.085} geometry={parts.inset} material={parts.ivory} />
            <group position={[-0.32, 0, 0.11]}>
              <mesh rotation-x={Math.PI / 2} material={parts.rim}><cylinderGeometry args={[0.18, 0.18, 0.025, 24]} /></mesh>
              <mesh position-z={0.015} material={parts.coral}><circleGeometry args={[0.158, 24, 0, Math.PI]} /></mesh>
              <mesh position-z={0.015} rotation-z={Math.PI} material={M.white}><circleGeometry args={[0.158, 24, 0, Math.PI]} /></mesh>
              <mesh position-z={0.019} material={parts.rim}><planeGeometry args={[0.32, 0.035]} /></mesh>
              <mesh position-z={0.023} material={parts.rim}><circleGeometry args={[0.058, 20]} /></mesh>
              <mesh position-z={0.026} material={M.white}><circleGeometry args={[0.037, 20]} /></mesh>
            </group>
            <mesh position={[0.22, 0, 0.11]} scale-x={i === 0 ? 1 : -1} geometry={parts.arrow} material={parts.teal} />
          </group>
        ))}
      </group>
    </group>
  );
}

export function PokeProps() {
  useFrame((_, dt) => {
    BUSH_TIME.value += dt;
  });
  return (
    <>
      {BERRY_BUSHES.map((b, i) => <BerryBush key={`b${i}`} {...b} />)}
      {BOWLS.map((b, i) => <Bowl key={`w${i}`} {...b} />)}
      <PokeSign {...SIGN} />
    </>
  );
}
