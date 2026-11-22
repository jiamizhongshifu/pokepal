import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../store';
import { learningPath, withReview, withWelcomeFriend, pathNodes, currentNode, chapterProgress, PATH_COMPLETE, type PathNode } from '../lib/learningPath';
import { bubblePictures, leftBehind, sceneSpots } from '../lib/pathScene';
import { Confetti } from '../components/Celebration';
import { say, stopSpeech, sfx } from '../lib/speech';
import { STORIES } from '../data/stories';
import { creatureArt, creatureExpression } from '../data/creatures';
import { pathArt } from '../data/sceneArt';
import { Icon } from '../icons';
import { CreatureImg } from '../components/CreatureImg';
import { TrainerAvatar } from '../components/TrainerAvatar';
import { AvatarEditor } from '../components/AvatarEditor';
import { ParentButton } from '../components/TopBar';
import { InviteBerry } from '../components/InviteBerry';
import { BottomNav } from '../components/BottomNav';
import { FeatureGuide } from '../components/FeatureGuide';
import './path-scene.css';

const KIND_LABEL: Record<PathNode['kind'], string> = { lesson: '学一学', story: '听故事', island: '去小岛', friend: '新朋友', diary: '说一说', review: '再见面', welcome: '交朋友' };

/**
 * The learning path as a picture book: one scene for each chapter, turned like pages. A stop is something in the
 * scene. Today's stop is the friend waiting there with a picture of what it is about; finished stops show what was
 * left behind; stops not reached yet are under a cloud.
 */
