import { knownCaption } from "../lib/captions";
import type { Pokemon } from "../types";
import type { Part } from "../lib/speech";
import { COLORS } from "./pokemon";
import { withArticle, type PicWord } from "./words";
import { NUMBERS, countChant } from "./islandEnglish";

/**
 * 任务页的英语（3–6 岁）：
 * - 指令统一成几种固定句型：Find…! / Touch…! / Where is…?，孩子听几次就懂；
 * - 先英文、再中文提示、最后英文复述（纯英文模式不读中文）；
 * - 答对时把目标词再说一遍；答错时说出孩子点的是什么（“Oops! This is a banana.”），错误也是输入；
 * - 新增数一数（1–5）和大小（big / small），都是这个年龄最核心的概念词。
 * 所有句子由这里的函数生成，配音脚本穷举预合成。
 */
export const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
export interface Lines { en: string[]; zh?: string; zhAudio?: string[] }

// ---------- 听一听：颜色 ----------
export const colorAsk = (c: string, zh: string): Lines => ({ en: [`${cap(c)}!`, `Find the ${c} Pokémon!`], zh: `找一找${zh}的宝可梦。` });
export const colorYes = (p: Pokemon): Lines => ({ en: [`Yes! ${p.nameEn} is ${COLORS[p.color].en}!`, `${cap(COLORS[p.color].en)}!`], zh: `${p.nameZh}是${COLORS[p.color].zh}的！` });
export const colorNo = (p: Pokemon, target: string): Lines => ({ en: [`Oops! ${p.nameEn} is ${COLORS[p.color].en}.`, `Find ${target}!`], zh: `这是${COLORS[p.color].zh}的。再找找${Object.values(COLORS).find(c=>c.en===target)?.zh ?? target}的！` });

// ---------- 听一听：名字 ----------
export const nameAsk = (p: Pokemon): Lines => ({ en: [`Where is ${p.nameEn}?`, `Find ${p.nameEn}!`], zh: `${p.nameZh}在哪里？` });
export const nameYes = (p: Pokemon): Lines => ({ en: [`Yes! It's ${p.nameEn}!`, `Hello, ${p.nameEn}!`], zh: `是${p.nameZh}！你好呀！` });
export const nameNo = (p: Pokemon, target: Pokemon): Lines => ({ en: [`This is ${p.nameEn}.`, `Find ${target.nameEn}!`], zh: `这是${p.nameZh}，再找找${target.nameZh}！`, zhAudio: [`这是${p.nameZh}。`, `再找找${target.nameZh}！`] });

// ---------- 听一听：叫声 ----------
export const cryAsk: Lines = { en: ["Listen! Who is it?"], zh: "听，是谁在叫？" };
export const cryYes = (p: Pokemon): Lines => ({ en: [`Yes! It's ${p.nameEn}!`], zh: `对啦，是${p.nameZh}！` });
export const cryNo = (p: Pokemon): Lines => ({ en: [`This is ${p.nameEn}.`, "Listen again!"], zh: "再听一听！" });

// ---------- 听一听：数一数 ----------
export interface CountItem { icon: string; one: string; many: string; zh: string; m: string }
export const COUNT_ITEMS: CountItem[] = [
  { icon: "apple", one: "apple", many: "apples", zh: "苹果", m: "个" },
  { icon: "star", one: "star", many: "stars", zh: "星星", m: "颗" },
  { icon: "fish", one: "fish", many: "fish", zh: "小鱼", m: "条" },
  { icon: "ball", one: "ball", many: "balls", zh: "球", m: "个" },
  { icon: "flower", one: "flower", many: "flowers", zh: "花", m: "朵" },
  { icon: "balloon", one: "balloon", many: "balloons", zh: "气球", m: "个" },
  { icon: "egg", one: "egg", many: "eggs", zh: "鸡蛋", m: "个" }
];
const NUM_ZH = ["一", "两", "三", "四", "五"];
export const countNoun = (n: number, it: CountItem) => `${NUMBERS[n - 1]} ${n === 1 ? it.one : it.many}`;
export const countAsk = (n: number, it: CountItem): Lines => ({ en: [`Find ${countNoun(n, it)}!`], zh: `找一找${NUM_ZH[n - 1]}${it.m}${it.zh}。` });
export const countYes = (n: number, it: CountItem): Lines => ({ en: [countChant(n), `${cap(countNoun(n, it))}!`], zh: `${NUM_ZH[n-1]}${it.m}${it.zh}！` });
export const countNo = (n: number, it: CountItem, target: number): Lines => ({ en: [`${n === 1 ? "This is" : "These are"} ${countNoun(n, it)}.`, `Find ${NUMBERS[target - 1]}!`], zh: `这里有${NUM_ZH[n-1]}${it.m}${it.zh}，找找${NUM_ZH[target-1]}${it.m}的！` });

