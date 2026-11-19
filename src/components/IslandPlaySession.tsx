import { useMemo, useState } from 'react';
import { useGame } from '../store';
import { Icon } from '../icons';
import { IslandAskRound } from './IslandAskRound';
import { playAsk, ROUNDS, type Play } from '../island/plays';
import { sfx } from '../lib/speech';

/** Three rounds of one island activity with one companion, then what it did and a way back. */
export function IslandPlaySession({ play, partner, station, onClose }: { play: Play; partner: number; station: string; onClose: () => void }) {
 const [session, setSession] = useState(() => crypto.randomUUID());
 const [round, setRound] = useState(0), [done, setDone] = useState(false);
 const save = useGame(s => s.save);
 const ask = useMemo(() => playAsk(save, play, session, round), [session, round]); // eslint-disable-line react-hooks/exhaustive-deps
 const solved = () => {
  if (round + 1 < ROUNDS) { setTimeout(() => setRound(r => r + 1), 500); return; }
  useGame.getState().finishIslandPlay(play.id, partner); sfx('sparkle'); setDone(true);
 };
 return <div className="island-play">
  <header><strong>{play.title}</strong><span className="island-play-rounds" aria-label={`第 ${Math.min(round + 1, ROUNDS)} 轮，共 ${ROUNDS} 轮`}>{Array.from({ length: ROUNDS }, (_, i) => <i key={i} className={i < round || done ? 'is-done' : i === round ? 'is-current' : ''} />)}</span></header>
  {done ? <div className="island-play-done" role="status"><Icon name={play.icon} size={56} /><p>{play.result}</p>
   <div className="island-play-actions"><button className="farm-primary" onClick={onClose}><Icon name="island" size={28} />回小岛玩</button><button onClick={() => { setSession(crypto.randomUUID()); setRound(0); setDone(false); }}><Icon name="refresh" size={26} />再玩一次</button></div></div>
   : ask ? <IslandAskRound key={`${session}-${round}`} ask={ask} speaker={partner} station={station} onSolved={solved} onClose={onClose} /> : null}
 </div>;
}
