import {PHRASES,PIC_WORDS,PRAISE} from "../data/words";
export interface CaptionPair { en: string; zh: string }
export function knownCaption(lang:"en"|"zh",text:string){return common.find(c=>key(c[lang])===key(text));}
export type CaptionPart = ['en'|'zh',string,CaptionPair?] | number;
const common:CaptionPair[]=[...PHRASES,...PIC_WORDS,...PRAISE,
 {en:"Your turn!",zh:"轮到你啦！"},{en:"Follow me!",zh:"跟着我走吧！"},{en:"Flowers!",zh:"小花开啦！"},
 {en:"Listen again!",zh:"再听一听！"},{en:"Try again!",zh:"再试一次！"},{en:"All done!",zh:"做完啦！"}];
const key=(s:string)=>s.toLowerCase().replace(/[.!！。?？]/g,"").trim();
/** Preserve a supplied pair even when Chinese audio is filtered out. Never invent translations. */
export function captionParts(parts:CaptionPart[]):CaptionPart[]{
  const pairs=new Map<number,CaptionPair>();
  const spoken=parts.map((p,i)=>({p,i})).filter((v):v is {p:Exclude<CaptionPart,number>;i:number}=>typeof v.p!=='number');
  for(let k=0;k<spoken.length;k++){
    const {p,i}=spoken[k];const known=knownCaption(p[0],p[1]);if(!p[2]&&known){pairs.set(i,known);continue;}if(p[2]){pairs.set(i,p[2]);continue;}
    const next=spoken[k+1]?.p,prev=spoken[k-1]?.p;
    const other=next&&next[0]!==p[0]?next:prev&&prev[0]!==p[0]?prev:undefined;
    if(other)pairs.set(i,p[0]==='en'?{en:p[1],zh:other[1]}:{en:other[1],zh:p[1]});
  }
  return parts.map((p,i)=>typeof p==='number'?p:[p[0],p[1],pairs.get(i)]);
}
