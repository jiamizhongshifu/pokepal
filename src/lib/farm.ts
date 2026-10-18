import {completeGuide} from '../data/onboarding';
import type { SaveData } from '../types';
import { comfortCompanion } from './companionCare';

export const BERRIES = {
  oran: { name: '橙橙果', color: '#5d9fdf', leaf: '#80b78b' },
  pecha: { name: '桃桃果', color: '#ee9fa7', leaf: '#85b88b' },
  cheri: { name: '樱子果', color: '#da6c65', leaf: '#75ad82' }
} as const;
export type BerryKind = keyof typeof BERRIES;
export const BERRY_KINDS = Object.keys(BERRIES) as BerryKind[];
export const GROW_MS = 45000;
export const HARVEST_COUNT = 2;
export const FRIENDSHIP_GAIN = 8;
export const BASKET_CAP = 999;
export interface Crop { berry: BerryKind; plantedAt: number; wateredAt?: number }
export interface FarmState { version: 1; plots: (Crop|null)[]; basket: Record<BerryKind,number> }
export const newFarm = ():FarmState => ({version:1,plots:[null,null,null],basket:{oran:0,pecha:0,cheri:0}});
const isBerry = (v:unknown):v is BerryKind => typeof v==='string'&&Object.prototype.hasOwnProperty.call(BERRIES,v);
const timestamp = (v:unknown):v is number => typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
export function validFarm(v:unknown):v is FarmState {
  if(!v||typeof v!=='object')return false;
  const f=v as FarmState;
  return f.version===1&&Array.isArray(f.plots)&&f.plots.length===3&&f.plots.every(p=>p===null||!!p&&isBerry(p.berry)&&timestamp(p.plantedAt)&&(p.wateredAt===undefined||timestamp(p.wateredAt)&&p.wateredAt>=p.plantedAt))
    &&!!f.basket&&BERRY_KINDS.every(k=>Number.isInteger(f.basket[k])&&f.basket[k]>=0&&f.basket[k]<=BASKET_CAP);
}
export function cropStage(crop:Crop|null,now=Date.now()):'empty'|'thirsty'|'growing'|'ripe' {
  if(!crop)return 'empty';
  if(crop.wateredAt===undefined)return 'thirsty';
  return now-crop.wateredAt>=GROW_MS?'ripe':'growing';
}
export const growth = (crop:Crop|null,now=Date.now()) => crop?.wateredAt===undefined?0:Math.max(0,Math.min(1,(now-crop.wateredAt)/GROW_MS));
const plotIndex=(i:number)=>Number.isInteger(i)&&i>=0&&i<3;
/** Store calls these inside one mutation, so replayed taps cannot duplicate rewards. */
export function plantCrop(s:SaveData,index:number,berry:BerryKind,now=Date.now()) {
  if(!plotIndex(index)||!isBerry(berry)||!timestamp(now)||s.farm?.plots[index])return false;
  s.farm??=newFarm();s.farm.plots[index]={berry,plantedAt:now};return true;
}
export function waterCrop(s:SaveData,index:number,plantedAt:number,pokemonId:number,now=Date.now()) {
  if(!plotIndex(index)||!s.captures.some(c=>c.id===pokemonId)||!timestamp(now))return false;
  const c=s.farm?.plots[index];
  if(!c||c.plantedAt!==plantedAt||c.wateredAt!==undefined)return false;
  c.wateredAt=Math.max(c.plantedAt,now);return true;
}
export function harvestCrop(s:SaveData,index:number,now=Date.now()) {
  if(!plotIndex(index)||!timestamp(now))return false;
  const f=s.farm,c=f?.plots[index];
  if(!f||!c||cropStage(c,now)!=='ripe'||f.basket[c.berry]+HARVEST_COUNT>BASKET_CAP)return false;
  f.basket[c.berry]+=HARVEST_COUNT;f.plots[index]=null;completeGuide(s,'farm');return true;
}
export function feedBerry(s:SaveData,id:number,berry:BerryKind) {
  if(!isBerry(berry))return false;
  const c=s.captures.find(c=>c.id===id),f=s.farm;
  if(!c||!f||f.basket[berry]<1)return false;
  f.basket[berry]--;comfortCompanion(c,'feed');
  c.friendship=Math.min(100,c.friendship+FRIENDSHIP_GAIN);return true;
}


/** Gentle rain waters only existing thirsty plots; never creates crops, rewards or extra harvests. */
export function waterCropsWithRain(s:SaveData,now=Date.now()):number{
 if(!timestamp(now))return 0;
 let changed=0;
 for(const crop of s.farm?.plots??[]){if(crop&&crop.wateredAt===undefined&&now-crop.plantedAt>=12_000){crop.wateredAt=Math.max(now,crop.plantedAt);changed++;}}
 return changed;
}
