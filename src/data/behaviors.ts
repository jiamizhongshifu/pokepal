import kantoBehaviors from "./kantoBehaviors.json";
import gen23Behaviors from "./gen23Behaviors.json";
import type { Activity } from "../lib/routine";

/**
 * 每只宝可梦的行动方式、活动轨迹和生活习性（参考图鉴设定，简化给幼儿看）。
 *
 * locomotion 行动方式：
 *   walk 走 / waddle 摇摇摆摆 / dash 快跑之字形 / hop 一蹦一跳 / crawl 慢慢爬 / sidestep 横着走
 *   fly 飞 / float 悬浮 / swim 游 / slither 蛇形游动 / teleport 瞬间移动
 * trajectory 活动轨迹：
 *   roam 在区域里随意逛 / stay 待在固定位置 / patrol 沿路线巡逻 / circle 绕圈飞或游 / shoreline 沿海岸线来回
 */
export type Locomotion = "walk" | "waddle" | "dash" | "hop" | "crawl" | "sidestep" | "fly" | "float" | "swim" | "slither" | "teleport";
export type Trajectory = "roam" | "stay" | "patrol" | "circle" | "shoreline";
export type ZoneKey =
  | "meadow" | "sunny" | "campfire" | "beds" | "tent" | "shore" | "shallows" | "sea" | "farsea"
  | "rocks" | "highrock" | "palms" | "bushes" | "sky" | "moonlit";

export interface Habit {
  from: number;
  to: number;
  activity: Activity;
  zone: ZoneKey;
  /** 这一段时间的轨迹（不写就按区域默认） */
  path?: Trajectory;
}

export interface Behavior {
  locomotion: Locomotion;
  /** 地面移动速度（地块/秒） */
  speed: number;
  /** 在家园里的一句介绍（家长和孩子点击时会听到） */
  trait: { zh: string; en: string };
  schedule: Habit[];
  /** 飞行 / 悬浮高度 */
  altitude?: number;
}

const H = (from: number, to: number, activity: Activity, zone: ZoneKey, path?: Trajectory): Habit => ({ from, to, activity, zone, path });

/** 通用作息：晚上睡觉，三餐在篝火边，其余时间在草坪玩，傍晚去海边洗澡 */
export const DEFAULT_SCHEDULE: Habit[] = [
  H(21, 6.5, "sleep", "beds"),
  H(6.5, 8, "eat", "campfire"),
  H(8, 11.5, "play", "meadow"),
  H(11.5, 12.5, "eat", "campfire"),
  H(12.5, 14, "nap", "beds"),
  H(14, 17, "play", "meadow"),
  H(17, 18, "bath", "shallows"),
  H(18, 19, "eat", "campfire"),
  H(19, 21, "play", "meadow")
];

/** 在通用作息基础上替换某些时段 */
function withHabits(...over: Habit[]): Habit[] {
  return [...over, ...DEFAULT_SCHEDULE];
}

