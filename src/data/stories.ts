import { LIFE_SHORT_STORIES } from './lifeShortStories';
export type StoryPose = 'meet' | 'offer' | 'wait' | 'sad' | 'breathe' | 'repair' | 'together';
export type StoryTheme = 'friends' | 'feelings' | 'trust';
export type StoryLine = {en:string;zh:string};
export interface StoryPause { invite:string; choices:{label:string;reply:StoryLine}[] }
export interface StoryPage extends StoryLine { speaker:number; pose:StoryPose; prop:string; beat:string; keyword:StoryLine; pause?:StoryPause; pictureWord?:{kind:string;en:string;zh:string} }
export interface Story {
  id:string; title:string; titleEn:string; theme:string; themeEn:string; group:StoryTheme;
  summary:string; parentTip:string; practice:string;
  scene:'orchard'|'playground'|'beach'|'meadow'|'garden'; cast:[number,number];
  activity?:{station:string;label:string;icon:string};
  phrase:StoryLine; question:StoryLine; pages:StoryPage[];
}
// A new edition gets its own bookmark; earlier completed six-page editions remain in the save.
export const storyProgressKey=(story:Story)=>`${story.id}:edition-2`;
export const STORY_THEMES:{id:StoryTheme;name:string;icon:string}[]=[
  {id:'friends',name:'和朋友相处',icon:'heart'},
  {id:'feelings',name:'照顾小心情',icon:'sun'},
  {id:'trust',name:'诚实与约定',icon:'flower'}
];
const page=(beat:string,en:string,zh:string,speaker:number,pose:StoryPose,prop:string,keyword:StoryLine,pause?:StoryPause):StoryPage=>({beat,en,zh,speaker,pose,prop,keyword,pause});
/** One small conflict, a named need, a choice, and a concrete repair. No rewards or moral quizzes. */
export const STORIES:Story[]=[
 {id:'magic-words',title:'一颗苹果，谢谢你',titleEn:'An Apple, Please',theme:'礼貌表达',themeEn:'Kind words',group:'friends',scene:'orchard',cast:[133,25],
 summary:'伊布想尝苹果，皮卡丘却还没洗好。怎样表达想要，也听见朋友的需要？',
 parentTip:'“请”和“谢谢”是表达需要与感谢，不是换取东西的口令。朋友也可以暂时不答应。',practice:'点心时间，轮流扮演递点心的人；试着说一句 please 或 thank you。',
 phrase:{en:'May I have an apple, please?',zh:'请给我一颗苹果，好吗？'},question:{en:'What can you say when a friend helps you?',zh:'朋友帮助了你，可以对他说什么？'},pages:[
 page('发现苹果','Eevee sees two red apples in Pikachu’s basket. Yum!','伊布看见皮卡丘篮子里的两颗红苹果。真想尝一尝！',133,'meet','apple',{en:"red apples",zh:"红苹果"}),
 page('先问一问','Eevee reaches out, then stops. The apples belong to Pikachu.','伊布伸出小爪，又停了下来。苹果是皮卡丘的，要先问一问。',133,'wait','apple',{en:"stops",zh:"停下来"}),
 page('说出想要','May I have an apple, please?','请给我一颗苹果，好吗？',133,'meet','apple',{en:"please",zh:"请"}),
 page('朋友还没准备好','Yes, but these apples are dirty. Let’s wash them first.','可以呀，不过苹果还没洗。我们先把它们洗干净吧。',25,'wait','water',{en:"wash",zh:"洗"},{invite:'苹果还没洗好，你想和伊布怎么做？',choices:[{label:'一起洗苹果',reply:{en:'I can help!',zh:'我可以帮忙！'}},{label:'在旁边等一等',reply:{en:'I can wait.',zh:'我可以等一等。'}}]}),
 page('一起帮个忙','Eevee carries the basket. Pikachu washes the apples. Splash, splash!','伊布帮忙拿篮子，皮卡丘洗苹果。哗啦，哗啦！',25,'repair','water',{en:"basket",zh:"篮子"}),
 page('接过小心意','Here you are! Thank you, Pikachu!','给你一颗！谢谢你，皮卡丘！',133,'offer','apple',{en:"Thank you",zh:"谢谢你"}),
 page('听见谢谢','You are welcome. Thank you for helping, Eevee.','不客气。伊布，也谢谢你帮忙。',25,'together','heart',{en:"You are welcome",zh:"不客气"}),
 page('坐下来分享','Crunch, crunch! Two friends enjoy their apples in the shade.','咔嚓，咔嚓！两个好朋友坐在树荫下，各自尝着甜苹果。',133,'together','apple',{en:"friends",zh:"朋友"})]},
 {id:'taking-turns',title:'小球轮到谁',titleEn:'Our Turn to Play',theme:'轮流与分享',themeEn:'Taking turns',group:'friends',scene:'playground',cast:[25,1],
 summary:'只有一只小球，两个朋友都想玩。他们决定用一次滚动，做一个看得见的约定。',
 parentTip:'用“再滚一次”这样的具体信号代替“等一会儿”。等待时可以陪伴，不强迫孩子马上交出玩具。',practice:'用一只软球轮流滚给对方。交接时说 Your turn，等待时可以一起数一次。',
 phrase:{en:'Can I have a turn, please?',zh:'请问可以轮到我了吗？'},question:{en:'What can you do while you wait?',zh:'等朋友玩的时候，你可以做些什么呢？'},pages:[
 page('只有一只小球','Bulbasaur rolls a yellow ball down a little hill. Whee!','妙蛙种子把黄色小球滚下小坡。呼——真好玩！',1,'meet','ball',{en:"yellow ball",zh:"黄色小球"}),
 page('我也想玩','Pikachu runs over. I want to play, too!','皮卡丘跑过来：我也想玩！',25,'wait','ball',{en:"play",zh:"玩"}),
 page('先说一声','Can I have a turn, please? Bulbasaur holds the ball.','请问可以轮到我了吗？妙蛙种子还抱着小球。',25,'meet','ball',{en:"a turn",zh:"轮到一次"}),
 page('一个小约定','One more roll. Then it is your turn.','我再滚一次，然后就轮到你啦。',1,'offer','ball',{en:"your turn",zh:"轮到你"},{invite:'等这一小会儿，你想做什么？',choices:[{label:'给朋友加油',reply:{en:'Go, Bulbasaur!',zh:'妙蛙种子，加油！'}},{label:'一起数一次',reply:{en:'One more roll!',zh:'再滚一次！'}}]}),
 page('等待有点难','Pikachu’s feet wiggle. Waiting feels hard. He cheers for his friend.','皮卡丘的小脚动来动去，等待有点难。他决定给朋友加油。',25,'wait','star',{en:"Waiting",zh:"等待"}),
 page('约定做到了','The ball stops. Your turn, Pikachu! Bulbasaur rolls it over.','球停了。皮卡丘，轮到你啦！妙蛙种子把球滚过去。',1,'offer','ball',{en:"Your turn",zh:"轮到你"}),
 page('想到新玩法','Pikachu rolls it back. Can we play together?','皮卡丘把球滚回来：我们可以一起玩吗？',25,'meet','ball',{en:"together",zh:"一起"}),
 page('来来回回的小球','My turn, your turn. The ball rolls between two happy friends.','轮到我，轮到你。小球在两个开心的朋友之间，来来回回。',1,'together','ball',{en:"happy",zh:"开心的"})]},
 {id:'little-storm',title:'小火龙心里的小风暴',titleEn:'A Little Storm',theme:'认识生气',themeEn:'Big feelings',group:'feelings',scene:'beach',cast:[4,7],
 summary:'海浪推倒了沙堡。小火龙没有立刻开心起来，杰尼龟陪他找到安全的休息办法。',
 parentTip:'先承认生气，再讨论做法。呼吸不是要求孩子马上平静；也可以安静坐着，等准备好了再尝试。',practice:'一起闻闻想象中的花，再慢慢吹凉热汤。孩子不想做时，可以只陪他坐一会儿。',
 phrase:{en:'I feel angry. I need a break.',zh:'我有点生气。我想休息一下。'},question:{en:'What helps you when you feel angry?',zh:'你生气的时候，什么能让你舒服一点？'},pages:[
 page('海浪来了','Charmander builds a tall sandcastle. A wave washes the tower away.','小火龙搭了一座高高的沙堡。一个海浪过来，把塔冲倒了。',4,'sad','castle',{en:"sandcastle",zh:"沙堡"}),
 page('心里热热的','I feel angry! My paws are tight. My face feels hot.','我生气了！小爪攥紧了，脸也热热的。',4,'sad','sun',{en:"angry",zh:"生气的"}),
 page('停住小爪','Charmander wants to throw sand. He puts his paws on his knees instead.','小火龙很想扬起沙子。他停下来，把小爪放在膝盖上。',4,'wait','castle',{en:"paws",zh:"小爪"}),
 page('有人陪着我','It is okay to feel angry. I can sit with you.','生气是可以的。我可以坐在这里陪你。',7,'meet','heart',{en:"sit with you",zh:"坐着陪你"},{invite:'现在的小火龙，想怎样休息？',choices:[{label:'慢慢呼吸',reply:{en:'Breathe in. Breathe out.',zh:'慢慢吸气，再慢慢呼气。'}},{label:'安静坐一会儿',reply:{en:'I need a break.',zh:'我想休息一下。'}}]}),
 page('像闻花一样吸气','Charmander smells an imaginary flower, then slowly blows out. In, out.','小火龙像闻花一样吸气，再慢慢呼出去。吸气，呼气。',4,'breathe','flower',{en:"flower",zh:"花"}),
 page('不用马上开心','I am still a little angry. Can we rest longer? Of course.','我还是有一点生气。可以再休息一下吗？当然可以。',7,'wait','heart',{en:"rest",zh:"休息"}),
 page('准备好再试','Now I am ready. Can you help me build farther from the waves?','现在我准备好了。你能帮我在离海浪远一点的地方搭沙堡吗？',4,'repair','castle',{en:"help",zh:"帮助"}),
 page('换个地方再搭','Together, they build a wide, low castle. The waves stay far away.','他们一起搭了一座矮矮宽宽的沙堡。海浪在远处，轻轻拍着岸。',7,'together','castle',{en:"Together",zh:"一起"})]},
 {id:'try-again',title:'跑得慢，也没关系',titleEn:'Let’s Try Again',theme:'面对失落',themeEn:'Trying again',group:'feelings',scene:'meadow',cast:[133,7],
 summary:'伊布没跑到第一名。朋友先陪它难过，再一起寻找不只有输赢的玩法。',
 parentTip:'不急着说“这有什么好哭的”或“下次一定赢”。拥抱先征求同意，休息和再试都可以。',practice:'和孩子走一段小路，选一片喜欢的叶子。把关注点从谁更快，换成一起发现了什么。',
 phrase:{en:'I feel sad. Can I have a hug?',zh:'我有点难过。可以抱抱我吗？'},question:{en:'What would you say to a sad friend?',zh:'朋友难过的时候，你想对他说什么？'},pages:[
 page('出发去小旗旁','Eevee and Squirtle race to a little flag. Ready, set, go!','伊布和杰尼龟比赛跑到小旗旁。预备，出发！',133,'meet','flag',{en:"Ready, set, go",zh:"预备，出发"}),
 page('没跑到第一名','Squirtle gets there first. Eevee stops and looks at the ground.','杰尼龟先到了。伊布停下来，低头看着地面。',133,'sad','flag',{en:"first",zh:"第一"}),
 page('说出失落','I feel sad. I really wanted to win.','我好难过。我刚才真的很想赢。',133,'sad','heart',{en:"sad",zh:"难过的"}),
 page('先问问再抱抱','Would you like a hug, or shall I sit beside you?','你想要一个拥抱，还是想让我坐在旁边？',7,'meet','heart',{en:"a hug",zh:"一个拥抱"},{invite:'如果你是伊布，你现在想要什么？',choices:[{label:'一个拥抱',reply:{en:'A hug, please.',zh:'请抱抱我。'}},{label:'陪我坐一会儿',reply:{en:'Sit with me, please.',zh:'请陪我坐一会儿。'}}]}),
 page('我还是你的朋友','A hug, please. Squirtle opens his arms. You are still my friend.','请抱抱我。杰尼龟张开双臂：你一直都是我的好朋友。',7,'together','heart',{en:"friend",zh:"朋友"}),
 page('不急着再比赛','They rest in the grass. Eevee’s breathing slows down.','他们在草地上歇一会儿。伊布的呼吸慢慢平稳下来。',133,'wait','flower',{en:"rest",zh:"休息"}),
 page('选一种新玩法','Can we walk together this time? Eevee asks. Yes!','这次我们一起走过去，好吗？伊布问。好呀！',133,'meet','flag',{en:"walk together",zh:"一起走"}),
 page('路上也有惊喜','They find a tiny flower on the way. Look what we found together!','他们在路上发现一朵小花。看，这是我们一起发现的！',7,'together','flower',{en:"tiny flower",zh:"小花"})]},
 {id:'tell-truth',title:'花盆是谁碰倒的',titleEn:'I Can Tell the Truth',theme:'诚实与修补',themeEn:'Telling the truth',group:'trust',scene:'garden',cast:[1,25],
 summary:'花盆倒了，妙蛙种子有点害怕。说出事情的经过，是一起补救的第一步。',
 parentTip:'感谢孩子愿意告诉你，再一起处理影响。把“做错了一件事”和“你是坏孩子”分开。',practice:'假装积木倒了，练习“是我碰到的”和“一起收好吧”，不要求孩子背一段道歉。',
 phrase:{en:'I did it. I am sorry. Can I help?',zh:'是我碰倒的。对不起。我能帮忙吗？'},question:{en:'How can we help after a mistake?',zh:'不小心做错了事，我们可以怎样帮忙补救？'},pages:[
 page('哎呀，花盆倒了','Bulbasaur turns too quickly. A flowerpot tips over, and soil spills out.','妙蛙种子转身太快，碰倒了花盆。泥土撒在小路上。',1,'sad','pot',{en:"flowerpot",zh:"花盆"}),
 page('有点害怕开口','Oh no. Will Pikachu be angry? Bulbasaur feels a knot in his tummy.','糟了，皮卡丘会生气吗？妙蛙种子的肚子紧紧的。',1,'wait','heart',{en:"tummy",zh:"肚子"}),
 page('先留在这里','He wants to hide. Then he sees the flower lying on the path.','他有点想躲起来，又看见小花还躺在路上。',1,'sad','flower',{en:"hide",zh:"躲起来"}),
 page('把经过说出来','Pikachu, I knocked the pot over. I am sorry.','皮卡丘，是我碰倒了花盆。对不起。',1,'meet','pot',{en:"I am sorry",zh:"对不起"},{invite:'告诉朋友后，还能怎样帮小花？',choices:[{label:'一起扶起花盆',reply:{en:'Let’s fix it together.',zh:'我们一起把它弄好吧。'}},{label:'请朋友帮个忙',reply:{en:'Can you help me?',zh:'你能帮帮我吗？'}}]}),
 page('谢谢你告诉我','Thank you for telling me. I feel sad about the flower.','谢谢你告诉我。看到小花这样，我也有点难过。',25,'sad','flower',{en:"Thank you",zh:"谢谢你"}),
 page('一起想个办法','The pot is not broken. Let’s put the flower back gently.','花盆没有摔坏。我们轻轻把小花放回去吧。',25,'repair','pot',{en:"gently",zh:"轻轻地"}),
 page('小爪帮上忙','Bulbasaur holds the pot. Pikachu adds soil. Pat, pat, pat.','妙蛙种子扶稳花盆，皮卡丘添上泥土。轻轻拍，轻轻拍。',1,'repair','flower',{en:"soil",zh:"泥土"}),
 page('下次留出空间','The flower stands again. Let’s move the pot away from our path.','小花又站起来了。我们把花盆放到小路旁边，走路就更宽敞啦。',25,'together','flower',{en:"path",zh:"小路"})]},
 {id:'keep-promise',title:'说好了，一起浇花',titleEn:'A Promise to Help',theme:'守信与沟通',themeEn:'Keeping a promise',group:'trust',scene:'garden',cast:[7,1],
 summary:'答应浇花后，杰尼龟累了。守约不等于硬撑，它可以及时说出来，一起调整办法。',
 parentTip:'让约定具体、可做到。遇到困难要沟通，也允许一起调整时间和任务，而不是为了守约忽略身体。',practice:'约定一件小事，例如饭后一起收两本书。需要帮助或休息时，示范开口商量。',
 phrase:{en:'I need help to keep my promise.',zh:'我需要帮助，才能做到答应的事。'},question:{en:'What can you say if you need help?',zh:'答应的事情遇到了困难，你可以怎么说？'},pages:[
 page('一个小约定','After our snack, I will help you water the flowers, says Squirtle.','杰尼龟说：吃完点心，我来帮你浇花。',7,'offer','flower',{en:"water the flowers",zh:"浇花"}),
 page('身体有点累了','After playing, Squirtle feels tired. Even the little watering can feels heavy.','玩了一会儿，杰尼龟累了。小小的水壶，也变得沉沉的。',7,'sad','water',{en:"tired",zh:"累了"}),
 page('朋友还在等','Bulbasaur waits by the flowers. Squirtle remembers their promise.','妙蛙种子在花旁等着。杰尼龟想起了他们的约定。',1,'wait','flower',{en:"promise",zh:"约定"}),
 page('及时告诉朋友','I want to help, but I am tired. Can we make a new plan?','我想帮忙，可是我有点累了。我们可以商量一个新办法吗？',7,'meet','heart',{en:"new plan",zh:"新办法"},{invite:'水壶太沉了，你想试试哪个办法？',choices:[{label:'少装一点水',reply:{en:'A little water, please.',zh:'少装一点水吧。'}},{label:'一起提水壶',reply:{en:'Let’s carry it together.',zh:'我们一起提吧。'}}]}),
 page('一起商量','Yes. Let’s rest first. Then we can use a smaller can.','好呀，我们先休息，再换一个更小的水壶。',1,'offer','water',{en:"rest",zh:"休息"}),
 page('准备好再出发','After a rest, Squirtle feels ready. Bulbasaur brings the small can.','休息后，杰尼龟准备好了。妙蛙种子拿来了小水壶。',7,'meet','water',{en:"ready",zh:"准备好了"}),
 page('分工一起做','Bulbasaur carries the can. Squirtle pours a little water. Drip, drip!','妙蛙种子提水壶，杰尼龟慢慢倒水。滴答，滴答！',7,'repair','flower',{en:"a little water",zh:"一点水"}),
 page('约定里也有帮助','The flowers sparkle. We did it together. Thank you for telling me.','小花挂着亮晶晶的水珠。我们一起做到了，谢谢你及时告诉我。',1,'together','flower',{en:"together",zh:"一起"})]},
 ...LIFE_SHORT_STORIES
];
