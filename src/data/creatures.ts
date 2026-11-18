import species from './creatures.json';
import type { Creature, Rarity } from '../types';
import { withArticle } from './words';
import { LEGACY_CREATURE } from './legacyCreatureMap';

/**
 * Original island creatures: 16 species, each a baby animal plus one nature element, growing through 3 stages.
 * Every stage is one collectible creature with a stable numeric id (1000 + species index * 10 + stage),
 * so saves, voice lines and tests can refer to it; ids below 1000 are legacy and only read by the save migration.
 */
export type CreatureType = 'water' | 'plant' | 'sky' | 'light' | 'night' | 'earth' | 'snow';
type StageData = { nameEn: string; nameZh: string; body: string; heightCm: number };
export type Species = { id: string; type: CreatureType; animal: string; word: string; color: string; genusEn: string; genusZh: string; stages: StageData[]; not: string };

export const SPECIES = species as Species[];
export const STAGE_COUNT = 3;
export const creatureId = (speciesIndex: number, stage: number) => 1000 + speciesIndex * 10 + stage;
export const isCreatureId = (id: unknown): id is number => typeof id === 'number' && CREATURE_BY_ID.has(id);

const STAGE_RARITY: Rarity[] = ['common', 'uncommon', 'rare'];

export const CREATURES: Creature[] = SPECIES.flatMap((s, i) => s.stages.map((stage, k) => ({
  id: creatureId(i, k + 1),
  species: s.id,
  stage: k + 1,
  nameEn: stage.nameEn,
  nameZh: stage.nameZh,
  genusEn: s.genusEn,
  genusZh: s.genusZh,
  types: [s.type],
  color: s.color,
  heightCm: stage.heightCm,
  isFinal: k === s.stages.length - 1,
  evolvesTo: k < s.stages.length - 1 ? [creatureId(i, k + 2)] : [],
  evoOnly: k > 0,
  rarity: STAGE_RARITY[k],
})));
const CREATURE_BY_ID = new Map(CREATURES.map(c => [c.id, c]));
/** Ids stored before the rebrand (diary companions, old backups) resolve to their island creature. */
export const getCreature = (id: number): Creature => (CREATURE_BY_ID.get(id) ?? CREATURE_BY_ID.get(LEGACY_CREATURE[id]))!;
export const speciesOf = (c: Creature) => SPECIES.find(s => s.id === c.species)!;
/** Creatures that can be met as babies; later stages only come from growing up. */
export const BABY_CREATURES = CREATURES.filter(c => c.stage === 1);

const sprite = (c: Creature) => `/sprites/${c.species}`;
export const creatureArt = (id: number) => `${sprite(getCreature(id))}/stage-${getCreature(id).stage}.webp`;
export const creatureAvatar = (id: number) => `${sprite(getCreature(id))}/avatar-${getCreature(id).stage}.webp`;
/** Expression art exists for the baby stage; older stages fall back to their standing pose. */
export const creatureExpression = (id: number, expression: string) => getCreature(id).stage === 1 ? `${sprite(getCreature(id))}/expr-${expression}.webp` : creatureArt(id);

export const RARITY: Record<Rarity, { zh: string; en: string; stars: number }> = {
  common: { zh: '宝宝', en: 'Little', stars: 1 },
  uncommon: { zh: '长大了', en: 'Growing', stars: 2 },
  rare: { zh: '成年了', en: 'Grown', stars: 3 },
  legend: { zh: '传说', en: 'Legendary', stars: 4 },
};

export const CREATURE_TYPES: Record<CreatureType, { zh: string; en: string; icon: string; color: string }> = {
  water: { zh: '水', en: 'Water', icon: 'water', color: '#3ba9f5' },
  plant: { zh: '花草', en: 'Plant', icon: 'leaf', color: '#5cbf4a' },
  sky: { zh: '天空', en: 'Sky', icon: 'cloud', color: '#8fb8e8' },
  light: { zh: '阳光', en: 'Sunshine', icon: 'sun', color: '#ffc531' },
  night: { zh: '夜晚', en: 'Night', icon: 'moon', color: '#4a4f8f' },
  earth: { zh: '大地', en: 'Earth', icon: 'mountain', color: '#a7835c' },
  snow: { zh: '冰雪', en: 'Snow', icon: 'snowflake', color: '#9fd3ef' },
};

