import type { SaveData } from '../types';
import { todayStr } from './date';
import { unitById, unitUnlocked, unitRoundCount } from '../data/curriculum';

export const PARTICIPATION_KINDS=['listen','wordpic','repeat','trace','course','review','story','island'] as const;
export type ParticipationKind=typeof PARTICIPATION_KINDS[number];
export const PARTICIPATION_LABELS:Record<ParticipationKind,string>={listen:'听一听',wordpic:'认一认',repeat:'说一说',trace:'写一写',course:'英语冒险',review:'再遇见',story:'一起读故事',island:'小岛交流'};
export const DAILY_CAP=15, PARTICIPATION_ENERGY=2, DAILY_GOAL=3, DAYS_FOR_GIFT=7;
export interface Participation {version:1;days:number;lastDate:string;gifts:number}
export interface Reward {gained:number;bonus:number;boardComplete:boolean;ballGranted:boolean;capped:boolean;repeated:boolean}
export function migrateParticipation(s:SaveData){
 if(!s.participation)s.participation={version:1,days:s.streak.count,lastDate:s.streak.lastDate,gifts:Math.floor(s.streak.count/DAYS_FOR_GIFT)};
 for(const kind of ['listen','wordpic','repeat','trace'] as const)if(!s.daily.board.includes(kind)){s.daily.board.push(kind);s.daily.boardDone.push(false);}
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
 const room=Math.max(0,DAILY_CAP-d.energyEarned),repeated=kind==='course'&&courseId?d.courseUnits!.includes(courseId):d.participated!.includes(kind);
 const result:Reward={gained:0,bonus:0,boardComplete:false,ballGranted:false,capped:room===0,repeated};
 if(repeated)return result;
 if(kind==='course'&&courseId)d.courseUnits!.push(courseId);
 if(!d.participated!.includes(kind))d.participated!.push(kind);
 result.gained=Math.min(PARTICIPATION_ENERGY,room);
 d.energyEarned+=result.gained;s.energy+=result.gained;
 if(!d.goalDone&&participationCount(s)>=DAILY_GOAL){
  d.goalDone=true;result.boardComplete=true;
  result.bonus=Math.min(1,Math.max(0,DAILY_CAP-d.energyEarned));
  d.energyEarned+=result.bonus;s.energy+=result.bonus;
  const p=s.participation!;
  if(p.lastDate!==d.date){p.days++;p.lastDate=d.date;}
  if(Math.floor(p.days/DAYS_FOR_GIFT)>p.gifts){p.gifts++;s.balls.poke++;result.ballGranted=true;}
 }
 return result;
}
