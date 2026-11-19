import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useGame } from '../store';
import { learningPath, pathStars, destinationIcon, type PathNode } from '../lib/learningPath';
import { say, stopSpeech, sfx } from '../lib/speech';
import { creatureArt } from '../data/creatures';
import { Icon } from '../icons';
import { CreatureImg } from '../components/CreatureImg';
import { TrainerAvatar } from '../components/TrainerAvatar';
import { AvatarEditor } from '../components/AvatarEditor';
import { ParentButton } from '../components/TopBar';
import { InviteBerry } from '../components/InviteBerry';
import { BottomNav } from '../components/BottomNav';
import './path-home.css';

/** Gentle left-right sway of the stops, in px, like a winding path. */
const SWAY = [0, 46, 70, 46, 0, -46, -70, -46];
const CHAPTER_COLOR = ['primary', 'sky', 'gem', 'streak', 'sun', 'danger'] as const;

export function PathHome() {
 const save = useGame(s => s.save), go = useGame(s => s.go), start = useGame(s => s.startUnit);
 const path = useMemo(() => learningPath(save), [save]);
 const stars = pathStars(path);
 const friend = save.captures.find(c => save.settings.favorites.includes(c.id)) ?? save.captures[0];
 const [editing, setEditing] = useState(false);
 const [nudge, setNudge] = useState<string | null>(null);
 const currentRef = useRef<HTMLLIElement>(null);

 useEffect(() => { currentRef.current?.scrollIntoView({ block: 'center' }); }, []);
 useEffect(() => () => stopSpeech(), []);

 const open = (node: PathNode) => {
  if (node.state === 'locked') {
   sfx('boop'); setNudge(node.key); setTimeout(() => setNudge(n => n === node.key ? null : n), 600);
   void say(['zh', node.unit.mission]);
   return;
  }
  stopSpeech(); sfx('click'); start(node.unit.id);
 };

 return <div className="screen path-home">
  <header className="path-header">
   <button className="path-avatar" aria-label="更换我的头像" onClick={() => setEditing(true)}><TrainerAvatar avatar={save.trainer?.avatar} photo={save.trainer?.avatarPhoto} size={44} /></button>
   <div className="path-stats">
    <span className="path-stat" aria-label={`已经点亮 ${stars} 颗星星`}><Icon name="star" size={30} /><b>{stars}</b></span>
    <button className="path-stat" aria-label={`邀请果 ${save.balls.poke} 个`} onClick={() => go({ name: 'shop' })}><InviteBerry type="poke" size={30} /><b>{save.balls.poke}</b></button>
   </div>
   <ParentButton onOpen={() => go({ name: 'parent' })} />
  </header>

  <main className="path-main">
   {path.map(chapter => <section key={chapter.index} className={`path-chapter tone-${CHAPTER_COLOR[chapter.index % CHAPTER_COLOR.length]}`} aria-label={`第 ${chapter.index + 1} 章 ${chapter.title}`}>
    <div className="path-banner">
     <small>第 {chapter.index + 1} 章 · {chapter.done} / {chapter.nodes.length}</small>
     <h2>{chapter.title}</h2>
     <p>{chapter.goal}</p>
    </div>
    <ol className="path-nodes">
     {chapter.nodes.map((node, i) => {
      const style = { '--sway': `${SWAY[(node.index) % SWAY.length]}px` } as CSSProperties;
      const current = node.state === 'current';
      return <li key={node.key} ref={current ? currentRef : undefined} className={`path-node is-${node.state}${nudge === node.key ? ' is-nudged' : ''}`} style={style}>
       {current && <span className="path-start" aria-hidden="true">开始！<small lang="en">Start</small></span>}
       <button type="button" className="path-node-button" onClick={() => open(node)}
        aria-label={`第 ${node.index + 1} 站，${node.unit.title}，${node.state === 'done' ? '已完成，可以再玩一次' : current ? '现在开始' : '还没解锁，听听介绍'}`}>
        <Icon name={node.state === 'done' ? 'check' : node.state === 'locked' ? 'lock' : destinationIcon(node.unit)} size={node.state === 'current' ? 44 : 36} />
       </button>
       <span className="path-node-title">{node.unit.title}</span>
       {current && friend && <CreatureImg className={`path-buddy ${SWAY[node.index % SWAY.length] > 0 ? 'on-left' : 'on-right'}`} src={creatureArt(friend.id)} alt="" />}
       {i === chapter.nodes.length - 1 && <span className="path-chest" aria-hidden="true"><Icon name={chapter.done === chapter.nodes.length ? 'trophy' : 'gift'} size={44} /></span>}
      </li>;
     })}
    </ol>
   </section>)}
   <p className="path-end">走完这条路，伙伴们会一起庆祝哦！</p>
  </main>
  <BottomNav active="path" />
  {editing && <AvatarEditor onClose={() => setEditing(false)} />}
 </div>;
}
