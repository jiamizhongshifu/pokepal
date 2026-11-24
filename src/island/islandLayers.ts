import layout from '../data/sceneLayers.generated.json';
import type { District } from './world';

/** The island's vector pieces (scripts/art/vectorize.py): each sits at a % box of the picture and belongs to an area. */
export type LayerBox = { x: number; y: number; w: number; h: number };
/** Which area each piece belongs to: tapping an area makes its pieces answer. */
export const LAYER_AREA: Record<string, District> = {
 orchard: 'garden', windmill: 'garden', 'windmill-sails': 'garden',
 stage: 'play', sandbox: 'play',
 tent: 'camp', 'campfire-stones': 'camp', flame: 'camp',
 bench: 'leisure', parasol: 'leisure', palms: 'leisure',
 pier: 'beach', boat: 'beach',
};
// Farther pieces first, so nearer ones are drawn over them; a piece that sits on another (the sails on the tower,
// the flame on its stones) always comes after it.
const ON_TOP = new Set(['windmill-sails', 'flame']);
export const ISLAND_PIECES = Object.entries(layout['island-map'] as Record<string, LayerBox>)
 .sort(([a, p], [b, q]) => Number(ON_TOP.has(a)) - Number(ON_TOP.has(b)) || (p.y + p.h) - (q.y + q.h));
