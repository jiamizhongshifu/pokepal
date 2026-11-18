import type { BallType } from '../types';

/**
 * Inviting a creature to the island: the child offers an invite berry instead of throwing anything.
 * The stored inventory keeps its original per-kind slots (save field `balls`), all of which now hold invite berries.
 */
export const INVITE = { zh: '邀请果', en: 'invite berry', cost: 5 } as const;
export const INVITE_KINDS: Record<BallType, typeof INVITE> = { poke: INVITE, great: INVITE, ultra: INVITE, master: INVITE };
export const INVITE_ORDER: BallType[] = ['poke'];
