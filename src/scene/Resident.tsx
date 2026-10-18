import type {WeatherKind} from '../lib/weather';
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { DRACO_PATH, modelUrl, normalizeModel, type ModelEntry } from "./modelUtil";
import type { Pokemon } from "../types";
import { spriteUrl } from "../data/pokemon";
import { ACTIVITY } from "../lib/routine";
import { BEHAVIORS, type Behavior, type Habit, type Trajectory } from "../data/behaviors";
import { contactShadowTexture, iconTexture, loadSprite, type SpriteInfo } from "./textures";
import { circleOf, defaultPath, fixedSpot, pathPoints, randomSpot, sceneHeight, WATER_Y, type Effect, type Spot } from "./zones";
import { terrainHeight } from "./hq/Terrain";
import { decorationRevision } from "./layout";
import {planStationWalk,stationReach,type Visit} from "./islandLife";
import { crowd,crowdStep,separateOverlap,occupiedDestination,angleDelta,type Avoidance } from "./crowdMotion";
import { residentClear, safeResidentSpot, residentWater, type CollisionBody } from "./residentCollision";
import { planWalk } from "./navigation";
import { residentPoses } from './residentRuntime';
import type { CareKind } from '../lib/companionCare';
export { residentPosition } from './residentRuntime';
import models from "../data/pokemonModels.json";

/** 有 3D 模型时（public/models/pokemon/<id>.glb）优先用模型，否则用立绘立牌 */
const MODEL_MANIFEST = models as unknown as Record<string, ModelEntry>;
const FALLBACK: Behavior = { locomotion: "walk", speed: 0.8, trait: { zh: "", en: "" }, schedule: [] };

/** 静止类活动：到了位置就不再走动 */
const RESTING = new Set(["sleep", "nap", "buried", "meditate", "sunbathe", "fish", "warm", "lonely", "sing", "eat", "glow"]);

interface Motion {
  target: THREE.Vector3;
  wait: number;
  path: Spot[];
  pathIdx: number;
  pathDir: number;
  angle: number;
  facing: number;
  moving: boolean;
  placed: boolean;
  hopT: number;
  /** 瞬间移动：0 不在移动，>0 进行中（秒） */
  tele: number;
  telePos: THREE.Vector3;
  /** 鲤鱼王跳跃：下次跳的时间和当前进度 */
  nextJump: number;
  jumpT: number;
  heading: number;
  /** 卡住检测：上一帧离目标的距离、卡住开始时间 */
  lastDist: number;
  stuckSince: number;
  /** 朝向翻转的稳定计时（防止左右来回翻） */
  flipT: number;
  /** 正在沿圆周绕飞 / 绕游 */
  orbiting: boolean;
}

const tmp = new THREE.Vector3();
const camRight = new THREE.Vector3();

