import { companionShot } from './companionShot';
import { observationInterest } from './observationInterest';
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { residentPoses } from "./residentRuntime";
import { recordCamera } from "../lib/cameraDiagnostics";
import { IdleDirector } from "./idleDirector";
import { OBSTACLES, obstacleDist } from "./layout";
import { terrainHeight } from "./hq/Terrain";
import { CAMPFIRE } from "./layout";

export type CameraView = "farm" | "play" | "leisure" | "overview" | "meadow" | "campfire" | "beach" | "camp" | "garden" | "follow" | "free" | "together";

/** 最佳机位：镜头位置 + 看向的点 */
export const CAMERA_VIEWS: Record<Exclude<CameraView, "follow" | "free" | "together">, { pos: [number, number, number]; target: [number, number, number] }> = {
  farm: {pos:[6.5,8,8],target:[6.5,.3,-4]},
  play: {pos:[-8.2,7.5,10.5],target:[-8.2,.3,-.6]},
  leisure: {pos:[-3.5,8,16],target:[-3.5,.7,4.5]},
  garden: { pos: [5.4, 9, 15], target: [5.4, 0.4, -1.5] },
  overview: { pos: [-1.8, 15, 27], target: [-1.8, 0, -2] },
  meadow: { pos: [0.4, 2.7, 7.6], target: [-0.6, 0.7, 0.6] },
  campfire: { pos: [CAMPFIRE.x + 2.4, 2.6, CAMPFIRE.z + 5.6], target: [CAMPFIRE.x, 0.6, CAMPFIRE.z] },
  beach: { pos: [11, 6.5, 15], target: [11, 0.1, 2] },
  camp: { pos: [-3.8, 8, 6], target: [-3.8, 0.3, -6.6] }
};

/**
 * 镜头控制：切换机位时平滑飞过去；跟随模式下持续追着选中的宝可梦。
 * 孩子用手指拖动时立刻停止自动飞行，交给手势控制。
 */
