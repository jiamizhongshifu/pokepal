import fs from 'node:fs';
import assert from 'node:assert/strict';
import {POKEMON,TYPES} from '../src/data/pokemon';
import {BEHAVIORS} from '../src/data/behaviors';
import manifest from '../src/data/pokemonModels.json';
const ids=new Set(POKEMON.map(p=>p.id));assert.equal(ids.size,POKEMON.length);
for(let i=1;i<=151;i++)assert(ids.has(i),`missing Kanto #${i}`);
for(const id of [182,186,196,197,199,230])assert(ids.has(id),`lost existing #${id}`);
const reachable=new Set(POKEMON.filter(p=>!p.evoOnly).map(p=>p.id));let last=-1;
while(last!==reachable.size){last=reachable.size;for(const p of POKEMON)if(reachable.has(p.id))p.evolvesTo.forEach(id=>reachable.add(id));}
assert.equal(reachable.size,POKEMON.length,'unreachable evolution');
const old=JSON.parse(fs.readFileSync('models-src/_research/pogo-kanto-20261014/before/pokemon.json','utf8'));
for(const p of old)assert.deepEqual(POKEMON.find(x=>x.id===p.id),{...p,rarity:POKEMON.find(x=>x.id===p.id)!.rarity,evolvesTo:POKEMON.find(x=>x.id===p.id)!.evolvesTo},`old record changed #${p.id}`);
for(const p of POKEMON){
 assert(p.nameEn&&p.nameZh);assert(p.types.every(t=>TYPES[t]?.icon),`missing type #${p.id}`);assert(BEHAVIORS[p.id],`missing behavior #${p.id}`);
 assert(p.evolvesTo.every(id=>ids.has(id)),`dangling evolution #${p.id}`);
 const e=(manifest as Record<string,{file:string;idle:string;walk:string;pose?:string}>)[p.id];assert(e,`missing model #${p.id}`);assert.equal(e.pose,undefined);assert.equal(e.idle,'idle');assert.equal(e.walk,'walk');
 for(const path of [`models/pokemon/${e.file}`,`pokemon/art/${p.id}.png`,`pokemon/home/${p.id}.png`,`pokemon/cry/${p.id}.m4a`])assert(fs.statSync(`public/${path}`).size>100,`invalid asset ${path}`);
 const b=fs.readFileSync(`public/models/pokemon/${e.file}`);assert.equal(b.readUInt32LE(0),0x46546c67);const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());assert(g.skins?.length);assert.deepEqual(g.animations.map((a:{name:string})=>a.name).sort(),['idle','walk']);assert(g.images.every((i:{bufferView?:number;uri?:string})=>i.bufferView!==undefined&&!i.uri));assert(b.length<1.5*1024*1024,`model too large #${p.id}`);
}
const result={roster:POKEMON.length,kanto:151,encounterable:POKEMON.filter(p=>!p.evoOnly).length,evolutionOnly:POKEMON.filter(p=>p.evoOnly).length,reachable:reachable.size,assetsChecked:POKEMON.length*4,oldRecordsPreserved:old.length};
fs.writeFileSync('models-src/_research/pogo-kanto-20261014/roster-validation.json',JSON.stringify(result,null,2));console.log(result);
