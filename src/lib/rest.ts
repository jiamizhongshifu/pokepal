import type { Capture } from '../types';

/** Device-local time, matching the island's 21:00–06:00 night. */
export const restPeriod = (date = new Date()) => date.getHours() >= 21 || date.getHours() < 6 ? 'night' : 'day';

/** New friends are easiest to find first; never truncate the owned collection. */
export function restingFriends(captures: Pick<Capture,'id'|'caughtAt'>[]) {
  return [...captures].sort((a,b)=>b.caughtAt-a.caughtAt).map(c=>c.id);
}
