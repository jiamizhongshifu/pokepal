import type { Story, StoryPage } from './stories';
const page=(beat:string,en:string,zh:string,speaker:number,pose:StoryPage['pose'],prop:string,word:string,meaning:string):StoryPage=>({beat,en,zh,speaker,pose,prop,keyword:{en:word,zh:meaning}});
/** Short familiar situations for shared reading, with no compulsory answer or spoken response. */
export const LIFE_SHORT_STORIES:Story[]=[
 {id:'come-play',title:'小球旁边留个位置',titleEn:'Come and Play',theme:'邀请朋友',themeEn:'An invitation',group:'friends',scene:'playground',cast:[1001,1011],
 summary:'莓莓想加入游戏，又不知道怎么开口。啵啵把球停下来，听见了它的邀请。',
 parentTip:'邀请可以是一句话，也可以是招手。让孩子决定是否加入，不用说出英文才得到玩的机会。',practice:'把软球轻轻滚给家人，试试邀请 Let’s play。对方想休息时，先把球停下来。',
 phrase:{en:'May I join you?',zh:'我可以和你一起玩吗？'},question:{en:'Who would you like to play with?',zh:'你想邀请谁一起玩呢？'},
 activity:{station:'together-ball',label:'邀请伙伴玩球',icon:'ball'},pages:[
 page('想加入的小伙伴','Bubbo rolls a ball. Berry watches from the grass.','啵啵滚着小球。莓莓站在草边，看了一会儿。',1011,'wait','ball','ball','球'),
 page('轻轻问一问','May I join you? Berry asks. Bubbo stops the ball.','我可以和你一起玩吗？莓莓轻轻问。啵啵把小球停下来。',1011,'meet','ball','May I join you?','我可以一起玩吗？'),
 page('留一个位置','Yes! Let’s play! Bubbo makes room for Berry.','好呀！我们一起玩吧！啵啵挪一挪，给莓莓留出位置。',1001,'offer','ball','play','玩'),
 page('来回都是邀请','Your turn! The ball rolls to Berry, then back to Bubbo.','轮到你啦！小球滚到莓莓面前，又轻轻滚回啵啵身边。',1001,'together','ball','Your turn','轮到你')]
 },
 {id:'enough-for-me',title:'谢谢，我已经够啦',titleEn:'No, Thank You',theme:'温柔地拒绝',themeEn:'Saying no',group:'friends',scene:'orchard',cast:[1151,1011],
 summary:'萝萝分享点心，莓莓已经吃饱。说“不需要”之后，朋友还是愿意坐在它身边。',
 parentTip:'不想吃、想停止或不想被碰触时，都可以拒绝。不用拿“朋友会伤心”劝孩子答应。',practice:'点心时让孩子决定还要不要；玩玩具时也练习 No, thank you，并尊重这个回答。',
 phrase:{en:'No, thank you.',zh:'不用了，谢谢。'},question:{en:'What can you say when you have had enough?',zh:'已经吃饱或者不想继续时，你可以怎么说？'},
 activity:{station:'together-rest',label:'一起歇一歇',icon:'sun'},pages:[
 page('还要点心吗','Carro offers Berry a cookie. Would you like more?','萝萝拿来一块饼干：还想要一点吗？',1151,'offer','cookie','cookie','饼干'),
 page('听听自己的肚子','No, thank you. My tummy is full, says Berry.','不用了，谢谢。我已经吃饱啦。莓莓摸摸自己的肚子。',1011,'wait','cookie','No, thank you','不用了，谢谢'),
 page('朋友听见了','Okay! Carro puts the cookie back in the basket.','好呀！萝萝把饼干放回篮子，没有再劝莓莓吃。',1151,'repair','basket','basket','篮子'),
 page('留下来陪你','They sit under the tree. Saying no does not end their friendship.','他们仍然一起坐在树下。说了“不需要”，也还是好朋友。',1011,'together','heart','tree','树')]
 },
 {id:'a-little-help',title:'小水壶，一起提',titleEn:'A Little Help',theme:'开口求助',themeEn:'Asking for help',group:'trust',scene:'garden',cast:[1101,1151],
 summary:'水壶有点重，贝贝没有硬撑。它说出需要，和萝萝找到一个轻松的办法。',
 parentTip:'先问孩子需要哪种帮助，保留它能做的部分。求助不是失败，完成多少也不影响被爱。',practice:'一起照顾植物或收玩具。大人示范 Help, please，分担一点，不替孩子把所有事情都做完。',
 phrase:{en:'Help, please!',zh:'请帮帮我！'},question:{en:'What would you like help with?',zh:'你有什么事情想请人帮忙吗？'},
 activity:{station:'farm',label:'和伙伴照顾种子',icon:'flower'},pages:[
 page('水壶有点沉','Shelly lifts a watering can. Oh! It is too heavy.','贝贝提起水壶。哎呀，有点太重啦。',1101,'wait','water','water','水'),
 page('说出需要','Help, please! Can you carry it with me?','请帮帮我！你能和我一起提吗？',1101,'meet','water','Help, please','请帮帮我'),
 page('一起分担一点','Yes! Carro takes one side. Together, they carry the can.','好呀！萝萝帮忙托住一边。他们一起把水壶提过去。',1151,'repair','water','Together','一起'),
 page('慢慢照顾小花','A little water for the flower. Thank you for helping me!','给小花浇一点水。谢谢你帮我！小水滴落进泥土里。',1101,'together','flower','flower','花')]
 },
 {id:'sit-with-me',title:'树下的安静座位',titleEn:'Sit with Me',theme:'陪伴与空间',themeEn:'Quiet company',group:'feelings',scene:'meadow',cast:[1011,1001],
 summary:'莓莓不想跑了。啵啵先问它需要什么，再留出一个舒服的距离，安静陪它坐着。',
 parentTip:'陪伴不一定要聊天或拥抱。先问孩子想有人陪还是想独处，听见答案后真的调整距离。',practice:'一起安静坐一会儿，可以说 Stay with me, please。想独处时也可以说 I need some space。',
 phrase:{en:'Stay with me, please.',zh:'请留下来陪我。'},question:{en:'Would you like company or some space?',zh:'现在你想有人陪，还是想自己待一会儿？'},
 activity:{station:'together-rest',label:'陪伙伴坐一会儿',icon:'heart'},pages:[
 page('跑累了，停下来','I need a rest, says Berry. Bubbo stops beside the tree.','我想休息一下。莓莓停下来，啵啵也在树旁停住了。',1011,'wait','flower','rest','休息'),
 page('先问问你','Would you like me to stay? Bubbo asks softly.','你想让我留下陪你吗？啵啵轻轻地问。',1001,'meet','heart','stay','留下'),
 page('舒服的距离','Stay with me, please. Bubbo sits nearby, with room for Berry.','请留下来陪我。啵啵坐在旁边，给莓莓留出舒服的空间。',1011,'together','heart','Stay with me, please','请留下来陪我'),
 page('不说话也很好','The leaves move in the breeze. Two friends rest. No need to hurry.','风吹动树叶。两个朋友安静休息，不说话也很好，不用着急。',1001,'together','flower','friends','朋友')]
 }
];