export function Resident({
  previewFrozen=false,facingCamera=false,p, habit, slot, selected, effect, tint, glow, sunYaw, onSelect, visit, onArrival, need, showInterface=true
}: {
  previewFrozen?:boolean;
  facingCamera?:boolean;
  weather?:WeatherKind;
  need?: CareKind;
  showInterface?: boolean;
  visit?: Visit;
  onArrival?: (id:number,key:string,ready:boolean)=>void;
  p: Pokemon;
  habit: Habit;
  slot: number;
  selected: boolean;
  effect: Effect | null;
  tint: THREE.Color;
  /** 立绘自发光强度：白天低（避免过曝），夜里高（保证看得清） */
  glow: number;
  /** 太阳的水平方位角：投影替身始终正对太阳 */
  sunYaw: number;
  onSelect: (id: number) => void;
}) {
  const b = BEHAVIORS[p.id] ?? FALLBACK;
  const [atStation,setAtStation] = useState(false);
  const activity = visit && atStation ? visit.station.activity : visit ? "explore" : habit.activity;
  const traj: Trajectory = visit ? "stay" : habit.path ?? defaultPath(habit.zone);
  const lastDecor=useRef(decorationRevision);
  const journey = useRef<{points:Spot[];ready:boolean;lastPlan:number}>({points:[],ready:false,lastPlan:0});
  const height = sceneHeight(p);
  const collisionRadius=useRef(Math.max(.28,height*.45));
  const footprintChanged=useRef(true);
  const avoidance=useRef<Avoidance>({blocker:null,side:1});
  const root = useRef<THREE.Group>(null!);
  const lifeTime=useRef(0);
  const facingGroup = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const fx = useRef<THREE.Group>(null!);
  const shadow = useRef<THREE.Mesh>(null!);
  const casterBody = useRef<THREE.Group>(null!);
  // 脚底宽度（占立绘宽度的比例）和立绘宽高比，接触影子按它缩放
  const [footprint, setFootprint] = useState<{ aspect: number; foot: number } | null>(null);
  const spriteMat = useRef<THREE.MeshStandardMaterial | null>(null);
  const glb = MODEL_MANIFEST[String(p.id)];
  const m = useRef<Motion>({
    target: new THREE.Vector3(), wait: 0, path: [], pathIdx: 0, pathDir: 1, angle: Math.random() * Math.PI * 2, facing: 1,
    moving: false, placed: false, hopT: 0, tele: 0, telePos: new THREE.Vector3(), nextJump: 2 + Math.random() * 4, jumpT: -1, heading: 0, lastDist: 0, stuckSince: 0, flipT: 0, orbiting: false
  });

  /** 地面高度：草地起伏 / 水面 / 指定高度（睡垫、礁石顶） */
  const groundY = (s: Spot) => (s.y !== undefined ? s.y : terrainHeight(s.x, s.z));

  const setTarget = (s: Spot) => {
    const air=b.locomotion==='fly'||b.locomotion==='float';
    const y=s.y??(groundY(s)+(air?(b.altitude??2.2):0));
    const collision={radius:collisionRadius.current,air,water:residentWater(b.locomotion,y,terrainHeight(s.x,s.z)),feet:y,height};
    const safe=safeResidentSpot(s,collision)??s;
    m.current.target.set(safe.x, safe===s||s.y!==undefined?s.y??y:terrainHeight(safe.x,safe.z)+(air?(b.altitude??2.2):0), safe.z);
    m.current.lastDist=Infinity;m.current.stuckSince=0;
  };

  useEffect(() => () => { crowd.delete(p.id); residentPoses.delete(p.id); }, [p.id]);

  // 习性变化时重新规划目的地；第一次直接出现在目的地
  useEffect(() => {
    const mm = m.current;
    mm.wait = 0;mm.stuckSince=0;mm.lastDist=Infinity;avoidance.current.blocker=null;
    if (visit) {
      const target=visit.station.target;
      const spawn=planWalk({x:0,z:4},randomSpot(habit.zone));
      const start=root.current && mm.placed ? root.current.position : b.locomotion === "swim" ? target : spawn[spawn.length-1] ?? {x:0,z:4};
      if(!mm.placed && root.current){ root.current.position.set(start.x,groundY(start),start.z);mm.placed=true; }
      const direct=(visit.station.water && b.locomotion === "swim") || ["fly","float","teleport"].includes(b.locomotion);
      journey.current={points:direct?[target]:planStationWalk(start,visit.station,Math.max(.82,collisionRadius.current),[],height),ready:false,lastPlan:0};
      if(visit.station.water && !direct)journey.current.points.push(target);
      setAtStation(false);
      onArrival?.(p.id,visit.key,false);
      setTarget(journey.current.points.shift() ?? start);
    } else if (traj === "stay") setTarget(fixedSpot(habit.zone, slot));
    else if (traj === "patrol" || traj === "shoreline") {
      mm.path = pathPoints(habit.zone);
      mm.pathIdx = slot % Math.max(1, mm.path.length);
      setTarget(mm.path[mm.pathIdx] ?? randomSpot(habit.zone));
    } else if (traj === "circle") {
      const c = circleOf(habit.zone, b.altitude);
      setTarget({ x: c.cx + Math.cos(mm.angle) * c.r, z: c.cz + Math.sin(mm.angle) * c.r, y: c.y });
    } else setTarget(randomSpot(habit.zone));
    if (!mm.placed && root.current) {
      root.current.position.copy(mm.target);
      mm.placed = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habit.zone, habit.activity, traj, slot, visit?.key]);

  useFrame((state, rawDt) => {
    if(previewFrozen)return;
    const g = root.current;
    if (!g) return;
    const mm = m.current;
    const dt = Math.min(rawDt, 0.05);
    // R3F restarts its clock when frameloop resumes. Keep resident deadlines on
    // a persistent simulation clock so waiting, hopping and routes continue.
    const t = lifeTime.current += selected ? 0 : dt;
    g.userData.lifeTime=t;
    const responding=effect?.id===p.id && performance.now()-effect.at<2500;
    const loco = b.locomotion;
    const flying = loco === "fly" || (loco === "float" && habit.zone === "sky");

    const radius=collisionRadius.current;
    const inAir=traj==='circle'?habit.zone==='sky':flying||loco==='float';
    const inWater=residentWater(loco,mm.target.y,terrainHeight(g.position.x,g.position.z),visit?!!visit.station.water:undefined);
    const collision:CollisionBody={radius,air:inAir,water:inWater,feet:g.position.y,height};
    const recover=()=>{const safe=safeResidentSpot(g.position,collision);if(safe){g.position.x=safe.x;g.position.z=safe.z;}};
    const layer=inAir?'air':inWater?'water':'ground';
    if(lastDecor.current!==decorationRevision||footprintChanged.current){
      footprintChanged.current=false;
      lastDecor.current=decorationRevision;
      recover();
      if(visit&&!inAir&&!inWater){journey.current={points:planStationWalk(g.position,visit.station,Math.max(.82,radius),[],height),ready:false,lastPlan:t};setTarget(journey.current.points.shift()??g.position);}
    }
    const startX=g.position.x,startZ=g.position.z;
    const valid=(pos:{x:number;z:number})=>residentClear(pos,collision);
    let orbitDir: THREE.Vector3 | null = null;
    let lateral=0,hopY=0;
    if(!selected){
    // A shared resting destination is a region, not a point every resident must occupy.
    if(traj!=='circle'&&(!visit||!journey.current.points.length)&&Math.hypot(mm.target.x-g.position.x,mm.target.z-g.position.z)<radius*2+1&&occupiedDestination(p.id,mm.target,radius,layer,crowd)){
      mm.target.x=g.position.x;mm.target.z=g.position.z;
    }

    // ---------- 1. 计算目标 ----------
    if (traj === "circle" && !responding) {
      const c = circleOf(habit.zone, b.altitude);
      const sp = loco === "swim" ? b.speed : Math.max(0.6, b.speed) * (flying ? 0.75 : 1);
      const dirSign = p.id % 2 ? 1 : -1;
      // 缓慢的滑翔起伏（不是快速颠簸）
      const y = habit.zone === "moonlit" ? terrainHeight(c.cx, c.cz) : c.y + (flying ? Math.sin(t * 0.45 + p.id) * 0.35 : 0);
      const onCircle = Math.abs(Math.hypot(g.position.x - c.cx, g.position.z - c.cz) - c.r) < 0.4;
      if (!mm.orbiting && onCircle) mm.orbiting = true;
      if (mm.orbiting) {
        if(Math.hypot(mm.target.x-g.position.x,mm.target.z-g.position.z)<1.5)mm.angle += (sp / c.r) * dt * dirSign;
        const nx = c.cx + Math.cos(mm.angle) * c.r, nz = c.cz + Math.sin(mm.angle) * c.r;
        const next=crowdStep(p.id,g.position,{x:nx,z:nz},radius,layer,Math.max(sp,Math.hypot(nx-g.position.x,nz-g.position.z)*6),dt,crowd,avoidance.current,valid);
        orbitDir=new THREE.Vector3(next.x-g.position.x,0,next.z-g.position.z);
        if(orbitDir.lengthSq()>.000001)orbitDir.normalize();
        else orbitDir.set(Math.sin(mm.heading),0,Math.cos(mm.heading));
        g.position.x=next.x;g.position.z=next.z;
        mm.target.set(nx, y, nz);
      } else {
        // 先飞到圆周上离自己最近的点
        mm.angle = Math.atan2(g.position.z - c.cz, g.position.x - c.cx);
        mm.target.set(c.cx + Math.cos(mm.angle) * c.r, y, c.cz + Math.sin(mm.angle) * c.r);
      }
    } else mm.orbiting = false;

    // ---------- 2. 移动 ----------
    tmp.set(mm.target.x - g.position.x, 0, mm.target.z - g.position.z);
    let dist = tmp.length();
    // 被障碍或其他宝可梦挡住、1.5 秒没靠近目标：就地当作到达，避免原地抖动
    if (dist > 0.06 && traj !== "circle") {
      // Measure best progress toward this waypoint. Oscillating around a neighbour
      // must not refresh the stall timer on every small forward half-step.
      if (mm.lastDist - dist > 0.004) {mm.stuckSince = t;mm.lastDist=dist;}
      else if (!visit && mm.stuckSince && t - mm.stuckSince > 1.5) {
        mm.target.x = g.position.x;
        mm.target.z = g.position.z;
        dist = 0;
        mm.stuckSince = t;
      }
      if (!mm.stuckSince) mm.stuckSince = t;
    }
    let arrived = dist < (visit ? .13 : .06);
    if(visit && arrived && journey.current.points.length){
      setTarget(journey.current.points.shift()!);
      tmp.set(mm.target.x-g.position.x,0,mm.target.z-g.position.z);dist=tmp.length();arrived=false;
    }
    if(visit && !journey.current.ready && t-journey.current.lastPlan>4 && mm.stuckSince && t-mm.stuckSince>2){
      if(!visit.station.water && !["fly","float","teleport"].includes(loco)){
        journey.current.points=planStationWalk(g.position,visit.station,Math.max(.82,radius),[...crowd].filter(([id,c])=>id!==p.id&&c.layer===layer&&!c.moving).map(([,c])=>c),height);
        if(journey.current.points.length){setTarget(journey.current.points.shift()!);tmp.set(mm.target.x-g.position.x,0,mm.target.z-g.position.z);dist=tmp.length();arrived=false;}
      }
      journey.current.lastPlan=t;
    }


    if(responding){mm.moving=false;} else if (orbitDir) {
      mm.moving = true;
      mm.heading = Math.atan2(orbitDir.x, orbitDir.z);
      camRight.setFromMatrixColumn(state.camera.matrixWorld, 0);
      const side = orbitDir.dot(camRight);
      const want = side > 0 ? -1 : 1;
      // 朝向稳定 0.3 秒才翻转
      if (Math.abs(side) > 0.25 && want !== mm.facing) {
        mm.flipT += dt;
        if (mm.flipT > 0.3) { mm.facing = want; mm.flipT = 0; }
      } else mm.flipT = 0;
    } else if (loco === "teleport" && (mm.tele > 0 || !arrived)) {
      // 凯西：原地消失，在目标处出现
      if (!arrived && mm.tele === 0) {
        mm.tele = 0.0001;
        mm.telePos.copy(mm.target);
      }
      if (mm.tele > 0) {
        mm.tele += dt;
        if (mm.tele > 0.45 && g.position.distanceTo(mm.telePos) > 0.01) g.position.copy(mm.telePos);
        if (mm.tele > 0.9) mm.tele = 0;
      }
      mm.moving = false;
    } else if (!arrived) {
      let v = visit?.manual ? Math.max(1.5,b.speed) : b.speed;
      if (traj === "circle") v = 30; // 绕圈时直接跟随轨道点
      if (loco === "dash") v *= 0.6 + 0.9 * Math.abs(Math.sin(t * 2.6 + p.id)); // 一阵一阵地冲
      if (loco === "crawl") v *= 0.35 + 0.65 * Math.max(0, Math.sin(t * 3.5 + p.id)); // 一伸一缩地爬
      if (loco === "hop") {
        // 一蹦一跳：只在跳起时前进
        mm.hopT = (mm.hopT + dt / 0.6) % 1;
        const inAir = mm.hopT < 0.7;
        v = inAir ? v * 1.6 : 0;
        hopY = inAir ? Math.sin((mm.hopT / 0.7) * Math.PI) * 0.32 : 0;
      }
      tmp.normalize();
      const next=crowdStep(p.id,g.position,mm.target,radius,layer,v,dt,crowd,avoidance.current,valid);
      const actualX=next.x-g.position.x,actualZ=next.z-g.position.z;
      g.position.x=next.x;g.position.z=next.z;
      if(Math.hypot(actualX,actualZ)>.0001)tmp.set(actualX,0,actualZ).normalize();
      // 之字形 / 蛇形：垂直于前进方向摆动
      if (loco === "dash") lateral = Math.sin(t * 7 + p.id) * 0.18;
      if (loco === "slither") lateral = Math.sin(t * 4 + p.id) * 0.25;
      mm.heading = Math.atan2(tmp.x, tmp.z);
      camRight.setFromMatrixColumn(state.camera.matrixWorld, 0);
      const side = tmp.dot(camRight);
      // HOME 立绘默认朝左；方向稳定一小会儿才翻转，避免来回抖
      const want = side > 0 ? -1 : 1;
      if (loco !== "sidestep" && Math.abs(side) > 0.25 && want !== mm.facing) {
        mm.flipT += dt;
        if (mm.flipT > (flying ? 0.3 : 0.15)) { mm.facing = want; mm.flipT = 0; }
      } else mm.flipT = 0;
      mm.moving = true;
    } else {
      mm.moving = false;
      mm.hopT = 0;
      // 到达后：按轨迹决定下一步
      if (traj === "roam" && !RESTING.has(activity)) {
        if (mm.wait === 0) mm.wait = t + (loco === "teleport" ? 2.5 : 1.2) + Math.random() * 3.5;
        else if (t > mm.wait) {
          setTarget(randomSpot(habit.zone));
          mm.wait = 0;
        }
      } else if ((traj === "patrol" || traj === "shoreline") && mm.path.length) {
        if (mm.wait === 0) mm.wait = t + (traj === "shoreline" ? 1.5 + Math.random() * 2 : 0.6);
        else if (t > mm.wait) {
          if (traj === "shoreline") {
            if (mm.pathIdx + mm.pathDir >= mm.path.length || mm.pathIdx + mm.pathDir < 0) mm.pathDir *= -1;
            mm.pathIdx += mm.pathDir;
          } else mm.pathIdx = (mm.pathIdx + 1) % mm.path.length;
          setTarget(mm.path[mm.pathIdx]);
          mm.wait = 0;
        }
      }
    }

    if(visit?.faceTo && arrived){mm.heading=Math.atan2(visit.faceTo.x-g.position.x,visit.faceTo.z-g.position.z);}
    // Static projection precedes bounded spawn recovery; normal motion never needs reciprocal pushes.
    {
      if(!valid(g.position))recover();
      const separated=separateOverlap(p.id,g.position,radius,layer,dt,crowd,valid);
      if(separated&&arrived&&traj!=='circle'){mm.target.x=g.position.x;mm.target.z=g.position.z;}
      mm.moving=!responding&&Math.hypot(g.position.x-startX,g.position.z-startZ)>.0005;
    }
    }else{mm.moving=false;}
    crowd.set(p.id,{x:g.position.x,z:g.position.z,r:radius,layer,moving:mm.moving,vx:(g.position.x-startX)/Math.max(dt,.001),vz:(g.position.z-startZ)/Math.max(dt,.001)});
    residentPoses.set(p.id, {position:g.position,heading:mm.heading,height,width:collisionRadius.current*2,moving:mm.moving,activity,weather:visit?.station.id.startsWith("weather-")?visit.station.name:undefined});
    if(import.meta.env.DEV){g.userData.destination={x:mm.target.x,z:mm.target.z};g.userData.avoidance=avoidance.current.blocker;}
    g.userData.weatherReaction=visit?.station.id.startsWith("weather-")?visit.station.name:null;g.userData.interacting=selected;g.userData.activity=activity;g.userData.moving=mm.moving;
    if(visit){
      const ready=!journey.current.points.length && Math.hypot(g.position.x-mm.target.x,g.position.z-mm.target.z)<(journey.current.ready?.6:.35) && (inWater || Math.abs(g.position.y-mm.target.y)<.65) && Math.hypot(g.position.x-visit.station.x,g.position.z-visit.station.z)<=stationReach(visit.station,Math.max(.82,radius));
      if(ready!==journey.current.ready){journey.current.ready=ready;setAtStation(ready);onArrival?.(p.id,visit.key,ready);}
      g.userData.station=visit.station.id;g.userData.arrived=ready;g.userData.manual=visit.manual;
    }else{g.userData.station=null;g.userData.arrived=false;}


    // 高度：飞行 / 悬浮 / 游泳 / 地面
    let baseY: number;
    if(selected) baseY=g.position.y;
    else if (traj === "circle" || flying) baseY = visit && mm.moving ? terrainHeight(g.position.x,g.position.z)+2.2 : mm.target.y;
    else if (loco === "float") baseY = mm.target.y + (b.altitude ?? 0.4);
    else if (inWater) baseY = WATER_Y - height * 0.18;
    else baseY = !mm.moving && habit.zone==='highrock' && Math.hypot(g.position.x-mm.target.x,g.position.z-mm.target.z)<.2 ? mm.target.y : terrainHeight(g.position.x, g.position.z);
    if (!selected && activity === "buried") baseY -= height * 0.55; // 走路草把身体埋进土里，只露出叶子
    g.position.y = THREE.MathUtils.lerp(g.position.y, baseY, 1 - Math.exp(-dt * (flying || orbitDir ? 1.5 : 6)));

    // ---------- 3. 朝向 ----------
    if (facingGroup.current) {
      const toCam = Math.atan2(state.camera.position.x - g.position.x, state.camera.position.z - g.position.z);
      const desired=selected||(facingCamera&&atStation)||responding||(need&&!mm.moving)?toCam:mm.moving?mm.heading:visit?Math.atan2((visit.faceTo?.x??visit.station.x)-g.position.x,(visit.faceTo?.z??visit.station.z)-g.position.z):toCam;
      facingGroup.current.rotation.y=glb?facingGroup.current.rotation.y+angleDelta(facingGroup.current.rotation.y,desired)*(1-Math.exp(-dt*6)):toCam;
    }

    // ---------- 4. 身体动作（按行动方式和活动） ----------
    const bd = body.current;
    if (bd) {
      let y = hopY, sx = 1, sy = 1, rz = 0, x = lateral, scaleAll = 1;
      if (mm.moving) {
        if (loco === "walk") y += Math.abs(Math.sin(t * 8)) * 0.06;
        if (loco === "waddle") { rz = Math.sin(t * 6) * 0.12; y += Math.abs(Math.sin(t * 6)) * 0.03; }
        if (loco === "dash") y += Math.abs(Math.sin(t * 14)) * 0.08;
        if (loco === "crawl") { sx = 1 + Math.max(0, Math.sin(t * 3.5 + p.id)) * 0.12; sy = 2 - sx; }
        if (loco === "sidestep") { y += Math.abs(Math.sin(t * 16)) * 0.04; rz = Math.sin(t * 16) * 0.05; }
        if (loco === "fly" || flying) {
          // 扇翅：纵向轻微伸缩；喷火龙以滑翔为主，每隔几秒扇几下
          const glider = height > 1.3;
          const flapOn = !glider || Math.sin(t * 0.8 + p.id) > 0.55;
          const flap = flapOn ? Math.sin(t * (glider ? 5 : 9)) : 0;
          sy = 1 + flap * 0.05;
          sx = 1 - flap * 0.025;
          // 转弯时身体朝圆心倾斜
          rz = (orbitDir ? 0.14 * mm.facing * (p.id % 2 ? 1 : -1) : 0) + Math.sin(t * 0.6 + p.id) * 0.04;
        }
      }
      // 悬浮：缓慢上下飘（梦幻在空中停下时也在轻轻浮动）
      if (loco === "float") y += Math.sin(t * 1.4 + p.id) * (flying ? 0.16 : 0.12);
      if (loco === "swim" || loco === "slither") y += Math.sin(t * 2 + p.id) * 0.05;
      switch (activity) {
        case "sleep": case "nap":
          sy = 1 + Math.sin(t * 1.4 + p.id) * 0.035; sx = 1 - (sy - 1) * 0.5; rz = 0.12; break;
        case "eat": case "graze": rz = Math.sin(t * 7 + p.id) * 0.06; break;
        case "sing": rz = Math.sin(t * 1.8 + p.id) * 0.14; y += Math.abs(Math.sin(t * 1.8)) * 0.05; break;
        case "dance": y += Math.abs(Math.sin(t * 4)) * 0.22; rz = Math.sin(t * 4) * 0.2; break;
        case "sunbathe": sy = 1.03 + Math.sin(t * 0.8) * 0.02; break;
        case "warm": rz = Math.sin(t * 1.2 + p.id) * 0.05; break;
        case "guard": if (!mm.moving) mm.facing = Math.sin(t * 0.7 + p.id) > 0 ? 1 : -1; break;
        case "lonely": if (!mm.moving) {mm.facing = Math.sin(t * 0.25 + p.id) > 0 ? 1 : -1;y+=Math.sin(t*1.8)*.04;} break;
        case "meditate": y += Math.sin(t * 1.1) * 0.08; break;
        case "play": if (!mm.moving && loco !== "float") y += Math.max(0, Math.sin(t * 3 + p.id)) ** 8 * 0.25; break;
      }
      // 鲤鱼王扑腾：时不时跃出水面
      if (activity === "splash") {
        if (mm.jumpT < 0 && t > mm.nextJump) mm.jumpT = 0;
        if (mm.jumpT >= 0) {
          mm.jumpT += dt / 0.9;
          y += Math.sin(Math.min(1, mm.jumpT) * Math.PI) * 1.1;
          rz = Math.sin(mm.jumpT * Math.PI * 2) * 0.6;
          if (mm.jumpT >= 1) { mm.jumpT = -1; mm.nextJump = t + 2.5 + Math.random() * 4; }
        }
      }
      if(selected){x=0;y=Math.sin(state.clock.elapsedTime*1.6)*.015;sx=1;sy=1;rz=0;}
      // 瞬间移动：缩小消失再放大出现
      if (!selected && mm.tele > 0) scaleAll = mm.tele < 0.45 ? 1 - mm.tele / 0.45 : (mm.tele - 0.45) / 0.45;
      // 互动时开心跳一下
      if (effect && effect.id === p.id) {
        const k = (performance.now() - effect.at) / 1000;
        if(effect.kind==='feed'&&k>=0&&k<2.5){
          // Small, readable replies: sniff, chew, nod, then celebrate. No large jumps while eating.
          const response=({1:'nod',4:'bounce',7:'sway',25:'bounce',54:'nod',133:'sniff'} as Record<number,string>)[p.id]??'nod';
          const fade=Math.sin(Math.min(1,k/2.5)*Math.PI);
          if(response==='bounce')y+=Math.abs(Math.sin(k*5))*.1*fade;
          else if(response==='sway')rz+=Math.sin(k*5)*.09*fade;
          else if(response==='sniff')rz+=Math.sin(k*3)*.07*fade;
          else sy-=Math.abs(Math.sin(k*4))*.06*fade;
        }else if (k < 1.4) y += Math.abs(Math.sin(k * Math.PI * 2.2)) * 0.35 * (1 - k / 1.4);
      }
      bd.position.set(x, y, 0);
      const fl = glb ? 1 : mm.facing;
      bd.scale.set(sx * fl * scaleAll, sy * scaleAll, glb ? sx * scaleAll : 1);
      bd.rotation.z = rz;
      // 投影替身跟着身体一起跳、一起翻转
      if (casterBody.current) {
        casterBody.current.position.copy(bd.position);
        casterBody.current.scale.copy(bd.scale);
        casterBody.current.rotation.z = rz;
      }
    }
    // 发光（雷丘、海星星夜里）
    if (spriteMat.current) {
      const k = activity === "glow" ? 1.25 + Math.sin(t * 3) * 0.25 : 1;
      spriteMat.current.color.copy(tint);
      spriteMat.current.emissiveIntensity = activity === "glow" ? Math.max(0.42, glow) * k * 1.6 : glow;
    }
    if (ring.current) {
      ring.current.visible = selected;
      const k = 1 + Math.sin(t * 5) * 0.06;
      ring.current.scale.set(k, k, k);
    }
    // 影子：飞得越高越小越淡，在水里不显示
    if (shadow.current) {
      const ground = terrainHeight(g.position.x, g.position.z);
      const alt = Math.max(0, g.position.y - ground);
      const inWater = ground < WATER_Y;
      shadow.current.visible = !inWater && activity !== "buried";
      shadow.current.position.y = ground - g.position.y + 0.035;
      // 飞得越高，接触影子越小越淡；跳起来时也会跟着缩一下
      const lift = alt + Math.max(0, body.current?.position.y ?? 0);
      // 透视关系：离地越近影子越大越深，越高越小越淡（连续变化，没有下限突变）
      const k = 1 / (1 + lift * 0.55);
      shadow.current.scale.set(k, k, k);
      (shadow.current.material as THREE.MeshBasicMaterial).opacity = 0.75 / (1 + lift * 0.9);
      // 飞在空中时不投轮廓影子（斜射的阳光会把它投到几米外，和本体脱节），只留正下方的影子
      if (casterBody.current) casterBody.current.visible = alt < 0.35;
    }
    // 互动特效：三个图标往上飘
    if (fx.current) {
      const active = effect && effect.id === p.id ? (performance.now() - effect.at) / 1600 : 2;
      fx.current.visible = active < 1;
      fx.current.children.forEach((c, i) => {
        const k = Math.min(1, Math.max(0, active - i * 0.12));
        c.position.set((i - 1) * 0.28, height + 0.1 + k * 0.8, 0);
        ((c as THREE.Sprite).material as THREE.SpriteMaterial).opacity = 1 - k;
      });
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(p.id);
  };
  const w = height * 0.9;
  const badge = useMemo(() => iconTexture(need ? need === "feed" ? "apple" : "heart" : visit && atStation ? visit.station.icon : ACTIVITY[activity].icon, true), [need, activity, visit?.station.icon, atStation]);
  const fxTex = useMemo(() => (effect && effect.id === p.id ? iconTexture(effect.icon) : null), [effect, p.id]);
  const showBadge = showInterface && (!!need || activity !== "play" && activity !== "explore");

  return (
    <group ref={root} name={`resident-${p.id}`} userData={{pokemonId:p.id}}> 
      {/* 接触影子：按脚底实际宽度缩放的深色椭圆 */}
      <mesh ref={shadow} rotation-x={-Math.PI / 2} renderOrder={1}>
        <planeGeometry args={contactSize(height, footprint)} key={footprint ? "fp" : "est"} />
        <meshBasicMaterial map={contactShadowTexture()} transparent opacity={0.75} depthWrite={false} polygonOffset polygonOffsetFactor={-4} fog={false} />
      </mesh>
      {/* 投影替身：始终正对太阳，投出完整、稳定的宝可梦轮廓（立绘本身面向镜头，不参与投影） */}
      {!glb && (
        <group rotation-y={sunYaw}>
          <group ref={casterBody}>
            <SpriteCaster url={spriteUrl(p.id)} height={height} onInfo={info=>{setFootprint(info);collisionRadius.current=Math.max(.28,height*info.aspect/2+.1);footprintChanged.current=true;}} />
          </group>
        </group>
      )}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.03} visible={false}>
        <ringGeometry args={[w * 0.5, w * 0.62, 40]} />
        <meshBasicMaterial color="#ffcb05" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <group ref={facingGroup} name="resident-facing">
        <group ref={body} name="resident-body">
          {glb ? (
            <Suspense fallback={null}>
              <GlbBody entry={glb} height={height} moving={m} onClick={click} onRadius={r=>{if(Math.abs(collisionRadius.current-r)>.01){collisionRadius.current=r;footprintChanged.current=true;}}} />
            </Suspense>
          ) : (
            <SpriteBody url={spriteUrl(p.id)} height={height} tint={tint} onClick={click} matRef={spriteMat} />
          )}
        </group>
      </group>
      {/^farm-[0-2]$/.test(visit?.station.id??"") && atStation && <group position={[0,.35,.5]} name="resident-watering-can">
        <mesh castShadow><cylinderGeometry args={[.15,.18,.28,12]}/><meshStandardMaterial color="#6bbcad"/></mesh>
        <mesh position={[.2,.05,0]} rotation-z={-1}><cylinderGeometry args={[.04,.065,.35,8]}/><meshStandardMaterial color="#f9df9c"/></mesh>
        <mesh position={[-.19,0,0]}><torusGeometry args={[.12,.025,6,12]}/><meshStandardMaterial color="#6bbcad"/></mesh>
      </group>}
      {showBadge && !selected && (
        // 头顶状态图标永远画在最上层：不做深度测试、最后渲染，不会被树和道具挡住
        <sprite position={[0, height + (need?.6:.3), 0]} scale={need?[.52,.52,.52]:[.42,.42,.42]} onClick={click} renderOrder={1000}>
          <spriteMaterial map={badge} transparent depthWrite={false} depthTest={false} />
        </sprite>
      )}
      <group ref={fx} visible={false}>
        {fxTex && [0, 1, 2].map((i) => (
          <sprite key={i} scale={[0.4, 0.4, 0.4]} renderOrder={1001}>
            <spriteMaterial map={fxTex} transparent depthWrite={false} depthTest={false} />
          </sprite>
        ))}
      </group>
    </group>
  );
}

/** 接触影子的尺寸：宽 = 脚底实际宽度（再放大一点），深 = 宽的 0.45；还没加载完时按身高估算 */
function contactSize(height: number, fp: { aspect: number; foot: number } | null): [number, number] {
  const w = fp ? Math.max(height * 0.45, height * fp.aspect * fp.foot * 1.35) : height * 0.75;
  const cw = Math.min(w, height * 1.3);
  return [cw, cw * 0.62];
}

/**
 * 投影替身：和立绘同样大小的平面，主画面里完全不可见（不写颜色、不写深度），
 * 只在阴影贴图里按立绘透明度投出轮廓。
 */
function SpriteCaster({ url, height, onInfo }: { url: string; height: number; onInfo: (fp: { aspect: number; foot: number }) => void }) {
  const [info, setInfo] = useState<SpriteInfo | null>(null);
  useEffect(() => {
    let alive = true;
    loadSprite(url)
      .then((i) => {
        if (!alive) return;
        setInfo(i);
        onInfo({ aspect: i.aspect, foot: i.foot });
      })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  const mats = useMemo(() => {
    if (!info) return null;
    return {
      // 注意：three.js 画阴影时会沿用主材质的 side / map / alphaTest，所以这些必须设在主材质上：
      // 双面（替身正对太阳，单面会被剔除），并带立绘贴图和透明裁剪（投出轮廓而不是矩形）
      hidden: new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, map: info.texture, alphaTest: 0.5, side: THREE.DoubleSide }),
      depth: new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: info.texture, alphaTest: 0.5, side: THREE.DoubleSide })
    };
  }, [info]);
  if (!info || !mats) return null;
  const w = height * info.aspect;
  return (
    <mesh position-y={height / 2} castShadow material={mats.hidden} customDepthMaterial={mats.depth} raycast={() => null}>
      <planeGeometry args={[w, height]} />
    </mesh>
  );
}

