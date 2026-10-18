import {terrainHeight} from './hq/Terrain';
import type {IslandWeather} from '../lib/weather';
import {WeatherRain} from './WeatherScene';
import { UpgradeDecor } from './UpgradeDecor';
import type { UpgradeId } from '../lib/islandProgress';
import { LivingProps,TogetherBall } from './LivingProps';
import type { FurnitureId } from '../lib/islandLiving';
import type { TogetherSession } from './together';
import { LandscapeDetails } from './LandscapeDetails';
import { PicnicSnack } from './PicnicSnack';
import type { PicnicSession } from '../lib/picnic';
import { DistrictDetails } from './DistrictDetails';
import { BerryGarden, type BerryGardenProps } from './BerryGarden';
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Cloud, Clouds as VolClouds, Environment as EnvMap, OrbitControls, Stars } from "@react-three/drei";
import { Terrain } from "./hq/Terrain";
import { Grass } from "./hq/Grass";
import { Palms } from "./hq/Palm";
import { HqProps } from "./hq/HqProps";
import { CoastalRocks } from "./hq/CoastalRocks";
import { SkyDome } from "./hq/SkyDome";
import { PokeProps } from "./hq/PokeProps";
import { CameraRig, CAMERA_VIEWS, type CameraView } from "./CameraRig";
import { IslandPanBounds } from "./IslandPanBounds";
import { EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Tent } from "./hq/Tent";
import { LogSeats } from "./hq/Logs";
import { Garden } from "./hq/Garden";
import { Grove } from "./hq/Grove";
import { Outdoor } from "./hq/Outdoor";
import { Butterflies, CartoonClouds, Fireflies } from "./hq/Life";
import { CornerBlurEffect, FocusBlur } from "./hq/FocusBlur";
import { Campfire3D } from "./hq/Campfire";
import { DistantIslands } from "./hq/Islands";
import { FOG, installHeightFog } from "./hq/fog";
import { Ocean } from "./Island";
import { SceneLoading } from "./SceneLoading";
import { IslandFacilities } from "./IslandFacilities";
import type { Visit } from "./islandLife";
import { Resident } from "./Resident";
import { PilotGarden } from "./PilotGarden";
import type { Effect } from "./zones";
import { getPokemon } from "../data/pokemon";
import { habitAt } from "../lib/routine";
import type { Capture } from "../types";

type Sky = "morning" | "day" | "evening" | "night";

const LIGHT: Record<Sky, { bg: string; hemiSky: string; hemiGround: string; hemi: number; sun: string; sunI: number; sunPos: [number, number, number]; tint: string; glow: number }> = {
  morning: { bg: "#ffe6c8", hemiSky: "#fff1dc", hemiGround: "#c8c08e", hemi: 0.8, sun: "#ffd6a0", sunI: 1.7, sunPos: [-10, 7, -5], tint: "#fff3e6", glow: 0.16 },
  day: { bg: "#c4ecff", hemiSky: "#d9efff", hemiGround: "#c4d494", hemi: 0.8, sun: "#fff2da", sunI: 1.9, sunPos: [9, 11, -7], tint: "#ffffff", glow: 0.17 },
  evening: { bg: "#ffc7a0", hemiSky: "#ffd2b0", hemiGround: "#a8865e", hemi: 0.55, sun: "#ffa266", sunI: 1.5, sunPos: [11, 5, -6], tint: "#ffe2cc", glow: 0.22 },
  night: { bg: "#123456", hemiSky: "#4a6a9a", hemiGround: "#142014", hemi: 0.35, sun: "#a8c4ff", sunI: 0.5, sunPos: [-6, 10, -4], tint: "#9aa6d6", glow: 0.34 }
};

/** 仅开发模式：把场景状态挂到 window.__three，便于调试 */
function DevExpose() {
  const st = useThree();
  if (import.meta.env.DEV) (globalThis as { __three?: unknown }).__three = st;
  return null;
}

