import { useEffect, useState } from 'react';

/**
 * How a friend on the island answers what the child just did, with its face and a little move: it giggles at the
 * right thing, thinks again at the wrong one, waves at "Hello!", dozes at "Good night!". The activities say what
 * happened; the island draws it on the friend in the scene, so a child sees the friend respond without reading.
 */
export type Mood = 'giggle' | 'cheer' | 'hello' | 'proud' | 'sleepy' | 'surprised' | 'thinking';
export interface FriendMood { id: number; mood: Mood; at: number; ms: number }

const EVENT = 'pokepal:island-mood';
export const MOOD_MS = 1500;

export function showMood(id: number | undefined, mood: Mood, ms = MOOD_MS) {
 if (id === undefined) return;
 dispatchEvent(new CustomEvent<FriendMood>(EVENT, { detail: { id, mood, at: Date.now(), ms } }));
}

/** The latest mood shown on the island, cleared once its time is over. */
export function useFriendMood(): FriendMood | null {
 const [mood, setMood] = useState<FriendMood | null>(null);
 useEffect(() => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const on = (e: Event) => {
   const next = (e as CustomEvent<FriendMood>).detail;
   clearTimeout(timer); setMood(next);
   timer = setTimeout(() => setMood(m => m === next ? null : m), next.ms);
  };
  addEventListener(EVENT, on);
  return () => { clearTimeout(timer); removeEventListener(EVENT, on); };
 }, []);
 return mood;
}

/** A small sign over the friend, so every friend shows its answer, also one whose grown-up picture has no faces. */
export const MOOD_MARK: Record<Mood, string> = { giggle: 'heart', cheer: 'sparkle', hello: 'hand', proud: 'star', sleepy: 'zz', surprised: 'sparkle', thinking: 'ear' };

/** What a friend does when the child says a sentence to it ("You say it, the friend does it"). */
export const SENTENCE_MOODS: Record<string, Mood> = {
 'Hello!': 'hello', 'Good night!': 'sleepy', "Let's play!": 'cheer', "Let's go!": 'cheer',
 'My turn!': 'giggle', 'Your turn!': 'cheer', "Let's tidy up!": 'proud',
};
