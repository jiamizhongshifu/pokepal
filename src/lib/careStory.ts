import type {SaveData} from '../types';
import {BERRY_KINDS,type BerryKind,cropStage,plantCrop,waterCrop,harvestCrop,feedBerry} from './farm';
import {comfortCompanion} from './companionCare';
import {rememberTogether} from './islandLiving';
import {completeGuide} from '../data/onboarding';
export const CARE_PHASES=['snack','shared','garden','watered','play','rolled','growing','ending'] as const;
export interface CareStory {
 version:1;id:string;pokemonId:number;phase:typeof CARE_PHASES[number];
 food:BerryKind|'plain';meal:'pending'|'fed'|'skipped';
 plot?:{index:number;plantedAt:number;berry:BerryKind};
 gardenResult?:'planted'|'watered'|'harvested'|'waiting'|'changed'|'full';
 harvest?:'collected'|'changed'|'full';
}
export type CareAction='feed'|'skip-snack'|'next'|'garden'|'roll'|'harvest';
export function gardenPlan(s:SaveData,now=Date.now()){
 const plots=s.farm?.plots??[null,null,null];
 const index=['ripe','thirsty','empty','growing'].map(stage=>plots.findIndex(c=>cropStage(c,now)===stage)).find(i=>i>=0)!;
 const crop=plots[index];return {index,crop,stage:cropStage(crop,now)};
}
export function startCareStory(s:SaveData,id:string,pokemonId?:number){
 if(s.careStory&&s.careStory.phase!=='ending'&&s.captures.some(c=>c.id===s.careStory!.pokemonId))return true;
 const partner=s.captures.find(c=>c.id===pokemonId)??s.captures.find(c=>s.settings.favorites.includes(c.id))??s.captures[0];
 if(!partner)return false;
 if(s.careStory&&s.careStory.phase!=='ending'){s.careStory.pokemonId=partner.id;return true;}
 s.careStory={version:1,id,pokemonId:partner.id,phase:'snack',food:BERRY_KINDS.find(k=>(s.farm?.basket[k]??0)>0)??'plain',meal:'pending'};return true;
}
/** Every effect and its phase advance share one durable store transaction. */
export function actCareStory(s:SaveData,id:string,phase:CareStory['phase'],action:CareAction,now=Date.now(),expectedPlot?:string){
 const r=s.careStory,c=s.captures.find(c=>c.id===r?.pokemonId);
 if(!r||r.id!==id||r.phase!==phase||!c)return false;
 if(action==='feed'&&phase==='snack'){
  if(r.food==='plain'){comfortCompanion(c,'feed');c.friendship=Math.min(100,c.friendship+4);}
  else if(!feedBerry(s,c.id,r.food))return false;
  completeGuide(s,'feed');r.meal='fed';r.phase='shared';return true;
 }
 if(action==='skip-snack'&&phase==='snack'){r.meal='skipped';r.phase='shared';return true;}
 if(action==='next'){
  if(phase==='shared'){r.phase='garden';return true;}
  if(phase==='watered'){r.phase='play';return true;}
  if(phase==='rolled'){r.phase=r.plot&&!r.harvest?'growing':'ending';return true;}
 }
 if(action==='garden'&&phase==='garden'){
  const p=gardenPlan(s,now);
  // A different crop must never be harvested by an outdated button.
  if(expectedPlot!==gardenPlanKey(s,now))return false;
  if(p.stage==='empty'){
   if(!plantCrop(s,p.index,'oran',now)||!waterCrop(s,p.index,now,c.id,now))return false;
   r.plot={index:p.index,plantedAt:now,berry:'oran'};r.gardenResult='planted';
  }else if(p.crop){
   r.plot={index:p.index,plantedAt:p.crop.plantedAt,berry:p.crop.berry};
   if(p.stage==='ripe'){
    const ok=harvestCrop(s,p.index,now);r.gardenResult=ok?'harvested':'full';r.harvest=ok?'collected':'full';
   }else if(p.stage==='thirsty'){
    if(!waterCrop(s,p.index,p.crop.plantedAt,c.id,now))return false;r.gardenResult='watered';
   }else r.gardenResult='waiting';
  }
  r.phase='watered';return true;
 }
 if(action==='roll'&&phase==='play'){
  rememberTogether(s,{id:`care:${r.id}`,kind:'ball',partners:[c.id],at:now,context:'play'});
  r.phase='rolled';return true;
 }
 if(action==='harvest'&&phase==='growing'&&r.plot){
  const plot=s.farm?.plots[r.plot.index];
  if(!plot||plot.plantedAt!==r.plot.plantedAt||plot.berry!==r.plot.berry){r.harvest='changed';r.phase='ending';return true;}
  if(cropStage(plot,now)!=='ripe')return false;
  r.harvest=harvestCrop(s,r.plot.index,now)?'collected':'full';r.phase='ending';return true;
 }
 return false;
}
export function gardenPlanKey(s:SaveData,now=Date.now()){
 const p=gardenPlan(s,now);return `${p.index}:${p.crop?.plantedAt??0}:${p.stage}`;
}
export function validCareStory(v:unknown):v is CareStory {
 if(!v||typeof v!=='object')return false;
 const r=v as CareStory;
 return r.version===1&&typeof r.id==='string'&&r.id.length>0&&r.id.length<=60&&Number.isSafeInteger(r.pokemonId)&&CARE_PHASES.includes(r.phase)
  &&(r.phase!=='growing'||r.plot!==undefined)&&[...BERRY_KINDS,'plain'].includes(r.food)&&['pending','fed','skipped'].includes(r.meal)
  &&(r.gardenResult===undefined||['planted','watered','harvested','waiting','changed','full'].includes(r.gardenResult))
  &&(r.harvest===undefined||['collected','changed','full'].includes(r.harvest))
  &&(r.plot===undefined||!!r.plot&&Number.isInteger(r.plot.index)&&r.plot.index>=0&&r.plot.index<3&&Number.isSafeInteger(r.plot.plantedAt)&&r.plot.plantedAt>0&&BERRY_KINDS.includes(r.plot.berry));
}
