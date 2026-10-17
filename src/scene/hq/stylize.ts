import * as THREE from "three";

/**
 * 动森式风格化：把照片扫描模型的贴图“压”成干净的卡通配色。
 * - 用贴图最低一级 mipmap 求出平均色，原贴图只保留相对明暗（细节减半），颜色换成统一色板；
 * - 法线凹凸减弱、反射减弱，表面像上过釉的黏土，和程序化的帐篷 / 椰子树 / 草地统一。
 * palette 为空时只做提饱和、压对比（用于蕨类等植物）。
 */
export function stylize(mat: THREE.MeshStandardMaterial, palette?: string, detail = 0.5) {
  const pal = new THREE.Color(palette ?? "#ffffff");
  mat.color.set("#ffffff");
  if (mat.normalScale) mat.normalScale.multiplyScalar(0.4);
  mat.roughness = Math.max(mat.roughness, 0.82);
  mat.metalness = 0;
  mat.envMapIntensity = 0.45;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPal = { value: pal };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nuniform vec3 uPal;`)
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
          vec4 texel = texture2D( map, vMapUv );
          vec3 avg = textureLod( map, vMapUv, 12.0 ).rgb;
          float lum = dot( texel.rgb, vec3( 0.299, 0.587, 0.114 ) );
          float avgLum = max( dot( avg, vec3( 0.299, 0.587, 0.114 ) ), 0.02 );
          float rel = clamp( lum / avgLum, 0.45, 1.7 );
          ${palette
            ? `vec3 styl = uPal * mix( 1.0, rel, ${detail.toFixed(2)} );`
            : `vec3 sat = mix( vec3( lum ), texel.rgb, 1.35 );
               vec3 styl = mix( avg, sat, 0.7 ) * 1.08;`}
          diffuseColor *= vec4( styl, texel.a );
        #endif`
      );
  };
  mat.customProgramCacheKey = () => `stylize-${palette ?? "plant"}-${detail}`;
  mat.needsUpdate = true;
  return mat;
}

/** 各模型的色板（sRGB） */
export const PALETTE: Record<string, string | undefined> = {
  pier: "#c99560",
  dead_tree_trunk: "#a06c42",
  dry_branches: "#8c5f3a",
  stone_fire_pit: "#948b81",
  rock_09: "#bdb3a5",
  stone_01: "#d4ccbf",
  wooden_crate_01: "#c88d55",
  wooden_bucket_01: "#bd8450",
  wooden_lantern_01: "#a9764a",
  wicker_basket_01: "#d6a866",
  lambis_shell: "#f6dccb"
};