export function PathHome() {
 const save = useGame(s => s.save), go = useGame(s => s.go), start = useGame(s => s.startUnit);
 const celebrate = useGame(s => s.celebratePath), claimFriend = useGame(s => s.claimChapterFriend), openDiary = useGame(s => s.openChapterDiary);
 const route = useMemo(() => learningPath(save), [save]);
 const path = useMemo(() => withWelcomeFriend(save, withReview(save, route)), [save, route]);
 const now = pathNodes(path).find(n => n.state === 'current');
 const friend = save.captures.find(c => save.settings.favorites.includes(c.id)) ?? save.captures[0];
 const [page, setPage] = useState(() => now?.chapter ?? path.length - 1);
 const [editing, setEditing] = useState(false);
 const [nudge, setNudge] = useState<string | null>(null);
 const [lit, setLit] = useState<string[]>([]);
 const view = useRef<HTMLDivElement>(null), here = useRef<HTMLDivElement>(null);

 // Stops finished since the last visit light up once; finishing the whole path is celebrated once too.
 const finished = !currentNode(route);
 const [celebrating, setCelebrating] = useState(false);
 useEffect(() => {
  const done = pathNodes(route).filter(n => n.state === 'done').map(n => n.key);
  const fresh = celebrate(finished ? [...done, PATH_COMPLETE] : done);
  if (fresh.includes(PATH_COMPLETE)) { setCelebrating(true); void say(['en', 'You did it!']); }
  if (fresh.length) { setLit(fresh); sfx('sparkle'); const t = setTimeout(() => setLit([]), 1600); return () => clearTimeout(t); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);
 // On a tall phone the scene is wider than the screen: bring today's stop (or the middle) into view.
 useEffect(() => {
  const v = view.current;
  if (!v || v.scrollWidth <= v.clientWidth) return;
  if (here.current) here.current.scrollIntoView({ inline: 'center', block: 'nearest' }); else v.scrollLeft = (v.scrollWidth - v.clientWidth) / 2;
 }, [page]);
 useEffect(() => () => stopSpeech(), []);

 const hear = (node: PathNode) => { stopSpeech(); if (node.unit) void say(['zh', node.unit.mission]); };
 const open = async (node: PathNode) => {
  if (node.state === 'locked') { sfx('boop'); setNudge(node.key); setTimeout(() => setNudge(n => n === node.key ? null : n), 600); hear(node); return; }
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
 const turn = (to: number) => { if (to < 0 || to >= path.length) return; stopSpeech(); sfx('click'); setPage(to); };

 const chapter = path[Math.min(page, path.length - 1)], spots = sceneSpots(chapter.nodes);
 return <div className="screen path-scene">
  <div className="path-view" ref={view}>
   <section className={`path-world tone-${chapter.index % 6}`} aria-label={`第 ${chapter.index + 1} 章 ${chapter.title}`}>
    <img className="path-world-art" src={pathArt(chapter.index)} alt="" draggable={false} />
    {chapter.nodes.map((node, i) => {
     const title = node.kind === 'story' ? STORIES.find(s => s.id === node.storyId)?.title ?? node.title : node.title;
     const met = node.kind === 'friend' ? save.path?.friends[String(node.chapter)] : undefined;
     const label = `${node.kind === 'review' || node.kind === 'welcome' ? '' : `第 ${node.index + 1} 站，`}${KIND_LABEL[node.kind]}，${title}，${node.state === 'done' ? '已完成，可以再去看看' : node.state === 'current' ? '现在开始' : node.state === 'open' ? '也可以直接学这一站' : '还没解锁'}`;
     const style = { left: `${spots[i][0]}%`, top: `${spots[i][1]}%` };
     const name = <span className="stop-name">{node.state === 'current' && <small>{KIND_LABEL[node.kind]}</small>}{title}</span>;
     if (node.state === 'current') return <div key={node.key} ref={here} className={`path-stop is-current kind-${node.kind}`} style={style}>
      {friend && <CreatureImg className="stop-friend" src={creatureExpression(friend.id, 'hello')} alt="" />}
      <button type="button" className="stop-bubble" aria-label="听一听这一站要做什么" onClick={() => hear(node)}>{bubblePictures(node).map(icon => <Icon key={icon} name={icon} size={44} />)}{node.unit && <Icon name="speaker" size={26} className="stop-bubble-hear" />}</button>
      <button type="button" className="stop-token stop-go" aria-label={label} onClick={() => void open(node)}><Icon name="play" size={56} /></button>
      {name}
     </div>;
     return <button key={node.key} type="button" className={`path-stop is-${node.state} kind-${node.kind}${nudge === node.key ? ' is-nudged' : ''}${lit.includes(node.key) ? ' is-lit' : ''}`} style={style} aria-label={label} onClick={() => void open(node)}>
      <span className="stop-token">{met ? <CreatureImg className="stop-art" src={creatureArt(met)} alt="" /> : <Icon name={node.state === 'done' ? leftBehind(node) : node.icon} size={64} className="stop-art" />}</span>
      {node.state === 'done' && <Icon name="star" size={30} className="stop-badge is-star" />}
      {node.state === 'locked' && <Icon name="lock" size={24} className="stop-badge is-lock" />}
      {name}
     </button>;
    })}
   </section>
  </div>

  <header className="path-top">
   <div className="path-me">
    <button className="path-avatar" aria-label="更换我的头像" onClick={() => setEditing(true)}><TrainerAvatar avatar={save.trainer?.avatar} photo={save.trainer?.avatarPhoto} size={44} /></button>
    {save.balls.poke > 0 && <button className="path-berry" aria-label={`邀请果 ${save.balls.poke} 个，去海边迎接新朋友`} onClick={() => go({ name: 'catch' })}><InviteBerry type="poke" size={30} /><b>{save.balls.poke}</b></button>}
   </div>
   <div className="path-chapter">
    <button type="button" className="path-turn" aria-label="上一章" disabled={chapter.index === 0} onClick={() => turn(chapter.index - 1)}><Icon name="back" size={30} /></button>
    <div className={`path-plaque tone-${chapter.index % 6}`}>
     <small>第 {chapter.index + 1} 章<i aria-hidden="true">·</i>{chapterProgress(chapter).done} / {chapterProgress(chapter).total}</small>
     <strong>{chapter.title}</strong>
     <ol className="path-pages" aria-label="六章">{path.map(c => <li key={c.index}><button type="button" className={`${c.index === chapter.index ? 'is-here' : ''}${c.nodes.every(n => n.state === 'done') ? ' is-done' : ''}`} aria-label={`第 ${c.index + 1} 章 ${c.title}`} aria-current={c.index === chapter.index ? 'page' : undefined} onClick={() => turn(c.index)} /></li>)}</ol>
    </div>
    <button type="button" className="path-turn is-next" aria-label="下一章" disabled={chapter.index === path.length - 1} onClick={() => turn(chapter.index + 1)}><Icon name="back" size={30} /></button>
   </div>
   <div className="path-tools"><FeatureGuide id="path" compact /><ParentButton onOpen={() => go({ name: 'parent' })} /></div>
  </header>
  <nav className="path-extra" aria-label="还想多玩一会儿">
   {finished && <button type="button" onClick={() => go({ name: 'notebook' })}><Icon name="refresh" size={30} /><span>老朋友</span></button>}
   <button type="button" onClick={() => go({ name: 'practice' })}><Icon name="target" size={30} /><span>小游戏</span></button>
   <button type="button" onClick={() => go({ name: 'stories' })}><Icon name="book" size={30} /><span>故事书架</span></button>
  </nav>
  {celebrating && <Confetti />}
  <BottomNav active="path" />
  {editing && <AvatarEditor onClose={() => setEditing(false)} />}
 </div>;
}
