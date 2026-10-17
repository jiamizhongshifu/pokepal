/**
 * 配音阵容（豆包语音合成 2.0 音色，构建期使用）。
 * - 中文旁白：儿童绘本音色，像带孩子冒险的向导
 * - 英文旁白：Allison（美式英语），放慢一点，适合幼儿磨耳朵
 * - 宝可梦自己说话的台词：按体型和性格选音色、调音高
 */
export interface Voice { voice: string; pitch?: number; rate?: number; context?: string }

export const NARRATOR_ZH: Voice = { voice: "zh_female_xiaoxue_uranus_bigtts", rate: -5, context: "请用温柔、活泼、像给小朋友讲故事一样的语气说话" };
export const NARRATOR_EN: Voice = { voice: "en_female_allison_uranus_bigtts", rate: -12, context: "Please speak slowly, clearly and cheerfully, like a kind teacher talking to a 4-year-old child." };

const CUTE_ZH: Voice = { voice: "zh_male_naiqimengwa_uranus_bigtts", context: "用可爱、元气满满的语气说" };
const SWEET_ZH: Voice = { voice: "zh_female_mengyatou_uranus_bigtts", context: "用软萌可爱的语气说" };
const PLAYFUL_ZH: Voice = { voice: "zh_female_qiaopinv_uranus_bigtts", context: "用俏皮调皮的语气说" };
const BRIGHT_ZH: Voice = { voice: "zh_male_liangsangmengzai_uranus_bigtts", context: "用活力十足的语气说" };
const BIG_ZH: Voice = { voice: "zh_male_xionger_uranus_bigtts", rate: -10, context: "用憨厚、慢悠悠的语气说" };
const COOL_ZH: Voice = { voice: "zh_male_gaolengchenwen_uranus_bigtts", rate: -10, context: "用冷静、神秘的语气说" };

const CUTE_EN: Voice = { voice: "en_female_allison_uranus_bigtts", pitch: 4, rate: -5, context: "Speak in a tiny, cute, happy voice." };
const BIG_EN: Voice = { voice: "en_male_alex_uranus_bigtts", pitch: -3, rate: -15, context: "Speak slowly in a big, friendly, sleepy voice." };
const COOL_EN: Voice = { voice: "en_male_alex_uranus_bigtts", pitch: -1, rate: -15, context: "Speak calmly and mysteriously." };

const BIG = new Set([3, 6, 9, 131, 143, 18, 59, 62, 80, 99, 130, 149, 230]);
const SWEET = new Set([35, 37, 39, 43, 116, 120, 133, 147, 36, 38, 40, 44, 45, 182, 134, 196, 117, 121, 148, 12]);
const PLAYFUL = new Set([151, 52, 53, 186, 40]);
const BRIGHT = new Set([25, 26, 58, 4, 5, 135, 136, 17, 61]);
const COOL = new Set([150, 65, 199, 197]);

export function pokemonVoice(id: number, lang: "zh" | "en"): Voice {
  if (COOL.has(id)) return lang === "zh" ? COOL_ZH : COOL_EN;
  if (BIG.has(id)) return lang === "zh" ? BIG_ZH : BIG_EN;
  if (lang === "en") return CUTE_EN;
  if (PLAYFUL.has(id)) return PLAYFUL_ZH;
  if (SWEET.has(id)) return SWEET_ZH;
  if (BRIGHT.has(id)) return BRIGHT_ZH;
  return CUTE_ZH;
}
