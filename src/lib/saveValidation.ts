import {validPath,migratePathEconomy} from './learningPath';
import {OPPORTUNITY_LIMIT,validOpportunity} from './learningProgress';
import {validWeatherMode} from './weather';
import { validOnboarding, migrateOnboarding } from '../data/onboarding';
import { validLearningProfile } from './learningStage';
import { mergeInvites } from "./invites";
import { PARTICIPATION_KINDS } from './participation';
import { validFarm, migrateCrops } from './farm';
import { validWishes } from '../island/plays';
import { validTraces } from '../island/errands';
import { validParties } from '../island/parties';
import type { SaveData } from '../types';
import { CREATURES } from '../data/creatures';
import { migrateCreatureIds } from './creatureMigration';
import { unitById, unitRoundCount } from '../data/curriculum';

const ids=new Set(CREATURES.map(p=>p.id));
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const integer=(v:unknown)=>number(v)&&Number.isSafeInteger(v);
const strings=(v:unknown)=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const creatureIds=(v:unknown)=>Array.isArray(v)&&v.every(x=>ids.has(x))&&new Set(v).size===v.length;
function requireValue(ok:unknown,label:string):asserts ok {if(!ok)throw new Error(`存档中的${label}无效，原存档未被替换。`);}

/**
 * Validate before any write, including optional fields used by renderers. Stored character ids from before the
 * original-creature rebrand are first rewritten on a copy, so the caller's object (an imported backup) stays intact.
 */
