import { learningProfile } from '../lib/learningStage';
import { PHRASES, PIC_WORDS, type SayPhrase, type PicWord } from './words';
import type { District, Station } from '../scene/islandLife';
import type { SaveData } from '../types';
import { selectedUnit, unitSituations, type LearningUnit } from './curriculum';

export interface LearningTheme { id:District; zh:string; en:string; icon:string; words:string[]; phrases:string[]; focusPhrases?:string[] }
export const LEARNING_THEMES:LearningTheme[]=[
 {id:'garden',zh:'照顾小花园',en:'In the garden',icon:'flower',words:['flower','tree','water','green','apple'],phrases:['Water!','Thank you!','I did it!','Help, please!']},
 {id:'play',zh:'和伙伴一起玩',en:'Let’s play',icon:'ball',words:['ball','red','yellow','blue','hat'],phrases:['Jump!','My turn!','Look at me!',"Let's play!",'I can jump!']},
 {id:'leisure',zh:'太阳和月亮',en:'Sun and moon',icon:'sun',words:['sun','moon','star','tree','bird'],phrases:['Good morning!','Good night!','Bye-bye!',"I'm happy!"]},
 {id:'camp',zh:'一起吃点心',en:'Snack time',icon:'apple',words:['apple','banana','milk','egg','cake','cookie'],phrases:['Yummy!','Thank you!','Me too!',"I'm hungry.",'More, please!']},
 {id:'beach',zh:'海边找朋友',en:'By the sea',icon:'waves',words:['fish','bird','water','blue','sun','turtle'],phrases:['Hello!','Look at me!',"Let's go!",'Nice to meet you!']}
];
export function learningTheme(save:SaveData):LearningTheme {
 const u=selectedUnit(save),theme=LEARNING_THEMES.find(t=>t.id===u.theme)!;
 return {...theme,zh:u.title,en:u.phrase,words:lessonWords(u,learningProfile(save.settings).vocabulary),focusPhrases:unitSituations(u).map(s=>s.phrase),phrases:[...new Set([...unitSituations(u).map(s=>s.phrase),...theme.phrases])]};
}
/** Keep the same three round slots in old saves while adapting the words to readiness. */
export function lessonWords(unit:LearningUnit,level:1|2):string[]{
 const focus=unit.words.filter(key=>PIC_WORDS.some(w=>w.en===key&&w.level<=level));
 const category=PIC_WORDS.find(w=>w.en===unit.words[0])?.theme;
 const sameCategory=unit.words.every(key=>PIC_WORDS.some(w=>w.en===key&&w.theme===category));
 const local=sameCategory?PIC_WORDS.filter(w=>w.theme===category&&w.level<=level).map(w=>w.en):
  LEARNING_THEMES.find(t=>t.id===unit.theme)!.words.filter(key=>PIC_WORDS.some(w=>w.en===key&&w.level<=level));
 return [...new Set([...focus,...local])].slice(0,3);
}