export const COLORS: Record<string, { zh: string; en: string; css: string }> = {
  red: { zh: '红色', en: 'red', css: '#e53935' },
  orange: { zh: '橙色', en: 'orange', css: '#fb8c00' },
  yellow: { zh: '黄色', en: 'yellow', css: '#fdd835' },
  blue: { zh: '蓝色', en: 'blue', css: '#1e88e5' },
  green: { zh: '绿色', en: 'green', css: '#43a047' },
  pink: { zh: '粉色', en: 'pink', css: '#f48fb1' },
  purple: { zh: '紫色', en: 'purple', css: '#8e24aa' },
  brown: { zh: '棕色', en: 'brown', css: '#8d6e63' },
  white: { zh: '白色', en: 'white', css: '#fafafa' },
  gray: { zh: '灰色', en: 'gray', css: '#9e9e9e' },
  black: { zh: '黑色', en: 'black', css: '#212121' },
};

interface Phrase { en: string; zh: string; icon: string }
const TYPE_HOBBY: Record<CreatureType, Phrase> = {
  water: { en: 'It loves to swim.', zh: '它最喜欢游泳。', icon: 'waves' },
  plant: { en: 'It loves flowers.', zh: '它最喜欢闻花香。', icon: 'flower' },
  sky: { en: 'It loves to float in the wind.', zh: '它最喜欢随风飘。', icon: 'cloud' },
  light: { en: 'It loves warm sunshine.', zh: '它最喜欢晒太阳。', icon: 'sun' },
  night: { en: 'It loves to look at the stars.', zh: '它最喜欢看星星。', icon: 'star' },
  earth: { en: 'It loves to dig.', zh: '它最喜欢挖沙子。', icon: 'shovel' },
  snow: { en: 'It loves snow.', zh: '它最喜欢下雪天。', icon: 'snowman' },
};

interface Food extends Phrase { one: string }
/** en 用于 "It likes …"（复数），one 用于 "Here is …"（单个） */
const COLOR_FOOD: Record<string, Food> = {
  red: { en: 'strawberries', one: 'a strawberry', zh: '草莓', icon: 'strawberry' },
  orange: { en: 'carrots', one: 'a carrot', zh: '胡萝卜', icon: 'carrot' },
  yellow: { en: 'bananas', one: 'a banana', zh: '香蕉', icon: 'banana' },
  blue: { en: 'blueberries', one: 'some blueberries', zh: '蓝莓', icon: 'blueberry' },
  green: { en: 'apples', one: 'an apple', zh: '苹果', icon: 'apple-green' },
  pink: { en: 'peaches', one: 'a peach', zh: '桃子', icon: 'peach' },
  purple: { en: 'grapes', one: 'some grapes', zh: '葡萄', icon: 'grapes' },
  brown: { en: 'cookies', one: 'a cookie', zh: '饼干', icon: 'cookie' },
  white: { en: 'rice balls', one: 'a rice ball', zh: '饭团', icon: 'riceball' },
  gray: { en: 'nuts', one: 'some nuts', zh: '坚果', icon: 'nuts' },
  black: { en: 'cake', one: 'a piece of cake', zh: '蛋糕', icon: 'cake' },
};

export const hobby = (c: Creature): Phrase => TYPE_HOBBY[c.types[0] as CreatureType] ?? TYPE_HOBBY.plant;
export const favoriteFood = (c: Creature): Food => COLOR_FOOD[c.color] ?? COLOR_FOOD.red;

/** 幼儿版描述：1–2 句中英对照，按颜色、属性、爱好模板生成，离线可用 */
export function kidDescription(c: Creature): { en: string; zh: string } {
  const color = COLORS[c.color] ?? COLORS.yellow;
  const type = CREATURE_TYPES[c.types[0] as CreatureType] ?? CREATURE_TYPES.plant;
  const h = hobby(c), f = favoriteFood(c);
  return {
    en: `${c.nameEn} is ${withArticle(color.en)} island friend. It is ${withArticle(type.en)} type. ${h.en} It likes ${f.en}.`,
    zh: `${c.nameZh}是${color.zh}的小精灵，它是${type.zh}属性。${h.zh}它爱吃${f.zh}。`,
  };
}

export const friendshipLevel = (f: number) => Math.min(5, Math.floor(f / 20));