// ---------- 听一听：大小 ----------
export const sizeAsk = (p: Pokemon, big: boolean): Lines => ({ en: [`Touch the ${big ? "big" : "small"} ${p.nameEn}!`], zh: `点一点${big ? "大大的" : "小小的"}${p.nameZh}。` });
export const sizeYes = (p: Pokemon, big: boolean): Lines => ({ en: [`Yes! ${big ? "Big" : "Small"} ${p.nameEn}!`, big ? "Big, big!" : "Small, small!"], zh: `${big ? "大大的" : "小小的"}${p.nameZh}！` });
export const sizeNo = (big: boolean): Lines => ({ en: [`This is ${big ? "small" : "big"}.`, `Find ${big ? "big" : "small"}!`], zh: `这是${big ? "小小的" : "大大的"}，再找找${big ? "大大的" : "小小的"}！` });

// ---------- 认一认 ----------
const noun = (w: PicWord) => (w.theme === "color" ? w.en : `the ${w.en}`);
export const picAsk = (w: PicWord): Lines => ({ en: [`${cap(w.en)}!`, `Find ${noun(w)}!`], zh: `${w.zh}在哪里？` });
export const picYes = (w: PicWord): Lines => ({ en: ["Yes!", `${cap(w.theme === "color" ? w.en : withArticle(w.en))}!`, "Can you say it?"], zh: `${w.zh}！` });
export const picNo = (w: PicWord, target: PicWord): Lines => ({ en: [`Oops! ${w.en === "grapes" ? "These are" : "This is"} ${w.theme === "color" ? w.en : withArticle(w.en)}.`, `Find ${noun(target)}!`], zh: `这是${w.zh}，再找找${target.zh}！`, zhAudio: [`这是${w.zh}。`, `再找找${target.zh}！`] });

// ---------- 说一说 ----------
export const SAY = {
  yourTurn: { en: ["Your turn!"], zh: "轮到你说啦！" } as Lines,
  listenYou: { en: ["Listen to you!"], zh: "听听你说的：" } as Lines,
  louder: { en: ["Try again!"], zh: "再试一次，轻轻说也可以。" } as Lines,
  goodTry: { en: ["Good try!"], zh: "没关系，我们下次再说！" } as Lines
};

// ---------- 写一写 ----------
export const letterChant = (letter: string, word: string) => `${letter}, ${letter}, ${word}!`;

/** 指令：英文 → 中文提示 → 再说一遍英文指令（最后一句） */
export function askParts(l: Lines, bilingual: boolean): Part[] {
  const parts: Part[] = [];
  l.en.forEach((t, i) => parts.push(...(i ? [300] : []), ["en", t, knownCaption("en",t) ?? (l.zh ? {en:t,zh:l.zh} : undefined)] as Part));
  if (l.zh && bilingual) parts.push(400, ...(l.zhAudio ?? [l.zh]).map(t => ["zh", t, {en:l.en[l.en.length-1],zh:l.zh!}] as Part), 300, ["en", l.en[l.en.length - 1], {en:l.en[l.en.length-1],zh:l.zh}]);
  return parts;
}
/** 反馈：英文 →（中文） */
export function feedbackParts(l: Lines, bilingual: boolean): Part[] {
  const parts: Part[] = [];
  l.en.forEach((t, i) => parts.push(...(i ? [250] : []), ["en", t, knownCaption("en",t) ?? (l.zh ? {en:t,zh:l.zh} : undefined)] as Part));
  if (l.zh && bilingual) parts.push(300, ...(l.zhAudio ?? [l.zh]).map(t => ["zh", t, {en:l.en[l.en.length-1],zh:l.zh!}] as Part));
  return parts;
}

export type TraceWord = {letter:string;en:string;zh:string};
export function traceIntro(item:TraceWord):Part[]{
 return [["en",`${item.letter}!`,{en:`${item.letter}!`,zh:`字母 ${item.letter}`}],300,
 ["en",`${item.letter} is for ${item.en}.`,{en:`${item.letter} is for ${item.en}.`,zh:`${item.en}（${item.zh}）以 ${item.letter} 开头。`}],300,
 ["en",letterChant(item.letter,item.en),{en:letterChant(item.letter,item.en),zh:`${item.letter}，${item.letter}，${item.zh}！`}],400,
 ["zh",`我们来写字母 ${item.letter}。`]];
}
export function traceSuccess(item:TraceWord):Part[]{
 return [["en",`Great! ${item.letter}! ${item.letter} is for ${item.en}!`],300,
 ["en",letterChant(item.letter,item.en),{en:letterChant(item.letter,item.en),zh:`${item.letter}，${item.letter}，${item.zh}！`}],
 ["zh",`写得真好！${item.letter}，${item.zh}！`]];
}
