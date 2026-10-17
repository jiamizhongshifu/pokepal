import { useMemo } from "react";
import * as THREE from "three";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js";
import { TENT } from "../layout";
import { terrainHeight } from "./Terrain";

/**
 * 宝可梦露营帐篷（参考剑盾 / 朱紫的露营帐篷）：双杆交叉的穹顶帐篷，精灵球配色——红色顶盖、黑色腰带、白色下摆。
 * 参数曲面建模（约 2 万面），帆布在两根支撑杆之间自然下垂；正面是卷起门帘的门洞，四角有拉绳和地钉。
 */
const RX = 1.45, RZ = 1.2, H = 1.7;
const DOOR_A = Math.PI / 2; // 门朝本地 +z
const DOOR_TOP = 0.28;
/** 精灵球腰带（参数 v 区间）：v≈0.33 对应半高 */
const BAND = [0.305, 0.365];

function shape(a: number, v: number, target: THREE.Vector3) {
  const el = (v * Math.PI) / 2;
  const r = Math.cos(el);
  // 两根支撑杆沿对角线，杆之间的帆布向内下垂
  const sag = 1 - 0.075 * Math.abs(Math.sin(2 * (a - Math.PI / 4))) * Math.sin(el * 2);
  let x = RX * r * Math.cos(a) * sag;
  let z = RZ * r * Math.sin(a) * sag;
  let y = Math.sin(el) * H;
  // 门洞向里凹进去一点
  const door = doorMask(a, v);
  if (door > 0) {
    x *= 1 - 0.1 * door;
    z *= 1 - 0.1 * door;
    y *= 1 - 0.02 * door;
  }
  return target.set(x, y, z);
}

function doorMask(a: number, v: number) {
  if (v > DOOR_TOP) return 0;
  const half = 0.42 * Math.sqrt(Math.max(0, 1 - Math.pow(v / DOOR_TOP, 2)));
  const d = Math.abs(a - DOOR_A);
  return THREE.MathUtils.smoothstep(half - d, 0, 0.05);
}

function weaveTexture() {
  const N = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const wx = Math.sin((x / N) * Math.PI * 32), wy = Math.sin((y / N) * Math.PI * 32);
      const v = 128 + (((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? wx : wy) * 50) + (Math.random() - 0.5) * 30;
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 4);
  return t;
}

export function Tent() {
  const { body, poles, ropes, flap, button } = useMemo(() => {
    const geo = new ParametricGeometry((u, v, t) => shape(u * Math.PI * 2, v, t), 220, 64);
    const uv = geo.attributes.uv;
    const col = new Float32Array(uv.count * 3);
    const red = new THREE.Color("#d83a2e"), white = new THREE.Color("#f5f1e6"), black = new THREE.Color("#2a2a33"), inside = new THREE.Color("#4a2e24");
    const c = new THREE.Color();
    for (let i = 0; i < uv.count; i++) {
      const a = uv.getX(i) * Math.PI * 2, v = uv.getY(i);
      // 精灵球配色：顶盖红、腰带黑、下摆白
      if (v > BAND[1]) c.copy(red);
      else if (v > BAND[0]) c.copy(black);
      else c.copy(white);
      // 两根支撑杆的缝线略暗
      const seam = Math.abs(Math.sin(2 * (a - Math.PI / 4)));
      if (seam < 0.03) c.multiplyScalar(0.82);
      // 门洞：露出昏暗的帐篷内部
      const d = doorMask(a, v);
      if (d > 0) c.lerp(inside, d);
      // 下摆贴地处稍暗（泥土和阴影）
      if (v < 0.04) c.multiplyScalar(0.85 + v * 3.7);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();

    // 支撑杆：沿两条对角线翻过顶部
    const poleCurve = (a0: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i++) pts.push(shape(a0, i / 24, new THREE.Vector3()).multiplyScalar(1.012));
      for (let i = 23; i >= 0; i--) pts.push(shape(a0 + Math.PI, i / 24, new THREE.Vector3()).multiplyScalar(1.012));
      return new THREE.CatmullRomCurve3(pts);
    };
    const poles = [Math.PI / 4, (3 * Math.PI) / 4].map((a) => new THREE.TubeGeometry(poleCurve(a), 120, 0.022, 8, false));

    // 拉绳 + 地钉：从四根杆的中段拉到地面
    const ropes: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const from = shape(a, 0.45, new THREE.Vector3());
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const to = new THREE.Vector3(Math.cos(a) * RX * 1.45, 0.05, Math.sin(a) * RZ * 1.45);
      const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, -0.04, 0));
      ropes.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(from, mid, to), 16, 0.008, 5, false));
      const stake = new THREE.CylinderGeometry(0.018, 0.008, 0.22, 6);
      stake.rotateZ(0.35);
      stake.rotateY(-Math.atan2(dir.z, dir.x));
      stake.translate(to.x, 0.06, to.z);
      ropes.push(stake);
    }

    // 卷起的门帘：门洞上沿一卷白色帆布
    const top = shape(DOOR_A, DOOR_TOP + 0.005, new THREE.Vector3());
    const flap = new THREE.CylinderGeometry(0.065, 0.065, 0.95, 24, 1);
    flap.rotateZ(Math.PI / 2);
    flap.translate(top.x, top.y, top.z * 1.05);
    // 精灵球按钮：腰带正中、门的正上方
    const bc = shape(DOOR_A, (BAND[0] + BAND[1]) / 2 + 0.03, new THREE.Vector3());
    // 椭球面法线
    const outward = new THREE.Vector3(bc.x / (RX * RX), bc.y / (H * H), bc.z / (RZ * RZ)).normalize();
    const button = { pos: bc.clone().addScaledVector(outward, 0.012), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward) };
    return { body: geo, poles, ropes, flap, button };
  }, []);

  const mats = useMemo(() => {
    const bump = weaveTexture();
    return {
      body: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, side: THREE.DoubleSide, bumpMap: bump, bumpScale: 0.014 }),
      pole: new THREE.MeshStandardMaterial({ color: "#3a3d46", roughness: 0.45, metalness: 0.4 }),
      rope: new THREE.MeshStandardMaterial({ color: "#d9cfb4", roughness: 0.9 }),
      flap: new THREE.MeshStandardMaterial({ color: "#f2ede2", roughness: 0.85, bumpMap: bump, bumpScale: 0.014 }),
      btnRing: new THREE.MeshStandardMaterial({ color: "#2a2a33", roughness: 0.6 }),
      btn: new THREE.MeshStandardMaterial({ color: "#fbfaf6", roughness: 0.35 })
    };
  }, []);

  const rotY = 0.62;
  return (
    <group position={[TENT.x, terrainHeight(TENT.x, TENT.z) - 0.02, TENT.z]} rotation-y={rotY}>
      <mesh geometry={body} material={mats.body} castShadow receiveShadow />
      {poles.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.pole} castShadow />
      ))}
      {ropes.map((g, i) => (
        <mesh key={`r${i}`} geometry={g} material={mats.rope} castShadow />
      ))}
      <mesh geometry={flap} material={mats.flap} castShadow />
      <group position={button.pos} quaternion={button.quat}>
        <mesh material={mats.btnRing} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.2, 0.2, 0.04, 40]} />
        </mesh>
        <mesh material={mats.btn} position={[0, 0, 0.025]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.13, 0.13, 0.04, 40]} />
        </mesh>
      </group>
    </group>
  );
}
