import type { SaveData } from '../types';

/** What grows on the farm: fruit words from the learning path. A kind can be planted once its lesson is learned. */
export const CROPS = {
  apple: { name: '苹果', en: 'apple', color: '#e5675d' },
  banana: { name: '香蕉', en: 'banana', color: '#f2c94c' },
  strawberry: { name: '草莓', en: 'strawberry', color: '#da6c65' },
  grapes: { name: '葡萄', en: 'grapes', color: '#8e6ad8' },
  watermelon: { name: '西瓜', en: 'watermelon', color: '#5fb36b' }
} as const;
export type CropKind = keyof typeof CROPS;
export const CROP_KINDS = Object.keys(CROPS) as CropKind[];
/** Saves from before learned-word crops: each old berry becomes the fruit closest to it. */
export const LEGACY_CROP: Record<string, CropKind> = { oran: 'grapes', pecha: 'apple', cheri: 'strawberry' };
const legacy = (v: unknown) => typeof v === 'string' && LEGACY_CROP[v] ? LEGACY_CROP[v] : v;
/** Runs on the raw save before validation; counts of the same fruit are added together. */
export function migrateCrops(save: unknown) {
  const s = save as { farm?: { plots?: unknown[]; basket?: Record<string, number> }; careStory?: { plot?: { berry?: unknown } } };
  if (!s || typeof s !== 'object') return;
  const basket = s.farm?.basket;
  if (basket && typeof basket === 'object') {
    const next: Record<string, number> = Object.fromEntries(CROP_KINDS.map(k => [k, 0]));
    for (const [k, n] of Object.entries(basket)) { const kind = legacy(k) as string; next[kind] = Math.min(BASKET_CAP, (next[kind] ?? 0) + (Number.isInteger(n) ? n : 0)); }
    s.farm!.basket = next;
  }
  for (const p of s.farm?.plots ?? []) if (p && typeof p === 'object') (p as { berry?: unknown }).berry = legacy((p as { berry?: unknown }).berry);
  if (s.careStory?.plot) s.careStory.plot.berry = legacy(s.careStory.plot.berry);
  const story = s.careStory as { food?: unknown } | undefined;
  if (story) story.food = legacy(story.food);
}
export const GROW_MS = 45000;
export const HARVEST_COUNT = 2;
export const FRIENDSHIP_GAIN = 8;
export const BASKET_CAP = 999;
export interface Crop { berry: CropKind; plantedAt: number; wateredAt?: number }
export interface FarmState { version: 1; plots: (Crop|null)[]; basket: Record<CropKind,number> }
export const newFarm = ():FarmState => ({version:1,plots:[null,null,null],basket:{apple:0,banana:0,strawberry:0,grapes:0,watermelon:0}});
const isBerry = (v:unknown):v is CropKind => typeof v==='string'&&Object.prototype.hasOwnProperty.call(CROPS,v);
const timestamp = (v:unknown):v is number => typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
export function validFarm(v:unknown):v is FarmState {
  if(!v||typeof v!=='object')return false;
  const f=v as FarmState;
  return f.version===1&&Array.isArray(f.plots)&&f.plots.length===3&&f.plots.every(p=>p===null||!!p&&isBerry(p.berry)&&timestamp(p.plantedAt)&&(p.wateredAt===undefined||timestamp(p.wateredAt)&&p.wateredAt>=p.plantedAt))
    &&!!f.basket&&CROP_KINDS.every(k=>Number.isInteger(f.basket[k])&&f.basket[k]>=0&&f.basket[k]<=BASKET_CAP);
}
export function cropStage(crop:Crop|null,now=Date.now()):'empty'|'thirsty'|'growing'|'ripe' {
  if(!crop)return 'empty';
  if(crop.wateredAt===undefined)return 'thirsty';
  return now-crop.wateredAt>=GROW_MS?'ripe':'growing';
}
export const growth = (crop:Crop|null,now=Date.now()) => crop?.wateredAt===undefined?0:Math.max(0,Math.min(1,(now-crop.wateredAt)/GROW_MS));
const plotIndex=(i:number)=>Number.isInteger(i)&&i>=0&&i<3;
/** Store calls these inside one mutation, so replayed taps cannot duplicate rewards. */
export function plantCrop(s:SaveData,index:number,berry:CropKind,now=Date.now()) {
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
  f.basket[c.berry]+=HARVEST_COUNT;f.plots[index]=null;return true;
}
export function feedCrop(s:SaveData,id:number,berry:CropKind) {
  if(!isBerry(berry))return false;
  const c=s.captures.find(c=>c.id===id),f=s.farm;
  if(!c||!f||f.basket[berry]<1)return false;
  f.basket[berry]--;
  c.friendship=Math.min(100,c.friendship+FRIENDSHIP_GAIN);return true;
}


/** Gentle rain waters only existing thirsty plots; never creates crops, rewards or extra harvests. */
export function waterCropsWithRain(s:SaveData,now=Date.now()):number{
 if(!timestamp(now))return 0;
 let changed=0;
 for(const crop of s.farm?.plots??[]){if(crop&&crop.wateredAt===undefined&&now-crop.plantedAt>=12_000){crop.wateredAt=Math.max(now,crop.plantedAt);changed++;}}
 return changed;
}
