import type { SaveData } from '../types';
import type { UpgradeId } from '../lib/islandProgress';
import type { Spot } from './world';

/**
 * Island decorations are stickers on the illustration. Each path island stop earns the next one (the saved area
 * levels, two per area; the former "expand the island" levels are the beach's two). A child can put any earned
 * sticker away and bring it back; nothing is bought.
 */
export interface Sticker { id: string; area: UpgradeId; level: 1 | 2; name: string; spot: Spot; size: number }
export const STICKERS: Sticker[] = [
 { id: 'deco-camp-bunting', area: 'camp', level: 1, name: '营地小彩旗', spot: [92, 27], size: 12 },
 { id: 'deco-picnic-basket', area: 'picnic', level: 1, name: '野餐果盘', spot: [50, 57], size: 9 },
 { id: 'deco-garden-sunflowers', area: 'garden', level: 1, name: '向日葵', spot: [8, 53], size: 10 },
 { id: 'deco-play-lights', area: 'play', level: 1, name: '舞台彩灯', spot: [67, 15], size: 12 },
 { id: 'deco-beach-sandcastle', area: 'island', level: 1, name: '小沙堡', spot: [30, 88], size: 10 },
 { id: 'deco-camp-lantern', area: 'camp', level: 2, name: '营地小灯笼', spot: [90, 43], size: 7 },
 { id: 'deco-picnic-cushions', area: 'picnic', level: 2, name: '软软坐垫', spot: [60, 59], size: 8 },
 { id: 'deco-garden-birdhouse', area: 'garden', level: 2, name: '小鸟屋', spot: [32, 25], size: 7 },
 { id: 'deco-play-balloons', area: 'play', level: 2, name: '一束气球', spot: [39, 24], size: 9 },
 { id: 'deco-beach-starfish', area: 'island', level: 2, name: '海星花环', spot: [64, 89], size: 9 },
];
export const stickerEarned = (s: SaveData, k: Sticker) => (s.islandProgress?.levels[k.area] ?? 0) >= k.level;
export const stickerShown = (s: SaveData, k: Sticker) => stickerEarned(s, k) && !(s.islandProgress?.hidden ?? []).includes(k.id);
export const shownStickers = (s: SaveData) => STICKERS.filter(k => stickerShown(s, k));
export function toggleSticker(s: SaveData, id: string) {
 const k = STICKERS.find(k => k.id === id), p = s.islandProgress;
 if (!k || !p || !stickerEarned(s, k)) return false;
 const hidden = new Set(p.hidden ?? []);
 if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
 p.hidden = [...hidden];
 return true;
}
