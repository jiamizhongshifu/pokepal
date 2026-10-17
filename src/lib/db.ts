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
const MAX_RECORDINGS = 60;

export async function loadSave(): Promise<SaveData | undefined> {
  return (await db.kv.get(KEY))?.value;
}
export class SaveConflictError extends Error { constructor(){super('save-conflict');} }
export async function readSaveSnapshot(){
  const row=await db.kv.get(KEY);
  return {save:row?.value,revision:row?.revision??0};
}
export const loadSaveBackup=async()=> (await db.kv.get('save-before-import'))?.value;
export async function writeSave(value: SaveData, expectedRevision?:number, backup=false) {
  return db.transaction('rw',db.kv,async()=>{
    const current=await db.kv.get(KEY),revision=current?.revision??0;
    if(expectedRevision!==undefined&&revision!==expectedRevision)throw new SaveConflictError();
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
export async function addRecording(r: Omit<Recording, "id">) {
  await db.recordings.add(r);
  const count = await db.recordings.count();
  if (count > MAX_RECORDINGS) {
    const old = await db.recordings.orderBy("createdAt").limit(count - MAX_RECORDINGS).primaryKeys();
    await db.recordings.bulkDelete(old);
  }
}
export const listRecordings = () => db.recordings.orderBy("createdAt").reverse().limit(MAX_RECORDINGS).toArray();
export async function clearAll() {
  await db.kv.clear();
  await db.recordings.clear();await db.diaries.clear();
}

/** 请求持久化存储，避免 Safari 在空间紧张时清掉存档 */
export function requestPersist() {
  navigator.storage?.persist?.().catch(() => {});
}
