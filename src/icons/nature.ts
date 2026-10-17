import { C, c, dot, e, face, hl, line, p, poly, rect, starPts } from "./draw";

/** 属性、爱好、自然元素 */
const rays = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const x1 = 32 + Math.cos(a) * 20, y1 = 32 + Math.sin(a) * 20;
  const x2 = 32 + Math.cos(a) * 28, y2 = 32 + Math.sin(a) * 28;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`;
}).join(" ");

const snow = (() => {
  let d = "";
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    const dx = Math.cos(a) * 24, dy = Math.sin(a) * 24;
    d += `M${(32 - dx).toFixed(1)} ${(32 - dy).toFixed(1)} L${(32 + dx).toFixed(1)} ${(32 + dy).toFixed(1)} `;
    for (const s of [1, -1]) {
      const bx = 32 + s * dx * 0.62, by = 32 + s * dy * 0.62;
      const a1 = a + Math.PI / 4, a2 = a - Math.PI / 4;
      const k = 7 * s;
      d += `M${(bx + Math.cos(a1) * k).toFixed(1)} ${(by + Math.sin(a1) * k).toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)} L${(bx + Math.cos(a2) * k).toFixed(1)} ${(by + Math.sin(a2) * k).toFixed(1)} `;
    }
  }
  return d;
})();

const FLAME = "M32 4 C36 16 50 20 50 38 C50 50 42 58 32 58 C22 58 14 50 14 38 C14 28 22 24 24 14 C28 20 28 26 30 28 C32 20 32 12 32 4 Z";
const DROP = "M32 5 C40 20 50 30 50 41 C50 51 42 58 32 58 C22 58 14 51 14 41 C14 30 24 20 32 5 Z";
const LEAF = "M10 54 C8 30 24 10 54 8 C56 36 40 54 10 54 Z";
const CLOUD = "M16 46 C8 46 6 36 13 33 C12 24 22 20 28 25 C31 16 46 16 48 27 C56 26 60 36 54 42 C53 45 51 46 48 46 Z";
const WING = "M8 44 C14 24 32 12 56 10 C52 18 48 22 42 24 C48 25 50 28 46 32 C40 33 36 34 32 34 C36 36 36 40 32 42 C24 46 16 46 8 44 Z";

export const NATURE_ICONS: Record<string, string> = {
  sun: line(rays, 5, C.gold) + c(32, 32, 15, C.yellow) + face(32, 31, 5, { blush: C.orange, size: 2 }),
  moon: p("M40 6 C24 10 16 26 22 40 C28 54 46 58 58 48 C40 50 28 36 32 22 C34 14 38 9 40 6 Z", C.yellow) + hl(26, 26, 2.5, 6, 20),
  star: poly(starPts(32, 33, 27, 12.5), C.yellow) + hl(26, 22, 3, 5, 30),
  cloud: p(CLOUD, C.cloud) + hl(26, 30, 5, 3),
  rainbow:
    p("M4 50 A28 28 0 0 1 60 50 H52 A20 20 0 0 0 12 50 Z", C.red) +
    p("M12 50 A20 20 0 0 1 52 50 H45 A13 13 0 0 0 19 50 Z", C.yellow) +
    p("M19 50 A13 13 0 0 1 45 50 H38 A6 6 0 0 0 26 50 Z", C.blue) +
    e(10, 52, 8, 5, C.cloud) + e(54, 52, 8, 5, C.cloud),
  tree: rect(27, 36, 10, 22, 3, C.brown) + c(32, 26, 20, C.green) + c(20, 32, 10, C.green) + c(44, 32, 10, C.green) + hl(24, 18, 5, 3, -30),
  flower:
    [0, 72, 144, 216, 288].map((a) => e(32 + Math.cos((a - 90) * Math.PI / 180) * 13, 28 + Math.sin((a - 90) * Math.PI / 180) * 13, 9, 9, C.pink)).join("") +
    c(32, 28, 8, C.yellow) + line("M32 37 V60", 4, C.leaf) + e(40, 50, 7, 4, C.green, -30),
  fire: p(FLAME, C.orange) + p("M32 30 C34 36 42 40 42 48 C42 54 37 58 32 58 C27 58 22 54 22 48 C22 42 28 40 32 30 Z", C.yellow),
  water: p(DROP, C.blue) + hl(24, 38, 3, 8, 20),
  leaf: p(LEAF, C.green) + line("M14 50 C26 38 36 28 48 14", 3) + hl(24, 28, 3, 7, 40),
  bolt: p("M37 5 L13 36 H29 L25 59 L51 26 H35 Z", C.yellow) + hl(30, 20, 3, 8, 30),
  snowflake: line(snow, 8) + line(snow, 4, C.sky),
  wing: p(WING, C.white) + line("M18 40 C28 36 36 32 48 18", 2.5, C.lilac),
  waves: line("M6 26 Q14 18 22 26 T38 26 T54 26", 5, C.deep) + line("M6 40 Q14 32 22 40 T38 40 T54 40", 5, C.blue) + c(46, 12, 5, C.sky),
  wind: line("M6 22 H38 C46 22 46 12 40 12", 5, C.blue) + line("M6 34 H50 C58 34 58 46 50 46", 5, C.deep) + line("M10 46 H28", 5, C.sky),
  music: c(18, 48, 9, C.violet) + c(44, 42, 9, C.violet) + p("M25 48 V14 L53 8 V42", "none") + p("M25 14 L53 8 V18 L25 24 Z", C.violet),
  shovel: rect(29, 6, 6, 30, 3, C.brown) + rect(22, 4, 20, 7, 3, C.brown) + p("M18 36 H46 V46 C46 54 40 60 32 60 C24 60 18 54 18 46 Z", C.gray) + hl(24, 44, 2, 5),
  snowman: c(32, 44, 15, C.white) + c(32, 20, 11, C.white) + face(32, 19, 4, { size: 1.8, mouth: false }) + poly([[32, 22], [42, 24], [32, 26]], C.orange) + dot(32, 40, 2) + dot(32, 48, 2) + rect(22, 6, 20, 5, 2, C.red),
  mountain: p("M4 54 L24 18 L34 32 L42 22 L60 54 Z", C.brown) + p("M24 18 L30 28 L26 26 L20 30 Z", C.white),
  rock: p("M8 48 L14 24 L30 12 L48 18 L58 40 L46 54 L18 56 Z", C.gray) + line("M30 12 L28 32 L46 54 M28 32 L14 24", 2.5) + hl(22, 26, 3, 5, 30),
  eye: e(32, 32, 26, 16, C.white) + c(32, 32, 11, C.pink) + dot(32, 32, 5) + dot(35, 29, 2, "#fff"),
  ghost: p("M12 56 V28 C12 14 22 6 32 6 C42 6 52 14 52 28 V56 L45 50 L38 56 L32 50 L26 56 L19 50 Z", C.violet) + face(32, 28, 7, { blush: C.pink }) + hl(22, 16, 3, 5, -30),
  fist: rect(12, 16, 40, 34, 12, C.red) + line("M22 18 V32 M32 16 V32 M42 18 V32", 3) + rect(8, 30, 18, 12, 6, C.red) + hl(22, 22, 3, 2),
  poison: p(DROP, C.violet) + c(26, 42, 4, C.lilac) + c(38, 34, 3, C.lilac) + c(34, 48, 2.5, C.lilac),
  bug: e(32, 38, 18, 20, C.green) + line("M32 18 V58", 3) + c(32, 16, 9, C.leaf) + line("M26 8 L22 2 M38 8 L42 2", 3) + dot(25, 34, 3.5, C.leaf) + dot(39, 34, 3.5, C.leaf) + dot(26, 47, 3, C.leaf) + dot(38, 47, 3, C.leaf),
  dragon: p("M10 50 C12 30 26 14 48 10 C42 18 40 22 44 26 C50 24 56 28 54 34 C46 34 42 38 44 46 C34 44 26 48 22 56 Z", C.deep) + dot(42, 18, 2.5, C.yellow) + poly([[44, 26], [50, 30], [44, 32]], C.white),
  fairy: poly(starPts(32, 32, 26, 9, 4, -90), C.pink) + c(32, 32, 5, C.white) + dot(50, 12, 3, C.rose) + dot(14, 50, 2.5, C.rose),
  normal: c(32, 32, 24, C.cloud) + c(32, 32, 12, C.gray),
  island:
    p("M4 46 Q18 40 32 46 T60 46 V58 H4 Z", C.blue) +
    e(30, 46, 20, 7, C.yellow) +
    line("M30 44 C30 34 32 26 36 20", 4, C.brown) +
    p("M36 20 C28 14 18 16 14 22 C22 20 28 20 36 20 Z", C.green) +
    p("M36 20 C42 12 52 12 56 18 C48 17 42 18 36 20 Z", C.green) +
    p("M36 20 C40 22 46 28 46 34 C42 28 38 24 36 20 Z", C.leaf) +
    dot(35, 22, 2.5, C.brown),
  target: c(32, 32, 22, C.white) + c(32, 32, 13, C.sky) + c(32, 32, 5, C.red) + line("M32 4 V14 M32 50 V60 M4 32 H14 M50 32 H60", 4),
  tent: p("M6 54 L32 10 L58 54 Z", C.red) + p("M32 10 L22 54 H42 Z", C.yellow) + line("M4 54 H60", 4)
};

/** 宝可梦属性 → 图标 */
export const TYPE_ICON: Record<string, string> = {
  normal: "normal", fire: "fire", water: "water", grass: "leaf", electric: "bolt", ice: "snowflake",
  fighting: "fist", poison: "poison", ground: "mountain", flying: "wing", psychic: "eye", bug: "bug",
  steel: "gear", dark: "moon", rock: "rock", ghost: "ghost", dragon: "dragon", fairy: "fairy"
};
