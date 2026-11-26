import { useEffect, useRef, useState } from 'react';
import { useGame } from '../store';
import { Icon } from '../icons';
import { learningEntry } from '../data/curriculum';
import { cryOnIsland, sayOnIsland as say } from '../lib/islandSpeech';
import { learningVoice } from '../lib/learningVoice';
import { sfx, stopSpeech } from '../lib/speech';
import { taughtPhrases } from './plays';
import { showMood } from './mood';

const ROLL_MS = 900;
/**
 * Rolling the ball back and forth with a friend. The child taps the ball and it rolls over; the friend says it is
 * its turn, rolls the ball back and says it is the child's. Nothing is asked and nothing is scored: it is a toy, and
 * the two sentences are heard exactly when they are true.
 */
export function BallTurns({ friend }: { friend: number }) {
 const [away, setAway] = useState(false), busy = useRef(false), live = useRef(true);
 useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
 const line = async (phrase: string) => {
  const entry = taughtPhrases(useGame.getState().save).has(phrase) ? learningEntry(phrase) : undefined;
  if (!entry) { await cryOnIsland(friend); return; }
  if (await say(...learningVoice(entry)) && live.current) useGame.getState().noteStationLearning('ball', entry.key, false);
 };
 const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
 const roll = async () => {
  if (busy.current) return;
  busy.current = true; stopSpeech(); sfx('pop'); setAway(true);
  await wait(ROLL_MS); if (live.current) { showMood(friend, 'cheer', 1600); await line('My turn!'); }
  if (live.current) { sfx('pop'); setAway(false); await wait(ROLL_MS); }
  if (live.current) { showMood(friend, 'giggle', 1200); await line('Your turn!'); }
  busy.current = false;
 };
 return <button type="button" className={`ball-turns${away ? ' is-away' : ''}`} aria-label="把小球滚给伙伴" onClick={() => void roll()}><Icon name="ball" size={120} /></button>;
}
