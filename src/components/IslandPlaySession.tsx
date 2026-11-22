import { useMemo, useState } from 'react';
import { useGame } from '../store';
import { Icon } from '../icons';
import { IslandAskRound } from './IslandAskRound';
import { playAsk, playOrder, freeItems, isFreePlay, playLine, ROUNDS, type Play } from '../island/plays';
import { CROP_KINDS, type CropKind } from '../lib/farm';
import { learningVoice } from '../lib/learningVoice';
import { sayOnIsland as say } from '../lib/islandSpeech';
import { IslandFreeRound } from './IslandFreeRound';
import { LearningArt } from './LearningItem';
import { learningEntry } from '../data/curriculum';
import { sfx } from '../lib/speech';

/**
 * Three rounds of one island activity with one companion, then what it did and a way back. What each round brought
 * about stays in view (things handed over, things found, lamps or boats in their colours), so the play has a result.
 */
export function IslandPlaySession({ play, partner, station, onClose, onFinished }: { play: Play; partner: number; station: string; onClose: () => void; onFinished?: (play: Play) => void }) {
 const [session, setSession] = useState(() => crypto.randomUUID());
 const [round, setRound] = useState(0), [done, setDone] = useState(false), [made, setMade] = useState<string[]>([]);
 const save = useGame(s => s.save);
 const order = useMemo(() => playOrder(save, play, session), [session]); // eslint-disable-line react-hooks/exhaustive-deps
 const ask = useMemo(() => playAsk(save, play, session, round, order), [session, round]); // eslint-disable-line react-hooks/exhaustive-deps
 const free = isFreePlay(play);
 const items = useMemo(() => free ? freeItems(save, play, session) : [], [session]); // eslint-disable-line react-hooks/exhaustive-deps
 const finish = () => { useGame.getState().finishIslandPlay(play.id, partner); sfx('sparkle'); setDone(true); onFinished?.(play); const end = playLine(save, play, 'end'); if (end) void say(...learningVoice(end)); };
 // The friend answers what it was given with a learned sentence; the next round waits until it has said it.
 const solved = async (id: string) => {
  setMade(m => [...m, id]);
  if (play.eats && (CROP_KINDS as readonly string[]).includes(id)) useGame.getState().feedCrop(partner, id as CropKind);
  const last = round + 1 >= ROUNDS, each = last && play.lines?.end ? undefined : playLine(save, play, 'each');
  if (each) await say(...learningVoice(each));
  if (last) finish(); else setTimeout(() => setRound(r => r + 1), each ? 150 : 500);
 };
 return <div className="island-play">
  <header><strong>{play.title}</strong>{!free && <span className="island-play-rounds" aria-label={`第 ${Math.min(round + 1, ROUNDS)} 轮，共 ${ROUNDS} 轮`}>{Array.from({ length: ROUNDS }, (_, i) => <i key={i} className={i < round || done ? 'is-done' : i === round ? 'is-current' : ''} />)}</span>}</header>
  {play.kind !== 'say' && <ol className={`island-play-made${play.slots ? ` is-${play.slots}` : ''}`} aria-label="已经做好的">{Array.from({ length: ROUNDS }, (_, i) => {
   // A combined round is remembered as "colour|thing": the thing is shown on its colour.
   const shown = free ? made.slice(-ROUNDS) : made, [first, second] = (shown[i] ?? '').split('|'), tint = second ? learningEntry(first) : undefined, e = shown[i] ? learningEntry(second ?? first) : undefined;
   return <li key={i} className={e ? 'is-made' : undefined} style={play.slots && e?.css ? { background: e.css } : tint?.css ? { background: tint.css } : undefined} aria-label={e && (tint ? `${tint.zh}的${e.zh}` : e.zh)}>{!play.slots && e && <LearningArt entry={e} />}</li>;
  })}</ol>}
  {done ? <div className="island-play-done" role="status"><Icon name={play.icon} size={56} /><p>{play.result}</p>
   <div className="island-play-actions"><button className="farm-primary" onClick={onClose}><Icon name="island" size={28} /><span>回小岛玩</span></button><button onClick={() => { setSession(crypto.randomUUID()); setRound(0); setDone(false); setMade([]); }}><Icon name="refresh" size={26} /><span>再玩一次</span></button></div></div>
   : play.kind === 'echo' || play.kind === 'toy' || play.kind === 'lead' ? <IslandFreeRound key={session} kind={play.kind} items={items} speaker={partner} station={station} taps={made.length} onTap={key => setMade(m => [...m, key])} onDone={finish} onClose={onClose} />
   : ask ? <IslandAskRound key={`${session}-${round}`} ask={ask} speaker={partner} station={station} kind={play.kind} to={play.to} lead={round === 0 ? playLine(save, play, 'start') : undefined} onSolved={id => void solved(id)} onClose={onClose} /> : null}
 </div>;
}
