import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { CAMPFIRE, HQ_DIR } from "../layout";
import { terrainHeight } from "./Terrain";
import { PALETTE, stylize } from "./stylize";

/**
 * 立体篝火：圆石火塘（CoastalRocks 里放置）+ 枯枝搭成的锥形柴堆 + 着色器火焰 + 上升的火星 + 闪烁的火光。
 * 火焰是三层旋转体外壳，用滚动的分形噪声裁出跳动的火舌，叠加混合，从任何角度看都是立体的。
 */
useGLTF.preload(HQ_DIR + "dry_branches.glb", false);

const FLAME_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  void main() {
    vec3 p = position;
    float h = clamp(p.y / 1.0, 0.0, 1.0);
    // 火舌左右摆动，越往上摆得越厉害
    p.x += sin(uTime * 7.0 + uSeed + p.y * 5.0) * 0.06 * h;
    p.z += cos(uTime * 6.0 + uSeed * 1.7 + p.y * 4.0) * 0.05 * h;
    vPos = position;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vWorld = w.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const FLAME_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform vec3 uInner;
  uniform vec3 uOuter;
  uniform float uIntensity;
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
  void main() {
    float h = clamp(vPos.y, 0.0, 1.0);
    // 向上滚动的噪声：火舌往上窜
    float n = fbm(vec3(vPos.x * 4.0, vPos.y * 3.0 - uTime * 2.6, vPos.z * 4.0 + uSeed));
    // 越往上越容易被噪声“吃掉”，形成跳动的尖火舌
    float shape = n - h * 0.85 + 0.38;
    float a = smoothstep(0.0, 0.22, shape);
    // 正对视线的中心更亮，边缘柔和
    vec3 V = normalize(cameraPosition - vWorld);
    float facing = pow(abs(dot(normalize(vNormalW), V)), 1.4);
    a *= facing;
    vec3 col = mix(uInner, uOuter, smoothstep(0.05, 0.75, h + (0.5 - n) * 0.5));
    col *= 1.0 + (1.0 - h) * 0.8;
    gl_FragColor = vec4(col * uIntensity, a * uIntensity);
  }
`;

const EMBER_VERT = /* glsl */ `
  uniform float uTime;
  attribute float aSeed;
  varying float vLife;
  void main() {
    float speed = 0.45 + fract(aSeed * 13.7) * 0.5;
    float life = fract(uTime * speed * 0.5 + aSeed);
    vLife = life;
    vec3 p = position;
    p.y += life * 2.2;
    p.x += sin(uTime * 1.3 + aSeed * 40.0) * 0.25 * life;
    p.z += cos(uTime * 1.1 + aSeed * 23.0) * 0.25 * life;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (1.0 - life) * 42.0 / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const EMBER_FRAG = /* glsl */ `
  varying float vLife;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * (1.0 - vLife);
    gl_FragColor = vec4(vec3(1.0, 0.62, 0.22) * 1.6, a);
  }
`;

function flameGeometry() {
  // 水滴形旋转体：底部圆润、顶部收尖
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const r = Math.sin(Math.PI * Math.pow(t, 0.55)) * (1 - t) * 0.42 + 0.001;
    pts.push(new THREE.Vector2(r, t));
  }
  return new THREE.LatheGeometry(pts, 40);
}

function Flames({ lit }: { lit: boolean }) {
  const geo = useMemo(flameGeometry, []);
  const layers = useMemo(
    () =>
      [
        { s: [1.0, 1.05, 1.0], inner: "#ffb347", outer: "#e8401c", seed: 1.3, k: 0.75 },
        { s: [0.72, 0.85, 0.72], inner: "#ffd36b", outer: "#ff6a1f", seed: 4.1, k: 0.9 },
        { s: [0.42, 0.6, 0.42], inner: "#fff4c8", outer: "#ffb03a", seed: 7.7, k: 1.0 }
      ].map((l) => ({
        ...l,
        mat: new THREE.ShaderMaterial({
          vertexShader: FLAME_VERT,
          fragmentShader: FLAME_FRAG,
          uniforms: {
            uTime: { value: 0 },
            uSeed: { value: l.seed },
            uInner: { value: new THREE.Color(l.inner) },
            uOuter: { value: new THREE.Color(l.outer) },
            uIntensity: { value: l.k }
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide
        })
      })),
    []
  );
  const embers = useMemo(() => {
    const n = 46;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3);
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.25;
      p.set([Math.cos(a) * r, 0.25, Math.sin(a) * r], i * 3);
      s[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(s, 1));
    const mat = new THREE.ShaderMaterial({ vertexShader: EMBER_VERT, fragmentShader: EMBER_FRAG, uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    return { g, mat };
  }, []);
  const glow = useRef<THREE.Mesh>(null!);
  useFrame((_, dt) => {
    for (const l of layers) l.mat.uniforms.uTime.value += dt;
    embers.mat.uniforms.uTime.value += dt;
  });
  if (!lit) return null;
  return (
    <group position={[0, 0.12, 0]}>
      {layers.map((l, i) => (
        <mesh key={i} geometry={geo} material={l.mat} scale={l.s as [number, number, number]} renderOrder={5 + i} />
      ))}
      <points geometry={embers.g} material={embers.mat} renderOrder={8} />
      {/* 火塘底部被火光照亮的炭床 */}
      <mesh ref={glow} rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color="#ff7a2a" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** 枯枝锥形柴堆：从 dry_branches 模型里取 3 根枯枝，复用 6 次斜靠成一圈 */
function Teepee() {
  const { scene } = useGLTF(HQ_DIR + "dry_branches.glb", false);
  const sticks = useMemo(() => {
    const geos: { geo: THREE.BufferGeometry; mat: THREE.Material; len: number }[] = [];
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
      g.computeBoundingBox();
      const size = g.boundingBox!.getSize(new THREE.Vector3());
      // 把最长轴转到 z 轴，并居中
      if (size.x > size.z && size.x > size.y) g.rotateY(Math.PI / 2);
      else if (size.y > size.z) g.rotateX(Math.PI / 2);
      g.center();
      g.computeBoundingBox();
      const mat = stylize((m.material as THREE.MeshStandardMaterial).clone(), PALETTE.dry_branches);
      geos.push({ geo: g, mat, len: g.boundingBox!.getSize(new THREE.Vector3()).z });
    });
    const out: { geo: THREE.BufferGeometry; mat: THREE.Material; pos: THREE.Vector3; quat: THREE.Quaternion; scale: number }[] = [];
    const N = 7;
    for (let i = 0; i < N; i++) {
      const src = geos[i % geos.length];
      const a = (i / N) * Math.PI * 2 + (i % 2) * 0.2;
      const R = 0.38 + (i % 3) * 0.05;
      const H = 0.62 + (i % 2) * 0.08;
      const bottom = new THREE.Vector3(Math.cos(a) * R, 0.02, Math.sin(a) * R);
      const top = new THREE.Vector3(Math.cos(a + 2.4) * 0.05, H, Math.sin(a + 2.4) * 0.05);
      const want = bottom.distanceTo(top) * 1.15;
      const dir = top.clone().sub(bottom).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      // 绕自身轴随机转一下，避免看起来一模一样
      quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), i * 1.7));
      out.push({ geo: src.geo, mat: src.mat, pos: bottom.clone().lerp(top, 0.5), quat, scale: want / src.len });
    }
    return out;
  }, [scene]);
  return (
    <group>
      {sticks.map((s, i) => (
        <mesh key={i} geometry={s.geo} material={s.mat} position={s.pos} quaternion={s.quat} scale={s.scale} castShadow receiveShadow />
      ))}
    </group>
  );
}

export function Campfire3D({ lit }: { lit: boolean }) {
  const light = useRef<THREE.PointLight>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (light.current) light.current.intensity = lit ? 7 + Math.sin(t * 13) * 1.3 + Math.sin(t * 7.3) * 0.9 : 0;
  });
  const y = terrainHeight(CAMPFIRE.x, CAMPFIRE.z) + 0.06;
  return (
    <group position={[CAMPFIRE.x, y, CAMPFIRE.z]}>
      <Teepee />
      <Flames lit={lit} />
      <pointLight ref={light} position={[0, 0.9, 0]} color="#ff9440" distance={7} decay={1.6} />
    </group>
  );
}
