import raw from "./pokemon.json";
import type { BallType, Pokemon, PokemonRaw, Rarity } from "../types";
import { withArticle } from "./words";
import { TYPE_ICON } from "../icons";

/** 稀有度按 PokéAPI 字段自动划分，见 PRD 3.3 */
export function rarityOf(p: PokemonRaw): Rarity {
  if (p.isLegendary || p.isMythical) return "legend";
  if ((p.isFinal && p.captureRate <= 90) || p.captureRate < 30) return "rare";
  if (p.captureRate < 150) return "uncommon";
  return "common";
}

export const POKEMON: Pokemon[] = (raw as PokemonRaw[]).map((p) => ({ ...p, rarity: rarityOf(p) }));
const byId = new Map(POKEMON.map((p) => [p.id, p]));
export const getPokemon = (id: number): Pokemon => byId.get(id)!;

export const artUrl = (id: number) => `/pokemon/art/${id}.png`;
export const spriteUrl = (id: number) => `/pokemon/home/${id}.png`;
export const cryUrl = (id: number) => `/pokemon/cry/${id}.m4a`;

export const RARITY: Record<Rarity, { zh: string; en: string; stars: number }> = {
  common: { zh: "普通", en: "Common", stars: 1 },
  uncommon: { zh: "少见", en: "Uncommon", stars: 2 },
  rare: { zh: "稀有", en: "Rare", stars: 3 },
  legend: { zh: "传说", en: "Legendary", stars: 4 }
};

// Legacy identifiers are retained solely for reading older saves and voice records.
const POKE_BALL = { zh: "精灵球", en: "Poké Ball", cost: 5 };
export const BALLS: Record<BallType, typeof POKE_BALL> = {
  poke: POKE_BALL, great: POKE_BALL, ultra: POKE_BALL, master: POKE_BALL
};
export const BALL_ORDER: BallType[] = ["poke"];

export const TYPES: Record<string, { zh: string; en: string; icon: string; color: string }> = {
  normal: { zh: "一般", en: "Normal", icon: TYPE_ICON.normal, color: "#a8a77a" },
  fire: { zh: "火", en: "Fire", icon: TYPE_ICON.fire, color: "#ee8130" },
  water: { zh: "水", en: "Water", icon: TYPE_ICON.water, color: "#6390f0" },
  grass: { zh: "草", en: "Grass", icon: TYPE_ICON.grass, color: "#7ac74c" },
  electric: { zh: "电", en: "Electric", icon: TYPE_ICON.electric, color: "#f7d02c" },
  ice: { zh: "冰", en: "Ice", icon: TYPE_ICON.ice, color: "#96d9d6" },
  fighting: { zh: "格斗", en: "Fighting", icon: TYPE_ICON.fighting, color: "#c22e28" },
  poison: { zh: "毒", en: "Poison", icon: TYPE_ICON.poison, color: "#a33ea1" },
  ground: { zh: "地面", en: "Ground", icon: TYPE_ICON.ground, color: "#e2bf65" },
  flying: { zh: "飞行", en: "Flying", icon: TYPE_ICON.flying, color: "#a98ff3" },
  psychic: { zh: "超能力", en: "Psychic", icon: TYPE_ICON.psychic, color: "#f95587" },
  bug: { zh: "虫", en: "Bug", icon: TYPE_ICON.bug, color: "#a6b91a" },
  rock: { zh: "岩石", en: "Rock", icon: TYPE_ICON.rock, color: "#b6a136" },
  ghost: { zh: "幽灵", en: "Ghost", icon: TYPE_ICON.ghost, color: "#735797" },
  dragon: { zh: "龙", en: "Dragon", icon: TYPE_ICON.dragon, color: "#6f35fc" },
  steel: { zh: "钢", en: "Steel", icon: TYPE_ICON.steel, color: "#b7b7ce" },
  dark: { zh: "恶", en: "Dark", icon: TYPE_ICON.dark, color: "#705746" },
  fairy: { zh: "妖精", en: "Fairy", icon: TYPE_ICON.fairy, color: "#d685ad" }
};

