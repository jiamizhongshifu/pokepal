import type { Activity } from '../lib/routine';
import type { WeatherKind } from '../lib/weather';

/**
 * Bubbly Isle as the child sees it: one illustration, five areas, fourteen places a child can find and tap.
 * Every place has one thing to do, every companion has a home and a favourite place. This is the only map of the
 * island; positions are % of the illustration (where a creature's feet stand).
 */
export type District = 'garden' | 'play' | 'leisure' | 'camp' | 'beach';
export type Spot = readonly [x: number, y: number];
export interface Place { id: string; district: District; name: string; icon: string; activity: Activity; action: string; spot: Spot }

export const DISTRICTS: { id: District; name: string; icon: string }[] = [
 { id: 'camp', name: '营地区', icon: 'tent' },
 { id: 'garden', name: '种植区', icon: 'flower' },
 { id: 'leisure', name: '休闲区', icon: 'sun' },
 { id: 'play', name: '游乐区', icon: 'balloon' },
 { id: 'beach', name: '海岸区', icon: 'waves' },
];

const P = (id: string, district: District, name: string, icon: string, activity: Activity, action: string, spot: Spot): Place => ({ id, district, name, icon, activity, action, spot });
export const PLACES: Place[] = [
 P('tent', 'camp', '帐篷', 'tent', 'sleep', '在帐篷边歇歇', [79, 31]),
 P('fire', 'camp', '篝火', 'flame', 'eat', '在篝火边吃点心', [82, 36]),
 P('tree', 'garden', '果树', 'apple', 'explore', '看看果树', [24, 31]),
 P('farm', 'garden', '菜地', 'grass', 'play', '照料菜地', [17.5, 47]),
 P('windmill', 'garden', '风车', 'wind', 'play', '转转风车', [37.5, 20]),
 P('picnic', 'leisure', '野餐布', 'bowl', 'eat', '分享野餐点心', [54, 53]),
 P('bench', 'leisure', '长椅', 'sun', 'sunbathe', '在长椅上晒太阳', [43, 47]),
 P('parasol', 'leisure', '遮阳伞', 'sun', 'nap', '在伞下乘凉', [62, 47]),
 P('hammock', 'leisure', '吊床', 'moon', 'nap', '在吊床上睡午觉', [40, 80]),
 P('ball', 'play', '小球场', 'balloon', 'play', '玩小皮球', [47, 26]),
 P('music', 'play', '音乐舞台', 'music', 'sing', '在舞台上唱歌', [55, 18]),
 P('sand', 'play', '沙坑', 'shovel', 'collect', '在沙坑里挖宝贝', [63, 28]),
 P('shells', 'beach', '沙滩', 'search', 'collect', '在沙滩找贝壳', [18, 78]),
 P('pier', 'beach', '栈桥', 'waves', 'explore', '在栈桥看大海', [74, 81]),
];

/** Lesson stations name a place, a numbered family of places (`bed-`), or a farm plot (`farm-2`). */
const ALIAS: Record<string, string> = { bed: 'tent', bowl: 'fire', berry: 'tree', farm: 'farm' };
export function placeById(id: string): Place | undefined {
 return PLACES.find(p => p.id === id) ?? PLACES.find(p => p.id === ALIAS[id.split('-')[0]]);
}
export const placeOf = (id: string): Place => placeById(id) ?? PLACES[0];
export const placesIn = (district: District) => PLACES.filter(p => p.district === district);
export const districtName = (d: District) => DISTRICTS.find(x => x.id === d)?.name ?? '';

/** Each companion's home follows its setting (an animal plus a natural element); the favourite place is its wish. */
export const HOMES: Record<string, { home: string; favorite: string }> = {
 bubbo: { home: 'shells', favorite: 'pier' },
 drippy: { home: 'farm', favorite: 'farm' },
 shelly: { home: 'shells', favorite: 'sand' },
 berry: { home: 'picnic', favorite: 'picnic' },
 leafy: { home: 'hammock', favorite: 'parasol' },
 petal: { home: 'tree', favorite: 'tree' },
 carro: { home: 'farm', favorite: 'farm' },
 puffy: { home: 'windmill', favorite: 'bench' },
 dandy: { home: 'windmill', favorite: 'ball' },
 twinkle: { home: 'music', favorite: 'music' },
 sunny: { home: 'ball', favorite: 'ball' },
 moony: { home: 'tent', favorite: 'tent' },
 snowy: { home: 'parasol', favorite: 'fire' },
 pebbo: { home: 'sand', favorite: 'tent' },
 mushy: { home: 'tree', favorite: 'farm' },
 nutty: { home: 'sand', favorite: 'sand' },
};
export const homeOf = (species: string) => placeOf(HOMES[species]?.home ?? 'tent');

/**
 * Where a companion is now, from its setting: home by default, now and then at its favourite place; at night most
 * sleep by the tent while the night companions stay up; rain brings the rain lovers out and sends others to shelter.
 * Weather only changes who is where, never what can be played.
 */
export function whereNow(species: string, hour: number, weather: WeatherKind, cycle = 0, id = 0): Place {
 const h = HOMES[species] ?? { home: 'tent', favorite: 'tent' };
 const night = hour >= 21 || hour < 6.5;
 if (species === 'moony') return placeOf(night ? 'hammock' : 'tent');
 if (night) return placeOf(species === 'twinkle' ? 'music' : 'tent');
 if (weather === 'rain') return placeOf(species === 'drippy' ? 'farm' : species === 'mushy' ? 'tree' : ['bubbo', 'shelly'].includes(species) ? 'shells' : 'tent');
 if (species === 'sunny' && weather === 'sunny' && hour >= 9 && hour < 15) return placeOf('bench');
 if (species === 'puffy' && weather === 'cloudy') return placeOf('windmill');
 return placeOf((id + cycle) % 4 === 0 ? h.favorite : h.home);
}

/** A companion going to a place: chosen by the island's rhythm, asked by the child (`manual`), or shared play. */
export interface Visit { station: Place; pokemonId: number; manual: boolean; key: string }
/** A short reaction drawn over a companion after care. */
export interface Effect { id: number; kind: 'pet' | 'feed' | 'night'; icon: string; at: number }
