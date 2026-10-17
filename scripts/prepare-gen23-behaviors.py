"""Explicit locomotion for Gen II/III; child-friendly habitat activities, no battle behavior."""
import json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]; REPORT=ROOT/'models-src/_research/pogo-gen23-20261015'
rows=json.loads((REPORT/'pokemon.json').read_text());old={p['id'] for p in json.loads((REPORT/'before/src/data/pokemon.json').read_text())}
# Land-capable Water types keep land routines; only obligate aquatic residents use swim.
groups={
'fly':[163,164,165,166,169,176,177,178,187,188,189,193,198,207,227,249,250,267,269,276,277,278,279,284,291,313,314,329,330,333,334,357,373,384],
'float':[200,201,251,292,337,338,343,344,351,353,354,355,358,362,374,375,376,380,381,385,386],
'swim':[170,171,211,222,223,224,226,318,319,320,321,339,340,349,350,366,367,368,369,370,382],
'crawl':[167,168,204,213,265,266,268,283,290],
'hop':[172,173,174,175,183,184,194,298,285,286,325,326,360],
'dash':[161,162,190,203,215,228,229,243,244,245,261,262,263,264,288,309,310,335,359],
'waddle':[202,209,210,216,217,220,221,225,231,232,238,239,240,241,296,297,299,303,304,305,306,322,323,324,327,361,363,364,365],
}
loc={i:k for k,ids in groups.items() for i in ids}
def h(a,b,activity,zone,path='roam'):return dict(from_=a,to=b,activity=activity,zone=zone,path=path)
def habit(a,b,activity,zone,path='roam'):
 d=h(a,b,activity,zone,path);d['from']=d.pop('from_');return d
