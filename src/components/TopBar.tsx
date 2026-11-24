import {MusicToggle} from './MusicToggle';
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useGame } from "../store";
import { InviteBerry } from "./InviteBerry";
import { ParentGate } from "./ParentGate";
import { sfx } from "../lib/speech";
import { Icon } from "../icons";
import { TrainerAvatar } from "./TrainerAvatar";
import { AvatarEditor } from "./AvatarEditor";

export function TopBar({ title, icon, onBack, focused = false, homeActions, progress, help }: { title?: string; icon?: string; onBack?: () => void; focused?: boolean; homeActions?: ReactNode; progress?:ReactNode; help?:ReactNode }) {
  const save = useGame((s) => s.save);
  const go = useGame((s) => s.go);
  const home = useGame((s) => s.screen.name === "home");
  const [editingAvatar,setEditingAvatar] = useState(false);
  return (
    <>
    <div className={`topbar ${homeActions ? "has-home-actions" : ""} ${!home&&(help||progress) ? "has-learning-tools" : ""}`}>
      <div className={`tb-left ${home ? "home-profile" : ""}`}>
        {onBack ? (
          <button className="btn-round back" onClick={() => { sfx("click"); onBack(); }} aria-label="返回"><Icon name="back" size={32} /><span>返回</span></button>
        ) : (
          home ? <button className="avatar avatar-edit" aria-label="更换我的头像" onClick={()=>setEditingAvatar(true)}><TrainerAvatar avatar={save.trainer?.avatar} photo={save.trainer?.avatarPhoto} size={44}/></button>
          : <div className="avatar"><TrainerAvatar avatar={save.trainer?.avatar} photo={save.trainer?.avatarPhoto} size={60}/></div>
        )}
        {title && !home && <div className="tb-title">{icon && <Icon name={icon} size={34} />}{title}</div>}
      </div>
      {!home&&(help||progress)&&<div className="tb-learning-tools">{progress&&<div className="tb-progress">{progress}</div>}{help}</div>}
      {!focused && <div className="tb-right">
        {save.balls.poke>0&&<button className="balls-chip" aria-label="有邀请果，去海边迎接新朋友" onClick={()=>{sfx("click");go({name:"catch"});}}>
          <span className="ball-count" aria-label={`邀请果共 ${Object.values(save.balls).reduce((a, b) => a + b, 0)} 个`}>
            <InviteBerry type="poke" size={30} />×{Object.values(save.balls).reduce((a, b) => a + b, 0)}
          </span>
        </button>}
        {home && <MusicToggle/>}
        <ParentButton onOpen={() => go({ name: "parent" })} />
      </div>}
      {homeActions && <nav className="home-actions" aria-label="小岛陪伴">{homeActions}{home&&help}</nav>}
    </div>
    {editingAvatar && <AvatarEditor onClose={()=>setEditingAvatar(false)}/>}
    </>
  );
}

/** 家长入口：长按 3 秒后再答一道算术题 */
export function ParentButton({ onOpen }: { onOpen: () => void }) {
  const [progress, setProgress] = useState(0);
  const [gate, setGate] = useState(false), [hint, setHint] = useState(false);
  const timer = useRef<number | undefined>(undefined), hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), pressed = useRef(false);
  useEffect(()=>()=>{if(timer.current)cancelAnimationFrame(timer.current);clearTimeout(hintTimer.current);},[]);
  const start = () => {
    pressed.current = true;
    if(timer.current)cancelAnimationFrame(timer.current);
    const t0 = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / 3000);
      setProgress(p);
      if (p >= 1) {
        pressed.current = false;
        setProgress(0);
        setGate(true);
        return;
      }
      timer.current = requestAnimationFrame(tick);
    };
    timer.current = requestAnimationFrame(tick);
  };
  const cancel = () => {
    if (timer.current) cancelAnimationFrame(timer.current);
    setProgress(0);
  };
  // A short tap says how to get in, so a grown-up does not think the button is broken.
  const release = () => {
    const short = pressed.current; pressed.current = false; cancel();
    if (!short) return;
    setHint(true); clearTimeout(hintTimer.current); hintTimer.current = setTimeout(() => setHint(false), 2200);
  };
  return (
    <>
      <button
        className="parent-btn"
        onPointerDown={start}
        onClick={e=>{if(e.detail===0){cancel();setGate(true);}}}
        onPointerUp={release}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="家长入口，长按三秒或按回车验证"
        style={{ background: `conic-gradient(var(--brand-sun) ${progress * 360}deg, rgba(255,255,255,.5) 0)` }}
      >
        <span><Icon name="gear" size={28} /></span>
        {hint && <small className="parent-btn-hint" role="status">给大人：按住 3 秒</small>}
      </button>
      {gate && <ParentGate onPass={() => { setGate(false); onOpen(); }} onCancel={() => setGate(false)} />}
    </>
  );
}