function SpriteBody({ url, height, tint, onClick, matRef }: { url: string; height: number; tint: THREE.Color; onClick: (e: ThreeEvent<MouseEvent>) => void; matRef: React.MutableRefObject<THREE.MeshStandardMaterial | null> }) {
  const [info, setInfo] = useState<SpriteInfo | null>(null);
  useEffect(() => {
    let alive = true;
    // 加载失败（如网络抖动）时每 3 秒重试一次
    let timer: ReturnType<typeof setTimeout>;
    const attempt = () =>
      loadSprite(url)
        .then((i) => alive && setInfo(i))
        .catch(() => { if (alive) timer = setTimeout(attempt, 3000); });
    attempt();
    return () => { alive = false; clearTimeout(timer); };
  }, [url]);
  if (!info) return null;
  const w = height * info.aspect;
  return (
    <mesh position-y={height / 2} onClick={onClick} receiveShadow>
      <planeGeometry args={[w, height]} />
      {/* 受光材质：在椰子树阴影下会变暗；自发光保留立绘原本的鲜艳 */}
      <meshStandardMaterial
        ref={matRef}
        map={info.texture}
        color={tint}
        emissiveMap={info.texture}
        emissive="#ffffff"
        emissiveIntensity={0.42}
        roughness={0.85}
        metalness={0}
        envMapIntensity={0.3}
        alphaTest={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** 只播放循环类的待机 / 走路动作；攻击、眩晕等一次性动作不当作待机 */
const IDLE_RE = /defaultwait01_loop|wait.*loop|idle|wait|breath/i;
const WALK_RE = /walk|run(?!_?away)/i;
const BAD_RE = /fight|attack|damage|down|dizzy|faint|impact|trueno|battle|turn|sleep_end|jump/i;

function GlbBody({ entry, height, moving, onClick, onRadius }: { onRadius:(r:number)=>void; entry: ModelEntry; height: number; moving: React.MutableRefObject<{ moving: boolean }>; onClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const { scene, animations } = useGLTF(modelUrl(entry), DRACO_PATH);
  const clone = useMemo(() => normalizeModel(scene, entry, { height }, animations), [scene, height, entry, animations]);
  const onRadiusRef=useRef(onRadius);onRadiusRef.current=onRadius;
  useEffect(()=>{onRadiusRef.current(clone.userData.collisionRadius);},[clone]);
  const group = useRef<THREE.Group>(null!);
  const { actions, names } = useAnimations(animations, group);
  const idle = entry.idle ?? names.find((n) => IDLE_RE.test(n) && !BAD_RE.test(n));
  const walk = entry.walk ?? names.find((n) => WALK_RE.test(n) && !BAD_RE.test(n));
  const current = useRef<string | undefined>(undefined);
  // 定格姿势：播放指定动作并停在第一帧
  useEffect(() => {
    if (!entry.pose || !actions[entry.pose]) return;
    const a = actions[entry.pose]!;
    a.reset().play();
    a.paused = true;
    a.time = 0;
    return () => { a.stop(); };
  }, [actions, entry.pose]);
  useFrame(() => {
    if (entry.pose) return;
    const want = moving.current.moving && walk ? walk : idle;
    if (want && want !== current.current) {
      if (current.current) actions[current.current]?.fadeOut(0.25);
      actions[want]?.reset().fadeIn(0.25).play();
      current.current = want;
    }
  });
  return (
    <group ref={group} onClick={onClick}>
      <primitive object={clone} />
    </group>
  );
}
