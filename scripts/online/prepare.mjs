import {mkdir,readFile,writeFile,cp,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve('.');
const target=resolve(process.env.ONLINE_STAGE || `.build/online-${Date.now()}`);
await mkdir(target,{recursive:true});
await cp(resolve('public/_routes.json'),resolve(target,'_routes.json'));
const hash=b=>createHash('sha256').update(b).digest('hex').slice(0,24);
// Only runtime media is admitted. Never copy public/voice wholesale or local server/config files.
for(const dir of ['art','env','icons','models','pokemon','story-art','textures','music','environment'])await cp(resolve('public',dir),resolve(target,dir),{recursive:true});
execFileSync('cwebp',['-quiet','-q','82','-resize','1600','0',resolve('public/art/world/welcome-island-v1.png'),'-o',resolve(target,'art/world/welcome-island-v1.webp')]);
const manifest=JSON.parse(await readFile('public/voice/manifest.json','utf8'));
const groups=new Map(),entries={};
for(const file of [...new Set(Object.values(manifest))].sort()){
 if(!/^[a-f0-9]+\.mp3$/.test(file))throw new Error(`Unexpected recording: ${file}`);
 const key=file.slice(0,3);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(file);
}
await mkdir(resolve(target,'voice-online/packs'),{recursive:true});
let voiceBytes=0,maxPack=0;
for(const files of groups.values()){
 const buffers=await Promise.all(files.map(f=>readFile(resolve('public/voice',f))));
 const body=Buffer.concat(buffers),name=hash(body)+'.bin';let offset=0;
 await writeFile(resolve(target,'voice-online/packs',name),body);voiceBytes+=body.length;maxPack=Math.max(maxPack,body.length);
 files.forEach((file,i)=>{entries[file]=[name,offset,buffers[i].length];offset+=buffers[i].length;});
}
// Key hashing is shared with the browser; immutable shards are pinned by the built JS.
const shardKey=key=>{let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);return (h>>>0)%256;};
const shards=Array.from({length:256},()=>({}));
for(const [key,file] of Object.entries(manifest))shards[shardKey(key)][key]=entries[file];
await mkdir(resolve(target,'voice-online/index'),{recursive:true});
const index=[];
for(const shard of shards){const body=JSON.stringify(shard),name=hash(body)+'.json';await writeFile(resolve(target,'voice-online/index',name),body);index.push(name);}
await writeFile(resolve(target,'voice-online/build-index.json'),JSON.stringify(index));
await writeFile(resolve(target,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/voice-online/index/*\n  Cache-Control: public, max-age=31536000, immutable\n  Access-Control-Allow-Origin: *\n/voice-online/packs/*\n  Cache-Control: public, max-age=31536000, immutable\n  Access-Control-Allow-Origin: *\n  Access-Control-Expose-Headers: Content-Range\n/announcements.json\n  Cache-Control: no-store\n/release-entry.html\n  Cache-Control: no-store\n/release-recovery.html\n  Cache-Control: no-store\n/release.json\n  Cache-Control: no-store\n/sw.js\n  Cache-Control: no-cache\n`);
// Prevent SPA HTML from being mistaken for a missing model or audio pack.
await writeFile(resolve(target,'404.html'),'<!doctype html><meta charset="utf-8"><title>暂时没找到</title><p>资源暂时没有找到，请返回首页再试。</p><a href="/">回到小岛</a>');
let count=0,bytes=0;async function walk(p){for(const d of await readdir(p,{withFileTypes:true})){const f=resolve(p,d.name);if(d.isDirectory())await walk(f);else{const s=await stat(f);count++;bytes+=s.size;if(s.size>25*1024*1024)throw new Error(`Oversized asset: ${f}`);}}}await walk(target);
if(count>19000)throw new Error('Online output exceeds safe Pages file budget');
await writeFile(resolve(target,'build-inventory.json'),JSON.stringify({files:count,bytes,voiceLines:Object.keys(manifest).length,voicePacks:groups.size,voiceBytes,maxPack},null,2));
console.log(JSON.stringify({target,files:count,bytes,voiceBytes,maxPack}));
