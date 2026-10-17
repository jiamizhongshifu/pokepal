import {readFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const root=resolve(process.argv[2]||'dist-online');
const manifest=JSON.parse(await readFile('public/voice/manifest.json','utf8'));
const names=JSON.parse(await readFile(resolve(root,'voice-online/build-index.json'),'utf8'));
const packNames=new Set(),entries=[];
const shardKey=key=>{let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);return(h>>>0)%256;};
for(let i=0;i<names.length;i++){
 const bytes=await readFile(resolve(root,'voice-online/index',names[i]));assert.equal(createHash('sha256').update(bytes).digest('hex').slice(0,24)+'.json',names[i]);
 for(const [key,entry]of Object.entries(JSON.parse(bytes))){assert.equal(shardKey(key),i);assert.ok(manifest[key]);entries.push([key,entry]);packNames.add(entry[0]);}
}
assert.equal(entries.length,Object.keys(manifest).length);
let checked=0;const grouped=new Map();for(const [key,e]of entries){if(!grouped.has(e[0]))grouped.set(e[0],[]);grouped.get(e[0]).push([key,e]);}
for(const [name,group]of grouped){const pack=await readFile(resolve(root,'voice-online/packs',name));assert.equal(createHash('sha256').update(pack).digest('hex').slice(0,24)+'.bin',name);for(const [key,[,offset,size]]of group){assert.deepEqual(pack.subarray(offset,offset+size),await readFile(resolve('public/voice',manifest[key])));checked++;}}
const files=[];async function walk(dir){for(const d of await readdir(dir,{withFileTypes:true})){const f=resolve(dir,d.name);if(d.isDirectory())await walk(f);else{files.push(f.slice(root.length+1));assert.ok((await stat(f)).size<=25*1024*1024);}}}await walk(root);
assert.ok(files.length<20000);assert.ok(!files.some(f=>/^(voice\/|certs\/|__ipad\/)|\.(pem|key|py)$|^\.env/.test(f)));
const sw=await readFile(resolve(root,'sw.js'),'utf8');assert.ok(!sw.includes('voice-cache-sw'));assert.ok(!sw.includes('offline-release'));assert.ok(!sw.includes('.glb'));assert.ok(!sw.includes('/packs/'));
const release=JSON.parse(await readFile(resolve(root,'release.json'),'utf8'));assert.equal(release.mode,'online');
console.log(JSON.stringify({release:release.id,files:files.length,verifiedRecordings:checked,packs:packNames.size,precacheOnlyShell:true},null,2));