export const COLORS: Record<string, { zh: string; en: string; css: string }> = {
  red: { zh: "红色", en: "red", css: "#e53935" },
  yellow: { zh: "黄色", en: "yellow", css: "#fdd835" },
  blue: { zh: "蓝色", en: "blue", css: "#1e88e5" },
  green: { zh: "绿色", en: "green", css: "#43a047" },
  pink: { zh: "粉色", en: "pink", css: "#f48fb1" },
  purple: { zh: "紫色", en: "purple", css: "#8e24aa" },
  brown: { zh: "棕色", en: "brown", css: "#8d6e63" },
  white: { zh: "白色", en: "white", css: "#fafafa" },
  gray: { zh: "灰色", en: "gray", css: "#9e9e9e" },
  black: { zh: "黑色", en: "black", css: "#212121" }
};

interface Phrase { en: string; zh: string; icon: string }

const TYPE_HOBBY: Record<string, Phrase> = {
  fire: { en: "It loves warm sunshine.", zh: "它最喜欢晒太阳。", icon: "sun" },
  water: { en: "It loves to swim.", zh: "它最喜欢游泳。", icon: "waves" },
  grass: { en: "It loves flowers.", zh: "它最喜欢闻花香。", icon: "flower" },
  electric: { en: "It loves to run fast.", zh: "它最喜欢快快地跑。", icon: "wind" },
  normal: { en: "It loves to nap.", zh: "它最喜欢睡午觉。", icon: "zz" },
  bug: { en: "It loves to climb trees.", zh: "它最喜欢爬树。", icon: "tree" },
  poison: { en: "It loves to dance.", zh: "它最喜欢跳舞。", icon: "music" },
  fairy: { en: "It loves to sing.", zh: "它最喜欢唱歌。", icon: "music" },
  psychic: { en: "It loves to look at the stars.", zh: "它最喜欢看星星。", icon: "star" },
  ground: { en: "It loves to dig.", zh: "它最喜欢挖沙子。", icon: "shovel" },
  dragon: { en: "It loves to fly in the sky.", zh: "它最喜欢在天上飞。", icon: "cloud" },
  ice: { en: "It loves snow.", zh: "它最喜欢下雪天。", icon: "snowman" },
  flying: { en: "It loves to fly.", zh: "它最喜欢飞翔。", icon: "wing" }
};

interface Food extends Phrase { one: string }
/** en 用于 "It likes …"（复数），one 用于 "Here is …"（单个） */
const COLOR_FOOD: Record<string, Food> = {
  red: { en: "strawberries", one: "a strawberry", zh: "草莓", icon: "strawberry" },
  yellow: { en: "bananas", one: "a banana", zh: "香蕉", icon: "banana" },
  blue: { en: "blueberries", one: "some blueberries", zh: "蓝莓", icon: "blueberry" },
  green: { en: "apples", one: "an apple", zh: "苹果", icon: "apple-green" },
  pink: { en: "peaches", one: "a peach", zh: "桃子", icon: "peach" },
  purple: { en: "grapes", one: "some grapes", zh: "葡萄", icon: "grapes" },
  brown: { en: "cookies", one: "a cookie", zh: "饼干", icon: "cookie" },
  white: { en: "rice balls", one: "a rice ball", zh: "饭团", icon: "riceball" },
  gray: { en: "nuts", one: "some nuts", zh: "坚果", icon: "nuts" },
  black: { en: "cake", one: "a piece of cake", zh: "蛋糕", icon: "cake" }
};

export function hobby(p: Pokemon): Phrase {
  return TYPE_HOBBY[p.types[0]] ?? TYPE_HOBBY[p.types[1]] ?? TYPE_HOBBY.normal;
}
export function favoriteFood(p: Pokemon): Food {
  return COLOR_FOOD[p.color] ?? COLOR_FOOD.red;
}

/** 幼儿版描述：1–2 句中英对照，按颜色、属性、爱好模板生成，离线可用 */
export function kidDescription(p: Pokemon): { en: string; zh: string } {
  const c = COLORS[p.color] ?? COLORS.yellow;
  const t = TYPES[p.types[0]] ?? TYPES.normal;
  const h = hobby(p);
  const f = favoriteFood(p);
  return {
    en: `${p.nameEn} is a ${c.en} Pokémon. It is ${withArticle(t.en)} type. ${h.en} It likes ${f.en}.`,
    zh: `${p.nameZh}是${c.zh}的宝可梦，它是${t.zh}属性。${h.zh}它爱吃${f.zh}。`
  };
}

export const friendshipLevel = (f: number) => Math.min(5, Math.floor(f / 20));
