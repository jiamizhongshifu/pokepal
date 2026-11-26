import { useMemo, useState } from 'react';
import { useGame } from '../store';
import { Icon } from '../icons';
import { IslandAskRound } from './IslandAskRound';
import { CreatureImg } from './CreatureImg';
import { creatureAvatar } from '../data/creatures';
import { partySteps, type Party } from '../island/parties';
import { sfx } from '../lib/speech';
import { showMood } from '../island/mood';

/**
 * A chapter's party with everyone on the island: the chapter's sentences, each in its situation, one after another.
 * It ends with a group picture of the friends who were there.
 */
export function IslandPartySession({ party, partner, station, onClose }: { party: Party; partner: number; station: string; onClose: () => void }) {
 const [session] = useState(() => crypto.randomUUID());
 const [step, setStep] = useState(0), [done, setDone] = useState(false);
 const steps = useMemo(() => partySteps(useGame.getState().save, party, session), [party, session]);
 const friends = useGame(s => s.save.captures).slice(0, 8);
 const solved = () => {
  if (step + 1 < steps.length) { setTimeout(() => setStep(n => n + 1), 500); return; }
  useGame.getState().finishParty(party.chapter); sfx('sparkle'); setDone(true); showMood(partner, 'proud', 3200);
 };
 const current = steps[step];
 return <div className="island-play is-party">
  <header><strong>{party.title}</strong><span className="island-play-rounds" aria-label={`第 ${Math.min(step + 1, steps.length)} 件事，共 ${steps.length} 件`}>{steps.map((_, i) => <i key={i} className={i < step || done ? 'is-done' : i === step ? 'is-current' : ''} />)}</span></header>
  {done ? <div className="island-play-done" role="status">
    <div className="island-party-photo" role="img" aria-label="大家的合影">{friends.map(c => <CreatureImg key={c.id} src={creatureAvatar(c.id)} alt="" />)}</div>
    <p>聚会真开心，大家拍了一张合影！</p><small>这一章的话，你都用上啦。</small>
    <div className="island-play-actions"><button className="farm-primary" onClick={onClose}><Icon name="island" size={28} /><span>回小岛玩</span></button></div></div>
   : current ? <IslandAskRound key={`${session}-${step}`} ask={current.ask} speaker={partner} station={station} kind="say" onSolved={solved} onClose={onClose} /> : null}
 </div>;
}
