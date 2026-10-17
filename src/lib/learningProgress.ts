import { learningProfile } from './learningStage';
import type { SaveData } from '../types';
import { PIC_WORDS, PHRASES } from '../data/words';
import { learningEntry, LEARNING_UNITS, unitById, unitUnlocked, unitRoundCount } from '../data/curriculum';

export interface LearningRecord {
 pendingAudio?:boolean;evidenceVersion?:2;legacyIndependent?:number;supported?:number;actions?:number;
 seen:number;spoken:number;attempts:number;misses:number;independent:number;streak:number;
 lastSeen:number;nextReview:number;lastSuccessDay?:string;needsPractice:boolean;saved:boolean;contexts:string[];
}
export interface UnitProgress {round:number;pendingAudio?:number[];completedAt?:number;appliedAt?:number;encounteredAt?:number;storyAt?:number}
export interface LearningProgress {version:1;activeUnit?:string;records:Record<string,LearningRecord>;units:Record<string,UnitProgress>}
export function ensureLearning(s:SaveData):LearningProgress {
 if(!s.learning||s.learning.version!==1)s.learning={version:1,records:{},units:{}};
 s.learning.records??={};s.learning.units??={};return s.learning;
}
function record(s:SaveData,key:string,now:number){
 const data=ensureLearning(s);
 return data.records[key]??={evidenceVersion:2,supported:0,actions:0,seen:0,spoken:0,attempts:0,misses:0,independent:0,streak:0,lastSeen:now,nextReview:now+86400000,needsPractice:false,saved:false,contexts:[]};
}
export function encounter(s:SaveData,key:string,source:string,now=Date.now(),spoken=false){
 const entry=learningEntry(key);if(!entry)return;key=entry.key;
 const r=record(s,key,now);r.seen++;r.lastSeen=now;if(spoken)r.spoken++;
 r.contexts=[...new Set([...r.contexts,source])].slice(-12);
}
/** Saving a word expresses interest, not exposure or independent recall. */
export function toggleSavedLearning(s:SaveData,key:string,now=Date.now()){
 const entry=learningEntry(key);if(!entry)return;
 const r=record(s,entry.key,now);r.saved=!r.saved;
}
/** Correcting after a hint is practice, never independent recall. Same-day repeats do not inflate spacing. */
export function attempt(s:SaveData,key:string,correct:boolean,assisted:boolean,source:string,now=Date.now()){
 const entry=learningEntry(key);if(!entry)return;key=entry.key;
 encounter(s,key,source,now);const r=record(s,key,now);r.attempts++;
 if(!correct){r.misses++;r.needsPractice=true;r.streak=0;r.nextReview=now;r.lastSuccessDay=undefined;return;}
 if(assisted||entry.contextOnly){r.supported=(r.supported??0)+1;r.nextReview=Math.max(r.nextReview,now+86400000);return;}
 const day=new Date(now).toLocaleDateString('en-CA');
 r.independent++;
 if(r.lastSuccessDay!==day){r.streak++;r.lastSuccessDay=day;r.nextReview=now+[1,3,7,14][Math.min(r.streak-1,3)]*86400000;}
 if(r.streak>=2)r.needsPractice=false;
}
export function migrateLearning(s:SaveData){
 const fresh=!s.learning;const data=ensureLearning(s);
 if(fresh)for(const [key,stat] of Object.entries(s.wordStats??{}))if(learningEntry(key)){
  const r=record(s,key,Date.now());r.seen=stat.heard+stat.correct;r.spoken=stat.spoken;r.contexts=['earlier'];
 }
 for(const [key,r] of Object.entries(data.records)){
  const canonical=learningEntry(key)?.key;if(!canonical)continue;
  if(r.evidenceVersion!==2){r.legacyIndependent=(r.legacyIndependent??0)+r.independent;r.independent=0;r.streak=0;delete r.lastSuccessDay;r.evidenceVersion=2;}
  r.supported??=0;r.actions??=0;
  // Earlier bookmark creation called encounter once; remove only that identifiable synthetic exposure.
  if(r.contexts.includes('saved')){r.seen=Math.max(0,r.seen-1);r.contexts=r.contexts.filter(c=>c!=='saved');}
  if(canonical!==key){
   const existing=data.records[canonical];
   if(existing){for(const field of ['seen','spoken','attempts','misses','independent'] as const)existing[field]+=r[field];existing.supported=(existing.supported??0)+(r.supported??0);existing.actions=(existing.actions??0)+(r.actions??0);existing.lastSeen=Math.max(existing.lastSeen,r.lastSeen);existing.saved ||= r.saved;existing.needsPractice ||= r.needsPractice;existing.nextReview=Math.min(existing.nextReview,r.nextReview);existing.contexts=[...new Set([...existing.contexts,...r.contexts])].slice(-12);existing.legacyIndependent=(existing.legacyIndependent??0)+(r.legacyIndependent??0);}
   else data.records[canonical]=r;
   delete data.records[key];
  }
 }
 for(const p of Object.values(data.units))if(p.appliedAt){p.encounteredAt??=p.appliedAt;delete p.appliedAt;}
 // Historical correct counts do not identify hints or spaced retrieval; no mastery is inferred.
 for(const id of Object.keys(data.units))if(!unitById(id))delete data.units[id];
 if(!unitById(data.activeUnit))delete data.activeUnit;
}
export function reviewKeys(s:SaveData,mode:'due'|'retry'='due',now=Date.now()){
 return Object.entries(s.learning?.records??{}).filter(([key,r])=>{const e=learningEntry(key);return e && (r.seen>0||r.pendingAudio) && !e.contextOnly && (r.pendingAudio||(mode==='retry'?r.needsPractice:r.nextReview<=now));})
 .sort(([,a],[,b])=>Number(b.needsPractice)-Number(a.needsPractice)||a.nextReview-b.nextReview).map(([key])=>key);
}
/** Automatic invitations respect readiness. Names stay available in the notebook. */
export function recommendedReviewKeys(s:SaveData,now=Date.now()):string[]{
 const level=learningProfile(s.settings??{level:1}).vocabulary;
 return reviewKeys(s,'due',now).filter(key=>{
  const e=learningEntry(key);if(!e||e.kind==='name')return false;
  if(e.kind==='concept')return !key.startsWith('count:')||Number(key.slice(6))<=(level===1?3:5);
  const item=PIC_WORDS.find(w=>w.en===e.key)??PHRASES.find(p=>p.en===e.key);
  return !!item&&item.level<=level;
 });
}
/** A deliberate listen-only review rests until tomorrow without inventing a correct answer. */
export function restAfterListening(s:SaveData,key:string,now=Date.now()){
 const canonical=learningEntry(key)?.key,r=canonical?s.learning?.records[canonical]:undefined;
 if(r)r.nextReview=Math.max(r.nextReview,now+86400000);
}
export const reviewGroupSize=(s:SaveData)=>learningProfile(s.settings).review;

