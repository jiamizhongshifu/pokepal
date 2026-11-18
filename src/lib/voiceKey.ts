import type { Lang } from '../types';

/** Recording lookup key shared by the build pipeline and playback. Slow story narration is a separate recording. */
export type VoicePace='normal'|'slow';
export const voiceKey=(lang:Lang,text:string,pace:VoicePace='normal')=>`${lang}${pace==='slow'?'~slow':''}|${text}`;
/** Story narration at a calmer pace, synthesized rather than pitch-shifted. */
export const SLOW_STORY_RATE=-30;
