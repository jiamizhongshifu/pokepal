import { useEffect, useRef, useState } from 'react';
import { useEvent } from '../lib/hooks';
import { useGame } from '../store';
import { Icon } from '../icons';
import { CreatureImg } from './CreatureImg';
import { creatureArt } from '../data/creatures';
import { LearningArt } from './LearningItem';
import { learningVoice } from '../lib/learningVoice';
import { sayOnIsland as say } from '../lib/islandSpeech';
import { sfx, stopSpeech } from '../lib/speech';
import { dragTo } from '../lib/dragTo';
import type { LearningEntry } from '../data/curriculum';
import { classifyResponse } from '../lib/learningProgress';
import { ISLAND_SOURCE, comboLine, seedOf, type IslandAsk } from '../lib/islandAsk';
import type { AskKind as PlayKind } from '../island/plays';
import './island-ask.css';

/** Where the things of a "find" round lie in the scene (% of its box); the round's seed decides which goes where. */
const SPOTS: ReadonlyArray<readonly [x: number, y: number, tilt: number]> = [[4, 8, -6], [38, 0, 5], [71, 10, -4], [18, 52, 7], [54, 50, -7]];
/** The small label above a round's question: what kind of thing the child does. */
const KIND_TAG: Record<PlayKind | 'cards', string> = { cards: '听音找一找', say: '选一句话', do: '拿给它', find: '找一找', sort: '选颜色' };
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
export function IslandAskRound({ ask, speaker, station, onSolved, onClose, countIcon, kind = 'cards', to, lead }: {
 ask: IslandAsk; speaker?: number; station: string; onSolved: (id: string) => void; onClose: () => void; countIcon?: string;
 kind?: PlayKind | 'cards'; to?: { icon: string; label: string };
 /** A learned sentence the friend says first, before asking ("I'm hungry." before "apple"). */
 lead?: LearningEntry;
}) {
 const [shown, setShown] = useState(false), [wrong, setWrong] = useState<string | null>(null), [done, setDone] = useState(false);
 // In a situation the options are sentences the child cannot read: after the situation each one is read aloud while its card lights up.
 const [reading, setReading] = useState<string | null>(null);
 const replay = useRef<ReturnType<typeof setTimeout>>();
 const trace = useRef({ firstAnswer: null as null | 'correct' | 'wrong', replays: 0, heard: false, tries: 0, wrongs: 0 });
 const live = useRef(true), recorded = useRef(false);
 const scene = kind === 'find', give = kind === 'do';
 // Things stay where they lie, also after a wrong try: the child looks again, the scene does not reshuffle.
 const options = ask.options;
 const spot = (i: number) => SPOTS[(i + Math.abs(seedOf(ask.answer))) % SPOTS.length];
 const hear = async (replay = false) => {
  if (replay && trace.current.firstAnswer === null) trace.current.replays++;
  let ok: boolean;
  if (ask.situation) {
   ok = await say(['zh', ask.situation], ...(ask.model ? learningVoice(ask.prompt) : []));
   for (const o of options) {
    if (!ok || !live.current || !o.entry) break;
    setReading(o.id); ok = await say(400, ...learningVoice(o.entry));
   }
   if (live.current) setReading(null);
  } else ok = await say(...(lead && !replay && !trace.current.heard ? [...learningVoice(lead), 350] : []), ...(ask.also ? [['en', comboLine(ask.also.key, ask.prompt.key)] as ['en', string]] : learningVoice(ask.prompt)));
  if (ok && live.current) { trace.current.heard = true; useGame.getState().noteStationLearning(station, ask.prompt.key, false); }
 };
 const record = (outcome: 'solved' | 'left') => {
  if (recorded.current) return; recorded.current = true;
  const t = trace.current;
  useGame.getState().noteOpportunity({ source: ISLAND_SOURCE(ask.play), key: ask.prompt.key, kind: classifyResponse({ firstAnswer: t.firstAnswer, replays: t.replays, modelShown: shown, heardBeforeAnswer: t.heard, outcome }), tries: t.tries, replays: t.replays });
 };
 const begin = useEvent(() => void hear()), leave = useEvent(() => record('left'));
 useEffect(() => { const traced = trace; live.current = true; const start = setTimeout(begin, 250); return () => { clearTimeout(start); clearTimeout(replay.current); live.current = false; if (traced.current.tries) setTimeout(leave, 0); }; }, [begin, leave]);
 const tap = (id: string) => {
  if (done) return;
  // A tap ends whatever is being read and any replay still waiting, so no card lights up after the child chose.
  stopSpeech(); clearTimeout(replay.current); setReading(null);
  const t = trace.current; t.tries++;
  if (t.firstAnswer === null) t.firstAnswer = id === ask.answer ? 'correct' : 'wrong';
  for (const key of ask.also ? [ask.prompt.key, ask.also.key] : [ask.prompt.key]) useGame.getState().noteAttempt(key, id === ask.answer, t.wrongs > 0 || shown || !t.heard || !!ask.model, ISLAND_SOURCE(ask.play));
  if (id === ask.answer) {
   setDone(true); sfx('ding'); record('solved');
   // In a situation the chosen sentence is what gets said: the child hears their choice before the island answers.
   if (ask.situation) void say(...learningVoice(ask.prompt)).then(() => { if (live.current) onSolved(id); }); else onSolved(id);
   return;
  }
  t.wrongs++; sfx('boop'); setWrong(id);
  if (t.wrongs >= 2) setShown(true);
  replay.current = setTimeout(() => { if (!live.current) return; setWrong(null); void hear(); }, 600);
 };
 // Handing over: the thing can be dragged onto whoever it is for (the place it goes to, or the friend), or tapped.
 const root = useRef<HTMLElement>(null);
 const receiver = () => root.current?.querySelector('.island-ask-target') ?? document.querySelector('.island-friend.is-leading');
 return <section ref={root} className="island-ask" aria-label="伙伴想说一句">
  <header>{speaker !== undefined && <CreatureImg className="island-ask-speaker" src={creatureArt(speaker)} alt="" />}
   <button className="island-ask-hear" onClick={() => void hear(true)} aria-label="再听一次" disabled={done}><Icon name="speaker" size={30} /><span>再听一次</span></button>
   <button className="island-ask-close" onClick={onClose} aria-label="先不玩了"><Icon name="close" size={24} /></button></header>
  <div className={`island-ask-stage is-${kind}${ask.situation ? ' is-situation' : ''}`}>
   <h2 className="island-ask-title"><small>{ask.situation ? '这时候说什么' : KIND_TAG[kind]}</small>{ask.situation ?? HINTS[kind][0]}</h2>
   <div className="island-ask-options">{options.map((o, i) => <button key={o.id} className={`${shown && o.id === ask.answer ? 'is-shown' : ''}${reading === o.id ? ' is-reading' : ''}${wrong === o.id ? ' is-wrong' : ''}${done && o.id === ask.answer ? ' is-taken' : ''}`} style={scene ? { left: `${spot(i)[0]}%`, top: `${spot(i)[1]}%`, rotate: `${spot(i)[2]}deg` } : undefined} aria-label={o.label} {...(give ? dragTo(receiver, () => tap(o.id)) : { onClick: () => tap(o.id) })}>
    {o.entry && o.tint ? <span className="island-ask-tinted" style={{ background: o.tint }}><LearningArt entry={o.entry} /></span> : <LearningArt entry={o.entry} countIcon={countIcon} />}{!scene && !o.tint && <small>{ask.situation ? <b lang="en">{o.entry.en}</b> : o.label}</small>}</button>)}</div>
   {give && to && <div className="island-ask-target" aria-hidden="true"><Icon name={to.icon} size={56} /><small>{to.label}</small></div>}
  </div>
  <p className="island-ask-hint" role="status">{shown ? '看，亮起来的就是它。' : ask.situation ? (wrong ? '再听一听，这时候说哪一句？' : '听一听，你想说哪一句？') : HINTS[kind][wrong ? 1 : 0]}</p>
 </section>;
}
