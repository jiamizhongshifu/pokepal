import type { DiaryEntry } from './diary';
import Dexie, { type Table } from "dexie";
import type { SaveData } from "../types";

export interface Recording {
  id?: number;
  date: string;
  phrase: string;
  createdAt: number;
  voicedMs: number;
  blob: Blob;
}

class PokePalDB extends Dexie {
  kv!: Table<{ key: string; value: SaveData; revision?:number }, string>;
  recordings!: Table<Recording, number>;
  diaries!:Table<DiaryEntry,string>;
  constructor() {
    super("pokepal");
    this.version(1).stores({ kv: "key", recordings: "++id, createdAt, date" });
    this.version(2).stores({kv:"key",recordings:"++id, createdAt, date",diaries:"id,createdAt"});
  }
}

export const db = new PokePalDB();
const KEY = "save";
export const RECORDING_LIMIT = 60;

export class SaveConflictError extends Error { constructor(){super('save-conflict');} }
export async function readSaveSnapshot(){
  const row=await db.kv.get(KEY);
  return {save:row?.value,revision:row?.revision??0};
}
export const loadSaveBackup=async()=> (await db.kv.get('save-before-import'))?.value;
export async function writeSave(value: SaveData, expectedRevision:number, backup=false) {
  return db.transaction('rw',db.kv,async()=>{
    const current=await db.kv.get(KEY),revision=current?.revision??0;
    if(revision!==expectedRevision)throw new SaveConflictError();
    if(backup&&current)await db.kv.put({key:'save-before-import',value:current.value});
    await db.kv.put({ key:KEY,value,revision:revision+1 });
    return revision+1;
  });
}
export async function resetSave(value:SaveData,expectedRevision:number){
  return db.transaction('rw',db.kv,db.recordings,db.diaries,async()=>{
    const current=await db.kv.get(KEY);
    if((current?.revision??0)!==expectedRevision)throw new SaveConflictError();
    await db.kv.clear();await db.recordings.clear();await db.diaries.clear();
    await db.kv.put({key:KEY,value,revision:expectedRevision+1});
    return expectedRevision+1;
  });
}
/** Adding and trimming happen together, so a failed write never leaves the list over its limit or half trimmed. */
export async function addRecording(r: Omit<Recording, "id">) {
  return db.transaction("rw", db.recordings, async () => {
    const id = await db.recordings.add(r);
    const count = await db.recordings.count();
    if (count > RECORDING_LIMIT) {
      const old = await db.recordings.orderBy("createdAt").limit(count - RECORDING_LIMIT).primaryKeys();
      await db.recordings.bulkDelete(old);
    }
    return id;
  });
}
export const recordingCount = () => db.recordings.count();
export const deleteRecording = (id: number) => db.recordings.delete(id);
export const readDiary = (id: string) => db.diaries.get(id);
export const saveDiary = (entry: DiaryEntry) => db.diaries.put(entry);
export function listDiaries(order: 'newest' | 'backup') {
  return order === 'newest' ? db.diaries.orderBy('createdAt').reverse().toArray() : db.diaries.toArray();
}

export function restoreDiaries(entries: DiaryEntry[]) {
  return db.transaction('rw', db.diaries, async () => {
    const existing = new Set(await db.diaries.toCollection().primaryKeys());
    const missing = entries.filter(entry => !existing.has(entry.id));
    await db.diaries.bulkAdd(missing);
    return missing.length;
  });
}
export const deleteDiary = (id: string) => db.diaries.delete(id);
export const listRecordings = () => db.recordings.orderBy("createdAt").reverse().limit(RECORDING_LIMIT).toArray();
/** 请求持久化存储，避免 Safari 在空间紧张时清掉存档 */
export function requestPersist() {
  navigator.storage?.persist?.().catch(() => {});
}
