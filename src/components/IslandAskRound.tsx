import { useEffect, useRef, useState } from 'react';
import { useGame } from '../store';
import { Icon } from '../icons';
import { CreatureImg } from './CreatureImg';
import { creatureArt } from '../data/creatures';
import { TrainerAvatar } from './TrainerAvatar';
import { LearningArt } from './LearningItem';
import { learningVoice } from '../lib/learningVoice';
import { sayOnIsland as say } from '../lib/islandSpeech';
import { sfx } from '../lib/speech';
import { classifyResponse } from '../lib/learningProgress';
import { ISLAND_SOURCE, type IslandAsk } from '../lib/islandAsk';
import './island-ask.css';

/**
 * The friend says one learned word or sentence; the child taps the matching picture. A wrong tap makes the friend
 * say it again and the pictures move; after two, the right one is shown. Each round is one "used on the island"
 * answer opportunity, kept apart from lessons.
 */
export function IslandAskRound({ ask, speaker, station, onSolved, onClose, countIcon }: {
 ask: IslandAsk; speaker?: number; station: string; onSolved: (id: string) => void; onClose: () => void; countIcon?: string;
}) {
 const [order, setOrder] = useState(0), [shown, setShown] = useState(false), [wrong, setWrong] = useState<string | null>(null), [done, setDone] = useState(false);
 const trace = useRef({ firstAnswer: null as null | 'correct' | 'wrong', replays: 0, heard: false, tries: 0, wrongs: 0 });
 const live = useRef(true), recorded = useRef(false);
 const options = ask.options.map((_, i) => ask.options[(i + order) % ask.options.length]);
 const hear = async (replay = false) => {
  if (replay && trace.current.firstAnswer === null) trace.current.replays++;
  const ok = await say(...learningVoice(ask.prompt));
  if (ok && live.current) { trace.current.heard = true; useGame.getState().noteStationLearning(station, ask.prompt.key, false); }
 };
 const record = (outcome: 'solved' | 'left') => {
  if (recorded.current) return; recorded.current = true;
  const t = trace.current;
  useGame.getState().noteOpportunity({ source: ISLAND_SOURCE(ask.play), key: ask.prompt.key, kind: classifyResponse({ firstAnswer: t.firstAnswer, replays: t.replays, modelShown: shown, heardBeforeAnswer: t.heard, outcome }), tries: t.tries, replays: t.replays });
 };
 useEffect(() => { live.current = true; const start = setTimeout(() => void hear(), 250); return () => { clearTimeout(start); live.current = false; if (trace.current.tries) setTimeout(() => record('left'), 0); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
 const tap = (id: string) => {
  if (done) return;
  const t = trace.current; t.tries++;
  if (t.firstAnswer === null) t.firstAnswer = id === ask.answer ? 'correct' : 'wrong';
  if (id === ask.answer) { setDone(true); sfx('ding'); record('solved'); onSolved(id); return; }
  t.wrongs++; sfx('boop'); setWrong(id);
  if (t.wrongs >= 2) setShown(true);
  setTimeout(() => { if (!live.current) return; setWrong(null); setOrder(o => o + 1); void hear(); }, 600);
 };
 return <section className="island-ask" aria-label="伙伴想说一句">
  <header>{speaker !== undefined && <CreatureImg className="island-ask-speaker" src={creatureArt(speaker)} alt="" />}
   <button className="island-ask-hear" onClick={() => void hear(true)} aria-label="再听一次"><Icon name="speaker" size={30} /><span>再听一次</span></button>
   <button className="island-ask-close" onClick={onClose} aria-label="先不玩了"><Icon name="close" size={24} /></button></header>
  <div className="island-ask-options">{options.map(o => <button key={o.id} className={`${shown && o.id === ask.answer ? 'is-shown' : ''}${wrong === o.id ? ' is-wrong' : ''}`} aria-label={o.label} onClick={() => tap(o.id)}>
   {o.entry ? <LearningArt entry={o.entry} countIcon={countIcon} /> : o.avatar ? <TrainerAvatar avatar={o.avatar} photo={o.photo} size={80} /> : <CreatureImg src={o.image!} alt="" />}<small>{o.label}</small></button>)}</div>
  <p className="island-ask-hint" role="status">{shown ? '看，亮起来的就是它。' : wrong ? '再听一听。' : '听伙伴说，点一点。'}</p>
 </section>;
}
