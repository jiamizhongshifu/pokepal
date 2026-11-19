import type {SaveData} from '../types';
export type StoryStep={kind:'care'|'adventure'|'catch'|'path';label:string;description:string;companion?:number};
/** After a shared moment: meet a friend if an invite berry is waiting, otherwise go back to the learning path. */
export function collectionStep(s:SaveData):StoryStep{
 if(s.balls.poke>0)return {kind:'catch',label:'带上邀请果，认识新伙伴',description:'草丛里，会遇见怎样的新朋友呢？'};
 return {kind:'path',label:'回到学习路线',description:'下一站在路线上等你。'};
}
