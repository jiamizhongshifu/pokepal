import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useGame } from '../store';
import { learningPath, withReview, withWelcomeFriend, pathStars, pathNodes, chapterProgress, type PathNode } from '../lib/learningPath';
import { say, stopSpeech, sfx } from '../lib/speech';
import { STORIES } from '../data/stories';
import { creatureArt } from '../data/creatures';
import { Icon } from '../icons';
import { CreatureImg } from '../components/CreatureImg';
import { TrainerAvatar } from '../components/TrainerAvatar';
import { AvatarEditor } from '../components/AvatarEditor';
import { ParentButton } from '../components/TopBar';
import { InviteBerry } from '../components/InviteBerry';
import { BottomNav } from '../components/BottomNav';
import { FeatureGuide } from '../components/FeatureGuide';
import './path-home.css';

/** Gentle left-right sway of the stops, in px, like a winding path. */
const SWAY = [0, 46, 70, 46, 0, -46, -70, -46];
const CHAPTER_COLOR = ['primary', 'sky', 'gem', 'streak', 'sun', 'danger'] as const;
const KIND_LABEL: Record<PathNode['kind'], string> = { lesson: '学一学', story: '听故事', island: '去小岛', friend: '新朋友', diary: '说一说', review: '再见面', welcome: '交朋友' };

export function PathHome() {
 const save = useGame(s => s.save), go = useGame(s => s.go), start = useGame(s => s.startUnit);
 const celebrate = useGame(s => s.celebratePath), claimFriend = useGame(s => s.claimChapterFriend), openDiary = useGame(s => s.openChapterDiary);
 const route = useMemo(() => learningPath(save), [save]);
 const path = useMemo(() => withWelcomeFriend(save, withReview(save, route)), [save, route]);
 const stars = pathStars(route, save);
 const friend = save.captures.find(c => save.settings.favorites.includes(c.id)) ?? save.captures[0];
 const [editing, setEditing] = useState(false);
 const [nudge, setNudge] = useState<string | null>(null);
 const [lit, setLit] = useState<string[]>([]);
 const currentRef = useRef<HTMLLIElement>(null);

 // Stops finished since the last visit light up once; island stops hand out their upgrade at the same moment.
 useEffect(() => {
  const done = pathNodes(route).filter(n => n.state === 'done').map(n => n.key);
  const fresh = celebrate(done);
  if (fresh.length) { setLit(fresh); sfx('sparkle'); const t = setTimeout(() => setLit([]), 1600); return () => clearTimeout(t); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);
 useEffect(() => { currentRef.current?.scrollIntoView({ block: 'center' }); }, []);
 useEffect(() => () => stopSpeech(), []);

 const open = async (node: PathNode) => {
  if (node.state === 'locked') {
   sfx('boop'); setNudge(node.key); setTimeout(() => setNudge(n => n === node.key ? null : n), 600);
   if (node.unit) void say(['zh', node.unit.mission]);
   return;
  }
  stopSpeech(); sfx('click');
  if (node.kind === 'lesson') start(node.unit!.id);
  else if (node.kind === 'story') go({ name: 'story', id: node.storyId! });
  else if (node.kind === 'island') go({ name: 'home', station: node.station });
  else if (node.kind === 'welcome') go({ name: 'catch' });
  else if (node.kind === 'review') go({ name: 'review', keys: node.reviewKeys!, returnTo: 'home' });
  else if (node.kind === 'diary') { openDiary(node.chapter); go({ name: 'diary' }); }
  else if (node.state === 'done') go({ name: 'dex' });
  else if (await claimFriend(node.chapter)) go({ name: 'catch' });
 };

 return <div className="screen path-home">
  <header className="path-header">
   <button className="path-avatar" aria-label="更换我的头像" onClick={() => setEditing(true)}><TrainerAvatar avatar={save.trainer?.avatar} photo={save.trainer?.avatarPhoto} size={44} /></button>
   <div className="path-stats">
    <span className="path-stat" aria-label={`已经点亮 ${stars} 颗星星`}><Icon name="star" size={30} /><b>{stars}</b></span>
    <button className="path-stat" aria-label={`邀请果 ${save.balls.poke} 个${save.balls.poke ? '，去草丛认识新伙伴' : ''}`} disabled={save.balls.poke < 1} onClick={() => go({ name: 'catch' })}><InviteBerry type="poke" size={30} /><b>{save.balls.poke}</b></button>
   </div>
   <div className="path-header-tools"><FeatureGuide id="path" compact /><ParentButton onOpen={() => go({ name: 'parent' })} /></div>
  </header>

  <main className="path-main">
   {path.map(chapter => <section key={chapter.index} className={`path-chapter tone-${CHAPTER_COLOR[chapter.index % CHAPTER_COLOR.length]}`} aria-label={`第 ${chapter.index + 1} 章 ${chapter.title}`}>
    <div className="path-banner">
     <small>第 {chapter.index + 1} 章 · {chapterProgress(chapter).done} / {chapterProgress(chapter).total}</small>
     <h2>{chapter.title}</h2>
     <p>{chapter.goal}</p>
    </div>
    <ol className="path-nodes">
     {chapter.nodes.map(node => {
      const style = { '--sway': `${SWAY[node.index % SWAY.length]}px` } as CSSProperties;
      const current = node.state === 'current';
      const met = node.kind === 'friend' ? save.path?.friends[String(node.chapter)] : undefined;
      const title = node.kind === 'story' ? STORIES.find(s => s.id === node.storyId)?.title ?? node.title : node.title;
      return <li key={node.key} ref={current ? currentRef : undefined} className={`path-node kind-${node.kind} is-${node.state}${nudge === node.key ? ' is-nudged' : ''}${lit.includes(node.key) ? ' is-lit' : ''}`} style={style}>
       {current && <span className="path-start" aria-hidden="true">{KIND_LABEL[node.kind]}！<small lang="en">Start</small></span>}
       <button type="button" className="path-node-button" onClick={() => void open(node)}
        aria-label={`${node.kind === 'review' || node.kind === 'welcome' ? '' : `第 ${node.index + 1} 站，`}${KIND_LABEL[node.kind]}，${title}，${node.state === 'done' ? '已完成，可以再去看看' : current ? '现在开始' : node.state === 'open' ? '也可以直接学这一站' : '还没解锁'}`}>
        {met ? <CreatureImg className="path-node-friend" src={creatureArt(met)} alt="" />
         : <Icon name={node.state === 'locked' ? 'lock' : node.state === 'done' && node.kind === 'lesson' ? 'check' : node.icon} size={current ? 44 : 36} />}
       </button>
       <span className="path-node-title">{title}</span>
       {current && friend && <CreatureImg className={`path-buddy ${SWAY[node.index % SWAY.length] > 0 ? 'on-left' : 'on-right'}`} src={creatureArt(friend.id)} alt="" />}
      </li>;
     })}
    </ol>
   </section>)}
   <p className="path-end">走完这条路，伙伴们会一起庆祝哦！</p>
   <nav className="path-more" aria-label="还想多玩一会儿">
    <button type="button" onClick={() => go({ name: 'practice' })}><Icon name="target" size={32} />小游戏</button>
    <button type="button" onClick={() => go({ name: 'stories' })}><Icon name="book" size={32} />故事书架</button>
   </nav>
  </main>
  <BottomNav active="path" />
  {editing && <AvatarEditor onClose={() => setEditing(false)} />}
 </div>;
}
