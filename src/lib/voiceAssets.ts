import type { Lang } from '../types';
import type { RawTiming } from './storyWords';
import { voiceKey, type VoicePace } from './voiceKey';
import { voiceShard } from './voiceShard.js';

type PackedRecording = [pack: string, offset: number, bytes: number, timing?: RawTiming];
const online = import.meta.env.VITE_ONLINE;
const base = (import.meta.env.VITE_VOICE_BASE || '').replace(/\/$/, '');
const indexes = new Map<number, Promise<Record<string, PackedRecording>>>();
const packs = new Map<string, Promise<ArrayBuffer>>();
let manifest: Record<string, string> | undefined;
let loading: Promise<void> | undefined;
let timings: Promise<Record<string, RawTiming>> | undefined;

async function fetchAsset<T>(url: string, read: (response: Response) => Promise<T>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Voice HTTP ${response.status}`);
    return await read(response);
  } finally { clearTimeout(timer); }
}

export function loadVoicePack(): Promise<void> {
  if (online || manifest) return Promise.resolve();
  return loading ??= fetchAsset<Record<string, string>>('/voice/manifest.json', r => r.json())
    .then(entries => { manifest = entries; })
    .catch(() => { manifest = undefined; })
    .finally(() => { loading = undefined; });
}

async function packedRecording(key: string) {
  const bucket = voiceShard(key);
  const shard = import.meta.env.VITE_VOICE_SHARDS[bucket];
  if (!shard) return;
  let index = indexes.get(bucket);
  if (!index) {
    index = fetchAsset<Record<string, PackedRecording>>(`${base}/voice-online/index/${shard}`, r => r.json());
    indexes.set(bucket, index);
    index.catch(() => indexes.delete(bucket));
  }
  return (await index)[key];
}

export const voiceInfo = () => ({ en: 'Allison', zh: '小雪', provider: 'volcengine', ready: online || !!manifest });

export async function resolveVoice(lang: Lang, text: string, pace: VoicePace) {
  let key = voiceKey(lang, text);
  if (lang === 'en' && pace === 'slow') {
    const slow = voiceKey(lang, text, 'slow');
    if (online ? await packedRecording(slow).catch(() => undefined) : manifest?.[slow]) key = slow;
  }
  return { key, file: online ? key : manifest?.[key] };
}

export async function voiceTiming(key: string): Promise<RawTiming | undefined> {
  if (online) return (await packedRecording(key).catch(() => undefined))?.[3];
  timings ??= fetchAsset<Record<string, RawTiming>>('/voice/timings.json', r => r.json())
    .catch(() => { timings = undefined; return {}; });
  return (await timings)[key];
}

export async function voiceBytes(file: string): Promise<ArrayBuffer> {
  if (!online) return fetchAsset(`/voice/${file}`, r => r.arrayBuffer());
  const recording = await packedRecording(file);
  if (!recording) throw new Error('Recording unavailable');
  const [pack, offset, size] = recording;
  let body = packs.get(pack);
  if (!body) {
    body = fetchAsset(`${base}/voice-online/packs/${pack}`, r => r.arrayBuffer());
    packs.set(pack, body);
    body.catch(() => { if (packs.get(pack) === body) packs.delete(pack); });
    if (packs.size > 12) packs.delete(packs.keys().next().value!);
  }
  const bytes = await body;
  if (offset < 0 || size <= 0 || offset + size > bytes.byteLength) throw new Error('Incomplete recording pack');
  return bytes.slice(offset, offset + size);
}