/** One small daily theme shared by picture, speaking and island play; no extra child settings. */
export function dailyTheme(date:string){
 const day=Math.floor(Date.parse(`${date}T12:00:00Z`)/86400000);
 return LEARNING_THEMES[(Number.isFinite(day)?day:0)%LEARNING_THEMES.length];
}
type Progress=Record<string,{correct?:number;spoken?:number;heard?:number}>;
export function themeWords(theme:LearningTheme,level:1|2,stats:Progress):PicWord[]{
 const pool=PIC_WORDS.filter(w=>theme.words.includes(w.en)&&w.level<=level);
 const familiar=pool.filter(w=>(stats[w.en]?.correct??0)>0).sort((a,b)=>(stats[a.en]?.correct??0)-(stats[b.en]?.correct??0));
 const fresh=pool.filter(w=>!(stats[w.en]?.correct)).sort(()=>Math.random()-.5);
 // With prior learning: two retrieval opportunities plus one new word, then fill any missing slots.
 return [...new Set([...familiar.slice(0,2),...fresh.slice(0,1),...familiar,...fresh])].slice(0,3);
}
export function themePhrases(theme:LearningTheme,level:1|2,stats:Progress):SayPhrase[]{
 const available=PHRASES.filter(p=>theme.phrases.includes(p.en)&&p.level<=level);
 const focus=(theme.focusPhrases??[]).flatMap(key=>available.filter(p=>p.en===key));
 const review=available.filter(p=>!focus.includes(p)).sort((a,b)=>(stats[a.en]?.spoken??0)-(stats[b.en]?.spoken??0));
 return [...focus,...review].slice(0,3);
}
const LESSONS:Record<string,[string,string,string,string]>={
 tree:['Tree!','树！','Look at the tree.','看看这棵树。'],
 windmill:['Turn!','转一转！','It can turn!','它会转！'], ball:['Ball!','球！',"Let's play!",'一起玩吧！'],
 music:['Sing!','唱一唱！',"Let's sing!",'一起唱歌吧！'], sand:['Dig!','挖一挖！',"Let's dig!",'一起挖一挖！'],
 bench:['Rest!','歇一歇！',"Let's rest.",'一起歇一歇。'], parasol:['Rest!','歇一歇！','I feel cool.','好凉快。'],
 tent:['Hello!','你好！','Welcome home!','欢迎回家！'], fire:['Warm!','暖暖的！','It is warm.','这里暖暖的。'],
 shore:['Splash!','扑通！','I can splash!','我会玩水！'], sea:['Swim!','游一游！','I can swim!','我会游泳！'],
 shells:['Look!','看一看！','Look at the shell.','看看这个贝壳。'], pier:['Look!','看一看！','Look at the sea.','看看大海。']
};
export function facilityLesson(station:Station,level:1|2){
 const fallback=station.activity==='eat'?['Yummy!','好吃！','More, please!','请再来一点！']:station.activity==='sleep'||station.activity==='nap'?['Good night!','晚安！','Time to rest.','该休息啦。']:['Look!','看一看！','Look with me.','和我一起看。'];
 const lines=LESSONS[station.id]??fallback;
 return {en:lines[level===1?0:2],zh:lines[level===1?1:3]};
}

/** Keep automatic daily work within parent readiness and the current island theme.
 * Extra play revisits familiar material; it does not open a second unrelated syllabus.
 */
export function dailyLearningPlan(save:SaveData,practice=false,now=Date.now()){
 const theme=learningTheme(save), records=save.learning?.records??{}, level=learningProfile(save.settings).vocabulary;
 const known=(key:string)=>!!(records[key]?.seen || save.wordStats[key]?.heard || save.wordStats[key]?.correct || save.wordStats[key]?.spoken);
 const due=Object.entries(records).filter(([,r])=>r.nextReview<=now)
  .sort(([,a],[,b])=>Number(b.needsPractice)-Number(a.needsPractice)||a.nextReview-b.nextReview).map(([key])=>key);
 const wordPool=PIC_WORDS.filter(w=>w.level<=level), phrasePool=PHRASES.filter(p=>p.level<=level);
 const baseTheme=LEARNING_THEMES.find(t=>t.id===theme.id)!;
 const dueWords=due.flatMap(key=>wordPool.filter(w=>w.en===key));
 const focus=theme.words.flatMap(key=>wordPool.filter(w=>w.en===key));
 const localWords=wordPool.filter(w=>baseTheme.words.includes(w.en));
 const familiarWords=wordPool.filter(w=>known(w.en)).sort((a,b)=>(records[a.en]?.lastSeen??0)-(records[b.en]?.lastSeen??0));
 const dailyWords=[...new Set([...dueWords.slice(0,1),...focus,...localWords])].slice(0,3);
 const focusPhrases=(theme.focusPhrases??theme.phrases).flatMap(key=>phrasePool.filter(p=>p.en===key));
 const duePhrases=due.flatMap(key=>phrasePool.filter(p=>p.en===key));
 const localPhrases=phrasePool.filter(p=>baseTheme.phrases.includes(p.en));
 const familiarPhrases=phrasePool.filter(p=>known(p.en)).sort((a,b)=>(records[a.en]?.lastSeen??0)-(records[b.en]?.lastSeen??0));
 const dailyPhrases=[...new Set([...duePhrases.slice(0,1),...focusPhrases,...localPhrases.filter(p=>known(p.en)),...localPhrases])].slice(0,3);
 const words=practice?[...new Set([...dueWords.slice(0,3),...dailyWords,...familiarWords])].slice(0,6):dailyWords;
 const phrases=practice?[...new Set([...duePhrases.slice(0,2),...dailyPhrases,...familiarPhrases])].slice(0,5):dailyPhrases;
 return {theme,words,phrases};
}
