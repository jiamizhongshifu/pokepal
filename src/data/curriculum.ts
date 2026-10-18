import { learningProfile } from '../lib/learningStage';
import { EXTRA_LEARNING, normalizeLearningText } from './learningLexicon';
import { PHRASES, PIC_WORDS } from './words';
import { POKEMON } from './pokemon';
import type { SaveData } from '../types';

export const LEARNING_CHAPTERS=[
 {title:'认识我的小岛',goal:'听见一个词，找到身边的东西',age:'从零开始 · 先听和指认'},
 {title:'一起照顾伙伴',goal:'把熟悉的词变成有用的小短句',age:'准备好了 · 尝试表达需要'},
 {title:'说说我的小世界',goal:'在故事和生活里选用合适的话',age:'慢慢进阶 · 表达心情与想法'},
 {title:'我会照顾自己',goal:'说出需要，也能温柔地说不要',age:'生活表达 · 从短句到礼貌请求'},
 {title:'心情都有名字',goal:'表达难过和生气，学会求助与暂停',age:'情绪表达 · 没有必须开心的答案'},
 {title:'我们是好伙伴',goal:'邀请、回应、道歉，一起完成小事情',age:'轮流对话 · 把英语用在相处中'}
];
export interface LearningSituation {phrase:string;alternative:string;situation:string}
export interface LearningUnit {
 id:string;chapter:number;title:string;mission:string;words:string[];phrase:string;alternative:string;
 situation:string;practice?:LearningSituation[];station:string;theme:'garden'|'play'|'leisure'|'camp'|'beach';scene:string;story:string;homePlay:string;
}
export const LEARNING_UNITS:LearningUnit[]=[
 {id:'hello-island',chapter:0,title:'你好，新朋友',mission:'给小营地找到三样小东西，和伙伴打招呼。',words:['ball','book','hat'],phrase:'Hello!',alternative:'Bye-bye!',situation:'新朋友来到帐篷前，你想怎样打招呼？',station:'tent',theme:'camp',scene:'meadow',story:'taking-turns',homePlay:'和家里的玩偶打招呼，轮流说 Hello。'},
 {id:'color-orchard',chapter:0,title:'果园里的颜色',mission:'和伙伴一起找红色、黄色和绿色。',words:['red','yellow','green'],phrase:'Look at me!',alternative:'Help, please!',situation:'你找到了漂亮的颜色，想让伙伴看一看。',station:'tree',theme:'garden',scene:'orchard',story:'magic-words',homePlay:'找找家中红色和黄色的东西，让宝宝指给你看。'},
 {id:'snack-discovery',chapter:0,title:'树果点心时间',mission:'认一认小点心，再和伙伴分享。',words:['apple','banana','milk'],phrase:'Yummy!',alternative:'Bye-bye!',situation:'尝到好吃的点心，你想说什么？',station:'picnic',theme:'camp',scene:'orchard',story:'magic-words',homePlay:'点心时间说出一种食物，再用 Yummy 表达喜欢。'},
 {id:'quiet-night',chapter:0,title:'月亮晚安',mission:'找找太阳、月亮和星星，陪伙伴休息。',words:['sun','moon','star'],phrase:'Good night!',alternative:'Good morning!',situation:'晚上到了，伙伴准备睡觉了。',station:'bed-0',theme:'leisure',scene:'meadow',story:'try-again',homePlay:'睡前和玩偶说 Good night，不要求记住所有天体词。'},
 {id:'garden-helper',chapter:1,title:'种植园需要你',mission:'认出水、树和小花，试着请求帮助。',words:['water','flower','tree'],phrase:'Help, please!',alternative:'Bye-bye!',situation:'水壶有点沉，想请伙伴帮忙。',station:'farm',theme:'garden',scene:'garden-flowers',story:'a-little-help',homePlay:'一起照顾一盆植物；需要帮助时试着说 Help, please。'},
 {id:'our-turn',chapter:1,title:'小球轮到我',mission:'找到伙伴的球，练习轮流玩的约定。',words:['ball','blue','yellow'],phrase:'My turn!',alternative:'Your turn!',situation:'伙伴把小球交给你，现在轮到你啦。',station:'ball',theme:'play',scene:'playground',story:'taking-turns',homePlay:'用软球轮流滚动。轮到宝宝时可以说 My turn。'},
 {id:'sea-discovery',chapter:1,title:'海岸小发现',mission:'找到鱼、小鸟和水，邀请伙伴一起出发。',words:['fish','bird','water'],phrase:"Let's go!",alternative:'I need a rest.',situation:'伙伴准备好了，你想一起去海边看看。',station:'shells',theme:'beach',scene:'beach',story:'try-again',homePlay:'出门前邀请家人说 Let’s go，再观察一只小鸟。'},
 {id:'polite-snack',chapter:1,title:'请再来一点',mission:'准备小点心，温柔地表达自己想要什么。',words:['cake','egg','cookie'],phrase:'More, please!',alternative:'No, thank you.',situation:'还想要一点点心，怎样有礼貌地表达？',station:'bowl-0',theme:'camp',scene:'orchard',story:'magic-words',homePlay:'点心分小份，给宝宝自然表达 More, please 的机会。'},
 {id:'my-feelings',chapter:2,title:'说说我的心情',mission:'观察天空，也听听自己现在的心情。',words:['sun','cloud','rainbow'],phrase:"I'm happy!",alternative:"I'm hungry.",situation:'和伙伴玩得很开心，肚子也饱饱的。',station:'bench',theme:'leisure',scene:'meadow',story:'little-storm',homePlay:'先听孩子用中文表达真实心情，不要求每次都说开心。'},
 {id:'kind-words',chapter:2,title:'谢谢你的帮助',mission:'为朋友选点心，感谢他的小小帮助。',words:['apple','milk','strawberry'],phrase:'Thank you!',alternative:'More, please!',situation:'伙伴帮你洗好了苹果，还递给了你。',station:'berry-0',theme:'camp',scene:'orchard',story:'magic-words',homePlay:'在真实被帮助的时候说谢谢，不把礼貌词作为获得食物的条件。'},
 {id:'friends-together',chapter:2,title:'我们一起玩',mission:'找找能一起分享的东西，邀请朋友加入。',words:['ball','book','flower'],phrase:"Let's play!",alternative:'I need some space.',situation:'朋友有点孤单，你想邀请他一起玩。',station:'music',theme:'play',scene:'playground',story:'come-play',homePlay:'邀请玩偶加入游戏，也允许对方暂时不想玩。'},
 {id:'keep-our-promise',chapter:2,title:'一起照顾植物',mission:'用熟悉的词照顾小花，完成一个小约定。',words:['water','green','flower'],phrase:'All done!',alternative:'Help, please!',situation:'你和伙伴已经浇好花，水壶也收好了。',station:'farm',theme:'garden',scene:'garden-flowers',story:'keep-promise',homePlay:'约定饭后一起收一件东西，完成后说 All done。'},
 {"id": "water-break", "chapter": 3, "title": "跑累了，喝口水", "mission": "认识水和点心，练习告诉伙伴自己口渴了。", "words": ["water", "milk", "apple"], "phrase": "I'm thirsty.", "alternative": "I'm hungry.", "situation": "跑了一小会儿，你想喝水，肚子还不饿。", "station": "bowl-0", "theme": "camp", "scene": "orchard", "story": "magic-words", "homePlay": "运动后让宝宝自己表达要不要喝水；可以说 I’m thirsty，再由家长递水。", "practice": [{"phrase": "Thank you!", "alternative": "More, please!", "situation": "伙伴递来了你想喝的水，你想感谢它。"}]},
 {"id": "apple-please", "chapter": 3, "title": "我想要一个苹果", "mission": "看看不同的水果，用一句完整的话请求苹果。", "words": ["apple", "grapes", "watermelon"], "phrase": "Can I have an apple, please?", "alternative": "No, thank you.", "situation": "野餐篮里有苹果，你想请伙伴递给你一个。", "station": "berry-0", "theme": "garden", "scene": "orchard", "story": "magic-words", "homePlay": "用玩具水果轮流当小店员。宝宝可以说 Apple, please，准备好后再尝试完整句。", "practice": [{"phrase": "I'm hungry.", "alternative": "I'm thirsty.", "situation": "肚子咕咕叫，你想先告诉伙伴自己饿了。"}]},
 {"id": "enough-snack", "chapter": 3, "title": "吃饱了也可以说不", "mission": "认识三种点心，练习礼貌地表达已经够了。", "words": ["cookie", "cake", "strawberry"], "phrase": "No, thank you.", "alternative": "More, please!", "situation": "你已经吃饱，伙伴还想分点心给你。", "station": "bowl-0", "theme": "camp", "scene": "orchard", "story": 'enough-for-me', "homePlay": "把 No, thank you 用在不想再吃的时候，尊重宝宝的饱腹感，不要求吃完才算成功。", "practice": [{"phrase": "More, please!", "alternative": "No, thank you.", "situation": "换一种情况：你还没有吃饱，想再要一点点心。"}]},
 {"id": "rest-time", "chapter": 3, "title": "给自己一个小休息", "mission": "看看天空，告诉伙伴自己需要休息。", "words": ["cloud", "sun", "tree"], "phrase": "I need a rest.", "alternative": "Let's play!", "situation": "走了一会儿，你累了，想坐在长椅上休息。", "station": "bench", "theme": "leisure", "scene": "meadow", "story": 'sit-with-me', "homePlay": "一起散步时允许宝宝停下来。家长可以示范 I need a rest，然后安静坐一会儿。", "practice": [{"phrase": "Let's go!", "alternative": "I need a rest.", "situation": "你已经休息好了，想邀请伙伴继续散步。"}]},
 {"id": "sad-cloud", "chapter": 4, "title": "难过时也有人陪", "mission": "在长椅边说出难过，需要时请伙伴帮忙。", "words": ["cloud", "rainbow", "flower"], "phrase": "I feel sad.", "alternative": "I'm happy!", "situation": "你喜欢的小花被风吹落了，心里有点难过。", "station": "bench", "theme": "leisure", "scene": "meadow", "story": "try-again", "homePlay": "用玩偶演一演难过的时刻。先回应感受，再问要不要帮助，不急着让宝宝开心。", "practice": [{"phrase": "Help, please!", "alternative": "All done!", "situation": "你想把掉下来的花捡起来，但是够不到，需要帮助。"}]},
 {"id": "angry-pause", "chapter": 4, "title": "生气了，停一停", "mission": "陪伙伴认识生气，尝试停下来慢慢呼吸。", "words": ["ball", "red", "water"], "phrase": "I feel angry.", "alternative": "I'm happy!", "situation": "小球总是滚走，你有点生气，想告诉伙伴现在的心情。", "station": "ball", "theme": "play", "scene": "playground", "story": "little-storm", "homePlay": "不在孩子生气时考英语。平静时用玩偶说 I feel angry，再示范慢慢呼吸。", "practice": [{"phrase": "Let's take a breath!", "alternative": "Let's play!", "situation": "伙伴听到了你的心情。你想先暂停游戏，邀请它一起慢慢呼吸。"}]},
 {"id": "try-one-more", "chapter": 4, "title": "再试一次也没关系", "mission": "找找沙坑里的小发现，练习为自己加油。", "words": ["turtle", "fish", "bird"], "phrase": "Let's try again!", "alternative": "All done!", "situation": "沙子小山倒了，你还想和伙伴重新搭一次。", "station": "sand", "theme": "play", "scene": "beach", "story": "try-again", "homePlay": "搭积木倒下时示范 Let’s try again。也允许宝宝选择休息，不强迫继续挑战。", "practice": [{"phrase": "I did it!", "alternative": "Help, please!", "situation": "这次你自己搭好了小山，想告诉伙伴你做到了。"}]},
 {"id": "quiet-company", "chapter": 4, "title": "陪我坐一会儿", "mission": "认识树荫下的小东西，表达想要陪伴或独处。", "words": ["book", "tree", "flower"], "phrase": "Stay with me, please.", "alternative": "I need some space.", "situation": "你想安静坐一会儿，也想请伙伴留在身边陪你。", "station": "parasol", "theme": "leisure", "scene": "meadow", "story": 'sit-with-me', "homePlay": "让两个玩偶练习陪伴和独处。宝宝说 I need some space 时，家长给它一点空间。", "practice": [{"phrase": "I need some space.", "alternative": "Stay with me, please.", "situation": "换一种情况：你想自己安静坐一会儿，请伙伴给你一点空间。"}]},
 {"id": "join-the-game", "chapter": 5, "title": "我可以一起玩吗", "mission": "看看游乐场的小东西，练习邀请和加入。", "words": ["ball", "balloon", "hat"], "phrase": "May I join you?", "alternative": "See you!", "situation": "伙伴们正在玩球，你想问问能不能加入。", "station": "ball", "theme": "play", "scene": "playground", "story": 'come-play', "homePlay": "轮流让玩偶加入游戏。家长先示范 May I join you，宝宝也可以用手势邀请。", "practice": [{"phrase": "Let's play!", "alternative": "Good night!", "situation": "伙伴也想加入，你愿意邀请它一起玩。"}]},
 {"id": "sorry-and-repair", "chapter": 5, "title": "碰倒了，我来帮忙", "mission": "看清小花园的东西，道歉后尝试一起修补。", "words": ["flower", "water", "green"], "phrase": "Sorry.", "alternative": "Thank you!", "situation": "你不小心碰倒了伙伴摆好的小花，想先向它道歉。", "station": "farm", "theme": "garden", "scene": "garden-flowers", "story": "tell-truth", "homePlay": "玩偶不小心碰倒积木后说 Sorry，再问能做些什么。不要逼孩子当众道歉或马上原谅。", "practice": [{"phrase": "I'll help you.", "alternative": "All done!", "situation": "道歉后，你想和伙伴一起把小花重新摆好。"}]},
 {"id": "your-turn-now", "chapter": 5, "title": "这次轮到你", "mission": "认认乐器舞台旁的颜色，练习把机会交给伙伴。", "words": ["purple", "orange", "pink"], "phrase": "Your turn!", "alternative": "My turn!", "situation": "你已经玩过一轮，现在把机会交给正在等待的伙伴。", "station": "music", "theme": "play", "scene": "playground", "story": "taking-turns", "homePlay": "轮流敲桌子打节拍，用 My turn 和 Your turn 交换，不规定谁必须分享心爱的物品。", "practice": [{"phrase": "That's okay.", "alternative": "More, please!", "situation": "伙伴不小心碰到你的帽子并说了对不起。你已经不介意，想告诉它没关系。"}]},
 {"id": "tidy-together", "chapter": 5, "title": "小营地收拾好", "mission": "找到球、书和帽子，一起把用过的东西归位。", "words": ["ball", "book", "hat"], "phrase": "Let's tidy up!", "alternative": "Let's play!", "situation": "游戏结束了，球、书和帽子还散在营地里，你想邀请伙伴一起收拾。", "station": "tent", "theme": "camp", "scene": "meadow", "story": "keep-promise", "homePlay": "只收拾一两件东西，家长和宝宝一起做。开始说 Let’s tidy up，完成后说 All done。", "practice": [{"phrase": "All done!", "alternative": "Help, please!", "situation": "你们把球、书和帽子都放回了原位，现在收拾好啦。"}]}
];
export const unitSituations=(unit:LearningUnit):LearningSituation[]=>[unit,...(unit.practice??[])];
export const unitRoundCount=(unit:LearningUnit)=>unit.words.length+unitSituations(unit).length;
export const unitById=(id?:string)=>LEARNING_UNITS.find(u=>u.id===id);
/** Review the situation in which the child met the phrase, including transfer rounds. */
export function reviewSituation(key:string,contexts:string[]=[]):LearningSituation|undefined {
 for(const context of [...contexts].reverse()){
  if(!context.startsWith('unit:'))continue;
  const unit=unitById(context.slice(5));
  const scene=unit&&unitSituations(unit).find(s=>s.phrase===key);
  if(scene)return scene;
 }
 return LEARNING_UNITS.flatMap(unitSituations).find(s=>s.phrase===key);
}
export function recommendedUnit(s:SaveData){return LEARNING_UNITS.find(u=>!s.learning?.units[u.id]?.completedAt)??LEARNING_UNITS[LEARNING_UNITS.length-1];}
export function selectedUnit(s:SaveData){const active=unitById(s.learning?.activeUnit);const p=active?s.learning?.units[active.id]:undefined;return active&&(!p?.completedAt||!p.encounteredAt||!p.storyAt)?active:recommendedUnit(s);}
/** The explicit island handoff can revisit the station just completed. */
export function visitUnit(s:SaveData){return unitById(s.learning?.activeUnit)??selectedUnit(s);}
export function unitUnlocked(s:SaveData,id:string){const i=LEARNING_UNITS.findIndex(u=>u.id===id);return i>=0&&(i===0||!!s.learning?.units[LEARNING_UNITS[i-1].id]?.completedAt);}
export const learningLevel=(s:SaveData):1|2=>learningProfile(s.settings).vocabulary;

