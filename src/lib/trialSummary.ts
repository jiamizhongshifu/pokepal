import type { SaveData } from '../types';
import { LEARNING_UNITS } from '../data/curriculum';
import { summarizeDelayed, summarizeOpportunities } from './learningProgress';
import { isIslandSource } from './islandAsk';
import { learningStageTitle } from './learningStage';
import { todayStr } from './date';

/**
 * The two-week trial recap a parent can read and, if they choose, copy into feedback. Built only from this device's
 * save; it carries counts and lesson titles, never the child's name, recordings, photos, diaries or free text.
 */
export const TRIAL_DAYS = 14;

export interface Ratio { decidable: number; independent: number; enough: boolean }
export interface TrialSummary {
 from: string; to: string; stage: string;
 activeDays: number; minutes: number;
 lessons: string[]; lessonsDone: number; lessonsTotal: number;
 lesson: Ratio; review: Ratio; island: Ratio;
 homeTried: number;
}

const ratio = (r: { decidable: number; independent: number; enough: boolean }): Ratio => ({ decidable: r.decidable, independent: r.independent, enough: r.enough });

export function trialSummary(s: SaveData, now = Date.now()): TrialSummary {
 const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (TRIAL_DAYS - 1));
 const since = start.getTime(), from = todayStr(start), to = todayStr(new Date(now));
 const d = s.daily;
 const today = { date: d.date, heard: d.heard, tasksCompleted: d.tasksCompleted, playMinutes: Math.round(d.playSeconds / 60) };
 const days = [...s.history.filter(h => h.date !== d.date), today].filter(h => h.date >= from && h.date <= to);
 const units = s.learning?.units ?? {};
 const opps = s.learning?.opportunities ?? [];
 return {
  from, to, stage: learningStageTitle(s.settings),
  activeDays: days.filter(h => h.heard + h.tasksCompleted + h.playMinutes > 0).length,
  minutes: days.reduce((n, h) => n + h.playMinutes, 0),
  lessons: LEARNING_UNITS.filter(u => (units[u.id]?.completedAt ?? 0) >= since).map(u => u.title),
  lessonsDone: LEARNING_UNITS.filter(u => units[u.id]?.completedAt).length,
  lessonsTotal: LEARNING_UNITS.length,
  lesson: ratio(summarizeOpportunities(opps.filter(o => !isIslandSource(o.source) && o.source !== 'review'), since)),
  review: ratio(summarizeDelayed(opps, since)),
  island: ratio(summarizeOpportunities(opps.filter(o => isIslandSource(o.source)), since)),
  homeTried: Object.values(units).filter(u => (u.homeTriedAt ?? 0) >= since).length,
 };
}

export const ratioText = (r: Ratio) => r.decidable === 0 ? '还没有记录' : r.enough ? `第一次就选对 ${r.independent} / ${r.decidable} 次` : `记录不足（${r.decidable} 次）`;

/** Plain text for the feedback form: the numbers, what they cannot tell, and the three questions for the grown-up. */
export function trialSummaryText(t: TrialSummary): string {
 return [
  `啵啵岛两周试用小结（${t.from} 至 ${t.to}）`,
  `学习阶段：${t.stage}`,
  `用了几天：${t.activeDays} / ${TRIAL_DAYS} 天，合计约 ${t.minutes} 分钟`,
  `这两周新走完：${t.lessons.length} 课${t.lessons.length ? `（${t.lessons.join('、')}）` : ''}；累计 ${t.lessonsDone} / ${t.lessonsTotal} 课`,
  `课程里作答：${ratioText(t.lesson)}`,
  `隔天复习：${ratioText(t.review)}`,
  `小岛上用一用：${ratioText(t.island)}`,
  `在家试过的句子：${t.homeTried} 句`,
  '以上只来自这台设备的记录，看不出是否有大人帮忙，也不代表已经掌握；不含名字、录音、照片和日记。',
  '',
  '大人补充（想到什么写什么）：',
  '1. 孩子在哪一步需要你解释或代点？',
  '2. 有没有自己想再听一个词、指一指图片，或说出一个英文？',
  '3. 是孩子主动要玩，还是大人提议的？哪一部分最想再玩？',
 ].join('\n');
}
