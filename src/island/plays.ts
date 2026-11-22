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
 * - `say`: recognise a sentence from its picture;
 * - `echo`: no question at all: the child taps any learned thing, hears its word, and the friend answers back;
 * - `toy`: no question either: the child taps any learned colour and the next of the `slots` takes it.
 *
 * `owner`: a companion's own activity (its little wish), grown from what that creature is like; it is offered only
 * with that companion, at the companion's favourite place or home.
 */
export type AskKind = 'do' | 'find' | 'sort' | 'say';
export type PlayKind = AskKind | 'echo' | 'toy';
export const isFreePlay = (play: Play) => play.kind === 'echo' || play.kind === 'toy';
export interface Play { id: string; kind: PlayKind; place: string; title: string; pool: string[]; result: string; icon: string; to?: { icon: string; label: string }; slots?: 'lamp' | 'boat'; owner?: string }
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
 { id: 'stage-free', kind: 'toy', slots: 'lamp', place: 'music', title: '自己点彩灯', pool: ['red', 'yellow', 'green', 'blue', 'purple', 'orange', 'pink'], result: '舞台被你点得亮闪闪的', icon: 'music' },
 { id: 'boats-free', kind: 'toy', slots: 'boat', place: 'pier', title: '自己给小船涂色', pool: ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink'], result: '小船都穿上了你选的颜色', icon: 'waves' },
 { id: 'nap', kind: 'say', place: 'hammock', title: '吊床午睡', pool: ['I need a rest.', 'Good night!', 'Stay with me, please.', 'I feel sad.'], result: '伙伴在吊床上安心地睡着啦', icon: 'moon' },
];
export const ROUNDS = 3;

const COLORS = ['red', 'yellow', 'green', 'blue', 'purple', 'orange', 'pink'], FRUITS = ['apple', 'banana', 'strawberry', 'grapes', 'watermelon'];
const TOYBOX = { icon: 'tent', label: '帐篷里' }, SKY = { icon: 'cloud', label: '天上' }, GARDEN = { icon: 'flower', label: '小花园' };
type Own = Pick<Play, 'kind' | 'title' | 'pool' | 'result' | 'icon'> & Pick<Partial<Play>, 'to' | 'slots'>;
/**
 * Each companion's own little wish, from its setting (an animal plus a natural element). The title follows the
 * companion's name and “想”: “学学想让你教它说话”.
 */
