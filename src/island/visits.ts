import { BABY_CREATURES } from '../data/creatures';
import { unlockedDistricts } from '../lib/islandPlan';
import { homeOf } from './world';
import type { Creature, SaveData } from '../types';

/**
 * Who can come to visit next: babies not met yet, those whose home area is already open first, so a new friend can
 * be found at home on the island straight away. Favourites go first within each group.
 */
export function visitors(s: SaveData): Creature[] {
 const met = new Set(s.captures.map(c => c.id)), open = unlockedDistricts(s), fav = new Set(s.settings.favorites ?? []);
 const rank = (c: Creature) => (open.has(homeOf(c.species).district) ? 0 : 2) + (fav.has(c.id) ? 0 : 1);
 return BABY_CREATURES.filter(c => !met.has(c.id)).sort((a, b) => rank(a) - rank(b));
}
export const homeOpen = (s: SaveData, c: Creature) => unlockedDistricts(s).has(homeOf(c.species).district);
