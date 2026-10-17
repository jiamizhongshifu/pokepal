import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

/**
 * 3D 模型清单项。
 * rot：模型自身朝向修正 [x, y, z]（度），目标是"正面朝 +Z、头朝上"。
 * scale：按身高归一化后的额外缩放；idle / walk：手动指定动作名。
 */
export interface ModelEntry {
  file: string;
  rot?: [number, number, number];
  scale?: number;
  idle?: string;
  walk?: string;
  /** 骨骼静止姿态有问题的模型：定格在这个动作的第一帧作为站姿 */
  pose?: string;
}

/** 不启用 Draco：Tripo 和 Blender 脚本产出的模型都未做 Draco 压缩，也避免从外网加载解码器 */
export const DRACO_PATH = false;
export const modelUrl = (e: ModelEntry) => `/models/pokemon/${e.file}`;

/** 统一材质：透明混合改为透明度裁剪，避免半透明和排序问题；开启阴影 */
function fixMaterials(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false; // 骨骼动画会让包围盒不准，避免被误裁掉
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => {
      if (m.transparent) {
        m.transparent = false;
        m.alphaTest = 0.5;
        m.depthWrite = true;
      }
      m.side = THREE.FrontSide;
    });
  });
}

/** 克隆模型、修正朝向、按目标尺寸缩放，并让脚底落在 y=0、水平居中 */
export function normalizeModel(scene: THREE.Object3D, entry: ModelEntry, target: { height?: number; maxSize?: number }, animations: THREE.AnimationClip[] = []) {
  const c = SkeletonUtils.clone(scene);
  fixMaterials(c);
  const [rx, ry, rz] = entry.rot ?? [0, 0, 0];
  const d = Math.PI / 180;
  c.rotation.set(rx * d, ry * d, rz * d);
  // 有定格姿势时先摆好姿势再测量，否则会按塌缩的静止姿态算尺寸
  const poseClip = entry.pose ? animations.find((a) => a.name === entry.pose) : undefined;
  if (poseClip) {
    const mixer = new THREE.AnimationMixer(c);
    mixer.clipAction(poseClip).play();
    mixer.update(0);
  }
  c.updateMatrixWorld(true);
  // 蒙皮模型要先刷新骨骼矩阵，逐顶点测量才是当前姿势的真实尺寸
  c.traverse((o) => {
    const sm = o as THREE.SkinnedMesh;
    if (sm.isSkinnedMesh) sm.skeleton.update();
  });
  const box = new THREE.Box3().setFromObject(c, true);
  const size = box.getSize(new THREE.Vector3());
  const s = target.height ? target.height / Math.max(size.y, 0.001) : (target.maxSize ?? 1) / Math.max(size.x, size.y, size.z, 0.001);
  c.scale.setScalar(s * (entry.scale ?? 1));
  const k = s * (entry.scale ?? 1);
  c.position.set(-((box.min.x + box.max.x) / 2) * k, -box.min.y * k, -((box.min.z + box.max.z) / 2) * k);
  // Rotation-independent footprint for turning, tails and broad bodies. Measured once, not per frame.
  c.userData.collisionRadius = Math.hypot(size.x, size.z) * k / 2 + .10;
  return c;
}
