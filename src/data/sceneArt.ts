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
/** The learning path's chapters, in order: the same island trail painted for six times of day and themes. */
export const PATH_ART: WorldArt[] = ['learning-path', 'learning-path-2', 'learning-path-3', 'learning-path-4', 'learning-path-5', 'learning-path-6'];
export const pathArt = (chapter: number) => layerArt(PATH_ART[chapter % PATH_ART.length], 'base');
