import { LEGACY_CREATURE } from '../data/legacyCreatureMap';
import { isCreatureId } from '../data/creatures';

/** Current creature id for any stored id: new ids pass through, legacy character ids map to their island creature. */
export function currentCreatureId(id: unknown): number | undefined {
 if (isCreatureId(id)) return id;
 return typeof id === 'number' ? LEGACY_CREATURE[id] : undefined;
}

type Raw = Record<string, any>;
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
 if (!save || typeof save !== 'object') return false;
 const s = save as Raw;
 const before = JSON.stringify(s);
 if (Array.isArray(s.captures)) {
  const merged = new Map<number, Raw>();
  for (const capture of s.captures) {
   const id = remap(capture?.id);
   if (typeof id !== 'number') { merged.set(Number.NaN, capture); continue; }
   const next = { ...capture, id };
   const kept = merged.get(id);
   if (!kept) { merged.set(id, next); continue; }
   const friend = (kept.friendship ?? 0) >= (next.friendship ?? 0) ? kept : next;
   merged.set(id, { ...friend, caughtAt: Math.min(kept.caughtAt ?? Infinity, next.caughtAt ?? Infinity) });
  }
  s.captures = [...merged.values()];
 }
 if (s.settings && Array.isArray(s.settings.favorites)) s.settings.favorites = ids(s.settings.favorites);
 if (Array.isArray(s.dex)) s.dex = ids(s.dex);
 if (s.daily && Array.isArray(s.daily.caught)) s.daily.caught = ids(s.daily.caught);
 if (s.catchWish !== undefined) {
  s.catchWish = remap(s.catchWish);
 }
 if (s.careStory && typeof s.careStory === 'object') {
  s.careStory.pokemonId = remap(s.careStory.pokemonId);
 }
 return JSON.stringify(s) !== before;
}
