import type {SaveData} from '../types';
import {todayStr} from './date';
export type StoryStep={kind:'care'|'adventure'|'catch'|'exchange'|'rest';label:string;description:string;companion?:number};
export function collectionStep(s:SaveData):StoryStep{
 if(s.balls.poke>0)return {kind:'catch',label:'带上邀请果，认识新伙伴',description:'草丛里，会遇见怎样的新朋友呢？'};
 if(s.energy>=5)return {kind:'exchange',label:'用 5 能量换邀请果，去找伙伴',description:'小小的收获，可以带来一位新朋友。'};
 if(s.daily.date!==todayStr()||s.daily.adventureReward===undefined)return {kind:'adventure',label:s.storyAdventure&&s.storyAdventure.phase!=='completed'&&s.storyAdventure.phase!=='ready'?'接着听苹果故事':'一起听苹果故事',description:'一起分享苹果，收集认识新伙伴的能量。'};
 return {kind:'rest',label:'和伙伴歇一会儿',description:'今天的小收获已经记好了，安心陪陪伙伴吧。'};
}
export function todayStory(s:SaveData,requested?:number):StoryStep{
 const pending=s.careStory&&s.careStory.phase!=='ending';
 const companion=(pending?s.captures.find(c=>c.id===s.careStory!.pokemonId):undefined)??s.captures.find(c=>c.id===requested)??s.captures.find(c=>s.settings.favorites.includes(c.id))??s.captures[0];
 if(!companion)return s.storyAdventure&&!['ready','completed'].includes(s.storyAdventure.phase)?collectionStepForAdventure():collectionStep(s);
 if(pending)return {kind:'care',companion:companion.id,label:'接着我们的故事',description:'点心、小苗和小球，都在故事里等着你。'};
 if(requested&&companion.id===requested)return {kind:'care',companion:companion.id,label:'一起开始今天的故事',description:'留一份点心，照顾小苗，再一起玩一会儿。'};
 if(s.storyAdventure&&!['ready','completed'].includes(s.storyAdventure.phase))return {...collectionStepForAdventure(),companion:companion.id};
 const last=s.islandLiving?.memories.find(m=>m.id===`care:${s.careStory?.id}`)?.at;
 const done=s.careStory?.phase==='ending'&&last!==undefined&&todayStr(new Date(last))===todayStr();
 return done?{...collectionStep(s),companion:companion.id}:{kind:'care',companion:companion.id,label:'一起开始今天的故事',description:'留一份点心，照顾小苗，再一起玩一会儿。'};
}
function collectionStepForAdventure():StoryStep{return {kind:'adventure',label:'接着听苹果故事',description:'上次听到的地方，已经替你留好了。'};}
