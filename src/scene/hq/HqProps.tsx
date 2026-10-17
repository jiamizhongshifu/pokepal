import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { HQ_DIR, HQ_PROPS, type Placement } from "../layout";
import { terrainHeight } from "./Terrain";
import { PALETTE, stylize } from "./stylize";

/**
 * Poly Haven 模型（CC0，Blender 减面）：栈桥、露营物资、海螺。
 * 岸边岩石和火塘石圈由 CoastalRocks 的圆润几何绘制。
 * 按布局逐个放置，自动贴地（按模型包围盒底部对齐地形高度）；材质统一做动森式风格化（见 stylize.ts）。
 */
/** 程序化建模的道具（原木长凳、花灌木、雪松、海星）不走 glb 加载 */
const PROCEDURAL = new Set(["log_seat", "shrub", "cedar", "starfish"]);
const GLB_PROPS = HQ_PROPS.filter((p) => !PROCEDURAL.has(p.m));
const NAMES = [...new Set(GLB_PROPS.map((p) => p.m))];
NAMES.forEach((n) => useGLTF.preload(HQ_DIR + n + ".glb", false));

function Prop({ p }: { p: Placement }) {
  const { scene } = useGLTF(HQ_DIR + p.m + ".glb", false);
  const { obj, minY } = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = p.shadow !== false;
      m.receiveShadow = true;
      const src = m.material as THREE.MeshStandardMaterial;
      const mat = stylize(src.clone(), PALETTE[p.m]);
      m.material = mat;
    });
    const box = new THREE.Box3().setFromObject(c);
    return { obj: c, minY: box.min.y };
  }, [scene, p.m, p.shadow]);
  const scale: [number, number, number] = p.sv ?? [p.s ?? 1, p.s ?? 1, p.s ?? 1];
  const y = p.abs ? p.y ?? 0 : terrainHeight(p.x, p.z) - minY * scale[1] + (p.y ?? 0);
  const tilt = p.tilt ?? [0, 0];
  return (
    <primitive
      name={`hq-${p.m}`}
      object={obj}
      position={[p.x, y, p.z]}
      rotation={[(tilt[0] * Math.PI) / 180, ((p.r ?? 0) * Math.PI) / 180, (tilt[1] * Math.PI) / 180]}
      scale={scale}
    />
  );
}

export function HqProps() {
  return (
    <>
      {GLB_PROPS.map((p, i) => (
        <Prop key={i} p={p} />
      ))}
    </>
  );
}
