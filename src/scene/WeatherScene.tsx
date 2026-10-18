import {RAIN_CANOPIES} from './rainShelter';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {IslandWeather} from '../lib/weather';
import {terrainHeight} from './hq/Terrain';
import {TENT,PARASOL} from './layout';
const noHit=()=>{};
/** One draw call for rain; no lights, shadows, DOM overlays, raycasting or full-screen blur. */
export function WeatherRain({weather,lite=false}:{weather:IslandWeather;lite?:boolean}){
 const reduced=useRef(false),mat=useRef<THREE.LineBasicMaterial>(null!);
 useEffect(()=>{const mq=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>{reduced.current=mq.matches;};update();mq.addEventListener('change',update);return()=>mq.removeEventListener('change',update);},[]);
 const count=lite?140:320;
 const {geometry,base}=useMemo(()=>{
  const base=Array.from({length:count},(_,i)=>({x:Math.sin(i*127.1)*19-2,z:Math.sin(i*311.7)*17-2,y:(i*.61803398875%1)*13}));
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*6),3));geometry.setDrawRange(0,0);return {base,geometry};
 },[count]);
 const strength=useRef(0),clock=useRef(0);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame((_,delta)=>{
  const dt=Math.min(delta,.05);strength.current=THREE.MathUtils.damp(strength.current,weather.rain,1,dt);
  if(mat.current)mat.current.opacity=strength.current*.43;
  if(strength.current<.01){geometry.setDrawRange(0,0);return;}
  clock.current+=dt*(reduced.current?.38:1);const t=clock.current,positions=geometry.attributes.position as THREE.BufferAttribute;
  const n=Math.floor(count*(reduced.current?.35:1));geometry.setDrawRange(0,n*2);
  for(let i=0;i<n;i++){
   const b=base[i],y=(b.y-t*5.8%13+13)%13,x=b.x-weather.wind*y*.14,z=b.z,ground=terrainHeight(x,z);
   const covered=RAIN_CANOPIES.some(t=>Math.hypot(x-t.x,z-t.z)<t.radius&&y<terrainHeight(t.x,t.z)+t.bottom)||(Math.hypot(x-TENT.x,z-TENT.z)<1.8&&y<2)||(Math.hypot(x-PARASOL.x,z-PARASOL.z)<1.65&&y<2.8);
   const yy=covered||y<ground?-.6:y;
   positions.setXYZ(i*2,x,yy,z);positions.setXYZ(i*2+1,x+.045*weather.wind,yy+.23,z);
  }
  positions.needsUpdate=true;
 });
 return <lineSegments name="island-weather-rain" geometry={geometry} raycast={noHit} frustumCulled={false}><lineBasicMaterial ref={mat} color="#d4eff4" transparent opacity={0} depthWrite={false}/></lineSegments>;
}
