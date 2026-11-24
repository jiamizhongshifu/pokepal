import { useSyncExternalStore } from 'react';

/** First-try answers in a row within one sitting. It only ever celebrates: a miss quietly returns it to zero and nothing is stored. */
export const STREAK_SHOWN_FROM = 3;
export const nextStreak = (streak: number, firstTryCorrect: boolean) => firstTryCorrect ? streak + 1 : 0;
export const streakLabel = (streak: number) => streak >= STREAK_SHOWN_FROM ? `连着找对 ${streak} 个` : null;

let streak = 0;
let tally = { right: 0, total: 0 };
const listeners = new Set<() => void>();
const set = (next: number) => { if (next === streak) return; streak = next; listeners.forEach(l => l()); };
/** Call once per question, with the child's first answer to it. */
export const noteFirstAnswer = (correct: boolean) => { tally = { right: tally.right + (correct ? 1 : 0), total: tally.total + 1 }; set(nextStreak(streak, correct)); };
export const resetStreak = () => { tally = { right: 0, total: 0 }; set(0); };
/** First answers given in this sitting: how many were right, out of how many questions. */
export const sittingTally = () => tally;
export const useStreak = () => useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => streak);
