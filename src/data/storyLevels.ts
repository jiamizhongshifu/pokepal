import type { Settings } from '../types';
import { learningProfile } from '../lib/learningStage';
import { storyProgressKey, type Story, type StoryLine } from './stories';

export type StoryLanguage = 'short'|'full';
/** One-to-one page adaptations: same scene, conflict, agency and repair as the original. */
export const SHORT_STORY_LINES:Record<string,{version:1;phrase:StoryLine;pages:[string,string,string,string][]}>={
 'taking-turns':{version:1,phrase:{en:'Your turn!',zh:'轮到你啦！'},pages:[
  ['A yellow ball. Roll, roll!','一只黄色小球。妙蛙种子滚呀滚！','ball','球'],
  ['I want to play, too!','皮卡丘说：我也想玩！','play','玩'],
  ['My turn, please?','皮卡丘问：可以轮到我吗？','turn','轮到一次'],
  ['One more roll. Then your turn!','妙蛙种子说：再滚一次，就轮到你！','Your turn','轮到你'],
  ['Waiting is hard. Go, friend!','等待有点难。皮卡丘给朋友加油！','friend','朋友'],
  ['Your turn! Here is the ball.','球停了。轮到你啦！妙蛙种子把球滚过去。','ball','球'],
  ['Let’s play together!','皮卡丘把球滚回来：我们一起玩吧！','together','一起'],
  ['My turn. Your turn. We are happy!','轮到我，轮到你。两个朋友玩得很开心！','happy','开心的']
 ]},
 'little-storm':{version:1,phrase:{en:'I need a rest.',zh:'我想休息一下。'},pages:[
  ['A big wave. Oh, no! My sandcastle!','一个大浪来了。哎呀！小火龙的沙堡倒了！','sandcastle','沙堡'],
  ['I feel angry. My face is hot.','我生气了，脸热热的。小火龙说出了自己的感受。','angry','生气的'],
  ['Stop. Hands on my knees.','小火龙想扬沙子。他停住小爪，把它们放在膝盖上。','hands','手'],
  ['It is okay to feel angry. I am here.','生气是可以的。杰尼龟说：我在这里陪你。','angry','生气的'],
  ['Smell a flower. Breathe out slowly.','像闻花一样吸气，再慢慢呼出来。','flower','花'],
  ['Still angry. More rest? Yes.','还是有点生气。再休息一下，好吗？当然可以。','rest','休息'],
  ['I am ready. Help, please!','现在我准备好了。请帮帮我，换个地方搭沙堡吧！','Help, please','请帮帮我'],
  ['Let’s build here. The waves are far away.','我们在这里搭吧。新的沙堡矮矮宽宽，海浪在远处。','waves','海浪']
 ]}
};
const pictureWords:Record<string,Record<number,{kind:string;en:string;zh:string}>>={
 'taking-turns':Object.fromEntries([0,1,2,3,5,6,7].map(i=>[i,{kind:'ball',en:'ball',zh:'球'}])),
 'little-storm':{0:{kind:'castle',en:'sandcastle',zh:'沙堡'},4:{kind:'flower',en:'flower',zh:'花'},6:{kind:'castle',en:'sandcastle',zh:'沙堡'},7:{kind:'castle',en:'sandcastle',zh:'沙堡'}}
};
export function storyLanguage(story:Story,settings:Settings):StoryLanguage{
 if(!SHORT_STORY_LINES[story.id])return 'full';
 const preference=settings.storyLanguage;
 if(preference==='short'||preference==='full')return preference;
 return learningProfile(settings).phrases==='situations'?'full':'short';
}
export function storyEdition(story:Story,language:StoryLanguage):Story{
 const short=language==='short'?SHORT_STORY_LINES[story.id]:undefined;
 if(!SHORT_STORY_LINES[story.id])return story;
 return {...story,...(short?{phrase:short.phrase}:{}),pages:story.pages.map((p,i)=>{
  const line=short?.pages[i];
  return {...p,...(line?{en:line[0],zh:line[1],keyword:{en:line[2],zh:line[3]}}:{}),pictureWord:pictureWords[story.id]?.[i]};
 })};
}
/** Full bookmarks remain exactly where older saves wrote them; short editions have their own bookmark. */
export function storyBookmarkKey(story:Story,language:StoryLanguage){
 return language==='short'&&SHORT_STORY_LINES[story.id]?`${storyProgressKey(story)}:short-v${SHORT_STORY_LINES[story.id].version}`:storyProgressKey(story);
}
export function storyInitialPage(story:Story,progress:number|undefined){
 return Number.isFinite(progress)&&progress!>0&&progress!<=story.pages.length?Math.floor(progress!)-1:0;
}
export const allStoryEditions=(stories:Story[])=>stories.flatMap(s=>SHORT_STORY_LINES[s.id]?[s,storyEdition(s,'short')]:[s]);
