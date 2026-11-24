import layout from './sceneLayers.generated.json';

/** Vector pieces of a painted scene (scripts/art/vectorize.py): each sits at a % box of the picture. */
export type LayerBox = { x: number; y: number; w: number; h: number };
export type LayeredScene = keyof typeof layout;
// A piece that sits on another (the sails on the tower, the flame on its stones) always comes after it.
const ON_TOP = new Set(['windmill-sails', 'flame']);
/** Farther pieces first, so nearer ones are drawn over them. */
export const scenePieces = (scene: LayeredScene) => Object.entries(layout[scene] as Record<string, LayerBox>)
 .sort(([a, p], [b, q]) => Number(ON_TOP.has(a)) - Number(ON_TOP.has(b)) || (p.y + p.h) - (q.y + q.h));
