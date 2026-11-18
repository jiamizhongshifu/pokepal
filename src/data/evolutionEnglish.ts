import type { Creature } from "../types";

/** 长大相关的台词（配音脚本按同样的函数穷举每一对成长阶段） */
export const evoReady = (p: Creature) => ({ en: [`Wow! ${p.nameEn} is ready to grow up!`, "Shall we help it grow?"], zh: `哇！${p.nameZh}准备好长大啦！要陪它长大吗？` });
export const evoStart = (p: Creature) => ({ en: [`Look! ${p.nameEn} is growing up!`], zh: `看！${p.nameZh}正在长大！` });
export const evoDone = (from: Creature, to: Creature) => ({ en: [`Hooray! ${from.nameEn} grew up into ${to.nameEn}!`], zh: `太棒了！${from.nameZh}长大成了${to.nameZh}！` });
export const evoStay = (p: Creature) => ({ en: [`OK! ${p.nameEn} stays the same.`], zh: `好的，${p.nameZh}保持现在的样子。` });
