import { learningEntry } from '../data/curriculum';
import { errandFor } from '../island/errands';
import type { PathNode, PathNodeKind } from './learningPath';

/**
 * A chapter of the learning path drawn as one scene. Each stop has a place in the picture (% of the 3:2 art): the
 * four lessons are the four clearings along the trail, and the other stops are things already painted there — a book
 * on the trail, the boat at the pier, the tent, the picnic blanket.
 */
export type SceneSpot = readonly [x: number, y: number];
export const LESSON_SPOTS: SceneSpot[] = [[20.5, 62], [40, 31], [61.5, 59], [83, 29]];
const FIXED: Record<Exclude<PathNodeKind, 'lesson'>, SceneSpot> = {
 story: [50.5, 45], island: [9, 80], friend: [8, 55], diary: [74, 65], review: [29, 43], welcome: [35, 86],
};
export function sceneSpots(nodes: readonly PathNode[]): SceneSpot[] {
 let lesson = 0;
 return nodes.map(n => n.kind === 'lesson' ? LESSON_SPOTS[lesson++ % LESSON_SPOTS.length] : FIXED[n.kind]);
}
/** What a finished stop leaves in the scene: a lesson leaves the thing its island errand makes, others their own sign. */
export const leftBehind = (node: PathNode) => node.kind === 'lesson' && node.unit ? errandFor(node.unit)?.trace.icon ?? node.icon : node.icon;
/** The pictures in the bubble above today's stop: a lesson shows two of its words, other stops their sign. */
export function bubblePictures(node: PathNode): string[] {
 const words = node.kind === 'lesson' && node.unit ? node.unit.words.map(w => learningEntry(w)).filter(e => e?.icon && !e.css).map(e => e!.icon!) : [];
 return words.length ? [...new Set(words)].slice(0, 2) : [node.icon];
}
