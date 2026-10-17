import {useFrame} from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

/** 渐变天穹：天顶饱和蓝 → 地平线浅青，带太阳光晕（风波式晴空）；后期处理会作用到天空上 */
const PRESET = {
  morning: { top: "#4f9ef0", mid: "#9fd2ff", horizon: "#ffe6c8", sun: "#ffd9a0" },
  day: { top: "#1f7fe8", mid: "#5fb3ff", horizon: "#c4ecff", sun: "#fff6d8" },
  evening: { top: "#4a5fc8", mid: "#c18fd8", horizon: "#ffc7a0", sun: "#ffb070" },
  night: { top: "#040d20", mid: "#0a1e3a", horizon: "#123456", sun: "#a8c4ff" }
};

export function SkyDome({ sky, sunDir, cloud=0 }: { cloud?:number;sky: keyof typeof PRESET; sunDir: [number, number, number] }) {
  const p = PRESET[sky];
  const uniforms = useMemo(
    () => ({
      uCloud:{value:cloud},
      uOvercast:{value:new THREE.Color(sky==='night'?'#172a40':'#b0c8d5')},
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSun: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() }
    }),
    []
  );
  uniforms.uOvercast.value.set(sky==='night'?'#172a40':'#b0c8d5');
  uniforms.uTop.value.set(p.top);
  uniforms.uMid.value.set(p.mid);
  uniforms.uHorizon.value.set(p.horizon);
  uniforms.uSun.value.set(p.sun);
  uniforms.uSunDir.value.set(...sunDir).normalize();
  useFrame((_,dt)=>{uniforms.uCloud.value=THREE.MathUtils.damp(uniforms.uCloud.value,cloud,1,Math.min(dt,.05));});
  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[150, 32, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={`varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; }`}
        fragmentShader={`
          uniform float uCloud;
          uniform vec3 uOvercast;
          uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir;
          varying vec3 vDir;
          void main(){
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.18, h));
            col = mix(col, uTop, smoothstep(0.18, 0.75, h));
            float s = max(dot(normalize(vDir), uSunDir), 0.0);
            col += uSun * (pow(s, 64.0) * 0.6 + pow(s, 8.0) * 0.12);
            col=mix(col,uOvercast,uCloud*.75);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`}
      />
    </mesh>
  );
}
