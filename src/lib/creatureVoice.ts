import { CREATURES, getCreature, SPECIES } from '../data/creatures';

export interface Chirp { freq: number; slide: number; start: number; dur: number }
export interface CreatureVoice { wave: OscillatorType; chirps: Chirp[]; length: number }

/** Each species keeps its own pitch, timbre and syllable shape; growing up lowers the voice. */
const SHAPES: Array<Array<[at: number, slide: number, dur: number]>> = [
 [[0, 1.25, .14], [.18, 1.4, .2]],
 [[0, .8, .16], [.2, 1.3, .22]],
 [[0, 1.5, .26]],
 [[0, 1.2, .1], [.13, 1.2, .1], [.26, 1.5, .18]],
 [[0, .7, .3]],
 [[0, 1.3, .14], [.2, .75, .24]],
];
const PITCH = [523, 587, 659, 784, 880, 698, 622, 740];
const WAVES: OscillatorType[] = ['sine', 'triangle', 'sine', 'square'];

export function creatureVoice(id: number): CreatureVoice {
 const creature = CREATURES.some(c => c.id === id) ? getCreature(id) : undefined;
 const index = Math.max(0, creature ? SPECIES.findIndex(s => s.id === creature.species) : 0);
 const stage = creature?.stage ?? 1;
 const base = PITCH[index % PITCH.length] * [1, .8, .64][stage - 1];
 const stretch = [1, 1.15, 1.3][stage - 1];
 const chirps = SHAPES[index % SHAPES.length].map(([at, slide, dur]) => ({ freq: base, slide: base * slide, start: at * stretch, dur: dur * stretch }));
 const last = chirps[chirps.length - 1];
 return { wave: WAVES[Math.floor(index / SHAPES.length) % WAVES.length], chirps, length: last.start + last.dur };
}

/** Plays a creature's voice on the shared context and resolves when it has finished. */
export function playCreatureVoice(ac: AudioContext, id: number, volume: number): { done: Promise<void>; stop: () => void } {
 const voice = creatureVoice(id);
 const now = ac.currentTime + .02;
 const out = ac.createGain();
 out.gain.value = Math.min(1, volume) * (voice.wave === 'square' ? .35 : .7);
 out.connect(ac.destination);
 const oscillators = voice.chirps.map(c => {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = voice.wave;
  o.frequency.setValueAtTime(c.freq, now + c.start);
  o.frequency.exponentialRampToValueAtTime(c.slide, now + c.start + c.dur);
  g.gain.setValueAtTime(.0001, now + c.start);
  g.gain.exponentialRampToValueAtTime(.5, now + c.start + .025);
  g.gain.exponentialRampToValueAtTime(.0001, now + c.start + c.dur);
  o.connect(g).connect(out);
  o.start(now + c.start);
  o.stop(now + c.start + c.dur + .05);
  return o;
 });
 let finish = () => {};
 const done = new Promise<void>(resolve => {
  const timer = setTimeout(() => finish(), (voice.length + .12) * 1000);
  finish = () => { clearTimeout(timer); oscillators.forEach(o => { try { o.stop(); } catch { /* already stopped */ } }); out.disconnect(); resolve(); };
 });
 return { done, stop: () => finish() };
}
