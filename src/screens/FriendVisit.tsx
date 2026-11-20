import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../store';
import { TopBar } from '../components/TopBar';
import { FeatureGuide } from '../components/FeatureGuide';
import { Confetti } from '../components/Celebration';
import { CreatureImg } from '../components/CreatureImg';
import { CREATURES, creatureArt } from '../data/creatures';
import { visitors, homeOpen } from '../island/visits';
import { unlockingUnit } from '../lib/islandPlan';
import { storyBackground, storyProp } from '../data/sceneArt';
import { pickRandom } from '../data/words';
import { say, playCry, sfx, stopSpeech } from '../lib/speech';
import { homeOf } from '../island/world';
import { Icon } from '../icons';
import type { Creature } from '../types';
import './friend-visit.css';

type Phase = 'choose' | 'arriving' | 'greet' | 'friends';

/**
 * A new friend comes to Bubbly Isle by boat: choose which boat to welcome, it sails to the pier, the friend says hello,
 * and the child says hello back. Each invite berry the path gives is one friend coming to visit.
 */
export function FriendVisit() {
 const save = useGame(s => s.save), go = useGame(s => s.go), inviteFriend = useGame(s => s.inviteFriend), setCatchWish = useGame(s => s.setCatchWish);
 const wish = CREATURES.find(p => p.id === save.catchWish && !save.captures.some(c => c.id === p.id));
 const [phase, setPhase] = useState<Phase>('choose');
 const [guest, setGuest] = useState<Creature | null>(null);
 const [round, setRound] = useState({ n: 0, previous: [] as number[] });
 const live = useRef(true), busy = useRef(false);
 useEffect(() => { live.current = true; return () => { live.current = false; stopSpeech(); }; }, []);
 const ready = save.balls.poke > 0;
 // Babies not yet met first, favourites first; "other boats" brings different friends when there are enough.
 const boats = useMemo(() => {
  if (wish) return [wish];
  const allowed = visitors(save);
  if (round.n > 0) { const fresh = pickRandom(allowed.filter(p => !round.previous.includes(p.id)), 3); return [...fresh, ...pickRandom(allowed.filter(p => !fresh.includes(p)), 3 - fresh.length)]; }
  // The first three boats bring friends whose home is already open (favourites first), so they can be found at home.
  const atHome = allowed.filter(p => homeOpen(save, p)), first = atHome.length >= 3 ? atHome : allowed;
  const fav = first.filter(p => save.settings.favorites.includes(p.id));
  return [...fav, ...pickRandom(first.filter(p => !fav.includes(p)), 3)].slice(0, 3);
 }, [wish?.id, round]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(() => { if (phase === 'choose' && ready && boats.length) void say(['en', 'Which one do you like?']); }, [phase, ready]); // eslint-disable-line react-hooks/exhaustive-deps

 const welcome = (p: Creature) => {
  if (!ready || busy.current) return;
  busy.current = true; stopSpeech(); sfx('pop'); setGuest(p); setPhase('arriving');
  setTimeout(async () => {
   if (!live.current) return;
   setPhase('greet'); busy.current = false;
   await playCry(p.id);
   if (live.current) void say(['en', `Hi! I'm ${p.nameEn}!`], ['zh', `我是${p.nameZh}！`]).then(ok => { if (ok) useGame.getState().noteWord(p.nameEn, 'heard'); });
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 1800);
 };
 const greet = async () => {
  if (!guest || busy.current) return;
  busy.current = true; stopSpeech();
  const ok = await inviteFriend(guest.id);
  busy.current = false;
  if (!live.current) return;
  if (!ok) { setGuest(null); setPhase('choose'); return; }
  setPhase('friends'); sfx('sparkle');
  await say(['en', 'Hello, friend!'], ['en', `${guest.nameEn} is your new friend!`], ['zh', `${guest.nameZh}成了你的新朋友！`]);
  if (live.current) void playCry(guest.id);
 };
 const otherBoats = () => {
  if (wish) setCatchWish(null);
  setRound(r => ({ n: r.n + 1, previous: boats.map(p => p.id) }));
  sfx('pop'); void say(['en', "Let's meet new friends!"], ['zh', '发现新伙伴啦！你想和谁打招呼？']);
 };

 return <div className={`screen friend-visit phase-${phase}`} style={{ backgroundImage: `url(${storyBackground('beach')})` }}>
  <TopBar title="朋友来做客" onBack={() => go({ name: 'home' })} focused help={<FeatureGuide compact id="catch" enabled={phase === 'choose'} autoVoice={false} />} />
  <main className="friend-visit-sea">
   {phase === 'choose' && (!ready ? <section className="friend-visit-note"><Icon name="sign" size={48} /><h1>新朋友会坐船来</h1><p>走到学习路线上的“新朋友”站，就会有一位小精灵坐船来做客。</p><button className="btn-big" onClick={() => go({ name: 'home' })}><Icon name="sign" size={36} />去学习路线</button></section>
    : !boats.length ? <section className="friend-visit-note"><Icon name="heart" size={48} /><h1>大家都是好朋友啦</h1><button className="btn-big" onClick={() => go({ name: 'dex' })}><Icon name="dex" size={36} />看看好朋友</button></section>
    : <><h1 className="friend-visit-title">谁坐船来呢？点一艘小船</h1>
     <div className="friend-visit-boats">{boats.map((p, i) => <button key={p.id} className="friend-boat" style={{ animationDelay: `${i * 0.4}s` }} aria-label={`请${p.nameZh}来做客`} onClick={() => welcome(p)}>
      <CreatureImg className="friend-boat-guest" src={creatureArt(p.id)} alt="" /><img className="friend-boat-hull" src={storyProp('visit-boat')} alt="" draggable={false} /><span>{p.nameZh}</span></button>)}</div>
     {!wish && visitors(save).length > 3 && <button className="friend-visit-more" onClick={otherBoats}><Icon name="refresh" size={28} />看看别的小船</button>}</>)}
   {guest && phase !== 'choose' && <div className={`friend-arrival is-${phase}`}>
    <div className="friend-pier-boat"><CreatureImg className="friend-boat-guest" src={creatureArt(guest.id)} alt="" /><img className="friend-boat-hull" src={storyProp('visit-boat')} alt="" draggable={false} /></div>
    {phase === 'arriving' && <p className="friend-visit-status" role="status">小船靠岸啦……</p>}
    {phase === 'greet' && <><p className="friend-visit-status" role="status">{guest.nameZh}来做客啦，和它打个招呼吧</p>
     <button className="btn-big friend-hello" onClick={() => void greet()}><Icon name="hand" size={40} /><span lang="en">Hello!</span></button></>}
    {phase === 'friends' && <section className="friend-visit-done" role="status"><Confetti />
     <h1>{guest.nameZh}成了你的新朋友！</h1><p>{homeOpen(save, guest) ? `它的家在${homeOf(guest.species).name}，以后可以去那里找它玩。` : `它的家在${homeOf(guest.species).name}，学到「${unlockingUnit(homeOf(guest.species).district)?.title ?? ''}」那里就开放啦。现在先在帐篷边玩。`}</p>
     <div className="friend-visit-actions"><button className="btn-big" onClick={() => go({ name: 'home', view: 'island', companion: guest.id })}><Icon name="island" size={36} />带它回小岛</button>
      <button className="btn-big alt" onClick={() => go({ name: 'dexDetail', id: guest.id })}><Icon name="dex" size={36} />认识它</button></div></section>}
   </div>}
  </main>
 </div>;
}
