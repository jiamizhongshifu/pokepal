import { mkdir, readdir, readFile, copyFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

// Native packages contain the active MP3 files directly. PWA bundles would duplicate them.
const root=process.cwd();
const source=path.join(root,'dist');
const target=path.join(root,'.build/android-web');
const manifest=JSON.parse(await readFile(path.join(source,'voice/manifest.json'),'utf8'));
const active=new Set(Object.values(manifest));
try { await rename(target,target+'-previous-'+Date.now()); } catch(e) { if(e.code!=='ENOENT')throw e; }
let count=0,bytes=0;
async function copy(relative=''){
  for(const entry of await readdir(path.join(source,relative),{withFileTypes:true})){
    const rel=path.join(relative,entry.name);
    if(rel==='voice/packs'||rel==='voice/pack-index.json'||/^(sw\.js|registerSW\.js|voice-cache-sw\.js|workbox-.*\.js)$/.test(rel))continue;
    if(relative==='voice'&&entry.name.endsWith('.mp3')&&!active.has(entry.name))continue;
    if(entry.isDirectory()){await copy(rel);continue;}
    if(!entry.isFile())continue;
    await mkdir(path.dirname(path.join(target,rel)),{recursive:true});
    await copyFile(path.join(source,rel),path.join(target,rel));count++;
  }
}
await copy();
const html=await readFile(path.join(target,'index.html'),'utf8');
await writeFile(path.join(target,'index.html'),html.replace(/<script\b[^>]*src=["']\/registerSW\.js["'][^>]*><\/script>/g,''));
for(const file of active){const data=await readFile(path.join(target,'voice',file));if(data.length<100)throw new Error('Invalid voice '+file);bytes+=data.length;}
await writeFile(path.join(target,'native-assets.json'),JSON.stringify({voiceCount:active.size,voiceBytes:bytes,files:count,builtAt:new Date().toISOString()}));
console.log(JSON.stringify({webDir:target,files:count,voiceCount:active.size,voiceBytes:bytes,serviceWorker:false},null,2));
