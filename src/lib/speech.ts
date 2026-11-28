import { playCreatureVoice } from "./creatureVoice";
import { loadVoicePack, resolveVoice, voiceBytes, voiceTiming, voiceInfo } from "./voiceAssets";
import { type CaptionPart } from "./captions";
import { voiceKey, type VoicePace } from "./voiceKey";
import type { RawTiming } from "./storyWords";
import type { Lang } from "../types";

/** All spoken teaching and narration uses the bundled Volcengine voice pack. */
let token = 0;
let rate = 1;
let onEnglish: ((text: string) => void) | null = null;

export function setSpeechRate(r: number) {
  rate = Math.max(0.6, Math.min(1.3, r));
}
export function onEnglishSpoken(cb: (text: string) => void) {
  onEnglish = cb;
}

/** Prefer slow English recordings where they exist (picture-book sentences); other lines keep their normal recording. */
let pace: VoicePace = "normal";
export function setVoicePace(next: VoicePace) {
  pace = next;
}

/** Start of one recording on the shared AudioContext clock, so a reader can follow along word by word. */
export interface VoicePlayback { lang: Lang; text: string; key: string; startedAt: number; rate: number; timing?: RawTiming }
const playbackListeners = new Set<(playback: VoicePlayback | null) => void>();
export function onVoicePlayback(listener: (playback: VoicePlayback | null) => void) {
  playbackListeners.add(listener);
  return () => { playbackListeners.delete(listener); };
}
const emitPlayback = (playback: VoicePlayback | null) => playbackListeners.forEach((l) => l(playback));

const bufferCache = new Map<string, Promise<AudioBuffer | null>>();
let currentSource: AudioBufferSourceNode | null = null;
const missed = new Set<string>();

void loadVoicePack();

export const voiceDiagnostics = () => ({ provider: "volcengine", ready: voiceInfo().ready, missing: [...missed] });
function reportVoiceIssue(text: string, lang: Lang, reason: string) {
  const key = voiceKey(lang, text);
  if (!missed.has(key)) { missed.add(key); console.warn("[火山配音未播放]", reason, lang, text); }
}

function voiceBuffer(file: string): Promise<AudioBuffer | null> {
  let p = bufferCache.get(file);
  if (!p) {
    p = voiceBytes(file)
      .then((ab) => getAudioContext().decodeAudioData(ab))
      .catch(() => {
        if (bufferCache.get(file) === p) bufferCache.delete(file);
        return null;
      });
    bufferCache.set(file, p);
    // 只缓存最近 120 条，避免内存增长
    if (bufferCache.size > 120) bufferCache.delete(bufferCache.keys().next().value!);
  }
  return p;
}

/** 有预合成配音就播放并返回 true，没有返回 false */
async function playVoice(text: string, lang: Lang, myToken: number, allowed: () => boolean): Promise<boolean> {
  await loadVoicePack();
  if (myToken !== token || !allowed()) return false;
  const { key, file } = await resolveVoice(lang, text, pace);
  if (myToken !== token || !allowed()) return false;
  if (!file) {
    reportVoiceIssue(text, lang, voiceInfo().ready ? "missing-file" : "manifest-unavailable");
    return false;
  }
  const [buf, timing] = await Promise.all([voiceBuffer(file), playbackListeners.size ? voiceTiming(key) : undefined]);
  if (myToken !== token || !allowed()) return false;
  if (!buf) { reportVoiceIssue(text, lang, "download-or-decode"); return false; }
  const ac = getAudioContext();
  // 未解锁时 resume 可能一直挂起：最多等 300ms，仍未运行就保留字幕，等待用户点击重试
  if (ac.state !== "running") await Promise.race([ac.resume().catch(() => { }), wait(300)]);
  if (myToken !== token || !allowed()) return false;
  if (ac.state !== "running") { reportVoiceIssue(text, lang, "audio-locked"); return false; }
  if (lang === "en") onEnglish?.(text);
  return new Promise<boolean>((resolve) => {
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    src.connect(ac.destination);
    currentSource = src;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(fallbackTimer);
      if (currentSource === src) currentSource = null;
      emitPlayback(null);
      resolve(true);
    };
    src.onended = done;
    const startedAt = ac.currentTime;
    src.start(startedAt);
    emitPlayback({ lang, text, key, startedAt, rate, timing });
    const fallbackTimer = setTimeout(done, buf.duration * 1000 / rate + 800);
  });
}

export type Part = CaptionPart;

