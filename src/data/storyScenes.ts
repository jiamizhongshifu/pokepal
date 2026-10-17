export type SceneMotion = 'arrive'|'roll'|'offer'|'nod'|'breathe'|'water'|'settle'|'none';
export type SceneItem = {kind:string;x:number;y:number;size:number;rotate?:number;fromX?:number;motion?:SceneMotion};
export type SceneActor = {x:number;y:number;size:number;lean?:number;fromX?:number;motion?:SceneMotion};
export type StoryScene = {description:string;actors:[SceneActor,SceneActor];items:SceneItem[];mood?:'quiet'|'warm'|'worried';wave?:boolean;castle?:'fallen'|'building'|'wide';pot?:'fallen'|'upright'};
const actor=(x:number,size=32,y=17,lean=0,motion:SceneMotion='none',fromX?:number):SceneActor=>({x,size,y,lean,motion,fromX});
const item=(kind:string,x:number,y=17,size=14,motion:SceneMotion='none',fromX?:number,rotate=0):SceneItem=>({kind,x,y,size,motion,fromX,rotate});
const shot=(description:string,actors:[SceneActor,SceneActor],items:SceneItem[],extra:Partial<StoryScene>={}):StoryScene=>({description,actors,items,...extra});

/** Deliberate compositions for every page. Generated scenery with existing character art; each motion ends at this page's stable state. */
export const STORY_SCENES:Record<string,StoryScene[]>={
 'come-play':[
  shot('皮卡丘滚着球，伊布在草边看着，还没有加入。',[actor(27,34),actor(81,26,23)], [item('ball',43,13,15,'roll',29)]),
  shot('伊布走近问一问，皮卡丘停住球听它说话。',[actor(26,33),actor(71,33,17,0,'arrive',81)], [item('ball',37,13,15)],{mood:'quiet'}),
  shot('皮卡丘退开一点，让出宽敞的玩球空间，伊布走进来。',[actor(24,33,17,0,'arrive',31),actor(74,33,17,0,'nod')], [item('ball',40,13,15)],{mood:'warm'}),
  shot('小球轻轻滚向伊布，两位伙伴面对着彼此。',[actor(25,33),actor(76,33)], [item('ball',64,13,15,'roll',37)],{mood:'warm'})
 ],
 'enough-for-me':[
  shot('妙蛙种子拿来一块饼干，先问伊布还要不要。',[actor(26,33,17,0,'nod'),actor(76,33)], [item('cookie',43,24,13),item('basket',23,10,16)]),
  shot('伊布停在原处回答不用了，饼干还留在妙蛙种子一边。',[actor(26,33),actor(75,34,17,0,'nod')], [item('cookie',42,24,13),item('basket',23,10,16)],{mood:'quiet'}),
  shot('妙蛙种子把饼干放回篮子，听从伊布的选择。',[actor(26,33,17,0,'nod'),actor(75,33)], [item('basket',43,10,22),item('cookie',43,14,10,'offer',54)]),
  shot('点心收在一旁，两个朋友仍然坐在树荫下陪着彼此。',[actor(32,33,15),actor(70,33,15)], [item('basket',16,12,15),item('heart',51,64,9,'settle')],{mood:'warm'})
 ],
 'a-little-help':[
  shot('杰尼龟想提起水壶，水壶还留在地面，妙蛙种子看见了。',[actor(30,35,17,-3),actor(78,28,21)], [item('watering-can',46,12,22),item('flower',83,12,12)],{mood:'quiet'}),
  shot('杰尼龟停下来请求帮助，妙蛙种子走近听它说。',[actor(28,34,17,0,'nod'),actor(74,33,17,0,'arrive',82)], [item('watering-can',48,12,22)]),
  shot('两个伙伴分担水壶两边，一起带着水壶靠近小花。',[actor(31,32,19,0,'arrive',23),actor(70,32,19,0,'arrive',62)], [item('watering-can',51,20,21,'offer',43),item('flower',86,13,14)]),
  shot('伙伴们给小花慢慢浇水，杰尼龟感谢朋友的帮助。',[actor(25,33),actor(76,32,17,0,'nod')], [item('watering-can-small',44,36,18,'none',undefined,12),item('water',53,27,9,'water'),item('flower',54,13,19)],{mood:'warm'})
 ],
 'sit-with-me':[
  shot('伊布在树边停下，皮卡丘也停住，没有催它继续跑。',[actor(30,34,16,-2,'settle'),actor(79,29,20)], [item('flower',51,12,12)],{mood:'quiet'}),
  shot('皮卡丘站在舒服的距离，轻轻问伊布想不想有人陪。',[actor(30,34,16),actor(73,32,17,0,'nod')], [item('flower',51,12,12)],{mood:'quiet'}),
  shot('得到邀请后皮卡丘坐到附近，没有挤到伊布身上。',[actor(30,33,15),actor(69,32,15,0,'arrive',78)], [item('flower',50,11,12)],{mood:'warm'}),
  shot('树下留着宽敞的空间，两位朋友安静休息，不急着再出发。',[actor(31,33,15),actor(70,32,15)], [item('flower',51,12,14)],{mood:'quiet'})
 ],
 'magic-words':[
  shot('伊布靠近皮卡丘，望着皮卡丘身旁的两颗红苹果。',[actor(27,34,17,0,'arrive',18),actor(73)], [item('basket-apples',60,12,22)]),
  shot('伊布在两颗苹果前停住，皮卡丘守在旁边。',[actor(32,35,17,-3,'settle'),actor(76)], [item('basket-apples',61,12,22)],{mood:'quiet'}),
  shot('伊布面向皮卡丘轻轻点头，先开口询问。',[actor(29,36,17,-2,'nod'),actor(74,33)], [item('basket-apples',61,12,22)]),
  shot('皮卡丘示意先洗苹果，两颗苹果放在水盆上方。',[actor(24),actor(76,34,17,0,'nod')], [item('bowl',51,10,28),item('apple',44,20,11),item('apple',57,20,11),item('water',51,37,9,'water')]),
  shot('伊布靠近水盆帮忙，皮卡丘把两颗苹果洗干净。',[actor(25,34,17,2,'arrive',18),actor(76)], [item('bowl',51,10,28),item('apple',44,20,11),item('apple',57,20,11),item('water',51,38,9,'water'),item('basket',23,12,15)]),
  shot('一颗苹果从皮卡丘一侧递到伊布面前，另一颗留给皮卡丘。',[actor(25,35,17,0,'nod'),actor(77)], [item('apple',40,27,14,'offer',63),item('apple',71,13,12)],{mood:'warm'}),
  shot('两个伙伴各有一颗苹果，皮卡丘轻轻点头回应感谢。',[actor(29,34),actor(72,34,17,0,'nod')], [item('apple',33,14,12),item('apple',68,14,12)],{mood:'warm'}),
  shot('两个朋友靠近树荫，各自享用一颗苹果。',[actor(33,33,15),actor(68,33,15)], [item('apple',36,13,12),item('apple',65,13,12)],{mood:'warm'})
 ],
 'taking-turns':[
  shot('妙蛙种子把小球从小坡滚到前方，皮卡丘在远处看见。',[actor(22,27,22),actor(72,35,19)], [item('ball',56,14,15,'roll',74)]),
  shot('皮卡丘跑近小球，妙蛙种子仍在球的旁边。',[actor(30,35,17,0,'arrive',18),actor(75)], [item('ball',61,14,15)]),
  shot('皮卡丘停下来询问，球仍留在妙蛙种子面前。',[actor(27,35,17,-2,'nod'),actor(75,34)], [item('ball',66,23,15)]),
  shot('妙蛙种子再滚一次小球，皮卡丘留出空间等待。',[actor(25,32),actor(77,35)], [item('ball',57,13,15,'roll',73)]),
  shot('皮卡丘在一旁等候并给伙伴加油，小球还在妙蛙种子一侧。',[actor(28,36,17,0,'nod'),actor(76,31)], [item('ball',65,14,15)],{mood:'quiet'}),
  shot('妙蛙种子把小球滚到皮卡丘面前，兑现轮流玩的约定。',[actor(26,34),actor(76,34,17,0,'nod')], [item('ball',37,13,15,'roll',66)]),
  shot('皮卡丘把小球滚回来，邀请妙蛙种子一起玩。',[actor(25,34),actor(76,34)], [item('ball',59,13,15,'roll',35)]),
  shot('两个伙伴面对着彼此，小球从中间轻轻滚向下一位。',[actor(25,34),actor(76,34)], [item('ball',62,13,15,'roll',38)],{mood:'warm'})
 ],
 'little-storm':[
  shot('海浪退去，小火龙面前的沙堡塔倒下了，杰尼龟在旁边。',[actor(27,35,17,-3),actor(79,28,20)], [item('castle',51,12,22)],{wave:true,castle:'fallen',mood:'worried'}),
  shot('小火龙靠近倒下的沙堡，身体微微绷紧，杰尼龟留在一旁。',[actor(32,40,17,-3,'settle'),actor(81,25,20)], [item('castle',56,11,21)],{castle:'fallen',mood:'worried'}),
  shot('小火龙停下来，没有扬起沙子；倒下的沙堡还在地上。',[actor(30,37,17,-2,'settle'),actor(78,28,20)], [item('castle',53,12,22)],{castle:'fallen',mood:'quiet'}),
  shot('杰尼龟走近小火龙，在旁边安静陪伴，留出舒服的距离。',[actor(32,35,16,-2),actor(68,33,16,0,'arrive',80)], [item('castle',52,8,16)],{castle:'fallen',mood:'quiet'}),
  shot('小火龙对着花慢慢呼吸，身旁的杰尼龟安静等候。',[actor(33,36,17,0,'breathe'),actor(75,29,19)], [item('flower',48,29,13)],{castle:'fallen',mood:'quiet'}),
  shot('两个伙伴继续并排休息，不急着让小火龙马上开心。',[actor(33,33,15),actor(69,32,15)], [item('castle',52,8,16)],{castle:'fallen',mood:'quiet'}),
  shot('伙伴们退到离海浪更远的干沙地，一起重搭沙堡。',[actor(25,33,23,0,'arrive',18),actor(75,32,23)], [item('castle',50,20,23)],{castle:'building'}),
  shot('矮矮宽宽的新沙堡搭好了，两个伙伴站在旁边，海浪留在远处。',[actor(25,32,23),actor(76,32,23,0,'nod')], [item('castle',51,18,29)],{castle:'wide',mood:'warm'})
 ],
 'try-again':[
  shot('伊布和杰尼龟朝远处的小旗出发。',[actor(25,32,17,0,'arrive',16),actor(62,30,20,0,'arrive',52)], [item('flag',84,24,13)]),
  shot('杰尼龟先到小旗旁，伊布落在后面，停下脚步。',[actor(28,35,15,-5,'settle'),actor(77,28,23)], [item('flag',88,23,12)],{mood:'quiet'}),
  shot('伊布微微低下头，杰尼龟回头等待，没有催促。',[actor(33,39,15,-5),actor(78,27,23)], [item('flag',88,23,12)],{mood:'worried'}),
  shot('杰尼龟走近询问，先给伊布留出选择的空间。',[actor(31,35,16,-3),actor(69,32,17,0,'arrive',79)], [item('flag',90,23,10)],{mood:'quiet'}),
  shot('伊布愿意接受拥抱，两个伙伴靠近，温柔地陪伴彼此。',[actor(40,34,16,2,'arrive',31),actor(63,32,16,-2,'arrive',71)], [item('heart',51,66,10,'settle')],{mood:'warm'}),
  shot('伙伴们在草地上休息，伊布慢慢放松下来。',[actor(35,33,15),actor(70,31,15)], [item('flower',53,12,11)],{mood:'quiet'}),
  shot('伊布和杰尼龟并排往前走，这次不用比赛。',[actor(34,32,18,0,'arrive',26),actor(69,31,18,0,'arrive',61)], [item('flag',89,23,10)]),
  shot('两个伙伴停在一朵小花旁，一起看见路上的小惊喜。',[actor(27,33,18,-2,'nod'),actor(75,32,18,2)], [item('flower',51,17,18)],{mood:'warm'})
 ],
 'tell-truth':[
  shot('花盆被碰倒了，泥土撒在小路上，妙蛙种子停住脚步。',[actor(31,35,17,-3,'settle'),actor(81,27,23)], [item('pot',54,14,19)],{pot:'fallen',mood:'worried'}),
  shot('妙蛙种子有些担心，皮卡丘在小路另一侧，花盆仍倒着。',[actor(31,38,17,-4),actor(82,27,22)], [item('pot',55,13,19)],{pot:'fallen',mood:'worried'}),
  shot('妙蛙种子留在倒下的小花旁，没有离开。',[actor(34,36,17,-3,'settle'),actor(80,28,21)], [item('pot',54,14,20)],{pot:'fallen',mood:'quiet'}),
  shot('妙蛙种子面向皮卡丘，承认自己碰倒了花盆。',[actor(29,34,17,0,'nod'),actor(76,33,17)], [item('pot',53,13,19)],{pot:'fallen'}),
  shot('皮卡丘走近听朋友说完，两个伙伴都看见倒下的小花。',[actor(28,34),actor(73,34,17,-2,'arrive',81)], [item('pot',52,13,20)],{pot:'fallen',mood:'quiet'}),
  shot('花盆被轻轻扶正，小花重新站起来，散落的泥土还要收好。',[actor(25,34),actor(77,33)], [item('pot',51,15,22,'settle'),item('soil',62,12,12)],{pot:'upright'}),
  shot('妙蛙种子扶稳花盆，皮卡丘在旁边添土、轻轻拍平。',[actor(29,34,17,2,'nod'),actor(74,34,17,-2,'nod')], [item('pot',51,16,22),item('soil',62,12,9)],{pot:'upright'}),
  shot('花盆移到路边，两个伙伴之间的小路重新变得宽敞。',[actor(30,32),actor(64,32,17,0,'nod')], [item('pot',85,20,18,'offer',53)],{pot:'upright',mood:'warm'})
 ],
 'keep-promise':[
  shot('杰尼龟与妙蛙种子在小花旁约好吃完点心后浇花。',[actor(27,34,17,0,'nod'),actor(75,33)], [item('flower',51,13,16),item('cookie',49,29,10)]),
  shot('杰尼龟有些累了，停在水旁休息，妙蛙种子仍在花边。',[actor(30,38,15,-5,'settle'),actor(79,28,21)], [item('watering-can',45,11,20),item('flower',70,12,12)],{mood:'quiet'}),
  shot('妙蛙种子在花旁等待，杰尼龟还没有开始浇水。',[actor(25,30,16,-3),actor(74,36,18)], [item('flower',61,14,15),item('watering-can',41,10,18)],{mood:'quiet'}),
  shot('杰尼龟靠近朋友，说出自己累了，商量新的办法。',[actor(31,35,17,-2,'arrive',22),actor(74,34)], [item('flower',54,12,14),item('watering-can',44,11,15)]),
  shot('伙伴们先一起休息，旁边准备了一个更小的水壶。',[actor(32,33,15),actor(71,33,15)], [item('watering-can-small',49,13,13),item('flower',84,14,13)],{mood:'quiet'}),
  shot('休息后，杰尼龟准备好，妙蛙种子把小水壶带来。',[actor(27,34,18,0,'nod'),actor(74,34,18,0,'arrive',83)], [item('watering-can-small',60,20,13,'offer',76),item('flower',48,12,15)]),
  shot('两个伙伴分工，把少量的水慢慢浇到花旁。',[actor(26,34,18,1),actor(75,33,18,-1)], [item('watering-can-small',43,35,18,'none',undefined,12),item('water',53,26,9,'water'),item('flower',54,12,17)]),
  shot('小花得到照顾，两个伙伴一起看着花上的亮晶晶水珠。',[actor(28,33,18,0,'nod'),actor(75,33,18)], [item('flower',51,15,21),item('water',59,32,7),item('sparkle',42,32,8,'settle')],{mood:'warm'})
 ]
};
export const STORY_COVER_PAGE:Record<string,number>={'come-play':3,'enough-for-me':3,'a-little-help':3,'sit-with-me':3,'magic-words':5,'taking-turns':7,'little-storm':7,'try-again':7,'tell-truth':7,'keep-promise':6};
