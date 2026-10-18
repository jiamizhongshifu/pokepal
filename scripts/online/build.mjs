import {sourceSnapshot} from '../source-snapshot.mjs';
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync,renameSync,mkdirSync,writeFileSync,readdirSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
execFileSync('npm',['run','check'],{stdio:'inherit'});
const sourceHash=sourceSnapshot();
const stage=resolve(`.build/online-${Date.now()}`);mkdirSync(stage,{recursive:true});
const env={...process.env,ONLINE_STAGE:stage,SOURCE_HASH:sourceHash};
execFileSync('node',['scripts/online/prepare.mjs'],{stdio:'inherit',env});
execFileSync('node',['node_modules/vite/bin/vite.js','build','--mode','online'],{stdio:'inherit',env});
// Retain only the previous release's current hashed assets, not an accumulating history.
// A still-open tab may request its old lazy chunk or voice shard after deployment.
const currentAssets=['assets','voice-online/index','voice-online/packs'].flatMap(dir=>readdirSync(resolve(stage,dir)).map(name=>`${dir}/${name}`));
writeFileSync(resolve(stage,'release-assets.json'),JSON.stringify(currentAssets));
if(existsSync('dist-online')){
 const manifest='dist-online/release-assets.json';
 const previous=existsSync(manifest)?JSON.parse(readFileSync(manifest,'utf8')):['assets','voice-online/index','voice-online/packs'].flatMap(dir=>readdirSync(resolve('dist-online',dir)).map(name=>`${dir}/${name}`));
 for(const asset of previous){
  if(!/^(assets|voice-online\/(index|packs))\/[a-zA-Z0-9_.-]+$/.test(asset))throw new Error(`Invalid previous asset: ${asset}`);
  if(!existsSync(resolve(stage,asset)))copyFileSync(resolve('dist-online',asset),resolve(stage,asset));
 }
}
// Reject incomplete or private artifacts before replacing the local preview.
execFileSync(process.execPath,['scripts/online/verify.mjs',stage],{stdio:'inherit'});
if(existsSync('dist-online'))renameSync('dist-online',resolve(`.build/online-previous-${Date.now()}`));
renameSync(stage,'dist-online');
writeFileSync('.build/online-last-build.json',JSON.stringify({dir:resolve('dist-online'),...JSON.parse(readFileSync('dist-online/build-inventory.json'))},null,2));
