import type { Spot } from './zones';

/**
 * The island is one 2D illustration: creatures are drawn at station spots and glide straight there,
 * so planning only needs the destination. Kept as a function so island life and shared play share one contract.
 */
export function clearSpot(_p: Spot, _r = .82, _height = .8) { return true; }
export function planWalk(_from: Spot, to: Spot, _r = .82, _occupied: readonly { x: number; z: number; r: number }[] = [], _height = .8, _reach?: { center: Spot; radius: number }): Spot[] {
 return [to];
}
