import { LEARNING_UNITS, learningEntry, type LearningEntry, type LearningUnit } from '../data/curriculum';
import { placeById, districtName as nameOfDistrict, type District } from '../island/world';
import { currentNode, learningPath, pathNodes } from './learningPath';
import { atStation } from './learningProgress';
import type { SaveData } from '../types';

/**
 * The island follows the learning path: an area lights up once the path reaches the first lesson that happens there,
 * places speak the sentences learned for them, and one island task points at what the path asks for next.
 * Nothing here is stored; it is re-derived from lesson records, so a curriculum change needs no migration.
 */

export function stationDistrict(stationId: string): District | undefined {
 return placeById(stationId)?.district;
}
export const unitDistrict = (unit: LearningUnit) => stationDistrict(unit.station) ?? unit.theme;

/** Lessons the path has reached: done, current or open. */
function reachedUnits(s: SaveData): LearningUnit[] {
 const ids = new Set(pathNodes(learningPath(s)).filter(n => n.kind === 'lesson' && n.state !== 'locked').map(n => n.unit!.id));
 return LEARNING_UNITS.filter(u => ids.has(u.id) || s.learning?.units[u.id]?.completedAt);
}

export function unlockedDistricts(s: SaveData): Set<District> {
 const open = new Set<District>([unitDistrict(LEARNING_UNITS[0])]);
 for (const u of reachedUnits(s)) open.add(unitDistrict(u));
 return open;
}
/** The first lesson that opens an area, so a locked area can say what to learn to get there. */
export function unlockingUnit(district: District): LearningUnit | undefined {
 return LEARNING_UNITS.find(u => unitDistrict(u) === district);
}
export const districtName = nameOfDistrict;

/** Island play that belongs to an area: it opens with that area. */
export const PLAY_DISTRICT = { picnic: 'leisure', farm: 'garden', ball: 'play', rest: 'leisure', bubbles: 'camp', jump: 'camp' } as const satisfies Record<string, District>;
export const playOpen = (s: SaveData, play: keyof typeof PLAY_DISTRICT) => unlockedDistricts(s).has(PLAY_DISTRICT[play]);

/** Completed lessons that happen at this place, in curriculum order. */
export function learnedHere(s: SaveData, stationId: string): LearningUnit[] {
 return LEARNING_UNITS.filter(u => atStation(u, stationId) && !!s.learning?.units[u.id]?.completedAt);
}
/** The sentence a place says: one learned here, rotating by local day so it stays the same all day. */
export function learnedPhrase(s: SaveData, stationId: string, now = Date.now()): LearningEntry | undefined {
 const units = learnedHere(s, stationId);
 if (!units.length) return undefined;
 const d = new Date(now), day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
 return learningEntry(units[day % units.length].phrase);
}
/** Learned sentences, newest lesson first, optionally limited to an area. */
export function learnedPhrases(s: SaveData, district?: District): LearningEntry[] {
 return LEARNING_UNITS.filter(u => s.learning?.units[u.id]?.completedAt && (!district || unitDistrict(u) === district))
  .sort((a, b) => s.learning!.units[b.id].completedAt! - s.learning!.units[a.id].completedAt!)
  .map(u => learningEntry(u.phrase)).filter((e): e is LearningEntry => !!e);
}

export type IslandTask =
 | { kind: 'path'; unit: LearningUnit; station: string; phrase: LearningEntry }
 | { kind: 'revisit'; unit: LearningUnit; station: string; phrase: LearningEntry }
 /** A place where learned words are due to come back; `phrase` is the first of them, `play` the activity there. */
 | { kind: 'due'; station: string; play: string; title: string; phrase: LearningEntry }
 | { kind: 'route'; title: string };
/**
 * One thing to do on the island. The path's island stop comes first; otherwise a lesson learned but not yet used on
 * the island; otherwise the island simply points back to the path's next stop.
 */
export function islandTask(s: SaveData): IslandTask {
 const route = learningPath(s), cur = currentNode(route);
 if (cur?.kind === 'island' && cur.unit) {
  const phrase = learningEntry(cur.unit.phrase);
  if (phrase) return { kind: 'path', unit: cur.unit, station: cur.unit.station, phrase };
 }
 const fresh = LEARNING_UNITS.filter(u => s.learning?.units[u.id]?.completedAt && !s.learning.units[u.id].encounteredAt)
  .sort((a, b) => s.learning!.units[b.id].completedAt! - s.learning!.units[a.id].completedAt!)[0];
 const phrase = fresh && learningEntry(fresh.phrase);
 if (fresh && phrase) return { kind: 'revisit', unit: fresh, station: fresh.station, phrase };
 return { kind: 'route', title: cur?.title ?? '学习路线' };
}
/** A lesson station family (`bed-`) is visited at its first place. */
export const visitStation = (station: string) => station.endsWith('-') ? `${station}0` : station;

/** Sentences each kind of island play can borrow from the path, once learned (newest lesson first). */
const PLAY_LINES = {
 feed: ['More, please!', 'Thank you!', 'Yummy!', 'No, thank you.', "I'm thirsty.", 'Can I have an apple, please?'],
 pet: ["I'm happy!", 'Stay with me, please.', 'Thank you!'],
 sleep: ['Good night!', 'I need a rest.'],
 picnic: ['Thank you!', 'More, please!', 'Yummy!', 'Can I have an apple, please?'],
 farm: ['Help, please!', 'All done!', 'Sorry.'],
} as const;
export type PlayLine = keyof typeof PLAY_LINES;
/** The learned sentence a play moment invites the child to try, or nothing if none of its sentences is learned yet. */
export function learnedPlayLine(s: SaveData, play: PlayLine): LearningEntry | undefined {
 const fits = new Set<string>(PLAY_LINES[play]);
 return learnedPhrases(s).find(e => fits.has(e.en));
}

/** The closed area the path opens next: the only one the island marks with locks, so day one is not a map of locks. */
export function nextDistrict(s: SaveData): District | undefined {
 const open = unlockedDistricts(s);
 return LEARNING_UNITS.map(unitDistrict).find(d => !open.has(d));
}
