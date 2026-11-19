import { LEARNING_CHAPTERS, LEARNING_UNITS, unitUnlocked, type LearningUnit } from '../data/curriculum';
import { STORIES, storyProgressKey } from '../data/stories';
import type { SaveData } from '../types';

export type PathNodeKind = 'lesson' | 'story' | 'island' | 'friend';
export type PathNodeState = 'done' | 'current' | 'locked';
export interface PathNode {
 key: string; kind: PathNodeKind; chapter: number; index: number; title: string; icon: string; state: PathNodeState;
 unit?: LearningUnit; storyId?: string; station?: string;
}
export interface PathChapter { index: number; title: string; goal: string; nodes: PathNode[]; done: number }
/** What the child keeps on the path: friends met at each chapter's friend stop and stops already celebrated. */
export interface PathRecord { version: 1; friends: Record<string, number>; pendingFriend?: number; seen: string[]; energyMigrated?: true }

const LANDMARK: Record<LearningUnit['theme'], string> = { garden: 'tree', play: 'ball', leisure: 'moon', camp: 'tent', beach: 'waves' };
/** The island place a lesson happens at, as an icon name. */
export const destinationIcon = (unit: LearningUnit) => /^(berry|bowl|picnic)/.test(unit.station) ? 'bowl' : LANDMARK[unit.theme];

/** One picture book per chapter: the first related story not already used by an earlier chapter. */
const CHAPTER_STORY = (() => {
 const used = new Set<string>();
 return LEARNING_CHAPTERS.map((_, c) => {
  const options = LEARNING_UNITS.filter(u => u.chapter === c).map(u => u.story).filter(id => STORIES.some(s => s.id === id));
  const id = options.find(o => !used.has(o)) ?? options[0];
  used.add(id); return id;
 });
})();

const storyRead = (s: SaveData, id: string) => {
 const story = STORIES.find(x => x.id === id);
 return !!story && (s.storyProgress?.[storyProgressKey(story)] ?? 0) > story.pages.length;
};

/** Each chapter: two lessons, its picture book, two more lessons, using the words on the island, then meeting a new friend. */
export function learningPath(s: SaveData): PathChapter[] {
 const lessonDone = (u: LearningUnit) => !!s.learning?.units[u.id]?.completedAt;
 let ordinal = 0, foundCurrent = false;
 return LEARNING_CHAPTERS.map((chapter, c) => {
  const lessons = LEARNING_UNITS.filter(u => u.chapter === c);
  const story = STORIES.find(x => x.id === CHAPTER_STORY[c]);
  const last = lessons[lessons.length - 1];
  const steps: Omit<PathNode, 'state' | 'index'>[] = [];
  const lesson = (u: LearningUnit) => steps.push({ key: `lesson:${u.id}`, kind: 'lesson', chapter: c, title: u.title, icon: destinationIcon(u), unit: u });
  lessons.slice(0, 2).forEach(lesson);
  if (story) steps.push({ key: `story:${story.id}`, kind: 'story', chapter: c, title: story.title, icon: 'book', storyId: story.id });
  lessons.slice(2).forEach(lesson);
  steps.push({ key: `island:${c}`, kind: 'island', chapter: c, title: '去小岛用一用', icon: 'island', unit: last, station: last.station });
  steps.push({ key: `friend:${c}`, kind: 'friend', chapter: c, title: '认识新朋友', icon: 'invite-berry' });
  const isDone = (n: Omit<PathNode, 'state' | 'index'>) =>
   n.kind === 'lesson' ? lessonDone(n.unit!)
   : n.kind === 'story' ? storyRead(s, n.storyId!)
   : n.kind === 'island' ? !!s.learning?.units[n.unit!.id]?.encounteredAt
   : s.path?.friends[String(c)] !== undefined;
  const nodes = steps.map((n): PathNode => {
   const done = isDone(n);
   // A lesson can only start once the curriculum unlocks it, so a later lesson never jumps ahead of an earlier one.
   const available = n.kind !== 'lesson' || unitUnlocked(s, n.unit!.id);
   const state: PathNodeState = done ? 'done' : !foundCurrent && available ? 'current' : 'locked';
   if (state === 'current') foundCurrent = true;
   if (!done) foundCurrent = true;
   return { ...n, index: ordinal++, state };
  });
  return { index: c, title: chapter.title, goal: chapter.goal, nodes, done: nodes.filter(n => n.state === 'done').length };
 });
}

/** Stars are one per finished stop; they record progress and are never spent. */
export const pathStars = (path: PathChapter[]) => path.reduce((n, c) => n + c.done, 0);
export const currentNode = (path: PathChapter[]) => path.flatMap(c => c.nodes).find(n => n.state === 'current');
export const pathNodes = (path: PathChapter[]) => path.flatMap(c => c.nodes);

export function ensurePath(s: SaveData): PathRecord { return s.path ??= { version: 1, friends: {}, seen: [] }; }

export function validPath(p: unknown): boolean {
 if (!p || typeof p !== 'object') return false;
 const r = p as Record<string, unknown>;
 const friends = r.friends as Record<string, unknown>;
 return r.version === 1 && !!friends && typeof friends === 'object'
  && Object.entries(friends).every(([k, v]) => /^\d+$/.test(k) && Number.isInteger(v))
  && (r.pendingFriend === undefined || Number.isInteger(r.pendingFriend))
  && Array.isArray(r.seen) && r.seen.length <= 200 && r.seen.every(k => typeof k === 'string')
  && (r.energyMigrated === undefined || r.energyMigrated === true);
}

/** Energy is retired: whatever a child had saved becomes invite berries once, 5 energy each, so nothing earned is lost. */
export function migratePathEconomy(s: SaveData) {
 const p = ensurePath(s);
 if (p.energyMigrated) return;
 s.balls.poke += Math.floor(Math.max(0, s.energy) / 5);
 s.energy = 0; p.energyMigrated = true;
}

/** The friend stop gives one invite berry, used straight away to meet a new friend. */
export function claimChapterFriend(s: SaveData, chapter: number): boolean {
 const p = ensurePath(s);
 if (p.friends[String(chapter)] !== undefined) return false;
 if (p.pendingFriend !== chapter) { s.balls.poke += 1; p.pendingFriend = chapter; }
 return true;
}
/** Called when an invitation succeeds: the friend met becomes that chapter's friend. */
export function recordChapterFriend(s: SaveData, creatureId: number) {
 const p = s.path;
 if (!p || p.pendingFriend === undefined) return;
 p.friends[String(p.pendingFriend)] = creatureId;
 delete p.pendingFriend;
}
/** Newly finished stops are celebrated once; returns their keys. */
export function markPathSeen(s: SaveData, keys: string[]) {
 const p = ensurePath(s);
 const fresh = keys.filter(k => !p.seen.includes(k));
 p.seen = [...p.seen, ...fresh].slice(-200);
 return fresh;
}
