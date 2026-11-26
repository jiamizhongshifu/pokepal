import type { District, Spot } from './world';
import type { ToyKind } from './SceneToy';

/**
 * Where things stand inside each scene (% of the scene, where an object's foot rests). Every place of the area is
 * drawn as an object, and an object is how its activities begin: a child taps the tent to tidy up, the stage to light
 * the lamps. Friends stand where no object is. `size` is the object's width in % of the scene.
 */
export interface SceneObject { art: { icon: string } | { prop: string }; spot: Spot; size: number;
 /** A toy played by tapping the object itself (its activities start from the pictures above it); `label` is read aloud by screen readers. */
 toy?: { kind: ToyKind; label: string } }
/** A bush or rock that hides a learned thing (Hideaways): it only wobbles now and then, it does not glow. */
export type Hideaway = Pick<SceneObject, 'art' | 'spot' | 'size'>;
export interface SceneLayout { friends: Spot[]; objects: Record<string, SceneObject>; hides: Hideaway[] }

const icon = (name: string) => ({ icon: name }), prop = (name: string) => ({ prop: name });
export const SCENE_LAYOUT: Record<District, SceneLayout> = {
 camp: { friends: [[42, 64], [20, 62], [58, 54]], objects: {
  tent: { art: icon('tent'), spot: [84, 62], size: 22 },
  fire: { art: icon('flame'), spot: [68, 68], size: 10, toy: { kind: 'roast', label: '篝火，烤点心给伙伴吃' } },
 }, hides: [{ art: icon('bush-1'), spot: [6, 66], size: 11 }, { art: icon('bush-0'), spot: [32, 92], size: 10 }, { art: icon('bush-2'), spot: [96, 88], size: 9 }] },
 garden: { friends: [[16, 62]], objects: {
  tree: { art: prop('basket-apples'), spot: [34, 52], size: 9 },
  farm: { art: prop('watering-can'), spot: [34, 76], size: 9 },
  windmill: { art: icon('decor-pinwheel'), spot: [94, 46], size: 10 },
 }, hides: [{ art: icon('decor-flowers'), spot: [62, 40], size: 9 }, { art: icon('bush-1'), spot: [80, 40], size: 9 }, { art: icon('bush-0'), spot: [6, 88], size: 10 }] },
 leisure: { friends: [[38, 70], [18, 68], [74, 64]], objects: {
  'fruit-tree': { art: icon('tree'), spot: [60, 50], size: 16, toy: { kind: 'shake', label: '果树，摇一摇掉水果' } },
  hammock: { art: icon('rest'), spot: [10, 58], size: 12 },
  bench: { art: icon('decor-table'), spot: [24, 46], size: 9 },
  picnic: { art: icon('decor-mat'), spot: [86, 80], size: 11 },
  parasol: { art: icon('umbrella'), spot: [88, 60], size: 15 },
 }, hides: [{ art: icon('bush-0'), spot: [4, 86], size: 9 }, { art: icon('decor-flowers'), spot: [28, 94], size: 9 }, { art: icon('bush-2'), spot: [52, 94], size: 9 }] },
 play: { friends: [[44, 62], [22, 58], [64, 56]], objects: {
  ball: { art: prop('deco-play-balloons'), spot: [8, 58], size: 10 },
  music: { art: icon('decor-music'), spot: [90, 54], size: 12 },
  sand: { art: prop('castle-building'), spot: [84, 76], size: 12 },
 }, hides: [{ art: icon('bush-1'), spot: [30, 94], size: 9 }, { art: icon('bush-0'), spot: [72, 94], size: 9 }, { art: icon('bush-2'), spot: [4, 88], size: 9 }] },
 // The right of the beach is kept for the boat that brings a new friend.
 beach: { friends: [[50, 62], [26, 64], [68, 56]], objects: {
  pier: { art: icon('decor-track'), spot: [10, 64], size: 13 },
  shells: { art: icon('decor-shells'), spot: [60, 82], size: 10 },
  sandcastle: { art: prop('castle-fallen'), spot: [38, 88], size: 13, toy: { kind: 'castle', label: '沙堆，点一下堆高城堡' } },
 }, hides: [{ art: icon('rock'), spot: [20, 92], size: 9 }, { art: icon('decor-stones'), spot: [4, 82], size: 9 }, { art: icon('rock'), spot: [84, 46], size: 8 }] },
};

/** Where the thing being handed over goes, when it is not the friend: the place's object, or high up for the sky. */
export function targetSpot(district: District, place: string, sky: boolean): Spot {
 if (sky) return [70, 26];
 return SCENE_LAYOUT[district].objects[place]?.spot ?? [84, 62];
}
