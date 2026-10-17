import { STORIES,storyProgressKey } from '../data/stories';
import type { Capture, SaveData } from '../types';
export const PREFERENCES=['ball','shade','company'] as const;
export type Preference=typeof PREFERENCES[number];
export const PREFERENCE_LABEL:Record<Preference,string>={ball:'喜欢小球',shade:'喜欢阴凉',company:'喜欢安静陪伴'};
export function preference(c:Capture):Preference{return c.personality?.preference??PREFERENCES[(Math.floor(c.caughtAt/1000)+c.id*17)%3];}
export function migratePersonalities(s:SaveData){for(const c of s.captures)c.personality??={version:1,preference:preference(c)};}
export const FURNITURE=[
 {id:'basket',name:'采收篮',area:'果园与野餐角',icon:'apple',use:'邀请伙伴观察树果，收获后带去分享',station:'tree',word:'Help, please!'},
 {id:'table',name:'分享桌',area:'果园与野餐角',icon:'home',use:'喜欢陪伴的伙伴更常来到野餐角',station:'picnic',word:'Thank you!'},
 {id:'mat',name:'遮阳垫',area:'树荫与安静角',icon:'sun',use:'喜欢阴凉的伙伴会来休息',station:'parasol',word:'I need a rest.'},
 {id:'bush',name:'矮树丛',area:'树荫与安静角',icon:'grass',use:'围出安静角，伙伴可以一起坐坐',station:'bench',word:'Stay with me, please.'},
 {id:'stones',name:'浅水踏石',area:'浅水与游乐角',icon:'water',use:'水中伙伴玩水，陆地伙伴在岸边陪伴',station:'shore',word:'water'},
 {id:'flowers',name:'野花小径',area:'树荫与安静角',icon:'flower',use:'把一簇小野花种在安静角边上',station:'bench',word:'flower'},
 {id:'lantern',name:'星星小灯',area:'果园与野餐角',icon:'sun',use:'给野餐角添一盏温暖的小灯',station:'picnic',word:'Hello!'},
 {id:'flags',name:'伙伴彩旗',area:'浅水与游乐角',icon:'balloon',use:'用柔和彩旗装点滚球小路',station:'ball',word:'Your turn!'},
 {id:'pinwheel',name:'彩色风车',area:'营地旁的小路',icon:'wind',use:'风吹过时，和伙伴一起看风车',station:'tent',word:'wind'},
 {id:'shells',name:'贝壳花环',area:'海岸小路',icon:'waves',use:'在海边发现不一样的形状',station:'shells',word:'Look!'},
 {id:'rainbow',name:'彩虹地垫',area:'游乐区',icon:'rainbow',use:'和伙伴一起找颜色',station:'sand',word:'color'},
 {id:'track',name:'滚球轨道',area:'浅水与游乐角',icon:'balloon',use:'喜欢小球的伙伴更常来轮流玩',station:'ball',word:'Your turn!'}
] as const;
export type FurnitureId=typeof FURNITURE[number]['id'];
export type TogetherKind='ball'|'rest';
export interface LivingMemory {id:string;kind:TogetherKind;partners:number[];at:number;context:'play'|'shade'|'coast';}
export interface IslandLiving {version:1;furniture:FurnitureId[];memories:LivingMemory[];}
export function livingState(s:SaveData):IslandLiving{return s.islandLiving??{version:1,furniture:[],memories:[]};}
export function setFurniture(s:SaveData,id:FurnitureId,enabled:boolean){
 if(!FURNITURE.some(f=>f.id===id))return false;
 s.islandLiving??={version:1,furniture:[],memories:[]};
 s.islandLiving.furniture=s.islandLiving.furniture.filter(v=>v!==id);
 if(enabled)s.islandLiving.furniture.push(id);return true;
}
export function rememberTogether(s:SaveData,m:LivingMemory){
 if(!m.id||!['ball','rest'].includes(m.kind)||!['play','shade','coast'].includes(m.context)||m.partners.length<1||m.partners.length>2||new Set(m.partners).size!==m.partners.length||!m.partners.every(id=>s.captures.some(c=>c.id===id)))return false;
 s.islandLiving??={version:1,furniture:[],memories:[]};
 if(s.islandLiving.memories.some(x=>x.id===m.id))return false;
 s.islandLiving.memories=[m,...s.islandLiving.memories].slice(0,18);return true;
}
export function furnitureAffinity(c:Capture,station:string,furniture:readonly FurnitureId[]){
 const pref=preference(c);let score=0;
 for(const f of FURNITURE)if(furniture.includes(f.id)&&f.station===station){score+=22;if(pref==='ball'&&f.id==='track'||pref==='shade'&&f.id==='mat'||pref==='company'&&['table','bush'].includes(f.id))score+=32;}
 if(pref==='ball'&&station==='ball'||pref==='shade'&&station==='parasol'||pref==='company'&&station==='bench')score+=15;
 return score;
}
export const LIFE_STORIES=[
 {id:'share',name:'树果分享日',story:'magic-words',station:'picnic',phrase:'Thank you!',hint:'种一点树果，在野餐角分享；下次试着邀请另一位伙伴。'},
 {id:'ball',name:'轮流玩小球',story:'taking-turns',station:'together-ball',phrase:'Your turn!',hint:'从游乐区玩到海岸，把机会交给不同的伙伴。'},
 {id:'rest',name:'陪伙伴休息',story:'little-storm',station:'together-rest',phrase:'I need a rest.',hint:'一起走到安静角，休息一下；也允许伙伴独处。'}
] as const;
export function storyTrail(s:SaveData,id:string){
 const spec=LIFE_STORIES.find(v=>v.id===id)!;
 const memories=id==='share'?(s.picnic?.memories??[]).map(m=>({partners:[m.pokemonId],context:'picnic'})):(s.islandLiving?.memories??[]).filter(m=>m.kind===id);
 const partners=new Set(memories.map(m=>[...m.partners].sort((a,b)=>a-b).join(',')));const contexts=new Set(memories.map(m=>m.context));
 // Story versions can change: require a completion marker, never infer it from opening the book.
 const story=STORIES.find(st=>st.id===spec.story)!;
 const read=(s.storyProgress?.[storyProgressKey(story)]??0)>story.pages.length;
 return {played:memories.length>0,read,revisited:memories.length>1&&(partners.size>1||contexts.size>1)};
}
export function validLiving(v:unknown,ids:Set<number>):v is IslandLiving {
 if(!v||typeof v!=='object')return false;const s=v as IslandLiving;
 return s.version===1&&Array.isArray(s.furniture)&&s.furniture.length<=FURNITURE.length&&new Set(s.furniture).size===s.furniture.length&&s.furniture.every(x=>FURNITURE.some(f=>f.id===x))&&Array.isArray(s.memories)&&s.memories.length<=18&&new Set(s.memories.map(m=>m?.id)).size===s.memories.length&&s.memories.every(m=>m&&typeof m.id==='string'&&m.id.length>0&&m.id.length<=80&&['ball','rest'].includes(m.kind)&&['play','shade','coast'].includes(m.context)&&Number.isSafeInteger(m.at)&&m.at>0&&Array.isArray(m.partners)&&m.partners.length>=1&&m.partners.length<=2&&new Set(m.partners).size===m.partners.length&&m.partners.every(id=>ids.has(id)));
}
