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
import { ISLAND_SOURCE, seedOf, type IslandAsk } from '../lib/islandAsk';
import type { PlayKind } from '../island/plays';
import './island-ask.css';

/** Where the things of a "find" round lie in the scene (% of its box); the round's seed decides which goes where. */
const SPOTS: ReadonlyArray<readonly [x: number, y: number, tilt: number]> = [[4, 8, -6], [38, 0, 5], [71, 10, -4], [18, 52, 7], [54, 50, -7]];
const HINTS: Record<PlayKind | 'cards', [start: string, again: string]> = {
 cards: ['听伙伴说，点一点。', '再听一听。'], say: ['听伙伴说，点一点。', '再听一听。'],
 do: ['听伙伴说，把它送过去。', '再听一听，它想要哪个？'], find: ['听伙伴问，在画面里找到它。', '再听一听，再找找。'], sort: ['听伙伴说，点那个颜色。', '再听一听。'],
};

/**
 * The friend says one learned word or sentence; the child acts on it. `kind` is the action: tapping a picture card
 * (default), handing the thing to the friend or to `to`, finding it in a small scene, or choosing a colour. A wrong
 * tap makes the friend say it again; after two, the right one is shown. Each round is one "used on the island"
 * answer opportunity and counts toward the item's review, by the same rule as a lesson round.
 */
export function IslandAskRound({ ask, speaker, station, onSolved, onClose, countIcon, kind = 'cards', to }: {
 ask: IslandAsk; speaker?: number; station: string; onSolved: (id: string) => void; onClose: () => void; countIcon?: string;
 kind?: PlayKind | 'cards'; to?: { icon: string; label: string };
}) {
 const [order, setOrder] = useState(0), [shown, setShown] = useState(false), [wrong, setWrong] = useState<string | null>(null), [done, setDone] = useState(false);
 const trace = useRef({ firstAnswer: null as null | 'correct' | 'wrong', replays: 0, heard: false, tries: 0, wrongs: 0 });
 const live = useRef(true), recorded = useRef(false);
 const scene = kind === 'find', give = kind === 'do';
 // Things in a scene stay where they lie; cards change places after a wrong tap.
 const options = scene ? ask.options : ask.options.map((_, i) => ask.options[(i + order) % ask.options.length]);
 const spot = (i: number) => SPOTS[(i + Math.abs(seedOf(ask.answer))) % SPOTS.length];
 const hear = async (replay = false) => {
  if (replay && trace.current.firstAnswer === null) trace.current.replays++;
  const ok = ask.situation ? await say(['zh', ask.situation], ...(ask.model ? learningVoice(ask.prompt) : [])) : await say(...learningVoice(ask.prompt));
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
  useGame.getState().noteAttempt(ask.prompt.key, id === ask.answer, t.wrongs > 0 || shown || !t.heard || !!ask.model, ISLAND_SOURCE(ask.play));
  if (id === ask.answer) {
   setDone(true); sfx('ding'); record('solved');
   // In a situation the chosen sentence is what gets said: the child hears their choice before the island answers.
   if (ask.situation) void say(...learningVoice(ask.prompt)).then(() => { if (live.current) onSolved(id); }); else onSolved(id);
   return;
  }
  t.wrongs++; sfx('boop'); setWrong(id);
  if (t.wrongs >= 2) setShown(true);
  setTimeout(() => { if (!live.current) return; setWrong(null); setOrder(o => o + 1); void hear(); }, 600);
 };
 return <section className="island-ask" aria-label="伙伴想说一句">
  <header>{speaker !== undefined && <CreatureImg className="island-ask-speaker" src={creatureArt(speaker)} alt="" />}
   <button className="island-ask-hear" onClick={() => void hear(true)} aria-label="再听一次" disabled={done}><Icon name="speaker" size={30} /><span>再听一次</span></button>
   <button className="island-ask-close" onClick={onClose} aria-label="先不玩了"><Icon name="close" size={24} /></button></header>
  {ask.situation && <p className="island-ask-situation">{ask.situation}</p>}
  <div className={`island-ask-stage is-${kind}${ask.situation ? ' is-situation' : ''}`}>
   <div className="island-ask-options">{options.map((o, i) => <button key={o.id} className={`${shown && o.id === ask.answer ? 'is-shown' : ''}${wrong === o.id ? ' is-wrong' : ''}${done && o.id === ask.answer ? ' is-taken' : ''}`} style={scene ? { left: `${spot(i)[0]}%`, top: `${spot(i)[1]}%`, rotate: `${spot(i)[2]}deg` } : undefined} aria-label={o.label} onClick={() => tap(o.id)}>
    {o.entry ? <LearningArt entry={o.entry} countIcon={countIcon} /> : o.avatar ? <TrainerAvatar avatar={o.avatar} photo={o.photo} size={80} /> : <CreatureImg src={o.image!} alt="" />}{!scene && <small>{ask.situation && o.entry ? <b lang="en">{o.entry.en}</b> : o.label}</small>}</button>)}</div>
   {give && <div className="island-ask-target" aria-hidden="true"><span>›</span>{to ? <Icon name={to.icon} size={56} /> : speaker !== undefined ? <CreatureImg src={creatureArt(speaker)} alt="" /> : <Icon name="heart" size={56} />}<small>{to?.label ?? '给它'}</small></div>}
  </div>
  <p className="island-ask-hint" role="status">{shown ? '看，亮起来的就是它。' : ask.situation ? (wrong ? '再听一听，这时候说哪一句？' : '听一听，你想说哪一句？') : HINTS[kind][wrong ? 1 : 0]}</p>
 </section>;
}
