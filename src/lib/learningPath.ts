import { LEARNING_CHAPTERS, LEARNING_UNITS, unitUnlocked, type LearningUnit } from '../data/curriculum';
import type { SaveData } from '../types';

export type PathNodeState = 'done' | 'current' | 'locked';
export interface PathNode { key: string; kind: 'lesson'; unit: LearningUnit; index: number; state: PathNodeState }
export interface PathChapter { index: number; title: string; goal: string; nodes: PathNode[]; done: number }

const LANDMARK: Record<LearningUnit['theme'], string> = { garden: 'tree', play: 'ball', leisure: 'moon', camp: 'tent', beach: 'waves' };
/** The island place a lesson happens at, as an icon name. */
export const destinationIcon = (unit: LearningUnit) => /^(berry|bowl|picnic)/.test(unit.station) ? 'bowl' : LANDMARK[unit.theme];

/** The learning path is the home of the app: every lesson in order, with exactly one current stop until all are done. */
export function learningPath(s: SaveData): PathChapter[] {
 const done = (u: LearningUnit) => !!s.learning?.units[u.id]?.completedAt;
 const active = LEARNING_UNITS.find(u => u.id === s.learning?.activeUnit && !done(u) && unitUnlocked(s, u.id));
 const current = active ?? LEARNING_UNITS.find(u => !done(u) && unitUnlocked(s, u.id));
 return LEARNING_CHAPTERS.map((chapter, index) => {
  const nodes = LEARNING_UNITS.map((unit, i) => ({ unit, i })).filter(({ unit }) => unit.chapter === index).map(({ unit, i }): PathNode => ({
   key: `lesson:${unit.id}`, kind: 'lesson', unit, index: i,
   state: done(unit) ? 'done' : unit.id === current?.id ? 'current' : 'locked',
  }));
  return { index, title: chapter.title, goal: chapter.goal, nodes, done: nodes.filter(n => n.state === 'done').length };
 });
}

/** Stars are one per finished stop; they record progress and are never spent. */
export const pathStars = (path: PathChapter[]) => path.reduce((n, c) => n + c.done, 0);
export const currentNode = (path: PathChapter[]) => path.flatMap(c => c.nodes).find(n => n.state === 'current');