export function CameraRig({ spotlight,selectedId=null,active=true,meeting, view, followId, nonce, idleAllowed=false, idleBlockReason="", followPaused=false, onObserve }: { spotlight?:{x:number;z:number;wide?:boolean};selectedId?:number|null;active?:boolean;meeting?:{x:number;z:number}; view: CameraView; followId: number | null; nonce: number; idleAllowed?:boolean; idleBlockReason?:string; followPaused?:boolean; onObserve?:(id:number|null,ready?:boolean)=>void }) {
  const { camera, controls, scene, size } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null;scene:THREE.Scene;size:{width:number;height:number} };
  const portrait = useThree((s) => s.size.width / s.size.height < 0.8);
  const flying = useRef(true);
  const closeup=useRef<{id:number;angle:number;manual:boolean;measured:boolean;height:number;width:number}|null>(null);
  const gestureStarts=useRef(new Map<number,{x:number;y:number}>());
  const beforeCloseup=useRef<{position:THREE.Vector3;target:THREE.Vector3;view:CameraView;nonce:number}|null>(null);

  const gesturing=useRef(false),manualOffset=useRef(false),yaw=useRef<number|null>(null);
  const offset=useRef(new THREE.Vector3()),target=useRef(new THREE.Vector3()),previousTarget=useRef(new THREE.Vector3());
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const goalPos = useRef(new THREE.Vector3(...CAMERA_VIEWS.overview.pos));
  const goalTarget = useRef(new THREE.Vector3(...CAMERA_VIEWS.overview.target));

  const director=useRef(new IdleDirector(performance.now()));
  const shotReady=useRef(false);
  const observed=useRef<number|null>(null),shotOffset=useRef(new THREE.Vector3());
  const pointers=useRef(new Map<number,string>());
  const notify=useRef(onObserve);notify.current=onObserve;
  const lastInput=useRef("场景初始化");
  const stop=(reason="状态切换")=>{
    lastInput.current=reason;
    director.current.interrupt(performance.now());
    // Input owns the rig immediately, including preset flights before OrbitControls starts.
    flying.current=false;
    if(observed.current!==null){observed.current=null;flying.current=false;camera.userData.idleSubject=null;notify.current?.(null);}
  };
  useEffect(()=>{
    const down=(e:PointerEvent)=>{pointers.current.set(e.pointerId,e.pointerType);gestureStarts.current.set(e.pointerId,{x:e.clientX,y:e.clientY});stop(e.type);};
    const up=(e:PointerEvent)=>{pointers.current.delete(e.pointerId);gestureStarts.current.delete(e.pointerId);stop(e.type);};
    const input=(e:Event)=>{if(e.type==='wheel'&&e.target instanceof HTMLCanvasElement&&closeup.current){closeup.current.manual=true;beforeCloseup.current=null;}stop(e.type);};
    // Safari can hand a gesture to the system or remove its target before pointerup.
    const touchesEnded=(e:TouchEvent)=>{if(!e.touches.length){pointers.current.clear();gestureStarts.current.clear();gesturing.current=false;}stop(e.type);};
    const move=(e:PointerEvent)=>{
      if(e.pointerType!=='touch'&&e.buttons===0){pointers.current.delete(e.pointerId);return;}
      if(e.buttons||pointers.current.has(e.pointerId)){
        const start=gestureStarts.current.get(e.pointerId);
        if(gesturing.current&&closeup.current&&start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>5){closeup.current.manual=true;beforeCloseup.current=null;}
        stop(e.type);
      }
    };
    const visibility=(e:Event)=>{pointers.current.clear();gestureStarts.current.clear();gesturing.current=false;stop(e.type);};
    window.addEventListener('pointerdown',down,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
    window.addEventListener('lostpointercapture',up,true);
    window.addEventListener('touchend',touchesEnded,{passive:true,capture:true});window.addEventListener('touchcancel',touchesEnded,{passive:true,capture:true});
    window.addEventListener('pointermove',move,{passive:true});window.addEventListener('wheel',input,{passive:true});window.addEventListener('keydown',input,true);
    window.addEventListener('blur',visibility);document.addEventListener('visibilitychange',visibility);
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');motion.addEventListener('change',input);
    return()=>{
      window.removeEventListener('pointerdown',down,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',up,true);
      window.removeEventListener('lostpointercapture',up,true);window.removeEventListener('touchend',touchesEnded,true);window.removeEventListener('touchcancel',touchesEnded,true);
      window.removeEventListener('pointermove',move);window.removeEventListener('wheel',input);window.removeEventListener('keydown',input,true);
      window.removeEventListener('blur',visibility);document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',input);
      camera.userData.idleSubject=null;
    };
  },[camera]);
  useEffect(()=>{stop();},[idleAllowed,view,followId,nonce,portrait]);

  // 选新机位（或再次点同一个机位）时开始飞
  useEffect(() => {
    manualOffset.current=false;yaw.current=null;
    if (!spotlight&&view === "free" || view==='together'&&!meeting) { flying.current = false; return; }
    if(spotlight){
      goalTarget.current.set(spotlight.x,terrainHeight(spotlight.x,spotlight.z)+.3,spotlight.z);
      goalPos.current.copy(goalTarget.current).add(new THREE.Vector3(0,spotlight.wide?22:5,spotlight.wide?26:6));
      if(portrait){goalTarget.current.y-=.7;goalPos.current.y-=.7;}
    }else if(view==='together'&&meeting){
      goalTarget.current.set(meeting.x-(portrait?0:2),portrait?-3:0,meeting.z);
      goalPos.current.copy(goalTarget.current).add(new THREE.Vector3(0,portrait?23:16,portrait?24:17));
    } else if (view !== "follow" && view!=='together' && view!=="free") {
      const v = CAMERA_VIEWS[view];
      goalPos.current.fromArray(v.pos);
      goalTarget.current.fromArray(v.target);
      if(portrait&&view==='farm'){goalPos.current.x=4.9;goalTarget.current.x=4.9;goalPos.current.y-=2.8;goalTarget.current.y-=2.8;}
      if(portrait) goalPos.current.sub(goalTarget.current).multiplyScalar(view === "farm" ? 1.55 : view === "overview" ? 1.65 : view === "camp" ? 1.8 : view === "play" || view === "leisure" ? 1.55 : 1.3).add(goalTarget.current);
    }
    flying.current = true;
    if (view !== "follow" && controls && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      camera.position.copy(goalPos.current);
      controls.target.copy(goalTarget.current);
      controls.update();
      flying.current = false;
    }
  }, [view, nonce, portrait, camera, controls, followId, meeting?.x, meeting?.z,spotlight?.x,spotlight?.z,spotlight?.wide]);

  // 手指拖动 → 停止自动飞行（跟随模式下只停止调整距离，继续追踪目标）
  useEffect(() => {
    if (!controls) return;
    const start = () => {
      stop('controls-start');
      if(closeup.current)gesturing.current=true;
      if(view==='follow'){gesturing.current=true;manualOffset.current=true;}
      else flying.current=false;
    };
    const end=()=>{gesturing.current=false;stop('controls-end');};
    controls.addEventListener('start',start);controls.addEventListener('end',end);
    return()=>{controls.removeEventListener('start',start);controls.removeEventListener('end',end);};
  }, [controls, view]);

  useEffect(()=>{
    if(!controls)return;
    if(selectedId!==null){
      if(!closeup.current)beforeCloseup.current={position:camera.position.clone(),target:controls.target.clone(),view,nonce};
      const pose=residentPoses.get(selectedId);
      const angle=pose?Math.atan2(camera.position.x-pose.position.x,camera.position.z-pose.position.z):0;
      closeup.current={id:selectedId,angle,manual:false,measured:false,height:pose?.height??1,width:pose?.height??1};
      stop('面对面互动');
    }else if(closeup.current){
      closeup.current=null;camera.userData.closeup=null;
      const previous=beforeCloseup.current;beforeCloseup.current=null;
      if(previous&&previous.view===view&&previous.nonce===nonce&&view!=='follow'){
        goalPos.current.copy(previous.position);goalTarget.current.copy(previous.target);flying.current=true;
        if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(goalPos.current);controls.target.copy(goalTarget.current);controls.update();flying.current=false;}
      }
    }
    // A manual gesture may change view to free; it must not restart the same close-up.
  },[selectedId,controls,camera]);

  useFrame((_, dt) => {
    const modalOpen=[...document.querySelectorAll('dialog[open], .modal-backdrop')].some(e=>e.getClientRects().length>0);
    const reducedNow=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reason=document.hidden?'页面未显示':!idleAllowed?(idleBlockReason||'互动进行中'):modalOpen?'弹窗打开':!controls?'镜头控制尚未就绪':view==='follow'?'正在跟随伙伴':pointers.current.size?'手指仍在触摸':!residentPoses.size?'家园没有已加载的伙伴':'';
    recordCamera({at:Date.now(),reason,view,elapsed:Math.round(performance.now()-director.current.lastInput),pointers:pointers.current.size,candidates:residentPoses.size,reduced:reducedNow,subject:director.current.subject,lastInput:lastInput.current});
    if(!controls)return;
    const blocked=!idleAllowed||document.hidden||modalOpen;
    // Exposed on the scene object for local diagnostics; never written to the child's save.
    camera.userData.idleDebug={idleAllowed,view,elapsed:performance.now()-director.current.lastInput,pointers:pointers.current.size,candidates:residentPoses.size,hidden:document.hidden,reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches,modalOpen};
    const k = 1 - Math.exp(-Math.min(dt,.05) * 2.6);
    if(selectedId!==null){
      const shot=closeup.current,pose=residentPoses.get(selectedId);
      if(!active||document.hidden||modalOpen||!shot||!pose)return;
      camera.userData.closeup={id:selectedId,manual:shot.manual};
      if(gesturing.current)return;
      if(shot.manual)return;
      if(!shot.measured){
        const body=scene.getObjectByName(`resident-${selectedId}`)?.getObjectByName('resident-body');
        if(body&&body.children.length){
          body.updateWorldMatrix(true,true);
          const bounds=new THREE.Box3().setFromObject(body,true),span=bounds.getSize(new THREE.Vector3());
          if(span.y>.1){
            shot.height=Math.max(pose.height,span.y);shot.width=Math.hypot(span.x,span.z);shot.measured=true;
            // Prefer the current side, but avoid placing the lens inside a tree or facility.
            let best=shot.angle,bestScore=Infinity;
            for(const delta of [0,.65,-.65,1.3,-1.3,2.2,-2.2,Math.PI]){
              const angle=shot.angle+delta;
              const candidate=companionShot(pose.position,shot.height,shot.width,size.width/size.height,camera.fov,angle);
              let score=Math.abs(delta)*.2;
              for(let i=2;i<=8;i++){
                const x=THREE.MathUtils.lerp(pose.position.x,candidate.position.x,i/8),z=THREE.MathUtils.lerp(pose.position.z,candidate.position.z,i/8);
                score+=OBSTACLES.filter(o=>obstacleDist(o,x,z)<o.r+.25).length;
              }
              if(score<bestScore){best=angle;bestScore=score;}
            }
            shot.angle=best;
          }
        }
      }
      const framed=companionShot(pose.position,shot.height,shot.width,size.width/size.height,camera.fov,shot.angle);
      framed.position.y=Math.max(framed.position.y,terrainHeight(framed.position.x,framed.position.z)+.7);
      const ease=reducedNow?1:1-Math.exp(-Math.min(dt,.05)*3.8);
      camera.position.lerp(framed.position,ease);controls.target.lerp(framed.target,ease);controls.update();
      camera.userData.closeup={id:selectedId,manual:false,distance:camera.position.distanceTo(pose.position),height:shot.height};
      return;
    }

    if (view === "follow" && followId !== null) {
      if(followPaused||document.hidden||modalOpen||gesturing.current||pointers.current.size){director.current.interrupt(performance.now());return;}
      const pose=residentPoses.get(followId);
      if(pose){
        const p=pose.position;
        target.current.set(p.x,p.y+pose.height*.6,p.z);
        previousTarget.current.copy(controls.target);
        controls.target.lerp(target.current,1-Math.exp(-Math.min(dt,.05)*5));
        // Translate both ends of the rig together: the resident stays framed even
        // while the child changes the orbit or zoom. Never fight the active gesture.
        camera.position.add(offset.current.copy(controls.target).sub(previousTarget.current));
        if(!gesturing.current&&!manualOffset.current){
          if(yaw.current===null)yaw.current=pose.heading;
          if(pose.moving&&!reduced){const delta=Math.atan2(Math.sin(pose.heading-yaw.current),Math.cos(pose.heading-yaw.current));yaw.current+=delta*(1-Math.exp(-Math.min(dt,.05)*.7));}
          const distance=Math.max(portrait?7:5.8,pose.height*3.1);
          const angle=yaw.current+Math.PI+.32;
          goalPos.current.set(p.x+Math.sin(angle)*distance,p.y+Math.max(3,pose.height*1.5),p.z+Math.cos(angle)*distance);
          camera.position.lerp(goalPos.current,1-Math.exp(-Math.min(dt,.05)*2));
        }
        controls.update();
      }
      return;
    }
    const subject=director.current.tick(performance.now(),!blocked&&view!=='follow'&&!pointers.current.size,
      [...residentPoses].map(([id,p])=>({id,activity:p.activity,moving:p.moving,eventAt:observationInterest(id)})));
    if(subject!==null){
      const pose=residentPoses.get(subject)!;
      const newShot=observed.current!==subject;
      if(newShot){
        observed.current=subject;shotReady.current=false;flying.current=false;camera.userData.idleSubject=subject;notify.current?.(subject,false);
        const distance=Math.max(portrait?12:8,pose.height*3.3);
        // Choose a clear, stable three-quarter view. Do not continuously orbit the child.
        let bestAngle=.35,bestScore=Infinity;
        for(const angle of [.35,-.55,1.05,-1.05,1.65,-1.65]){
          let score=Math.abs(angle)*.15;
          for(let i=2;i<=8;i++){
            const x=pose.position.x+Math.sin(angle)*distance*i/8,z=pose.position.z+Math.cos(angle)*distance*i/8;
            score+=OBSTACLES.filter(o=>obstacleDist(o,x,z)<o.r+.65).length;
          }
          if(score<bestScore){bestScore=score;bestAngle=angle;}
        }
        shotOffset.current.set(Math.sin(bestAngle)*distance,Math.max(5,pose.height*2),Math.cos(bestAngle)*distance);
      }
      // Reduced motion keeps a fixed composition between cuts: no flight, orbit
      // or continuous tracking. It must not disable the observation feature.
      if(reducedNow&&!newShot)return;
      goalTarget.current.copy(pose.position);goalTarget.current.y+=pose.height*.5;
      goalPos.current.copy(goalTarget.current).add(shotOffset.current);
      goalPos.current.y=Math.max(goalPos.current.y,terrainHeight(goalPos.current.x,goalPos.current.z)+3);
      // Ease into each shot over several seconds; keep a walking companion in frame.
      const ease=reducedNow?1:1-Math.exp(-Math.min(dt,.05)*.65);
      camera.position.lerp(goalPos.current,ease);controls.target.lerp(goalTarget.current,ease);controls.update();
      if(!shotReady.current && camera.position.distanceTo(goalPos.current)<2 && controls.target.distanceTo(goalTarget.current)<1.2){
        shotReady.current=true;notify.current?.(subject,true);
      }
      return;
    }
    if(observed.current!==null){observed.current=null;camera.userData.idleSubject=null;notify.current?.(null);}
    if (!flying.current) return;
    camera.position.lerp(goalPos.current, k);
    controls.target.lerp(goalTarget.current, k);
    controls.update();
    if (camera.position.distanceTo(goalPos.current) < 0.02 && controls.target.distanceTo(goalTarget.current) < 0.02) flying.current = false;
  });
  return null;
}
