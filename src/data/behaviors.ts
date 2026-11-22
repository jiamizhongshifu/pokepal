import { CREATURES } from "./creatures";
import type { Activity } from "../lib/routine";

/**
 * Each companion's daily rhythm (what it is doing, for narration) and one line a child hears when tapping it.
 * Where it is on the island comes from its home and setting in `island/world.ts`.
 */
export interface Habit { from: number; to: number; activity: Activity }
export interface Behavior { trait: { zh: string; en: string }; schedule: Habit[] }

const H = (from: number, to: number, activity: Activity): Habit => ({ from, to, activity });

/** 通用作息：晚上睡觉、按时吃饭，白天玩耍，傍晚洗澡 */
export const DEFAULT_SCHEDULE: Habit[] = [
  H(21, 6.5, "sleep"),
  H(6.5, 8, "eat"),
  H(8, 11.5, "play"),
  H(11.5, 12.5, "eat"),
  H(12.5, 14, "nap"),
  H(14, 17, "play"),
  H(17, 18, "bath"),
  H(18, 19, "eat"),
  H(19, 21, "play")
];

/** 在通用作息基础上替换某些时段 */
function withHabits(...over: Habit[]): Habit[] {
  return [...over, ...DEFAULT_SCHEDULE];
}

/** Per species: how it moves, one short line a child hears when tapping it, and how its day differs from the default. */
const SPECIES_BEHAVIOR: Record<string, Behavior> = {
  bubbo: { trait: { zh: "啵啵最喜欢在水边吹泡泡。", en: "Bubbo loves blowing bubbles." }, schedule: withHabits(H(15, 17, "bath")) },
  berry: { trait: { zh: "莓莓最爱和朋友分享莓果。", en: "Berry loves sharing berries." }, schedule: DEFAULT_SCHEDULE },
  puffy: { trait: { zh: "绵绵软软的，像一朵小云。", en: "Puffy is soft like a cloud." }, schedule: DEFAULT_SCHEDULE },
  twinkle: { trait: { zh: "闪闪的小角会一闪一闪。", en: "Twinkle sparkles like a star." }, schedule: withHabits(H(19, 21, "glow")) },
  sunny: { trait: { zh: "暖暖最喜欢晒太阳。", en: "Sunny loves the sun." }, schedule: withHabits(H(9, 15, "sunbathe")) },
  moony: { trait: { zh: "月月白天睡觉，晚上看星星。", en: "Moony sleeps in the day." }, schedule: [H(6, 18, "sleep"), H(18, 6, "glow")] },
  drippy: { trait: { zh: "滴滴下雨天最开心。", en: "Drippy loves rainy days." }, schedule: withHabits(H(14, 17, "bath")) },
  snowy: { trait: { zh: "雪雪喜欢凉凉的地方。", en: "Snowy likes cool places." }, schedule: withHabits(H(12.5, 15, "nap")) },
  leafy: { trait: { zh: "叶叶喜欢抱着树枝睡觉。", en: "Leafy hugs a branch to sleep." }, schedule: withHabits(H(12.5, 15, "nap")) },
  petal: { trait: { zh: "瓣瓣在花丛里飞来飞去。", en: "Petal flies around the flowers." }, schedule: DEFAULT_SCHEDULE },
  shelly: { trait: { zh: "贝贝背着亮晶晶的小房子。", en: "Shelly carries a shiny home." }, schedule: withHabits(H(8, 11.5, "collect")) },
  dandy: { trait: { zh: "蒲蒲一吹就飘起来啦。", en: "Dandy floats in the wind." }, schedule: DEFAULT_SCHEDULE },
  pebbo: { trait: { zh: "墩墩力气很大，走路稳稳的。", en: "Pebbo is big and strong." }, schedule: withHabits(H(8, 11.5, "collect")) },
  mushy: { trait: { zh: "菇菇雨后最喜欢出来散步。", en: "Mushy walks after the rain." }, schedule: DEFAULT_SCHEDULE },
  nutty: { trait: { zh: "栗栗喜欢把橡果藏起来。", en: "Nutty hides acorns." }, schedule: withHabits(H(8, 11.5, "collect")) },
  carro: { trait: { zh: "萝萝是勤快的小园丁。", en: "Carro is a busy gardener." }, schedule: DEFAULT_SCHEDULE },
  pinny: { trait: { zh: "松松最爱晒太阳，尾巴上的小树苗也一起晒。", en: "Pinny loves the sun with its little tree." }, schedule: withHabits(H(9, 11.5, "sunbathe")) },
  glowy: { trait: { zh: "亮亮把阳光存在脸颊里，晚上亮亮的。", en: "Glowy keeps sunshine in its cheeks." }, schedule: withHabits(H(19, 21, "glow")) },
  breezy: { trait: { zh: "呼呼一吹气，就有凉凉的风。", en: "Breezy blows a cool breeze." }, schedule: withHabits(H(14, 17, "fly")) },
  pumpy: { trait: { zh: "南南吃饱了就想睡觉。", en: "Pumpy eats, then sleeps." }, schedule: withHabits(H(12.5, 15.5, "nap")) },
  splashy: { trait: { zh: "扑扑每天都在练习游泳。", en: "Splashy practices swimming every day." }, schedule: withHabits(H(14, 17, "splash")) },
  shady: { trait: { zh: "影影的影子会学你的样子。", en: "Shady's shadow copies you." }, schedule: withHabits(H(19, 21, "dance")) },
  wavy: { trait: { zh: "浪浪会唱海浪摇篮曲。", en: "Wavy sings a sea song." }, schedule: withHabits(H(19, 21, "sing")) },
  dewy: { trait: { zh: "露露早上收集亮晶晶的露珠。", en: "Dewy collects shiny dewdrops." }, schedule: withHabits(H(8, 11.5, "collect")) },
  mellow: { trait: { zh: "慢慢做什么都慢慢的。", en: "Mellow does everything slowly." }, schedule: withHabits(H(14, 17, "swim")) },
  mangi: { trait: { zh: "芒芒把最高的芒果分给朋友。", en: "Mangi shares mangoes with friends." }, schedule: DEFAULT_SCHEDULE },
  mossy: { trait: { zh: "苔苔背着小伙伴过池塘。", en: "Mossy gives friends a ride." }, schedule: withHabits(H(14, 17, "swim")) },
  twirly: { trait: { zh: "转转最喜欢转圈圈跳舞。", en: "Twirly loves to dance." }, schedule: withHabits(H(17, 18, "dance")) },
  sayo: { trait: { zh: "学学听到什么就学什么。", en: "Sayo says what it hears." }, schedule: withHabits(H(8, 11.5, "sing")) },
  dreamy: { trait: { zh: "梦梦帮大家赶走坏梦。", en: "Dreamy brings sweet dreams." }, schedule: DEFAULT_SCHEDULE },
  blossy: { trait: { zh: "樱樱飞过的地方会开花。", en: "Blossy brings flowers." }, schedule: withHabits(H(8, 11.5, "fly")) },
  rimo: { trait: { zh: "霜霜的脚印是亮晶晶的霜花。", en: "Rimo leaves frosty footprints." }, schedule: withHabits(H(12.5, 15, "nap")) },
  diggy: { trait: { zh: "挖挖挖过的地方会长出幸运草。", en: "Diggy digs and clover grows." }, schedule: withHabits(H(8, 11.5, "collect")) },
  rainbo: { trait: { zh: "彩彩的尾巴会随心情变颜色。", en: "Rainbo's tail changes color." }, schedule: withHabits(H(14, 17, "dance")) },
};

export const BEHAVIORS: Record<number, Behavior> = Object.fromEntries(CREATURES.map(c => [c.id, SPECIES_BEHAVIOR[c.species]]));

