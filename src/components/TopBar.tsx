import { withTransition } from '../lib/viewTransition';
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
        {title && !home && <h1 className="tb-title">{icon && <Icon name={icon} size={34} />}{title}</h1>}
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
    {editingAvatar && <AvatarEditor onClose={()=>withTransition(()=>setEditingAvatar(false))}/>}
    </>
  );
}

/** 家长入口：长按 3 秒后再答一道算术题 */
export function ParentButton({ onOpen }: { onOpen: () => void }) {
  // The ring fills by itself in CSS while the button is held (no per-frame rendering); letting go runs it back quickly.
  const [holding, setHolding] = useState(false);
  const [gate, setGate] = useState(false), [hint, setHint] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), pressed = useRef(false);
  useEffect(()=>()=>{clearTimeout(timer.current);clearTimeout(hintTimer.current);},[]);
  const start = () => {
    pressed.current = true;
    clearTimeout(timer.current);
    setHolding(true);
    timer.current = setTimeout(() => { pressed.current = false; setHolding(false); setGate(true); }, 3000);
  };
  const cancel = () => {
    clearTimeout(timer.current);
    setHolding(false);
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
        className={`parent-btn${holding ? " is-holding" : ""}`}
        onPointerDown={start}
        onClick={e=>{if(e.detail===0){cancel();setGate(true);}}}
        onPointerUp={release}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="家长入口，长按三秒或按回车验证"
      >
        <svg className="parent-btn-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16.5" pathLength={100} /></svg>
        <span><Icon name="gear" size={28} /></span>
        <small className={`parent-btn-hint${hint ? " is-shown" : ""}`} role="status" aria-hidden={!hint}>{hint ? "给大人：按住 3 秒" : ""}</small>
      </button>
      {gate && <ParentGate onPass={() => withTransition(() => { setGate(false); onOpen(); })} onCancel={() => withTransition(() => setGate(false))} />}
    </>
  );
}