export const BEHAVIORS: Record<number, Behavior> = {
  ...(gen23Behaviors as Record<number, Behavior>),
  ...(kantoBehaviors as Record<number, Behavior>),
  999: { locomotion: "hop", speed: 0.35, trait: { zh: "索财灵住在宝箱里，喜欢收集亮晶晶的硬币。", en: "Gimmighoul collects shiny coins." },
    schedule: withHabits(H(8, 11.5, "collect", "shore", "shoreline"), H(14, 17, "collect", "rocks", "roam"), H(17, 18, "guard", "tent", "stay")) },
  1000: { locomotion: "walk", speed: 1, trait: { zh: "赛富豪的身体由硬币组成，喜欢和大家交朋友。", en: "Gholdengo loves to make friends." },
    schedule: withHabits(H(8, 11.5, "play", "meadow", "roam"), H(14, 17, "dance", "sunny", "circle"), H(17, 18, "collect", "shore", "shoreline")) },
  1: { locomotion: "walk", speed: 0.7, trait: { zh: "妙蛙种子背上的种子喜欢晒太阳。", en: "Bulbasaur loves the sun." },
    schedule: withHabits(H(10, 14, "sunbathe", "sunny", "stay")) },
  3: { locomotion: "walk", speed: 0.4, trait: { zh: "妙蛙花晒太阳时花会更香。", en: "Venusaur loves the sun." },
    schedule: withHabits(H(9, 16, "sunbathe", "sunny", "stay")) },
  4: { locomotion: "walk", speed: 0.9, trait: { zh: "小火龙怕水，最喜欢待在火堆旁。", en: "Charmander loves the fire." },
    schedule: withHabits(H(17, 18, "warm", "campfire", "stay"), H(19, 21, "warm", "campfire", "stay")) },
  6: { locomotion: "fly", speed: 2.2, altitude: 3.2, trait: { zh: "喷火龙会在天空中盘旋飞翔。", en: "Charizard flies high!" },
    schedule: [H(21, 7, "sleep", "rocks"), H(7, 8, "eat", "campfire"), H(8, 11.5, "fly", "sky", "circle"), H(11.5, 12.5, "eat", "campfire"), H(12.5, 14, "nap", "rocks"), H(14, 17.5, "fly", "sky", "circle"), H(17.5, 21, "warm", "campfire", "stay")] },
  7: { locomotion: "waddle", speed: 0.75, trait: { zh: "杰尼龟最喜欢游泳。", en: "Squirtle loves to swim." },
    schedule: withHabits(H(14, 17, "swim", "sea", "roam"), H(9, 11, "bath", "shallows")) },
  9: { locomotion: "waddle", speed: 0.45, trait: { zh: "水箭龟在海边守护大家。", en: "Blastoise watches the beach." },
    schedule: withHabits(H(8, 11.5, "guard", "shore", "shoreline"), H(14, 17, "swim", "sea", "roam")) },
  10: { locomotion: "crawl", speed: 0.22, trait: { zh: "绿毛虫爬得很慢，一直在吃叶子。", en: "Caterpie eats leaves. Munch, munch!" },
    schedule: [H(20, 7, "sleep", "bushes"), H(7, 20, "graze", "bushes", "roam")] },
  16: { locomotion: "fly", speed: 1.6, altitude: 2.4, trait: { zh: "波波是早起的鸟儿，清晨在天上转圈。", en: "Pidgey flies in the morning." },
    schedule: [H(20, 5.5, "sleep", "palms"), H(5.5, 9, "fly", "sky", "circle"), H(9, 12, "play", "meadow", "roam"), H(12, 13, "eat", "campfire"), H(13, 16, "fly", "sky", "circle"), H(16, 20, "nap", "palms")] },
  25: { locomotion: "dash", speed: 1.8, trait: { zh: "皮卡丘跑得飞快，到处撒欢。", en: "Pikachu runs fast!" },
    schedule: DEFAULT_SCHEDULE },
  26: { locomotion: "dash", speed: 1.5, trait: { zh: "雷丘的尾巴会发电。", en: "Raichu's tail goes zap!" },
    schedule: withHabits(H(19, 21, "glow", "meadow", "roam")) },
  35: { locomotion: "hop", speed: 0.7, trait: { zh: "皮皮在月光下跳舞。", en: "Clefairy dances under the moon." },
    schedule: [H(23, 9, "sleep", "beds"), H(9, 10, "eat", "campfire"), H(10, 17, "play", "meadow", "roam"), H(17, 19, "eat", "campfire"), H(19, 23, "dance", "moonlit", "circle")] },
  37: { locomotion: "walk", speed: 0.9, trait: { zh: "六尾喜欢暖暖的火光。", en: "Vulpix loves warm fire." },
    schedule: withHabits(H(18, 21, "warm", "campfire", "stay"), H(11.5, 14, "sunbathe", "sunny", "stay")) },
  39: { locomotion: "hop", speed: 0.6, trait: { zh: "胖丁会唱让大家睡着的歌。", en: "Jigglypuff sings a sleepy song." },
    schedule: withHabits(H(16, 18, "sing", "meadow", "stay"), H(19, 21, "sing", "campfire", "stay")) },
  43: { locomotion: "waddle", speed: 0.5, trait: { zh: "走路草白天把自己埋进沙子里，晚上才出来散步。", en: "Oddish hides in the sand." },
    schedule: [H(6, 18, "buried", "sunny", "stay"), H(18, 6, "explore", "meadow", "roam")] },
  52: { locomotion: "walk", speed: 1.0, trait: { zh: "喵喵最爱亮晶晶的东西。", en: "Meowth loves shiny things." },
    schedule: [H(2, 10, "sleep", "beds"), H(10, 11, "eat", "campfire"), H(11, 15, "collect", "shore", "shoreline"), H(15, 17, "nap", "beds"), H(17, 19, "eat", "campfire"), H(19, 2, "collect", "tent", "patrol")] },
  54: { locomotion: "waddle", speed: 0.5, trait: { zh: "可达鸭总是抱着头，慢吞吞地在海边走。", en: "Psyduck holds its head. Oh no!" },
    schedule: withHabits(H(8, 11.5, "explore", "shore", "shoreline"), H(14, 17, "swim", "shallows", "roam")) },
  58: { locomotion: "dash", speed: 1.4, trait: { zh: "卡蒂狗很勇敢，晚上守护帐篷。", en: "Growlithe watches the tent." },
    schedule: [H(23, 7, "sleep", "tent"), H(7, 8, "eat", "campfire"), H(8, 12, "play", "meadow", "roam"), H(12, 13, "eat", "campfire"), H(13, 15, "nap", "tent"), H(15, 18, "play", "meadow", "roam"), H(18, 19, "eat", "campfire"), H(19, 23, "guard", "tent", "patrol")] },
  60: { locomotion: "hop", speed: 0.6, trait: { zh: "蚊香蝌蚪在浅水里蹦蹦跳跳。", en: "Poliwag hops in the water." },
    schedule: withHabits(H(8, 17, "splash", "shallows", "roam")) },
  63: { locomotion: "teleport", speed: 0, trait: { zh: "凯西一天要睡十八个小时，醒着时会瞬间移动。", en: "Abra sleeps and sleeps." },
    schedule: [H(9, 12, "teleport", "meadow", "roam"), H(15, 18, "teleport", "meadow", "roam"), H(18, 9, "sleep", "beds"), H(12, 15, "sleep", "beds")] },
  79: { locomotion: "crawl", speed: 0.18, trait: { zh: "呆呆兽把尾巴伸进海里钓鱼，一钓就是一整天。", en: "Slowpoke fishes with its tail." },
    schedule: [H(20, 8, "sleep", "beds"), H(8, 20, "fish", "shore", "stay")] },
  98: { locomotion: "sidestep", speed: 0.9, trait: { zh: "大钳蟹横着走路，在沙滩上找吃的。", en: "Krabby walks sideways. Click, click!" },
    schedule: [H(20, 6, "sleep", "rocks"), H(6, 20, "explore", "shore", "shoreline")] },
  104: { locomotion: "walk", speed: 0.6, trait: { zh: "卡拉卡拉喜欢一个人安静地待着。", en: "Cubone likes quiet time." },
    schedule: [H(21, 7, "sleep", "rocks"), H(7, 8, "eat", "campfire"), H(8, 18, "lonely", "rocks", "stay"), H(18, 19, "eat", "campfire"), H(19, 21, "lonely", "shore", "stay")] },
  116: { locomotion: "swim", speed: 0.7, trait: { zh: "墨海马在海里游来游去。", en: "Horsea swims in the sea." },
    schedule: [H(0, 24, "swim", "sea", "roam")] },
  120: { locomotion: "swim", speed: 0.6, trait: { zh: "海星星晚上身体中间会发光。", en: "Staryu glows at night." },
    schedule: [H(19, 6, "glow", "shallows", "stay"), H(6, 19, "swim", "sea", "roam")] },
  129: { locomotion: "swim", speed: 0.8, trait: { zh: "鲤鱼王最喜欢在水里扑腾跳跃。", en: "Magikarp loves to splash." },
    schedule: [H(0, 24, "splash", "sea", "roam")] },
  131: { locomotion: "swim", speed: 0.5, trait: { zh: "拉普拉斯在远处的海上唱歌。", en: "Lapras sings on the sea." },
    schedule: [H(18, 22, "sing", "farsea", "circle"), H(22, 18, "swim", "farsea", "circle")] },
  133: { locomotion: "dash", speed: 1.3, trait: { zh: "伊布好奇心很强，到处探险。", en: "Eevee likes to look around." },
    schedule: withHabits(H(8, 11.5, "explore", "meadow", "roam"), H(14, 17, "explore", "tent", "patrol")) },
  143: { locomotion: "waddle", speed: 0.28, trait: { zh: "卡比兽一天到晚都在吃和睡。", en: "Snorlax eats and sleeps all day." },
    schedule: [H(19, 11, "sleep", "sunny"), H(11, 13, "eat", "campfire"), H(13, 17, "nap", "sunny"), H(17, 19, "eat", "campfire")] },
  147: { locomotion: "slither", speed: 0.7, trait: { zh: "迷你龙住在水里，身体会慢慢长大。", en: "Dratini swims in the water." },
    schedule: [H(0, 24, "swim", "shallows", "roam")] },
  150: { locomotion: "float", speed: 0.6, altitude: 0.5, trait: { zh: "超梦喜欢独自坐在大石头上。", en: "Mewtwo sits on the big rock." },
    schedule: [H(0, 24, "meditate", "highrock", "stay")] },
  151: { locomotion: "float", speed: 1.8, altitude: 1.6, trait: { zh: "梦幻很调皮，在天上飞来飞去。", en: "Mew flies and plays." },
    schedule: [H(22, 6, "sleep", "palms"), H(6, 22, "play", "sky", "roam")] },

  // ---------- 进化后的形态（满友好度进化得到） ----------
  2: { locomotion: "walk", speed: 0.6, trait: { zh: "妙蛙草背上的花苞晒太阳就会长大。", en: "Ivysaur loves the sun." },
    schedule: withHabits(H(10, 15, "sunbathe", "sunny", "stay")) },
  5: { locomotion: "dash", speed: 1.1, trait: { zh: "火恐龙最喜欢烤火。", en: "Charmeleon loves the fire." },
    schedule: withHabits(H(17, 21, "warm", "campfire", "stay")) },
  8: { locomotion: "waddle", speed: 0.7, trait: { zh: "卡咪龟最喜欢游泳。", en: "Wartortle loves to swim." },
    schedule: withHabits(H(9, 11.5, "swim", "sea", "roam"), H(14, 17, "swim", "sea", "roam")) },
  11: { locomotion: "crawl", speed: 0.05, trait: { zh: "铁甲蛹一动不动地休息，准备变成蝴蝶。", en: "Metapod sits very still." },
    schedule: [H(20, 7, "sleep", "palms"), H(7, 20, "sunbathe", "palms", "stay")] },
  12: { locomotion: "fly", speed: 1.3, altitude: 2.2, trait: { zh: "巴大蝶在花丛上飞来飞去。", en: "Butterfree flies over the flowers." },
    schedule: [H(20, 6.5, "sleep", "palms"), H(6.5, 8, "eat", "bushes"), H(8, 18, "fly", "sky", "circle"), H(18, 20, "eat", "bushes")] },
  17: { locomotion: "fly", speed: 2.0, altitude: 2.8, trait: { zh: "比比鸟飞得很快。", en: "Pidgeotto flies fast!" },
    schedule: [H(20, 6, "sleep", "palms"), H(6, 11, "fly", "sky", "circle"), H(11, 12, "eat", "campfire"), H(12, 18, "fly", "sky", "circle"), H(18, 20, "eat", "campfire")] },
  18: { locomotion: "fly", speed: 2.4, altitude: 3.4, trait: { zh: "大比鸟飞得又高又快。", en: "Pidgeot flies very high!" },
    schedule: [H(20, 6, "sleep", "rocks"), H(6, 11, "fly", "sky", "circle"), H(11, 12, "eat", "campfire"), H(12, 18, "fly", "sky", "circle"), H(18, 20, "eat", "campfire")] },
  36: { locomotion: "hop", speed: 0.6, trait: { zh: "皮可西在月光下跳舞。", en: "Clefable dances under the moon." },
    schedule: withHabits(H(19, 21, "dance", "moonlit", "circle")) },
  38: { locomotion: "walk", speed: 0.8, trait: { zh: "九尾喜欢暖暖的火光。", en: "Ninetales loves warm fire." },
    schedule: withHabits(H(18, 21, "warm", "campfire", "stay")) },
  40: { locomotion: "hop", speed: 0.5, trait: { zh: "胖可丁会唱开心的歌。", en: "Wigglytuff sings a happy song." },
    schedule: withHabits(H(14, 17, "sing", "meadow", "stay")) },
  44: { locomotion: "waddle", speed: 0.4, trait: { zh: "臭臭花身上有点臭臭的味道。", en: "Gloom smells funny. Phew!" },
    schedule: withHabits(H(8, 11.5, "explore", "meadow", "roam")) },
  45: { locomotion: "waddle", speed: 0.35, trait: { zh: "霸王花头上开着一朵大花。", en: "Vileplume has a big flower." },
    schedule: withHabits(H(9, 15, "sunbathe", "sunny", "stay")) },
  182: { locomotion: "hop", speed: 0.6, trait: { zh: "美丽花最爱跳舞。", en: "Bellossom loves to dance." },
    schedule: withHabits(H(14, 17, "dance", "sunny", "stay")) },
  53: { locomotion: "walk", speed: 0.9, trait: { zh: "猫老大也喜欢亮晶晶的东西。", en: "Persian likes shiny things." },
    schedule: withHabits(H(8, 11.5, "collect", "shore", "roam")) },
  55: { locomotion: "waddle", speed: 0.6, trait: { zh: "哥达鸭游泳游得很快。", en: "Golduck swims fast." },
    schedule: withHabits(H(9, 11.5, "swim", "sea", "roam"), H(14, 17, "swim", "sea", "roam")) },
  59: { locomotion: "dash", speed: 2.0, trait: { zh: "风速狗跑得飞快，还会守护帐篷。", en: "Arcanine runs very fast!" },
    schedule: withHabits(H(19, 21, "guard", "tent", "patrol"), H(8, 11.5, "explore", "meadow", "roam")) },
  61: { locomotion: "hop", speed: 0.6, trait: { zh: "蚊香君在浅水里蹦蹦跳跳。", en: "Poliwhirl hops in the water." },
    schedule: withHabits(H(9, 11.5, "bath", "shallows")) },
  62: { locomotion: "walk", speed: 0.6, trait: { zh: "蚊香泳士力气很大，游泳也很棒。", en: "Poliwrath is very strong." },
    schedule: withHabits(H(14, 17, "swim", "sea", "roam")) },
  186: { locomotion: "hop", speed: 0.7, trait: { zh: "蚊香蛙皇边唱歌边跳。", en: "Politoed sings and hops." },
    schedule: withHabits(H(17, 19, "sing", "shore", "stay")) },
  64: { locomotion: "teleport", speed: 0, trait: { zh: "勇基拉会嗖地一下不见。", en: "Kadabra goes poof!" },
    schedule: [H(9, 12, "teleport", "meadow", "roam"), H(15, 18, "teleport", "meadow", "roam"), H(21, 9, "sleep", "beds"), H(12, 15, "meditate", "sunny", "stay"), H(18, 21, "meditate", "sunny", "stay")] },
  65: { locomotion: "float", speed: 0.5, altitude: 0.4, trait: { zh: "胡地非常聪明。", en: "Alakazam is very smart." },
    schedule: [H(22, 7, "sleep", "beds"), H(7, 22, "meditate", "sunny", "stay")] },
  80: { locomotion: "crawl", speed: 0.2, trait: { zh: "呆壳兽用尾巴钓鱼，尾巴上还咬着一只大贝壳。", en: "Slowbro fishes with its tail." },
    schedule: [H(20, 8, "sleep", "beds"), H(8, 20, "fish", "shore", "stay")] },
  199: { locomotion: "walk", speed: 0.3, trait: { zh: "呆呆王总是在想事情。", en: "Slowking thinks a lot." },
    schedule: [H(21, 8, "sleep", "beds"), H(8, 21, "meditate", "sunny", "stay")] },
  99: { locomotion: "sidestep", speed: 0.8, trait: { zh: "巨钳蟹有一只大大的钳子。", en: "Kingler has a big claw!" },
    schedule: [H(20, 6, "sleep", "rocks"), H(6, 20, "explore", "shore", "shoreline")] },
  105: { locomotion: "walk", speed: 0.6, trait: { zh: "嘎啦嘎啦手里拿着一根骨头。", en: "Marowak holds a bone." },
    schedule: [H(21, 7, "sleep", "rocks"), H(7, 8, "eat", "campfire"), H(8, 18, "guard", "rocks", "stay"), H(18, 21, "warm", "campfire", "stay")] },
  117: { locomotion: "swim", speed: 0.8, trait: { zh: "海刺龙在海里游来游去。", en: "Seadra swims in the sea." },
    schedule: [H(0, 24, "swim", "sea", "roam")] },
  230: { locomotion: "swim", speed: 0.8, trait: { zh: "刺龙王住在很深很深的海里。", en: "Kingdra lives deep in the sea." },
    schedule: [H(0, 24, "swim", "farsea", "circle")] },
  121: { locomotion: "swim", speed: 0.8, trait: { zh: "宝石海星晚上中间的宝石会发光。", en: "Starmie glows at night." },
    schedule: [H(19, 6, "glow", "shallows", "stay"), H(6, 19, "swim", "sea", "roam")] },
  130: { locomotion: "swim", speed: 1.0, trait: { zh: "暴鲤龙又大又威风。", en: "Gyarados is big and strong!" },
    schedule: [H(0, 24, "swim", "farsea", "circle")] },
  134: { locomotion: "swim", speed: 0.8, trait: { zh: "水伊布最爱水。", en: "Vaporeon loves the water." },
    schedule: [H(0, 24, "swim", "shallows", "roam")] },
  135: { locomotion: "dash", speed: 1.8, trait: { zh: "雷伊布跑得飞快，身上噼里啪啦。", en: "Jolteon runs fast! Zap!" },
    schedule: withHabits(H(8, 11.5, "play", "meadow", "roam")) },
  136: { locomotion: "walk", speed: 0.9, trait: { zh: "火伊布暖乎乎、毛茸茸的。", en: "Flareon is warm and fluffy." },
    schedule: withHabits(H(17, 21, "warm", "campfire", "stay")) },
  196: { locomotion: "walk", speed: 0.9, trait: { zh: "太阳伊布最喜欢晒太阳。", en: "Espeon loves the sun." },
    schedule: withHabits(H(9, 15, "sunbathe", "sunny", "stay")) },
  197: { locomotion: "walk", speed: 0.8, trait: { zh: "月亮伊布晚上身上的圆环会发光。", en: "Umbreon glows at night." },
    schedule: [H(6, 18, "sleep", "beds"), H(18, 6, "glow", "moonlit", "circle")] },
  148: { locomotion: "slither", speed: 0.7, trait: { zh: "哈克龙在海里优雅地游。", en: "Dragonair swims in the sea." },
    schedule: [H(0, 24, "swim", "sea", "roam")] },
  149: { locomotion: "fly", speed: 1.8, altitude: 3.0, trait: { zh: "快龙会飞，还特别温柔。", en: "Dragonite flies and gives hugs!" },
    schedule: [H(21, 7, "sleep", "rocks"), H(7, 8, "eat", "campfire"), H(8, 17, "fly", "sky", "circle"), H(17, 21, "eat", "campfire")] }
};

/** 只能在水里生活的宝可梦 */
export const isAquatic = (id: number) => ["swim", "slither"].includes(BEHAVIORS[id]?.locomotion ?? "");
