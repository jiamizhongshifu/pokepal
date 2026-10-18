import type { LearningEntry } from '../data/curriculum';
import type { Part } from './speech';

export function learningVoice(entry:LearningEntry):Part[]{
 const en=entry.kind==='concept'&&entry.key.startsWith('count:')?`${entry.en[0].toUpperCase()}${entry.en.slice(1)}!`:entry.en;
 // Word/name recordings and phrase recordings are already bundled Volcengine assets.
 return [['en',entry.voiceEn??en,{en:entry.en,zh:entry.zh}]];
}

/** Optional help connects the highlighted picture, its meaning and the next action. */
export function learningExplanation(entry:LearningEntry):Part[]{
 const meaning=entry.kind==='phrase'?`意思是：${entry.zh}`
  :entry.key.startsWith('count:')?`${['一','两','三','四','五'][Number(entry.key.slice(6))-1]}个苹果！`
  :entry.kind==='concept'?`这是${entry.en==='big'?'大大的':'小小的'}。`
  :`这是${entry.zh}。`;
 return [...learningVoice(entry),300,['zh',meaning],300,...learningVoice(entry),
  ['zh','看看亮起来的图片，听完点一点。']];
}
