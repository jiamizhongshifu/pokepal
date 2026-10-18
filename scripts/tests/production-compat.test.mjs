import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {preserveProduction,validateManifest} from '../online/production-compat.mjs';
const release={id:'production',mode:'online',sourceHash:'a'.repeat(64)};
function fixture(){const root=mkdtempSync(join(tmpdir(),'pokepal-compat-'));const prod=join(root,'prod'),recent=join(root,'recent'),target=join(root,'target');for(const d of [prod,recent,target])mkdirSync(join(d,'assets'),{recursive:true});writeFileSync(join(prod,'release.json'),JSON.stringify(release));writeFileSync(join(recent,'release.json'),JSON.stringify({...release,id:'unpublished'}));writeFileSync(join(prod,'assets/old.js'),'production');writeFileSync(join(recent,'assets/old.js'),'unpublished');return {prod,recent,target};}
test('retains actual production across unpublished local builds',()=>{const f=fixture();const r=preserveProduction({target:f.target,roots:[f.recent,f.prod],release,assets:['assets/old.js']});assert.equal(r.copied,1);assert.equal(readFileSync(join(f.target,'assets/old.js'),'utf8'),'production');assert.equal(preserveProduction({target:f.target,roots:[f.prod],release,assets:['assets/old.js']}).copied,0);});
test('missing artifact or immutable conflict fails before partial copying',()=>{const f=fixture();assert.throws(()=>preserveProduction({target:f.target,roots:[f.prod],release,assets:['assets/old.js','assets/missing.js']}),/Missing/);assert.equal(existsSync(join(f.target,'assets/old.js')),false);writeFileSync(join(f.target,'assets/old.js'),'changed');assert.throws(()=>preserveProduction({target:f.target,roots:[f.prod],release,assets:['assets/old.js']}),/Conflicting/);assert.throws(()=>preserveProduction({target:f.target,roots:[f.recent],release,assets:['assets/old.js']}),/No local artifact/);});
test('rejects remote manifest traversal, unknown folders and duplicates',()=>{for(const value of [[],['assets/../key.js'],['certs/key.js'],['assets/a.js','assets/a.js'],['/assets/a.js']])assert.throws(()=>validateManifest(value));});

test('accepts both production font formats',()=>{assert.deepEqual(validateManifest(['assets/font-abc.woff','assets/font-xyz.woff2']),['assets/font-abc.woff','assets/font-xyz.woff2']);});
