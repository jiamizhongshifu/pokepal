import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useGame } from '../store';
import { Icon } from '../icons';
import { LearningArt } from '../components/LearningItem';
import { learningEntry } from '../data/curriculum';
import { storyProp } from '../data/sceneArt';
import { sayOnIsland as say } from '../lib/islandSpeech';
import { learningVoice } from '../lib/learningVoice';
import { sfx, stopSpeech } from '../lib/speech';
import { showMood } from './mood';
import { learnedKeys } from './plays';
import type { District } from './world';
import type { Hideaway } from './sceneLayout';
import { hiddenToday } from './hidden';

/**
 * Little surprises: a few bushes or rocks in a scene that wobble now and then each hide a learned thing. Tapping one
 * pops the thing out and says its English word; the slots at the top fill, and when all are found the friend cheers.
 * What hides where changes every day and comes only from words the path has taught; nothing is asked or scored.
 */

// What was found stays found for the day while the app is open, also after walking out of the scene and back.
const FOUND = new Map<string, string[]>();

export function Hideaways({ district, spots, lying, friend }: { district: District; spots: readonly Hideaway[]; lying: readonly string[]; friend?: number }) {
 const save = useGame(s => s.save), date = save.daily.date, day = `${date}|${district}`;
 const hidden = hiddenToday(learnedKeys(save), lying, district, date, spots.length);
 const [found, setFound] = useState<string[]>(() => FOUND.get(day) ?? []);
 const [popped, setPopped] = useState<string | null>(null), [rustle, setRustle] = useState<number | null>(null);
 const live = useRef(true);
 useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
 useEffect(() => { setFound(FOUND.get(day) ?? []); }, [day]);
 if (!hidden.length) return null;

 const open = (i: number) => {
  const key = hidden[i];
  stopSpeech(); setRustle(i); setTimeout(() => { if (live.current) setRustle(r => r === i ? null : r); }, 700);
  if (!key || found.includes(key)) { sfx('boop'); return; }
  const now = [...found, key]; FOUND.set(day, now); setFound(now); setPopped(key); sfx('sparkle');
  const all = now.length === hidden.length;
  showMood(friend, all ? 'cheer' : 'surprised', all ? 2400 : 1200);
  const e = learningEntry(key)!;
  void say(...learningVoice(e)).then(heard => { if (heard) useGame.getState().noteWord(e.en, 'heard'); });
  setTimeout(() => { if (live.current) setPopped(p => p === key ? null : p); }, 1600);
 };

 return <>
  {spots.slice(0, hidden.length).map((h, i) => {
   const key = hidden[i], done = found.includes(key);
   return <div key={i} className={`island-hide${done ? ' is-found' : ''}`} style={{ left: `${h.spot[0]}%`, top: `${h.spot[1]}%`, '--size': h.size, animationDelay: `${i * 1.3}s` } as CSSProperties}>
    {popped === key && <span className="island-hide-pop" aria-hidden="true"><LearningArt entry={learningEntry(key)!} /></span>}
    <button type="button" className={rustle === i ? 'is-rustling' : undefined} aria-label={done ? `找到了：${learningEntry(key)?.zh}` : '这里好像藏着东西'} onClick={() => open(i)}>
     {'icon' in h.art ? <Icon name={h.art.icon} size={140} /> : <img src={storyProp(h.art.prop)} alt="" draggable={false} />}
    </button>
   </div>;
  })}
  <ol className={`island-found${found.length === hidden.length ? ' is-done' : ''}`} aria-label={`找到了 ${found.length} 个，一共 ${hidden.length} 个`}>
   {hidden.map(key => <li key={key} className={found.includes(key) ? 'is-found' : undefined}>{found.includes(key) ? <LearningArt entry={learningEntry(key)!} /> : <Icon name="sparkle" size={30} />}</li>)}
  </ol>
 </>;
}
