import {validWeatherMode} from './weather';
import { validOnboarding } from '../data/onboarding';
import { validLearningProfile } from './learningStage';
import { mergePokeballs } from "./pokeballs";
import { validIslandProgress } from './islandProgress';
import { PREFERENCES,validLiving } from './islandLiving';
import { PARTICIPATION_KINDS } from './participation';
import { validFarm } from './farm';
import { validPicnic } from './picnic';
import type { SaveData } from '../types';
import { POKEMON } from '../data/pokemon';
import { unitById, unitRoundCount } from '../data/curriculum';

const ids=new Set(POKEMON.map(p=>p.id));
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const integer=(v:unknown)=>number(v)&&Number.isSafeInteger(v);
const strings=(v:unknown)=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const pokemonIds=(v:unknown)=>Array.isArray(v)&&v.every(x=>ids.has(x))&&new Set(v).size===v.length;
function requireValue(ok:unknown,label:string):asserts ok {if(!ok)throw new Error(`存档中的${label}无效，原存档未被替换。`);}

/** Validate before migration or any write, including optional fields used by renderers. */
export function validateSave(value:unknown):SaveData {
 requireValue(object(value)&&value.version===1,'版本');const s=value;
 requireValue(s.trainer===null||(object(s.trainer)&&typeof s.trainer.name==='string'&&typeof s.trainer.avatar==='string'&&number(s.trainer.createdAt)),'训练师');
 requireValue(integer(s.energy)&&object(s.balls)&&['poke','great','ultra','master'].every(k=>integer(s.balls[k])),'能量或精灵球');
 requireValue(Array.isArray(s.captures)&&pokemonIds(s.captures.map((c:any)=>c?.id)),'宝可梦编号');
 for(const c of s.captures){
  requireValue(object(c)&&number(c.caughtAt)&&['poke','great','ultra','master'].includes(c.ball)&&number(c.friendship)&&c.friendship<=100&&(c.stay===undefined||typeof c.stay==='boolean'),'伙伴记录');
  if(c.personality!==undefined)requireValue(object(c.personality)&&c.personality.version===1&&PREFERENCES.includes(c.personality.preference),'伙伴喜好');
  if(c.care!==undefined)requireValue(object(c.care)&&['seconds','quietUntil'].every(k=>number(c.care[k]))&&['fedAt','petAt'].every(k=>typeof c.care[k]==='number'&&Number.isFinite(c.care[k])),'伙伴心愿');
 }
 const d=s.daily;
 requireValue(object(d)&&typeof d.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&Number.isFinite(Date.parse(d.date)),'日期');
 requireValue(Array.isArray(d.board)&&[3,4].includes(d.board.length)&&new Set(d.board).size===d.board.length&&d.board.every((k:any)=>['listen','repeat','wordpic','trace'].includes(k))&&Array.isArray(d.boardDone)&&d.boardDone.length===d.board.length&&d.boardDone.every((v:any)=>typeof v==='boolean')&&typeof d.bonusGiven==='boolean','任务板');
 requireValue(['energyEarned','tasksCompleted','heard','spoken','playSeconds','extraSeconds'].every(k=>number(d[k]))&&strings(d.words)&&Array.isArray(d.caught)&&d.caught.every((id:any)=>ids.has(id)),'每日进度');
 if(d.participated!==undefined)requireValue(strings(d.participated)&&new Set(d.participated).size===d.participated.length&&d.participated.every((k:any)=>PARTICIPATION_KINDS.includes(k)),'参与奖励');
 if(d.courseUnits!==undefined)requireValue(strings(d.courseUnits)&&new Set(d.courseUnits).size===d.courseUnits.length&&d.courseUnits.every((id:string)=>!!unitById(id)),'课程奖励');
 if(d.goalDone!==undefined)requireValue(typeof d.goalDone==='boolean','今日参与目标');
 if(d.storyReadPages!==undefined)requireValue(object(d.storyReadPages)&&Object.values(d.storyReadPages).every(v=>Array.isArray(v)&&v.length<=8&&new Set(v).size===v.length&&v.every(n=>Number.isInteger(n)&&n>=1&&n<=8)),'共读页数');
 if(s.participation!==undefined)requireValue(object(s.participation)&&s.participation.version===1&&['days','gifts'].every(k=>integer(s.participation[k]))&&s.participation.gifts<=Math.floor(s.participation.days/7)&&typeof s.participation.lastDate==='string','累计参与');
 requireValue(object(s.streak)&&typeof s.streak.lastDate==='string'&&integer(s.streak.count),'连续天数');
 requireValue(object(s.wordStats)&&Object.values(s.wordStats).every(v=>object(v)&&['heard','spoken','correct'].every(k=>number(v[k]))),'词汇记录');
 requireValue(object(s.settings),'设置');const cfg=s.settings;
 for(const k of ['dailyMinutes','speechRate'])if(cfg[k]!==undefined)requireValue(number(cfg[k])&&cfg[k]>0,'时间或语速');
 if(cfg.tasksPerDay!==undefined)requireValue([3,4].includes(cfg.tasksPerDay),'任务数量');
 if(cfg.learningProfile!==undefined)requireValue(validLearningProfile(cfg.learningProfile),'英语学习阶段');
 if(cfg.level!==undefined)requireValue([1,2].includes(cfg.level),'学习等级');
 if(cfg.favorites!==undefined)requireValue(pokemonIds(cfg.favorites),'置顶伙伴');
 if(cfg.islandWeather!==undefined)requireValue(validWeatherMode(cfg.islandWeather),'小岛天气');
 if(cfg.environmentSound!==undefined)requireValue(['off','soft','normal'].includes(cfg.environmentSound),'环境声音');
 if(cfg.backgroundMusic!==undefined)requireValue(['off','soft','normal'].includes(cfg.backgroundMusic),'背景音乐');
 if(cfg.ambientEnglish!==undefined)requireValue(['off','some','more'].includes(cfg.ambientEnglish),'环境英语');
 if(cfg.storyLanguage!==undefined)requireValue(['stage','short','full'].includes(cfg.storyLanguage),'故事语言版本');
 if(cfg.storyMode!==undefined)requireValue(['listen','read'].includes(cfg.storyMode),'故事阅读模式');
 if(cfg.englishMode!==undefined)requireValue(['english','bilingual'].includes(cfg.englishMode),'语言设置');
 if(cfg.idleCamera!==undefined)requireValue(typeof cfg.idleCamera==='boolean','自动观察设置');
 if(cfg.hqLighting!==undefined)requireValue(typeof cfg.hqLighting==='boolean','画质设置');
 requireValue(Array.isArray(s.history)&&s.history.every((h:any)=>object(h)&&typeof h.date==='string'&&['energyEarned','tasksCompleted','heard','spoken','words','caught','playMinutes'].every(k=>number(h[k]))),'历史记录');
 if(s.onboarding!==undefined)requireValue(validOnboarding(s.onboarding),'新手引导');
 if(s.dex!==undefined)requireValue(pokemonIds(s.dex),'图鉴');
 if(s.catchWish!==undefined)requireValue(ids.has(s.catchWish),'捕捉愿望');
 if(s.farm!==undefined)requireValue(validFarm(s.farm),'树果园');
 if(s.islandProgress!==undefined)requireValue(validIslandProgress(s.islandProgress),'岛屿礼物和升级');
 if(s.islandLiving!==undefined)requireValue(validLiving(s.islandLiving,ids),'小岛生活');
 if(s.picnic!==undefined)requireValue(validPicnic(s.picnic,s.captures.map((c:any)=>c.id))&&s.picnic.memories.every((m:any)=>ids.has(m.pokemonId)),'野餐回忆');
 if(s.garden!==undefined)requireValue(object(s.garden)&&typeof s.garden.bloomed==='boolean','花园');
 if(s.storyProgress!==undefined)requireValue(object(s.storyProgress)&&Object.values(s.storyProgress).every(integer),'故事进度');
 if(s.learning!==undefined){
  const l=s.learning;requireValue(object(l)&&l.version===1&&object(l.records)&&object(l.units)&&(l.activeUnit===undefined||typeof l.activeUnit==='string'),'学习手册');
  for(const r of Object.values(l.records)){requireValue(object(r)&&['seen','spoken','attempts','misses','independent','streak','lastSeen','nextReview'].every(k=>number(r[k]))&&typeof r.needsPractice==='boolean'&&typeof r.saved==='boolean'&&strings(r.contexts)&&(r.lastSuccessDay===undefined||typeof r.lastSuccessDay==='string'),'单词进度');requireValue(['supported','actions','legacyIndependent'].every(k=>r[k]===undefined||integer(r[k]))&&(r.evidenceVersion===undefined||r.evidenceVersion===2),'学习证据');}
  for(const r of Object.values(l.records))requireValue((r as any).pendingAudio===undefined||typeof (r as any).pendingAudio==='boolean','待补听记录');
  for(const [id,p] of Object.entries(l.units))requireValue(object(p)&&(p.pendingAudio===undefined||Array.isArray(p.pendingAudio)&&p.pendingAudio.length<=20&&p.pendingAudio.every((n:any)=>integer(n)&&n<(unitById(id)?unitRoundCount(unitById(id)!):20)))&&integer(p.round)&&(!unitById(id)||p.round<=unitRoundCount(unitById(id)!))&&['completedAt','appliedAt','encounteredAt','storyAt'].every(k=>p[k]===undefined||number(p[k])),'课程进度');
 }
 const result=structuredClone(s) as SaveData;
 mergePokeballs(result);
 return result;
}
