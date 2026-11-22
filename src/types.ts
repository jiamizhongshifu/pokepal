export type Lang = "en" | "zh";
export type Rarity = "common" | "uncommon" | "rare" | "legend";
export type BallType = "poke" | "great" | "ultra" | "master";
export type TaskKind = "listen" | "repeat" | "wordpic" | "trace";

/** One growth stage of an original island creature (see src/data/creatures.ts). */
export interface Creature {
  id: number;
  species: string;
  stage: number;
  nameEn: string;
  nameZh: string;
  genusEn: string;
  genusZh: string;
  types: string[];
  color: string;
  heightCm: number;
  isFinal: boolean;
  evolvesTo: number[];
  /** Grown-up stages come only from growing up, never from a first meeting. */
  evoOnly?: boolean;
  rarity: Rarity;
}

export interface Capture {
  /** Retired with the old island screen (a liked activity, care timers); kept as stored, never read. */
  personality?: Record<string, unknown>;
  care?: Record<string, unknown>;
  id: number;
  caughtAt: number;
  ball: BallType;
  /** 0–100，每 20 点一级 */
  friendship: number;
  /** Island activities and shared practice done together; growing up follows it. */
  played?: number;
  /** 满友好度时选择了“保持现在的样子”（之后仍可随时长大，只是不再提醒） */
  stay?: boolean;
}

export interface Daily {
  adventureReward?: number; // Shared daily story reward, separate from checkpoint.
  participated?: import("./lib/participation").ParticipationKind[];
  goalDone?: boolean;
  courseUnits?: string[]; // Themes rewarded today; reset with the daily record.
  /** Things finished on the island today (errands, parties, activities); three make the island's day. */
  islandDone?: number;
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
  storyPace?: 'normal'|'slow';
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
  /**
   * Retired with the old island screen (gifts and upgrades, furniture and shared-play memories, picnics): kept as
   * stored so nothing a family made is deleted, but never read again — except the stickers a child hid (`hidden`).
   */
  islandProgress?: Record<string, unknown> & { hidden?: string[] };
  islandLiving?: Record<string, unknown>;
  picnic?: Record<string, unknown>;
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
  /** 好朋友相册记录：认识过或长大得到过的小精灵（长大后原来的形态也保留在好朋友相册里） */
  dex?: number[];
  /** 想在草丛遇见的伙伴；可选以兼容旧存档。 */
  catchWish?: number;
  /** 绘本已读页数；可选以兼容旧存档。 */
  storyProgress?: Record<string,number>;
  /** Learning path record: chapter friends, celebrated stops and the one-time energy retirement. */
  path?: import('./lib/learningPath').PathRecord;
  /** Retired care-afternoon story; kept as saved so older versions can still read it. */
  careStory?: Record<string, unknown>;
  /** Today's little wishes already done (companion ids), by local date. */
  islandWishes?: import("./island/plays").WishState;
  /** What errands left on the island (lesson id → when), shown for a few days. */
  islandTraces?: import("./island/errands").IslandTraces;
  /** Chapter parties held on the island (chapter index → when). */
  islandParties?: import("./island/parties").IslandParties;
  storyAdventure?: import("./lib/storyPlayer").StoryPlayback;
  /** 可选字段兼容旧存档；花园不消耗能量，不绑定每日任务。 */
  /** Legacy flower-care save; retained for import compatibility, no longer used by gameplay. */
  garden?: { bloomed: boolean };
  farm?: import('./lib/farm').FarmState;
}
