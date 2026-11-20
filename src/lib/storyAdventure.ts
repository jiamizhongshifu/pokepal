import type {SaveData} from '../types';
import {STORIES} from '../data/stories';
import {beginStory,storyPlayback,type Adventure,type StoryEvent,type StoryPlayback} from './storyPlayer';
import {rewardParticipation,migrateParticipation} from './participation';
import {noteLearningStory} from './learningProgress';
export const PICNIC_BOOK=STORIES.find(s=>s.id==='magic-words')!;
export const PICNIC_ADVENTURE:Adventure={id:'apple-picnic-existing',taskId:PICNIC_BOOK.id,version:1,beats:PICNIC_BOOK.pages.map((_,i)=>({id:`page-${i+1}`,...(i===4?{invitation:{target:'basket',waitMs:6000}}:{})}))};
export function validAdventure(v:unknown):v is StoryPlayback {
 if(!v||typeof v!=='object')return false;
 const r=v as StoryPlayback,a=PICNIC_ADVENTURE;
 if(r.episodeId!==a.id||r.version!==1||!Number.isSafeInteger(r.index)||r.index<0||r.index>=a.beats.length||!Number.isSafeInteger(r.token)||r.token<0)return false;
 if(!['ready','playing','invitation','reacting','paused','completed'].includes(r.phase)||!['playing','invitation','reacting'].includes(r.resumePhase))return false;
 const n=r.phase==='completed'?a.beats.length:r.index;
 if(r.phase==='completed'&&r.index!==a.beats.length-1||r.phase==='ready'&&r.index!==0)return false;
 if(!Array.isArray(r.completed)||r.completed.length!==n||r.completed.some((id,i)=>id!==a.beats[i]?.id))return false;
 return Array.isArray(r.participated)&&new Set(r.participated).size===r.participated.length&&r.participated.every(id=>a.beats.some((b,i)=>b.id===id&&b.invitation&&i<=r.index));
}
/** Checkpoint and reward are written in the same save transaction. */
export function advanceAdventure(s:SaveData,event:StoryEvent){
 const previous=s.storyAdventure??beginStory(PICNIC_ADVENTURE);
 const next=storyPlayback(PICNIC_ADVENTURE,previous,event);
 s.storyAdventure=next;
 if(next.phase!=='completed'||previous.phase==='completed'||s.daily.adventureReward!==undefined)return;
 migrateParticipation(s);
 const legacy=s.daily.participated!.includes('story');
 // The picture-book reader and this adventure share the day's story credit.
 const reward=rewardParticipation(s,'story');
 s.daily.adventureReward=1;
 s.daily.tasksCompleted++;
 noteLearningStory(s,PICNIC_BOOK.id);
 return {fresh:reward.fresh,legacy,ballGranted:reward.ballGranted};
}
