import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PicnicSession } from '../lib/picnic';
import { BERRIES } from '../lib/farm';
import { residentPoses } from './residentRuntime';

/** The actual inventory fruit travels from the picnic plate to the guest, then disappears. */
export function PicnicSnack({session,ready}:{session:PicnicSession;ready:boolean}){
 const root=useRef<THREE.Group>(null!),fruit=useRef<THREE.Group>(null!);
 useFrame(()=>{
  const pose=residentPoses.get(session.pokemonId);if(!root.current||!fruit.current)return;
  root.current.visible=!!pose&&ready;if(!pose||!ready)return;
  root.current.position.copy(pose.position);
  const t=session.servedAt===undefined?-1:(Date.now()-session.servedAt)/1000;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress=t<0?0:reduced?1:Math.min(1,t/1.2);
  fruit.current.visible=t<1.8;
  fruit.current.position.set(.85*(1-progress),.15+pose.height*.65*progress+(reduced?0:Math.sin(progress*Math.PI)*.5),.5*(1-progress));
  fruit.current.scale.setScalar(t<1.2?1:Math.max(0,1-(t-1.2)/.6));
 });
 return <group ref={root} name="picnic-snack" visible={false}>
  <mesh position={[.85,.035,.5]} rotation-x={-Math.PI/2}><circleGeometry args={[.36,24]}/><meshStandardMaterial color="#fff4d5" roughness={.95} side={THREE.DoubleSide}/></mesh>
  <group ref={fruit}>
   <mesh castShadow><sphereGeometry args={[.19,16,12]}/><meshStandardMaterial color={BERRIES[session.berry].color} roughness={.75}/></mesh>
   <mesh position={[.07,.18,0]} rotation-z={-.6} scale={[1,.35,.7]}><sphereGeometry args={[.12,10,8]}/><meshStandardMaterial color={BERRIES[session.berry].leaf}/></mesh>
  </group>
 </group>;
}
