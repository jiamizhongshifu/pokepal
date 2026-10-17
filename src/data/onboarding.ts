/** Short, spoken instructions for real controls. No rewards or forced tutorial steps. */
export const GUIDES = {
 welcome:{icon:'hand',title:'选一个喜欢的头像',voice:'点一点你喜欢的头像，我们就出发啦。',target:'.avatar-choice',sequence:['hand','play']},
 firstFriend:{icon:'grass',title:'交个新朋友',voice:'送你的精灵球已经准备好啦。点草丛，找一位喜欢的伙伴。',target:'.empty-home .btn-big, .dock-btn.catch',sequence:['pokeball','grass']},
 home:{icon:'ear',title:'和伙伴一起学英语',voice:'点学英语，和伙伴学一点。也能点点伙伴，摸摸它、喂它吃东西。',target:'.dock-btn.tasks',sequence:['ear','hand']},
 camera:{icon:'swipe',title:'小手逛小岛',voice:'一根手指转一转，两根手指一起拖动。两根手指分开，就能看近一点。想安静看风景，先点小岛生活，再点小眼睛。',target:'.home-more > summary',sequence:['swipe','eye']},
 music:{icon:'music',title:'音乐轻轻响',voice:'点小音符，可以打开或关掉音乐。想调小声音，请大人到家长设置里帮忙。',target:'.music-toggle',sequence:['music','speaker']},
 farm:{icon:'grass',title:'种下，等等，再摘果',voice:'点空地上的种植图标，伙伴会来帮忙浇水。等树果长大，点果子就能收起来。不用一直等在这里哦。',target:'.plot-action:not(:disabled)',sequence:['grass','water','apple']},
 tasks:{icon:'ear',title:'跟着伙伴，学一点',voice:'点绿色的大按钮，和伙伴学一点英语。也能去岛上玩，或者一起读故事。想休息，随时回来。',target:'.learning-trail-primary',sequence:['play','ear','hand']},
 listen:{icon:'ear',title:'先听，再点图片',voice:'先听听在找什么，再点你觉得对的图片。没听清，点喇叭再听一次。选错也没关系。',target:'.task-listen .choices',sequence:['ear','picture','hand']},
 repeat:{icon:'speak',title:'听一句，试着说一句',voice:'先听伙伴说。点麦克风，试着跟它说一句。说完可以点我说完啦。现在不想说，也可以换个游戏。',target:'.task-repeat .mic-btn:not(:disabled)',sequence:['ear','mic']},
 wordpic:{icon:'picture',title:'听一听，找一找',voice:'听听这个词，再点对应的图片。想再听一次，就点喇叭。慢慢找，不着急。',target:'.task-wordpic .choices',sequence:['ear','picture','hand']},
 trace:{icon:'pencil',title:'从小圆点出发',voice:'看看小圆点怎么走，再从圆点出发，跟着箭头画。一次画一笔。抬起手指，还可以接着画。',target:'.trace-pad',sequence:['eye','pencil']},
 practice:{icon:'star',title:'再玩一小组就好',voice:'还想玩的话，点一个喜欢的小游戏，再玩一小组。累了就回小岛休息。',target:'.practice-option',sequence:['picture','hand']},
 journey:{icon:'island',title:'跟着小路，一点点学',voice:'点亮着的小路入口，和伙伴开始一个小冒险。每次学一点，再回小岛用一用。',target:'.journey-stops .next button',sequence:['sign','play']},
 lesson:{icon:'ear',title:'听听伙伴，试一试',voice:'先听听伙伴说什么。你可以再听一次，再点图片试一试。不想说也没关系。',target:'.learning-choices, .guided-example',sequence:['ear','picture']},
 notebook:{icon:'book',title:'和认识的词再见面',voice:'这里住着你遇见的词。点小喇叭听一听，喜欢的词可以留下来。我们慢慢认识它们。',target:'.notebook-listen-card, .learning-empty .journey-primary',sequence:['book','speaker']},
 review:{icon:'heart',title:'和老朋友再玩一次',voice:'听听这个老朋友，再试着找一找。忘记了也没关系，我们一起再听一次。',target:'.learning-choices, .guided-example',sequence:['ear','picture']},
 energy:{icon:'bolt',title:'玩一玩，收集小能量',voice:'点一个喜欢的活动，听、找、读故事，都能收集能量。同一种活动今天只送一次。玩累了，休息也很好。',target:'.energy-next .btn-big',sequence:['ear','bolt']},
 shop:{icon:'gift',title:'五点能量，换一个球',voice:'五点能量可以换一个精灵球。有了球，就能邀请你喜欢的伙伴。能量还不够的话，先选个小游戏吧。',target:'.single-ball-card .btn-big',sequence:['bolt','gift','grass']},
 catch:{icon:'grass',title:'点点喜欢的伙伴',voice:'点一只你喜欢的宝可梦。想找特别喜欢的那只，就点选个伙伴。想看看别的朋友，可以点再次探索。',target:'.field',sequence:['grass','hand','pokeball']},
 noBall:{icon:'gift',title:'先准备一个精灵球',voice:'先看看你喜欢谁，再去换一个精灵球。有了球，就能邀请它回家。',target:'.field-kit button',sequence:['bolt','pokeball']},
 throw:{icon:'hand',title:'轻点精灵球，邀请它',voice:'轻轻点一下精灵球，就能邀请这位伙伴。也可以把球向上滑。',target:'.throw-ball',sequence:['hand','pokeball']},
 dex:{icon:'dex',title:'点图片，认识伙伴',voice:'点开喜欢的宝可梦，听听它的名字。还没有的伙伴，也可以选择去找它。',target:'.dex-cell',sequence:['dex','hand']},
 wish:{icon:'search',title:'你想和谁做朋友？',voice:'点开你喜欢的宝可梦，再点我想找这只。我们去草丛找它。',target:'.dex-cell',sequence:['search','grass']},
 ownedDetail:{icon:'heart',title:'点爱心，回家陪它玩',voice:'这位已经是你的伙伴啦。点爱心，回家就能找到它。点它的名字，还能听听名字怎么说。',target:'.detail-wish .wish-button',sequence:['heart','island']},
 detail:{icon:'heart',title:'听名字，再去找它',voice:'点喇叭，听听伙伴的名字。还没有它的话，可以点我想找这只，再去草丛认识它。',target:'.detail-wish .wish-button',sequence:['speaker','grass']},
 friends:{icon:'search',title:'点头像，马上见面',voice:'点一点伙伴的头像，镜头就会带你找到它。',target:'.companion-portraits button',sequence:['search','hand']},
 care:{icon:'hand',title:'陪伙伴玩一玩',voice:'点小手，摸摸伙伴。点食物，给它一点点心。想跟着它散步，就点跟着走。',target:'.companion-card .actions .pet-action',sequence:['hand','apple']},
 feed:{icon:'apple',title:'分享一点好吃的',voice:'点一颗还有的树果，分享给伙伴。没有树果也没关系，可以给它普通点心。',target:'.berry-menu button:not(:disabled)',sequence:['apple','heart']},
 play:{icon:'ball',title:'点图片，就开始玩',voice:'点一张想玩的图片，伙伴就会自己走过去。你可以陪它玩，也可以安静看看。',target:'.living-play-choices button',sequence:['ball','hand']},
 gifts:{icon:'gift',title:'点装饰，看看小岛的新样子',voice:'点喜欢的装饰，它会自己摆好。我们一起看看它放在哪里。想升级，可以先看看升级后的样子，再请大人一起决定。',target:'.dress-catalog, .upgrade-choice',sequence:['gift','island']},
 picnic:{icon:'bowl',title:'选一颗，伙伴来分享',voice:'点一颗还有的树果，分享给伙伴。没有树果也没关系，可以给它普通点心。',target:'.picnic-berries button:not(:disabled)',sequence:['apple','heart']},
 area:{icon:'ball',title:'点张图片，伙伴就出发',voice:'点一张想玩的图片，伙伴就会自己走过去。你可以陪它玩，也可以安静看看。',target:'.area-choices > div button',sequence:['picture','hand']},
 stories:{icon:'book',title:'选本故事，一起读',voice:'点一本喜欢的故事，和大人一起看。我们可以听、可以聊，没有考试。',target:'.storybook',sequence:['book','ear']},
 story:{icon:'ear',title:'选耳朵听，选书本一起读',voice:'点耳朵，故事会自己慢慢翻页。点书本，就和大人一起读。想停下来，点暂停。遇到一起演一演，也可以直接点下一页。',target:'.story-mode',sequence:['ear','book']},
 diary:{icon:'mic',title:'今天的你，值得被听见',voice:'先听一个小问题，再点麦克风，说一点今天的事。说完再点一下。开心、难过都可以，不想说也可以跳过。',target:'.diary-record',sequence:['ear','mic','check']},
} as const;
export type GuideId=keyof typeof GUIDES;
export interface Onboarding {version:1;seen:Partial<Record<GuideId,boolean>>;automatic:boolean;}
export function validOnboarding(value:unknown):value is Onboarding {
 if(!value||typeof value!=='object')return false;
 const v=value as Onboarding;
 return v.version===1&&typeof v.automatic==='boolean'&&!!v.seen&&typeof v.seen==='object'&&!Array.isArray(v.seen)&&Object.entries(v.seen).every(([k,x])=>Object.prototype.hasOwnProperty.call(GUIDES,k)&&typeof x==='boolean');
}
