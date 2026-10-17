import { BlockingDialog } from "../components/BlockingDialog";
import { FeatureGuide } from '../components/FeatureGuide';
import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../store";
import { TopBar } from "../components/TopBar";
import { PokeBall } from "../components/PokeBall";
import { Confetti } from "../components/Celebration";
import { POKEMON, RARITY, artUrl, spriteUrl } from "../data/pokemon";
import { pickRandom } from "../data/words";
import { say, playCry, sfx, wait, stopSpeech } from "../lib/speech";
import { useIntro } from "../lib/hooks";
import type { Pokemon } from "../types";
import { Icon, Stars } from "../icons";
import { PokeImg } from "../components/PokeImg";
function EncounterGrass() {
  return <span className="encounter-grass" aria-hidden="true"><img src="/art/world/meadow-tuft-v2.png" alt="" draggable={false}/></span>;
}

import WildMeadow from "../scene/WildMeadow";

type Phase = "field" | "aim" | "throwing" | "absorbing" | "landing" | "shaking" | "caught";

export function Catch() {
  const save = useGame((s) => s.save);
  const go = useGame((s) => s.go);
  const catchPokemon = useGame((s) => s.catchPokemon);
  const setCatchWish = useGame((s) => s.setCatchWish);
  const wish = POKEMON.find((p) => p.id === save.catchWish && !save.captures.some(c=>c.id===p.id));
  const ball = "poke" as const;
  const [phase, setPhase] = useState<Phase>("field");
  const [target, setTarget] = useState<Pokemon | null>(null);
  const [exploration, setExploration] = useState({ round: 0, previousIds: [] as number[] });
  const busy = useRef(false);
  const arenaRef=useRef<HTMLDivElement>(null);
  const [captureMotion,setCaptureMotion]=useState<React.CSSProperties>({});
  const [shakeCount,setShakeCount]=useState(0);
  const selectionRun=useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; selectionRun.current++; }; }, []);
  const drag = useRef<{ y: number } | null>(null);
  const [dragDy, setDragDy] = useState(0);

  const caughtIds = useMemo(() => new Set(save.captures.map((c) => c.id)), [save.captures]);

  const ready = save.balls.poke > 0;

  // Every unowned partner is available, including evolved and legendary Pokémon.
  const encounters = useMemo(() => {
    if (wish) return [wish];
    const allowed = POKEMON.filter(p => !caughtIds.has(p.id));
    if (exploration.round > 0) {
      const fresh = pickRandom(allowed.filter(p => !exploration.previousIds.includes(p.id)), 3);
      return [...fresh, ...pickRandom(allowed.filter(p => !fresh.includes(p)), 3 - fresh.length)];
    }
    const fav = allowed.filter(p => save.settings.favorites.includes(p.id));
    return [...fav, ...pickRandom(allowed.filter(p => !fav.includes(p)), 3)].slice(0,3);
  }, [wish?.id, exploration]); // eslint-disable-line react-hooks/exhaustive-deps

  useIntro(() => {
    if (!ready) say(["zh", "先看看草丛里的伙伴，准备好精灵球再来邀请它吧！"], ["en", "You need a Poké Ball."]);
  });
  useEffect(() => {
    if (phase === "field" && ready && encounters.length) {
      if (wish) { say(["en", `Let’s meet ${wish.nameEn}!`], ["zh", `${wish.nameZh}在等你，轻轻点一下它吧！`]); return; }
      say(["zh", "草丛里有宝可梦！点一点你想要的那只。"], ["en", "Which one do you like?"]);
    }
  }, [phase, wish?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const exploreAgain = () => {
    const available = POKEMON.filter(p => !caughtIds.has(p.id));
    const previousIds = encounters.map(p => p.id);
    const freshCount = available.filter(p => !previousIds.includes(p.id)).length;
    if (wish) setCatchWish(null);
    setExploration(previous => ({ round: previous.round + 1, previousIds }));
    setTarget(null); setPhase("field"); sfx("pop");
    if (!available.length) return;
    if (freshCount < 3) say(["en", "Hello again, friends!"], ["zh", "附近的伙伴不多，也会遇见刚才的朋友哦！"]);
    else say(["en", "Let's meet new friends!"], ["zh", "发现新伙伴啦！你想和谁打招呼？"]);
  };

  const chooseTarget = async (p: Pokemon) => {
    const ticket=++selectionRun.current;
    if (!ready) {
      setCatchWish(p.id);
      say(["zh", "先看看草丛里的伙伴，准备好精灵球再来邀请它吧！"], ["en", "You need a Poké Ball."]);
      return;
    }
    sfx("pop");
    setTarget(p);
    setPhase("aim");
    await playCry(p.id);
    if (!mounted.current || ticket!==selectionRun.current || busy.current) return;
    void say(["en", `Hi! I'm ${p.nameEn}!`], ["zh", `我是${p.nameZh}！`], ["zh", "把精灵球往上扔出去吧！"], ["en", "Throw the ball!"]).then(ok=>{if(ok)useGame.getState().noteWord(p.nameEn,"heard");});
  };

  const throwBall = async () => {
    if (busy.current || !target || save.captures.some(c=>c.id===target.id) || save.balls[ball] < 1 || phase !== "aim") return;
    busy.current = true;selectionRun.current++;
    const arena=arenaRef.current!,image=arena.querySelector('.arena-target')!.getBoundingClientRect(),ballBox=arena.querySelector('.throw-ball')!.getBoundingClientRect(),stage=arena.getBoundingClientRect();
    const dx=image.left+image.width/2-(ballBox.left+ballBox.width/2);
    const dy=image.top+image.height/2-(ballBox.top+ballBox.height/2-dragDy);
    const drop=Math.max(35,Math.min(130,stage.bottom-110-(image.top+image.height/2)));
    setCaptureMotion({'--capture-start-y':`${dragDy}px`,'--capture-x':`${dx}px`,'--capture-y':`${dy}px`,'--capture-land-y':`${dy+drop}px`} as React.CSSProperties);
    setShakeCount(0);
    stopSpeech();
    sfx("whoosh");
    setPhase("throwing");
    await wait(700);
    if (!mounted.current) return;
    setPhase("absorbing");sfx("sparkle");
    await wait(650);if(!mounted.current)return;
    setPhase("landing");
    await wait(450);if(!mounted.current)return;
    setPhase("shaking");
    for (let i = 0; i < 3; i++) {
      setShakeCount(i+1);
      await wait(700);
      if (!mounted.current) return;
      sfx("click");
    }
    await wait(500);
    if (!mounted.current) return;
    const captured=await catchPokemon(target.id);
    if(!mounted.current)return;
    if (!captured) {
      busy.current=false;setTarget(null);setPhase("field");return;
    }
    setPhase("caught");
    sfx("sparkle");
    await say(["en", "Gotcha!"], ["en", `You caught ${target!.nameEn}!`], ["zh", `你抓到了${target!.nameZh}！`]);
    if (mounted.current) playCry(target!.id);
  };

  const onDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY };
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* 部分环境不支持，忽略 */ }
  };
  const onMove = (e: React.PointerEvent) => {
    if (drag.current) setDragDy(Math.min(0, e.clientY - drag.current.y));
  };
  const onUp = () => {
    const dy = dragDy;
    drag.current = null;
    setDragDy(0);
    // 往上滑或直接点一下都算扔出
    if (dy < -40 || dy > -10) throwBall();
  };


  return (
    <div className={`screen catch grass wild-adventure phase-${phase} ${wish ? "has-wish" : ""}`}>
      <WildMeadow />
      <TopBar title="野外草丛" onBack={() => go({ name: "home" })} focused help={<FeatureGuide compact id={phase==='aim'?'throw':ready?'catch':'noBall'} enabled={phase==='field'||phase==='aim'}/>}/>

      {phase === "field" && (
        <div className="field-wrap">
        <div className="field-heading">
          <div className="field-wish-actions">
            <button className="wish-button" onClick={()=>go({name:"dex",picking:true})}><span className="field-action-picture"><Icon name="dex" size={40}/></span><span>{wish ? "换个伙伴" : "选个伙伴"}</span></button>
            <button className="wish-button explore-again" onClick={exploreAgain}><span className="field-action-picture"><Icon name="grass" size={40}/><Icon name="refresh" size={22} className="field-action-corner"/></span><span>再次探索</span></button>
          </div>
        </div>
        <div className={`field encounters-${encounters.length}`} aria-label="草丛里的宝可梦">
          {encounters.length === 0 ? (
            <div className="center-msg">
              <Icon name="party" size={120} />
              <div>这片草丛的伙伴都认识啦！<small lang="en">You met them all!</small></div>
              <button className="btn-big alt" onClick={() => go({ name: "home" })}><Icon name="home" size={40} /> 回家陪伙伴玩</button>
            </div>
          ) : (
            encounters.map((p, i) => (
              <button key={p.id} aria-label={`${p.nameZh} ${p.nameEn}`} className="wild" style={{"--spot":i} as React.CSSProperties} onClick={() => chooseTarget(p)}>
                <span className="encounter-portrait"><PokeImg src={spriteUrl(p.id)} alt="" draggable={false} /><EncounterGrass /></span>
                <span className="wild-name">{p.nameZh}<small lang="en">{p.nameEn}</small></span>
              </button>
            ))
          )}
        </div>
          {encounters.length > 0 && <div className="field-kit">
            <PokeBall type="poke" size={48}/>
            <div className="field-kit-copy"><strong>{ready ? `精灵球 ×${save.balls.poke}` : "准备一个精灵球"}</strong><small>{ready ? "点一点喜欢的伙伴吧" : "有了球，就能邀请伙伴回家"}</small></div>
            {!ready && <button onClick={()=>go({name:"shop"})}><Icon name="gift" size={30}/><span>去换球</span></button>}
          </div>}


        </div>
      )}

      {target && ["aim", "throwing", "absorbing", "landing", "shaking"].includes(phase) && (
        <div className="arena capture-arena" ref={arenaRef} style={captureMotion}>
          <PokeImg
            className={`arena-target ${phase === "absorbing" ? "capture-absorbing" : phase === "landing" || phase === "shaking" ? "capture-hidden" : ""}`}
            src={artUrl(target.id)}
            alt=""
          />
          <div className="arena-name">{target.nameZh} · {target.nameEn} <Stars n={RARITY[target.rarity].stars} size={22} /></div>
          <button
            className={`throw-ball capture-ball capture-${phase}`}
            aria-label="扔出精灵球"
            disabled={phase !== "aim"}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); throwBall(); } }}
            style={{ transform: phase === "aim" ? `translateY(${dragDy}px)` : undefined }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => { drag.current = null; setDragDy(0); }}
          >
            <span className="capture-ball-body"><PokeBall type="poke" size={120} /></span>
            <span className="capture-flash" aria-hidden="true"/>
          </button>
          {['throwing','absorbing','landing','shaking'].includes(phase)&&<div className="capture-progress" role="status" aria-live="polite">{phase==='throwing'?'精灵球，出发！':phase==='absorbing'?'伙伴进入精灵球啦':phase==='landing'?'轻轻落地…':`摇一摇 ${shakeCount} / 3`}<span aria-hidden="true">{[1,2,3].map(n=><i key={n} className={n<=shakeCount?'on':''}/>)}</span></div>}
          {(phase === "aim") && <div className="throw-hint"><Icon name="swipe" size={30} /><span>点一下精灵球，或向上滑<small lang="en">Tap or slide up!</small></span></div>}
          {phase === "aim" && <button className="link back-field" onClick={() => { selectionRun.current++; stopSpeech(); setTarget(null); setPhase("field"); }}><Icon name="search" size={28}/><span>换一只</span></button>}
        </div>
      )}

      {phase === "caught" && target && (
        <BlockingDialog className="modal-backdrop celebrate" label="认识新伙伴">
          <Confetti />
          <div className="modal caught-card">
            <div className="cel-title">抓到啦！Gotcha!</div>
            <PokeImg className="caught-art" src={artUrl(target.id)} alt="" />
            <div className="caught-name">{target.nameZh}<span>{target.nameEn}</span></div>
            <div className="caught-rarity"><Stars n={RARITY[target.rarity].stars} size={28} /> {RARITY[target.rarity].zh}</div>
            <div className="cel-actions">
              <button className="btn-big" onClick={() => go({ name: "home", companion:target.id })}><Icon name="home" size={40} /><span>带它回家<small lang="en">Let’s go home!</small></span></button>
              <button className="btn-big alt" onClick={() => go({ name: "dexDetail", id: target.id })}><Icon name="dex" size={40} /><span>认识它<small lang="en">Meet your friend</small></span></button>
            </div>
          </div>
        </BlockingDialog>
      )}
    </div>
  );
}
