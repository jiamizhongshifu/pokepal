/** Stored portrait keys in picker order, with the accessible name of each picture. */
export const AVATAR_NAMES: Readonly<Record<string,string>> = {
  "avatar-red": "戴太阳帽的孩子",
  "avatar-pink": "戴贝壳发夹的孩子",
  "avatar-blue": "戴泳镜的孩子",
  "avatar-yellow": "戴绿色毛线帽的孩子",
};
export const AVATARS: readonly string[] = Object.keys(AVATAR_NAMES);
export const DEFAULT_AVATAR = AVATARS[0];
