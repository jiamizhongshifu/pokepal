import type {WeatherKind} from './weather';
import {weatherVisit} from '../scene/weatherReactions';
import { activeResidentIds } from "./activeResidents";
import { furnitureAffinity, type FurnitureId } from './islandLiving';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Capture } from '../types';
import { getPokemon } from '../data/pokemon';
import { habitAt } from './routine';
import { affinity, compatible, isAquatic, furnishedStation, STATIONS, stationById, type Visit } from '../scene/islandLife';

/** Activity assignments are derived only from owned Pokémon; no save mutation or reward farming. */
export function useIslandLife(captures: Capture[], now: Date, paused: boolean, careId?:number, group:Visit[]=[], furniture:readonly FurnitureId[]=[], focus:readonly (number|null|undefined)[]=[], weather:WeatherKind='sunny') {
  const [request,setRequest] = useState<{stationId:string;pokemonId:number;nonce:number}|null>(null);
  const [arrivals,setArrivals] = useState<Record<number,string>>({});
  const [timedOut,setTimedOut]=useState(false);
  const nonceRef=useRef(0);
  const previous=useRef<number[]>([]);
  const ids=import.meta.env.VITE_ONLINE ? activeResidentIds(captures.map(c=>c.id),previous.current,[...focus,careId,request?.pokemonId,...group.map(v=>v.pokemonId)]) : captures.map(c=>c.id);
  previous.current=ids;
  const residentKey=ids.join(',');
  const residents=useMemo(()=>ids.map(id=>captures.find(c=>c.id===id)!),[residentKey,captures]);
  const cycle = Math.floor(now.getTime()/120000);
  const roster = residents.map(c=>c.id).join(',');
  const visits = useMemo(() => {
    if (paused) return [];
    const result:Visit[]=group.filter(v=>captures.some(c=>c.id===v.pokemonId));
    const occupied=new Set<string>();
    const stations=STATIONS.map(s=>furnishedStation(s,furniture));
    if(!group.length && request && captures.some(c=>c.id===request.pokemonId)) {
      const s=furnishedStation(stationById(request.stationId),furniture);
      if(compatible(getPokemon(request.pokemonId),s)) {
        result.push({station:s,pokemonId:request.pokemonId,manual:true,key:`manual-${request.nonce}`}); occupied.add(s.id);
      }
    }
    if(careId && !result.some(v=>v.pokemonId===careId)) {
      const p=getPokemon(careId),water=isAquatic(p);
      const base=stationById(water?'shore':'sign');
      result.push({pokemonId:careId,manual:false,key:`care-${careId}`,station:{...base,id:'care-user',name:'等你来陪我',activity:'lonely',target:water?base.target:{x:1.2,z:5.4},action:'等你来陪我'}});
    }
    for(const c of residents) {
      if(result.some(v=>v.pokemonId===c.id)) continue;
      const p=getPokemon(c.id), habit=habitAt(p,now);
      const sameWeather=residents.findIndex(other=>other.id===c.id);
      const weatherPlan=weatherVisit(p,habit,weather,sameWeather);
      if(weatherPlan){result.push(weatherPlan);continue;}
      const resting=habit.activity==='sleep'||habit.activity==='nap'||habit.activity==='buried';
      const eating=habit.activity==='eat';
      // Leave a few residents exploring; sleep and meal schedules take priority.
      if(!resting&&!eating&&(c.id+cycle)%4===0) continue;
      const options=stations.filter(s=>!occupied.has(s.id)&&!group.some(v=>Math.hypot(v.station.target.x-s.target.x,v.station.target.z-s.target.z)<4)&&compatible(p,s)
        && (resting ? s.activity==='sleep'||s.activity==='nap' : eating ? s.activity==='eat' : !s.secondary&&s.activity!=='sleep'));
      options.sort((a,b)=>(affinity(p,b,habit)+furnitureAffinity(c,b.id,furniture)+(c.id*13+cycle*7+STATIONS.findIndex(s=>s.id===b.id)*17)%13)
        -(affinity(p,a,habit)+furnitureAffinity(c,a.id,furniture)+(c.id*13+cycle*7+STATIONS.findIndex(s=>s.id===a.id)*17)%13));
      const station=options[0];
      if(station){result.push({station,pokemonId:p.id,manual:false,key:`auto-${cycle}-${station.id}`});occupied.add(station.id);}
    }
    return result;
    // Time changes within one two-minute activity cycle don't restart a journey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[roster,cycle,weather,request,paused,careId,group.map(v=>v.key).join(','),furniture.join(',')]);
  const arrive=useCallback((id:number,key:string,ready:boolean)=>setArrivals(old=>{
    const value=ready?key:'';
    return old[id]===value?old:{...old,[id]:value};
  }),[]);
  const active = visits.filter(v=>arrivals[v.pokemonId]===v.key);
  const ready=!!request&&arrivals[request.pokemonId]===`manual-${request.nonce}`;
  useEffect(()=>{
    if(!request||ready)return;
    // Bound an unreachable journey; never claim arrival or consume a resource on timeout.
    const timer=setTimeout(()=>{setRequest(old=>old?.nonce===request.nonce?null:old);setTimedOut(true);},90_000);
    return()=>clearTimeout(timer);
  },[request,ready]);
  const invite=(stationId:string,cyclePartner=false,preferredId?:number)=>{
    const station=furnishedStation(stationById(stationId),furniture);
    if(!station)return null;
    const available=captures.map(c=>getPokemon(c.id)).filter(p=>compatible(p,station))
      .sort((a,b)=>affinity(b,station)-affinity(a,station));
    const i=cyclePartner&&request ? available.findIndex(p=>p.id===request.pokemonId)+1:0;
    const p=preferredId===undefined?available[i%available.length]:available.find(p=>p.id===preferredId);
    const nonce=nonceRef.current=Math.max(Date.now(),nonceRef.current+1);
    setTimedOut(false);
    setRequest(p?{stationId,pokemonId:p.id,nonce}:null);
    return p?{pokemon:p,nonce}:null;
  };
  return {residents,visits,active,arrive,invite,request,timedOut,cancel:()=>{setRequest(null);setTimedOut(false);},manual:visits.find(v=>v.manual)};
}
