import { PHRASE_PICTURES } from '../data/phrasePictures';
import { Icon } from '../icons';
import { PokeImg } from './PokeImg';
import { artUrl } from '../data/pokemon';
import type { LearningEntry } from '../data/curriculum';
import { say } from '../lib/speech';
import { learningVoice } from '../lib/learningVoice';
export { learningVoice } from '../lib/learningVoice';

export function LearningArt({entry}:{entry:LearningEntry}){
 if(entry.kind==='phrase'&&PHRASE_PICTURES[entry.en])return <span className="phrase-picture" aria-hidden="true">{PHRASE_PICTURES[entry.en].map((icon,i)=><Icon key={`${icon}-${i}`} name={icon} size={60}/>)}</span>;
 if(entry.css)return <span className="learning-color" style={{background:entry.css}}/>;
 if(entry.pokemonId)return <PokeImg src={artUrl(entry.pokemonId)} alt=""/>;
 if(entry.key.startsWith('count:'))return <span className="learning-count">{Array.from({length:Number(entry.key.slice(6))},(_,i)=><Icon key={i} name="apple" size={42}/>)}</span>;
 return <Icon name={entry.icon??'speak'} size={112} style={entry.key==='small'?{transform:'scale(.45)'}:undefined}/>;
}
export const hearEntry=(entry:LearningEntry)=>say(...learningVoice(entry));
