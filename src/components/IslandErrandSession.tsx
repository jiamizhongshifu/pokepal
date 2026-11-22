import { useMemo, useState } from 'react';
import { useGame } from '../store';
import { Icon } from '../icons';
import { IslandAskRound } from './IslandAskRound';
import { LearningArt } from './LearningItem';
import { learningEntry } from '../data/curriculum';
import { errandSteps, type Errand } from '../island/errands';
import { sfx } from '../lib/speech';

/**
 * One lesson's errand with one companion: say the sentence the situation calls for, act on the lesson's words, and
 * see what it left on the island. Finishing it completes the path's island stop for that lesson.
 */
export function IslandErrandSession({ errand, partner, station, onClose, onRoute }: { errand: Errand; partner: number; station: string; onClose: () => void; onRoute: () => void }) {
 const [session] = useState(() => crypto.randomUUID());
 const [step, setStep] = useState(0), [done, setDone] = useState(false), [made, setMade] = useState<string[]>([]);
 const steps = useMemo(() => errandSteps(useGame.getState().save, errand, session), [errand, session]);
 const solved = (id: string) => {
  setMade(m => [...m, id]);
  if (step + 1 < steps.length) { setTimeout(() => setStep(n => n + 1), 500); return; }
  useGame.getState().finishErrand(errand.unit.id, partner); sfx('sparkle'); setDone(true);
 };
 const current = steps[step];
 return <div className="island-play is-errand">
  <header><strong>{errand.title}</strong><span className="island-play-rounds" aria-label={`第 ${Math.min(step + 1, steps.length)} 步，共 ${steps.length} 步`}>{steps.map((_, i) => <i key={i} className={i < step || done ? 'is-done' : i === step ? 'is-current' : ''} />)}</span></header>
  <ol className="island-play-made" aria-label="已经做好的">{steps.map((_, i) => { const e = made[i] ? learningEntry(made[i]) : undefined; return <li key={i} className={e ? 'is-made' : undefined} aria-label={e?.zh}>{e && <LearningArt entry={e} />}</li>; })}</ol>
  {done ? <div className="island-play-done" role="status"><Icon name={errand.trace.icon} size={56} /><p>{errand.result}</p><small>{errand.trace.label}会在{errand.place.name}边留几天。</small>
   <aside className="island-home-idea" aria-label="给爸爸妈妈"><strong>给爸爸妈妈 · 在家也这样玩</strong><span><b lang="en">{errand.unit.phrase}</b> {errand.unit.homePlay}</span></aside>
   <div className="island-play-actions"><button className="farm-primary" onClick={onClose}><Icon name="island" size={28} />回小岛玩</button><button onClick={onRoute}><Icon name="sign" size={26} />回学习路线</button></div></div>
   : current ? <IslandAskRound key={`${session}-${step}`} ask={current.ask} speaker={partner} station={station} kind={current.kind} to={errand.to} onSolved={solved} onClose={onClose} /> : null}
 </div>;
}
