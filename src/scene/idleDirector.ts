/** All times use a monotonic clock, never the paused Three.js simulation clock. */
export const IDLE_DELAY=45_000;
export const OBSERVE_SHOT=18_000;
export interface ObserveCandidate {eventAt?:number;id:number;activity:string;moving:boolean}
export class IdleDirector {
 lastInput:number;
 subject:number|null=null;
 private shotAt=0;
 private sequence=0;
 private seen=new Map<number,number>();
 private noticed=new Map<number,number>();
 constructor(now:number){this.lastInput=now;}
 interrupt(now:number){this.lastInput=now;this.subject=null;}
 tick(now:number,allowed:boolean,candidates:ObserveCandidate[]):number|null{
  if(!allowed||!candidates.length){this.interrupt(now);return null;}
  if(now-this.lastInput<IDLE_DELAY)return null;
  const ids=new Set(candidates.map(c=>c.id));
  for(const id of this.seen.keys())if(!ids.has(id))this.seen.delete(id);
  if(this.subject!==null&&ids.has(this.subject)&&now-this.shotAt<OBSERVE_SHOT)return this.subject;
  const choices=candidates.filter(c=>c.id!==this.subject||candidates.length===1);
  // Visit every companion before returning. An activity is only a tie-breaker.
  const fresh=(c:ObserveCandidate)=>c.eventAt!==undefined&&c.eventAt!==(this.noticed.get(c.id));
  choices.sort((a,b)=>Number(fresh(b))-Number(fresh(a))||(this.seen.get(a.id)??-1)-(this.seen.get(b.id)??-1)||Number(b.activity!=='explore'&&!b.moving)-Number(a.activity!=='explore'&&!a.moving)||a.id-b.id);
  if(choices[0].eventAt!==undefined)this.noticed.set(choices[0].id,choices[0].eventAt);
  this.subject=choices[0].id;this.seen.set(this.subject,this.sequence++);this.shotAt=now;
  return this.subject;
 }
}
