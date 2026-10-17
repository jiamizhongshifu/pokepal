import type { Pokemon } from "../types";

/** 进化相关的台词（配音脚本按同样的函数穷举每一对进化） */
export const evoReady = (p: Pokemon) => ({ en: [`Wow! ${p.nameEn} can evolve!`, "Do you want to evolve?"], zh: `哇！${p.nameZh}可以进化啦！要进化吗？` });
export const evoStart = (p: Pokemon) => ({ en: [`What? ${p.nameEn} is evolving!`], zh: `咦？${p.nameZh}要进化了！` });
export const evoDone = (from: Pokemon, to: Pokemon) => ({ en: [`Congratulations! ${from.nameEn} evolved into ${to.nameEn}!`], zh: `恭喜！${from.nameZh}进化成了${to.nameZh}！` });
export const evoStay = (p: Pokemon) => ({ en: [`OK! ${p.nameEn} stays the same.`], zh: `好的，${p.nameZh}保持现在的样子。` });
