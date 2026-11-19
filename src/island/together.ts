import type { TogetherKind } from '../lib/islandLiving';
import { placeOf, type Visit } from './world';

/** Shared play happens at one place the child can see: the ball field, the shade of the parasol, or the beach. */
export interface TogetherSession { id: string; kind: TogetherKind; help?: true; partners: number[]; context: 'play' | 'shade' | 'coast'; visits: Visit[] }
export function togetherSession(kind: TogetherKind, partners: number[], coast = false): TogetherSession {
 const id = crypto.randomUUID();
 const context = coast ? 'coast' : kind === 'rest' ? 'shade' : 'play';
 const station = placeOf(context === 'coast' ? 'shells' : context === 'shade' ? 'parasol' : 'ball');
 return { id, kind, partners, context, visits: partners.map((pokemonId, i) => ({ pokemonId, manual: true, key: `together-${id}-${i}`, station })) };
}
/** Tidying the ball after a game is always possible: the basket stands at the same place. */
export const togetherHelpTarget = (session: TogetherSession) => session.visits[0]?.station ?? null;
