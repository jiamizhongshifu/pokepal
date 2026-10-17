/** 词库：图片用自绘 SVG 图标或纯色块，保证离线、风格统一。 */
export interface PicWord {
  en: string;
  zh: string;
  /** 图标名（见 src/icons），颜色词用 css 色块 */
  icon?: string;
  css?: string;
  theme: "color" | "food" | "animal" | "nature" | "thing";
  level: 1 | 2;
}

export const PIC_WORDS: PicWord[] = [
  { en: "red", zh: "红色", css: "#e53935", theme: "color", level: 1 },
  { en: "yellow", zh: "黄色", css: "#fdd835", theme: "color", level: 1 },
  { en: "blue", zh: "蓝色", css: "#1e88e5", theme: "color", level: 1 },
  { en: "green", zh: "绿色", css: "#43a047", theme: "color", level: 1 },
  { en: "pink", zh: "粉色", css: "#f48fb1", theme: "color", level: 1 },
  { en: "purple", zh: "紫色", css: "#8e24aa", theme: "color", level: 2 },
  { en: "orange", zh: "橙色", css: "#fb8c00", theme: "color", level: 2 },
  { en: "apple", zh: "苹果", icon: "apple", theme: "food", level: 1 },
  { en: "banana", zh: "香蕉", icon: "banana", theme: "food", level: 1 },
  { en: "strawberry", zh: "草莓", icon: "strawberry", theme: "food", level: 1 },
  { en: "grapes", zh: "葡萄", icon: "grapes", theme: "food", level: 1 },
  { en: "cake", zh: "蛋糕", icon: "cake", theme: "food", level: 1 },
  { en: "milk", zh: "牛奶", icon: "milk", theme: "food", level: 1 },
  { en: "egg", zh: "鸡蛋", icon: "egg", theme: "food", level: 1 },
  { en: "watermelon", zh: "西瓜", icon: "watermelon", theme: "food", level: 2 },
  { en: "carrot", zh: "胡萝卜", icon: "carrot", theme: "food", level: 2 },
  { en: "cookie", zh: "饼干", icon: "cookie", theme: "food", level: 2 },
  { en: "ice cream", zh: "冰淇淋", icon: "icecream", theme: "food", level: 2 },
  { en: "cat", zh: "小猫", icon: "cat", theme: "animal", level: 1 },
  { en: "dog", zh: "小狗", icon: "dog", theme: "animal", level: 1 },
  { en: "fish", zh: "小鱼", icon: "fish", theme: "animal", level: 1 },
  { en: "bird", zh: "小鸟", icon: "bird", theme: "animal", level: 1 },
  { en: "duck", zh: "鸭子", icon: "duck", theme: "animal", level: 1 },
  { en: "rabbit", zh: "兔子", icon: "rabbit", theme: "animal", level: 2 },
  { en: "frog", zh: "青蛙", icon: "frog", theme: "animal", level: 2 },
  { en: "turtle", zh: "乌龟", icon: "turtle", theme: "animal", level: 2 },
  { en: "bee", zh: "蜜蜂", icon: "bee", theme: "animal", level: 2 },
  { en: "sun", zh: "太阳", icon: "sun", theme: "nature", level: 1 },
  { en: "moon", zh: "月亮", icon: "moon", theme: "nature", level: 1 },
  { en: "star", zh: "星星", icon: "star", theme: "nature", level: 1 },
  { en: "tree", zh: "大树", icon: "tree", theme: "nature", level: 1 },
  { en: "flower", zh: "花", icon: "flower", theme: "nature", level: 1 },
  { en: "fire", zh: "火", icon: "fire", theme: "nature", level: 1 },
  { en: "water", zh: "水", icon: "water", theme: "nature", level: 1 },
  { en: "rainbow", zh: "彩虹", icon: "rainbow", theme: "nature", level: 2 },
  { en: "cloud", zh: "云朵", icon: "cloud", theme: "nature", level: 2 },
  { en: "ball", zh: "球", icon: "ball", theme: "thing", level: 1 },
  { en: "car", zh: "汽车", icon: "car", theme: "thing", level: 1 },
  { en: "book", zh: "书", icon: "book", theme: "thing", level: 1 },
  { en: "hat", zh: "帽子", icon: "cap", theme: "thing", level: 1 },
  { en: "train", zh: "火车", icon: "train", theme: "thing", level: 2 },
  { en: "balloon", zh: "气球", icon: "balloon", theme: "thing", level: 2 },
  { en: "umbrella", zh: "雨伞", icon: "umbrella", theme: "thing", level: 2 },
  { en: "rocket", zh: "火箭", icon: "rocket", theme: "thing", level: 2 }
];

export interface SayPhrase {
  en: string;
  zh: string;
  level: 1 | 2;
}

