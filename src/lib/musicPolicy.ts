/** Shared by the player and regression tests. Times follow routine.skyFor(). */
export type MusicTrack = 'morning'|'day'|'evening'|'night'|'meadow'|'storybook'|'village';
export type MusicLevel = 'off'|'soft'|'normal';
export function sceneMusic(screen:string, sky:'morning'|'day'|'evening'|'night', blocked=false):MusicTrack|null {
  // Keep microphones and focused teaching free of music, including microphone preparation.
  if(blocked || ['parent','diary','task','lesson','review','sleepy'].includes(screen))return null;
  if(screen==='home'||screen==='welcome')return sky;
  if(screen==='catch')return 'meadow';
  if(screen==='story'||screen==='stories')return 'storybook';
  return 'village';
}
export function musicGain(level:MusicLevel,foreground:boolean){
  return level==='off'?0:(level==='normal'?.24:.13)*(foreground?.18:1);
}

export const musicLoopSeconds=(track:MusicTrack)=>5760/({morning:78,day:86,evening:70,night:60,meadow:82,storybook:66,village:76}[track]);
