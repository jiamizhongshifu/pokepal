/** Island illustration paths. Every screen takes scene art from here so the whole game shares one style set. */
const ROOT = '/scenes/flat-v1';

export type StoryBackground = 'beach' | 'garden-flowers' | 'garden-path' | 'meadow' | 'orchard' | 'playground';
export type WorldArt = 'island-map' | 'welcome' | 'learning-path' | 'meadow-clearing' | 'meadow-tuft' | 'diary-desk';

export const storyBackground = (name: StoryBackground | string) => `${ROOT}/story-bg/${name}.webp`;
export const storyProp = (name: string) => `${ROOT}/prop/${name}.webp`;
export const worldArt = (name: WorldArt) => `${ROOT}/world/${name}.webp`;
