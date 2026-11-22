import { LEARNING_UNITS, learningEntry, type LearningEntry } from '../data/curriculum';
import { CROP_KINDS, type CropKind } from './farm';
import type { SaveData } from '../types';

/**
 * Island play asks in words the child has learned on the path: a companion says one thing, the child taps the
 * matching picture. A wrong tap only makes the companion say it again. Choices come from learned words only, so the
 * island never tests something the path has not taught.
 */
/** The island activity an answer belongs to: the farm/picnic/feed/ball rounds or one of the place activities. */
export type IslandPlay = string;
/** A picture to tap: a learned word, a friend's portrait, or the child's own avatar (`avatar`, with an optional photo). */
/** `tint`: the thing is shown in this colour (a combined instruction such as “red ball”). */
export interface AskOption { id: string; entry?: LearningEntry; image?: string; avatar?: string; photo?: string; label: string; tint?: string }
/**
 * `situation`: instead of hearing the answer, the child hears what is happening (in Chinese) and chooses what to say;
 * with `model` the sentence itself follows as an example, for a child who is still mostly listening.
 */
/** `also`: a second learned word said before the prompt (the colour of the thing); both count as answered. */
export interface IslandAsk { play: IslandPlay; prompt: LearningEntry; options: AskOption[]; answer: string; situation?: string; model?: boolean; also?: LearningEntry }
export const ISLAND_SOURCE = (play: IslandPlay) => `island:${play}`;
export const isIslandSource = (source: string) => source.startsWith('island:');
/**
 * Two different things happen on the island, and a parent reads them apart: the child heard a learned word or
 * sentence and acted on it (`did`), or the child was in a situation and chose what to say (`said`: the sentence
 * steps of an errand or a chapter party). Free play asks nothing and records no answers.
 */
export function islandAnswerKind(o: { source: string; key: string }): 'did' | 'said' | undefined {
 if (!isIslandSource(o.source)) return undefined;
 return (o.source === ISLAND_SOURCE('errand') || o.source === ISLAND_SOURCE('party')) && learningEntry(o.key)?.kind === 'phrase' ? 'said' : 'did';
}

/** Picture words from completed lessons, in curriculum order. */
export function learnedWords(s: SaveData): string[] {
 return [...new Set(LEARNING_UNITS.filter(u => s.learning?.units[u.id]?.completedAt).flatMap(u => u.words))];
}
const FOODS = ['apple', 'banana', 'strawberry', 'grapes', 'watermelon', 'milk', 'cake', 'egg', 'cookie'];
export const learnedFoods = (s: SaveData) => learnedWords(s).filter(w => FOODS.includes(w));
/** Fruits the farm can grow: one more kind for each fruit word learned. */
export const plantableCrops = (s: SaveData): CropKind[] => CROP_KINDS.filter(k => learnedWords(s).includes(k));
/** The lesson that teaches the first fruit, so a farm without seeds can say what to learn. */
export const firstFruitUnit = () => LEARNING_UNITS.find(u => u.words.some(w => (CROP_KINDS as readonly string[]).includes(w)));

/** A small deterministic shuffle, so a round looks the same after a reload. */
function rotate<T>(list: T[], seed: number) { const n = list.length; if (!n) return list; const k = ((seed % n) + n) % n; return [...list.slice(k), ...list.slice(0, k)]; }
/** A stable number from an id, to seed a round. */
export const seedOf = (id: string) => [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) | 0, 7);
const pick = <T,>(list: T[], seed: number) => list[((seed % list.length) + list.length) % list.length];

/** Other pictures come from the closest pool first (other foods), then from any learned word. */
export function wordAsk(play: IslandPlay, target: string, pool: string[], seed: number, count = 3, fallback: string[] = []): IslandAsk | undefined {
 const prompt = learningEntry(target);
 if (!prompt) return undefined;
 const near = rotate(pool.filter(w => w !== target), seed), far = rotate(fallback.filter(w => w !== target && !near.includes(w)), seed);
 const others = [...near, ...far].slice(0, count - 1);
 if (!others.length) return undefined;
 const options = rotate([target, ...others], seed + 1).map(w => learningEntry(w)!).filter(Boolean).map(e => ({ id: e.key, entry: e, label: e.zh }));
 return { play, prompt, options, answer: prompt.key };
}

