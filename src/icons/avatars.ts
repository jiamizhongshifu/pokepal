import { C, c, dot, e, face, line, p } from "./draw";

/** 训练师头像：戴帽子的小训练师，四种配色 */
function trainer(cap: string, hair: string, extra = "") {
  return (
    c(32, 36, 22, C.skin) +
    extra +
    p("M10 32 C10 14 20 8 32 8 C44 8 54 14 54 32 C46 26 18 26 10 32 Z", cap) +
    p("M10 32 C18 26 46 26 54 32 C58 34 60 38 54 38 C44 34 20 34 10 32 Z", cap) +
    c(32, 18, 5, C.white) +
    p("M12 34 C14 40 18 40 20 36 C22 40 26 40 28 36 Z", hair) +
    face(32, 42, 8, { blush: C.pink })
  );
}

export const AVATAR_ICONS: Record<string, string> = {
  "avatar-red": trainer(C.red, C.dark),
  "avatar-blue": trainer(C.deep, "#3a2a1e"),
  "avatar-pink": trainer(C.pink, C.brown, e(10, 46, 6, 9, C.brown) + e(54, 46, 6, 9, C.brown)),
  "avatar-yellow": trainer(C.yellow, C.dark, line("M10 48 C6 52 8 58 14 56 M54 48 C58 52 56 58 50 56", 3) + dot(32, 60, 0))
};
export const AVATARS = ["avatar-red", "avatar-pink", "avatar-blue", "avatar-yellow"];
