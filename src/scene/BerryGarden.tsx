import { useMemo, useRef, useEffect } from 'react';
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BERRIES, BERRY_KINDS, cropStage, growth, type FarmState } from '../lib/farm';
import { FARM_PLOTS } from './layout';
import { residentPosition } from './Resident';
import { terrainHeight } from './hq/Terrain';

/** Shared small, deterministic textures: warm timber grain and rounded soil granules. */
function gardenTextures() {
  const make=(soil:boolean)=>{
    const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!;
    g.fillStyle=soil?'#74523b':'#d7b487';g.fillRect(0,0,128,128);
    for(let i=0;i<100;i++){
      const x=(i*47)%128,y=(i*73)%128;
      g.fillStyle=soil?(i%2?'#8c674a':'#604433'):(i%2?'#bb956a':'#e4c69d');
      if(soil){g.beginPath();g.ellipse(x,y,1+i%3,1.5,0,0,7);g.fill();}
      else {g.globalAlpha=.35;g.fillRect(x,y,12+i%27,1);}
    }
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
  };
  return {wood:make(false),soil:make(true)};
}
export interface BerryGardenProps { farm?:FarmState; clock:number; watering:number|null; gardenerId?:number; onPlot:(index:number)=>void; working:number|null; helperId?:number; canWater:boolean }
export function BerryGarden({farm,clock,watering,gardenerId}:BerryGardenProps) {
  const maps=useMemo(gardenTextures,[]);
  useEffect(()=>()=>{maps.wood.dispose();maps.soil.dispose();},[maps]);
  const drops=useRef<THREE.Group>(null!);
  const elapsed=useRef(0);
  useFrame((_,dt)=>{
    elapsed.current+=Math.min(dt,.05);
    if(!drops.current||watering===null)return;
    const plot=FARM_PLOTS[watering],origin=gardenerId?residentPosition(gardenerId):undefined;
    const x=(origin?.x??plot.x)-plot.x,z=(origin?.z??plot.z+1.9)-plot.z;
    drops.current.children.forEach((m,i)=>{const k=(elapsed.current*.8+i/10)%1;m.position.set(x*(1-k)+Math.sin(i)*.08,.55+Math.sin(k*Math.PI)*.65,z*(1-k));});
  });
  return <group name="berry-garden">
    {FARM_PLOTS.map((p,i)=>{
      const crop=farm?.plots[i]??null,stage=cropStage(crop,clock),berry=BERRIES[crop?.berry??BERRY_KINDS[i]],amount=growth(crop,clock);
      return <group key={i} name={`farm-plot-${i}`} position={[p.x,terrainHeight(p.x,p.z)+.04,p.z]}>
        <RoundedBox args={[1.85,.26,1.4]} radius={.09} smoothness={2} position-y={.13} castShadow receiveShadow><meshStandardMaterial map={maps.wood} roughness={.92}/></RoundedBox>
        <RoundedBox args={[1.6,.08,1.14]} radius={.07} smoothness={2} position-y={.26} receiveShadow><meshStandardMaterial map={maps.soil} color={stage==='growing'||stage==='ripe'?'#b9c1b0':'#ffffff'} roughness={1}/></RoundedBox>
        {[-.84,.84].flatMap(x=>[-.6,.6].map(z=><mesh key={`${x}-${z}`} position={[x,.23,z]} castShadow><cylinderGeometry args={[.075,.075,.38,8]}/><meshStandardMaterial color="#b58b5e" roughness={1}/></mesh>))}
        {[-.38,.38].map((x,j)=><group key={j} position={[x,.31,j===1?-.18:.15]} scale={stage==='empty'?.35:stage==='thirsty'?.52:.65+amount*.35}>
          {stage==='empty'?<mesh scale={[1,.35,1]}><sphereGeometry args={[.16,10,6]}/><meshStandardMaterial color="#9c7650"/></mesh>:<>
            <mesh position-y={.25} castShadow><cylinderGeometry args={[.027,.04,.5,6]}/><meshStandardMaterial color="#659064"/></mesh>
            {[-1,1].map(side=><mesh key={side} position={[side*.13,.25,0]} rotation-z={side*-.6} scale={[.23,.08,.12]} castShadow><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color={berry.leaf} roughness={.9}/></mesh>)}
            {stage==='ripe'?<group position-y={.49}>
              <mesh castShadow scale={[1,crop?.berry==='pecha'?1.2:1,1]}><sphereGeometry args={[.18,16,12]}/><meshStandardMaterial color={berry.color} roughness={.55}/></mesh>
              <mesh position={[.06,.17,0]} rotation-z={-.6} scale={[.11,.035,.06]}><sphereGeometry args={[1,10,6]}/><meshStandardMaterial color="#57805d"/></mesh>
            </group>:stage==='growing'&&<mesh position-y={.5}><sphereGeometry args={[.07+amount*.05,10,8]}/><meshStandardMaterial color="#d6dc8d"/></mesh>}
          </>}
        </group>)}
        <group position={[.64,.35,.67]} rotation-x={-.12}>
          <mesh position-y={.1}><boxGeometry args={[.045,.38,.045]}/><meshStandardMaterial color="#9a754c"/></mesh>
          <RoundedBox args={[.32,.27,.055]} radius={.04} smoothness={2} position-y={.25}><meshStandardMaterial color="#fff2d8"/></RoundedBox>
          <mesh position={[0,.25,.045]}><sphereGeometry args={[.085,12,8]}/><meshStandardMaterial color={stage==='empty'?'#9bb78b':berry.color}/></mesh>
        </group>
        {watering===i&&<group ref={drops} name="farm-watering">{Array.from({length:10},(_,n)=><mesh key={n}><sphereGeometry args={[.045,6,4]}/><meshBasicMaterial color="#86d9ed"/></mesh>)}</group>}
      </group>;
    })}
    {/* A low orchard fence keeps the front access lane and views open. */}
    {[2,3.8,5.6,7.8].map(x=><group key={x} position={[x,terrainHeight(x,-5.65),-5.65]}>
      <RoundedBox args={[.12,.8,.12]} radius={.045} smoothness={2} position-y={.4} castShadow><meshStandardMaterial map={maps.wood}/></RoundedBox>
    </group>)}
    {[.3,.6].map(y=><mesh key={y} position={[4.9,terrainHeight(4.9,-5.65)+y,-5.65]} castShadow><boxGeometry args={[5.8,.075,.08]}/><meshStandardMaterial map={maps.wood}/></mesh>)}
    <group name="orchard-sign" position={[1.7,terrainHeight(1.7,-3.5),-3.5]}>
      <mesh position-y={.45} castShadow><cylinderGeometry args={[.055,.065,.9,8]}/><meshStandardMaterial map={maps.wood}/></mesh>
      <RoundedBox args={[.62,.45,.09]} radius={.08} smoothness={2} position-y={.85} castShadow><meshStandardMaterial color="#e9dbc0"/></RoundedBox>
      <mesh position={[0,.85,.055]} rotation-x={Math.PI/2}><cylinderGeometry args={[.14,.14,.015,24]}/><meshStandardMaterial color="#548d78"/></mesh>
      <mesh position={[0,.85,.075]}><boxGeometry args={[.28,.035,.02]}/><meshStandardMaterial color="#fff6e4"/></mesh>
      <mesh position={[0,.85,.09]}><sphereGeometry args={[.048,12,8]}/><meshStandardMaterial color="#fff6e4"/></mesh>
    </group>
  </group>;
}