/**
 * A combined instruction from two learned words: a colour and a thing (“red … ball”). The four pictures are the two
 * things in the two colours, so only a child who follows both words finds the one that is meant.
 */
export function comboAsk(play: IslandPlay, thing: string, color: string, things: string[], colors: string[], seed: number): IslandAsk | undefined {
 const prompt = learningEntry(thing), also = learningEntry(color);
 const otherThing = rotate(things.filter(t => t !== thing), seed)[0], otherColor = rotate(colors.filter(c => c !== color), seed)[0];
 const t2 = otherThing ? learningEntry(otherThing) : undefined, c2 = otherColor ? learningEntry(otherColor) : undefined;
 if (!prompt || !also?.css || !t2 || !c2?.css) return undefined;
 const option = (c: LearningEntry, t: LearningEntry): AskOption => ({ id: `${c.key}|${t.key}`, entry: t, tint: c.css, label: `${c.zh}的${t.zh}` });
 return { play, prompt, also, answer: `${also.key}|${prompt.key}`, options: rotate([option(also, prompt), option(also, t2), option(c2, prompt), option(c2, t2)], seed + 1) };
}

/** Picnic: the friend asks for one fruit in the basket; other learned foods are the other pictures. */
export const picnicFruits = (s: SaveData) => CROP_KINDS.filter(k => (s.farm?.basket[k] ?? 0) > 0 && learnedWords(s).includes(k));
export function picnicAsk(s: SaveData, seed: number, target?: CropKind): IslandAsk | undefined {
 const inBasket = picnicFruits(s);
 const fruit = target ? (learnedWords(s).includes(target) ? target : undefined) : inBasket.length ? pick(inBasket, seed) : undefined;
 if (!fruit) return undefined;
 return wordAsk('picnic', fruit, learnedFoods(s), seed, 3, learnedWords(s));
}
/** Planting: the friend names a fruit it wants to grow. */
export function plantAsk(s: SaveData, seed: number): IslandAsk | undefined {
 const crops = plantableCrops(s);
 if (!crops.length) return undefined;
 return wordAsk('plant', pick(crops, seed), crops, seed, 3, [...learnedFoods(s), ...learnedWords(s)]);
}
/** Feeding from the companion card: the friend asks for a learned food. */
export function feedAsk(s: SaveData, seed: number): IslandAsk | undefined {
 const foods = learnedFoods(s);
 if (!foods.length) return undefined;
 return wordAsk('feed', pick(foods, seed), foods, seed, 3, learnedWords(s));
}
/** Bubbles: the friend says a number, the child taps the picture with that many. */
export function bubblesAsk(seed: number, max: 3 | 5 = 3): IslandAsk {
 const keys = Array.from({ length: max }, (_, i) => `count:${i + 1}`);
 return wordAsk('bubbles', pick(keys, seed), keys, seed, 3)!;
}
/** Ball: once "My turn! / Your turn!" is learned, the child decides who rolls next from what the friend says. */
export function ballAsk(s: SaveData, childTurn: boolean, friend: { id: number; name: string; image: string }, me: { name: string; avatar: string; photo?: string }): IslandAsk | undefined {
 if (!s.learning?.units['our-turn']?.completedAt) return undefined;
 const prompt = learningEntry(childTurn ? 'Your turn!' : 'My turn!');
 if (!prompt) return undefined;
 return { play: 'ball', prompt, answer: childTurn ? 'me' : 'friend', options: [{ id: 'friend', image: friend.image, label: friend.name }, { id: 'me', avatar: me.avatar, photo: me.photo, label: me.name }] };
}
