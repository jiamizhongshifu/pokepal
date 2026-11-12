/** Media adapters dispatch completion only after both picture and narration finish.
 * This reducer never awards points or mutates inventory. Tokens reject stale callbacks.
 */
export interface AdventureBeat {id:string; invitation?:{target:string;waitMs:number}}
export interface Adventure {id:string;taskId:string;version:number;beats:readonly AdventureBeat[]}
export interface StoryPlayback {
 episodeId:string;version:number;index:number;token:number;
 phase:'ready'|'playing'|'invitation'|'reacting'|'paused'|'completed';
 resumePhase:'playing'|'invitation'|'reacting';completed:string[];participated:string[];
}
export type StoryEvent =
 | {type:'start'|'pause'|'resume'|'restart'}
 | {type:'media-ended'|'participate'|'invitation-ended'|'reaction-ended';token:number};
export function beginStory(a:Adventure):StoryPlayback {
 if(!a.beats.length||new Set(a.beats.map(b=>b.id)).size!==a.beats.length)throw new Error('Story requires unique beats');
 return {episodeId:a.id,version:a.version,index:0,token:0,phase:'ready',resumePhase:'playing',completed:[],participated:[]};
}
export function storyPlayback(a:Adventure,s:StoryPlayback,e:StoryEvent):StoryPlayback {
 if(s.episodeId!==a.id||s.version!==a.version)throw new Error('Story version mismatch');
 if(e.type==='restart')return {...beginStory(a),token:s.token+1};
 if(e.type==='pause'&&(s.phase==='playing'||s.phase==='invitation'||s.phase==='reacting'))return {...s,phase:'paused',resumePhase:s.phase,token:s.token+1};
 if(e.type==='resume'&&s.phase==='paused')return {...s,phase:s.resumePhase,token:s.token+1};
 if(e.type==='start'&&s.phase==='ready')return {...s,phase:'playing',token:s.token+1};
 if(!('token' in e)||e.token!==s.token)return s;
 const beat=a.beats[s.index];
 if(e.type==='media-ended'&&s.phase==='playing'){
  if(beat.invitation)return {...s,phase:'invitation',token:s.token+1};
  return advance(a,s);
 }
 if(s.phase==='invitation'&&(e.type==='participate'||e.type==='invitation-ended')){
  return {...s,phase:'reacting',token:s.token+1,participated:e.type==='participate'?[...new Set([...s.participated,beat.id])]:s.participated};
 }
 if(s.phase==='reacting'&&e.type==='reaction-ended')return advance(a,s);
 return s;
}
function advance(a:Adventure,s:StoryPlayback):StoryPlayback {
 const completed=[...new Set([...s.completed,a.beats[s.index].id])];
 const last=s.index===a.beats.length-1;
 return {...s,completed,index:last?s.index:s.index+1,phase:last?'completed':'playing',token:s.token+1};
}
/** Resume at a beat boundary; interruptions cannot silently finish a beat. */
export function restoreStory(a:Adventure,raw:unknown):StoryPlayback {
 const fresh=beginStory(a);
 if(!raw||typeof raw!=='object')return fresh;
 const r=raw as Partial<StoryPlayback>;
 if(r.episodeId!==a.id||r.version!==a.version||!Number.isInteger(r.index)||r.index!<0||r.index!>=a.beats.length)return fresh;
 const index=r.index!;
 const ended=r.phase==='completed'&&index===a.beats.length-1;
 const prefix=a.beats.slice(0,ended?index+1:index).map(b=>b.id);
 if(!Array.isArray(r.completed)||prefix.some(id=>!r.completed!.includes(id)))return fresh;
 return {...fresh,index,phase:ended?'completed':r.phase==='ready'&&index===0?'ready':'paused',completed:prefix,
  token:Number.isSafeInteger(r.token)&&r.token!>=0?r.token!+1:1,
  participated:Array.isArray(r.participated)?prefix.filter(id=>r.participated!.includes(id)):[]};
}
