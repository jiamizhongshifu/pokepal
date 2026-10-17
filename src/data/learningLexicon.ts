import {WEATHER,CLEAR_NIGHT} from '../lib/weather';
import { STORIES } from './stories';
/** IDs ignore casing and terminal punctuation, but do not merge different meanings. */
export const normalizeLearningText=(text:string)=>text.trim().toLowerCase().replace(/[’‘]/g,"'").replace(/[.!?…]+$/g,'').replace(/\s+/g,' ');
export interface ExtraEntry {key:string;en:string;zh:string;kind:'phrase';icon:string;voiceEn:string;contextOnly:true}
const facilityPairs=[
 ['Look!','看一看！'],['Look with me.','和我一起看。'],['Look at the tree.','看看这棵树。'],
 ['Turn!','转一转！'],['It can turn!','它会转！'],['Sing!','唱一唱！'],["Let's sing!",'一起唱歌吧！'],
 ['Dig!','挖一挖！'],["Let's dig!",'一起挖一挖！'],['Rest!','歇一歇！'],["Let's rest.",'一起歇一歇。'],
 ['I feel cool.','好凉快。'],['Welcome home!','欢迎回家！'],['Warm!','暖暖的！'],['It is warm.','这里暖暖的。'],
 ['Splash!','扑通！'],['I can splash!','我会玩水！'],['Swim!','游一游！'],['I can swim!','我会游泳！'],
 ['Look at the shell.','看看这个贝壳。'],['Look at the sea.','看看大海。'],['Time to rest.','该休息啦。']
];
const weatherRows=[...Object.values(WEATHER),CLEAR_NIGHT].map(w=>({en:w.en,zh:w.name,voiceEn:w.en}));
const rows=[...weatherRows,...facilityPairs.map(([en,zh])=>({en,zh,voiceEn:en})),...STORIES.flatMap(s=>[
 {...s.phrase,voiceEn:s.phrase.en},
 ...s.pages.map(p=>({...p.keyword,voiceEn:p.en})),
 ...s.pages.flatMap(p=>p.pause?.choices.map(c=>({...c.reply,voiceEn:c.reply.en}))??[])
])];
export const EXTRA_LEARNING:ExtraEntry[]=[...new Map(rows.map(r=>{
 const key=`expression:${normalizeLearningText(r.en)}`;
 return [key,{...r,key,kind:'phrase' as const,icon:'book',contextOnly:true as const}];
})).values()];
