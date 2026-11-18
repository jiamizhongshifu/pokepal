import { BlockingDialog } from "./BlockingDialog";
import { useEffect, useRef, useState } from "react";
import type { Creature } from "../types";
import { creatureArt } from "../data/creatures";
import { CreatureImg } from "./CreatureImg";
import { Icon } from "../icons";
import { playCry, say, sfx, stopSpeech, wait, type Part } from "../lib/speech";
import { bi } from "../lib/bi";
import { evoDone, evoReady, evoStart, evoStay } from "../data/evolutionEnglish";

const lines = (l: { en: string[]; zh: string }): Part[] => bi(...l.en.flatMap((t, i): Part[] => (i ? [300, ["en", t]] : [["en", t]])), 300, ["zh", l.zh]);

/**
 * 长大：满友好度时，孩子可以选择陪它长大到下一阶段，也可以保持现在的样子。
 * 长大动画：剪影缓慢交替，再揭晓新伙伴；减弱动态时直接揭晓。
 */
export function Evolution({ from, options, onDone }: { from: Creature; options: Creature[]; onDone: (to: number | null) => void }) {
  const [phase, setPhase] = useState<"choose" | "evolving" | "flash" | "done">("choose");
  const [to, setTo] = useState<Creature | null>(null);
  const [showNew, setShowNew] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const t = setTimeout(() => say(...lines(evoReady(from))), 300);
    return () => { alive.current = false; clearTimeout(t); stopSpeech(); };
  }, [from]);

  const start = async (target: Creature) => {
    sfx("sparkle");
    setTo(target);
    setPhase("evolving");
    say(...lines(evoStart(from)));
    // 幼儿界面保持缓慢变化，不使用加速闪烁；减弱动态时直接揭晓。
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let show = false;
    const t0 = performance.now();
    while (!reducedMotion && alive.current && performance.now() - t0 < 3200) {
      show = !show;
      setShowNew(show);
      await wait(900);
    }
    if (!alive.current) return;
    setPhase("flash");
    sfx("ding");
    await wait(650);
    if (!alive.current) return;
    setShowNew(true);
    setPhase("done");
    await playCry(target.id);
    if (alive.current) say(...lines(evoDone(from, target)));
  };

  const stay = async () => {
    stopSpeech();
    await say(...lines(evoStay(from)));
    onDone(null);
  };

  return (
    <BlockingDialog className={`evo-overlay ${phase}`} label="长大">
      {phase === "choose" && (
        <div className="evo-card">
          <div className="evo-title">{from.nameZh}准备好长大啦！ <span>Grow up?</span></div>
          <div className="evo-row">
            <div className="evo-mon"><CreatureImg src={creatureArt(from.id)} alt="" /><b>{from.nameZh}</b></div>
            <Icon name="sparkle" size={56} className="evo-arrow" />
            <div className="evo-options">
              {options.map((o) => (
                <button key={o.id} className="evo-mon option" onClick={() => start(o)}>
                  <CreatureImg src={creatureArt(o.id)} alt="" />
                  <b>长大成{o.nameZh}</b>
                  <small>{o.nameEn}</small>
                </button>
              ))}
            </div>
          </div>
          <button className="btn-big alt evo-stay" onClick={stay}>保持现在的样子</button>
        </div>
      )}
      {phase !== "choose" && to && (
        <div className="evo-stage">
          <div className="evo-rings" />
          <CreatureImg key={showNew ? "to" : "from"} className={`evo-art ${phase === "done" ? "reveal" : "silhouette"}`} src={creatureArt(showNew ? to.id : from.id)} alt="" />
          {phase === "done" && (
            <>
              <div className="evo-sparkles">{Array.from({ length: 10 }, (_, i) => <Icon key={i} name="sparkle" size={36} style={{ ["--i" as string]: i }} />)}</div>
              <div className="evo-result">太棒了！{from.nameZh}长大成了{to.nameZh}！<span>{to.nameEn}!</span></div>
              <button className="btn-big" onClick={() => onDone(to.id)}><Icon name="heart" size={40} /> 太棒啦！</button>
            </>
          )}
        </div>
      )}
    </BlockingDialog>
  );
}
