import { terrainHeight, terraceAt } from '../groundHeight';
export { terrainHeight, terraceAt } from '../groundHeight';
import { landscapeAt } from '../landscape';
import { useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { ISLAND, islandK } from "../layout";
import { AO_RECT, aoTexture } from "./ao";

/**
 * 岛屿地形（参考《集合啦！动物森友会》）：
 * - 中央是暖黄色细沙广场，水线附近是颜色更深的湿沙；
 * - 后半圈是抬高约 0.3 米的草地台地，台地边缘露出一圈橙褐色土崖；
 * - 草地是平整的鲜绿色，带动森标志性的三角形小斑纹（程序生成贴图）。
 */
const TERRACE = 0.3;
const sstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** 动森式草地贴图：鲜绿底色 + 柔和的深浅块 + 散落的小三角形 */
function grassTexture() {
  const N = 512;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#88ad65";
  ctx.fillRect(0, 0, N, N);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  // 柔和的深浅块
  for (let i = 0; i < 40; i++) {
    const x = rnd() * N, y = rnd() * N, r = 30 + rnd() * 70;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = rnd() < 0.5 ? "rgba(117,151,86,0.25)" : "rgba(180,205,128,0.22)";
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.restore();
    }
  }
  // 小三角形斑纹
  const cols = ["#adc889", "#bed294", "#87aa68", "#c8d89f", "#a4c17e"];
  for (let i = 0; i < 230; i++) {
    const x = rnd() * N, y = rnd() * N, s = 3 + rnd() * 5, a = rnd() * Math.PI * 2;
    ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const aa = a + (k * Math.PI * 2) / 3;
      const px = x + Math.cos(aa) * s, py = y + Math.sin(aa) * s * 0.8;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function Terrain() {
  const [sand, sandN] = useTexture(["/textures/sand_Diffuse.jpg", "/textures/sand_nor_gl.jpg"]);
  const geo = useMemo(() => {
    const size = 64;
    const g = new THREE.PlaneGeometry(size, size, 240, 240);
    g.rotateX(-Math.PI / 2);
    g.translate(ISLAND.cx, 0, ISLAND.cz);
    const pos = g.attributes.position;
    const grassW = new Float32Array(pos.count);
    const pathW = new Float32Array(pos.count);
    const wetW = new Float32Array(pos.count);
    const cliffW = new Float32Array(pos.count);
    const e = 0.06;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, terrainHeight(x, z));
      const k = islandK(x, z);
      const t = terraceAt(x, z) / TERRACE;
      // 台地顶面才是草，侧面土崖露出泥土
      const ground=landscapeAt(x,z);
      pathW[i]=ground.path;
      grassW[i] = Math.max(sstep(0.8, 0.95, t)*(1-ground.path),ground.lawn);
      const slope = Math.hypot(terraceAt(x + e, z) - terraceAt(x - e, z), terraceAt(x, z + e) - terraceAt(x, z - e)) / (2 * e);
      cliffW[i] = Math.min(1, slope * 2.2) * (1 - grassW[i] * 0.8);
      wetW[i] = sstep(1.18, 1.32, k);
    }
    g.setAttribute("aPath", new THREE.BufferAttribute(pathW, 1));
    g.setAttribute("aGrass", new THREE.BufferAttribute(grassW, 1));
    g.setAttribute("aWet", new THREE.BufferAttribute(wetW, 1));
    g.setAttribute("aCliff", new THREE.BufferAttribute(cliffW, 1));
    g.computeVertexNormals();
    return g;
  }, []);

  const mat = useMemo(() => {
    for (const t of [sand, sandN]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
    }
    sand.colorSpace = THREE.SRGBColorSpace;
    const grass = grassTexture();
    const m = new THREE.MeshStandardMaterial({ roughness: 0.95, envMapIntensity: 0.5 });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uGrass = { value: grass };
      shader.uniforms.uSand = { value: sand };
      shader.uniforms.uSandN = { value: sandN };
      shader.uniforms.uAo = { value: aoTexture() };
      shader.uniforms.uAoRect = { value: new THREE.Vector3(AO_RECT.minX, AO_RECT.minZ, AO_RECT.size) };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aPath;\nvarying float vPath;\nattribute float aGrass;\nattribute float aWet;\nattribute float aCliff;\nvarying float vGrass;\nvarying float vWet;\nvarying float vCliff;\nvarying vec3 vWorldP;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPath = aPath;\nvGrass = aGrass;\nvWet = aWet;\nvCliff = aCliff;\nvWorldP = (modelMatrix * vec4(position, 1.0)).xyz;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vPath;\nuniform sampler2D uGrass;\nuniform sampler2D uSand;\nuniform sampler2D uSandN;\nuniform sampler2D uAo;\nuniform vec3 uAoRect;\nvarying float vGrass;\nvarying float vWet;\nvarying float vCliff;\nvarying vec3 vWorldP;")
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          vec2 xz = vWorldP.xz;
          // 暖黄细沙：保留很淡的颗粒，大尺度轻微明暗起伏
          float grain = dot(texture2D(uSand, xz * 0.16).rgb, vec3(0.333)) - 0.5;
          float big = 0.5 + 0.5 * sin(xz.x * 0.37 + sin(xz.y * 0.29) * 2.0);
          vec3 sandCol = vec3(0.86, 0.72, 0.47) * (1.0 + grain * 0.07) * (0.97 + big * 0.05);
          // 动森式沙地颗粒点：零星的深浅小圆点
          vec2 sg = xz * 9.0;
          vec2 sc = floor(sg);
          float sh = fract(sin(dot(sc, vec2(127.1, 311.7))) * 43758.5453);
          vec2 so = vec2(fract(sh * 13.7), fract(sh * 7.3)) * 0.6 + 0.2;
          float speck = smoothstep(0.13, 0.07, length(fract(sg) - so));
          sandCol *= 1.0 - speck * (sh > 0.72 ? 0.1 : 0.0) + speck * (sh < 0.12 ? 0.06 : 0.0);
          sandCol = mix(sandCol, vec3(0.70, 0.53, 0.31), vWet);
          // 草地：动森式三角斑纹
          vec3 grassCol = texture2D(uGrass, xz * 0.16).rgb;
          // 土崖：橙褐色，带水平的土层纹
          float strata = 0.5 + 0.5 * sin(vWorldP.y * 70.0 + sin(xz.x * 2.0) * 1.5);
          vec3 cliffCol = mix(vec3(0.62, 0.34, 0.16), vec3(0.74, 0.44, 0.22), strata);
          vec3 trailCol = vec3(0.76, 0.63, 0.43) * (0.98 + grain * 0.035);
          vec3 col = mix(mix(sandCol, trailCol, vPath * 0.85), cliffCol, vCliff);
          col = mix(col, grassCol, vGrass);
          // 烘焙的环境光遮蔽：只作用在草地台地和土崖上；浅色沙地上的径向暗斑像一团团脏污，所以沙地不叠加
          float ao = mix(1.0, texture2D(uAo, (xz - uAoRect.xy) / uAoRect.z).r, max(vGrass, vCliff));
          diffuseColor.rgb = col * ao;`
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
          // 沙地用很淡的细沙法线（世界空间近似：地面基本水平）；草地保持平整
          vec3 sn = texture2D(uSandN, vWorldP.xz * 0.16).xyz * 2.0 - 1.0;
          vec3 sandNormal = normalize((viewMatrix * vec4(normalize(vec3(sn.x * 0.18, 1.0, -sn.y * 0.18)), 0.0)).xyz);
          normal = normalize(mix(normal, sandNormal, (1.0 - vGrass) * (1.0 - vCliff) * 0.6));`
        );
    };
    return m;
  }, [sand, sandN]);

  return <mesh geometry={geo} material={mat} receiveShadow />;
}
