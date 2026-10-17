import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {POKEMON,TYPES} from '../src/data/pokemon';
import {BEHAVIORS} from '../src/data/behaviors';
import manifest from '../src/data/pokemonModels.json';
import {ACTIVITY} from '../src/lib/routine';
import {compatible,STATIONS} from '../src/scene/islandLife';
const ids=new Set(POKEMON.map(p=>p.id));assert.equal(ids.size,POKEMON.length);
assert.equal(ids.size,388);
for(const id of [999,1000])assert(ids.has(id));
for(let i=1;i<=386;i++)assert(ids.has(i),`missing #${i}`);
for(const id of [182,186,196,197,199,230])assert(ids.has(id),`lost existing #${id}`);
const reachable=new Set(POKEMON.filter(p=>!p.evoOnly).map(p=>p.id));let last=-1;
while(last!==reachable.size){last=reachable.size;for(const p of POKEMON)if(reachable.has(p.id))p.evolvesTo.forEach(id=>reachable.add(id));}
assert.equal(reachable.size,POKEMON.length,'unreachable evolution');
const old=JSON.parse(fs.readFileSync('models-src/_research/pogo-eyes-gen9-20261015/before/src/data/pokemon.json','utf8'));
for(const p of old){const actual=POKEMON.find(x=>x.id===p.id)!;assert.deepEqual(actual,{...p,rarity:actual.rarity,evolvesTo:actual.evolvesTo},`old record changed #${p.id}`);assert(p.evolvesTo.every((id:number)=>actual.evolvesTo.includes(id)),`old evolution lost #${p.id}`);}
for(const [from,to] of [[42,169],[95,208],[113,242],[123,212],[152,153],[153,154],[236,106],[236,107],[236,237],[252,253],[253,254],[265,266],[265,268],[290,291],[290,292],[366,367],[366,368]])assert(POKEMON.find(p=>p.id===from)!.evolvesTo.includes(to),`missing evolution ${from}→${to}`);
for(const p of POKEMON){
 assert(p.nameEn&&p.nameZh);assert(p.types.every(t=>TYPES[t]?.icon),`missing type #${p.id}`);assert(BEHAVIORS[p.id],`missing behavior #${p.id}`);
 const behavior=BEHAVIORS[p.id];assert(behavior.trait.en&&behavior.trait.zh);
 for(const habit of behavior.schedule)assert(ACTIVITY[habit.activity],`unknown activity #${p.id}`);
 for(let h=0;h<24;h+=.25)assert(behavior.schedule.some(s=>s.from<=s.to?h>=s.from&&h<s.to:h>=s.from||h<s.to),`schedule gap #${p.id} at ${h}`);
 assert(STATIONS.some(s=>compatible(p,s)),`no compatible island activity #${p.id}`);
 if(behavior.locomotion==='swim')assert(STATIONS.filter(s=>compatible(p,s)).every(s=>s.water),`aquatic species sent on land #${p.id}`);
 assert(p.evolvesTo.every(id=>ids.has(id)),`dangling evolution #${p.id}`);
 const e=(manifest as Record<string,{file:string;idle:string;walk:string;pose?:string}>)[p.id];assert(e,`missing model #${p.id}`);assert.equal(e.pose,undefined);assert.equal(e.idle,'idle');assert.equal(e.walk,'walk');
 for(const path of [`models/pokemon/${e.file}`,`pokemon/art/${p.id}.png`,`pokemon/home/${p.id}.png`,`pokemon/cry/${p.id}.m4a`])assert(fs.statSync(`public/${path}`).size>100,`invalid asset ${path}`);
 const b=fs.readFileSync(`public/models/pokemon/${e.file}`);assert.equal(b.readUInt32LE(0),0x46546c67);const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());assert(g.skins?.length);assert.deepEqual(g.animations.map((a:{name:string})=>a.name).sort(),['idle','walk']);assert(g.images.every((i:{bufferView?:number;uri?:string})=>i.bufferView!==undefined&&!i.uri));assert(b.length<1.5*1024*1024,`model too large #${p.id}`);
}
const before=JSON.parse(fs.readFileSync('models-src/_research/pogo-eyes-gen9-20261015/model-hashes-before.json','utf8'));
const fixes=JSON.parse(fs.readFileSync('models-src/_research/pogo-eyes-gen9-20261015/eye-fixes.json','utf8'));
const changed=new Set(fixes.map((f:{id:number})=>String(f.id)));
for(const [id,hash] of Object.entries(before))if(!changed.has(id.split('/').pop()!.replace('.glb','')))assert.equal(createHash('sha256').update(fs.readFileSync(id)).digest('hex'),hash,`unexpected model change #${id}`);
assert.deepEqual(POKEMON.find(p=>p.id===999)!.evolvesTo,[1000]);assert(!POKEMON.find(p=>p.id===999)!.evoOnly);assert(POKEMON.find(p=>p.id===1000)!.evoOnly);
const result={roster:POKEMON.length,reachable:reachable.size,assetsChecked:POKEMON.length*4,oldRecordsPreserved:old.length,eyeCorrections:fixes.length,unchangedModels:Object.keys(before).length-changed.size,newModels:[999,1000]};
fs.writeFileSync('models-src/_research/pogo-eyes-gen9-20261015/roster-validation.json',JSON.stringify(result,null,2));console.log(result);
