import { getPokemon } from '../data/pokemon';
import type { TogetherKind } from '../lib/islandLiving';
import { isAquatic, stationById, type Visit } from './islandLife';
import { planWalk,clearSpot } from './navigation';
import { onIsland } from './layout';
export const CAMP_PLAYER_DISTANCE=2.6;
export interface TogetherSession {id:string;kind:TogetherKind;help?:true;partners:number[];context:'play'|'shade'|'coast';visits:Visit[];}
/** Separate route endpoints, never two models at a shared station target. */
export function togetherSession(kind:TogetherKind,partners:number[],coast=false):TogetherSession{
 const id=crypto.randomUUID();
 const water=coast||partners.some(n=>isAquatic(getPokemon(n)));
 const base=stationById(water?'shore':kind!=='rest'?'ball':'parasol');
 const points=partners.map((pid,i)=>{
  if(water&&isAquatic(getPokemon(pid)))return {...onIsland(23+i*19,1.43),y:-.16};
  const desired=water?onIsland(23+i*19,1.08):{x:(kind!=='rest'?0:-2)+(i===0?-2.6:2.6),z:kind!=='rest'?0:7.5};
  const path=planWalk({x:0,z:4},desired,1.15);return path[path.length-1]??desired;
 });
 return {id,kind,partners,context:water?'coast':kind!=='rest'?'play':'shade',visits:partners.map((pokemonId,i)=>({pokemonId,manual:true,key:`together-${id}-${i}`,faceTo:points[1-i]??{x:points[i].x+CAMP_PLAYER_DISTANCE,z:points[i].z},station:{...base,x:points[i].x,z:points[i].z,id:`together-${id}-${i}`,target:points[i],water:isAquatic(getPokemon(pokemonId)),activity:kind!=='rest'?'play':'nap',name:kind==='rest'?'一起休息':kind==='bubbles'?'戳泡泡':kind==='jump'?'一起跳':'轮流玩球'}}))};
}

/** A temporary, small basket uses a clear spot away from both resting bodies. */
export function togetherHelpTarget(session:TogetherSession){
 const first=session.visits[0].station.target;
 for(const radius of [3.6,4.5,5.4])for(let i=0;i<16;i++){
  const p={x:first.x+Math.cos(i*Math.PI/8)*radius,z:first.z+Math.sin(i*Math.PI/8)*radius};
  if(clearSpot(p,.65)&&session.visits.every(v=>Math.hypot(p.x-v.station.target.x,p.z-v.station.target.z)>2.4))return p;
 }
 return null;
}
