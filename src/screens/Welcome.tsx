import { withTransition } from '../lib/viewTransition';
import { layerArt } from '../data/sceneArt';
import { LayeredArt } from '../components/LayeredArt';
import { Announcements } from '../components/Announcements';
import { FeatureGuide } from '../components/FeatureGuide';
import { useGame } from "../store";
import { say, unlockAudio, sfx, wait, playCry } from "../lib/speech";
import { requestPersist } from "../lib/db";
import type React from 'react';
import { creatureArt, getCreature, WELCOME_CAST } from "../data/creatures";
import { homeOf, type Spot } from '../island/world';
import { AVATARS, AVATAR_NAMES, Icon } from "../icons";
import { CreatureImg } from "../components/CreatureImg";
import { TrainerAvatar } from "../components/TrainerAvatar";
import {useEffect,useMemo,useRef,useState} from 'react';
import { BlockingDialog } from '../components/BlockingDialog';
import {ParentLinks, ParentNotice} from '../components/ParentSupport';
import {hasReadParentNotice} from '../lib/parentNotice';
import {MusicToggle} from '../components/MusicToggle';
import { useNotices } from '../lib/announcements';
import './welcome-start.css';


const FRIENDS = 6;
const side = (spot: Spot, slot: number, of: number): Spot => of < 2 ? spot : [spot[0] + (slot - (of - 1) / 2) * 6, spot[1] + (slot % 2) * 1.5];

/**
 * The front door is the island itself: the child's own friends wait at their homes, one big button (the child's
 * face) goes in, and tapping a friend makes it hop and call. Everything for grown-ups sits behind one corner button.
 */
