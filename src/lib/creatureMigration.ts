import { LEGACY_CREATURE } from '../data/legacyCreatureMap';
import { isCreatureId } from '../data/creatures';

/** Current creature id for any stored id: new ids pass through, legacy character ids map to their island creature. */
export function currentCreatureId(id: unknown): number | undefined {
 if (isCreatureId(id)) return id;
 return typeof id === 'number' ? LEGACY_CREATURE[id] : undefined;
}

type Raw = Record<string, unknown>;
const isRaw = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, fallback: number) => typeof v === 'number' ? v : fallback;
/** Known ids are rewritten; anything unrecognised is left as stored so validation rejects the corrupt save. */
const remap = (id: unknown) => currentCreatureId(id) ?? id;
const ids = (list: unknown) => Array.isArray(list) ? [...new Set(list.map(remap))] : list;

/**
 * Rewrites every stored character id in a raw save to the original creatures, before validation.
 * Captures that now share a creature merge into one friend (earliest meeting, highest friendship) so nothing is lost.
 * Unknown ids are kept, so a corrupt save still fails validation instead of silently losing records.
 * Returns true when anything changed.
 */
export function migrateCreatureIds(save: unknown): boolean {
 if (!isRaw(save)) return false;
 const s = save;
 const before = JSON.stringify(s);
 if (Array.isArray(s.captures)) {
  const merged = new Map<number, Raw>();
  for (const capture of s.captures) {
   const id = remap(isRaw(capture) ? capture.id : undefined);
   if (!isRaw(capture) || typeof id !== 'number') { merged.set(Number.NaN, capture); continue; }
   const next: Raw = { ...capture, id };
   const kept = merged.get(id);
   if (!kept) { merged.set(id, next); continue; }
   const friend = num(kept.friendship, 0) >= num(next.friendship, 0) ? kept : next;
   merged.set(id, { ...friend, caughtAt: Math.min(num(kept.caughtAt, Infinity), num(next.caughtAt, Infinity)) });
  }
  s.captures = [...merged.values()];
 }
 if (isRaw(s.settings) && Array.isArray(s.settings.favorites)) s.settings.favorites = ids(s.settings.favorites);
 if (Array.isArray(s.dex)) s.dex = ids(s.dex);
 if (isRaw(s.daily) && Array.isArray(s.daily.caught)) s.daily.caught = ids(s.daily.caught);
 if (s.catchWish !== undefined) {
  s.catchWish = remap(s.catchWish);
 }
 if (isRaw(s.careStory)) {
  s.careStory.pokemonId = remap(s.careStory.pokemonId);
 }
 return JSON.stringify(s) !== before;
}