export const PHRASES: SayPhrase[] = [
  { en: "Hello!", zh: "你好！", level: 1 },
  { en: "Thank you!", zh: "谢谢！", level: 1 },
  { en: "Yummy!", zh: "好吃！", level: 1 },
  { en: "Good night!", zh: "晚安！", level: 1 },
  { en: "Good morning!", zh: "早上好！", level: 1 },
  { en: "Bye-bye!", zh: "再见！", level: 1 },
  { en: "I love you!", zh: "我爱你！", level: 1 },
  { en: "Wow!", zh: "哇！", level: 1 },
  { en: "Let's go!", zh: "出发！", level: 1 },
  { en: "Yes!", zh: "是的！", level: 1 },
  { en: "Fire!", zh: "火！", level: 1 },
  { en: "Water!", zh: "水！", level: 1 },
  { en: "Jump!", zh: "跳！", level: 1 },
  { en: "I'm happy!", zh: "我很开心！", level: 2 },
  { en: "Let's play!", zh: "我们一起玩吧！", level: 2 },
  { en: "I'm hungry.", zh: "我饿了。", level: 2 },
  { en: "Big hug!", zh: "大大的拥抱！", level: 2 },
  { en: "See you!", zh: "回头见！", level: 2 },
  { en: "Nice to meet you!", zh: "很高兴认识你！", level: 2 },
  { en: "I can jump!", zh: "我会跳！", level: 2 },
  { en: "Come here!", zh: "过来呀！", level: 2 },
  // 幼儿日常最常用的功能句：一听就会用
  { en: "Me too!", zh: "我也是！", level: 1 },
  { en: "My turn!", zh: "轮到我啦！", level: 1 },
  { en: "Look at me!", zh: "看我！", level: 1 },
  { en: "I did it!", zh: "我做到啦！", level: 1 },
  { en: "Help, please!", zh: "请帮帮我！", level: 2 },
  { en: "More, please!", zh: "再来一点！", level: 2 },
  { en: "All done!", zh: "做完啦！", level: 2 },
  // 日常需要、情绪和伙伴对话：允许请求、拒绝、暂停和修补。
  {"en": "I'm thirsty.", "zh": "我口渴了。", "level": 2},
  {"en": "Can I have an apple, please?", "zh": "请给我一个苹果，好吗？", "level": 2},
  {"en": "No, thank you.", "zh": "不用了，谢谢。", "level": 2},
  {"en": "I need a rest.", "zh": "我需要休息一下。", "level": 2},
  {"en": "I feel sad.", "zh": "我有点难过。", "level": 2},
  {"en": "I feel angry.", "zh": "我生气了。", "level": 2},
  {"en": "Let's take a breath!", "zh": "一起慢慢呼吸吧！", "level": 2},
  {"en": "Let's try again!", "zh": "我们再试一次吧！", "level": 2},
  {"en": "Stay with me, please.", "zh": "请陪陪我。", "level": 2},
  {"en": "I need some space.", "zh": "我想自己待一会儿。", "level": 2},
  {"en": "May I join you?", "zh": "我可以加入吗？", "level": 2},
  {"en": "Sorry.", "zh": "对不起。", "level": 2},
  {"en": "I'll help you.", "zh": "我来帮你。", "level": 2},
  {"en": "Your turn!", "zh": "轮到你啦！", "level": 2},
  {"en": "That's okay.", "zh": "没关系。", "level": 2},
  {"en": "Let's tidy up!", "zh": "我们一起收拾吧！", "level": 2}
];

/** 字母描红：A–Z 每个字母绑定一只宝可梦（有的话）或一个词 */
export interface LetterItem {
  letter: string;
  en: string;
  zh: string;
  pokemonId?: number;
  icon?: string;
}

export const LETTERS: LetterItem[] = [
  { letter: "A", en: "Abra", zh: "凯西", pokemonId: 63 },
  { letter: "B", en: "Bulbasaur", zh: "妙蛙种子", pokemonId: 1 },
  { letter: "C", en: "Charmander", zh: "小火龙", pokemonId: 4 },
  { letter: "D", en: "Dratini", zh: "迷你龙", pokemonId: 147 },
  { letter: "E", en: "Eevee", zh: "伊布", pokemonId: 133 },
  { letter: "F", en: "fish", zh: "小鱼", icon: "fish" },
  { letter: "G", en: "Growlithe", zh: "卡蒂狗", pokemonId: 58 },
  { letter: "H", en: "Horsea", zh: "墨海马", pokemonId: 116 },
  { letter: "I", en: "ice cream", zh: "冰淇淋", icon: "icecream" },
  { letter: "J", en: "Jigglypuff", zh: "胖丁", pokemonId: 39 },
  { letter: "K", en: "Krabby", zh: "大钳蟹", pokemonId: 98 },
  { letter: "L", en: "Lapras", zh: "拉普拉斯", pokemonId: 131 },
  { letter: "M", en: "Meowth", zh: "喵喵", pokemonId: 52 },
  { letter: "N", en: "nose", zh: "鼻子", icon: "nose" },
  { letter: "O", en: "Oddish", zh: "走路草", pokemonId: 43 },
  { letter: "P", en: "Pikachu", zh: "皮卡丘", pokemonId: 25 },
  { letter: "Q", en: "queen", zh: "女王", icon: "crown" },
  { letter: "R", en: "Raichu", zh: "雷丘", pokemonId: 26 },
  { letter: "S", en: "Squirtle", zh: "杰尼龟", pokemonId: 7 },
  { letter: "T", en: "tree", zh: "大树", icon: "tree" },
  { letter: "U", en: "umbrella", zh: "雨伞", icon: "umbrella" },
  { letter: "V", en: "Vulpix", zh: "六尾", pokemonId: 37 },
  { letter: "W", en: "watermelon", zh: "西瓜", icon: "watermelon" },
  { letter: "X", en: "xylophone", zh: "木琴", icon: "music" },
  { letter: "Y", en: "yo-yo", zh: "悠悠球", icon: "yoyo" },
  { letter: "Z", en: "zebra", zh: "斑马", icon: "zebra" }
];

export const PRAISE: { en: string; zh: string }[] = [
  { en: "Great job!", zh: "真棒！" },
  { en: "Wonderful!", zh: "太厉害了！" },
  { en: "Super!", zh: "超级棒！" },
  { en: "You did it!", zh: "你做到了！" },
  { en: "Awesome!", zh: "好厉害！" }
];

export function pickRandom<T>(arr: readonly T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
export const pickOne = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** "a" / "an"：按首字母是否元音判断，覆盖词库里的情况 */
export const withArticle = (word: string) => ["milk","water","grapes","ice cream"].includes(word) ? word : `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;
