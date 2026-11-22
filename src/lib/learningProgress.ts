import { learningProfile } from './learningStage';
import type { SaveData } from '../types';
import { PIC_WORDS, PHRASES } from '../data/words';
import { learningEntry, LEARNING_UNITS, unitById, unitUnlocked, unitRoundCount } from '../data/curriculum';
import { placeById } from '../island/world';

export interface LearningRecord {
 pendingAudio?:boolean;evidenceVersion?:2;legacyIndependent?:number;supported?:number;actions?:number;
 seen:number;spoken:number;attempts:number;misses:number;independent:number;streak:number;
 lastSeen:number;nextReview:number;lastSuccessDay?:string;needsPractice:boolean;saved:boolean;contexts:string[];
}
export interface UnitProgress {round:number;pendingAudio?:number[];completedAt?:number;appliedAt?:number;encounteredAt?:number;storyAt?:number;homeTriedAt?:number}
/**
 * One answer opportunity, kept on this device only. "Independent" means no visible help inside the app; it cannot
 * tell whether an adult helped off screen. Older saves have no opportunities, and their history stays unknown.
 */
export type ResponseKind='independent'|'after-replay'|'after-hint'|'after-model'|'skipped'|'unknown'|'left';
/** `gapDays`: local calendar days since the item was last met (0 = same day, so not delayed); `cv`: content version. */
export interface Opportunity {v:1;at:number;source:string;key:string;kind:ResponseKind;tries:number;replays:number;gapDays?:number;cv?:number}
/** Bump when lesson or review scenes change, so evidence from different material is never pooled silently. */
export const LEARNING_CONTENT_VERSION=1;
/** Whole local days between two times. A clock set backwards reads as the same day rather than a negative gap. */
export function localDayGap(last:number|undefined,now:number):number|undefined{
 if(last===undefined||!Number.isFinite(last))return undefined;
 const day=(t:number)=>{const d=new Date(t);return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());};
 return Math.max(0,Math.round((day(now)-day(last))/86400000));
}
export const OPPORTUNITY_LIMIT=400;
export const RESPONSE_KINDS:ResponseKind[]=['independent','after-replay','after-hint','after-model','skipped','unknown','left'];
export interface LearningProgress {version:1;activeUnit?:string;records:Record<string,LearningRecord>;units:Record<string,UnitProgress>;opportunities?:Opportunity[]}

/** What happened before the round was finished, in the order a child can experience it. */
export interface RoundTrace {firstAnswer:'correct'|'wrong'|null;replays:number;modelShown:boolean;heardBeforeAnswer:boolean;outcome:'solved'|'skipped'|'left'}
/** Strongest help wins: a shown answer, then a wrong first try, then unconfirmed audio, then replays. */
export function classifyResponse(t:RoundTrace):ResponseKind{
 if(t.outcome==='skipped')return 'skipped';
 if(t.outcome==='left')return 'left';
 if(t.modelShown)return 'after-model';
 if(t.firstAnswer==='wrong')return 'after-hint';
 if(!t.heardBeforeAnswer)return 'unknown';
 return t.replays>0?'after-replay':'independent';
}
export function recordOpportunity(s:SaveData,o:Omit<Opportunity,'v'>){
 const data=ensureLearning(s);
 data.opportunities=[...(data.opportunities??[]),{v:1 as const,...o}].slice(-OPPORTUNITY_LIMIT);
}
/**
 * A parent's view of recent answers. "Decidable" first answers exclude unconfirmed audio and leaving; the independent
 * share is offered only with enough opportunities, and never as mastery.
 */
export const EVIDENCE_MIN_SAMPLE=5;
export function summarizeOpportunities(list:Opportunity[]|undefined,since:number){
 const recent=(list??[]).filter(o=>o.at>=since);
 const count=Object.fromEntries(RESPONSE_KINDS.map(k=>[k,0])) as Record<ResponseKind,number>;
 for(const o of recent)count[o.kind]++;
 const decidable=recent.length-count.unknown-count.left;
 return {total:recent.length,count,decidable,independent:count.independent,enough:decidable>=EVIDENCE_MIN_SAMPLE};
}
/** A parent's own note that the take-home phrase was tried in real life; kept apart from in-app answers. */
export function markHomeTried(s:SaveData,id:string,tried:boolean,now=Date.now()){
 const p=ensureLearning(s).units[id];if(!p)return;
 if(tried)p.homeTriedAt??=now;else delete p.homeTriedAt;
}
/** Delayed review only: answers met again on a later local day. Same-day repeats never count as remembering. */
export function summarizeDelayed(list:Opportunity[]|undefined,since:number){
 return summarizeOpportunities((list??[]).filter(o=>o.source==='review'&&(o.gapDays??0)>=1),since);
}
export function validOpportunity(o:unknown):boolean{
 const r=o as Record<string,unknown>;
 return !!r&&typeof r==='object'&&r.v===1&&Number.isFinite(r.at)&&typeof r.source==='string'&&(r.source as string).length<=40&&typeof r.key==='string'&&(r.key as string).length<=80
  &&RESPONSE_KINDS.includes(r.kind as ResponseKind)&&Number.isInteger(r.tries)&&(r.tries as number)>=0&&Number.isInteger(r.replays)&&(r.replays as number)>=0
  &&(r.gapDays===undefined||Number.isInteger(r.gapDays)&&(r.gapDays as number)>=0&&(r.gapDays as number)<=36500)&&(r.cv===undefined||Number.isInteger(r.cv)&&(r.cv as number)>=1);
}
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
/** A lesson happens at one island place; its station may name the place, a numbered spot there or a plot. */
export const atStation=(unit:{station:string},stationId:string)=>{const a=placeById(unit.station),b=placeById(stationId);return !!a&&a.id===b?.id;};
/**
 * Hearing something at a place is exposure: only the named expression is recorded, no inferred speech. It does not
 * complete a lesson's island stop; that takes the lesson's errand (`finishErrand`).
 */
export function applyStation(s:SaveData,_station:string,now=Date.now(),key?:string,action=false){
 ensureLearning(s);
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
