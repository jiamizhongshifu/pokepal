import type { District } from './world';

/** Which area each piece of the island belongs to: tapping an area makes its pieces answer. */
export const LAYER_AREA: Record<string, District> = {
 orchard: 'garden', windmill: 'garden', 'windmill-sails': 'garden',
 stage: 'play', sandbox: 'play',
 tent: 'camp', 'campfire-stones': 'camp', flame: 'camp',
 bench: 'leisure', parasol: 'leisure', palms: 'leisure',
 pier: 'beach', boat: 'beach',
};
