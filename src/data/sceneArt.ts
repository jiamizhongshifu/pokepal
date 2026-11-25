/** Island illustration paths. Every screen takes scene art from here so the whole game shares one style set.
    Scenes, backgrounds, props, icons and creatures are all vectors (scripts/art/vectorize.py). */
const ROOT = '/scenes/flat-v1';

export const STORY_BACKGROUNDS = ['beach', 'garden-flowers', 'garden-path', 'meadow', 'orchard', 'playground'] as const;
export type StoryBackground = typeof STORY_BACKGROUNDS[number];
/** Painted scenes drawn as a vector ground plus moving pieces. */
export type WorldArt = 'island-map' | 'learning-path' | `learning-path-${2 | 3 | 4 | 5 | 6}`;

export const storyBackground = (name: StoryBackground | string) => `${ROOT}/story-bg/${name}.svg`;
export const storyProp = (name: string) => `${ROOT}/prop/${name}.svg`;
/** A painted scene redrawn as vector pieces (scripts/art/vectorize.py): `base` is its ground, the rest move on their own. */
export const layerArt = (scene: WorldArt, piece: string) => `${ROOT}/layers/${scene}/${piece}.svg`;
/** Each wide-screen side painting (`side-left` / `side-right`): the 60% painted outward from the ground's edge plus the
 *  4% of the ground's own edge it keeps, to reach over the scene (vectorize.py KEPT and OVER, styles.css .scene-side). */
export const SIDE_WIDTH = .64, SIDE_OVER = .04;
/** The learning path's chapters, in order: the same island trail painted for six times of day and themes. */
export const PATH_ART: WorldArt[] = ['learning-path', 'learning-path-2', 'learning-path-3', 'learning-path-4', 'learning-path-5', 'learning-path-6'];
/** Each ground is painted with one flat colour along its top edge (sky) and one along its bottom edge (water), so on a
 *  screen taller than the picture those colours simply go on above and below it. Read from the art; redo after repainting a ground. */
const SCENE_EDGE: Record<WorldArt, readonly [top: string, bottom: string]> = {
  'island-map': ['#01daeb', '#01daeb'],
  'learning-path': ['#49c9fc', '#02ced3'], 'learning-path-2': ['#49c8fc', '#02ccd4'], 'learning-path-3': ['#2ec1fc', '#02ccd1'],
  'learning-path-4': ['#fabc5f', '#02c1c4'], 'learning-path-5': ['#c68dc1', '#5857c2'], 'learning-path-6': ['#125bc0', '#02c1d1'],
};
export const sceneEdge = (scene: WorldArt) => ({ '--scene-top': SCENE_EDGE[scene][0], '--scene-bottom': SCENE_EDGE[scene][1] }) as Record<string, string>;
export const pathScene = (chapter: number) => PATH_ART[chapter % PATH_ART.length];
export const pathArt = (chapter: number) => layerArt(PATH_ART[chapter % PATH_ART.length], 'base');
