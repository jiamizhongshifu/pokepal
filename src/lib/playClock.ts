import type { SaveData } from '../types';

export const playLimitSeconds = (save: SaveData) => save.settings.dailyMinutes * 60 + save.daily.extraSeconds;
export const timeIsUp = (save: SaveData) => !!save.trainer && save.daily.playSeconds >= playLimitSeconds(save);

/** A fresh grant also covers excess time recorded by older releases on the rest screen. */
export function grantPlayMinutes(save: SaveData, minutes: number) {
  const overrun = Math.max(0, save.daily.playSeconds - playLimitSeconds(save));
  save.daily.extraSeconds += overrun + Math.max(0, minutes) * 60;
}

/** Preserve large histories by sharing everything except the changed daily record. */
export function advancePlayClock(save: SaveData, seconds: number): SaveData {
  const remaining = playLimitSeconds(save) - save.daily.playSeconds;
  const gain = Number.isFinite(seconds) ? Math.max(0, Math.min(seconds, remaining)) : 0;
  if (!gain) return save;
  return { ...save, daily: { ...save.daily, playSeconds: save.daily.playSeconds + gain } };
}
