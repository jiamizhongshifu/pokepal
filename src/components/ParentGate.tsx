import { useEffect, useMemo, useRef, useState } from "react";
import { BlockingDialog } from "./BlockingDialog";
import { stopSpeech } from "../lib/speech";
import { Icon } from "../icons";

export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [a, b] = useMemo(() => [6 + Math.floor(Math.random() * 9), 5 + Math.floor(Math.random() * 9)], []);
  const [input, setInput] = useState("");
  const [wrong, setWrong] = useState(false);
  const dialog=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    stopSpeech();
    const previous=document.activeElement as HTMLElement|null;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return()=>{if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  const press = (k: string) => {
    setWrong(false);
    if (k === "del") return setInput((v) => v.slice(0, -1));
    if (k === "OK") {
      if (Number(input) === a + b) onPass();
      else {
        setWrong(true);
        setInput("");
      }
      return;
    }
    setInput((v) => (v + k).slice(0, 3));
  };
  // 脱离 topbar 的层叠上下文，避免家园导航遮挡验证弹窗。
  return (
    <BlockingDialog className="modal-backdrop" label="家长验证" onClose={onCancel}>
      <div className="modal gate" ref={dialog} aria-labelledby="parent-gate-title" onClick={(e) => e.stopPropagation()} onKeyDown={e=>{
        if(e.key==='Escape'){e.preventDefault();onCancel();return;}
        if(/^\d$/.test(e.key)||e.key==='Backspace'){e.preventDefault();press(e.key==='Backspace'?'del':e.key);return;}
        if(e.key==='Tab'){
          const buttons=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
          const first=buttons[0],last=buttons[buttons.length-1];
          if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
          else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
        }
      }}>
        <header className="gate-nav"><div className="gate-title" id="parent-gate-title">家长验证</div><button aria-label="取消家长验证" onClick={onCancel}><Icon name="close" size={26}/></button></header>
        <div className="gate-q">{a} + {b} = <span className="gate-input">{input || "?"}</span></div>
        {wrong && <div className="gate-wrong">不对哦，再试一次</div>}
        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "OK"].map((k) => (
            <button key={k} onClick={() => press(k)} className={k === "OK" ? "ok" : ""} aria-label={k === "del" ? "删除" : k}>{k === "del" ? <Icon name="backspace" size={34} /> : k}</button>
          ))}
        </div>
      </div>
    </BlockingDialog>
  );
}