/** 依次朗读；数字表示停顿毫秒。新的 say() 会打断旧的。 */
let busy = false;
/** 当前是否正在朗读 */
export const isSpeaking = () => busy;

export async function say(...parts: Part[]): Promise<boolean> {
  return sayWhile(() => true, ...parts);
}

/** A delayed background request must not interrupt the foreground lesson. */
export async function sayWhile(allowed: () => boolean, ...parts: Part[]): Promise<boolean> {
  if (!allowed()) return false;
  const my = ++token;
  busy = true;
  try {
    currentSource?.stop();
  } catch {
    /* 已经结束 */
  }
  for (const p of parts) {
    if (my !== token || !allowed()) {
      if (my === token) busy = false;
      return false;
    }
    if (typeof p === "number") await wait(p);
    else {
      if (!await playVoice(p[1], p[0], my, allowed)) {
        // Never switch to a device voice when the offline recording is missing.
        if (my === token) { busy = false; }
        return false;
      }
    }
  }
  if (my === token) { busy = false; }
  return my === token && allowed();
}

/** Cancel only this sequence; a later child-triggered voice must keep playing. */
export function sayCancellable(...parts: Part[]) {
  return sayCancellableWhile(() => true, ...parts);
}

export function sayCancellableWhile(allowed: () => boolean, ...parts: Part[]) {
  if (!allowed()) return { done: Promise.resolve(false), cancel: () => { } };
  const done = sayWhile(allowed, ...parts);
  const owner = token;
  return { done, cancel: () => { if (owner === token) stopSpeech(); } };
}

export function stopSpeech() {
  cancelCry?.();
  token++;
  busy = false;
  try {
    currentSource?.stop();
  } catch {
    /* 已经结束 */
  }
  currentSource = null;
  emitPlayback(null);
}

/** 在第一次点击时调用，解锁 iOS 的语音与音频 */
export function unlockAudio() {
  getAudioContext().resume().catch(() => { });
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let ctx: AudioContext | null = null;
export function getAudioContext(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

let cancelCry: (() => void) | null = null;
/** Music ducks for teaching speech, cries and recorded playback. */
export const isForegroundAudioActive = () => busy || cancelCry !== null;
export function playCry(id: number, volume = .55): Promise<void> {
  cancelCry?.();
  const ac = getAudioContext();
  if (ac.state !== "running") ac.resume().catch(() => { });
  const voice = playCreatureVoice(ac, id, volume);
  const finish = () => { voice.stop(); if (cancelCry === finish) cancelCry = null; };
  cancelCry = finish;
  return voice.done.then(() => { if (cancelCry === finish) cancelCry = null; });
}
export function playUrl(url: string, volume = 1): Promise<void> {
  cancelCry?.();
  return new Promise(resolve => {
    const audio = new Audio(url); let settled = false;
    const finish = () => {
      if (settled) return; settled = true; clearTimeout(timer);
      audio.pause(); audio.onended = null; audio.onerror = null;
      if (cancelCry === finish) cancelCry = null;
      resolve();
    };
    const timer = setTimeout(finish, 6000);
    cancelCry = finish; audio.volume = volume; audio.onended = finish; audio.onerror = finish;
    audio.play().catch(finish);
  });
}

/** 简单合成音效，不依赖音频文件 */
export function sfx(kind: "ding" | "boop" | "pop" | "sparkle" | "click" | "whoosh") {
  const ac = getAudioContext();
  if (ac.state !== "running") ac.resume().catch(() => { });
  const now = ac.currentTime;
  const tone = (freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.18, slideTo?: number) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now + start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, now + start + dur);
    g.gain.setValueAtTime(0.0001, now + start);
    g.gain.exponentialRampToValueAtTime(vol, now + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    o.connect(g).connect(ac.destination);
    o.start(now + start);
    o.stop(now + start + dur + 0.05);
  };
  switch (kind) {
    case "ding":
      tone(880, 0, 0.18, "triangle");
      tone(1320, 0.12, 0.3, "triangle");
      break;
    case "boop":
      tone(330, 0, 0.25, "sine", 0.15, 220);
      break;
    case "pop":
      tone(600, 0, 0.1, "square", 0.08, 1200);
      break;
    case "click":
      tone(1200, 0, 0.05, "square", 0.06);
      break;
    case "whoosh":
      tone(200, 0, 0.35, "sawtooth", 0.05, 900);
      break;
    case "sparkle":
      [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.08, 0.25, "triangle", 0.12));
      break;
  }
}