export function validateSave(input:unknown):SaveData {
 const value=object(input)?structuredClone(input):input;migrateCreatureIds(value);migrateCrops(value);migrateOnboarding(value);
 requireValue(object(value)&&value.version===1,'版本');const s=value;
 requireValue(s.trainer===null||(object(s.trainer)&&typeof s.trainer.name==='string'&&s.trainer.name.length<=40&&typeof s.trainer.avatar==='string'&&number(s.trainer.createdAt)),'小岛主人');
 requireValue(integer(s.energy)&&object(s.balls)&&['poke','great','ultra','master'].every(k=>integer(s.balls[k])),'能量或邀请果');
 requireValue(Array.isArray(s.captures)&&creatureIds(s.captures.map((c:any)=>c?.id)),'伙伴编号');
 for(const c of s.captures){
  requireValue(object(c)&&number(c.caughtAt)&&['poke','great','ultra','master'].includes(c.ball)&&number(c.friendship)&&c.friendship<=100&&(c.stay===undefined||typeof c.stay==='boolean')&&(c.played===undefined||Number.isInteger(c.played)&&c.played>=0&&c.played<=9999),'伙伴记录');
  for(const k of ['personality','care'])if(c[k]!==undefined)requireValue(object(c[k]),'旧的伙伴记录');
 }
 const d=s.daily;
 requireValue(object(d)&&typeof d.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&Number.isFinite(Date.parse(d.date)),'日期');
 requireValue(Array.isArray(d.board)&&[3,4].includes(d.board.length)&&new Set(d.board).size===d.board.length&&d.board.every((k:any)=>['listen','repeat','wordpic','trace'].includes(k))&&Array.isArray(d.boardDone)&&d.boardDone.length===d.board.length&&d.boardDone.every((v:any)=>typeof v==='boolean')&&typeof d.bonusGiven==='boolean','任务板');
 requireValue(['energyEarned','tasksCompleted','heard','spoken','playSeconds','extraSeconds'].every(k=>number(d[k]))&&strings(d.words)&&Array.isArray(d.caught)&&d.caught.every((id:any)=>ids.has(id)),'每日进度');
 if(d.participated!==undefined)requireValue(strings(d.participated)&&new Set(d.participated).size===d.participated.length&&d.participated.every((k:any)=>PARTICIPATION_KINDS.includes(k)),'参与奖励');
 if(d.courseUnits!==undefined)requireValue(strings(d.courseUnits)&&new Set(d.courseUnits).size===d.courseUnits.length&&d.courseUnits.every((id:string)=>!!unitById(id)),'课程奖励');
 if(d.islandDone!==undefined)requireValue(integer(d.islandDone)&&d.islandDone<=9999,'小岛的一天');
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
 if(cfg.favorites!==undefined)requireValue(creatureIds(cfg.favorites),'置顶伙伴');
 if(cfg.islandWeather!==undefined)requireValue(validWeatherMode(cfg.islandWeather),'小岛天气');
 if(cfg.environmentSound!==undefined)requireValue(['off','soft','normal'].includes(cfg.environmentSound),'环境声音');
 if(cfg.backgroundMusic!==undefined)requireValue(['off','soft','normal'].includes(cfg.backgroundMusic),'背景音乐');
 if(cfg.ambientEnglish!==undefined)requireValue(['off','some','more'].includes(cfg.ambientEnglish),'环境英语');
 if(cfg.storyLanguage!==undefined)requireValue(['stage','short','full'].includes(cfg.storyLanguage),'故事语言版本');
 if(cfg.storyMode!==undefined)requireValue(['listen','read'].includes(cfg.storyMode),'故事阅读模式');
 if(cfg.storyPace!==undefined)requireValue(['normal','slow'].includes(cfg.storyPace),'故事朗读速度');
 if(cfg.englishMode!==undefined)requireValue(['english','bilingual'].includes(cfg.englishMode),'语言设置');
 if(cfg.idleCamera!==undefined)requireValue(typeof cfg.idleCamera==='boolean','自动观察设置');
 if(cfg.hqLighting!==undefined)requireValue(typeof cfg.hqLighting==='boolean','画质设置');
 requireValue(Array.isArray(s.history)&&s.history.every((h:any)=>object(h)&&typeof h.date==='string'&&['energyEarned','tasksCompleted','heard','spoken','words','caught','playMinutes'].every(k=>number(h[k]))),'历史记录');
 if(s.onboarding!==undefined)requireValue(validOnboarding(s.onboarding),'新手引导');
 if(s.dex!==undefined)requireValue(creatureIds(s.dex),'好朋友相册');
 if(s.catchWish!==undefined)requireValue(ids.has(s.catchWish),'邀请愿望');
 if(s.farm!==undefined)requireValue(validFarm(s.farm),'树果园');
 if(s.islandWishes!==undefined)requireValue(validWishes(s.islandWishes),'小心愿');
 if(s.islandTraces!==undefined)requireValue(validTraces(s.islandTraces),'小岛上留下的东西');
 if(s.islandParties!==undefined)requireValue(validParties(s.islandParties),'小岛聚会');
 // Retired with the old island screen: kept untouched; only the stickers a child hid are still read.
 for(const k of ['islandProgress','islandLiving','picnic'])if(s[k]!==undefined)requireValue(object(s[k]),'旧的小岛记录');
 if(s.islandProgress?.hidden!==undefined)requireValue(strings(s.islandProgress.hidden)&&s.islandProgress.hidden.length<=20,'收起的小岛装饰');
 if(s.garden!==undefined)requireValue(object(s.garden)&&typeof s.garden.bloomed==='boolean','花园');
 // Retired stories (care afternoon, apple picnic adventure): kept untouched so an older version still reads them.
 if(s.careStory!==undefined)requireValue(object(s.careStory),'伙伴生活故事');
 if(s.storyAdventure!==undefined)requireValue(object(s.storyAdventure),'故事旅程');
 if(d.adventureReward!==undefined)requireValue(integer(d.adventureReward)&&d.adventureReward<=5,'故事奖励');
 if(s.storyProgress!==undefined)requireValue(object(s.storyProgress)&&Object.values(s.storyProgress).every(integer),'故事进度');
 if(s.path!==undefined)requireValue(validPath(s.path),'学习路线');
 if(s.learning!==undefined){
  const l=s.learning;requireValue(object(l)&&l.version===1&&object(l.records)&&object(l.units)&&(l.activeUnit===undefined||typeof l.activeUnit==='string'),'学习手册');
  for(const r of Object.values(l.records)){requireValue(object(r)&&['seen','spoken','attempts','misses','independent','streak','lastSeen','nextReview'].every(k=>number(r[k]))&&typeof r.needsPractice==='boolean'&&typeof r.saved==='boolean'&&strings(r.contexts)&&(r.lastSuccessDay===undefined||typeof r.lastSuccessDay==='string'),'单词进度');requireValue(['supported','actions','legacyIndependent'].every(k=>r[k]===undefined||integer(r[k]))&&(r.evidenceVersion===undefined||r.evidenceVersion===2),'学习证据');}
  for(const r of Object.values(l.records))requireValue((r as any).pendingAudio===undefined||typeof (r as any).pendingAudio==='boolean','待补听记录');
  requireValue(l.opportunities===undefined||(Array.isArray(l.opportunities)&&l.opportunities.length<=OPPORTUNITY_LIMIT&&l.opportunities.every(validOpportunity)),'作答记录');
  for(const [id,p] of Object.entries(l.units))requireValue(object(p)&&(p.pendingAudio===undefined||Array.isArray(p.pendingAudio)&&p.pendingAudio.length<=20&&p.pendingAudio.every((n:any)=>integer(n)&&n<(unitById(id)?unitRoundCount(unitById(id)!):20)))&&integer(p.round)&&(!unitById(id)||p.round<=unitRoundCount(unitById(id)!))&&['completedAt','appliedAt','encounteredAt','storyAt','homeTriedAt'].every(k=>p[k]===undefined||number(p[k])),'课程进度');
 }
 const result=structuredClone(s) as SaveData;
 mergeInvites(result);
 migratePathEconomy(result);
 return result;
}
