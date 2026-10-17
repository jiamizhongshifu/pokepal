import { C, INK, c, dot, e, face, hl, line, p, poly, rect } from "./draw";

/** 食物 */
export const FOOD_ICONS: Record<string, string> = {
  apple: p("M32 18 C22 10 8 16 8 32 C8 48 20 58 32 54 C44 58 56 48 56 32 C56 16 42 10 32 18 Z", C.red) + line("M32 18 C32 12 34 8 38 6", 3.5) + e(42, 10, 7, 4, C.green, -25) + hl(19, 28, 4, 7, 20),
  "apple-green": p("M32 18 C22 10 8 16 8 32 C8 48 20 58 32 54 C44 58 56 48 56 32 C56 16 42 10 32 18 Z", C.green) + line("M32 18 C32 12 34 8 38 6", 3.5) + e(42, 10, 7, 4, C.leaf, -25) + hl(19, 28, 4, 7, 20),
  banana: p("M10 16 C8 40 24 56 52 50 C56 49 56 45 52 44 C30 46 18 34 18 14 C18 9 11 10 10 16 Z", C.yellow) + line("M14 14 L14 8", 4, C.dark) + line("M20 30 C24 40 32 44 42 46", 2.5, C.gold),
  strawberry: p("M10 22 C14 14 24 16 32 18 C40 16 50 14 54 22 C58 34 44 58 32 58 C20 58 6 34 10 22 Z", C.red) + p("M20 18 L26 8 L32 16 L38 8 L44 18 C38 22 26 22 20 18 Z", C.green) + [[22, 30], [32, 28], [42, 30], [26, 40], [38, 40], [32, 50]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.6" ry="2.4" fill="${C.yellow}"/>`).join(""),
  grapes: line("M32 10 C32 6 36 4 40 4", 3) + e(42, 10, 7, 4, C.green, 20) + [[22, 18], [34, 18], [46, 18], [28, 30], [40, 30], [22, 42], [34, 42], [46, 42], [34, 54]].filter((_, i) => i !== 5 && i !== 7).map(([x, y]) => c(x, y, 7, C.violet)).join("") + hl(26, 26, 2, 2),
  cake: p("M8 36 L32 18 L56 36 Z", C.rose) + rect(8, 36, 48, 20, 3, C.cloud) + line("M8 44 H56", 4, C.pink) + c(32, 14, 5, C.red) + line("M33 9 Q36 4 40 6", 2.5),
  milk: p("M18 14 H46 L42 58 H22 Z", C.white) + p("M20 28 H44 L42 58 H22 Z", C.cloud) + `<text x="32" y="48" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="800" font-size="11" fill="${C.deep}">MILK</text>`,
  egg: e(32, 34, 18, 23, C.white) + hl(24, 24, 4, 7, 20) + face(32, 38, 6, { blush: C.pink, size: 2 }),
  watermelon: p("M4 24 H60 C60 42 48 56 32 56 C16 56 4 42 4 24 Z", C.leaf) + p("M9 24 H55 C55 38 45 50 32 50 C19 50 9 38 9 24 Z", C.red) + [[20, 32], [32, 36], [44, 32], [26, 42], [38, 42]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="2.8" fill="${INK}"/>`).join(""),
  carrot: p("M38 12 C48 14 52 22 48 28 L18 58 C14 61 9 57 11 52 L30 18 C32 14 34 11 38 12 Z", C.orange) + line("M24 40 L30 44 M32 28 L37 31 M18 50 L22 53", 2.5, C.dark) + p("M40 14 L44 2 L48 12 L60 8 L52 18 L58 24 L46 22 Z", C.green),
  cookie: c(32, 32, 25, C.brown) + [[22, 22], [38, 20], [44, 34], [28, 38], [36, 46], [18, 36]].map(([x, y]) => dot(x, y, 3.2, C.dark)).join("") + hl(22, 16, 4, 2, -30),
  icecream: p("M18 30 L32 60 L46 30 Z", C.gold) + line("M24 36 L38 50 M40 36 L28 52", 2, C.dark) + c(32, 24, 14, C.pink) + c(22, 30, 7, C.rose) + c(42, 30, 7, C.rose) + dot(32, 8, 4, C.red) + hl(28, 18, 3, 2),
  blueberry: c(22, 36, 13, C.deep) + c(42, 38, 12, C.blue) + c(32, 22, 11, C.deep) + poly([[32, 16], [30, 13], [32, 14], [34, 13]], C.ink) + hl(27, 18, 2, 2) + hl(38, 34, 2, 2),
  peach: p("M32 16 C16 10 6 26 10 40 C14 54 26 58 32 56 C38 58 50 54 54 40 C58 26 48 10 32 16 Z", C.pink) + line("M32 18 C30 30 32 44 30 54", 2.5, "#ff7fb3") + e(40, 10, 8, 4, C.green, -25) + hl(20, 28, 4, 7, 20),
  riceball: p("M32 6 C40 6 58 40 56 48 C54 56 10 56 8 48 C6 40 24 6 32 6 Z", C.white) + rect(20, 38, 24, 18, 3, C.ink) + face(32, 28, 7, { blush: C.pink, size: 2 }),
  nuts: p("M22 10 C34 6 42 14 40 24 C38 30 44 34 46 42 C48 54 34 60 24 54 C14 48 18 38 18 32 C18 26 10 14 22 10 Z", C.brown) + line("M24 20 L30 18 M30 42 L36 40", 2.5, C.dark)
};

/** 物品 */
export const THING_ICONS: Record<string, string> = {
  ball: c(32, 32, 26, C.white) + poly([[32, 22], [41, 29], [38, 40], [26, 40], [23, 29]], C.ink) + line("M32 22 V8 M41 29 L54 24 M38 40 L46 52 M26 40 L18 52 M23 29 L10 24", 3),
  car: p("M6 42 V34 C6 30 9 28 12 28 L20 16 H42 L52 28 C56 28 58 31 58 34 V42 Z", C.red) + rect(22, 19, 8, 9, 2, C.sky) + rect(33, 19, 9, 9, 2, C.sky) + c(18, 44, 7, C.ink) + c(46, 44, 7, C.ink) + dot(18, 44, 2.5, C.gray) + dot(46, 44, 2.5, C.gray) + dot(55, 34, 2, C.yellow),
  book: p("M32 16 C24 10 12 10 6 14 V52 C12 48 24 48 32 54 Z", C.blue) + p("M32 16 C40 10 52 10 58 14 V52 C52 48 40 48 32 54 Z", C.sky) + line("M12 24 C18 22 22 22 26 24 M12 32 C18 30 22 30 26 32 M38 24 C42 22 46 22 52 24", 2.5, C.white),
  cap: p("M10 38 C10 20 20 12 32 12 C44 12 54 20 54 38 Z", C.red) + p("M10 38 C10 30 20 28 32 28 V38 Z", C.white) + p("M30 38 H60 C60 44 54 46 46 46 H30 Z", C.red) + c(32, 28, 5, C.white),
  train: rect(8, 20, 34, 28, 4, C.blue) + rect(14, 26, 10, 9, 2, C.sky) + rect(42, 30, 14, 18, 3, C.deep) + rect(36, 10, 8, 10, 2, C.ink) + c(18, 50, 6, C.ink) + c(36, 50, 6, C.ink) + c(50, 50, 4, C.ink) + e(42, 6, 6, 3, C.cloud),
  balloon: e(32, 26, 18, 21, C.red) + p("M29 46 L35 46 L32 50 Z", C.red) + line("M32 50 Q26 56 32 62", 2.5) + hl(24, 18, 4, 7, 25),
  umbrella: p("M6 32 C6 16 18 6 32 6 C46 6 58 16 58 32 C54 28 48 28 45 32 C42 28 36 28 32 32 C28 28 22 28 19 32 C16 28 10 28 6 32 Z", C.violet) + line("M32 32 V52 C32 58 24 58 24 52", 4) + line("M32 6 L19 32 M32 6 L45 32", 2, C.lilac),
  rocket: p("M32 4 C44 14 46 30 42 46 H22 C18 30 20 14 32 4 Z", C.white) + c(32, 24, 6, C.sky) + p("M22 34 L12 48 L22 46 Z", C.red) + p("M42 34 L52 48 L42 46 Z", C.red) + p("M26 46 H38 L32 60 Z", C.orange),
  yoyo: c(32, 36, 22, C.violet) + c(32, 36, 10, C.lilac) + line("M32 14 V2", 2.5) + hl(22, 26, 4, 3, -30),
  crown: p("M8 48 L10 18 L22 32 L32 12 L42 32 L54 18 L56 48 Z", C.yellow) + rect(8, 46, 48, 8, 3, C.gold) + dot(32, 34, 3.5, C.red) + dot(18, 38, 2.5, C.blue) + dot(46, 38, 2.5, C.blue)
};

/** 动物（圆头正面，和宝可梦的可爱风格一致） */
export const ANIMAL_ICONS: Record<string, string> = {
  cat: poly([[12, 26], [14, 6], [28, 18]], C.orange) + poly([[52, 26], [50, 6], [36, 18]], C.orange) + e(32, 36, 22, 19, C.orange) + face(32, 34, 8, { blush: C.pink }) + line("M8 38 H18 M8 44 L18 42 M56 38 H46 M56 44 L46 42", 2),
  dog: e(32, 34, 20, 20, C.brown) + e(12, 30, 7, 14, C.dark, 15) + e(52, 30, 7, 14, C.dark, -15) + e(32, 42, 9, 7, C.skin) + face(32, 30, 8, { mouth: false }) + e(32, 38, 3.5, 2.5, C.ink),
  fish: p("M48 32 L60 20 V44 Z", C.blue) + e(30, 32, 22, 15, C.blue) + dot(18, 29, 3) + dot(19, 28, 1, "#fff") + line("M28 22 C34 28 34 36 28 42", 2.5, C.deep) + hl(24, 24, 4, 2),
  bird: e(32, 36, 20, 18, C.blue) + e(36, 40, 11, 8, C.sky, -20) + face(26, 30, 5, { mouth: false, size: 2.4 }) + poly([[16, 34], [6, 37], [16, 40]], C.yellow) + line("M26 54 V60 M36 54 V60", 3),
  duck: e(34, 42, 22, 14, C.yellow) + c(22, 22, 13, C.yellow) + poly([[8, 22], [0, 26], [9, 29]], C.orange) + dot(20, 19, 2.6) + e(40, 40, 10, 6, C.gold, -15),
  rabbit: e(22, 16, 6, 15, C.white, -10) + e(42, 16, 6, 15, C.white, 10) + `<ellipse cx="22" cy="16" rx="2.5" ry="10" fill="${C.pink}" transform="rotate(-10 22 16)"/><ellipse cx="42" cy="16" rx="2.5" ry="10" fill="${C.pink}" transform="rotate(10 42 16)"/>` + e(32, 42, 20, 17, C.white) + face(32, 40, 7, { blush: C.pink }),
  frog: c(20, 18, 9, C.green) + c(44, 18, 9, C.green) + e(32, 38, 24, 18, C.green) + dot(20, 18, 4) + dot(44, 18, 4) + line("M20 42 Q32 50 44 42", 3) + `<ellipse cx="14" cy="38" rx="3.5" ry="2.2" fill="${C.pink}"/><ellipse cx="50" cy="38" rx="3.5" ry="2.2" fill="${C.pink}"/>`,
  turtle: e(48, 44, 8, 7, C.green) + e(14, 50, 5, 4, C.green) + e(46, 54, 5, 4, C.green) + p("M8 44 C8 26 18 16 30 16 C42 16 52 26 52 44 Z", C.leaf) + poly([[30, 22], [38, 28], [36, 38], [24, 38], [22, 28]], C.green) + c(52, 34, 9, C.green) + dot(55, 32, 2),
  bee: e(18, 20, 10, 8, C.white, -20) + e(42, 18, 10, 8, C.white, 20) + e(30, 38, 20, 16, C.yellow) + line("M24 24 V52 M34 23 V53", 5) + dot(14, 36, 2.5) + poly([[50, 36], [60, 38], [50, 42]], C.ink),
  fox: poly([[10, 28], [10, 4], [26, 16]], C.orange) + poly([[54, 28], [54, 4], [38, 16]], C.orange) + p("M8 26 C8 16 20 12 32 12 C44 12 56 16 56 26 C56 40 44 56 32 56 C20 56 8 40 8 26 Z", C.orange) + p("M8 28 C16 32 26 40 32 56 C38 40 48 32 56 28 C50 46 42 56 32 56 C22 56 14 46 8 28 Z", C.white) + face(32, 30, 9, { mouth: false }) + dot(32, 46, 3),
  zebra: e(32, 34, 18, 24, C.white) + line("M16 26 H24 M15 36 H23 M40 26 H48 M41 36 H49 M26 12 L30 18 M38 12 L34 18", 3.5) + e(32, 50, 12, 8, C.gray) + dot(28, 50, 1.8) + dot(36, 50, 1.8) + face(32, 30, 7, { mouth: false }),
  nose: c(32, 32, 26, C.skin) + p("M32 16 C34 26 42 34 40 40 C38 46 26 46 24 40 C22 34 30 26 32 16 Z", "#ffc79f") + dot(28, 41, 2) + dot(36, 41, 2)
};
