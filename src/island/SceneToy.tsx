import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGame } from '../store';
import { Icon } from '../icons';
import { LearningArt } from '../components/LearningItem';
import { learningEntry } from '../data/curriculum';
import { storyProp } from '../data/sceneArt';
import { learnedFoods } from '../lib/islandAsk';
import { cryOnIsland, sayOnIsland as say } from '../lib/islandSpeech';
import { learningVoice } from '../lib/learningVoice';
import { sfx, stopSpeech } from '../lib/speech';
import { showMood } from './mood';
import { taughtPhrases } from './plays';

/**
 * A toy that stays in a scene and is played by tapping it, with nothing asked and nothing scored: the campfire roasts
 * a learned snack for the friend, the fruit tree drops learned fruit to pick into a basket, the sand pile grows into a
 * castle until a wave knocks it over. The words heard are only ones the path has taught.
 */
export type ToyKind = 'roast' | 'shake' | 'castle';
const ROAST_MS = 1300, CASTLE = ['castle-fallen', 'castle-building', 'castle-wide', 'castle-tall'], WAVE_MS = 6000;
const SNACKS = ['cookie', 'cake', 'egg', 'apple', 'banana', 'strawberry', 'grapes'], TREE_FRUIT = ['apple', 'banana', 'strawberry', 'grapes'];

export function SceneToy({ kind, friend, art, label }: { kind: ToyKind; friend?: number; art: ReactNode; label: string }) {
 const save = useGame(s => s.save);
 const live = useRef(true), timers = useRef<ReturnType<typeof setTimeout>[]>([]);
 const later = (run: () => void, ms: number) => { timers.current.push(setTimeout(() => { if (live.current) run(); }, ms)); };
 useEffect(() => { live.current = true; const t = timers.current; return () => { live.current = false; t.forEach(clearTimeout); }; }, []);
 const [shake, setShake] = useState(0), [snack, setSnack] = useState<{ key: string; eaten: boolean } | null>(null);
 const [fallen, setFallen] = useState<{ key: string; id: number }[]>([]), [basket, setBasket] = useState(0), next = useRef(0);
 const [step, setStep] = useState(0), [wave, setWave] = useState(false);
 const learned = learnedFoods(save);
 const hear = async (key: string) => { const e = learningEntry(key); if (e && await say(...learningVoice(e))) useGame.getState().noteWord(e.en, 'heard'); };
 const wiggle = () => setShake(n => n + 1);

 const tap = () => {
  stopSpeech(); wiggle();
  if (kind === 'roast') {
   const snacks = SNACKS.filter(k => learned.includes(k));
   if (snack) return;
   if (!snacks.length) { sfx('pop'); showMood(friend, 'surprised'); return; }
   const key = snacks[next.current++ % snacks.length];
   sfx('whoosh'); setSnack({ key, eaten: false });
   later(() => {
    setSnack({ key, eaten: true }); sfx('pop'); showMood(friend, 'giggle', 1800);
    const yummy = taughtPhrases(useGame.getState().save).has('Yummy!') ? learningEntry('Yummy!') : undefined;
    void (yummy ? say(...learningVoice(yummy)) : hear(key));
    later(() => setSnack(null), 900);
   }, ROAST_MS);
   return;
  }
  if (kind === 'shake') {
   const fruit = TREE_FRUIT.filter(k => learned.includes(k));
   if (!fruit.length || fallen.length >= 3) { sfx('boop'); return; }
   sfx('pop'); const id = next.current++;
   setFallen(f => [...f, { key: fruit[id % fruit.length], id }]);
   return;
  }
  // The castle grows a storey a tap; the tallest one stands a while before a wave knocks it back to a sand pile.
  if (step >= CASTLE.length - 1) { sfx('boop'); return; }
  const now = step + 1; setStep(now); sfx(now === CASTLE.length - 1 ? 'sparkle' : 'pop');
  if (now === CASTLE.length - 1) {
   showMood(friend, 'cheer', 1800);
   later(() => { setStep(0); setWave(true); later(() => setWave(false), 1400); sfx('whoosh'); showMood(friend, 'giggle'); if (friend !== undefined) void cryOnIsland(friend); }, WAVE_MS);
  }
 };
 const pick = (id: number, key: string) => {
  stopSpeech(); sfx('ding'); setFallen(f => f.filter(x => x.id !== id)); setBasket(n => n + 1); showMood(friend, 'giggle'); void hear(key);
 };

 const shown = kind === 'castle' ? <img src={storyProp(CASTLE[step])} alt="" draggable={false} /> : art;
 return <>
  <button type="button" className={`island-object-art island-toy is-${kind}`} aria-label={label} onClick={tap}><span key={shake} className={shake ? 'is-shaken' : undefined}>{shown}</span></button>
  {snack && <span className={`island-toy-snack${snack.eaten ? ' is-eaten' : ''}`} aria-hidden="true"><i /><LearningArt entry={learningEntry(snack.key)!} /></span>}
  {kind === 'shake' && <>
   {fallen.map((f, i) => <button key={f.id} type="button" className="island-toy-fruit" style={{ left: `${-24 + i * 46}%` }} aria-label={`${learningEntry(f.key)?.zh} ${learningEntry(f.key)?.en}`} onClick={() => pick(f.id, f.key)}><LearningArt entry={learningEntry(f.key)!} /></button>)}
   <span className={`island-toy-basket${basket ? ' is-full' : ''}`} key={`basket-${basket}`} aria-label={`篮子里有 ${basket} 个水果`} role="img"><img src={storyProp(basket ? 'basket-apples' : 'basket')} alt="" />{basket > 0 && <b>{basket}</b>}</span>
  </>}
  {wave && <Icon name="waves" size={56} className="island-toy-wave" />}
 </>;
}
