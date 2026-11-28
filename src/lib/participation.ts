import { TASK_KINDS } from '../data/tasks';
import type { SaveData } from '../types';
import { todayStr } from './date';
import { unitById, unitUnlocked, unitRoundCount } from '../data/curriculum';

export const PARTICIPATION_KINDS=[...TASK_KINDS,'course','review','story','island'] as const;
export type ParticipationKind=typeof PARTICIPATION_KINDS[number];
/** A day counts when three kinds of activity were done; every seventh such day brings one more invite berry. */
export const DAILY_GOAL=3, DAYS_FOR_GIFT=7;
export interface Participation {version:1;days:number;lastDate:string;gifts:number}
/** `fresh`: the first time today for this kind (or this lesson); `dayCounted`: today just reached three kinds. */
export interface Reward {fresh:boolean;dayCounted:boolean;ballGranted:boolean;repeated:boolean}
export function migrateParticipation(s:SaveData){
 if(!s.participation)s.participation={version:1,days:s.streak.count,lastDate:s.streak.lastDate,gifts:Math.floor(s.streak.count/DAYS_FOR_GIFT)};
 for(const kind of TASK_KINDS)if(!s.daily.board.includes(kind)){s.daily.board.push(kind);s.daily.boardDone.push(false);}
 if(!s.daily.participated)s.daily.participated=s.daily.board.filter((_,i)=>s.daily.boardDone[i]);
 // A legacy completed board already granted its daily bonus and day credit.
 if(s.daily.goalDone===undefined)s.daily.goalDone=s.daily.bonusGiven;
 s.daily.courseUnits??=courseClaims(s);
}
export function participationCount(s:SaveData){return new Set(s.daily.participated??s.daily.board.filter((_,i)=>s.daily.boardDone[i])).size;}
/** Legacy saves did not store the rewarded theme. Preserve today's identifiable claims. */
export function courseClaims(s:SaveData):string[]{
 if(s.daily.courseUnits)return s.daily.courseUnits;
 if(!s.daily.participated?.includes('course'))return [];
 const completed=Object.entries(s.learning?.units??{}).filter(([,p])=>p.completedAt&&todayStr(new Date(p.completedAt))===s.daily.date).map(([id])=>id);
 const active=s.learning?.activeUnit;
 return completed.length?completed:active&&s.learning?.units[active]?.completedAt?[active]:[];
}
export function courseRewardAvailable(s:SaveData,id:string){
 return s.daily.date!==todayStr()||!courseClaims(s).includes(id);
}
export function rewardCourse(s:SaveData,id:string):Reward|undefined {
 const unit=unitById(id);
 if(!unit||!unitUnlocked(s,id)||s.learning?.units[id]?.round!==unitRoundCount(unit))return;
 return rewardParticipation(s,'course',id);
}
export function rewardParticipation(s:SaveData,kind:ParticipationKind,courseId?:string):Reward {
 migrateParticipation(s);
 const d=s.daily;
 if(kind==='course'&&courseId)d.courseUnits??=courseClaims(s);
 const repeated=kind==='course'&&courseId?d.courseUnits!.includes(courseId):d.participated!.includes(kind);
 const result:Reward={fresh:!repeated,dayCounted:false,ballGranted:false,repeated};
 if(repeated)return result;
 if(kind==='course'&&courseId)d.courseUnits!.push(courseId);
 if(!d.participated!.includes(kind))d.participated!.push(kind);
 if(!d.goalDone&&participationCount(s)>=DAILY_GOAL){
  d.goalDone=true;result.dayCounted=true;
  const p=s.participation!;
  if(p.lastDate!==d.date){p.days++;p.lastDate=d.date;}
  if(Math.floor(p.days/DAYS_FOR_GIFT)>p.gifts){p.gifts++;s.balls.poke++;result.ballGranted=true;}
 }
 return result;
}
