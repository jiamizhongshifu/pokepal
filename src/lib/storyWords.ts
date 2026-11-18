import { STORY_GLOSSARY } from '../data/storyGlossary';
import { POKEMON } from '../data/pokemon';
import { learningEntry } from '../data/curriculum';

/** Word-level reading support for picture-book sentences: tokens, single-word voice text, meaning and timing. */
export type StoryToken={text:string;word?:string;index?:number};
/** Recorded word start times in seconds, in sentence order, plus the end of the last word. */
export type VoiceTiming={w:string[];t:number[];end:number};

export const storyWordKey=(raw:string)=>raw.replace(/’/g,"'").replace(/^[^A-Za-z]+|[^A-Za-z]+$/g,'').toLowerCase();

export function storyTokens(en:string):StoryToken[]{
 let index=0;
 return en.split(/(\s+)/).filter(Boolean).map(text=>{
  if(/^\s+$/.test(text))return {text};
  const word=storyWordKey(text);
  return word?{text,word,index:index++}:{text};
 });
}

const NAMES=new Map(POKEMON.map(p=>[p.nameEn.toLowerCase(),p]));
const owner=(word:string)=>word.endsWith("'s")?NAMES.get(word.slice(0,-2)):undefined;

/** Exact text of the single-word recording: names and "I" keep their capital letter. */
export function storyWordVoice(word:string){
 const name=NAMES.get(word)??owner(word);
 if(name)return word.endsWith("'s")?`${name.nameEn}'s`:name.nameEn;
 return word==='i'?'I':word;
}

export function storyWordGloss(word:string){
 if(STORY_GLOSSARY[word])return STORY_GLOSSARY[word];
 const name=NAMES.get(word);if(name)return name.nameZh;
 const possessive=owner(word);if(possessive)return `${possessive.nameZh}的`;
 return learningEntry(word)?.zh.replace(/[！。!.]+$/,'');
}

/** Words the notebook can keep: only lexicon entries, never invented ones. */
export const storyWordEntry=(word:string)=>learningEntry(word);

export function storyLineWords(en:string){return storyTokens(en).flatMap(t=>t.word?[t.word]:[]);}

/** Recorded word starts as shipped with the voice pack (corrected against the audio at build time by scripts/voice/align_timings.py). */
export type RawTiming={w:string[];t:number[];end:number};
const letters=(s:string)=>s.toLowerCase().replace(/[^a-z]/g,'');

/** Map recorded words onto the sentence's own words (pieces of a contraction merge); any mismatch disables highlighting rather than guessing. */
export function alignTiming(raw:RawTiming|undefined,en:string):VoiceTiming|undefined{
 if(!raw||raw.w.length!==raw.t.length)return undefined;
 const words=storyLineWords(en),t:number[]=[];let j=0;
 for(const word of words){
  const need=letters(word);let got='',start:number|undefined;
  while(got.length<need.length&&j<raw.w.length){const piece=letters(raw.w[j]);if(piece){start??=raw.t[j];got+=piece;}j++;}
  if(got!==need||start===undefined||(t.length&&start<t[t.length-1]))return undefined;
  t.push(start);
 }
 while(j<raw.w.length)if(letters(raw.w[j++]))return undefined;
 return raw.end>=(t[t.length-1]??0)?{w:words,t,end:raw.end}:undefined;
}

/** A word stays lit from its own start until the next word starts, so short gaps never flicker. */
export function wordAt(timing:VoiceTiming,seconds:number){
 if(seconds<0||seconds>=timing.end)return -1;
 let found=-1;
 for(let i=0;i<timing.t.length&&timing.t[i]<=seconds;i++)found=i;
 return found;
}
