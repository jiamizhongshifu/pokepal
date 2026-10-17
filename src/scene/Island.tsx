import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { ISLAND, northScale } from "./layout";
import { FOG, HEIGHT_FOG_GLSL } from "./hq/fog";

/**
 * 《风/波》式热带海面：浅水透明透出沙底、深处渐变海蓝、岸边浪花、菲涅尔反射。
 */

const OCEAN_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  uniform float uNorthScale;
  uniform vec4 uIsland;
  varying vec3 vWorld;
  varying float vWave;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    // 离岸越近浪越小，靠岸处几乎平静，避免浪尖穿出沙滩
    float k = length(vec2((world.x - uIsland.x) / uIsland.z, (world.z - uIsland.y) / (uIsland.w * (world.z < uIsland.y ? uNorthScale : 1.0))));
    float amp = smoothstep(1.3, 1.75, k);
    float w = (sin(world.x * 0.55 + uTime * 0.9) * 0.05 + sin(world.z * 0.7 - uTime * 1.1) * 0.04 + sin((world.x + world.z) * 1.3 + uTime * 1.7) * 0.02) * amp * (.6 + uWind * 1.2);
    world.y += w;
    vWave = w;
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const OCEAN_FRAG = /* glsl */ `
  ${HEIGHT_FOG_GLSL}
  uniform float uTime;
  uniform float uWind;
  uniform vec3 uShallow;
  uniform vec3 uMid;
  uniform vec3 uDeep;
  uniform vec3 uFoam;
  uniform float uNorthScale;
  uniform vec4 uIsland; // cx, cz, rx, rz
  uniform float uBeach;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vWorld;
  varying float vWave;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    float k = length(vec2((vWorld.x - uIsland.x) / uIsland.z, (vWorld.z - uIsland.y) / (uIsland.w * (vWorld.z < uIsland.y ? uNorthScale : 1.0))));
    // 岛内部（海岸线以内）不画海面，从根源上杜绝海水从草地、沙滩下面冒出来
    if (k < 1.22) discard;
    float d = k - 1.32;                   // 离岸距离：地形在 k≈1.32 没入海面
    float ang = atan(vWorld.z - uIsland.y, vWorld.x - uIsland.x);
    // 动森式分层海色：浅滩青绿 → 天蓝 → 深海蓝，层次清楚
    vec3 col = mix(uShallow, uMid, smoothstep(0.06, 0.2, d));
    col = mix(col, uDeep, smoothstep(0.42, 0.8, d));
    // 岸边浪花：一道波浪形、前后涌动的白边，外面再一道细浪线
    float swash = sin(uTime * 0.9) * 0.022;
    float edge = 0.012 + swash + sin(ang * 22.0 + uTime * 0.6) * 0.008 + sin(ang * 9.0 - uTime * 0.4) * 0.006;
    float foam1 = smoothstep(0.022, 0.014, abs(d - edge));
    // 浪花内侧的湿润泡沫：浅浅的一层白
    float foamIn = smoothstep(edge - 0.005, edge - 0.03, d) * 0.25;
    float line2 = 0.11 + sin(uTime * 0.9 + 1.4) * 0.03 + sin(ang * 16.0 + uTime * 0.5) * 0.01;
    float foam2 = smoothstep(0.014, 0.004, abs(d - line2)) * 0.7;
    col = mix(col, uFoam, clamp(foam1 + foamIn + foam2, 0.0, 1.0));
    // 深海里一个个“︵”形小白浪纹（动森标志性的海面），缓缓漂动、时隐时现
    vec2 wp = vWorld.xz * vec2(0.42, 0.62) + vec2(uTime * 0.04, uTime * 0.015);
    vec2 cell = floor(wp);
    vec2 f = fract(wp);
    float h = hash(cell);
    vec2 c = vec2(0.35 + 0.3 * hash(cell + 7.1), 0.42);
    vec2 q = (f - c) * vec2(1.0, 1.7);
    float ring = abs(length(q) - 0.2);
    float upper = smoothstep(-0.02, 0.06, f.y - c.y);
    float pulse = smoothstep(0.15, 0.6, 0.5 + 0.5 * sin(uTime * 0.7 + h * 6.2832));
    float marks = smoothstep(0.026, 0.012, ring) * upper * step(0.6, h) * pulse;
    col = mix(col, uFoam, marks * 0.9 * smoothstep(0.3, 0.55, d) * smoothstep(5.0, 2.0, d));
    // 雾
    float fog = heightFog(vWorld, cameraPosition, uFogNear, uFogFar);
    // 浅水区清澈透出沙底，越远越不透明
    float alpha = mix(0.55, 1.0, smoothstep(0.02, 0.3, d));
    alpha = max(alpha, clamp(foam1 + foam2, 0.0, 1.0));
    // 轻微的菲涅尔（动森的海面不反光）
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
    col = mix(col, vec3(0.78, 0.92, 1.0), fres * 0.18);
    gl_FragColor = vec4(mix(col, uFogColor, fog), mix(alpha, 1.0, fog));
    #include <colorspace_fragment>
  }
`;

export function Ocean({ fogColor, night,wind=.25 }: { fogColor: string; night: boolean;wind?:number }) {
  const mat = useRef<THREE.ShaderMaterial>(null!);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },uWind:{value:wind},
      uNorthScale:{value:northScale()},
      uShallow: { value: new THREE.Color("#6fe8d8") },
      uMid: { value: new THREE.Color("#2cc5d8") },
      uDeep: { value: new THREE.Color("#1474d8") },
      uFoam: { value: new THREE.Color("#ffffff") },
      uIsland: { value: new THREE.Vector4(ISLAND.cx, ISLAND.cz, ISLAND.rx, ISLAND.rz) },
      uBeach: { value: ISLAND.beach },
      uFogColor: { value: new THREE.Color(fogColor) },
      uFogNear: { value: FOG.near },
      uFogFar: { value: FOG.far }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  uniforms.uFogColor.value.set(fogColor);
  uniforms.uNorthScale.value=northScale();
  // 夜晚：海面整体压暗偏蓝
  uniforms.uShallow.value.set(night ? "#2f7f9a" : "#78e6dc");
  uniforms.uMid.value.set(night ? "#17507a" : "#2fb8ea");
  uniforms.uDeep.value.set(night ? "#0b2650" : "#1f6fe0");
  uniforms.uFoam.value.set(night ? "#9fc8e8" : "#ffffff");
  useFrame((_, dt) => {
    if (mat.current){mat.current.uniforms.uTime.value += Math.min(dt,.05);uniforms.uWind.value=THREE.MathUtils.damp(uniforms.uWind.value,wind,1,Math.min(dt,.05));}
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.12, 0]}>
      <planeGeometry args={[420, 420, 200, 200]} />
      <shaderMaterial ref={mat} vertexShader={OCEAN_VERT} fragmentShader={OCEAN_FRAG} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  );
}
