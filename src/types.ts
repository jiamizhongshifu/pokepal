export type Lang = "en" | "zh";
export type Rarity = "common" | "uncommon" | "rare" | "legend";
export type BallType = "poke" | "great" | "ultra" | "master";
export type TaskKind = "listen" | "repeat" | "wordpic" | "trace";
export type InteractKind = "pet" | "feed" | "night";

export interface PokemonRaw {
  id: number;
  nameEn: string;
  nameZh: string;
  genusEn: string;
  genusZh: string;
  types: string[];
  color: string;
  habitat: string;
  heightCm: number;
  weightKg: number;
  captureRate: number;
  isBaby: boolean;
  isLegendary: boolean;
  isMythical: boolean;
  isFinal: boolean;
  flavorEn: string;
  flavorZh: string;
  /** 直接进化成的形态（可能有多种，如伊布） */
  evolvesTo: number[];
  /** 只能靠进化得到，不出现在草丛里 */
  evoOnly?: boolean;
}

export interface Pokemon extends PokemonRaw {
  rarity: Rarity;
}

export interface Capture {
  personality?:{version:1;preference:import("./lib/islandLiving").Preference};
  care?: import('./lib/companionCare').CompanionCare;
  id: number;
  caughtAt: number;
  ball: BallType;
  /** 0–100，每 20 点一级 */
  friendship: number;
  /** 满友好度时选择了“保持现在的样子”（之后仍可随时进化，只是不再提醒） */
  stay?: boolean;
}

export interface Daily {
  participated?: import("./lib/participation").ParticipationKind[];
  goalDone?: boolean;
  courseUnits?: string[]; // Themes rewarded today; reset with the daily record.
  storyReadPages?: Record<string,number[]>;
  date: string;
  energyEarned: number;
  board: TaskKind[];
  boardDone: boolean[];
  bonusGiven: boolean;
  tasksCompleted: number;
  /** 英文音频播放次数，不代表理解 */
  heard: number;
  /** 开口跟读次数 */
  spoken: number;
  words: string[];
  caught: number[];
  playSeconds: number;
  extraSeconds: number;
}

export interface DaySummary {
  date: string;
  energyEarned: number;
  tasksCompleted: number;
  heard: number;
  spoken: number;
  words: number;
  caught: number;
  playMinutes: number;
}

export interface Settings {
  dailyMinutes: number;
  tasksPerDay: 3 | 4;
  /** Compatibility field; learningProfile is the configured learning stage. */
  level: 1 | 2;
  learningProfile?: import("./lib/learningStage").LearningProfile;
  favorites: number[];
  speechRate: number;
  /** Original scene music, quiet by default; independent of teaching voice. */
  islandWeather?: import("./lib/weather").WeatherMode;
  environmentSound?: import("./lib/weather").NatureLevel;
  backgroundMusic?: "off" | "soft" | "normal";
  /** 高画质光影：实时环境光遮蔽（较耗性能，适合 iPad Pro） */
  hqLighting?: boolean;
  idleCamera?: boolean;
  /** 家园环境英语（磨耳朵）：关 / 少（约 50 秒一句）/ 多（约 25 秒一句），默认少 */
  ambientEnglish?: "off" | "some" | "more";
  /** 中文提示：双语（英文 → 中文提示 → 英文复述）/ 纯英文，默认双语 */
  storyMode?: 'listen'|'read';
  storyLanguage?: 'stage'|'short'|'full';
  englishMode?: "bilingual" | "english";
}

export interface WordStat {
  heard: number;
  spoken: number;
  correct: number;
}

export interface SaveData {
  onboarding?: import("./data/onboarding").Onboarding;
  islandProgress?:import("./lib/islandProgress").IslandProgress;
  islandLiving?:import("./lib/islandLiving").IslandLiving;
  picnic?: import('./lib/picnic').PicnicState;
  participation?: import("./lib/participation").Participation;
  /** Optional, migrated without changing existing captures or daily rewards. */
  learning?: import('./lib/learningProgress').LearningProgress;
  version: 1;
  trainer: { name: string; avatar: string; avatarPhoto?: string; createdAt: number } | null;
  energy: number;
  balls: Record<BallType, number>;
  captures: Capture[];
  daily: Daily;
  streak: { lastDate: string; count: number };
  wordStats: Record<string, WordStat>;
  settings: Settings;
  history: DaySummary[];
  /** 图鉴记录：抓到过或进化得到过的宝可梦（进化后原来的形态也保留在图鉴里） */
  dex?: number[];
  /** 想在草丛遇见的伙伴；可选以兼容旧存档。 */
  catchWish?: number;
  /** 绘本已读页数；可选以兼容旧存档。 */
  storyProgress?: Record<string,number>;
  /** 可选字段兼容旧存档；花园不消耗能量，不绑定每日任务。 */
  /** Legacy flower-care save; retained for import compatibility, no longer used by gameplay. */
  garden?: { bloomed: boolean };
  farm?: import('./lib/farm').FarmState;
}
