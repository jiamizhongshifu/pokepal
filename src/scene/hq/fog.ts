import * as THREE from "three";

/**
 * 高度雾（近似体积雾）：替换 three.js 内置的线性雾。
 * - 按到相机的真实距离计算，fogNear 以内完全清晰，主岛几乎不受影响；
 * - 贴近海面的雾更浓，越往高处越稀薄，远处小岛的山脚隐在海雾里、山顶淡淡透出来，形成远近层次。
 * 海面着色器用同一套公式（见 Island.tsx 的 heightFog）。
 */
export const FOG = { near: 36, far: 140, k: 2.4, falloff: 0.16 };

export const HEIGHT_FOG_GLSL = /* glsl */ `
  float heightFog(vec3 world, vec3 cam, float fNear, float fFar) {
    float dist = length(world - cam);
    float h = max(world.y + 0.6, 0.0);
    float dens = mix(0.4, 1.0, exp(-h * ${FOG.falloff.toFixed(3)}));
    float amt = max(dist - fNear, 0.0) / (fFar - fNear);
    return clamp(1.0 - exp(-amt * ${FOG.k.toFixed(2)} * dens), 0.0, 1.0);
  }
`;

let installed = false;
export function installHeightFog() {
  if (installed) return;
  installed = true;
  const C = THREE.ShaderChunk as Record<string, string>;
  C.fog_pars_vertex = `#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogWorld;
#endif`;
  C.fog_vertex = `#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogWorld = (inverse(viewMatrix) * mvPosition).xyz;
#endif`;
  C.fog_pars_fragment = `#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
  ${HEIGHT_FOG_GLSL}
#endif`;
  C.fog_fragment = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = heightFog(vFogWorld, cameraPosition, fogNear, fogFar);
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
}