/**
 * 分级降画质：每 2.5 秒统计一次帧率，低于 45 帧就降一级（只降不升，避免画面来回跳）。
 * 进入家园后的前 4 秒在编译着色器、加载模型，不计入。
 */
function AdaptiveQuality({ onDecline }: { onDecline: (level: number) => void }) {
  const st = useRef({ t: 0, frames: 0, level: 0, warm: 0 });
  useFrame((_, dt) => {
    const s = st.current;
    if(dt>.25)return; // Resuming a paused island is not a slow rendering frame.
    s.warm += dt;
    if (s.warm < 4 || s.level >= 3) return;
    s.t += dt;
    s.frames++;
    if (s.t >= 2.5) {
      const fps = s.frames / s.t;
      s.t = 0;
      s.frames = 0;
      if (fps < 45) {
        s.level++;
        s.warm = 2.5; // 换档后给 1.5 秒稳定
        onDecline(s.level);
      }
    }
  });
  return null;
}

// 高度雾必须在任何材质编译之前装好
installHeightFog();

export function HomeScene({
  previewing=false,interactionId,spotlight,upgrades,livingItems=[],together,active = true, showInterface=true, idleAllowed=false, idleBlockReason="", onObserve, picnic, need, followId, captures, now, sky, weather, selected, effect, onSelect, onDeselect, farm, visits, activeVisits, onArrival, onStation, onManualPan, view = "overview", viewNonce = 0, hqLighting = false
}: {
  previewing?:boolean;
  spotlight?:{x:number;z:number;wide?:boolean};
  upgrades?:Record<UpgradeId,number>;
  livingItems?:readonly FurnitureId[];
  interactionId?:number;
  together?:{session:TogetherSession;turn:number;progress:import("react").MutableRefObject<number>;acting:boolean;ready:boolean;childReady?:boolean;onRoll?:()=>void};
  active?: boolean;
  showInterface?: boolean;
  idleAllowed?:boolean;
  idleBlockReason?:string;
  picnic?:PicnicSession;
  onObserve?:(id:number|null,ready?:boolean)=>void;
  followId: number|null;
  need?: {id:number;kind:'feed'|'pet'} | null;
  visits: Visit[];
  activeVisits: Visit[];
  onArrival: (id:number,key:string,ready:boolean)=>void;
  onStation: (id:string)=>void;
  onManualPan: () => void;
  farm: BerryGardenProps & {open:boolean};
  hqLighting?: boolean;
  view?: CameraView;
  viewNonce?: number;
  captures: Capture[];
  now: Date;
  sky: Sky;
  weather:IslandWeather;
  selected: number | null;
  effect: Effect | null;
  onSelect: (id: number) => void;
  onDeselect: () => void;
}) {
  const L = LIGHT[sky];
  const tint = useMemo(() => new THREE.Color(L.tint), [L.tint]);

  // 同一区域的宝可梦按顺序占用位置（篝火座位、睡垫等）
  const residents = useMemo(() => {
    const counters: Record<string, number> = {};
    return captures.map((c) => {
      const p = getPokemon(c.id);
      const habit = habitAt(p, now);
      const slot = counters[habit.zone] ?? 0;
      counters[habit.zone] = slot + 1;
      return { p, habit, slot };
    });
  }, [captures, now]);
  const someoneEating = activeVisits.some(v=>v.station.id === "fire") || residents.some((r) => r.habit.activity === "eat" || r.habit.activity === "warm");
  // 仅开发模式：window.__dbg = { grass:false, ... } 逐项关闭以测性能
  const dbg: Record<string, boolean> = import.meta.env.DEV ? ((globalThis as { __dbg?: Record<string, boolean> }).__dbg ?? {}) : {};
  const on = (k: string) => dbg[k] !== false;
  // 自适应画质：帧率持续偏低时先降分辨率，再关环境光遮蔽
  const [dpr, setDpr] = useState(1.25);
  const [lite, setLite] = useState(false);
  const cornerBlur = useMemo(() => new CornerBlurEffect(), []);
  const sunRef = useRef<THREE.DirectionalLight>(null!);
  // 阴影贴图尺寸变化时必须释放旧贴图：three.js 不会自动按新尺寸重建，
  // 否则只往贴图的一角写深度、却按整张采样，所有影子都会错位甚至消失
  useEffect(() => {
    const sh = sunRef.current?.shadow;
    if (sh?.map) {
      sh.map.dispose();
      (sh as { map: THREE.WebGLRenderTarget | null }).map = null;
    }
  }, [lite]);

  return (
    <>
    <Canvas
      className="home-canvas"
      frameloop={active?"always":"never"}
      shadows
      dpr={dpr}
      camera={{ fov: 44, position: CAMERA_VIEWS.overview.pos, near: 0.1, far: 320 }}
      gl={{ antialias: !lite, alpha: false, powerPreference: "high-performance", stencil: false, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.08 }}
      onPointerMissed={onDeselect}
    >
      <AdaptiveQuality
        onDecline={(level) => {
          // 1：分辨率 1×；2：简化模式（阴影贴图减半、草簇减半）；3：分辨率 0.8×
          if (level === 1) setDpr(1);
          if (level === 2) setLite(true);
          if (level === 3) setDpr(0.8);
        }}
      />
      <DevExpose />
      <SkyDome sky={sky} sunDir={L.sunPos} cloud={weather.cloud}/>
      <fog attach="fog" args={[L.bg, FOG.near, FOG.far]} />
      <hemisphereLight args={[L.hemiSky, L.hemiGround, L.hemi]} />
      <directionalLight
        ref={sunRef}
        castShadow
        position={L.sunPos}
        color={L.sun}
        intensity={L.sunI*(1-weather.cloud*.65)}
        shadow-mapSize={lite ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={65}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {sky === "night" && weather.cloud<.5 && <Stars radius={45} depth={20} count={1200} factor={3} saturation={0} fade speed={0.6} />}
      <Suspense fallback={null}>
        <group key={`terrain-detail-${upgrades?.island??0}`}>
        <Terrain/>
        <LandscapeDetails />
        <Ocean fogColor={L.bg} night={sky === "night"} wind={weather.wind}/>
        {on("grass") && <Grass key={lite ? "lite" : "full"} lite={lite} wind={weather.wind}/>}
        {on("palms") && <Palms wind={weather.wind}/>}
        {on("hq") && <HqProps />}
        <CoastalRocks />
        <PokeProps />
        <Tent />
        <UpgradeDecor levels={upgrades}/>
        <LogSeats />
        <Garden />
        <Grove wind={weather.wind}/>
        <PilotGarden />
        <BerryGarden {...farm} />
        <DistrictDetails table={livingItems.includes("table")} level={upgrades?.picnic??0}/>
        <LivingProps items={livingItems} playing={!!together}/>
        {together&&<TogetherBall {...together}/>}
        {picnic&&<PicnicSnack session={picnic} ready={activeVisits.some(v=>v.manual&&v.pokemonId===picnic.pokemonId)}/>}
        <IslandFacilities showButtons={showInterface && selected === null && !farm.open} active={activeVisits} farm={farm} onTap={onStation}/>
        <Outdoor night={sky === "night" || sky === "evening"} />
        </group>
        <CartoonClouds night={sky === "night"} wind={weather.wind} cover={weather.cloud}/>
        <Butterflies active={weather.rain<.3&&(sky === "morning" || sky === "day")} />
        <Fireflies active={weather.rain<.3&&(sky === "night" || sky === "evening")} />
        {on("islands") && <DistantIslands />}
        {/* 天空图只用于环境光照和反射，背景仍是 CSS 天空渐变 */}
        <EnvMap files="/env/sky_1k.hdr" environmentIntensity={sky === "night" ? 0.12 : sky === "day" ? 0.45 : 0.4} />
        {sky !== "night" && on("clouds") && (
          <VolClouds material={THREE.MeshLambertMaterial} texture="/textures/cloud.png" limit={300}>
            {/* 贴着海面的低空雾带：横在远处小岛之间，加强远近层次 */}
            <Cloud seed={41} position={[-30, 1.6, -40]} bounds={[22, 0.6, 5]} segments={16} volume={10} opacity={0.28} color={L.bg} fade={30} speed={0.02} />
            <Cloud seed={43} position={[22, 1.4, -48]} bounds={[24, 0.6, 6]} segments={16} volume={11} opacity={0.26} color={L.bg} fade={30} speed={0.02} />
            <Cloud seed={47} position={[48, 1.8, -22]} bounds={[14, 0.7, 6]} segments={12} volume={9} opacity={0.24} color={L.bg} fade={30} speed={0.02} />
            <Cloud seed={53} position={[-50, 2.0, -26]} bounds={[16, 0.7, 6]} segments={12} volume={9} opacity={0.24} color={L.bg} fade={30} speed={0.02} />
          </VolClouds>
        )}
        <Campfire3D lit={weather.rain<.5&&(sky === "night" || sky === "evening" || someoneEating)}/>
        <WeatherRain weather={weather} lite={lite}/>
        {residents.map(({ p, habit, slot }) => (
          <Resident previewFrozen={previewing} weather={weather.kind} key={p.id} showInterface={showInterface} need={need?.id===p.id?need.kind:undefined} visit={visits.find(v=>v.pokemonId===p.id)} onArrival={onArrival} p={p} habit={habit} slot={slot} selected={selected === p.id} facingCamera={!!together&&together.session.partners.length===1&&together.session.partners[0]===p.id} effect={effect} tint={tint} glow={L.glow} sunYaw={Math.atan2(L.sunPos[0], L.sunPos[2])} onSelect={previewing?()=>{}:onSelect} />
        ))}
      </Suspense>
      {/* 高画质光影：实时环境光遮蔽（半分辨率），家长中心可开关 */}
      {hqLighting && !lite && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO halfRes aoRadius={1.1} intensity={2.4} distanceFalloff={0.8} quality="performance" color="#16301f" />
          <primitive object={cornerBlur} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <SMAA />
        </EffectComposer>
      )}
      {/* 镜头对焦：中心清晰、四角渐虚（高画质模式下由后期管线里的同款效果代替） */}
      {!(hqLighting && !lite) && <FocusBlur samples={lite ? 0 : 4} />}
      {spotlight&&!spotlight.wide&&<mesh position={[spotlight.x,terrainHeight(spotlight.x,spotlight.z)+.07,spotlight.z]} rotation-x={-Math.PI/2}><ringGeometry args={[1.1,1.22,48]}/><meshBasicMaterial color="#ffe36d" transparent opacity={.8} depthWrite={false}/></mesh>}
      <CameraRig spotlight={spotlight} selectedId={selected} active={active} campIds={together?.session.partners??(interactionId===undefined?[]:[interactionId])} idleBlockReason={active?idleBlockReason:"页面未显示"} view={view} followId={followId} nonce={viewNonce} idleAllowed={active&&idleAllowed} followPaused={!active||selected!==null||farm.open} onObserve={onObserve} />
      <OrbitControls
        makeDefault
        enabled={!together}
        target={CAMERA_VIEWS.overview.target}
        enablePan
        screenSpacePanning={false}
        touches={{ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN}}
        onStart={onManualPan}
        enableDamping
        dampingFactor={0.08}
        minDistance={selected!==null?1.2:3.5}
        maxDistance={65}
        minPolarAngle={0.65}
        maxPolarAngle={1.42}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
      />
      <IslandPanBounds disabled={selected!==null||!!together||interactionId!==undefined} />

    </Canvas>
    <SceneLoading />
    </>
  );
}
