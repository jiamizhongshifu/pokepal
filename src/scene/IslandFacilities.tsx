import { useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { Icon } from '../icons';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { STATIONS, type Visit, type Station } from './islandLife';
import { PLAYGROUND, FARM_PLOTS } from './layout';
import { terrainHeight } from './hq/Terrain';
import { iconTexture } from './textures';
import { FACILITY_GROUPS } from './facilityControls';
import { cropStage, growth, GROW_MS } from '../lib/farm';
import type { BerryGardenProps } from './BerryGarden';
import { residentPoses } from './residentRuntime';
import { artUrl } from '../data/pokemon';

const at=(p:{x:number;z:number}):[number,number,number]=>[p.x,terrainHeight(p.x,p.z)+.04,p.z];
function Token({icon,color='#ffffff'}:{icon:string;color?:string}){
  const map=useMemo(()=>iconTexture(icon,true),[icon]);
  return <sprite scale={[.65,.65,1]}><spriteMaterial map={map} color={color} transparent depthWrite={false}/></sprite>;
}
function StationEffect({station,active}:{station:Station;active:boolean}){
  return <group position={at(station)} name={`facility-${station.id}`} userData={{active}}>
    {active&&station.id.startsWith('lamp')&&<pointLight position-y={1.4} color="#ffe28b" intensity={7} distance={4}/>}
    {active&&station.water&&[0,1,2].map(i=><mesh key={i} rotation-x={-Math.PI/2} position={[0,.02+i*.01,0]}><ringGeometry args={[.5+i*.3,.54+i*.3,32]}/><meshBasicMaterial color="#f5ffff" transparent opacity={.7-i*.15} depthWrite={false}/></mesh>)}
  </group>;
}
// Screen-space controls stay whole above foliage and keep a child-sized touch target.
// Resolve overlaps in pixels, so zooming out never stacks two tappable controls.
function StationButtons({farm,onTap}:{farm:BerryGardenProps;onTap:(id:string)=>void}) {
  const root=useRef<HTMLDivElement>(null!);
  const point=useMemo(()=>new THREE.Vector3(),[]);
  const controls=[...FARM_PLOTS.map((p,i)=>({...p,id:`farm-${i}`,height:1.8})),...FACILITY_GROUPS.map(g=>({...STATIONS.find(s=>s.id===g.anchor)!,id:`area-${g.id}`,height:g.id==='garden'?3.5:1.7}))];
  useFrame(({camera,size,gl})=>{
    if(!root.current)return;
    const canvas=gl.domElement.getBoundingClientRect();
    const panels=Array.from(document.querySelectorAll('.home .topbar,.facility-panel,.area-choices,.farm-feedback,.picnic-panel,.companion-card,.home .dock,.companions-launch,.care-request')).map(e=>e.getBoundingClientRect());
    // Keep the Pokémon's projected body free of DOM hit targets as it walks.
    const residents=Array.from(residentPoses.values()).map(p=>{
      point.copy(p.position);point.y+=p.height*.55;point.project(camera);
      const x=(point.x+1)*size.width/2,y=(1-point.y)*size.height/2;
      point.copy(p.position);point.y+=p.height;point.project(camera);
      return {x,y,r:Math.max(24,Math.abs((1-point.y)*size.height/2-y))};
    });
    const occupied:{x:number;y:number}[]=[];
    for(const button of Array.from(root.current.querySelectorAll<HTMLElement>('[data-station]'))){
      const control=controls.find(s=>s.id===button.dataset.station)!;
      point.set(control.x,terrainHeight(control.x,control.z)+control.height,control.z).project(camera);
      const x=(point.x+1)*size.width/2,y=(1-point.y)*size.height/2;
      const visible=point.z>-1&&point.z<1&&x>40&&x<size.width-40&&y>80&&y<size.height-100
        &&!panels.some(r=>x+36>r.left-canvas.left&&x-36<r.right-canvas.left&&y+48>r.top-canvas.top&&y-32<r.bottom-canvas.top)
        &&!residents.some(p=>Math.abs(p.x-x)<p.r+32&&Math.abs(p.y-y)<p.r+36)
        &&!occupied.some(p=>Math.abs(p.x-x)<78&&Math.abs(p.y-y)<94);
      button.hidden=!visible;
      if(visible){occupied.push({x,y});button.style.transform=`translate(${x-30}px,${y-30}px)`;}
    }
  });
  return <Html fullscreen calculatePosition={(_,__,size)=>[size.width/2,size.height/2]} zIndexRange={[8,8]} style={{pointerEvents:'none'}}><div ref={root} className="station-buttons">
    {FARM_PLOTS.map((_,i)=>{
      const crop=farm.farm?.plots[i]??null,stage=cropStage(crop,farm.clock),busy=farm.working===i;
      const seconds=Math.ceil((1-growth(crop,farm.clock))*GROW_MS/1000);
      const label=stage==='empty'?'种一颗':stage==='ripe'?'摘果子':stage==='growing'?`${seconds}秒`:busy?(farm.watering===i?'浇水中':'伙伴来啦'):farm.canWater?'等伙伴':'找伙伴';
      return <button key={i} hidden data-station={`farm-${i}`} data-stage={stage} className={`station-button plot-action plot-${stage}`} aria-label={`${i+1}号田，${label}`} disabled={stage==='growing'||busy} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();farm.onPlot(i);}}>
        <Icon name={stage==='empty'?'seed':stage==='ripe'?'harvest':stage==='growing'?'sun':'watering-can'} size={36}/>
        {stage==='growing'&&<svg className="crop-clock" viewBox="0 0 64 64" aria-hidden><circle cx="32" cy="32" r="28" pathLength="100" strokeDasharray={`${growth(crop,farm.clock)*100} 100`}/></svg>}
        {busy&&farm.helperId&&<img className="plot-helper" src={artUrl(farm.helperId)} alt=""/>}
        <span className="station-label">{label}</span>
      </button>;
    })}
    {FACILITY_GROUPS.map(g=><button key={g.id} hidden data-station={`area-${g.id}`} className="station-button" aria-label={g.label} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onTap(`area-${g.id}`);}}>
      <Icon name={g.icon} size={36}/><span className="station-label">{g.label}</span>
    </button>)}
  </div></Html>;
}
/** Shared fixture feedback: it only animates after the assigned resident reaches the approach point. */
export function IslandFacilities({active,farm,onTap,showButtons=true}:{active:Visit[];farm:BerryGardenProps;onTap:(id:string)=>void;showButtons?:boolean}){
  const ball=useRef<THREE.Group>(null!),rotor=useRef<THREE.Group>(null!),notes=useRef<THREE.Group>(null!),shell=useRef<THREE.Group>(null!);
  const has=(id:string)=>active.some(v=>v.station.id===id);
  const lifeTime=useRef(0);
  useFrame((_,rawDt)=>{
    const dt=Math.min(rawDt,.05),t=lifeTime.current+=dt;
    if(ball.current){ball.current.position.y=.36+(has('ball')?Math.abs(Math.sin(t*2))*.7:0);ball.current.position.x=has('ball')?Math.sin(t*1.3)*.5:0;ball.current.rotation.z=has('ball')?t:0;}
    if(rotor.current)rotor.current.rotation.z+=dt*(has('windmill')?4:.15);
    if(notes.current){notes.current.visible=has('music');notes.current.children.forEach((n,i)=>{n.position.y=1.1+Math.sin(t*2+i)*.25;n.rotation.z=Math.sin(t+i)*.2;});}
    if(shell.current){shell.current.visible=has('sand');shell.current.position.y=.18+Math.abs(Math.sin(t))* .15;}
  });
  return <group name="island-facilities">
    <group position={at(PLAYGROUND.ball)} name="play-ball">
      <mesh rotation-x={-Math.PI/2} position-y={.012}><circleGeometry args={[1.45,48]}/><meshStandardMaterial color="#9cbd9d" roughness={1}/></mesh>
      <mesh rotation-x={-Math.PI/2} position-y={.018}><ringGeometry args={[1.32,1.36,48]}/><meshStandardMaterial color="#fff3da"/></mesh>
      <mesh rotation-x={-Math.PI/2} position-y={.02}><ringGeometry args={[.42,.46,32]}/><meshStandardMaterial color="#fff3da"/></mesh>
      {[-.9,.9].map(x=><mesh key={x} position={[x,.021,0]} rotation-x={-Math.PI/2}><planeGeometry args={[.85,.045]}/><meshStandardMaterial color="#fff3da"/></mesh>)}
      <group ref={ball} position-y={.36}>
        <mesh castShadow><sphereGeometry args={[.35,24,16]}/><meshStandardMaterial color="#e88472" roughness={.65}/></mesh>
        <mesh rotation-x={Math.PI/2}><torusGeometry args={[.351,.025,8,32]}/><meshStandardMaterial color="#fff5de"/></mesh>
        <mesh position={[0,0,.35]}><sphereGeometry args={[.09,12,8]}/><meshStandardMaterial color="#fff5de"/></mesh>
      </group>
      {[-.85,.85].map(x=><mesh key={x} position={[x,.36,-.6]} castShadow><capsuleGeometry args={[.08,.55,4,8]}/><meshStandardMaterial color="#77b8b0"/></mesh>)}
    </group>
    <group position={at(PLAYGROUND.music)} name="music-stage">
      <mesh castShadow receiveShadow><cylinderGeometry args={[1.05,1.15,.22,32]}/><meshStandardMaterial color="#dfb37b" roughness={.9}/></mesh>
      {[-.72,-.48,-.24,0,.24,.48,.72].map((x,i)=><mesh key={i} position={[x,.2,0]} castShadow><boxGeometry args={[.19,.12,.55+i*.075]}/><meshStandardMaterial color={['#cf8d7a','#e4ae76','#d2c07d','#8eb58e','#7ba9a5','#8e9cba','#b09aae'][i]} roughness={.75}/></mesh>)}
      <group ref={notes}>{[-.5,0,.5].map(x=><group key={x} position={[x,1.2,0]}><Token icon="music"/></group>)}</group>
    </group>
    <group position={at(PLAYGROUND.sand)} name="sand-pit">
      <mesh receiveShadow><cylinderGeometry args={[1.1,1.2,.12,32]}/><meshStandardMaterial color="#efd49b"/></mesh>
      <mesh rotation-x={Math.PI/2} position-y={.08}><torusGeometry args={[1.13,.1,8,32]}/><meshStandardMaterial color="#c49160"/></mesh>
      <group ref={shell} position-y={.2}><Token icon="search"/></group>
    </group>
    <group position={at(PLAYGROUND.windmill)} name="garden-windmill">
      <mesh position-y={.75} castShadow><cylinderGeometry args={[.06,.09,1.5,10]}/><meshStandardMaterial color="#bb895b"/></mesh>
      <group position={[0,1.6,.08]} ref={rotor}>
        {[0,1,2,3].map(i=><group key={i} rotation-z={i*Math.PI/2}><mesh position={[.22,.22,0]} rotation-z={-.4} castShadow><boxGeometry args={[.4,.28,.045]}/><meshStandardMaterial color={['#f4ca69','#81c6b4','#e7a099','#b6b8db'][i]}/></mesh></group>)}
        <mesh><sphereGeometry args={[.095,12,8]}/><meshStandardMaterial color="#fff3da"/></mesh>
      </group>
    </group>
    {showButtons&&<StationButtons farm={farm} onTap={onTap}/>}
    {STATIONS.map(s=><StationEffect key={s.id} station={s} active={has(s.id)}/>)}
  </group>;
}
