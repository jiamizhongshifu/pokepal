import { useEffect, useSyncExternalStore } from 'react';
import { ANNOUNCEMENTS } from '../data/announcements';
export type NoticeFeed={build:string;notes:typeof ANNOUNCEMENTS};
const loaded=import.meta.env.VITE_APP_BUILD_ID as string;
const key='pokepal-notices-read-v1';
let read='';try{read=localStorage.getItem(key)??'';}catch{/* Session-only read state if storage is unavailable. */}
let current={feed:{build:loaded,notes:ANNOUNCEMENTS},read,error:false};
const listeners=new Set<()=>void>();
const publish=()=>listeners.forEach(f=>f());
export const noticeKey=(feed:NoticeFeed)=>`${feed.build}:${feed.notes[0]?.id??''}`;
export function validNoticeFeed(value:unknown):value is NoticeFeed{
 const f=value as NoticeFeed;
 return !!f&&typeof f.build==='string'&&Number.isFinite(Date.parse(f.build))&&Array.isArray(f.notes)&&f.notes.length>0&&f.notes.length<=20&&f.notes.every(n=>n&&typeof n.id==='string'&&n.id.length<100&&typeof n.date==='string'&&typeof n.title==='string'&&n.title.length<100&&Array.isArray(n.items)&&n.items.length<=8&&n.items.every(i=>i&&typeof i.icon==='string'&&typeof i.title==='string'&&i.title.length<100&&typeof i.text==='string'&&i.text.length<500));
}
let flight:Promise<void>|undefined,last=0;
export function checkNotices(force=false){
 if(flight)return flight;
 if(!force&&Date.now()-last<60_000)return Promise.resolve();
 last=Date.now();
 flight=(async()=>{try{
  const response=await fetch('/announcements.json',{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('unavailable');
  const feed=await response.json();if(!validNoticeFeed(feed))throw new Error('invalid');
  // A stale edge response must not replace a newer locally installed announcement.
  if(Date.parse(feed.build)>=Date.parse(current.feed.build))current={...current,feed,error:false};
  else current={...current,error:false};
 }catch{current={...current,error:true};}finally{flight=undefined;publish();}})();return flight;
}
export function markNoticesRead(){const read=noticeKey(current.feed);current={...current,read};try{localStorage.setItem(key,read);}catch{}publish();}
export function useNotices(active=true){
 const state=useSyncExternalStore(cb=>{listeners.add(cb);return()=>listeners.delete(cb);},()=>current);
 useEffect(()=>{if(!active)return;const check=()=>{if(!document.hidden)void checkNotices();};check();const timer=setInterval(check,300_000);window.addEventListener('focus',check);window.addEventListener('online',check);const sync=(e:StorageEvent)=>{if(e.key===key){current={...current,read:e.newValue??''};publish();}};window.addEventListener('storage',sync);return()=>{clearInterval(timer);window.removeEventListener('focus',check);window.removeEventListener('online',check);window.removeEventListener('storage',sync);};},[active]);
 return {...state,unread:noticeKey(state.feed)!==state.read,updateAvailable:Date.parse(state.feed.build)>Date.parse(loaded)};
}
