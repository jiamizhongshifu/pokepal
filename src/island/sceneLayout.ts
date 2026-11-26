import type { District, Spot } from './world';

/**
 * Where things stand inside each scene (% of the scene, where an object's foot rests). Every place of the area is
 * drawn as an object, and an object is how its activities begin: a child taps the tent to tidy up, the stage to light
 * the lamps. Friends stand where no object is. `size` is the object's width in % of the scene.
 */
export interface SceneObject { art: { icon: string } | { prop: string }; spot: Spot; size: number }
export interface SceneLayout { friends: Spot[]; objects: Record<string, SceneObject> }

const icon = (name: string) => ({ icon: name }), prop = (name: string) => ({ prop: name });
export const SCENE_LAYOUT: Record<District, SceneLayout> = {
 camp: { friends: [[42, 64], [20, 62], [58, 54]], objects: {
  tent: { art: icon('tent'), spot: [84, 62], size: 22 },
  fire: { art: icon('flame'), spot: [68, 68], size: 10 },
 } },
 garden: { friends: [[16, 62]], objects: {
  tree: { art: prop('basket-apples'), spot: [34, 52], size: 9 },
  farm: { art: prop('watering-can'), spot: [34, 76], size: 9 },
  windmill: { art: icon('decor-pinwheel'), spot: [94, 46], size: 10 },
 } },
 leisure: { friends: [[48, 66], [26, 64], [66, 56]], objects: {
  hammock: { art: icon('rest'), spot: [10, 58], size: 12 },
  bench: { art: icon('decor-table'), spot: [36, 50], size: 9 },
  picnic: { art: prop('deco-picnic-basket'), spot: [72, 70], size: 10 },
  parasol: { art: icon('umbrella'), spot: [88, 60], size: 15 },
 } },
 play: { friends: [[44, 62], [22, 58], [64, 56]], objects: {
  ball: { art: prop('deco-play-balloons'), spot: [8, 58], size: 10 },
  music: { art: icon('decor-music'), spot: [90, 54], size: 12 },
  sand: { art: prop('castle-building'), spot: [84, 76], size: 12 },
 } },
 beach: { friends: [[46, 62], [28, 66], [70, 58]], objects: {
  pier: { art: icon('decor-track'), spot: [10, 64], size: 13 },
  shells: { art: icon('decor-shells'), spot: [60, 82], size: 10 },
 } },
};

/** Where the thing being handed over goes, when it is not the friend: the place's object, or high up for the sky. */
export function targetSpot(district: District, place: string, sky: boolean): Spot {
 if (sky) return [70, 26];
 return SCENE_LAYOUT[district].objects[place]?.spot ?? [84, 62];
}