base=[habit(21,6.5,'sleep','beds','stay'),habit(6.5,8,'eat','campfire','stay'),habit(8,11.5,'play','meadow'),habit(11.5,12.5,'eat','campfire','stay'),habit(12.5,14,'nap','beds','stay'),habit(14,17,'play','meadow'),habit(17,18,'bath','shallows'),habit(18,19,'eat','campfire','stay'),habit(19,21,'play','meadow')]
traits={
152:('头上的叶子喜欢阳光。','loves the sunshine.'),153:('喜欢在阳光下闻花香。','enjoys the flowers.'),154:('脖子上的花朵香香的。','has lovely flowers.'),
155:('喜欢暖暖的地方。','likes warm places.'),156:('喜欢在暖暖的石头旁休息。','rests by warm rocks.'),157:('喜欢暖暖的阳光。','likes warm sunshine.'),
158:('喜欢在浅水里扑腾。','likes to splash.'),159:('喜欢在水边玩。','plays by the water.'),160:('用大尾巴帮助自己游泳。','swims with a big tail.'),
163:('晚上喜欢看看周围。','looks around at night.'),164:('晚上会轻轻飞。','flies at night.'),172:('脸颊会放出小电火花。','makes tiny sparks.'),
175:('喜欢和温柔的伙伴在一起。','likes kind friends.'),179:('软软的羊毛会蓄电。','has fluffy wool.'),180:('喜欢陪伙伴玩耍。','plays with friends.'),181:('尾巴会发光。','has a glowing tail.'),
183:('圆圆的尾巴像小浮球。','has a round tail.'),184:('喜欢在水边玩。','plays by the water.'),185:('喜欢待在干燥的地方。','likes dry places.'),
202:('喜欢安静地待着。','likes quiet places.'),208:('身体硬硬的，喜欢岩石。','has a strong body.'),213:('喜欢待在岩石旁。','rests by the rocks.'),
225:('喜欢给朋友分享礼物。','shares with friends.'),235:('会用尾巴画画。','paints with its tail.'),241:('喜欢在草地散步。','walks in the meadow.'),242:('喜欢照顾朋友。','cares for friends.'),
252:('喜欢在树间活动。','likes the trees.'),253:('喜欢在树林里活动。','plays near the trees.'),254:('喜欢阳光和树林。','loves the forest.'),
255:('身体暖暖的。','feels warm.'),256:('喜欢蹦蹦跳跳。','likes to jump.'),257:('喜欢伸展强壮的双腿。','stretches its strong legs.'),
258:('喜欢泥巴和浅水。','likes mud and water.'),259:('喜欢在岸边玩。','plays by the shore.'),260:('喜欢在水边散步。','walks by the water.'),
270:('喜欢在水面上晒太阳。','likes the sunny water.'),271:('喜欢住在水边。','lives near water.'),272:('听到音乐就想跳舞。','dances to music.'),
287:('喜欢慢慢休息。','likes to rest.'),288:('精力充沛，喜欢活动。','likes to keep moving.'),289:('喜欢躺下来休息。','likes a long rest.'),
293:('声音轻轻的。','has a quiet voice.'),294:('有一副大嗓门。','has a loud voice.'),295:('声音响亮，喜欢唱歌。','has a big voice.'),
300:('喜欢追着自己的尾巴玩。','plays with its tail.'),301:('喜欢舒服的休息地方。','likes a cozy place.'),
311:('喜欢为朋友加油。','cheers for friends.'),312:('喜欢和朋友一起加油。','cheers with friends.'),
313:('尾巴能发光。','has a glowing tail.'),314:('喜欢在花丛边飞。','flies by the flowers.'),
320:('喜欢在海里游泳。','swims in the sea.'),321:('身体很大，住在海里。','is very big.'),
327:('走路摇摇摆摆。','wobbles as it walks.'),333:('翅膀像软软的棉花。','has fluffy wings.'),334:('喜欢轻轻唱歌。','sings softly.'),
351:('会随着天气改变模样。','changes with the weather.'),352:('会变换身体的颜色。','can change colors.'),
357:('脖子上长着甜甜的果实。','grows sweet fruit.'),358:('声音像轻轻的风铃。','sounds like a bell.'),
363:('身体圆圆的，像一颗小球。','is round like a ball.'),370:('身体像一颗爱心。','looks like a heart.'),
385:('喜欢睡很长的觉。','likes a long sleep.'),386:('来自很远很远的天空。','comes from far away.')}
out={}
for p in rows:
 i=p['id']
 if i in old:continue
 l=loc.get(i,'walk');schedule=list(base);speed={'fly':1.4,'float':.7,'swim':.8,'crawl':.4,'hop':.8,'dash':1.3,'waddle':.6,'walk':.75}[l]
 if l=='swim':schedule=[habit(0,24,'swim','farsea' if i in [321,350,382] else 'sea','circle')];phrase=('喜欢在水里游来游去。','likes to swim.')
 elif l=='fly':schedule=[habit(8,18,'fly','sky','circle')]+base;phrase=('喜欢在空中飞翔。','likes to fly.')
 elif l=='float':schedule=[habit(9,17,'play','meadow','circle')]+base;phrase=('轻轻地飘来飘去。','floats gently.')
 elif l=='crawl':schedule=[habit(8,17,'play','bushes')]+base;phrase=('喜欢慢慢爬。','crawls slowly.')
 elif l=='dash':phrase=('喜欢在草地上跑。','runs in the meadow.')
 elif l=='hop':phrase=('喜欢蹦蹦跳跳地玩。','likes to hop.')
 else:phrase=('喜欢和伙伴一起玩。','plays with friends.')
 if 'grass' in p['types'] and l not in ('fly','float','swim'):
  schedule=[habit(9,11,'sunbathe','sunny','stay')]+schedule;phrase=('喜欢阳光和植物。','loves plants and sunshine.')
 if 'fire' in p['types']:
  schedule=[habit(17,21,'warm','campfire','stay')]+[s for s in schedule if s['activity']!='bath'];phrase=('喜欢暖暖的地方。','likes warm places.')
 if i in [163,164,167,168,198,200]:schedule=[habit(6,18,'sleep','palms','stay'),habit(18,6,'fly' if l=='fly' else 'play','sky' if l=='fly' else 'moonlit','circle')]
 if i in [171,181,313]:schedule=[habit(19,6,'glow','sea' if l=='swim' else 'moonlit','circle')]+schedule
 if i in [174,238,272,293,294,295,333,334,358]:schedule=[habit(14,17,'sing','meadow','stay')]+schedule
 if i==185:schedule=[habit(17,18,'explore','rocks')]+[s for s in schedule if s['activity']!='bath']
 if i in [287,289,385]:schedule=[habit(12,17,'nap','beds','stay')]+schedule
 zh,en=traits.get(i,phrase);b={'locomotion':l,'speed':speed,'trait':{'zh':p['nameZh']+zh,'en':p['nameEn']+' '+en},'schedule':schedule}
 if l in ['fly','float']:b['altitude']=1.6 if l=='fly' else .5
 out[str(i)]=b
(ROOT/'src/data/gen23Behaviors.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Behaviors',len(out))
