import {useRef} from 'react';
import {useGame} from '../store';
import type {StoryStep} from '../lib/storyHome';
export function StoryNextButton({step,className}:{step:StoryStep;className?:string}){
 const busy=useGame(s=>s.saveBusy),lock=useRef(false);
 const start=async()=>{
  if(lock.current||useGame.getState().saveBusy)return;lock.current=true;
  try{
   const g=useGame.getState();
   if(step.kind==='care'){
    if(await g.startCareStory(step.companion))g.go({name:'careStory',companion:step.companion,autoplay:true});
   }else if(step.kind==='exchange'){
    if(await g.buyBall())g.go({name:'catch'});
   }else if(step.kind==='adventure'){
    if(g.save.storyAdventure?.phase==='completed')await g.advanceAdventure({type:'restart'});
    if(!useGame.getState().saveIssue)g.go({name:'adventure',autoplay:true});
   }else g.go(step.kind==='catch'?{name:'catch'}:{name:'home',view:'island',companion:step.companion});
  }finally{lock.current=false;}
 };
 return <button className={className} disabled={busy} onClick={()=>void start()}>{step.label}<span aria-hidden="true"> ›</span></button>;
}
