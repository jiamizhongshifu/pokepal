import type { RawTiming } from './storyWords';
/** Online recordings share the original Volcengine MP3 bytes; no runtime synthesis. */
type Recording = [pack:string, offset:number, bytes:number, timing?:RawTiming];
const shards=import.meta.env.VITE_VOICE_SHARDS as string[];
const base=String(import.meta.env.VITE_VOICE_BASE || '').replace(/\/$/,'');
const indexes=new Map<number,Promise<Record<string,Recording>>>();
const packs=new Map<string,Promise<ArrayBuffer>>();
export function voiceShard(key:string){let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);return (h>>>0)%256;}
async function get<T>(path:string,read:(r:Response)=>Promise<T>):Promise<T>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch(`${base}/voice-online/${path}`,{signal:controller.signal});if(!response.ok)throw new Error(`Voice HTTP ${response.status}`);return await read(response);}finally{clearTimeout(timer);}
}
async function recordingFor(key:string):Promise<Recording|undefined>{
 const bucket=voiceShard(key);if(!shards[bucket])return undefined;
 let index=indexes.get(bucket);
 if(!index){index=get(`index/${shards[bucket]}`,r=>r.json());indexes.set(bucket,index);index.catch(()=>indexes.delete(bucket));}
 return (await index)[key];
}
export async function onlineVoiceAvailable(key:string):Promise<boolean>{
 try{return !!(await recordingFor(key));}catch{return false;}
}
export async function onlineVoiceTiming(key:string):Promise<RawTiming|undefined>{
 try{return (await recordingFor(key))?.[3];}catch{return undefined;}
}
export async function onlineVoiceBytes(key:string):Promise<ArrayBuffer|null>{
 try{
  const recording=await recordingFor(key);if(!recording)return null;
  const [pack,offset,size]=recording;
  let body=packs.get(pack);
  if(!body){body=get(`packs/${pack}`,r=>r.arrayBuffer());packs.set(pack,body);body.catch(()=>packs.delete(pack));if(packs.size>12)packs.delete(packs.keys().next().value!);}
  const bytes=await body;if(offset<0||size<=0||offset+size>bytes.byteLength)throw new Error('Incomplete recording pack');
  return bytes.slice(offset,offset+size);
 }catch{return null;}
}
