import { LEARNING_UNITS, learningEntry, type LearningEntry } from '../data/curriculum';
import type { StoryBackground } from '../data/sceneArt';
import { unitDistrict, unlockedDistricts } from '../lib/islandPlan';
import type { SaveData } from '../types';
import { errandAt, type Errand } from './errands';
import { partyReady, type Party } from './parties';
import { duePlay, learnedKeys, mealWaiting, playsAt, rhythmPlay, wishDone, wishFor, type Play } from './plays';
import { PLACES, placeById, placesIn, type District } from './world';

/**
 * The island a child walks around: an overview and five scenes to step into, one for each area. Nothing here is a
 * menu. What can be done is shown as a picture above a friend (an invite); the things lying in a scene are the words
 * of the lessons that belong to it.
 */
export const SCENES: Record<District, { background: StoryBackground; icon: string }> = {
 camp: { background: 'meadow', icon: 'tent' },
 garden: { background: 'garden-flowers', icon: 'flower' },
 leisure: { background: 'orchard', icon: 'bowl' },
 play: { background: 'playground', icon: 'balloon' },
 beach: { background: 'beach', icon: 'waves' },
};
export const SCENE_ORDER = Object.keys(SCENES) as District[];

export interface SceneThing { entry: LearningEntry; learned: boolean }
export const THINGS_SHOWN = 8;
/** A scene's things, in path order: learned words can be touched and heard; the next ones are only shadows. */
export function sceneThings(s: SaveData, district: District): SceneThing[] {
 const learned = learnedKeys(s), seen = new Set<string>(), things: SceneThing[] = [];
 for (const u of LEARNING_UNITS) {
  if (unitDistrict(u) !== district) continue;
  for (const w of u.words) {
   const entry = learningEntry(w);
   if (!entry || seen.has(entry.key)) continue;
   seen.add(entry.key);
   things.push({ entry, learned: learned.has(w) });
  }
 }
 const known = things.filter(t => t.learned), shadows = things.filter(t => !t.learned);
 return [...known, ...shadows.slice(0, known.length ? 2 : 3)].slice(0, THINGS_SHOWN);
}

/** A friend standing somewhere on the island. */
export interface Standing { id: number; species: string; place: string }
export type Invite = { district: District; place: string; partner?: number; icon: string; lesson: boolean } & (
 | { kind: 'party'; party: Party }
 | { kind: 'errand'; errand: Errand }
 | { kind: 'play'; play: Play });
export const inviteKey = (i: Invite) => i.kind === 'party' ? `party-${i.party.chapter}` : i.kind === 'errand' ? `errand-${i.errand.unit.id}` : `play-${i.play.id}-${i.partner ?? ''}`;
export const INVITES_SHOWN = 3;

/**
 * The island's day is three things done together. After the third the friends celebrate and stop asking until
 * tomorrow; only what the learning path is waiting for is still shown. A child can go on playing, nothing nags.
 */
export const ISLAND_DAY = 3;
export const islandDone = (s: SaveData) => Math.min(ISLAND_DAY, s.daily.islandDone ?? 0);
export const dayDone = (s: SaveData) => islandDone(s) >= ISLAND_DAY;
export function noteIslandDone(s: SaveData) { s.daily.islandDone = Math.min(9999, (s.daily.islandDone ?? 0) + 1); }
export const hourOf = (now: number) => { const d = new Date(now); return d.getHours() + d.getMinutes() / 60; };

const districtOf = (place: string) => placeById(place)!.district;
/** Who goes along: a friend standing at the place, else one in the same area, else the first friend. */
const partnerAt = (standing: readonly Standing[], place: string) =>
 (standing.find(f => f.place === place) ?? standing.find(f => districtOf(f.place) === districtOf(place)) ?? standing[0])?.id;

/**
 * What waits on the island now: a chapter party, the lessons' errands, what the time of day calls for (a meal,
 * bedtime), a hungry friend when the garden has given fruit, a place where learned words are due, and the friends' own little wishes. One per scene and three in all, so a child sees a few clear things to do, not a list.
 */
export function islandInvites(s: SaveData, standing: readonly Standing[], date: string, now = Date.now(), hour = hourOf(now)): Invite[] {
 const open = unlockedDistricts(s), found: Invite[] = [];
 const party = partyReady(s, now);
 if (party) found.push({ kind: 'party', party, district: party.place.district, place: party.place.id, partner: partnerAt(standing, party.place.id), icon: 'balloon', lesson: true });
 const errands = new Set<string>();
 for (const place of PLACES) {
  const errand = open.has(place.district) ? errandAt(s, place.id) : undefined;
  if (!errand || errands.has(errand.unit.id)) continue;
  errands.add(errand.unit.id);
  found.push({ kind: 'errand', errand, district: place.district, place: place.id, partner: partnerAt(standing, place.id), icon: errand.trace.icon, lesson: true });
 }
 const add = (play: Play | undefined) => { if (play && !found.some(i => i.kind === 'play' && i.play.id === play.id)) found.push({ kind: 'play', play, district: districtOf(play.place), place: play.place, partner: partnerAt(standing, play.place), icon: play.icon, lesson: false }); };
 add(rhythmPlay(s, hour));
 const meal = mealWaiting(s);
 add(meal);
 add(duePlay(s, now)?.play);
 for (const friend of standing) {
  const play = wishDone(s, date, friend.id) ? undefined : wishFor(s, friend.species);
  if (play) found.push({ kind: 'play', play, district: districtOf(play.place), place: play.place, partner: friend.id, icon: play.icon, lesson: false });
 }
 const scenes = new Set<District>();
 return found.filter(i => standing.length > 0 && (i.lesson || !dayDone(s)) && !scenes.has(i.district) && !!scenes.add(i.district)).slice(0, INVITES_SHOWN);
}

/** What a scene always offers: the activities of its places whose words have been learned. */
export function scenePlays(s: SaveData, district: District): Play[] {
 return placesIn(district).flatMap(p => playsAt(s, p.id));
}