export function progressUnit(s:SaveData,id:string,round:number,now=Date.now()){
 const unit=unitById(id);if(!unit||!unitUnlocked(s,id))return;
 const d=ensureLearning(s),p=d.units[id]??={round:0};d.activeUnit=id;
 p.round=Math.max(p.round,Math.min(unitRoundCount(unit),Math.max(0,round)));
 if(p.round===unitRoundCount(unit))p.completedAt??=now;
}
/** A visit is exposure. Only the actual named expression is recorded; no inferred speech. */
export function applyStation(s:SaveData,station:string,now=Date.now(),key?:string,action=false){
 const data=ensureLearning(s),u=unitById(data.activeUnit);
 if(u&&u.station===station&&data.units[u.id]?.completedAt)data.units[u.id].encounteredAt??=now;
 if(!key)return;
 const entry=learningEntry(key);if(!entry)return;
 encounter(s,entry.key,'island',now);
 if(action){const r=record(s,entry.key,now);r.actions=(r.actions??0)+1;}
}

export function noteLearningStory(s:SaveData,story:string,now=Date.now()){
 const d=ensureLearning(s);for(const u of LEARNING_UNITS)if(u.story===story&&d.units[u.id]?.completedAt)d.units[u.id].storyAt??=now;
}

/** A skipped round is a bookmark, never evidence. Resume at the first missing round. */
export function settleUnitRound(s:SaveData,id:string,round:number,skipped=false){
 const unit=unitById(id);if(!unit||!unitUnlocked(s,id)||round<1||round>unitRoundCount(unit))return false;
 const data=ensureLearning(s),p=data.units[id]??={round:0};
 const pending=new Set(p.pendingAudio??[]);if(skipped)pending.add(round-1);else pending.delete(round-1);
 p.pendingAudio=[...pending].sort((a,b)=>a-b);
 if(p.pendingAudio.length){p.round=Math.min(p.round,p.pendingAudio[0]);return false;}
 progressUnit(s,id,round);return round===unitRoundCount(unit);
}

/** Audio unavailability is a bookmark, never a mistake or a completed review. */
export function markReviewAudio(s:SaveData,key:string,pending:boolean){
 const entry=learningEntry(key);if(!entry)return;
 const r=record(s,entry.key,Date.now());r.pendingAudio=pending;
}
