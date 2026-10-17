import { captionParts } from "./captions";
import { useGame } from "../store";
import type { Part } from "./speech";

/**
 * 双语朗读：家长选了“只说英文”时去掉中文提示；数字（停顿）和英文保留。
 * 用法：say(...bi(["en", "Find the apple!"], ["zh", "苹果在哪里？"]))
 */
export function bi(...parts: Part[]): Part[] {
  parts = captionParts(parts);
  const mode = useGame.getState().save.settings.englishMode ?? "bilingual";
  return mode === "bilingual" ? parts : parts.filter((p) => typeof p === "number" || p[0] === "en");
}
