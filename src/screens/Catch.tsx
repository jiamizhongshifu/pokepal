import { worldArt } from '../data/sceneArt';
import {trackInteraction} from '../lib/interaction';
import { BlockingDialog } from "../components/BlockingDialog";
import { FeatureGuide } from '../components/FeatureGuide';
import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../store";
import { TopBar } from "../components/TopBar";
import { InviteBerry } from "../components/InviteBerry";
import { Confetti } from "../components/Celebration";
import { CREATURES, meetableCreatures, RARITY, creatureArt, creatureAvatar } from "../data/creatures";
import { pickRandom } from "../data/words";
import { say, playCry, sfx, wait, stopSpeech } from "../lib/speech";
import { useIntro } from "../lib/hooks";
import type { Creature } from "../types";
import { Icon, Stars } from "../icons";
import { CreatureImg } from "../components/CreatureImg";
function EncounterGrass() {
  return <span className="encounter-grass" aria-hidden="true"><img src={worldArt('meadow-tuft')} alt="" draggable={false}/></span>;
}

import WildMeadow from "../components/WildMeadow";

type Phase = "field" | "aim" | "throwing" | "absorbing" | "landing" | "shaking" | "caught";

export function Catch() {
  const save = useGame((s) => s.save);
  const go = useGame((s) => s.go);
  const inviteFriend = useGame((s) => s.inviteFriend);
  const setCatchWish = useGame((s) => s.setCatchWish);
  const wish = CREATURES.find((p) => p.id === save.catchWish && !save.captures.some(c=>c.id===p.id));
  const ball = "poke" as const;
  const [phase, setPhase] = useState<Phase>("field");
  const [target, setTarget] = useState<Creature | null>(null);
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

  // Unmet babies first; grown-up stages open once every species is a friend.
  const encounters = useMemo(() => {
    if (wish) return [wish];
    const allowed = meetableCreatures(caughtIds);
    if (exploration.round > 0) {
      const fresh = pickRandom(allowed.filter(p => !exploration.previousIds.includes(p.id)), 3);
      return [...fresh, ...pickRandom(allowed.filter(p => !fresh.includes(p)), 3 - fresh.length)];
    }
    const fav = allowed.filter(p => save.settings.favorites.includes(p.id));
    return [...fav, ...pickRandom(allowed.filter(p => !fav.includes(p)), 3)].slice(0,3);
  }, [wish?.id, exploration]); // eslint-disable-line react-hooks/exhaustive-deps

  useIntro(() => {
    if (!ready) say(["zh", "先看看草丛里的伙伴，准备好邀请果再来邀请它吧！"], ["en", "You need an invite berry."]);
  });
  useEffect(() => {
    if (phase === "field" && ready && encounters.length) {
      if (wish) { say(["en", `Let’s meet ${wish.nameEn}!`], ["zh", `${wish.nameZh}在等你，轻轻点一下它吧！`]); return; }
      say(["zh", "草丛里有小精灵！点一点你想要的那只。"], ["en", "Which one do you like?"]);
    }
  }, [phase, wish?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const exploreAgain = () => {
    const available = meetableCreatures(caughtIds);
    const previousIds = encounters.map(p => p.id);
    const freshCount = available.filter(p => !previousIds.includes(p.id)).length;
    if (wish) setCatchWish(null);
    setExploration(previous => ({ round: previous.round + 1, previousIds }));
    setTarget(null); setPhase("field"); sfx("pop");
    if (!available.length) return;
    if (freshCount < 3) say(["en", "Hello again, friends!"], ["zh", "附近的伙伴不多，也会遇见刚才的朋友哦！"]);
    else say(["en", "Let's meet new friends!"], ["zh", "发现新伙伴啦！你想和谁打招呼？"]);
  };

  const chooseTarget = async (p: Creature) => {
    const ticket=++selectionRun.current;
    if (!ready) {
      setCatchWish(p.id);
      say(["zh", "先看看草丛里的伙伴，准备好邀请果再来邀请它吧！"], ["en", "You need an invite berry."]);
      return;
    }
    sfx("pop");
    setTarget(p);
    setPhase("aim");
    await playCry(p.id);
    if (!mounted.current || ticket!==selectionRun.current || busy.current) return;
    void say(["en", `Hi! I'm ${p.nameEn}!`], ["zh", `我是${p.nameZh}！`], ["zh", "把邀请果送给它吧！"], ["en", "Throw the ball!"]).then(ok=>{if(ok)useGame.getState().noteWord(p.nameEn,"heard");});
  };

  const throwBall = async () => {
    if (busy.current || !target || save.captures.some(c=>c.id===target.id) || save.balls[ball] < 1 || phase !== "aim") return;
    busy.current = true;selectionRun.current++;trackInteraction('capture_started');
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
    const captured=await inviteFriend(target.id);
    if(!mounted.current)return;
    if (!captured) {
      busy.current=false;setTarget(null);setPhase("field");return;
    }
    setPhase("caught");
    sfx("sparkle");
    await say(["en", "Hello, friend!"], ["en", `${target!.nameEn} is your new friend!`], ["zh", `${target!.nameZh}成了你的新朋友！`]);
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
        <div className={`field encounters-${encounters.length}`} aria-label="草丛里的小精灵">
          {encounters.length === 0 ? (
            <div className="center-msg">
              <Icon name="party" size={120} />
              <div>这片草丛的伙伴都认识啦！<small lang="en">You met them all!</small></div>
              <button className="btn-big alt" onClick={() => go({ name: "home" })}><Icon name="home" size={40} /> 回家陪伙伴玩</button>
            </div>
          ) : (
            encounters.map((p, i) => (
              <button key={p.id} aria-label={`${p.nameZh} ${p.nameEn}`} className="wild" style={{"--spot":i} as React.CSSProperties} onClick={() => chooseTarget(p)}>
                <span className="encounter-portrait"><CreatureImg src={creatureAvatar(p.id)} alt="" draggable={false} /><EncounterGrass /></span>
                <span className="wild-name">{p.nameZh}<small lang="en">{p.nameEn}</small></span>
              </button>
            ))
          )}
        </div>
          {encounters.length > 0 && <div className="field-kit">
            <InviteBerry type="poke" size={48}/>
            <div className="field-kit-copy"><strong>{ready ? `邀请果 ×${save.balls.poke}` : "准备一个邀请果"}</strong><small>{ready ? "点一点喜欢的伙伴吧" : "走到路线上的伙伴站，就会得到邀请果"}</small></div>
            {!ready && <button onClick={()=>go({name:"home"})}><Icon name="sign" size={30}/><span>去学习路线</span></button>}
          </div>}


        </div>
      )}

      {target && ["aim", "throwing", "absorbing", "landing", "shaking"].includes(phase) && (
        <div className="arena capture-arena" ref={arenaRef} style={captureMotion}>
          <CreatureImg
            className={`arena-target ${phase === "absorbing" ? "invite-receiving" : phase === "landing" || phase === "shaking" ? "invite-nodding" : ""}`}
            src={creatureArt(target.id)}
            alt=""
          />
          <div className="arena-name">{target.nameZh} · {target.nameEn} <Stars n={RARITY[target.rarity].stars} size={22} /></div>
          <button
            className={`throw-ball capture-ball capture-${phase}`}
            aria-label="送出邀请果"
            disabled={phase !== "aim"}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); throwBall(); } }}
            style={{ transform: phase === "aim" ? `translateY(${dragDy}px)` : undefined }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => { drag.current = null; setDragDy(0); }}
          >
            <span className="capture-ball-body"><InviteBerry type="poke" size={120} /></span>
            <span className="capture-flash" aria-hidden="true"/>
          </button>
          {['throwing','absorbing','landing','shaking'].includes(phase)&&<div className="capture-progress" role="status" aria-live="polite">{phase==='throwing'?'送出邀请果！':phase==='absorbing'?'伙伴收下邀请果啦':phase==='landing'?'它在想一想…':`点点头 ${shakeCount} / 3`}<span aria-hidden="true">{[1,2,3].map(n=><i key={n} className={n<=shakeCount?'on':''}/>)}</span></div>}
          {(phase === "aim") && <div className="throw-hint"><Icon name="swipe" size={30} /><span>点一下邀请果，或向上滑<small lang="en">Tap or slide up!</small></span></div>}
          {phase === "aim" && <button className="link back-field" onClick={() => { selectionRun.current++; stopSpeech(); setTarget(null); setPhase("field"); }}><Icon name="search" size={28}/><span>换一只</span></button>}
        </div>
      )}

      {phase === "caught" && target && (
        <BlockingDialog className="modal-backdrop celebrate" label="认识新伙伴">
          <Confetti />
          <div className="modal caught-card">
            <div className="cel-title">交到新朋友啦！New friend!</div>
            <CreatureImg className="caught-art" src={creatureArt(target.id)} alt="" />
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
