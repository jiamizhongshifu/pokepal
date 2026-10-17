import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Effect } from "postprocessing";

/**
 * 镜头对焦（电影感）：画面中心清晰，越靠近四角越虚。
 * 场景先渲染到带 mipmap 的离屏纹理，再用一个全屏着色器按“离中心的椭圆距离”选取更模糊的 mipmap 层级。
 * 只多一次全屏绘制，mipmap 由硬件生成，开销远低于 CSS backdrop-filter。
 */
const FOCUS_GLSL = /* glsl */ `
  float focusK(vec2 uv) {
    vec2 c = (uv - vec2(0.5, 0.47)) * vec2(1.0 / 0.72, 1.0 / 0.76);
    return smoothstep(0.62, 1.15, length(c));
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D tScene;
  uniform vec2 uTexel;
  varying vec2 vUv;
  ${FOCUS_GLSL}
  void main() {
    vec4 col = textureLod(tScene, vUv, 0.0);
    float k = focusK(vUv);
    if (k > 0.002) {
      float lod = k * 3.2;
      vec2 o = uTexel * exp2(lod) * 0.75;
      vec4 b = textureLod(tScene, vUv + vec2(o.x, o.y), lod) + textureLod(tScene, vUv + vec2(-o.x, o.y), lod)
             + textureLod(tScene, vUv + vec2(o.x, -o.y), lod) + textureLod(tScene, vUv - o, lod);
      col = mix(col, b * 0.25, smoothstep(0.0, 0.3, k));
    }
    gl_FragColor = col;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function FocusBlur({ samples = 4 }: { samples?: number }) {
  const { gl, scene, camera } = useThree();
  const rt = useMemo(
    () =>
      new THREE.WebGLRenderTarget(4, 4, {
        type: THREE.HalfFloatType,
        samples,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: true
      }),
    [samples]
  );
  useEffect(() => () => rt.dispose(), [rt]);
  const { qScene, qCam, mat } = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { tScene: { value: rt.texture }, uTexel: { value: new THREE.Vector2(1, 1) } },
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    quad.frustumCulled = false;
    const qScene = new THREE.Scene();
    qScene.add(quad);
    return { qScene, qCam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mat };
  }, [rt]);
  const size = useMemo(() => new THREE.Vector2(), []);
  // 优先级 1：接管渲染（R3F 不再自动渲染场景）
  useFrame(() => {
    gl.getDrawingBufferSize(size);
    if (rt.width !== size.x || rt.height !== size.y) {
      rt.setSize(size.x, size.y);
      mat.uniforms.uTexel.value.set(1 / size.x, 1 / size.y);
    }
    const auto = gl.autoClear;
    gl.autoClear = true;
    gl.setRenderTarget(rt);
    gl.clear(true, true, true);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(qScene, qCam);
    gl.autoClear = auto;
  }, 1);
  return null;
}

/** 高画质光影模式（后期处理管线）里用的同款四角模糊：按距离放大采样半径的 9 点模糊 */
export class CornerBlurEffect extends Effect {
  constructor() {
    super(
      "CornerBlur",
      /* glsl */ `
      ${FOCUS_GLSL}
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        float k = focusK(uv);
        if (k < 0.002) { outputColor = inputColor; return; }
        vec2 o = texelSize * (1.5 + k * 7.0);
        vec4 s = inputColor;
        s += texture2D(inputBuffer, uv + vec2(o.x, 0.0)) + texture2D(inputBuffer, uv - vec2(o.x, 0.0));
        s += texture2D(inputBuffer, uv + vec2(0.0, o.y)) + texture2D(inputBuffer, uv - vec2(0.0, o.y));
        s += texture2D(inputBuffer, uv + o) + texture2D(inputBuffer, uv - o);
        s += texture2D(inputBuffer, uv + vec2(o.x, -o.y)) + texture2D(inputBuffer, uv + vec2(-o.x, o.y));
        outputColor = mix(inputColor, s / 9.0, smoothstep(0.0, 0.3, k));
      }`
    );
  }
}
