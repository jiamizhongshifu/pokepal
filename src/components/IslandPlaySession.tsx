import { useMemo, useState } from 'react';
import { useGame } from '../store';
import { Icon } from '../icons';
import { IslandAskRound } from './IslandAskRound';
import { playAsk, playOrder, freeItems, isFreePlay, ROUNDS, type Play } from '../island/plays';
import { IslandFreeRound } from './IslandFreeRound';
import { LearningArt } from './LearningItem';
import { learningEntry } from '../data/curriculum';
import { sfx } from '../lib/speech';

/**
 * Three rounds of one island activity with one companion, then what it did and a way back. What each round brought
 * about stays in view (things handed over, things found, lamps or boats in their colours), so the play has a result.
 */
export function IslandPlaySession({ play, partner, station, onClose }: { play: Play; partner: number; station: string; onClose: () => void }) {
 const [session, setSession] = useState(() => crypto.randomUUID());
 const [round, setRound] = useState(0), [done, setDone] = useState(false), [made, setMade] = useState<string[]>([]);
 const save = useGame(s => s.save);
 const order = useMemo(() => playOrder(save, play, session), [session]); // eslint-disable-line react-hooks/exhaustive-deps
 const ask = useMemo(() => playAsk(save, play, session, round, order), [session, round]); // eslint-disable-line react-hooks/exhaustive-deps
 const free = isFreePlay(play);
 const items = useMemo(() => free ? freeItems(save, play, session) : [], [session]); // eslint-disable-line react-hooks/exhaustive-deps
 const finish = () => { useGame.getState().finishIslandPlay(play.id, partner); sfx('sparkle'); setDone(true); };
 const solved = (id: string) => {
  setMade(m => [...m, id]);
  if (round + 1 < ROUNDS) { setTimeout(() => setRound(r => r + 1), 500); return; }
  finish();
 };
 return <div className="island-play">
  <header><strong>{play.title}</strong>{!free && <span className="island-play-rounds" aria-label={`第 ${Math.min(round + 1, ROUNDS)} 轮，共 ${ROUNDS} 轮`}>{Array.from({ length: ROUNDS }, (_, i) => <i key={i} className={i < round || done ? 'is-done' : i === round ? 'is-current' : ''} />)}</span>}</header>
  {play.kind !== 'say' && <ol className={`island-play-made${play.slots ? ` is-${play.slots}` : ''}`} aria-label="已经做好的">{Array.from({ length: ROUNDS }, (_, i) => { const shown = free ? made.slice(-ROUNDS) : made, e = shown[i] ? learningEntry(shown[i]) : undefined; return <li key={i} className={e ? 'is-made' : undefined} style={play.slots && e?.css ? { background: e.css } : undefined} aria-label={e?.zh}>{!play.slots && e && <LearningArt entry={e} />}</li>; })}</ol>}
  {done ? <div className="island-play-done" role="status"><Icon name={play.icon} size={56} /><p>{play.result}</p>
   <div className="island-play-actions"><button className="farm-primary" onClick={onClose}><Icon name="island" size={28} />回小岛玩</button><button onClick={() => { setSession(crypto.randomUUID()); setRound(0); setDone(false); setMade([]); }}><Icon name="refresh" size={26} />再玩一次</button></div></div>
   : play.kind === 'echo' || play.kind === 'toy' || play.kind === 'lead' ? <IslandFreeRound key={session} kind={play.kind} items={items} speaker={partner} station={station} taps={made.length} onTap={key => setMade(m => [...m, key])} onDone={finish} onClose={onClose} />
   : ask ? <IslandAskRound key={`${session}-${round}`} ask={ask} speaker={partner} station={station} kind={play.kind} to={play.to} onSolved={solved} onClose={onClose} /> : null}
 </div>;
}
