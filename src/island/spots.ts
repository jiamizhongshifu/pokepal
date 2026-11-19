/** Positions on the 2D island illustration, as % of its width and height (a creature's feet). */
export type Spot = readonly [x: number, y: number];

/** Where a creature stands at each station, as % of the island illustration (feet position). */
export const STATION_SPOTS: Record<string, Spot> = {
 farm: [17.5, 47], tree: [24, 31], windmill: [37.5, 20], music: [55, 18], ball: [47, 26], sand: [63, 28],
 picnic: [54, 53], bench: [43, 47], parasol: [62, 47], tent: [79, 31], fire: [82, 36], fence: [90, 32],
 sign: [27, 59], hammock: [40, 80], shells: [18, 78], shore: [10, 83], sea: [47, 94], pier: [74, 81],
};
/** Numbered island places (several beds, bowls, fruit trees…) stand at the painted area they belong to. */
const AREA_OF: Record<string, string> = { farm: 'farm', berry: 'tree', bed: 'hammock', bowl: 'picnic', rock: 'shore', lamp: 'fire', palm: 'hammock', grove: 'tree', prop: 'bench' };
export function stationSpot(station: string): Spot | undefined {
 return STATION_SPOTS[station] ?? STATION_SPOTS[AREA_OF[station.split('-')[0]]];
}
