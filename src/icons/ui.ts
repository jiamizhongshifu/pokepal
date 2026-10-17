import { C, INK, c, dot, e, face, gearPath, hl, line, oline, p, poly, rect, starPts } from "./draw";

/** 界面图标：导航、操作、状态、反馈 */
export const UI_ICONS: Record<string, string> = {
  back: oline("M38 14 L20 32 L38 50", C.white, 6),
  close: oline("M20 20 L44 44 M44 20 L20 44", C.white, 5),
  bolt:
    poly([[37, 5], [13, 36], [29, 36], [25, 59], [51, 26], [35, 26]], C.yellow, 2.4) +
    line("M33 13 L22 31", 2.4, "#fff3b0") +
    hl(30, 20, 2.5, 7, 30) +
    p("M52 8 L53.5 12 L57.5 13.5 L53.5 15 L52 19 L50.5 15 L46.5 13.5 L50.5 12 Z", C.white) +
    dot(12, 50, 1.8, C.gold),
  gear:
    p(gearPath(32, 32, 26, 20, 8), C.lilac) +
    c(32, 32, 9, C.white) +
    hl(22, 20, 5, 3, -35),
  tasks:
    rect(12, 10, 40, 48, 9, C.white) +
    rect(16, 18, 32, 36, 5, "#f3f7ff") +
    rect(22, 4, 20, 12, 6, C.violet) +
    c(32, 9, 2.2, C.white) +
    c(24.5, 30, 5.5, C.green) +
    line("M22 30 L24 32.5 L27.5 28", 2.4, C.white) +
    line("M34 30 H44", 3.5, C.blue) +
    c(24.5, 45, 5.5, C.green) +
    line("M22 45 L24 47.5 L27.5 43", 2.4, C.white) +
    line("M34 45 H41", 3.5, C.blue) +
    hl(17, 20, 2, 5),
  gift:
    rect(10, 28, 44, 28, 7, C.red) +
    dot(18, 46, 2, "#ff8a98") + dot(46, 38, 2, "#ff8a98") + dot(44, 50, 1.6, "#ff8a98") + dot(19, 36, 1.4, "#ff8a98") +
    rect(6, 19, 52, 12, 6, C.pink) +
    rect(27, 19, 10, 37, 3, C.yellow) +
    p("M32 19 C24 6 12 10 18 17 C21 20 28 19 32 19 Z", C.yellow) +
    p("M32 19 C40 6 52 10 46 17 C43 20 36 19 32 19 Z", C.yellow) +
    c(32, 18, 4, C.gold) +
    hl(16, 38, 2.5, 5) +
    hl(12, 23, 2, 1.5),
  grass:
    p("M6 58 C8 50 20 47 32 47 C44 47 56 50 58 58 Z", "#8fd35c") +
    p("M10 56 C12 40 18 30 26 24 C22 34 22 44 24 56 Z", C.green) +
    p("M22 56 C22 38 28 22 36 12 C34 28 36 42 40 56 Z", C.leaf) +
    p("M36 56 C38 42 44 32 54 26 C48 36 48 46 50 56 Z", C.green) +
    c(50, 46, 3.6, C.pink) +
    dot(50, 46, 1.4, C.yellow) +
    hl(29, 30, 2, 7, 25) +
    hl(15, 44, 1.4, 4, 20),
  dex:
    rect(10, 6, 44, 52, 11, C.red) +
    line("M10 26 H54", 2.2, "#c93b4c") +
    rect(16, 31, 32, 21, 6, C.sky) +
    c(22, 16, 7.5, C.white) +
    c(22, 16, 5, C.blue) +
    hl(20, 14, 2, 1.6) +
    dot(35, 13, 2.6, C.yellow) +
    dot(42, 13, 2.6, C.green) +
    dot(48.5, 13, 2.2, C.white) +
    c(26, 41.5, 4.5, C.white) +
    line("M21.5 41.5 H30.5", 1.6) +
    line("M35 39 H43 M35 45 H40", 2.6, C.deep) +
    hl(15, 46, 1.6, 4),
  home:
    p("M8 30 L32 9 L56 30", C.red) +
    rect(14, 28, 36, 28, 4, C.white) +
    rect(27, 38, 11, 18, 4, C.yellow) +
    rect(39, 33, 7, 7, 2, C.sky) +
    p("M8 30 L32 9 L56 30 Z", C.red),
  speaker:
    p("M8 25 H18 L32 13 V51 L18 39 H8 Z", C.white) +
    line("M40 23 Q46 32 40 41", 4, C.blue) +
    line("M47 16 Q58 32 47 48", 4, C.deep),
  mic:
    rect(22, 6, 20, 32, 10, C.white) +
    line("M27 16 H37 M27 22 H37 M27 28 H37", 2.5, C.lilac) +
    line("M14 30 Q14 48 32 48 Q50 48 50 30", 4) +
    line("M32 48 V58 M22 58 H42", 4) +
    hl(27, 12, 2, 3),
  ear:
    p("M40 10 C24 6 12 18 14 32 C15 40 22 42 22 50 C22 58 34 60 38 52 C41 46 48 42 50 32 C52 20 48 12 40 10 Z", C.skin) +
    line("M24 30 C24 22 32 18 38 22 C44 26 40 34 34 36 C30 38 32 44 28 46", 3) +
    `<ellipse cx="46" cy="40" rx="3" ry="2" fill="${C.pink}" opacity=".7"/>`,
  check: c(32, 32, 26, C.green) + oline("M19 33 L28 42 L46 22", C.white, 5) + hl(21, 18, 5, 3, -35),
  star: poly(starPts(32, 33, 27, 12.5), C.yellow) + hl(26, 22, 3, 5, 30),
  "star-empty": poly(starPts(32, 33, 27, 12.5), C.cloud),
  heart: p("M32 54 C14 42 6 32 8 22 C10 12 24 8 32 20 C40 8 54 12 56 22 C58 32 50 42 32 54 Z", C.red) + hl(19, 21, 4, 3, -30),
  "heart-empty": p("M32 54 C14 42 6 32 8 22 C10 12 24 8 32 20 C40 8 54 12 56 22 C58 32 50 42 32 54 Z", C.cloud),
  sparkle: p("M32 4 C34 22 42 30 60 32 C42 34 34 42 32 60 C30 42 22 34 4 32 C22 30 30 22 32 4 Z", C.yellow) + hl(28, 22, 2, 5),
  party:
    p("M8 58 L22 18 L48 44 Z", C.yellow) +
    line("M14 40 L30 48 M18 29 L39 41", 3, C.red) +
    dot(40, 10, 3.5, C.blue) + dot(52, 20, 3, C.pink) + dot(55, 8, 2.5, C.green) +
    line("M34 22 Q40 14 34 8", 3, C.violet) + line("M44 32 Q52 30 56 36", 3, C.red),
  search: c(27, 27, 16, C.sky) + line("M39 39 L54 54", 8) + line("M39 39 L54 54", 4, C.violet) + hl(21, 21, 4, 3, -35),
  swipe:
    oline("M32 50 V14", C.white, 5) +
    oline("M20 26 L32 13 L44 26", C.white, 5) +
    oline("M20 42 L32 30 L44 42", C.lilac, 5),
  sign:
    rect(29, 30, 6, 28, 2, C.brown) +
    rect(8, 10, 48, 26, 6, C.brown) +
    line("M16 19 H44 M16 27 H36", 3, C.dark),
  hand:
    rect(16, 30, 30, 26, 12, C.skin) +
    rect(17, 12, 7, 24, 3.5, C.skin) +
    rect(25, 8, 7, 26, 3.5, C.skin) +
    rect(33, 10, 7, 24, 3.5, C.skin) +
    rect(41, 16, 7, 20, 3.5, C.skin) +
    rect(6, 32, 16, 8, 4, C.skin, -35) +
    `<ellipse cx="31" cy="44" rx="7" ry="4" fill="${C.pink}" opacity=".6"/>`,
  moon: p("M40 6 C24 10 16 26 22 40 C28 54 46 58 58 48 C40 50 28 36 32 22 C34 14 38 9 40 6 Z", C.yellow) + dot(38, 36, 2.5, C.gold) + dot(30, 44, 2, C.gold) + hl(26, 26, 2.5, 6, 20),
  ruler:
    rect(6, 22, 52, 20, 4, C.yellow, -30) +
    line("M17 37 L20 42 M24 33 L27 38 M31 29 L34 34 M38 25 L41 30 M45 21 L48 26", 3),
  weight:
    p("M20 24 H44 L52 56 H12 Z", C.gray) +
    c(32, 15, 8, "none") +
    `<text x="32" y="47" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="14" fill="${INK}">KG</text>`,
  eraser:
    rect(8, 22, 48, 22, 6, C.pink, -30) +
    p("M18 41 L35 31 L44 47 L28 56 Z", C.blue) +
    line("M8 60 H56", 3, C.lilac),
  backspace: p("M22 14 H54 C56 14 58 16 58 18 V46 C58 48 56 50 54 50 H22 L6 32 Z", C.white) + oline("M30 24 L46 40 M46 24 L30 40", C.red, 3),
  zz:
    line("M8 30 H26 L12 46 H28", 4, C.blue) +
    line("M32 12 H48 L36 26 H50", 4, C.violet) +
    line("M48 40 H58 L50 50 H60", 3, C.deep),
  bowl:
    p("M8 30 H56 C56 46 46 56 32 56 C18 56 8 46 8 30 Z", C.blue) +
    p("M10 30 C12 18 24 14 32 18 C40 14 52 18 54 30 Z", C.white) +
    dot(24, 24, 1.8, C.rose) + dot(36, 22, 1.8, C.rose) +
    `<ellipse cx="32" cy="42" rx="6" ry="4" fill="#fff" opacity=".5"/>`,
  balloon:
    e(32, 26, 18, 21, C.red) +
    p("M29 46 L35 46 L32 50 Z", C.red) +
    line("M32 50 Q26 56 32 62", 2.5) +
    hl(24, 18, 4, 7, 25),
  bubbles: c(24, 38, 15, C.sky) + hl(18, 32, 4, 3, -30) + c(46, 20, 10, C.sky) + hl(42, 16, 3, 2, -30) + c(48, 46, 6, C.sky),
  speak:
    p("M8 14 C8 10 11 8 14 8 H50 C53 8 56 10 56 14 V38 C56 42 53 44 50 44 H26 L14 56 V44 C11 44 8 42 8 38 Z", C.white) +
    dot(22, 26, 3.5, C.violet) + dot(32, 26, 3.5, C.deep) + dot(42, 26, 3.5, C.blue),
  picture:
    rect(6, 10, 52, 44, 6, C.yellow) +
    rect(12, 16, 40, 32, 3, C.sky) +
    p("M12 48 L26 30 L36 42 L42 36 L52 48 Z", C.green) +
    c(44, 24, 4, C.white),
  pencil:
    p("M14 50 L44 8 L54 15 L24 57 L12 60 Z", C.yellow) +
    p("M14 50 L24 57 L12 60 Z", C.skin) +
    p("M40 13 L50 20 L54 15 L44 8 Z", C.pink) +
    line("M19 54 L49 12", 2, C.gold),
  dizzy:
    c(32, 32, 26, C.yellow) +
    line("M18 26 C18 20 26 20 26 26 C26 30 20 30 21 26", 2.5) +
    line("M38 26 C38 20 46 20 46 26 C46 30 40 30 41 26", 2.5) +
    e(32, 44, 6, 4, C.red),
  flame:
    p("M32 4 C36 16 50 20 50 38 C50 50 42 58 32 58 C22 58 14 50 14 38 C14 28 22 24 24 14 C28 20 28 26 30 28 C32 20 32 12 32 4 Z", C.orange) +
    p("M32 30 C34 36 42 40 42 48 C42 54 37 58 32 58 C27 58 22 54 22 48 C22 42 28 40 32 30 Z", C.yellow),
  refresh: oline("M48 22 A18 18 0 1 0 50 38", C.white, 5) + poly([[50, 10], [52, 26], [38, 22]], C.white),
  play: c(32, 32, 26, C.violet) + poly([[26, 20], [44, 32], [26, 44]], C.white),
  lock: rect(12, 28, 40, 28, 7, C.gold) + line("M20 28 V20 C20 8 44 8 44 20 V28", 5) + dot(32, 41, 4),
  "pokeball":
    c(32, 32, 26, C.white) +
    p("M6 32 A26 26 0 0 1 58 32 Z", C.red) +
    line("M6 32 H58", 3.5) +
    c(32, 32, 7, C.white) +
    hl(20, 18, 5, 3, -35),
  trophy:
    p("M18 8 H46 V24 C46 34 40 40 32 40 C24 40 18 34 18 24 Z", C.yellow) +
    line("M18 14 H10 C10 24 14 28 20 28 M46 14 H54 C54 24 50 28 44 28", 3.5) +
    rect(26, 40, 12, 8, 2, C.gold) + rect(18, 48, 28, 8, 3, C.violet) + hl(26, 18, 2.5, 6),
  face: c(32, 32, 26, C.yellow) + face(32, 30, 8, { blush: C.red })
};
