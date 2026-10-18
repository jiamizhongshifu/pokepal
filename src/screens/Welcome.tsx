import { Announcements } from '../components/Announcements';
import { FeatureGuide } from '../components/FeatureGuide';
import { useGame } from "../store";
import { say, unlockAudio, sfx, wait } from "../lib/speech";
import { requestPersist } from "../lib/db";
import { spriteUrl } from "../data/pokemon";
import { AVATARS, Icon } from "../icons";
import { PokeImg } from "../components/PokeImg";
import { DeviceSetup } from "../components/DeviceSetup";
import { TrainerAvatar } from "../components/TrainerAvatar";
import {useState} from 'react';
import {ParentLinks, ParentNotice} from '../components/ParentSupport';
import {hasReadParentNotice} from '../lib/parentNotice';


export function Welcome() {
  const trainer = useGame((s) => s.save.trainer);
  const createTrainer = useGame((s) => s.createTrainer);
  const go = useGame((s) => s.go);
  const [notice,setNotice]=useState<{avatar?:string}|null>(null);
  const [noticeRead,setNoticeRead]=useState(()=>{try{return hasReadParentNotice(localStorage);}catch{return false;}});
  const requestBegin=(avatar?:string)=>{if(!noticeRead)setNotice({avatar});else void begin(avatar);};

  const begin = async (avatar?: string) => {
    unlockAudio();
    requestPersist();
    sfx("sparkle");
    if (!trainer && avatar) {
      createTrainer(avatar);
      go({ name: "home" });
      await wait(300);
      say(["zh", "欢迎你，小训练师！"], ["en", "Welcome, Trainer!"], ["zh", "送你一个精灵球，去草丛里抓第一只宝可梦吧！"], ["en", "Here is a Poké Ball for you!"]);
    } else {
      go({ name: "home" });
      await wait(300);
      say(["zh", "欢迎回来！"], ["en", "Welcome back!"]);
    }
  };

  return (
    <div className="screen welcome illustrated-welcome">
      <img className="welcome-landscape" src={import.meta.env.VITE_ONLINE?"/art/world/welcome-island-v1.webp":"/art/world/welcome-island-v1.png"} alt="" aria-hidden="true" {...{fetchpriority:"high"}} draggable={false}/>
      <Announcements welcome/>
      <div className="welcome-content">
      <div className="welcome-pokemon">
        {[25, 1, 4, 7, 133].map((id, i) => (
          <PokeImg key={id} src={spriteUrl(id)} alt="" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
      <div className="welcome-title-board">
        <Icon name="leaf" size={40} className="welcome-title-leaf" />
        <h1 className="logo">宝可梦小小训练师</h1>
        <div className="logo-en">Little Pokémon Trainer</div>
      </div>
      {trainer ? (
        <button className="start welcome-enter" onClick={() => requestBegin()} aria-label="一起出发 Let’s play!">
          <span className="enter-avatar"><TrainerAvatar avatar={trainer.avatar} photo={trainer.avatarPhoto} size={64}/></span>
          <span className="enter-copy"><strong>一起出发</strong><span lang="en">Let’s play!</span></span>
          <span className="enter-arrow" aria-hidden="true">›</span>
        </button>
      ) : (
        <div className="avatar-pick">
          <div className="hint">选一个你喜欢的训练师<small lang="en">Choose your trainer</small></div>
          <FeatureGuide id="welcome" autoVoice={false}/>
          <div className="avatar-row">
            {AVATARS.map((a) => (
              <button key={a} className="avatar-choice" onClick={() => requestBegin(a)} aria-label="选择这个训练师"><Icon name={a} size={120} /></button>
            ))}
          </div>
        </div>
      )}
      </div>
      <DeviceSetup />
      <ParentLinks/>
      {notice&&<ParentNotice onClose={()=>setNotice(null)} onContinue={()=>{const avatar=notice.avatar;setNoticeRead(true);setNotice(null);void begin(avatar);}}/>}
    </div>
  );
}