const OWN: Record<string, Own> = {
 bubbo: { kind: 'echo', title: '吹泡泡，说说泡泡里有什么', pool: ['ball', 'fish', 'star', 'apple', 'flower', 'hat', 'sun', 'bird'], result: '泡泡飘得满天都是', icon: 'water' },
 berry: { kind: 'do', title: '把莓果分给朋友', pool: ['strawberry', 'apple', 'grapes', 'banana', 'watermelon'], result: '大家都吃到莓莓分的果子啦', icon: 'strawberry' },
 puffy: { kind: 'find', title: '找找天上的云朵', pool: ['cloud', 'sun', 'rainbow', 'bird', 'star'], result: '绵绵在云朵里打了个滚', icon: 'cloud' },
 twinkle: { kind: 'toy', slots: 'lamp', title: '点亮小星灯', pool: COLORS, result: '闪闪的小星灯亮起来啦', icon: 'star' },
 sunny: { kind: 'say', title: '听听轮到谁玩球', pool: ['My turn!', 'Your turn!', "Let's play!"], result: '暖暖玩得真开心', icon: 'ball' },
 moony: { kind: 'do', to: SKY, title: '把月亮和星星挂上天', pool: ['moon', 'star', 'sun'], result: '月月在星星下面睡着啦', icon: 'moon' },
 drippy: { kind: 'do', to: GARDEN, title: '给小花下一场小雨', pool: ['water', 'flower', 'tree', 'green'], result: '小花喝饱啦', icon: 'water' },
 snowy: { kind: 'do', title: '喝点凉凉的', pool: ['water', 'milk', 'watermelon', 'grapes'], result: '雪雪凉快多了', icon: 'water' },
 leafy: { kind: 'say', title: '安安静静歇一会', pool: ['I need a rest.', 'Stay with me, please.', 'Good night!'], result: '叶叶抱着树枝睡着啦', icon: 'tree' },
 petal: { kind: 'find', title: '找花朵的颜色', pool: ['red', 'yellow', 'pink', 'purple', 'orange', 'blue'], result: '瓣瓣在花丛里飞了一圈', icon: 'flower' },
 shelly: { kind: 'find', title: '找海边的小宝贝', pool: ['fish', 'turtle', 'bird', 'water', 'star'], result: '贝贝把宝贝收进了小贝壳', icon: 'search' },
 dandy: { kind: 'find', title: '追上被风吹走的东西', pool: ['balloon', 'hat', 'cloud', 'bird'], result: '蒲蒲飘起来接住啦', icon: 'wind' },
 pebbo: { kind: 'do', to: TOYBOX, title: '把东西搬回营地', pool: ['ball', 'book', 'hat', 'balloon'], result: '墩墩稳稳地都搬好啦', icon: 'tent' },
 mushy: { kind: 'find', title: '雨后出来找一找', pool: ['flower', 'tree', 'rainbow', 'cloud', 'water'], result: '菇菇找到了雨后的小惊喜', icon: 'rainbow' },
 nutty: { kind: 'find', title: '让你找它藏起来的东西', pool: ['ball', 'book', 'hat', 'cookie', 'egg'], result: '都被你找到啦，栗栗又去藏了', icon: 'search' },
 carro: { kind: 'do', title: '收水果', pool: FRUITS, result: '萝萝的篮子装满啦', icon: 'apple' },
 pinny: { kind: 'find', title: '晒着太阳看天空', pool: ['sun', 'tree', 'cloud', 'bird'], result: '松松和小树苗都晒暖和啦', icon: 'sun' },
 glowy: { kind: 'toy', slots: 'lamp', title: '把存的阳光变成彩灯', pool: COLORS, result: '亮亮的小灯照亮了营地', icon: 'sun' },
 breezy: { kind: 'find', title: '看看风吹来了什么', pool: ['cloud', 'balloon', 'bird', 'hat', 'flower'], result: '呼呼又吹来一阵凉凉的风', icon: 'wind' },
 pumpy: { kind: 'do', title: '吃点心', pool: ['cake', 'cookie', 'egg', 'milk', 'banana', 'apple'], result: '南南吃饱了，想睡觉啦', icon: 'cake' },
 splashy: { kind: 'say', title: '再练一次游泳', pool: ["Let's try again!", 'Help, please!', 'All done!'], result: '扑扑这次游得更远啦', icon: 'waves' },
 shady: { kind: 'echo', title: '让影子学你点的东西', pool: ['ball', 'hat', 'sun', 'moon', 'star', 'fish', 'bird', 'flower'], result: '影子学得一模一样', icon: 'moon' },
 wavy: { kind: 'echo', title: '和你一起唱海浪歌', pool: ['water', 'fish', 'moon', 'star', 'sun', 'bird', 'turtle'], result: '海面安安静静的', icon: 'waves' },
 dewy: { kind: 'find', title: '找亮晶晶的露珠', pool: ['flower', 'tree', 'green', 'water'], result: '露露的小包装满了露珠', icon: 'water' },
 mellow: { kind: 'say', title: '慢慢地打招呼', pool: ['Hello!', "Let's go!", 'Thank you!'], result: '慢慢终于说完啦', icon: 'waves' },
 mangi: { kind: 'do', title: '把高处的水果摘给朋友', pool: FRUITS, result: '朋友们都拿到水果啦', icon: 'apple' },
 mossy: { kind: 'say', title: '去接要帮忙的朋友', pool: ['Help, please!', 'Thank you!', 'Sorry.'], result: '苔苔把朋友稳稳送到了对岸', icon: 'heart' },
 twirly: { kind: 'toy', slots: 'lamp', title: '给晚霞涂颜色', pool: ['pink', 'orange', 'purple', 'red', 'yellow'], result: '天空变成了转转喜欢的晚霞', icon: 'sun' },
 sayo: { kind: 'echo', title: '让你教它说话', pool: ['apple', 'ball', 'sun', 'fish', 'hat', 'cake', 'red', 'blue'], result: '学学都学会啦', icon: 'speaker' },
 dreamy: { kind: 'say', title: '送大家一个好梦', pool: ['Good night!', "I'm happy!", 'I feel sad.'], result: '梦梦送出了香香的好梦', icon: 'moon' },
 blossy: { kind: 'sort', slots: 'lamp', title: '给春天挑颜色', pool: ['pink', 'green', 'yellow', 'red'], result: '樱樱飞过的地方都开花啦', icon: 'flower' },
 rimo: { kind: 'find', title: '顺着霜花脚印找一找', pool: ['tree', 'flower', 'star', 'moon'], result: '霜霜把路照得亮亮的', icon: 'star' },
 diggy: { kind: 'find', title: '挖出土里的宝贝', pool: ['turtle', 'egg', 'ball', 'cookie', 'hat'], result: '挖过的地方长出了幸运草', icon: 'shovel' },
 rainbo: { kind: 'sort', slots: 'lamp', title: '给尾巴涂颜色', pool: COLORS, result: '彩彩的尾巴变成了彩虹', icon: 'rainbow' },
};
/** A companion's own activity where it is today: its favourite place when the path has opened it, otherwise its home. */
export function ownPlay(s: SaveData, species: string): Play | undefined {
 const own = OWN[species], homes = HOMES[species];
 if (!own || !homes) return undefined;
 const open = unlockedDistricts(s), place = [homes.favorite, homes.home].find(id => { const at = placeById(id); return !!at && open.has(at.district); });
 return place ? { ...own, id: `own-${species}`, place, owner: species } : undefined;
}
export const OWN_SPECIES = Object.keys(OWN);

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
/** Place activities by id; a companion's own activity (`own-<species>`) is placed for this child's island. */
export const playById = (id: string, s?: SaveData) => PLAYS.find(p => p.id === id) ?? (s && id.startsWith('own-') ? ownPlay(s, id.slice(4)) : undefined);
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

/** What a free activity (echo, toy) puts in front of the child: learned things, those due to be met again first. */
export function freeItems(s: SaveData, play: Play, session: string, now = Date.now()) {
 return playOrder(s, play, session, now).slice(0, play.kind === 'toy' ? 7 : 6);
}

/** The open activity with the most learned items waiting for review, so the island can invite the child back to it. */
export function duePlay(s: SaveData, now = Date.now()): { play: Play; keys: string[] } | undefined {
 const due = new Set(reviewKeys(s, 'due', now));
 if (!due.size) return undefined;
 const open = unlockedDistricts(s);
 return PLAYS.filter(p => !isFreePlay(p) && open.has(placeById(p.place)!.district) && playOpenFor(s, p))
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
 // Its own activity once enough of its words are learned; until then, whatever its place offers.
 const own = ownPlay(s, species);
 return own && playOpenFor(s, own) ? own : playsAt(s, homes.favorite)[0] ?? playsAt(s, homes.home)[0];
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