export function Welcome() {
  const trainer = useGame((s) => s.save.trainer);
  const createTrainer = useGame((s) => s.createTrainer);
  const go = useGame((s) => s.go);
  const [notice,setNotice]=useState<{avatar?:string}|null>(null);
  const [handoff,setHandoff]=useState<{avatar?:string}|null>(null);
  const captures = useGame((s) => s.save.captures), favorites = useGame((s) => s.save.settings.favorites);
  const [hop,setHop]=useState<number|null>(null),[adults,setAdults]=useState(false);
  // A new notice is shown on the corner button too, so a grown-up sees it without opening the panel.
  const {unread}=useNotices();
  // The grown-ups panel is a popover on the gear: focus goes into it, Escape or a tap outside closes it, focus returns to the gear.
  const gear=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null);
  const closeAdults=()=>{withTransition(()=>setAdults(false));gear.current?.focus();};
  useEffect(()=>{
    if(!adults)return;
    panel.current?.querySelector<HTMLElement>('header button')?.focus();
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')){e.preventDefault();closeAdults();}};
    window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
  },[adults]);
  const [noticeRead,setNoticeRead]=useState(()=>{try{return hasReadParentNotice(localStorage);}catch{return false;}});
  const requestBegin=(avatar?:string)=>{if(!noticeRead)setNotice({avatar});else void begin(avatar);};

  const begin = async (avatar?: string) => {
    unlockAudio();
    requestPersist();
    sfx("sparkle");
    if (!trainer && avatar) {
      if(!await createTrainer(avatar))return;
      go({ name: "home" });
      await wait(300);
      if(useGame.getState().screen.name!=="home")return;
      say(["zh", "欢迎你，小岛主人！"], ["en", "Welcome to Bubbly Isle!"], ["zh", "送你一个邀请果，去海边迎接第一位小精灵朋友吧！"], ["en", "Here is an invite berry for you!"]);
    } else {
      go({ name: "home" });
      await wait(300);
      if(useGame.getState().screen.name!=="home")return;
      say(["zh", "欢迎回来！"], ["en", "Welcome back!"]);
    }
  };

  // A returning child sees their own friends; a new one sees who lives on the island.
  const friends = useMemo(() => {
    const ids = captures.length ? [...captures].sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id))).map(c => c.id).slice(0, FRIENDS) : WELCOME_CAST;
    const groups = new Map<string, number[]>();
    for (const id of ids) { const home = homeOf(getCreature(id).species).id; groups.set(home, [...(groups.get(home) ?? []), id]); }
    return ids.map(id => { const home = homeOf(getCreature(id).species), group = groups.get(home.id)!; return { id, spot: side(home.spot, group.indexOf(id), group.length) }; });
  }, [captures, favorites]);
  const greet = (id: number) => { unlockAudio(); sfx('pop'); setHop(id); setTimeout(() => setHop(h => h === id ? null : h), 700); void playCry(id); };

  return (
    <div className="screen start-screen">
      <div className="start-view">
        <img className="scene-backdrop" src={layerArt('island-map', 'base')} alt="" aria-hidden="true" draggable={false}/>
        <div className="start-world" aria-hidden={false}>
          <LayeredArt className="start-world-art" ground={layerArt('island-map', 'base')} scene="island-map"/>
          {friends.map(f => { const c = getCreature(f.id); return <button key={f.id} type="button" className={`start-friend${hop === f.id ? ' is-hopping' : ''}`} style={{ left: `${f.spot[0]}%`, top: `${f.spot[1]}%`, '--size': `${[10, 12, 14][c.stage - 1] ?? 10}%` } as React.CSSProperties} aria-label={`${c.nameZh} ${c.nameEn}`} onClick={() => greet(f.id)}><CreatureImg src={creatureArt(f.id)} alt=""/></button>; })}
        </div>
      </div>

      <header className="start-title"><Icon name="leaf" size={34} className="start-title-leaf"/><h1>啵啵岛</h1><span lang="en">Bubbly Isle</span></header>
      <nav className="start-tools" aria-label="音乐和给大人的内容">
        <MusicToggle/>
        <button ref={gear} type="button" className="start-adults" aria-expanded={adults} aria-haspopup="dialog" aria-label={`给大人${unread?'，有新公告':''}`} onClick={() => setAdults(a => !a)}><Icon name="gear" size={26}/><span>给大人</span>{unread&&<i className="start-adults-dot" aria-hidden="true"/>}</button>
      </nav>
      {adults && <>
        <button type="button" className="start-adults-backdrop" aria-label="关闭给大人的内容" tabIndex={-1} onClick={closeAdults}/>
        <section ref={panel} className="start-adults-panel" role="dialog" aria-label="给大人">
          <header><strong>给陪伴的大人</strong><button type="button" aria-label="关闭" onClick={closeAdults}><Icon name="close" size={24}/></button></header>
          <Announcements/>
          <ParentLinks/>
        </section>
      </>}

      <div className="start-action">
      {trainer ? (
        <button className="start-go" onClick={() => requestBegin()} aria-label="一起出发 Let’s play!">
          <span className="start-go-face"><TrainerAvatar avatar={trainer.avatar} photo={trainer.avatarPhoto} size={84}/></span>
          <span className="start-go-play" aria-hidden="true"><Icon name="play" size={52}/></span>
          <span className="start-go-words"><strong>一起出发</strong><span lang="en">Let’s play!</span></span>
        </button>
      ) : !noticeRead ? (
        // A new family: the grown-up reads the notice first, then hands the device to the child to choose a look.
        <section className="start-card start-parent-first" aria-labelledby="welcome-parent-title">
          <p className="handoff-eyebrow">给陪伴的大人</p>
          <h2 id="welcome-parent-title">先花一分钟看看试用须知</h2>
          <p>看完后，再把设备交给孩子选一个喜欢的形象。</p>
          <button className="btn-big" onClick={() => setNotice({})}><Icon name="book" size={36}/>先看须知</button>
        </section>
      ) : (
        <section className="start-card start-pick" aria-label="选一个你喜欢的形象">
          <header className="help-heading"><div className="start-pick-hint">选一个你喜欢的形象<small lang="en">Choose your look</small></div><FeatureGuide id="welcome" autoVoice={false}/></header>
          <div className="start-pick-row">
            {AVATARS.map((a) => (
              <button key={a} className="avatar-choice" onClick={() => requestBegin(a)} aria-label={`选择${AVATAR_NAMES[a]}`}><Icon name={a} size={120} /></button>
            ))}
          </div>
        </section>
      )}
      </div>
      {notice&&<ParentNotice onClose={()=>withTransition(()=>setNotice(null))} onContinue={()=>{const avatar=notice.avatar;withTransition(()=>{setNoticeRead(true);setNotice(null);setHandoff({avatar});});}}/>}
      {handoff&&<BlockingDialog className="modal-backdrop handoff-backdrop" label="设置好啦，可以交给孩子了" onClose={()=>withTransition(()=>setHandoff(null))}><section className="modal handoff-card" aria-labelledby="handoff-title">
        <p className="handoff-eyebrow">给陪伴的大人</p>
        <h2 id="handoff-title">设置好啦，可以交给孩子了</h2>
        <ul>
          {!trainer&&!handoff.avatar&&<li><Icon name="hand" size={32}/><span>先让孩子<b>点一个喜欢的形象</b>，伙伴会用声音告诉孩子。</span></li>}
          <li><Icon name="play" size={32}/><span>孩子只要点<b>亮着的绿色大圆圈</b>，伙伴会用声音带着做。</span></li>
          <li><Icon name="ear" size={32}/><span>没听清时，点右上角<b>帮助</b>里的「听一听」再听一次。</span></li>
          <li><Icon name="rest" size={32}/><span>想停就停，进度会留在这台设备上。</span></li>
        </ul>
        <button className="btn-big handoff-go" onClick={()=>{const avatar=handoff.avatar;withTransition(()=>setHandoff(null));if(trainer||avatar){void begin(avatar);return;}
          // The child cannot read the picker's title: the friend says it as the device is handed over.
          unlockAudio();void say(["zh","选一个你喜欢的样子吧！"],["en","Choose your look!"]);}}><Icon name="hand" size={36}/>交给孩子</button>
      </section></BlockingDialog>}
    </div>
  );
}
