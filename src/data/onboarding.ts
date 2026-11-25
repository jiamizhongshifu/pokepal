/** Short, spoken instructions for real controls. No rewards or forced tutorial steps. */
export const GUIDES = {
 welcome:{icon:'hand',title:'选一个喜欢的头像',voice:'点一点你喜欢的头像，我们就出发啦。',target:'.avatar-choice',sequence:['hand','play']},
 firstFriend:{icon:'waves',title:'交个新朋友',voice:'送你的邀请果已经准备好啦。去海边，迎接一位坐船来的新朋友。',target:'.empty-home .btn-big',sequence:['invite-berry','waves']},
 music:{icon:'music',title:'音乐轻轻响',voice:'点小音符，可以打开或关掉音乐。想调小声音，请大人到家长设置里帮忙。',target:'.music-toggle',sequence:['music','speaker']},
 island:{icon:'island',title:'点一点，走进去',voice:'点一个地方，就能走进去玩。伙伴头上有图画，点一下，就和它一起做。每做完一件事，上面的星星亮一颗。',target:'.island-invite',sequence:['hand','island','star']},
 scene:{icon:'hand',title:'点东西，听英语',voice:'点地上的东西，听听它的英语。点点伙伴，听它说话。右上角的图画，也能一起玩。想回小岛，点左上角。',target:'.island-thing:not(.is-shadow)',sequence:['hand','ear','island']},
 islandDo:{icon:'ear',title:'听一听，拿给它',voice:'听伙伴说要什么，把它拖给伙伴，直接点一下也可以。没听清，就点小喇叭再听一次。',target:'.island-stage .island-ask-options',sequence:['ear','hand','speaker']},
 garden:{icon:'seed',title:'种下，浇水，摘果子',voice:'点空地，听伙伴想种什么，把它拖进地里。再点一下浇浇水，等水果长大，点一下就摘下来。',target:'.garden-plot',sequence:['seed','watering-can','strawberry']},
 path:{icon:'sign',title:'跟着路线，学一点',voice:'点绿色的大按钮，和伙伴学一点英语。也能去岛上玩，或者一起读故事。想休息，随时回来。',target:'.path-stop.is-current .stop-go',sequence:['play','ear','hand']},
 tasks:{icon:'ear',title:'跟着伙伴，学一点',voice:'点绿色的大按钮，和伙伴学一点英语。也能去岛上玩，或者一起读故事。想休息，随时回来。',target:'.learning-trail-primary',sequence:['play','ear','hand']},
 listen:{icon:'ear',title:'先听，再点图片',voice:'先听听我们要找什么，找到就点它。没听清，可以点喇叭再听一次。没找到也没关系，再试一次就好。',target:'.task-listen .choices',sequence:['ear','picture','hand']},
 repeat:{icon:'speak',title:'听一句，试着说一句',voice:'先听伙伴说。点麦克风，试着跟它说一句。说完可以点我说完啦。现在不想说，也可以换个游戏。',target:'.task-repeat .mic-btn:not(:disabled)',sequence:['ear','mic']},
 wordpic:{icon:'picture',title:'听一听，找一找',voice:'听听这个词，再点对应的图片。想再听一次，就点喇叭。慢慢找，不着急。',target:'.task-wordpic .choices',sequence:['ear','picture','hand']},
 trace:{icon:'pencil',title:'从小圆点出发',voice:'看看小圆点怎么走，再从圆点出发，跟着箭头画。一次画一笔。抬起手指，还可以接着画。',target:'.trace-pad',sequence:['eye','pencil']},
 practice:{icon:'star',title:'再玩一小组就好',voice:'还想玩的话，点一个喜欢的小游戏，再玩一小组。累了就回小岛休息。',target:'.practice-option',sequence:['picture','hand']},
 journey:{icon:'island',title:'跟着小路，一点点学',voice:'这是我们的冒险地图。伙伴站着的地方，就是现在这一关。点一下，一起出发吧！每天玩一小关，慢慢走到徽章那里。其他地点也能点开看看，学过的内容在再回顾里。',target:'.adventure-stop.is-current',sequence:['sign','play']},
 lesson:{icon:'ear',title:'听听伙伴，试一试',voice:'先听听伙伴说什么。你可以再听一次，再点图片试一试。不想说也没关系。',target:'.learning-choices, .guided-example',sequence:['ear','picture']},
 notebook:{icon:'book',title:'和认识的词再见面',voice:'这里住着你遇见的词。点小喇叭听一听，喜欢的词可以留下来。我们慢慢认识它们。',target:'.notebook-listen-card, .learning-empty .journey-primary',sequence:['book','speaker']},
 review:{icon:'heart',title:'和老朋友再玩一次',voice:'听听这个老朋友，再试着找一找。忘记了也没关系，我们一起再听一次。',target:'.learning-choices, .guided-example',sequence:['ear','picture']},
 catch:{icon:'waves',title:'点点喜欢的伙伴',voice:'点一艘小船，迎接你喜欢的小精灵。想看看别的朋友，可以点看看别的小船。',target:'.friend-visit-boats',sequence:['waves','hand','invite-berry']},
 dex:{icon:'dex',title:'点图片，认识伙伴',voice:'点开喜欢的小精灵，听听它的名字。还没有的伙伴，也可以选择去找它。',target:'.dex-cell',sequence:['dex','hand']},
 wish:{icon:'search',title:'你想和谁做朋友？',voice:'点开你喜欢的小精灵。有邀请果，就请它坐船来做客；还没有的话，先把它记下来。',target:'.dex-cell',sequence:['search','waves']},
 ownedDetail:{icon:'heart',title:'点爱心，去小岛陪它玩',voice:'这位已经是你的伙伴啦。点爱心，去小岛就能找到它。点它的名字，还能听听名字怎么说。',target:'.detail-wish .wish-button',sequence:['heart','island']},
 detail:{icon:'heart',title:'听名字，再去找它',voice:'点喇叭，听听伙伴的名字。还没有它的话，点下面的大按钮：有邀请果，它就坐船来；还没有，就先把它记下来。',target:'.detail-wish .wish-button',sequence:['speaker','waves']},
 friends:{icon:'search',title:'点头像，马上见面',voice:'点一点伙伴的头像，镜头就会带你找到它。',target:'.companion-portraits button',sequence:['search','hand']},
 stories:{icon:'book',title:'选本故事，一起读',voice:'点一本喜欢的故事，和大人一起看。我们可以听、可以聊，没有考试。',target:'.storybook',sequence:['book','ear']},
 story:{icon:'ear',title:'选耳朵听，选书本一起读',voice:'点耳朵，故事会自己慢慢翻页。点书本，就和大人一起读。想停下来，点暂停。遇到一起演一演，也可以直接点下一页。',target:'.story-mode',sequence:['ear','book']},
 diary:{icon:'mic',title:'今天的你，值得被听见',voice:'先听一个小问题，再点麦克风，说一点今天的事。说完再点一下。开心、难过都可以，不想说也可以跳过。',target:'.diary-record',sequence:['ear','mic','check']},
} as const;
export type GuideId=keyof typeof GUIDES;
export interface Onboarding {version:1;seen:Partial<Record<GuideId,boolean>>;completed?:Partial<Record<GuideId,boolean>>;automatic:boolean;}
/** Operation success is separate from seeing/dismissing help, and is not language mastery. */
export function completeGuide(s:{onboarding?:Onboarding},id:GuideId){
 s.onboarding??={version:1,seen:{},automatic:true};
 (s.onboarding.completed??={})[id]=true;
}
/** Guides whose screens no longer exist (energy, exchange, throwing in the grass); old saves drop them on load. */
const RETIRED_GUIDES=['energy','shop','noBall','throw','home','camera','farm','care','feed','play','gifts','picnic','area'];
export function migrateOnboarding(save:unknown){
 const o=(save as {onboarding?:{seen?:Record<string,boolean>;completed?:Record<string,boolean>}})?.onboarding;
 for(const flags of [o?.seen,o?.completed])if(flags&&typeof flags==='object')for(const k of RETIRED_GUIDES)delete flags[k];
}
export function validOnboarding(value:unknown):value is Onboarding {
 if(!value||typeof value!=='object')return false;
 const v=value as Onboarding;
 const flags=(x:unknown)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.entries(x).every(([k,b])=>Object.prototype.hasOwnProperty.call(GUIDES,k)&&typeof b==='boolean');
 return v.version===1&&typeof v.automatic==='boolean'&&flags(v.seen)&&(v.completed===undefined||flags(v.completed));
}

/** An old invitation must not interrupt an activity much later. Manual replay stays available. */
export function guideVoiceState(elapsed:number,quiet:number,allowed:boolean,busy:boolean):'wait'|'play'|'drop'{
 if(!allowed||elapsed>=8000)return 'drop';
 return !busy&&quiet>=900?'play':'wait';
}
