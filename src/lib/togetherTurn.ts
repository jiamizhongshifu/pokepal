import type {TogetherKind} from './islandLiving';
import type { Part } from './speech';
/** One shared meaning for voice, portraits, button and ball position. */
export function togetherTurn(partners:number[],turn:number){
 const index=turn%2;
 return {index,child:partners.length===1&&index===1,pokemonId:partners[index]??null,
  word:partners.length===1&&index===1?'Your turn!':'My turn!'};
}
export function togetherVoice(kind:TogetherKind,partners:number[],turn:number,help=false):Part[]{
 if(kind==='bubbles')return [...(turn===0?[['zh','点一下泡泡，和伙伴数一数。',{en:'Tap a bubble and count with your friend.',zh:'点一下泡泡，和伙伴数一数。'}] as Part]:[]),['en',TOGETHER_NUMBERS[Math.min(2,Math.max(0,turn))],{en:TOGETHER_NUMBERS[Math.min(2,Math.max(0,turn))],zh:['一','二','三'][Math.min(2,Math.max(0,turn))]}]];
 if(kind==='jump')return [...(turn===0?[['zh','点一下伙伴，邀请它跳一跳。',{en:'Tap your friend to invite a jump.',zh:'点一下伙伴，邀请它跳一跳。'}] as Part]:[]),['en','Jump!']];
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
export function togetherFinishedVoice(kind:TogetherKind,help=false):Part[]{
 if(kind==='bubbles'||kind==='jump')return [['en','Thank you!']];
 return help?[['en','Thank you!'],['zh','谢谢你帮我收好了小球。']]:kind==='rest'?[['en','Thank you!'],['zh','谢谢你陪我安静地歇一歇。']]:[];
}
export function togetherEvidence(kind:TogetherKind,partners:number[],turn:number,help=false){
 return {station:togetherLearningStation(kind),word:kind==='bubbles'?`count:${Math.min(2,Math.max(0,turn))+1}`:kind==='jump'?'Jump!':help?'Help, please!':kind==='rest'?'I need a rest.':togetherTurn(partners,turn).word,action:help||kind==='rest'||kind==='bubbles'||kind==='jump'||togetherTurn(partners,turn).child};
}

export type TogetherPhase='arriving'|'ready'|'acting'|'done'|'timeout';
/** Feedback describes the actual phase, never announces arrival during movement. */
export function togetherStatus(kind:TogetherKind,phase:TogetherPhase,child:boolean,help=false,watching=false){
 if(phase==='arriving')return '伙伴正在走过来';
 if(phase==='timeout')return '这条路有点挤，换个机会吧';
 if(kind==='bubbles')return phase==='done'?'三个泡泡都找到啦！':phase==='acting'?'啪！泡泡散开啦':'点泡泡，和伙伴数一数';
 if(kind==='jump')return phase==='done'?'我们一起跳了三下！':phase==='acting'?'Jump！伙伴跳起来啦':'点伙伴，邀请它跳一跳';
 if(phase==='done')return help?'小球收好啦，谢谢你！':kind==='rest'?'谢谢你陪我歇一歇！':'我们一起玩过小球啦！';
 if(phase==='acting')return kind==='rest'?'一起安静歇一歇':help?'小球正在回篮子':watching?'小球滚向另一位伙伴啦':child?'小球滚向伙伴啦':'小球向你滚来啦';
 if(kind==='rest')return '陪伙伴坐一会儿';
 return help?'点小球，收进篮子':child?'轮到你啦，点小球':'看看伙伴的小球';
}

export const TOGETHER_NUMBERS=['One!','Two!','Three!'] as const;
export const TOGETHER_LABELS:Record<TogetherKind,string>={ball:'一起玩球',rest:'一起歇歇',bubbles:'戳泡泡',jump:'一起跳'};
export const TOGETHER_ICONS:Record<TogetherKind,string>={ball:'ball',rest:'rest',bubbles:'bubbles',jump:'hand'};
export function togetherRounds(kind:TogetherKind){return kind==='rest'?1:kind==='ball'?4:3;}
export function togetherDuration(kind:TogetherKind){return kind==='rest'?8000:kind==='ball'?2500:1400;}
/** One input owns one response; a second tap while acting cannot skip a round. */
export function togetherChildTurn(kind:TogetherKind,partners:number[],turn:number,help=false){
 return kind==='bubbles'||kind==='jump'||kind==='ball'&&(help||togetherTurn(partners,turn).child);
}

/** A single deliberate response, ending back at the original pose. */
export function togetherResponse(kind:'bubbles'|'jump',progress:number,reduced=false){
 const p=Math.max(0,Math.min(1,progress)),wave=Math.sin(p*Math.PI);
 return {lift:kind==='jump'?wave*(reduced?.08:.48):0,squash:kind==='bubbles'?wave*.055:0};
}

export function togetherLearningStation(kind:TogetherKind){return kind==='rest'?'parasol':kind==='ball'?'ball':`together-${kind}`;}
