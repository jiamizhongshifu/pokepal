import {readFileSync,existsSync,realpathSync,statSync,copyFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function validateManifest(assets){
 if(!Array.isArray(assets)||!assets.length||assets.length>19000)throw new Error('Invalid production asset manifest');
 if(new Set(assets).size!==assets.length)throw new Error('Duplicate production asset');
 for(const asset of assets)if(typeof asset!=='string'||! /^(assets|voice-online\/(index|packs))\/[a-zA-Z0-9_-]+\.(js|css|woff2?|json|bin)$/.test(asset))throw new Error('Unsafe production asset path');
 return assets;
}
function safeFile(root,asset){
 const file=resolve(root,asset);
 if(!existsSync(file))throw new Error(`Missing production compatibility asset: ${asset}`);
 if(!realpathSync(file).startsWith(realpathSync(root)+sep)||!statSync(file).isFile())throw new Error('Asset outside release directory');
 return file;
}
export function preserveProduction({target,roots,release,assets}){
 validateManifest(assets);
 if(release?.mode!=='online'||typeof release.id!=='string'||!/^[a-f0-9]{64}$/.test(release.sourceHash||''))throw new Error('Invalid production release');
 const source=roots.find(root=>{try{const r=JSON.parse(readFileSync(resolve(root,'release.json'),'utf8'));return r.id===release.id&&r.sourceHash===release.sourceHash;}catch{return false;}});
 if(!source)throw new Error('No local artifact matches production. Restore the verified production artifact before publishing.');
 // Validate everything before copying anything; never infer production from the latest local build.
 const plan=assets.map(asset=>{
  const input=safeFile(source,asset),bytes=readFileSync(input),sha256=digest(bytes);
  if(bytes.length>25*1024*1024)throw new Error('Production file exceeds Pages size limit');
  if(asset.startsWith('voice-online/')&&asset.split('/').at(-1).split('.')[0]!==sha256.slice(0,24))throw new Error('Corrupt production voice asset');
  const output=resolve(target,asset);
  if(existsSync(output)&&digest(readFileSync(safeFile(target,asset)))!==sha256)throw new Error(`Conflicting immutable asset: ${asset}`);
  return {asset,input,output,sha256,bytes:bytes.length,copy:!existsSync(output)};
 });
 for(const p of plan)if(p.copy){mkdirSync(dirname(p.output),{recursive:true});copyFileSync(p.input,p.output);}
 return {production:release,source:resolve(source),copied:plan.filter(p=>p.copy).length,assets:plan.map(({asset,sha256,bytes})=>({asset,sha256,bytes}))};
}
