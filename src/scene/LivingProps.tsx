import {togetherBallFraction} from '../lib/togetherTurn';
import { surfaceTexture } from './surfaceTextures';
import { useRef,useMemo, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FurnitureId } from '../lib/islandLiving';
import { DECOR_LAYOUT } from './decorationLayout';
import { terrainHeight } from './hq/Terrain';
import { residentPoses } from './residentRuntime';
import {CAMP_PLAYER_DISTANCE,togetherHelpTarget,type TogetherSession} from './together';
/** Low, fixed footprint additions; no large new obstacle in the walking lanes. */
export function LivingProps({items,playing=false}:{items:readonly FurnitureId[];playing?:boolean}){
 return <group name="living-furniture">{items.map(id=>{const {x,z}=DECOR_LAYOUT[id];return <group key={id} name={`living-${id}`} position={[x,id==='stones'?-.08:terrainHeight(x,z)+.04,z]}>
  {id==='flowers'&&[-.3,0,.3].map((x,i)=><group key={i} position={[x,0,Math.sin(i)*.22]}><mesh position-y={.13}><cylinderGeometry args={[.02,.02,.26,5]}/><meshStandardMaterial color="#6b9868"/></mesh><mesh position-y={.26} rotation-x={-Math.PI/2}><circleGeometry args={[.13,6]}/><meshStandardMaterial color={['#f1c7ce','#edda93','#f4eee0'][i]}/></mesh></group>)}
  {id==='lantern'&&<group>
    <mesh position-y={.055} castShadow><cylinderGeometry args={[.19,.22,.11,16]}/><meshStandardMaterial color="#2684bd" roughness={.7}/></mesh>
    <mesh position-y={.27}><cylinderGeometry args={[.13,.15,.32,16]}/><meshStandardMaterial color="#fff0b3" emissive="#ffd27a" emissiveIntensity={.3} roughness={.45}/></mesh>
    {[0,1,2,3].map(i=><mesh key={i} position={[Math.sin(i*Math.PI/2)*.16,.27,Math.cos(i*Math.PI/2)*.16]} castShadow><cylinderGeometry args={[.018,.018,.34,6]}/><meshStandardMaterial color="#186ba6"/></mesh>)}
    <mesh position-y={.46} castShadow><cylinderGeometry args={[.08,.19,.12,16]}/><meshStandardMaterial color="#2684bd" roughness={.7}/></mesh>
    <mesh position-y={.58}><torusGeometry args={[.085,.018,6,20]}/><meshStandardMaterial color="#186ba6"/></mesh>
  </group>}

  {id==='flags'&&[-1,1].map((x,i)=><group key={x} position={[x*2.1,0,-.8]}><mesh position-y={.45}><cylinderGeometry args={[.035,.035,.9,6]}/><meshStandardMaterial color="#72cba7"/></mesh><mesh position={[.12,.77,0]} rotation-z={Math.PI/2}><coneGeometry args={[.16,.3,3]}/><meshStandardMaterial color={i?'#ffe36d':'#72cba7'}/></mesh></group>)}
  {id==='basket'&&<group><mesh position-y={.16}><cylinderGeometry args={[.32,.26,.3,12,1,true]}/><meshStandardMaterial color="#d7b67e" map={surfaceTexture('wicker')} bumpMap={surfaceTexture('wicker')} bumpScale={.012} roughness={.92} side={THREE.DoubleSide}/></mesh><mesh position-y={.03}><cylinderGeometry args={[.26,.26,.04,12]}/><meshStandardMaterial color="#947449"/></mesh><mesh rotation-x={Math.PI/2} position-y={.315}><torusGeometry args={[.32,.025,6,24]}/><meshStandardMaterial color="#b58c56"/></mesh><mesh position-y={.3}><torusGeometry args={[.24,.025,6,20,Math.PI]}/><meshStandardMaterial color="#c99d61" map={surfaceTexture('wicker')}/></mesh></group>}
  {id==='table'&&<group><mesh position-y={.25}><cylinderGeometry args={[.65,.65,.12,24]}/><meshStandardMaterial color="#efd3a1" map={surfaceTexture('wood')} bumpMap={surfaceTexture('wood')} bumpScale={.015} roughness={.85}/></mesh>{[-.35,.35].map(x=><mesh key={x} position={[x,.12,0]}><boxGeometry args={[.1,.24,.55]}/><meshStandardMaterial color="#b08046" map={surfaceTexture('wood')}/></mesh>)}</group>}
  {id==='mat'&&<mesh rotation-x={-Math.PI/2}><circleGeometry args={[.8,32]}/><meshStandardMaterial color="#72cba7" map={surfaceTexture('weave')} roughness={1}/></mesh>}
  {id==='bush'&&[-.4,0,.4].map((x,i)=><mesh key={i} position={[x,.22,0]} scale={[1,.65,1]}><sphereGeometry args={[.34,12,8]}/><meshStandardMaterial color={['#7aaf7d','#90b67d','#6e9f74'][i]}/></mesh>)}
  {id==='stones'&&[-.6,0,.6].map((x,i)=><mesh key={i} position={[x,0,Math.sin(i)*.3]} scale={[1,.3,.8]}><sphereGeometry args={[.25,12,8]}/><meshStandardMaterial color="#c8d6c5" roughness={1}/></mesh>)}
  {id==='pinwheel'&&<group><mesh position-y={.46}><cylinderGeometry args={[.035,.035,.92,8]}/><meshStandardMaterial color="#2684bd"/></mesh><group position={[0,.9,.06]}>{[0,1,2,3].map(i=><mesh key={i} rotation-z={i*Math.PI/2} position={[Math.sin(i*Math.PI/2)*.12,Math.cos(i*Math.PI/2)*.12,0]}><coneGeometry args={[.13,.26,3]}/><meshStandardMaterial color={['#ffe36d','#72cba7','#2684bd','#f38e78'][i]}/></mesh>)}<mesh><sphereGeometry args={[.055,10,8]}/><meshStandardMaterial color="#fffef7"/></mesh></group></group>}
  {id==='shells'&&Array.from({length:8},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI/4)*.5,.04,Math.sin(i*Math.PI/4)*.5]} scale={[1,.35,.75]}><sphereGeometry args={[.12,8,6]}/><meshStandardMaterial color={i%2?'#fffef7':'#f3c7b5'}/></mesh>)}
  {id==='rainbow'&&[.88,.68,.48].map((r,i)=><mesh key={r} rotation-x={-Math.PI/2} position-y={.008}><ringGeometry args={[i===2?0:r-.2,r,40]}/><meshStandardMaterial color={['#2684bd','#72cba7','#ffe36d'][i]} map={surfaceTexture('weave')} roughness={1}/></mesh>)}
  {id==='track'&&!playing&&<mesh position={[-1.8,.25,0]}><sphereGeometry args={[.25,16,12]}/><meshStandardMaterial color="#f3ca5c"/></mesh>}
  {id==='track'&&[-.42,.42].map(z=><mesh key={z} position={[0,.05,z]}><boxGeometry args={[4,.04,.1]}/><meshStandardMaterial color="#e5ca8c"/></mesh>)}
 </group>;})}</group>;
}
export function TogetherBall({session,turn,progress,ready}:{session:TogetherSession;turn:number;progress:MutableRefObject<number>;acting:boolean;ready:boolean}){
 const ball=useRef<THREE.Mesh>(null!),basket=useRef<THREE.Group>(null!);
 const basketSpot=useMemo(()=>session.help?togetherHelpTarget(session):null,[session]);
 useFrame(()=>{
  if(!ball.current)return;const a=residentPoses.get(session.partners[0]),b=residentPoses.get(session.partners[1]);
  ball.current.visible=ready&&session.kind==='ball'&&!!a;if(basket.current)basket.current.visible=!!basketSpot&&ready;if(!a)return;
  const start=a.position.clone(),end=b?.position.clone()??start.clone().add(new THREE.Vector3(CAMP_PLAYER_DISTANCE,0,0));
  const delta=end.clone().sub(start).normalize();start.addScaledVector(delta,.8);end.addScaledVector(delta,-.8);
  // Hold the toy beside the child's sightline, so a small partner's face stays visible.
  if(!b)end.z+=.45;
  const radius=THREE.MathUtils.clamp(Math.min(a.height,b?.height??a.height)*.16,.09,.22);
  ball.current.scale.setScalar(radius/.25);
  if(basketSpot){end.set(basketSpot.x,Math.max(.04,terrainHeight(basketSpot.x,basketSpot.z)),basketSpot.z);basket.current.position.copy(end);}
  const p=session.help?progress.current:togetherBallFraction(turn,progress.current);
  ball.current.position.lerpVectors(start,end,p);
  ball.current.position.y=Math.max(-.12,terrainHeight(ball.current.position.x,ball.current.position.z))+radius+(session.help?Math.sin(Math.PI*p)*1.2:0);
  ball.current.rotation.z=-p*8;
 });
 return <group><group ref={basket} name="together-help-basket" visible={false}><mesh position-y={.18} castShadow><cylinderGeometry args={[.48,.35,.36,16,1,true]}/><meshStandardMaterial color="#d7b67e" map={surfaceTexture('wicker')} side={THREE.DoubleSide}/></mesh><mesh rotation-x={-Math.PI/2} position-y={.36}><torusGeometry args={[.48,.04,8,24]}/><meshStandardMaterial color="#b58c56"/></mesh><mesh position-y={.025}><cylinderGeometry args={[.35,.35,.05,16]}/><meshStandardMaterial color="#947449"/></mesh></group><mesh ref={ball} name="together-ball" visible={false} castShadow><sphereGeometry args={[.25,20,14]}/><meshStandardMaterial color="#f3ca5c" roughness={.65}/></mesh></group>;
}
