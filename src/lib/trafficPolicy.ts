import {ANALYTICS_HOST,trafficPage} from './analyticsPolicy';

export const TRAFFIC_ENDPOINT='/api/traffic';
export const TRAFFIC_PREFERENCE_KEY='pokepal-traffic-disabled';
export const TRAFFIC_RETENTION_DAYS=30;
export type PageCount={page:string;count:number};
export function trafficAvailable(online:boolean,host:string){return online&&host===ANALYTICS_HOST;}
export function trafficEnabled(storage:Pick<Storage,'getItem'>,signals:{doNotTrack?:string|null;globalPrivacyControl?:boolean}){
 if(signals.doNotTrack==='1'||signals.globalPrivacyControl===true)return false;
 try{return storage.getItem(TRAFFIC_PREFERENCE_KEY)!=='1';}catch{return false;}
}
/** Reject the whole batch on unknown fields. No IDs, dates, URLs or free text accepted. */
export function parsePageCounts(value:unknown):PageCount[]|null{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).join()!=='pages')return null;
 const pages=(value as {pages:unknown}).pages;
 if(!Array.isArray(pages)||pages.length<1||pages.length>24)return null;
 const seen=new Set<string>();
 for(const row of pages){
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).sort().join()!=='count,page')return null;
  if(typeof row.page!=='string'||!trafficPage(row.page)||seen.has(row.page)||!Number.isInteger(row.count)||row.count<1||row.count>20)return null;
  seen.add(row.page);
 }
 return pages.map(({page,count})=>({page,count}));
}
