import { useMemo } from "react";
import * as THREE from "three";
import { HQ_PROPS } from "../layout";
import { terrainHeight } from "./Terrain";

/**
 * 原木长凳（参考《集合啦！动物森友会》的原木椅）：干净的圆木，树皮有纵向纹理和节疤，
 * 两端切面是浅色年轮。长约 1.9 米、直径约 0.42 米，小宝可梦刚好坐上去。
 */
export const LOG_R = 0.21;
const LOG_LEN = 1.9;

function ringTexture() {
  const N = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const ctx = cv.getContext("2d")!;
  const c = N / 2;
  ctx.fillStyle = "#8a5a32";
  ctx.fillRect(0, 0, N, N);
  const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.92);
  g.addColorStop(0, "#f1d29a");
  g.addColorStop(1, "#dcb174");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(170,110,55,0.55)";
  for (let r = 10; r < c * 0.88; r += 11 + (r % 7)) {
    ctx.lineWidth = 2 + (r % 3);
    ctx.beginPath();
    ctx.ellipse(c + 2, c - 1, r, r * 0.97, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // 中心髓心 + 几道干裂纹
  ctx.fillStyle = "#b07a40";
  ctx.beginPath();
  ctx.arc(c + 2, c - 1, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,72,32,0.6)";
  ctx.lineWidth = 2;
  for (const a of [0.4, 2.3, 4.1]) {
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 12, c + Math.sin(a) * 12);
    ctx.lineTo(c + Math.cos(a + 0.1) * c * 0.6, c + Math.sin(a + 0.1) * c * 0.6);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function logGeometry() {
  const g = new THREE.CylinderGeometry(LOG_R, LOG_R, LOG_LEN, 40, 24, true);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const dark = new THREE.Color("#6e4426"), light = new THREE.Color("#9a6a3e"), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    // 纵向树皮纹 + 两个节疤
    const ridge = Math.sin(a * 16 + Math.sin(y * 4) * 1.2) * 0.5 + 0.5;
    const knot = Math.exp(-((y - 0.35) ** 2 + (a - 1.2) ** 2 * 0.02) * 60) + Math.exp(-((y + 0.5) ** 2 + (a + 2) ** 2 * 0.02) * 60);
    const end = Math.max(0, Math.abs(y) - LOG_LEN / 2 + 0.03) * 8; // 两端略收
    const r = LOG_R * (1 + ridge * 0.045 + knot * 0.12 - end * 0.15);
    pos.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r);
    c.copy(dark).lerp(light, ridge * 0.8).multiplyScalar(1 - knot * 0.25);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export function LogSeats() {
  const { body, cap, bodyMat, capMat } = useMemo(() => {
    const body = logGeometry();
    const cap = new THREE.CircleGeometry(LOG_R * 1.0, 40);
    return {
      body,
      cap,
      bodyMat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, envMapIntensity: 0.4 }),
      capMat: new THREE.MeshStandardMaterial({ map: ringTexture(), roughness: 0.85, envMapIntensity: 0.4 })
    };
  }, []);
  const logs = HQ_PROPS.filter((p) => p.m === "log_seat");
  return (
    <>
      {logs.map((p, i) => {
        const y = terrainHeight(p.x, p.z) + LOG_R - 0.03;
        return (
          <group key={i} position={[p.x, y, p.z]} rotation-y={((p.r ?? 0) * Math.PI) / 180}>
            <group rotation-z={Math.PI / 2}>
              <mesh geometry={body} material={bodyMat} castShadow receiveShadow />
              <mesh geometry={cap} material={capMat} position-y={LOG_LEN / 2 - 0.01} rotation-x={-Math.PI / 2} castShadow />
              <mesh geometry={cap} material={capMat} position-y={-LOG_LEN / 2 + 0.01} rotation-x={Math.PI / 2} castShadow />
            </group>
          </group>
        );
      })}
    </>
  );
}
