import { FIRST_FRIEND } from '../data/creatures';
import { TASK_KINDS } from '../data/tasks';
import type { Daily, DaySummary, SaveData, Settings } from '../types';
import { todayStr } from './date';
import { isAvatarPhoto } from './avatar';
import { normalizeLearningSettings } from './learningStage';
import { migrateLearning } from './learningProgress';
import { migrateParticipation } from './participation';

function defaultSettings(): Settings {
  return { dailyMinutes: 15, tasksPerDay: 4, level: 1, favorites: [FIRST_FRIEND], speechRate: 1 };
}

function newDaily(date: string): Daily {
  const board = [...TASK_KINDS];
  return {
    date,
    energyEarned: 0,
    board,
    boardDone: board.map(() => false),
    bonusGiven: false,
    tasksCompleted: 0,
    heard: 0,
    spoken: 0,
    words: [],
    caught: [],
    playSeconds: 0,
    extraSeconds: 0
  };
}

export function newSave(): SaveData {
  return {
    version: 1,
    trainer: null,
    energy: 0,
    balls: { poke: 0, great: 0, ultra: 0, master: 0 },
    captures: [],
    daily: newDaily(todayStr()),
    streak: { lastDate: "", count: 0 },
    wordStats: {},
    settings: normalizeLearningSettings(defaultSettings()),
    history: []
  };
}

function summarize(d: Daily): DaySummary {
  return {
    date: d.date,
    energyEarned: d.energyEarned,
    tasksCompleted: d.tasksCompleted,
    heard: d.heard,
    spoken: d.spoken,
    words: d.words.filter((w) => !w.startsWith("letter:")).length,
    caught: d.caught.length,
    playMinutes: Math.round(d.playSeconds / 60)
  };
}

export function rollover(s: SaveData, today = todayStr()) {
  if (s.daily.date === today) return;
  s.history = [...s.history.filter((h) => h.date !== s.daily.date), summarize(s.daily)].slice(-30);
  s.daily = newDaily(today);
}

// Both device reads and imported backups enter play with the same learning state and local day.
export function prepareForPlay(save: SaveData) {
  save.settings = normalizeLearningSettings({ ...defaultSettings(), ...save.settings });
  if (save.trainer && !isAvatarPhoto(save.trainer.avatarPhoto)) delete save.trainer.avatarPhoto;
  migrateLearning(save);
  migrateParticipation(save);
  rollover(save);
}
