import type { Pokemon } from "../types";
import { ACTIVITY, type Activity } from "../lib/routine";
import { COLORS } from "./pokemon";

/**
 * 家园的环境英语（磨耳朵）：适合 3–6 岁幼儿的可理解输入。
 * 原则：
 * - 说的永远是孩子此刻在屏幕上能看到的东西（宝可梦正在做的事、太阳、大海、花）；
 * - 句子 2–6 个词，几种固定句型反复出现（Look! / Where is…? / What are you doing? / I see… / Let's count!），
 *   每次只换一两个词，让孩子靠重复自己“悟”出意思；
 * - 每句配拟声词或口头禅，好听、好学、好模仿；
 * - 中文只做简短提示（英文 → 中文提示 → 英文复述），家长可切换成纯英文。
 * 所有句子都由这里的函数生成，配音脚本用同样的函数穷举预合成。
 */
export interface Narration {
  /** 依次朗读的英文（第一句是字幕） */
  en: string[];
  /** 中文提示（双语模式才读） */
  zh: string;
  /** 结尾再重复一遍的英文关键句 */
  echo?: string;
  /** 被点名的宝可梦（会跳一下吸引视线） */
  focus?: number;
  /** 宝可梦自己说的那句（用宝可梦的声音） */
  me?: string;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** 看一看：Look! Pikachu is eating. Yum yum! */
export function lookLine(p: Pokemon, a: Activity): Narration {
  const A = ACTIVITY[a];
  return { en: [`Look! ${p.nameEn} ${A.en}.`, A.sound], zh: `看！${p.nameZh}${A.zh}。`, echo: `${p.nameEn} ${A.en}.`, focus: p.id };
}

/** 找一找：Where is Pikachu? … There it is! */
export function whereLine(p: Pokemon, a: Activity): Narration {
  const A = ACTIVITY[a];
  return { en: [`Where is ${p.nameEn}?`, "There it is!", `${p.nameEn} ${A.en}.`], zh: `${p.nameZh}在哪里？在这里！`, echo: A.sound, focus: p.id };
}

/** 问答：Pikachu, Pikachu, what are you doing? — I'm eating! */
export function whatLine(p: Pokemon, a: Activity): Narration {
  const A = ACTIVITY[a];
  return { en: [`${p.nameEn}, ${p.nameEn}, what are you doing?`], me: A.me, zh: `${p.nameZh}，你在做什么呀？${A.zhSound}`, echo: A.me, focus: p.id };
}

/** 颜色：Pikachu is yellow. Yellow, yellow! */
export function colorLine(p: Pokemon): Narration | null {
  const c = COLORS[p.color];
  if (!c) return null;
  return { en: [`${p.nameEn} is ${c.en}.`, `${cap(c.en)}, ${c.en}!`], zh: `${p.nameZh}是${c.zh}的。`, echo: cap(c.en) + "!", focus: p.id };
}

export const NUMBERS = ["one", "two", "three", "four", "five", "six", "seven", "eight"];
/** 能拿来数数的活动（复数形式自然的） */
export const COUNTABLE: Activity[] = ["sleep", "eat", "play", "swim", "fly", "warm"];
export const countChant = (n: number) => NUMBERS.slice(0, n).map(cap).join(", ") + "!";
export function countSentence(n: number, a: Activity) {
  const verb = ACTIVITY[a].en.replace(/^is /, n === 1 ? "is " : "are ");
  return `${cap(NUMBERS[n - 1])} Pokémon ${verb}.`;
}
/** 数一数：Let's count! One, two, three! Three Pokémon are sleeping. */
export function countLine(n: number, a: Activity): Narration {
  return { en: ["Let's count!", countChant(n), countSentence(n, a)], zh: `我们来数一数：${n}只宝可梦${ACTIVITY[a].zh}。`, echo: countChant(n) };
}

/** 看风景：I see … 按时段挑选，都是屏幕上看得见的东西 */
export interface SceneLine { en: string[]; zh: string; echo: string; when: ("morning" | "day" | "evening" | "night")[] }
export const SCENE_LINES: SceneLine[] = [
  { en: ["Look at the sun!", "Hello, sun!"], zh: "看，太阳！", echo: "Sun!", when: ["morning", "day"] },
  { en: ["I see the sea.", "The sea is blue."], zh: "我看到了大海，大海是蓝色的。", echo: "Blue sea!", when: ["morning", "day", "evening"] },
  { en: ["I see a palm tree.", "A big, big tree!"], zh: "我看到一棵椰子树，好高好高！", echo: "Tree!", when: ["morning", "day", "evening"] },
  { en: ["I see flowers.", "Red, yellow, pink!"], zh: "我看到了花，红的、黄的、粉的！", echo: "Flowers!", when: ["morning", "day"] },
  { en: ["I see a tent.", "A red and white tent!"], zh: "我看到一顶红白色的帐篷。", echo: "Tent!", when: ["morning", "day", "evening"] },
  { en: ["Look at the clouds!", "White, fluffy clouds."], zh: "看，白白的、软软的云朵。", echo: "Clouds!", when: ["day"] },
  { en: ["I see berries.", "Blue berries, pink berries!"], zh: "我看到了树果，有蓝色的，也有粉色的。", echo: "Berries!", when: ["morning", "day", "evening"] },
  { en: ["Listen! The waves.", "Swish, swish!"], zh: "听，海浪的声音。", echo: "Waves!", when: ["morning", "day", "evening", "night"] },
  { en: ["The fire is hot!", "Hot, hot, hot!"], zh: "篝火好烫！", echo: "Hot!", when: ["evening", "night"] },
  { en: ["Look at the moon!", "Hello, moon!"], zh: "看，月亮！", echo: "Moon!", when: ["night"] },
  { en: ["I see stars.", "Twinkle, twinkle!"], zh: "我看到了星星，一闪一闪。", echo: "Stars!", when: ["night"] },
  { en: ["The sky is orange.", "So pretty!"], zh: "天空变成橙色了，好漂亮！", echo: "Orange!", when: ["evening"] }
];

/** 进家园时按时段打招呼 */
export const GREETINGS: Record<"morning" | "day" | "evening" | "night", Narration> = {
  morning: { en: ["Good morning!", "The sun is up!"], zh: "早上好！太阳出来啦！", echo: "Good morning!" },
  day: { en: ["Good afternoon!", "Let's play!"], zh: "下午好！我们一起玩吧！", echo: "Let's play!" },
  evening: { en: ["Good evening!", "The fire is warm."], zh: "晚上好！篝火暖暖的。", echo: "Good evening!" },
  night: { en: ["It's night.", "Shh… Pokémon are sleeping."], zh: "天黑了，嘘，宝可梦们在睡觉。", echo: "Shh…" }
};

/** 晚安小儿歌（晚安页）：Good night, Pikachu! … Good night, moon! */
export const GOODNIGHT_TAIL = ["Good night, moon!", "Good night, stars!", "Good night, sea!", "See you tomorrow!"];
