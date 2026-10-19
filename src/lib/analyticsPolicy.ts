// Traffic only: never accept game state, free text, IDs or raw URLs as event fields.
export const ANALYTICS_CONSENT_KEY='pokepal-analytics-consent';
// v2 includes fixed interaction events; previous page-only permission is not reused.
export const ANALYTICS_CONSENT_VERSION=2;
export const ANALYTICS_CONSENT_DAYS=180;
export const ANALYTICS_HOST='pokepal-online.pages.dev';
const pages:Record<string,string>={welcome:'首页',home:'小岛',journey:'学习小路',lesson:'主题学习',notebook:'发现手册',review:'回顾',tasks:'学英语',practice:'小游戏',energy:'能量',diary:'小日记',stories:'故事屋',story:'绘本课堂',task:'练习',shop:'精灵球',catch:'草丛',dex:'图鉴',dexDetail:'伙伴介绍',parent:'家长中心',privacy:'隐私说明',terms:'试用须知',feedback:'反馈',rest:'休息'};
export function trafficPage(name:string){
 if(!Object.prototype.hasOwnProperty.call(pages,name))return null;
 return {page_title:`宝可梦小小训练师 · ${pages[name]}`,page_location:`https://${ANALYTICS_HOST}${name==='welcome'?'/':`/${name}/`}`};
}
export function trafficReferrer(value:string){try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.origin+'/':'';}catch{return '';}}
export function readAnalyticsConsent(storage:Pick<Storage,'getItem'>,now=Date.now()){
 try{const v=JSON.parse(storage.getItem(ANALYTICS_CONSENT_KEY)||'null');return v?.version===ANALYTICS_CONSENT_VERSION&&v.allowed===true&&Number.isFinite(v.at)&&v.at<=now&&now-v.at<ANALYTICS_CONSENT_DAYS*86400000;}catch{return false;}
}
export function analyticsPermitted(online:boolean,hostname:string,id:string,consent:boolean){return online&&hostname===ANALYTICS_HOST&&/^G-[A-Z0-9]+$/.test(id)&&consent;}