export interface LearningEntry {key:string;en:string;zh:string;kind:'word'|'phrase'|'concept'|'name';icon?:string;css?:string;pokemonId?:number;voiceEn?:string;contextOnly?:boolean}
export function learningEntry(key:string):LearningEntry|undefined {
 const normalized=normalizeLearningText(key);
 const w=PIC_WORDS.find(w=>normalizeLearningText(w.en)===normalized);if(w)return{...w,key:w.en,kind:'word'};
 const p=PHRASES.find(p=>normalizeLearningText(p.en)===normalized);if(p)return{...p,key:p.en,kind:'phrase',icon:'speak'};
 if(key==='big'||key==='small')return{key,en:key,zh:key==='big'?'大的':'小的',kind:'concept',icon:'ball'};
 if(/^count:[1-5]$/.test(key)){const n=Number(key.slice(6));return{key,en:['one','two','three','four','five'][n-1],zh:['一','二','三','四','五'][n-1],kind:'concept',icon:'apple'};}
 const extra=EXTRA_LEARNING.find(e=>e.key===key||normalizeLearningText(e.en)===normalized);if(extra)return extra;
 const mon=POKEMON.find(p=>normalizeLearningText(p.nameEn)===normalized);if(mon)return{key:mon.nameEn,en:mon.nameEn,zh:mon.nameZh,kind:'name',pokemonId:mon.id};
 return undefined;
}
