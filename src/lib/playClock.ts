import type { SaveData } from '../types';
/** Called only after the store checks same-day/session guards. Keep large learning history shared. */
export function advancePlayClock(save: SaveData, seconds: number, limit: number): SaveData {
 const gain = Number.isFinite(seconds) ? Math.max(0, Math.min(seconds, limit - save.daily.playSeconds)) : 0;
 if (!gain) return save;
 return {...save, daily:{...save.daily, playSeconds:save.daily.playSeconds+gain}};
}
