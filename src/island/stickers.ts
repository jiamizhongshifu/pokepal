import type { SaveData } from '../types';
import { learningPath, pathNodes } from '../lib/learningPath';
import type { Spot } from './world';

/**
 * Island decorations are stickers on the illustration. Every chapter of the learning path earns two: one when its
 * "use it on the island" stop is done, one when the chapter is talked about. Earned stickers are read from path
 * progress, so nothing is stored but the ones a child has put away; nothing is bought.
 */
export interface Sticker { id: string; name: string; spot: Spot; size: number }
export const STICKERS: Sticker[] = [
 { id: 'deco-camp-bunting', name: '营地小彩旗', spot: [92, 27], size: 12 },
 { id: 'deco-picnic-basket', name: '野餐果盘', spot: [50, 57], size: 9 },
 { id: 'deco-garden-sunflowers', name: '向日葵', spot: [8, 53], size: 10 },
 { id: 'watering-can', name: '小水壶', spot: [27, 50], size: 6 },
 { id: 'deco-play-lights', name: '舞台彩灯', spot: [67, 15], size: 12 },
 { id: 'deco-beach-sandcastle', name: '小沙堡', spot: [30, 88], size: 10 },
 { id: 'deco-camp-lantern', name: '营地小灯笼', spot: [90, 43], size: 7 },
 { id: 'deco-picnic-cushions', name: '软软坐垫', spot: [60, 59], size: 8 },
 { id: 'deco-garden-birdhouse', name: '小鸟屋', spot: [32, 25], size: 7 },
 { id: 'deco-play-balloons', name: '一束气球', spot: [39, 24], size: 9 },
 { id: 'flag', name: '栈桥小旗', spot: [80, 74], size: 6 },
 { id: 'deco-beach-starfish', name: '海星花环', spot: [64, 89], size: 9 },
];
/** Stops that earn a sticker, in path order: each chapter's island stop and its chapter talk. */
export function stickersEarnedCount(s: SaveData) {
 return pathNodes(learningPath(s)).filter(n => (n.kind === 'island' || n.kind === 'diary') && n.state === 'done').length;
}
export const stickerEarned = (s: SaveData, k: Sticker, earned = stickersEarnedCount(s)) => STICKERS.indexOf(k) < earned;
export const stickerShown = (s: SaveData, k: Sticker, earned = stickersEarnedCount(s)) => stickerEarned(s, k, earned) && !(s.islandProgress?.hidden ?? []).includes(k.id);
export const shownStickers = (s: SaveData) => { const earned = stickersEarnedCount(s); return STICKERS.filter(k => stickerShown(s, k, earned)); };
export function toggleSticker(s: SaveData, id: string) {
 const k = STICKERS.find(k => k.id === id);
 if (!k || !stickerEarned(s, k)) return false;
 const p = s.islandProgress ??= { version: 1, owned: [], nextGiftAt: 120, levels: { camp: 0, picnic: 0, garden: 0, play: 0, island: 0 } };
 const hidden = new Set(p.hidden ?? []);
 if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
 p.hidden = [...hidden];
 return true;
}
