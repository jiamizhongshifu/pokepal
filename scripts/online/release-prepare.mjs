// Read-only network checks and local preparation. This command never deploys.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {preserveProduction} from './production-compat.mjs';
import {sourceSnapshot} from '../source-snapshot.mjs';
const origin='https://pokepal-online.pages.dev';
function get(path){return JSON.parse(execFileSync('curl',['--fail','--silent','--show-error','--max-time','45','--retry','2','--retry-all-errors',`${origin}/${path}?release-check=${Date.now()}`],{maxBuffer:8*1024*1024,encoding:'utf8'}));}
const target=resolve('dist-online');
const candidate=JSON.parse(readFileSync(resolve(target,'release.json'),'utf8'));
if(candidate.sourceHash!==sourceSnapshot())throw new Error('Source differs from build; run npm run build first.');
const production=get('release.json'),assets=get('release-assets.json');
const roots=[target,...readdirSync('.build',{withFileTypes:true}).filter(d=>d.isDirectory()&&d.name.startsWith('online-previous-')).map(d=>resolve('.build',d.name))];
const compatibility=preserveProduction({target,roots,release:production,assets});
execFileSync(process.execPath,['scripts/online/verify.mjs',target],{stdio:'inherit'});
const after=get('release.json');
if(after.id!==production.id||after.sourceHash!==production.sourceHash)throw new Error('Production changed during preparation; rerun before publishing.');
mkdirSync('.build/release-checks',{recursive:true});
const receipt=resolve('.build/release-checks',`${Date.now()}.json`);
writeFileSync(receipt,JSON.stringify({preparedAt:new Date().toISOString(),origin,candidate,compatibility,published:false},null,2));
console.log(JSON.stringify({prepared:true,published:false,retainedProductionFiles:assets.length,copied:compatibility.copied,receipt}));
