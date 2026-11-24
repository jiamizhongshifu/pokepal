import { useSyncExternalStore } from 'react';

/** How the last answer on the card went. The buddy beside the card reads it, so a child who watches the friend, not the text, still sees the answer land. */
export type AnswerMood = 'idle' | 'good' | 'again';
export const moodExpression = (mood: AnswerMood) => mood === 'good' ? 'cheer' : mood === 'again' ? 'thinking' : null;

let mood: AnswerMood = 'idle';
const listeners = new Set<() => void>();
export const setAnswerMood = (next: AnswerMood) => { if (next === mood) return; mood = next; listeners.forEach(l => l()); };
export const useAnswerMood = () => useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => mood);
