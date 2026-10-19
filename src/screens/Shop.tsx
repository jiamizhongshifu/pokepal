import {trackInteraction} from '../lib/interaction';
import { FeatureGuide } from '../components/FeatureGuide';
import { useEffect, useRef, useState } from "react";
import { useGame } from "../store";
import { TopBar } from "../components/TopBar";
import { PokeBall } from "../components/PokeBall";
import { BALLS, POKEMON } from "../data/pokemon";
import { say, sfx } from "../lib/speech";
import { useIntro } from "../lib/hooks";
import { Icon } from "../icons";

export function Shop() {
  const save = useGame(s=>s.save);
  const go = useGame(s=>s.go);
  const buyBall = useGame(s=>s.buyBall);
  const [got,setGot]=useState(false);
  const [saving,setSaving]=useState(false);
  const mounted=useRef(true);
  const exchanging=useRef(false);
  const timer=useRef<ReturnType<typeof setTimeout>>();
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;clearTimeout(timer.current);};},[]);
  const wish=POKEMON.find(p=>p.id===save.catchWish&&!save.captures.some(c=>c.id===p.id));
  const cost=BALLS.poke.cost;
  const affordable=save.energy>=cost;
  useIntro(()=>save.balls.poke>0?Promise.resolve(false):say(["zh","用五点能量，换一个精灵球，邀请你喜欢的伙伴回家吧！"],["en","Let's get a Poké Ball!"]));
  const buy=async()=>{
    if(exchanging.current)return;
    if(!affordable){go({name:'energy',goal:'ball'});return;}
    exchanging.current=true;setSaving(true);trackInteraction('ball_exchange_started');
    const ok=await buyBall();
    if(!mounted.current)return;
    setSaving(false);
    if(!ok){exchanging.current=false;return;}
    setGot(true);sfx('sparkle');
    say(["zh","你换到了一个精灵球！"],["en","You got a Poké Ball!"]);
    timer.current=setTimeout(()=>{exchanging.current=false;setGot(false);},1200);
  };
  return <div className="screen shop simple-ball-shop">
    <TopBar title="换精灵球" onBack={()=>go({name:'home'})} focused help={<FeatureGuide id="shop" compact autoVoice={false} enabled={save.balls.poke===0}/>}/>
    
    {save.balls.poke>0&&<section className="ball-ready"><Icon name="pokeball" size={76}/><h1>球准备好啦！</h1><p>你有 {save.balls.poke} 个球，选喜欢的伙伴吧。</p><button className="btn-big" onClick={()=>go({name:'catch'})}><Icon name="grass" size={40}/>去找喜欢的伙伴</button></section>}
    <details className={`ball-extra ${save.balls.poke===0?'first-ball':''}`} open={save.balls.poke===0}><summary>{save.balls.poke>0?'再准备一个精灵球':'准备一个精灵球'}</summary><section className="single-ball-card" aria-label="精灵球兑换">
      <div className="shop-energy"><Icon name="bolt" size={30}/>我的能量<b>{save.energy}</b></div>
      <PokeBall type="poke" size={96}/>
      <h1>一个球，邀请一个伙伴</h1>
      <p>{wish ? `${wish.nameZh}在等你！` : "喜欢哪只，就去找哪只"}</p>
      <div className="ball-exchange-picture" aria-label="5 点能量换 1 个精灵球"><Icon name="bolt" size={36}/><b>5</b><span aria-hidden="true">→</span><PokeBall type="poke" size={42}/><b>1</b></div>
      <button className={`btn-big ${save.balls.poke>0?'alt':''}`} disabled={got||saving} aria-busy={saving} onClick={buy}><Icon name={got?'check':affordable?'hand':'tasks'} size={36}/>{saving?'正在收好…':got?'换到啦！':affordable?(save.balls.poke>0?'再准备一个':'换一个精灵球'):'找一点能量'}</button>
      {!affordable&&!got&&<p className="ball-energy-help">再收集 {cost-save.energy} 点能量就够啦</p>}
      <div className="ball-owned" aria-live="polite"><PokeBall type="poke" size={28}/>我的精灵球 <b>×{save.balls.poke}</b></div>
    </section></details>
    {save.balls.poke===0&&<div className="shop-footer"><button className="btn-big alt" onClick={()=>go({name:'catch'})}><Icon name="grass" size={40}/>{save.balls.poke>0?'去找喜欢的伙伴':'先看看伙伴'}</button></div>}
  </div>;
}
