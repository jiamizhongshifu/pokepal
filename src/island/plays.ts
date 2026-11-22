import { LEARNING_UNITS } from '../data/curriculum';
import { wordAsk, seedOf, type IslandAsk } from '../lib/islandAsk';
import type { SaveData } from '../types';
import { HOMES, placeById } from './world';
import { unlockedDistricts, islandTask, type IslandTask } from '../lib/islandPlan';
import { reviewKeys } from '../lib/learningProgress';
import { learningProfile } from '../lib/learningStage';
import { learningEntry } from '../data/curriculum';

/**
 * What can be done at each island place, built from what the companions are like and what the path teaches.
 * Every activity is three rounds in which the friend says one learned word or sentence and the child acts on it;
 * the things come only from the activity's own set, and the activity appears once two of them are learned.
 *
 * `kind` is how the child acts, so the same words are met through different actions:
 * - `do`: hand the named thing over (to the friend, or `to` a place such as the toy box);
 * - `find`: spot the named thing among several scattered in the scene;
 * - `sort`: tap the named colour and it fills the next of the `slots` (lamps, boats);
 * - `say`: recognise a sentence from its picture.
 */
export type PlayKind = 'do' | 'find' | 'sort' | 'say';
export interface Play { id: string; kind: PlayKind; place: string; title: string; pool: string[]; result: string; icon: string; to?: { icon: string; label: string }; slots?: 'lamp' | 'boat' }
export const PLAYS: Play[] = [
 { id: 'greet', kind: 'say', place: 'tent', title: '在帐篷门口打招呼', pool: ['Hello!', 'Good night!', 'Bye-bye!'], result: '伙伴挥挥手，开心地进帐篷啦', icon: 'tent' },
 { id: 'tidy', kind: 'do', to: { icon: 'tent', label: '玩具箱' }, place: 'tent', title: '收拾小营地', pool: ['ball', 'book', 'hat'], result: '玩具都收好啦，营地干干净净', icon: 'check' },
 { id: 'goodnight', kind: 'do', to: { icon: 'cloud', label: '天上' }, place: 'tent', title: '准备睡觉', pool: ['sun', 'moon', 'star'], result: '天空变成晚上啦，伙伴睡得香香的', icon: 'moon' },
 { id: 'meal', kind: 'do', place: 'fire', title: '开饭啦', pool: ['apple', 'banana', 'milk', 'cake', 'egg', 'cookie', 'water', 'strawberry', 'grapes', 'watermelon'], result: '伙伴吃饱啦，谢谢你', icon: 'heart' },
 { id: 'colors', kind: 'find', place: 'tree', title: '在果园找颜色', pool: ['red', 'yellow', 'green', 'blue', 'purple', 'orange', 'pink'], result: '果子掉进篮子里啦', icon: 'apple' },
 { id: 'flowers', kind: 'do', to: { icon: 'flower', label: '小花园' }, place: 'farm', title: '照顾小花', pool: ['water', 'flower', 'tree', 'green'], result: '小花开啦', icon: 'flower' },
 { id: 'feelings', kind: 'say', place: 'bench', title: '说说心情', pool: ["I'm happy!", 'I feel sad.', 'I need a rest.', 'I feel angry.'], result: '你听懂了伙伴的心情，它觉得好多啦', icon: 'heart' },
 { id: 'company', kind: 'do', place: 'parasol', title: '陪我坐一会', pool: ['book', 'tree', 'flower', 'cloud'], result: '我们一起安安静静地坐了一会', icon: 'sun' },
 { id: 'stage', kind: 'sort', slots: 'lamp', place: 'music', title: '舞台点彩灯', pool: ['purple', 'orange', 'pink', 'blue', 'red', 'yellow', 'green'], result: '彩灯亮啦，伙伴跳起舞来', icon: 'music' },
 { id: 'dig', kind: 'find', place: 'sand', title: '在沙坑找宝贝', pool: ['turtle', 'fish', 'bird', 'ball'], result: '宝贝都挖出来啦', icon: 'shovel' },
 { id: 'join', kind: 'do', place: 'ball', title: '邀请朋友一起玩', pool: ['balloon', 'hat', 'ball'], result: '新朋友加入，一起玩啦', icon: 'balloon' },
 { id: 'sea', kind: 'find', place: 'shells', title: '海边小发现', pool: ['fish', 'bird', 'water'], result: '发现都收进手册啦', icon: 'search' },
 { id: 'sky', kind: 'find', place: 'windmill', title: '看看天上有什么', pool: ['sun', 'cloud', 'rainbow', 'bird', 'balloon', 'star'], result: '风车转呀转，天上真热闹', icon: 'wind' },
 { id: 'boats', kind: 'sort', slots: 'boat', place: 'pier', title: '给小船涂颜色', pool: ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink'], result: '小船变得五颜六色啦', icon: 'waves' },
 { id: 'nap', kind: 'say', place: 'hammock', title: '吊床午睡', pool: ['I need a rest.', 'Good night!', 'Stay with me, please.', 'I feel sad.'], result: '伙伴在吊床上安心地睡着啦', icon: 'moon' },
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

/** How many things a round shows: fewer for a child who is still mostly listening; a scene to search holds more. */
export function playChoices(s: SaveData, play: Play) {
 const few = learningProfile(s.settings).entry === 'listen';
 return play.kind === 'find' ? (few ? 3 : 5) : few ? 2 : 3;
}
/**
 * What one session asks for, in order: items due for review first (the island is where learned words come back),
 * then the rest in a per-session shuffle. Fixed for the session, so answering one never brings it straight back.
 */
export function playOrder(s: SaveData, play: Play, session: string, now = Date.now()): string[] {
 const items = learnedFrom(s, play), base = seedOf(`${play.id}-${session}`);
 const due = reviewKeys(s, 'due', now), rank = (k: string) => { const i = due.indexOf(learningEntry(k)?.key ?? k); return i < 0 ? due.length : i; };
 return [...items].sort((a, b) => rank(a) - rank(b) || seedOf(`${base}${a}`) - seedOf(`${base}${b}`));
}
/** Round `round` of one session: each round asks for a different learned item when there are enough. */
export function playAsk(s: SaveData, play: Play, session: string, round: number, order = playOrder(s, play, session)): IslandAsk | undefined {
 const items = learnedFrom(s, play);
 if (items.length < 2 || !order.length) return undefined;
 const base = seedOf(`${play.id}-${session}`);
 return wordAsk(play.id, order[round % order.length], items, base + round, Math.min(playChoices(s, play), items.length));
}

/** The open activity with the most learned items waiting for review, so the island can invite the child back to it. */
export function duePlay(s: SaveData, now = Date.now()): { play: Play; keys: string[] } | undefined {
 const due = new Set(reviewKeys(s, 'due', now));
 if (!due.size) return undefined;
 const open = unlockedDistricts(s);
 return PLAYS.filter(p => open.has(placeById(p.place)!.district) && playOpenFor(s, p))
  .map(play => ({ play, keys: learnedFrom(s, play).filter(k => due.has(learningEntry(k)?.key ?? k)) }))
  .filter(x => x.keys.length).sort((a, b) => b.keys.length - a.keys.length)[0];
}
/**
 * The one thing the island suggests: the path's island stop first; then a place where learned words are due to be
 * met again; then a lesson not yet used on the island; otherwise back to the path.
 */
export function islandToday(s: SaveData, now = Date.now()): IslandTask {
 const task = islandTask(s);
 if (task.kind === 'path') return task;
 const due = duePlay(s, now), entry = due && learningEntry(due.keys[0]);
 return due && entry ? { kind: 'due', station: due.play.place, play: due.play.id, title: due.play.title, phrase: entry } : task;
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
