import { LEARNING_UNITS, learningEntry, unitById, type LearningSituation, type LearningUnit } from '../data/curriculum';
import { ISLAND_SOURCE, seedOf, wordAsk, type IslandAsk } from '../lib/islandAsk';
import { islandTask, unlockedDistricts } from '../lib/islandPlan';
import { atStation, reviewKeys } from '../lib/learningProgress';
import { learningProfile } from '../lib/learningStage';
import type { SaveData } from '../types';
import { notePlayedTogether, type AskKind } from './plays';
import { placeById, type Place, type Spot } from './world';

/**
 * Every lesson has one small thing to get done on the island with its sentence: the path's "use it on the island"
 * stop. A friend is in the lesson's situation at the lesson's place; the child chooses what to say, then acts on the
 * lesson's words, and what was done stays on the island for a few days. The situation, sentences and words are the
 * lesson's own (already recorded), so an errand never asks for anything the path has not taught.
 */
export interface ErrandDetail { title: string; act: Exclude<AskKind, 'say'>; to?: { icon: string; label: string }; slots?: 'lamp' | 'boat'; result: string; trace: { icon: string; label: string } }
export interface Errand extends ErrandDetail { unit: LearningUnit; place: Place }

const TOYBOX = { icon: 'tent', label: '帐篷里' }, SKY = { icon: 'cloud', label: '天上' }, GARDEN = { icon: 'flower', label: '小花园' };
const DETAILS: Record<string, ErrandDetail> = {
 'hello-island': { title: '请新朋友进来', act: 'do', to: TOYBOX, result: '新朋友住下啦，它的小东西放在帐篷边。', trace: { icon: 'cap', label: '新朋友的小帽子' } },
 'color-orchard': { title: '摘一篮果子', act: 'find', result: '篮子装满啦，就放在果树下。', trace: { icon: 'apple', label: '一篮果子' } },
 'snack-discovery': { title: '摆好野餐', act: 'do', result: '野餐摆好啦，伙伴吃得真香。', trace: { icon: 'banana', label: '摆好的野餐' } },
 'quiet-night': { title: '挂上月亮和星星', act: 'do', to: SKY, result: '星星挂好啦，伙伴睡得香香的。', trace: { icon: 'star', label: '挂好的星星' } },
 'garden-helper': { title: '请朋友一起浇水', act: 'do', to: GARDEN, result: '花喝饱了水，开啦。', trace: { icon: 'flower', label: '浇过水的花' } },
 'our-turn': { title: '轮流玩小球', act: 'do', result: '你一下，我一下，小球滚来滚去。', trace: { icon: 'ball', label: '玩过的小球' } },
 'sea-discovery': { title: '去海边找一找', act: 'find', result: '海边的发现都记下来啦。', trace: { icon: 'fish', label: '海边的小发现' } },
 'polite-snack': { title: '再分一点点心', act: 'do', result: '点心分好啦，大家都有。', trace: { icon: 'cookie', label: '分好的点心' } },
 'my-feelings': { title: '说说现在的心情', act: 'find', result: '伙伴知道你的心情啦。', trace: { icon: 'rainbow', label: '今天的心情' } },
 'kind-words': { title: '谢谢伙伴的帮忙', act: 'do', result: '伙伴听到谢谢，开心极了。', trace: { icon: 'strawberry', label: '一起摘的草莓' } },
 'friends-together': { title: '邀请朋友一起玩', act: 'do', result: '朋友不孤单啦，一起玩起来。', trace: { icon: 'music', label: '一起玩过的舞台' } },
 'keep-our-promise': { title: '把小花照顾好', act: 'do', to: GARDEN, result: '说好的事做完啦，小花长得真好。', trace: { icon: 'water', label: '收好的水壶' } },
 'water-break': { title: '喝口水歇一歇', act: 'do', result: '喝到水啦，舒服多了。', trace: { icon: 'water', label: '一杯水' } },
 'apple-please': { title: '开一个小果摊', act: 'do', result: '小果摊开张啦，水果递到了伙伴手里。', trace: { icon: 'grapes', label: '小果摊' } },
 'enough-snack': { title: '吃饱了，收起点心', act: 'do', to: { icon: 'bowl', label: '点心盒' }, result: '点心收好啦，下次再吃。', trace: { icon: 'cake', label: '收好的点心' } },
 'rest-time': { title: '带伙伴去歇一歇', act: 'find', result: '歇好啦，又有力气了。', trace: { icon: 'cloud', label: '歇过的地方' } },
 'sad-cloud': { title: '陪陪难过的伙伴', act: 'find', result: '有你陪着，伙伴好多了。', trace: { icon: 'flower', label: '捡回来的小花' } },
 'angry-pause': { title: '生气了，先停一停', act: 'do', result: '慢慢呼吸了几下，气消啦。', trace: { icon: 'ball', label: '停好的小球' } },
 'try-one-more': { title: '再搭一次沙堡', act: 'find', result: '沙堡又搭起来啦。', trace: { icon: 'turtle', label: '搭好的沙堡' } },
 'quiet-company': { title: '陪伙伴坐一会儿', act: 'do', result: '一起安安静静地坐了一会。', trace: { icon: 'book', label: '一起看的书' } },
 'join-the-game': { title: '问问能不能一起玩', act: 'do', result: '大家说好呀，一起玩起来。', trace: { icon: 'balloon', label: '一起玩的气球' } },
 'sorry-and-repair': { title: '扶起碰倒的小花', act: 'do', to: GARDEN, result: '小花又站好啦，伙伴说没关系。', trace: { icon: 'flower', label: '扶好的小花' } },
 'your-turn-now': { title: '轮流点彩灯', act: 'sort', slots: 'lamp', result: '彩灯一盏一盏亮起来啦。', trace: { icon: 'music', label: '亮着的彩灯' } },
 'tidy-together': { title: '一起收拾小营地', act: 'do', to: TOYBOX, result: '营地收拾得干干净净。', trace: { icon: 'ball', label: '收好的玩具' } },
};
export const errandFor = (unit: LearningUnit): Errand | undefined => {
 const detail = DETAILS[unit.id], place = placeById(unit.station);
 return detail && place ? { ...detail, unit, place } : undefined;
};
export const ERRANDS: Errand[] = LEARNING_UNITS.map(errandFor).filter((e): e is Errand => !!e);

