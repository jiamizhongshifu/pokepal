import type { Part } from './speech';
/** One shared meaning for voice, portraits, button and ball position. */
export function togetherTurn(partners:number[],turn:number){
 const index=turn%2;
 return {index,child:partners.length===1&&index===1,pokemonId:partners[index]??null,
  word:partners.length===1&&index===1?'Your turn!':'My turn!'};
}
export function togetherVoice(kind:'ball'|'rest',partners:number[],turn:number,help=false):Part[]{
 if(help)return [['en','Help, please!'],['zh','帮我把小球收好吧。']];
 if(kind==='rest')return [['en','I need a rest.'],['zh','我想歇一歇，陪陪我吧。']];
 return togetherTurn(partners,turn).child
  ? [['en','Your turn!'],['zh','轮到你啦，点小球，滚给伙伴。']]
  : [['en','My turn!'],['zh','轮到伙伴啦，看看小球。']];
}
/** The final frame stays at the recipient, including after the last round. */
export function togetherBallFraction(turn:number,progress:number){
 const p=Math.max(0,Math.min(1,progress));return turn%2?1-p:p;
}

/** Help is a voluntary follow-up to an actual ball session; not a new saved activity kind. */
export function togetherFinishedVoice(kind:'ball'|'rest',help=false):Part[]{
 return help?[['en','Thank you!'],['zh','谢谢你帮我收好了小球。']]:kind==='rest'?[['en','Thank you!'],['zh','谢谢你陪我安静地歇一歇。']]:[];
}
export function togetherEvidence(kind:'ball'|'rest',partners:number[],turn:number,help=false){
 return {station:kind==='rest'?'parasol':'ball',word:help?'Help, please!':kind==='rest'?'I need a rest.':togetherTurn(partners,turn).word,action:help||kind==='rest'||togetherTurn(partners,turn).child};
}
