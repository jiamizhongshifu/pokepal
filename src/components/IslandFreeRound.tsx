import { useEffect, useRef, useState } from 'react';
import { useGame } from '../store';
import { Icon } from '../icons';
import { CreatureImg } from './CreatureImg';
import { creatureArt } from '../data/creatures';
import { LearningArt } from './LearningItem';
import { learningEntry } from '../data/curriculum';
import { learningVoice } from '../lib/learningVoice';
import { sayOnIsland as say, cryOnIsland } from '../lib/islandSpeech';
import { sfx } from '../lib/speech';
import { LEAD_REACTIONS } from '../island/plays';

/**
 * Play with no question: the child taps any learned thing and hears its word. In `echo` the friend answers in its
 * own voice and the word is said once more; in `toy` the colour goes onto the lamps or boats; in `lead` the things
 * are sentences, and the friend does what the child chose to say. Nothing is right or
 * wrong, so nothing is scored: a tap is recorded as hearing the word here, never as an answer.
 */
export function IslandFreeRound({ kind, items, speaker, station, taps, onTap, onDone, onClose }: {
 kind: 'echo' | 'toy' | 'lead'; items: string[]; speaker: number; station: string; taps: number; onTap: (key: string) => void; onDone: () => void; onClose: () => void;
}) {
 const live = useRef(true), busy = useRef(false);
 const [did, setDid] = useState('');
 useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
 const tap = async (key: string) => {
  const entry = learningEntry(key);
  if (!entry || busy.current) return;
  busy.current = true; sfx('ding'); onTap(key);
  const heard = await say(...learningVoice(entry));
  if (heard && live.current) useGame.getState().noteStationLearning(station, entry.key, false);
  if (kind === 'lead' && live.current) { setDid(LEAD_REACTIONS[entry.key] ?? '伙伴照着做啦'); await cryOnIsland(speaker); }
  if (kind === 'echo' && live.current) { await cryOnIsland(speaker); if (live.current) await say(['en', entry.voiceEn ?? entry.en]); }
  busy.current = false;
 };
 return <section className={`island-ask is-free is-${kind}`} aria-label={kind === 'echo' ? '点一点，伙伴跟着学' : kind === 'lead' ? '你来说，伙伴来做' : '想点哪个都可以'}>
  <header><CreatureImg className="island-ask-speaker" src={creatureArt(speaker)} alt="" />
   <span className="island-free-note">{kind === 'echo' ? '点一个，它会学你' : kind === 'lead' ? '点一句话，它照着做' : '喜欢哪个点哪个'}</span>
   <button className="island-ask-close" onClick={onClose} aria-label="先不玩了"><Icon name="close" size={24} /></button></header>
  <div className={`island-ask-stage is-free${kind === 'lead' ? ' is-lead' : ''}`}><div className="island-ask-options">{items.map(key => { const e = learningEntry(key)!; return <button key={key} aria-label={e.zh} onClick={() => void tap(key)}><LearningArt entry={e} /><small>{kind === 'lead' ? <b lang="en">{e.en}</b> : e.zh}</small></button>; })}</div></div>
  {did && <p className="island-free-did" role="status">{did}</p>}
  {taps > 0 ? <button className="farm-primary island-free-done" onClick={onDone}><Icon name="check" size={26} />玩好啦</button> : <p className="island-ask-hint" role="status">没有对错，想怎么玩都可以。</p>}
 </section>;
}
