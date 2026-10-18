import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const extensions=/\.(tsx?|m?js|css|json|html|py|sh)$/;
function filesIn(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 if(e.name.startsWith('.')||['node_modules','__pycache__','venv'].includes(e.name))return [];
 const path=`${dir}/${e.name}`;return e.isDirectory()?filesIn(path):extensions.test(e.name)?[path]:[];
});}
export function sourceSnapshot(){
 const files=[...filesIn('src'),...filesIn('scripts'),...filesIn('privacy'),...filesIn('terms'),...filesIn('feedback'),'package.json','package-lock.json','vite.config.ts','tsconfig.json','index.html'].sort();
 const hashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]));
 const hash=createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
 const dir=`.build/releases/${hash}`;mkdirSync(dir,{recursive:true});
 writeFileSync(`${dir}/manifest.json`,JSON.stringify({hash,files:hashes},null,2));
 if(!existsSync(`${dir}/source.tgz`))execFileSync('tar',['-czf',`${dir}/source.tgz`,...files]);
 return hash;
}