/** A lesson that is learned but whose island errand is still to do. */
const pending = (s: SaveData, u: LearningUnit) => !!s.learning?.units[u.id]?.completedAt && !s.learning.units[u.id].encounteredAt;
/**
 * The errand waiting at a place: the one the island's task points to when it is here, otherwise the earliest lesson
 * whose errand is still open at this place. Places in areas the path has not opened have none.
 */
export function errandAt(s: SaveData, placeId: string): Errand | undefined {
 const place = placeById(placeId);
 if (!place || !unlockedDistricts(s).has(place.district)) return undefined;
 const task = islandTask(s);
 const first = task.kind !== 'route' && task.kind !== 'due' && atStation(task.unit, place.id) && pending(s, task.unit) ? task.unit : LEARNING_UNITS.find(u => atStation(u, place.id) && pending(s, u));
 return first && errandFor(first);
}

/** One step: choosing what to say in a situation, or acting on one of the lesson's words. */
export interface ErrandStep { kind: AskKind; ask: IslandAsk }
const sayStep = (scene: LearningSituation, seed: number, model: boolean): ErrandStep | undefined => {
 const prompt = learningEntry(scene.phrase), other = learningEntry(scene.alternative);
 if (!prompt || !other) return undefined;
 const options = [prompt, other].map(e => ({ id: e.key, entry: e, label: e.zh }));
 return { kind: 'say', ask: { play: 'errand', prompt, options: seed % 2 ? options : [...options].reverse(), answer: prompt.key, situation: scene.situation, model } };
};
/**
 * The three steps of an errand: say the lesson's sentence in its situation; act on one of its words; then the
 * lesson's second situation when it has one, otherwise another of its words. Words due for review come first.
 * A child who is still mostly listening hears the sentence itself as a model before choosing.
 */
export function errandSteps(s: SaveData, errand: Errand, session: string, now = Date.now()): ErrandStep[] {
 const { unit } = errand, seed = Math.abs(seedOf(`${unit.id}-${session}`)), model = learningProfile(s.settings).phrases === 'listen';
 const due = reviewKeys(s, 'due', now), rank = (k: string) => { const i = due.indexOf(k); return i < 0 ? due.length : i; };
 const words = [...new Set(unit.words)].sort((a, b) => rank(a) - rank(b) || seedOf(`${seed}${a}`) - seedOf(`${seed}${b}`));
 const act = (i: number): ErrandStep | undefined => { const ask = wordAsk('errand', words[i % words.length], unit.words, seed + i, Math.min(3, words.length)); return ask && { kind: errand.act, ask }; };
 const extra = unit.practice?.[0];
 return [sayStep(unit, seed, model), act(0), extra ? sayStep(extra, seed + 1, model) : act(1)].filter((x): x is ErrandStep => !!x);
}
export const ERRAND_SOURCE = ISLAND_SOURCE('errand');

/** What stays on the island after an errand, by lesson id and the time it was done; a few days later it has gone. */
export type IslandTraces = Record<string, number>;
export const TRACE_DAYS = 3;
export const validTraces = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length <= LEARNING_UNITS.length
 && Object.entries(v).every(([id, at]) => !!unitById(id) && typeof at === 'number' && Number.isFinite(at));
/**
 * Finishing an errand is what completes the path's island stop for that lesson. It also leaves its trace and counts
 * as time spent with the companion who helped.
 */
export function finishErrand(s: SaveData, unitId: string, partner: number | undefined, now = Date.now()) {
 const unit = unitById(unitId), progress = unit && s.learning?.units[unit.id];
 if (!unit || !progress?.completedAt) return false;
 progress.encounteredAt ??= now;
 s.islandTraces = { ...s.islandTraces, [unit.id]: now };
 const c = (s.captures ?? []).find(c => c.id === partner);
 if (c) { c.friendship = Math.min(100, c.friendship + 2); notePlayedTogether(c); }
 return true;
}
/** Traces still on the island, each beside its place; several at one place stand in a row. */
export function shownTraces(s: SaveData, now = Date.now()): { id: string; icon: string; label: string; spot: Spot }[] {
 const fresh = ERRANDS.filter(e => { const at = s.islandTraces?.[e.unit.id]; return at !== undefined && now - at < TRACE_DAYS * 86400000 && now >= at; });
 const seen = new Map<string, number>();
 return fresh.map(e => { const n = seen.get(e.place.id) ?? 0; seen.set(e.place.id, n + 1); return { id: e.unit.id, icon: e.trace.icon, label: e.trace.label, spot: [e.place.spot[0] - 5 + n * 3.5, e.place.spot[1] + 4] as Spot }; });
}
