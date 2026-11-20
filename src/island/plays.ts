import { LEARNING_UNITS } from '../data/curriculum';
import { wordAsk, seedOf, type IslandAsk } from '../lib/islandAsk';
import type { SaveData } from '../types';
import { HOMES, placeById } from './world';
import { unlockedDistricts } from '../lib/islandPlan';

/**
 * What can be done at each island place, built from what the companions are like and what the path teaches.
 * Every activity is three rounds of "the friend says one learned word or sentence, the child taps its picture";
 * the pictures come only from the activity's own set, and the activity appears once two of them are learned.
 */
export interface Play { id: string; place: string; title: string; pool: string[]; result: string; icon: string }
export const PLAYS: Play[] = [
 { id: 'greet', place: 'tent', title: '在帐篷门口打招呼', pool: ['Hello!', 'Good night!', 'Bye-bye!'], result: '伙伴挥挥手，开心地进帐篷啦', icon: 'tent' },
 { id: 'tidy', place: 'tent', title: '收拾小营地', pool: ['ball', 'book', 'hat'], result: '玩具都收好啦，营地干干净净', icon: 'check' },
 { id: 'goodnight', place: 'tent', title: '准备睡觉', pool: ['sun', 'moon', 'star'], result: '天空变成晚上啦，伙伴睡得香香的', icon: 'moon' },
 { id: 'meal', place: 'fire', title: '开饭啦', pool: ['apple', 'banana', 'milk', 'cake', 'egg', 'cookie', 'water', 'strawberry', 'grapes', 'watermelon'], result: '伙伴吃饱啦，谢谢你', icon: 'heart' },
 { id: 'colors', place: 'tree', title: '在果园找颜色', pool: ['red', 'yellow', 'green', 'blue', 'purple', 'orange', 'pink'], result: '果子掉进篮子里啦', icon: 'apple' },
 { id: 'flowers', place: 'farm', title: '照顾小花', pool: ['water', 'flower', 'tree', 'green'], result: '小花开啦', icon: 'flower' },
 { id: 'feelings', place: 'bench', title: '说说心情', pool: ["I'm happy!", 'I feel sad.', 'I need a rest.', 'I feel angry.'], result: '你听懂了伙伴的心情，它觉得好多啦', icon: 'heart' },
 { id: 'company', place: 'parasol', title: '陪我坐一会', pool: ['book', 'tree', 'flower', 'cloud'], result: '我们一起安安静静地坐了一会', icon: 'sun' },
 { id: 'stage', place: 'music', title: '舞台点彩灯', pool: ['purple', 'orange', 'pink', 'blue', 'red', 'yellow', 'green'], result: '彩灯亮啦，伙伴跳起舞来', icon: 'music' },
 { id: 'dig', place: 'sand', title: '在沙坑找宝贝', pool: ['turtle', 'fish', 'bird', 'ball'], result: '宝贝都挖出来啦', icon: 'shovel' },
 { id: 'join', place: 'ball', title: '邀请朋友一起玩', pool: ['balloon', 'hat', 'ball'], result: '新朋友加入，一起玩啦', icon: 'balloon' },
 { id: 'sea', place: 'shells', title: '海边小发现', pool: ['fish', 'bird', 'water'], result: '发现都收进手册啦', icon: 'search' },
 { id: 'sky', place: 'windmill', title: '看看天上有什么', pool: ['sun', 'cloud', 'rainbow', 'bird', 'balloon', 'star'], result: '风车转呀转，天上真热闹', icon: 'wind' },
 { id: 'boats', place: 'pier', title: '给小船涂颜色', pool: ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink'], result: '小船变得五颜六色啦', icon: 'waves' },
 { id: 'nap', place: 'hammock', title: '吊床午睡', pool: ['I need a rest.', 'Good night!', 'Stay with me, please.', 'I feel sad.'], result: '伙伴在吊床上安心地睡着啦', icon: 'moon' },
];
export const ROUNDS = 3;

/** Words and sentences of completed lessons. */
export function learnedKeys(s: SaveData): Set<string> {
 return new Set(LEARNING_UNITS.filter(u => s.learning?.units[u.id]?.completedAt).flatMap(u => [...u.words, u.phrase]));
}
export const learnedFrom = (s: SaveData, play: Play) => { const k = learnedKeys(s); return play.pool.filter(w => k.has(w)); };
export const playOpenFor = (s: SaveData, play: Play) => learnedFrom(s, play).length >= 2;
/** Activities at a place: only in an area the learning path has opened, and only with two learned items. */
export const playsAt = (s: SaveData, place: string) => {
 const at = placeById(place);
 if (!at || !unlockedDistricts(s).has(at.district)) return [];
 return PLAYS.filter(p => p.place === at.id && playOpenFor(s, p));
};
export const playById = (id: string) => PLAYS.find(p => p.id === id);
/** The lesson that opens an activity: the first one teaching a second word of its set. */
export function playUnlockUnit(play: Play) {
 const seen = new Set<string>();
 for (const u of LEARNING_UNITS) { for (const k of [...u.words, u.phrase]) if (play.pool.includes(k)) seen.add(k); if (seen.size >= 2) return u; }
 return undefined;
}

/** Round `round` of one session: each round asks for a different learned item when there are enough. */
export function playAsk(s: SaveData, play: Play, session: string, round: number): IslandAsk | undefined {
 const items = learnedFrom(s, play);
 if (items.length < 2) return undefined;
 const base = seedOf(`${play.id}-${session}`);
 const order = [...items].sort((a, b) => seedOf(`${base}${a}`) - seedOf(`${base}${b}`));
 return wordAsk(play.id, order[round % order.length], items, base + round, Math.min(3, items.length));
}

/**
 * A little wish instead of hunger or loneliness timers: once a day each companion would like to do the activity at
 * its favourite place (or its home). Doing it makes the friend happy; not doing it changes nothing.
 */
export interface WishState { date: string; done: number[] }
export function wishFor(s: SaveData, species: string): Play | undefined {
 const homes = HOMES[species];
 if (!homes) return undefined;
 return playsAt(s, homes.favorite)[0] ?? playsAt(s, homes.home)[0];
}
export const wishDone = (s: SaveData, date: string, id: number) => s.islandWishes?.date === date && s.islandWishes.done.includes(id);
/** Finishing three rounds: a little friendship, and today's wish when the activity was the one it wished for. */
export function finishPlay(s: SaveData, play: Play, partner: number, date: string, wished: Play | undefined) {
 const c = s.captures.find(c => c.id === partner);
 if (!c) return false;
 c.friendship = Math.min(100, c.friendship + 2);
 notePlayedTogether(c);
 if (wished?.id === play.id) {
  if (s.islandWishes?.date !== date) s.islandWishes = { date, done: [] };
  if (!s.islandWishes.done.includes(partner)) s.islandWishes.done = [...s.islandWishes.done, partner].slice(-64);
 }
 return true;
}
export const validWishes = (w: unknown) => { const v = w as WishState; return !!v && typeof v === 'object' && typeof v.date === 'string' && v.date.length <= 10 && Array.isArray(v.done) && v.done.length <= 64 && v.done.every(n => Number.isSafeInteger(n)); };
/** The one little wish shown on the island: the first companion (in island order) with an open wish today. */
export function nextWish(s: SaveData, date: string, ids: readonly number[], later: readonly number[], speciesOf: (id: number) => string) {
 for (const id of ids) {
  if (later.includes(id) || wishDone(s, date, id)) continue;
  const play = wishFor(s, speciesOf(id));
  if (play) return { id, play };
 }
 return null;
}

/**
 * Growing up follows time spent together, not a friendship meter: island activities, shared games and picnics done
 * with a companion. Older saves start from their friendship (about one activity per 16 points).
 */
export const GROW_AT: Record<number, number> = { 1: 5, 2: 15 };
export const playedTogether = (c: { played?: number; friendship: number }) => c.played ?? Math.floor(c.friendship / 16);
export function notePlayedTogether(c: { played?: number; friendship: number }) { c.played = Math.min(9999, playedTogether(c) + 1); }
export const readyToGrow = (c: { played?: number; friendship: number }, stage: number) => GROW_AT[stage] !== undefined && playedTogether(c) >= GROW_AT[stage];
/** Hearts show time spent together (the same count that leads to growing up): one heart per three, up to five. */
export const togetherHearts = (c: { played?: number; friendship: number }) => Math.min(5, Math.ceil(playedTogether(c) / 3));
