import { worldArt } from '../data/sceneArt';
import { Announcements } from '../components/Announcements';
import { FeatureGuide } from '../components/FeatureGuide';
import { useGame } from "../store";
import { say, unlockAudio, sfx, wait } from "../lib/speech";
import { requestPersist } from "../lib/db";
import { creatureAvatar, WELCOME_CAST } from "../data/creatures";
import { AVATARS, Icon } from "../icons";
import { CreatureImg } from "../components/CreatureImg";
import { DeviceSetup } from "../components/DeviceSetup";
import { TrainerAvatar } from "../components/TrainerAvatar";
import {useState} from 'react';
import {ParentLinks, ParentNotice} from '../components/ParentSupport';
import {hasReadParentNotice} from '../lib/parentNotice';
import {AuthorContact, SourceRepositoryLink} from '../components/AuthorContact';
import {MusicToggle} from '../components/MusicToggle';


export function Welcome() {
  const trainer = useGame((s) => s.save.trainer);
  const createTrainer = useGame((s) => s.createTrainer);
  const go = useGame((s) => s.go);
  const [notice,setNotice]=useState<{avatar?:string}|null>(null);
  const [handoff,setHandoff]=useState<{avatar?:string}|null>(null);
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
      say(["zh", "欢迎你，小岛主人！"], ["en", "Welcome to Bubbly Isle!"], ["en", "Here is an invite berry for you!"]);
    } else {
      go({ name: "home" });
      await wait(300);
      if(useGame.getState().screen.name!=="home")return;
      say(["zh", "欢迎回来！"], ["en", "Welcome back!"]);
    }
  };

  return (
    <div className="screen welcome illustrated-welcome">
      <img className="welcome-landscape" src={worldArt('welcome')} alt="" aria-hidden="true" {...{fetchpriority:"high"}} draggable={false}/>
      <nav className="welcome-tools" aria-label="音乐、项目与作者"><MusicToggle/><Announcements/><SourceRepositoryLink/><AuthorContact/></nav>
      <div className="welcome-content">
      <div className="welcome-pokemon">
        {WELCOME_CAST.map((id, i) => (
          <CreatureImg key={id} src={creatureAvatar(id)} alt="" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
      <div className="welcome-title-board">
        <Icon name="leaf" size={40} className="welcome-title-leaf" />
        <h1 className="logo">啵啵岛</h1>
        <div className="logo-en">Bubbly Isle</div>
      </div>
      {trainer ? (
        <button className="start welcome-enter" onClick={() => requestBegin()} aria-label="一起出发 Let’s play!">
          <span className="enter-avatar"><TrainerAvatar avatar={trainer.avatar} photo={trainer.avatarPhoto} size={64}/></span>
          <span className="enter-copy"><strong>一起出发</strong><span lang="en">Let’s play!</span></span>
          <span className="enter-arrow" aria-hidden="true">›</span>
        </button>
      ) : (
        <div className="avatar-pick">
          <header className="help-heading avatar-heading"><div className="hint">选一个你喜欢的形象<small lang="en">Choose your look</small></div><FeatureGuide id="welcome" autoVoice={false}/></header>
          <div className="avatar-row">
            {AVATARS.map((a, i) => (
              <button key={a} className="avatar-choice" onClick={() => requestBegin(a)} aria-label={`选择形象 ${i + 1}`}><Icon name={a} size={120} /></button>
            ))}
          </div>
        </div>
      )}
      </div>
      <DeviceSetup />
      <ParentLinks/>
      {notice&&<ParentNotice onClose={()=>setNotice(null)} onContinue={()=>{const avatar=notice.avatar;setNoticeRead(true);setNotice(null);setHandoff({avatar});}}/>}
      {handoff&&<div className="modal-backdrop handoff-backdrop"><section className="modal handoff-card" role="dialog" aria-modal="true" aria-labelledby="handoff-title">
        <p className="handoff-eyebrow">给陪伴的大人</p>
        <h2 id="handoff-title">设置好啦，可以交给孩子了</h2>
        <ul>
          <li><Icon name="play" size={32}/><span>孩子只要点<b>亮着的绿色大圆圈</b>，伙伴会用声音带着做。</span></li>
          <li><Icon name="ear" size={32}/><span>没听清时，点右上角<b>帮助</b>里的「听一听」再听一次。</span></li>
          <li><Icon name="rest" size={32}/><span>想停就停，进度会留在这台设备上。</span></li>
        </ul>
        <button className="btn-big handoff-go" onClick={()=>{const avatar=handoff.avatar;setHandoff(null);void begin(avatar);}}><Icon name="hand" size={36}/>交给孩子</button>
      </section></div>}
    </div>
  );
}
