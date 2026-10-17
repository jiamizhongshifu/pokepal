import type { DiaryEntry, DiaryAnswer } from './diary';
import { DIARY_PROMPTS } from '../data/diaryPrompts';

export const DIARY_BACKUP_MAX_BYTES = 96 * 1024 * 1024;
const AUDIO_LIMIT = 12 * 1024 * 1024;
type AudioFile = { mime: string; base64: string };
type PackedAnswer = Omit<DiaryAnswer, 'audio'> & { audio?: AudioFile };
type PackedEntry = Omit<DiaryEntry, 'audio' | 'answers'> & { audio?: AudioFile; answers?: PackedAnswer[] };
const fail = (): never => { throw new Error('日记备份格式不完整或文件过大，原来的日记没有改变。'); };
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : fail();
const text = (v: unknown, max: number): string => typeof v === 'string' && v.length <= max ? v : fail();
const optionalText = (v: unknown, max: number) => v === undefined ? undefined : text(v, max);
const audioMime = (v: unknown) => typeof v === 'string' && /^audio\/(?:mp4|mpeg|webm|wav|x-wav|ogg)(?:;codecs=[\w.,-]+)?$/.test(v) ? v : fail();

async function packAudio(blob?: Blob): Promise<AudioFile | undefined> {
  if (!blob) return;
  if (!blob.size || blob.size > AUDIO_LIMIT) fail();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { mime: audioMime(blob.type), base64: btoa(binary) };
}

export async function encodeDiaryBackup(entries: DiaryEntry[]): Promise<string> {
  // Check before converting binary to base64, to avoid unbounded temporary memory.
  const bytes = entries.reduce((sum, e) => sum + (e.audio?.size ?? 0) + (e.answers ?? []).reduce((n, a) => n + (a.audio?.size ?? 0), 0), 0);
  if (entries.length > 1000 || bytes > DIARY_BACKUP_MAX_BYTES * .65) throw new Error('日记较多，请先逐篇导出，避免设备内存不足。');
  const packed: PackedEntry[] = [];
  for (const e of entries) {
    const answers: PackedAnswer[] = [];
    for (const a of e.answers ?? []) answers.push({ ...a, audio: await packAudio(a.audio) });
    packed.push({ ...e, audio: await packAudio(e.audio), answers: e.answers ? answers : undefined });
  }
  const result = JSON.stringify({ format: 'pokepal-diaries', version: 1, entries: packed });
  if (new Blob([result]).size > DIARY_BACKUP_MAX_BYTES) fail();
  return result;
}

export function decodeDiaryBackup(raw: string): DiaryEntry[] {
  if (new Blob([raw]).size > DIARY_BACKUP_MAX_BYTES) fail();
  const root = object(JSON.parse(raw));
  if (root.format !== 'pokepal-diaries' || root.version !== 1 || !Array.isArray(root.entries) || root.entries.length > 1000) fail();
  let total = 0;
  const ids = new Set<string>();
  const audio = (v: unknown): Blob | undefined => {
    if (v === undefined) return;
    const a = object(v), mime = audioMime(a.mime), base64 = text(a.base64, Math.ceil(AUDIO_LIMIT / 3) * 4);
    if (!base64 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) fail();
    const binary = atob(base64);
    total += binary.length;
    if (binary.length > AUDIO_LIMIT || total > DIARY_BACKUP_MAX_BYTES * .65) fail();
    return new Blob([Uint8Array.from(binary, c => c.charCodeAt(0))], { type: mime });
  };
  return (root.entries as unknown[]).map(value => {
    const e = object(value), id = text(e.id, 200);
    if (!id || ids.has(id) || typeof e.createdAt !== 'number' || !Number.isFinite(e.createdAt) || e.createdAt < 0) fail();
    ids.add(id);
    for (const key of ['guided', 'guidedComplete']) if (e[key] !== undefined && typeof e[key] !== 'boolean') fail();
    if (e.guidedStep !== undefined && (!Number.isInteger(e.guidedStep) || Number(e.guidedStep) < 0 || Number(e.guidedStep) > 3)) fail();
    if (e.companion !== undefined && (!Number.isInteger(e.companion) || Number(e.companion) < 1)) fail();
    const result: DiaryEntry = { id, createdAt: e.createdAt as number, transcript: text(e.transcript, 2000), title: optionalText(e.title, 200),
      audio: audio(e.audio), audioRevision: optionalText(e.audioRevision, 200), guided: e.guided as boolean | undefined,
      guidedComplete: e.guidedComplete as boolean | undefined, guidedStep: e.guidedStep as number | undefined, companion: e.companion as number | undefined };
    if (e.answers !== undefined) {
      if (!Array.isArray(e.answers) || e.answers.length > DIARY_PROMPTS.length) fail();
      const questions = new Set<string>();
      result.answers = (e.answers as unknown[]).map(value => {
        const a = object(value), question = text(a.question, 80);
        if (!DIARY_PROMPTS.some(p => p.id === question) || questions.has(question) || a.skipped !== undefined && typeof a.skipped !== 'boolean') fail();
        questions.add(question);
        return { question, text: optionalText(a.text, 650), audio: audio(a.audio), audioRevision: optionalText(a.audioRevision, 200), transcribedRevision: optionalText(a.transcribedRevision, 200), skipped: a.skipped as boolean | undefined };
      });
    }
    if (e.pages !== undefined) {
      if (!Array.isArray(e.pages) || e.pages.length > 100) fail();
      result.pages = (e.pages as unknown[]).map(p => { const page = object(p); return { zh: text(page.zh, 160), en: text(page.en, 200), hint: text(page.hint, 200) }; });
    }
    return result;
  });
}

export function downloadDiaryFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
