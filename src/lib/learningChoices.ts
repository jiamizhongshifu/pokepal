import { learningEntry,type LearningEntry } from '../data/curriculum';
import { PHRASES,PIC_WORDS,pickRandom } from '../data/words';

const identity=(entry:LearningEntry)=>entry.pokemonId?`pokemon:${entry.pokemonId}`:entry.key;
/** A name and its spoken exclamation may share an image, so compare semantic identity. */
export function learningChoices(target:LearningEntry,choices?:string[],count=2,level:1|2=2):LearningEntry[]{
 const pool=choices??(target.kind==='phrase'?PHRASES.filter(p=>p.level<=level).map(p=>p.en):target.kind==='concept'?(target.key.startsWith('count:')?['count:1','count:2','count:3','count:4','count:5'].slice(0,level===1?3:5):['big','small']):target.kind==='name'?['Pikachu','Eevee','Bulbasaur']:PIC_WORDS.filter(w=>w.level<=level).map(w=>w.en));
 const seen=new Set([identity(target)]),others:LearningEntry[]=[];
 for(const key of pool){const entry=learningEntry(key);if(!entry||seen.has(identity(entry)))continue;seen.add(identity(entry));others.push(entry);}
 return pickRandom([target,...pickRandom(others,Math.max(0,count-1))],count);
}
