import { LEARNING_CHAPTERS, LEARNING_UNITS, learningEntry, type LearningUnit } from '../data/curriculum';
import type { IslandTask } from '../lib/islandPlan';
import { unlockedDistricts } from '../lib/islandPlan';
import { learningProfile } from '../lib/learningStage';
import { seedOf } from '../lib/islandAsk';
import type { SaveData } from '../types';
import { sayStep, type ErrandStep } from './errands';
import { islandToday, notePlayedTogether } from './plays';
import { placeById, type Place } from './world';

/**
 * A chapter's island party: once all four of its lessons have been used on the island, everyone meets at one place
 * and the chapter's four sentences are each used once, one situation after another. It is the chapter's review in
 * one scene. After the whole path, one old party comes round again each week, so the island keeps something to do.
 */
export interface Party { chapter: number; title: string; place: Place; units: LearningUnit[] }
export type IslandParties = Record<string, number>;
export const PARTY_WEEK = 7 * 86400000;
const unitsOf = (chapter: number) => LEARNING_UNITS.filter(u => u.chapter === chapter);
const used = (s: SaveData, u: LearningUnit) => !!s.learning?.units[u.id]?.completedAt && !!s.learning.units[u.id].encounteredAt;
export const chapterUsed = (s: SaveData, chapter: number) => { const units = unitsOf(chapter); return units.length > 0 && units.every(u => used(s, u)); };
export const validParties = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length <= LEARNING_CHAPTERS.length
 && Object.entries(v).every(([k, at]) => /^\d$/.test(k) && Number(k) < LEARNING_CHAPTERS.length && typeof at === 'number' && Number.isFinite(at));

/** Parties are held on the picnic blanket once the path has opened it; before that, by the tent. */
const partyPlace = (s: SaveData) => placeById(unlockedDistricts(s).has('leisure') ? 'picnic' : 'tent')!;
const partyOf = (s: SaveData, chapter: number): Party => ({ chapter, title: `第 ${chapter + 1} 章聚会：${LEARNING_CHAPTERS[chapter].title}`, place: partyPlace(s), units: unitsOf(chapter) });
/**
 * The party waiting now: the earliest chapter that is fully used on the island and has not had its party; or, when
 * every chapter has had one, this week's chapter again (one each week, in turn) if a week has passed since its last.
 */
export function partyReady(s: SaveData, now = Date.now()): Party | undefined {
 const chapters = LEARNING_CHAPTERS.map((_, i) => i), held = s.islandParties ?? {};
 const first = chapters.find(c => chapterUsed(s, c) && held[c] === undefined);
 if (first !== undefined) return partyOf(s, first);
 if (!chapters.every(c => held[c] !== undefined)) return undefined;
 const turn = Math.floor(now / PARTY_WEEK) % chapters.length;
 return now - held[turn] >= PARTY_WEEK ? partyOf(s, turn) : undefined;
}
export const partyAt = (s: SaveData, placeId: string, now = Date.now()) => { const p = partyReady(s, now); return p && p.place.id === placeById(placeId)?.id ? p : undefined; };

/** One situation from each lesson of the chapter, in path order; the child chooses what to say in each. */
export function partySteps(s: SaveData, party: Party, session: string): ErrandStep[] {
 const seed = Math.abs(seedOf(`party-${party.chapter}-${session}`)), model = learningProfile(s.settings).phrases === 'listen';
 return party.units.map((u, i) => sayStep(u, seed + i, model, 'party')).filter((x): x is ErrandStep => !!x);
}
/** The party happened: everyone on the island spent time together. */
export function finishParty(s: SaveData, chapter: number, now = Date.now()) {
 if (!chapterUsed(s, chapter)) return false;
 s.islandParties = { ...s.islandParties, [chapter]: now };
 for (const c of s.captures ?? []) { c.friendship = Math.min(100, c.friendship + 1); notePlayedTogether(c); }
 return true;
}

/**
 * The one thing the island suggests, with parties: the path's island stop; a waiting party; a place where learned
 * words are due; a lesson not yet used on the island; otherwise back to the path.
 */
export function islandNow(s: SaveData, now = Date.now()): IslandTask {
 const task = islandToday(s, now);
 if (task.kind === 'path') return task;
 const party = partyReady(s, now), phrase = party && learningEntry(party.units[0].phrase);
 return party && phrase ? { kind: 'party', station: party.place.id, chapter: party.chapter, title: party.title, phrase } : task;
}
