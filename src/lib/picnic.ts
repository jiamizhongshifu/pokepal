import type { SaveData } from '../types';
import { BERRY_KINDS, feedBerry, type BerryKind } from './farm';

export interface PicnicSession { id:string; pokemonId:number; berry:BerryKind; createdAt:number; servedAt?:number }
export interface PicnicMemory { id:string; pokemonId:number; berry:BerryKind; at:number }
export interface PicnicState { version:1; session?:PicnicSession; memories:PicnicMemory[] }
export function validPicnic(value:unknown,owned:number[]):value is PicnicState {
 if(!value||typeof value!=='object')return false;
 const p=value as PicnicState;
 const base=(v:PicnicMemory|PicnicSession)=>!!v&&typeof v.id==='string'&&v.id.length>0&&v.id.length<=80&&Number.isSafeInteger(v.pokemonId)&&BERRY_KINDS.includes(v.berry);
 const time=(n:number)=>Number.isSafeInteger(n)&&n>0;
 return p.version===1&&Array.isArray(p.memories)&&p.memories.length<=12&&p.memories.every(m=>base(m)&&time(m.at))
  &&new Set(p.memories.map(m=>m.id)).size===p.memories.length
  &&(!p.session||base(p.session)&&owned.includes(p.session.pokemonId)&&time(p.session.createdAt)&&(p.session.servedAt===undefined||time(p.session.servedAt)&&p.memories.some(m=>m.id===p.session!.id)));
}
export function beginPicnic(s:SaveData,pokemonId:number,berry:BerryKind,id:string,now=Date.now()) {
 if(!s.captures.some(c=>c.id===pokemonId)||!BERRY_KINDS.includes(berry)||!s.farm?.basket[berry]||!id||s.picnic?.session||s.picnic?.memories.some(m=>m.id===id))return false;
 s.picnic??={version:1,memories:[]};s.picnic.session={id,pokemonId,berry,createdAt:now};return true;
}
/** Consume and remember in ONE save mutation. A repeated tap / resumed page cannot serve twice. */
export function servePicnic(s:SaveData,id:string,now=Date.now()) {
 const p=s.picnic,session=p?.session;
 if(!p||!session||session.id!==id||session.servedAt!==undefined||p.memories.some(m=>m.id===id))return false;
 if(!feedBerry(s,session.pokemonId,session.berry))return false;
 session.servedAt=now;
 p.memories=[{id,pokemonId:session.pokemonId,berry:session.berry,at:now},...p.memories].slice(0,12);
 return true;
}
export function endPicnic(s:SaveData,id:string) {
 if(s.picnic?.session?.id!==id)return false;
 delete s.picnic.session;return true;
}
