import {useMemo,useRef,type MutableRefObject} from 'react';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {Icon} from '../icons';
import {residentPoses} from './residentRuntime';
import type {TogetherSession} from './together';

/** One reachable toy beside the partner; popping it never depends on a fast gesture. */
export function TogetherBubbles({session,turn,progress,acting,ready,childReady,onRoll}:{session:TogetherSession;turn:number;progress:MutableRefObject<number>;acting:boolean;ready:boolean;childReady?:boolean;onRoll?:()=>void}){
 const root=useRef<THREE.Group>(null!),bubble=useRef<THREE.Mesh>(null!),burst=useRef<THREE.Group>(null!);
 const toward=useMemo(()=>new THREE.Vector3(),[]),side=useMemo(()=>new THREE.Vector3(),[]),screen=useMemo(()=>new THREE.Vector3(),[]);
 const reduced=useMemo(()=>window.matchMedia('(prefers-reduced-motion: reduce)'),[]);
 useFrame(({camera,clock,size})=>{
  const pose=residentPoses.get(session.partners[0]);if(!root.current)return;
  root.current.visible=ready&&!!pose&&(progress.current<1||childReady===true);if(!pose)return;
  toward.copy(camera.position).sub(pose.position).setY(0).normalize();
  side.setFromMatrixColumn(camera.matrixWorld,0).setY(0).normalize();
  root.current.position.copy(pose.position).addScaledVector(toward,.45).addScaledVector(side,.55+Math.min(pose.height,.9)*.4);
  root.current.position.y+=Math.max(.42,pose.height*.65)+(reduced.matches?0:Math.sin(clock.elapsedTime*1.5)*.035);
  // Keep the whole toy and its 96px hit area inside narrow portrait viewports.
  const compact=size.width<600,margin=compact?80:96;
  root.current.scale.setScalar(compact?.8:1);
  screen.copy(root.current.position).project(camera);
  if(screen.z>-1&&screen.z<1){
   screen.x=THREE.MathUtils.clamp(screen.x,-1+2*margin/size.width,1-2*margin/size.width);
   screen.y=THREE.MathUtils.clamp(screen.y,-1+2*margin/size.height,1-2*Math.min(190,size.height*.35)/size.height);
   root.current.position.copy(screen.unproject(camera));
  }
  root.current.quaternion.copy(camera.quaternion);
  const p=progress.current;
  bubble.current.visible=!acting;burst.current.visible=acting&&p<.65;
  burst.current.scale.setScalar(reduced.matches?1:1+p*1.8);
  for(const obj of burst.current.children)(obj as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>).material.opacity=1-p/.65;
 });
 return <group ref={root} name="together-bubbles" visible={false}>
  <mesh ref={bubble}><sphereGeometry args={[.28,24,16]}/><meshPhysicalMaterial color={['#9be8ff','#fbc8e5','#fff1a6'][turn%3]} transparent opacity={.65} roughness={.12} metalness={.1} clearcoat={1} depthWrite={false}/></mesh>
  <group ref={burst} visible={false}>{Array.from({length:6},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI/3)*.32,Math.sin(i*Math.PI/3)*.32,.02]}><sphereGeometry args={[.055,8,6]}/><meshBasicMaterial color={i%2?'#fff3b1':'#c0f5ff'} transparent depthWrite={false}/></mesh>)}</group>
  {childReady&&<Html center zIndexRange={[40,30]}><button className="camp-toy-touch camp-bubble-touch" aria-label={`戳第 ${turn+1} 个泡泡`} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onRoll?.();}}><span className="camp-touch-hand"><Icon name="hand" size={28}/></span></button></Html>}
 </group>;
}
