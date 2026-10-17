import type { LearningEntry } from '../data/curriculum';
import type { Part } from './speech';

export function learningVoice(entry:LearningEntry):Part[]{
 const en=entry.kind==='concept'&&entry.key.startsWith('count:')?`${entry.en[0].toUpperCase()}${entry.en.slice(1)}!`:entry.en;
 // Word/name recordings and phrase recordings are already bundled Volcengine assets.
 return [['en',entry.voiceEn??en,{en:entry.en,zh:entry.zh}]];
}
