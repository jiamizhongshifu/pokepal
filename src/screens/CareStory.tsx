import { storyBackground, storyProp } from '../data/sceneArt';
import {StoryNextButton} from '../components/StoryNextButton';
import {collectionStep} from '../lib/storyHome';
import {useEffect,useRef,useState} from 'react';
import {useGame} from '../store';
import {CROPS,GROW_MS,cropStage} from '../lib/farm';
import {gardenPlan,gardenPlanKey,type CareAction} from '../lib/careStory';
import {PHRASES} from '../data/words';
import {creatureArt,getCreature} from '../data/creatures';
import {say,stopSpeech} from '../lib/speech';
import {TopBar} from '../components/TopBar';
import {CropBadge} from '../components/FarmPanel';
import './care-story.css';
const phrases={snack:"I'm hungry.",shared:'Yummy!',garden:'Water!',watered:'Thank you!',play:"Let's play!",rolled:"I'm happy!",growing:'Wow!',ending:'See you!'} as const;
export function CareStoryScreen(){
 const save=useGame(s=>s.save),busy=useGame(s=>s.saveBusy),go=useGame(s=>s.go);
 const requested=useGame(s=>s.screen.name==='careStory'?s.screen.companion:undefined);
 const [running,setRunning]=useState(()=>{const screen=useGame.getState().screen;return screen.name==='careStory'&&!!screen.autoplay;}),[failed,setFailed]=useState(false),[assetFailed,setAssetFailed]=useState(false),[heard,setHeard]=useState(''),[now,setNow]=useState(Date.now());
 const locked=useRef(false),session=save.careStory,phase=session?.phase;
 const partner=save.captures.find(c=>c.id===session?.pokemonId),pokemon=partner?getCreature(partner.id):undefined;
 const p=gardenPlan(save,now),key=gardenPlanKey(save,now);
 const phrase=session?(phase==='shared'&&session.meal==='skipped'?"Let's go!":phase==='garden'&&p.stage==='ripe'?'Wow!':phrases[session.phase]):'Hello!';
 const act=async(action:CareAction,expected?:string)=>{
  if(!session||locked.current)return;
  locked.current=true;
  try{await useGame.getState().actCareStory(session.id,session.phase,action,expected);}finally{locked.current=false;}
 };
 const begin=async()=>{
  if(locked.current)return;locked.current=true;
  try{if(await useGame.getState().startCareStory(requested)){setFailed(false);setRunning(true);}}finally{locked.current=false;}
 };
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);const hide=()=>{if(document.hidden){setRunning(false);stopSpeech();}};document.addEventListener('visibilitychange',hide);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',hide);stopSpeech();};},[]);
 useEffect(()=>{
  if(!running||!session||!partner||assetFailed||document.hidden)return;
  let cancelled=false,timer:ReturnType<typeof setTimeout>|undefined;
  setHeard('');setFailed(false);
  const line=PHRASES.find(p=>p.en===phrase)!;
  void say(['zh',line.zh],350,['en',line.en]).then(ok=>{
   if(cancelled)return;
   if(!ok){setFailed(true);setRunning(false);return;}
   setHeard(session.phase);
   const action=session.phase==='shared'||session.phase==='watered'||session.phase==='rolled'?'next':session.phase==='play'?'roll':undefined;
   if(action)timer=setTimeout(()=>void act(action),session.phase==='play'?5000:2200);
  });
  return()=>{cancelled=true;clearTimeout(timer);stopSpeech();};
 },[running,session?.id,phase,assetFailed,!!partner,phrase]);
 useEffect(()=>{
  if(!running||busy||assetFailed||document.hidden||heard!==phase)return;
  if(phase==='garden'&&p.stage==='growing')void act('garden',key);
  if(phase==='growing'&&session?.plot){
   const crop=save.farm?.plots[session.plot.index];
   if(!crop||crop.plantedAt!==session.plot.plantedAt||cropStage(crop,now)==='ripe')void act('harvest');
  }
 },[running,busy,heard,phase,now,key,assetFailed]);
 const food=session?.food==='plain'?'普通点心':session?CROPS[session.food].name:'';
 const missingFood=session?.food!=='plain'&&session&&!(save.farm?.basket[session.food]);
 const crop=session?.plot?save.farm?.plots[session.plot.index]:undefined;
 const seconds=crop?.wateredAt?Math.max(0,Math.ceil((GROW_MS-(now-crop.wateredAt))/1000)):0;
 const gardenLabel=p.stage==='empty'?`在第 ${p.index+1} 块空地种下蓝莓，浇一点水`:p.stage==='thirsty'?`给第 ${p.index+1} 块地浇水`:p.stage==='ripe'?`收好第 ${p.index+1} 块地的树果`:'让小苗慢慢长大';
 const text=phase==='snack'?`${pokemon?.nameZh}带来了小碗。一起分享一点${food}，再去花园看看。`:phase==='shared'?(session?.meal==='fed'?'小点心吃好了，谢谢你惦记着我。我们去看看小苗吧。':'点心先留着。我们一起去看看小苗。'):phase==='garden'?(p.stage==='empty'?'这里有一块空地。种下小种子，浇一点水，给它时间慢慢长大。':p.stage==='ripe'?'还记得照顾过的小苗吗？树果已经成熟，我们把它收进果篮。':p.stage==='thirsty'?'小苗的泥土有点干，我们给它浇一点水。':'小苗正在慢慢长大。我们先去玩一会儿，让它安心晒太阳。'):phase==='watered'?(session?.gardenResult==='harvested'?'树果已经放进真实果篮啦。现在一起玩吧。':session?.gardenResult==='full'?'果篮装满了，树果先留在枝头。我们一起去玩吧。':'小苗有水，也有阳光。等待的时候，我们一起玩吧。'):phase==='play'?'小球轻轻滚过来。你可以推一下，也可以看伙伴把球滚回去。':phase==='rolled'?'小球滚回来，快乐也回到我们身边。谢谢你陪我玩。':phase==='growing'?'我们陪小苗再待一会儿。果子长好了，就一起放进果篮。':session?.harvest==='collected'?'树果收好了，今天的小下午也记住了。下次再一起分享吧。':session?.harvest==='full'?'果篮满满的，成熟的树果还在原来的地里。下次再来。':'今天的小下午已经记住了。田地有了新的变化，我们把它留在原处。';
 return <div className="screen care-story"><TopBar title="和伙伴的小下午" onBack={()=>{stopSpeech();go({name:'home',companion:partner?.id});}} focused/>
 <main>
 {!session||!partner?<section className="care-story-cover"><h1>点心、小苗，还有你</h1><p>带上已有的伙伴，过一个不用赶时间的小下午。</p>{save.captures.length?<><div className="care-cast">{save.captures.slice(0,4).map(c=><img key={c.id} src={creatureArt(c.id)} alt={getCreature(c.id).nameZh}/>)}</div><button disabled={busy} onClick={()=>void begin()}>一起出发</button></>:<button onClick={()=>go({name:'catch'})}>去认识第一个伙伴</button>}</section>:<>
 <header><p>和 {pokemon!.nameZh} 一起</p><h1>{phase==='snack'||phase==='shared'?'留给你的一份点心':phase==='garden'||phase==='watered'||phase==='growing'?'给小苗一点时间':phase==='ending'?'把快乐带回家':'小球又滚回来啦'}</h1></header>
 <div className={`care-story-stage phase-${phase} ${running?'':'paused'}`} onErrorCapture={()=>{setAssetFailed(true);setRunning(false);stopSpeech();}}>
 <img className="care-backdrop" alt="" src={storyBackground(phase==='play'||phase==='rolled'?'playground':phase==='garden'||phase==='watered'||phase==='growing'?'garden-path':'orchard')}/>
 <img className="care-actor" alt={pokemon!.nameZh} src={creatureArt(partner.id)}/>
 {(phase==='snack'||phase==='shared')&&<div className="care-meal"><img alt="小碗" src={storyProp('bowl')}/><div className={`care-food ${session.meal==='fed'?'eaten':''}`}>{session.food==='plain'?<img alt="普通点心" src={storyProp('cookie')}/>:<CropBadge kind={session.food}/>}</div></div>}
 {(phase==='garden'||phase==='watered'||phase==='growing'||phase==='ending')&&<div className="care-plots" aria-label="我的三块田地">{(save.farm?.plots??[null,null,null]).map((c,i)=><div key={i} className={`care-plot stage-${cropStage(c,now)}`}><img src={storyProp(c?'flower':'soil')} alt=""/>{c&&cropStage(c,now)==='ripe'&&<CropBadge kind={c.berry}/>}<span>{i+1} · {!c?'空地':cropStage(c,now)==='ripe'?'成熟':cropStage(c,now)==='thirsty'?'待浇水':'生长中'}</span></div>)}</div>}
 {phase==='watered'&&['planted','watered'].includes(session.gardenResult??'')&&<img className="care-water" src={storyProp('watering-can')} alt="给小苗浇水"/>}
 {(phase==='play'||phase==='rolled')&&<img className="care-ball" src={storyProp('ball')} alt="轻轻滚动的小球"/>}
 </div>
 <p className="care-narrative">{text}</p><p className="care-english" lang="en">{phrase}</p>
 {assetFailed?<p role="alert">画面没有加载好，请返回后重试。已经完成的照顾不会重复扣除。</p>:<div className="care-story-controls">
 {failed&&<p role="alert">声音暂时没准备好，故事已经暂停。</p>}
 {phase==='ending'?<StoryNextButton step={{...collectionStep(save),companion:partner.id}}/>:!running?<button disabled={busy} onClick={()=>{setFailed(false);setRunning(true);}}>{failed?'重试声音':'接着听，陪陪伙伴'}</button>:<>
 {phase==='snack'&&(missingFood?<button disabled={busy} onClick={()=>void act('skip-snack')}>点心已经用完，先去花园</button>:<button disabled={busy} onClick={()=>void act('feed')}>分享一份{food}{session.food!=='plain'?'（果篮 −1）':''}</button>)}
 {phase==='garden'&&p.stage!=='growing'&&<button disabled={busy} onClick={()=>void act('garden',key)}>{gardenLabel}</button>}
 {phase==='play'&&<button disabled={busy} onClick={()=>void act('roll')}>轻轻把球推回去<small>也可以看伙伴来做</small></button>}
 {phase==='growing'&&<p role="status">小苗正在长大{seconds>0?` · 约 ${seconds} 秒`:''}。随时可以回家，下次接着看。</p>}
 {<button className="care-quiet" onClick={()=>{stopSpeech();setRunning(false);}}>暂停一下</button>}
 </>}
 </div>}
 <footer><p>果篮：{Object.entries(save.farm?.basket??{oran:0,pecha:0,cheri:0}).map(([k,n])=>`${CROPS[k as keyof typeof CROPS].name} ${n}`).join(' · ')}</p>{phase==='ending'&&<button onClick={()=>go({name:'home'})}>回到今天的故事</button>}<small>吃过的点心、照顾过的田地和滚球回忆都保存在原存档里。离开也没关系。</small></footer>
 </>}
 </main></div>;
}
