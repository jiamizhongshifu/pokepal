import type { Pokemon } from "../types";
import { BEHAVIORS, DEFAULT_SCHEDULE, type Habit, type ZoneKey } from "../data/behaviors";

export type Activity =
  | "sleep" | "nap" | "eat" | "play" | "bath" | "swim" | "splash" | "sunbathe" | "sing" | "dance"
  | "warm" | "fish" | "guard" | "collect" | "meditate" | "buried" | "explore" | "glow" | "fly" | "graze" | "lonely" | "teleport";

/**
 * 活动的中英文描述和头顶图标。英文按 3–6 岁幼儿的水平：只用最常见的动词和短句，
 * 每个活动配一个拟声词 / 口头禅（sound），以及宝可梦自己的第一人称回答（me），用于家园的环境英语。
 */
export const ACTIVITY: Record<Activity, { zh: string; en: string; icon: string; sound: string; me: string; zhSound: string }> = {
  sleep: { zh: "在睡觉", en: "is sleeping", icon: "zz", sound: "Zzz…", me: "I'm sleeping!", zhSound: "呼——呼——" },
  nap: { zh: "在睡午觉", en: "is sleeping", icon: "zz", sound: "Zzz…", me: "I'm sleeping!", zhSound: "呼——呼——" },
  eat: { zh: "在吃饭", en: "is eating", icon: "bowl", sound: "Yum yum!", me: "I'm eating!", zhSound: "好好吃！" },
  play: { zh: "在玩耍", en: "is playing", icon: "balloon", sound: "Wheee!", me: "I'm playing!", zhSound: "真好玩！" },
  bath: { zh: "在洗澡", en: "is taking a bath", icon: "bubbles", sound: "Splash, splash!", me: "I'm taking a bath!", zhSound: "哗啦哗啦！" },
  swim: { zh: "在游泳", en: "is swimming", icon: "waves", sound: "Swish, swish!", me: "I'm swimming!", zhSound: "游呀游！" },
  splash: { zh: "在水里扑腾", en: "is splashing", icon: "water", sound: "Splash!", me: "I'm splashing!", zhSound: "扑通扑通！" },
  sunbathe: { zh: "在晒太阳", en: "is in the sun", icon: "sun", sound: "So warm!", me: "I'm in the sun!", zhSound: "暖洋洋！" },
  sing: { zh: "在唱歌", en: "is singing", icon: "music", sound: "La la la!", me: "I'm singing!", zhSound: "啦啦啦！" },
  dance: { zh: "在月光下跳舞", en: "is dancing", icon: "moon", sound: "Spin, spin!", me: "I'm dancing!", zhSound: "转呀转！" },
  warm: { zh: "在烤火取暖", en: "is by the fire", icon: "flame", sound: "So warm!", me: "I'm by the fire!", zhSound: "暖洋洋！" },
  fish: { zh: "在钓鱼", en: "is fishing", icon: "fish", sound: "Fish, fish, come here!", me: "I'm fishing!", zhSound: "小鱼快上钩！" },
  guard: { zh: "在站岗", en: "is looking around", icon: "eye", sound: "Look, look!", me: "I'm looking around!", zhSound: "看一看！" },
  collect: { zh: "在找亮晶晶的东西", en: "is looking for treasure", icon: "search", sound: "Shiny!", me: "I'm looking for treasure!", zhSound: "亮晶晶！" },
  meditate: { zh: "在安静地坐着", en: "is sitting quietly", icon: "sparkle", sound: "Shh…", me: "I'm sitting quietly.", zhSound: "嘘——" },
  buried: { zh: "躲进了沙子里", en: "is hiding", icon: "shovel", sound: "Peekaboo!", me: "I'm hiding!", zhSound: "躲猫猫！" },
  explore: { zh: "在到处走走看看", en: "is walking around", icon: "search", sound: "Let's go!", me: "I'm walking around!", zhSound: "出发啦！" },
  glow: { zh: "在发光", en: "is glowing", icon: "star", sound: "Twinkle, twinkle!", me: "I'm glowing!", zhSound: "一闪一闪！" },
  fly: { zh: "在天上飞", en: "is flying", icon: "wing", sound: "Flap, flap!", me: "I'm flying!", zhSound: "飞呀飞！" },
  graze: { zh: "在吃叶子", en: "is eating leaves", icon: "leaf", sound: "Munch, munch!", me: "I'm eating leaves!", zhSound: "嚼嚼嚼！" },
  lonely: { zh: "在看大海", en: "is looking at the sea", icon: "moon", sound: "Hello, sea!", me: "I'm looking at the sea!", zhSound: "你好，大海！" },
  teleport: { zh: "嗖地不见了", en: "goes poof", icon: "sparkle", sound: "Poof!", me: "Poof! Here I am!", zhSound: "嗖！" }
};

function hourOf(date: Date) {
  // 仅开发模式：window.__hour = 20 可强制时间，便于检查作息
  const forced = import.meta.env.DEV ? (globalThis as { __hour?: number }).__hour : undefined;
  if (forced !== undefined) return forced;
  return date.getHours() + date.getMinutes() / 60;
}
const inRange = (h: number, a: number, b: number) => (a <= b ? h >= a && h < b : h >= a || h < b);

/** 当前习性：按每只宝可梦自己的作息表（找不到就用通用作息） */
export function habitAt(p: Pokemon, date = new Date()): Habit {
  const sched = BEHAVIORS[p.id]?.schedule ?? DEFAULT_SCHEDULE;
  const h = hourOf(date);
  for (const s of sched) if (inRange(h, s.from, s.to)) return s;
  return { from: 0, to: 24, activity: "play", zone: "meadow" as ZoneKey };
}

export function activityAt(p: Pokemon, date = new Date()): Activity {
  return habitAt(p, date).activity;
}

export function skyFor(date = new Date()): "morning" | "day" | "evening" | "night" {
  // 仅开发模式：window.__sky = "night" 等可强制天色，便于检查
  const forced = import.meta.env.DEV ? (globalThis as { __sky?: "morning" | "day" | "evening" | "night" }).__sky : undefined;
  if (forced) return forced;
  const h = date.getHours();
  if (h >= 21 || h < 6) return "night";
  if (h < 9) return "morning";
  if (h < 17) return "day";
  return "evening";
}
