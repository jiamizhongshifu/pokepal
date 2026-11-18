import { CREATURES } from "./creatures";
import type { Activity } from "../lib/routine";

/**
 * 每种小精灵的行动方式、活动轨迹和生活习性（简化给幼儿看）。三个成长阶段共用同一物种的习性。
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

/** Per species: how it moves, one short line a child hears when tapping it, and how its day differs from the default. */
const SPECIES_BEHAVIOR: Record<string, Behavior> = {
  bubbo: { locomotion: "waddle", speed: 0.9, trait: { zh: "啵啵最喜欢在水边吹泡泡。", en: "Bubbo loves blowing bubbles." }, schedule: withHabits(H(15, 17, "bath", "shallows")) },
  berry: { locomotion: "walk", speed: 0.9, trait: { zh: "莓莓最爱和朋友分享莓果。", en: "Berry loves sharing berries." }, schedule: DEFAULT_SCHEDULE },
  puffy: { locomotion: "float", speed: 0.7, altitude: 0.6, trait: { zh: "绵绵软软的，像一朵小云。", en: "Puffy is soft like a cloud." }, schedule: DEFAULT_SCHEDULE },
  twinkle: { locomotion: "hop", speed: 1.2, trait: { zh: "闪闪的小角会一闪一闪。", en: "Twinkle sparkles like a star." }, schedule: withHabits(H(19, 21, "glow", "moonlit", "circle")) },
  sunny: { locomotion: "dash", speed: 1.3, trait: { zh: "暖暖最喜欢晒太阳。", en: "Sunny loves the sun." }, schedule: withHabits(H(9, 15, "sunbathe", "sunny", "stay")) },
  moony: { locomotion: "crawl", speed: 0.5, trait: { zh: "月月白天睡觉，晚上看星星。", en: "Moony sleeps in the day." }, schedule: [H(6, 18, "sleep", "beds"), H(18, 6, "glow", "moonlit", "stay")] },
  drippy: { locomotion: "crawl", speed: 0.4, trait: { zh: "滴滴下雨天最开心。", en: "Drippy loves rainy days." }, schedule: withHabits(H(14, 17, "bath", "shallows")) },
  snowy: { locomotion: "waddle", speed: 0.8, trait: { zh: "雪雪喜欢凉凉的地方。", en: "Snowy likes cool places." }, schedule: withHabits(H(12.5, 15, "nap", "palms", "stay")) },
  leafy: { locomotion: "walk", speed: 0.6, trait: { zh: "叶叶喜欢抱着树枝睡觉。", en: "Leafy hugs a branch to sleep." }, schedule: withHabits(H(12.5, 15, "nap", "palms", "stay")) },
  petal: { locomotion: "fly", speed: 1.6, altitude: 1.6, trait: { zh: "瓣瓣在花丛里飞来飞去。", en: "Petal flies around the flowers." }, schedule: DEFAULT_SCHEDULE },
  shelly: { locomotion: "sidestep", speed: 0.7, trait: { zh: "贝贝背着亮晶晶的小房子。", en: "Shelly carries a shiny home." }, schedule: withHabits(H(8, 11.5, "collect", "shore")) },
  dandy: { locomotion: "float", speed: 0.8, altitude: 0.5, trait: { zh: "蒲蒲一吹就飘起来啦。", en: "Dandy floats in the wind." }, schedule: DEFAULT_SCHEDULE },
  pebbo: { locomotion: "walk", speed: 0.6, trait: { zh: "墩墩力气很大，走路稳稳的。", en: "Pebbo is big and strong." }, schedule: withHabits(H(8, 11.5, "collect", "rocks")) },
  mushy: { locomotion: "walk", speed: 0.8, trait: { zh: "菇菇雨后最喜欢出来散步。", en: "Mushy walks after the rain." }, schedule: DEFAULT_SCHEDULE },
  nutty: { locomotion: "dash", speed: 1.4, trait: { zh: "栗栗喜欢把橡果藏起来。", en: "Nutty hides acorns." }, schedule: withHabits(H(8, 11.5, "collect", "bushes")) },
  carro: { locomotion: "hop", speed: 1.0, trait: { zh: "萝萝是勤快的小园丁。", en: "Carro is a busy gardener." }, schedule: DEFAULT_SCHEDULE },
};

export const BEHAVIORS: Record<number, Behavior> = Object.fromEntries(CREATURES.map(c => [c.id, SPECIES_BEHAVIOR[c.species]]));

/** 只能在水里生活的小精灵（目前没有，岛上伙伴都能上岸） */
export const isAquatic = (id: number) => ["swim", "slither"].includes(BEHAVIORS[id]?.locomotion ?? "");
