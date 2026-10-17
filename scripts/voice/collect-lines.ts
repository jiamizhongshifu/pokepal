import { allStoryEditions } from '../../src/data/storyLevels';
import {WEATHER,CLEAR_NIGHT} from '../../src/lib/weather';
import {GUIDES} from '../../src/data/onboarding';
import { DIARY_PROMPTS } from '../../src/data/diaryPrompts';
/**
 * 收集游戏里所有会朗读的台词 → voice/lines.json，供 volc_tts.py 预合成。
 * 1) 从源码扫描固定语句 ["zh"|"en", "..."]
 * 2) 按数据展开带变量的模板（与各界面里的模板保持一致；运行时不使用系统语音；构建前必须校验配音覆盖）
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { STORIES } from "../../src/data/stories";
import { LEARNING_UNITS, unitSituations } from '../../src/data/curriculum';
import { facilityLesson } from "../../src/data/learning";
import { STATIONS, compatible } from "../../src/scene/islandLife";
import { POKEMON, COLORS, TYPES, BALLS, kidDescription, hobby, favoriteFood } from "../../src/data/pokemon";
import { PIC_WORDS, PHRASES, LETTERS, PRAISE, withArticle } from "../../src/data/words";
import { BEHAVIORS, DEFAULT_SCHEDULE } from "../../src/data/behaviors";
import { ACTIVITY, type Activity } from "../../src/lib/routine";
import { COUNT_ITEMS, SAY, traceIntro, traceSuccess, colorAsk, colorNo, colorYes, countAsk, countNo, countYes, cryAsk, cryNo, cryYes, letterChant, nameAsk, nameNo, nameYes, picAsk, picNo, picYes, sizeAsk, sizeNo, sizeYes, type Lines } from "../../src/data/taskEnglish";
import { evoDone, evoReady, evoStart, evoStay } from "../../src/data/evolutionEnglish";
import { COUNTABLE, GOODNIGHT_TAIL, GREETINGS, SCENE_LINES, colorLine, countLine, lookLine, whatLine, whereLine, type Narration } from "../../src/data/islandEnglish";
import { NARRATOR_EN, NARRATOR_ZH, pokemonVoice, type Voice } from "./cast";

type Lang = "zh" | "en";
interface Line { lang: Lang; text: string; voice: string; pitch?: number; rate?: number; context?: string; resource: string }

const ROOT = path.resolve(import.meta.dirname, "../..");
const out = new Map<string, Line>();
function add(lang: Lang, text: string, v?: Voice) {
  if (!text || !text.trim()) return;
  const key = `${lang}|${text}`;
  if (out.has(key)) return;
  const voice = v ?? (lang === "zh" ? NARRATOR_ZH : NARRATOR_EN);
  out.set(key, { lang, text, resource: "seed-tts-2.0", ...voice });
}
const zh = (t: string, v?: Voice) => add("zh", t, v);
for(const w of [...Object.values(WEATHER),CLEAR_NIGHT]){add('en',w.en);add('zh',w.voice);}
Object.values(GUIDES).forEach(g=>zh(g.voice));
const en = (t: string, v?: Voice) => add("en", t, v);

// ---------- 1. 源码里的固定语句 ----------
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|ts)$/.test(f) ? [p] : [];
  });
}
// AST handles single quotes, caption metadata, whitespace and static conditional branches.
for (const file of walk(path.join(ROOT, "src"))) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const literals = (n: ts.Expression, lang: Lang) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) add(lang, n.text);
    else if (ts.isConditionalExpression(n)) { literals(n.whenTrue, lang); literals(n.whenFalse, lang); }
  };
  const visit = (n: ts.Node) => {
    if (ts.isArrayLiteralExpression(n) && n.elements.length >= 2 && ts.isStringLiteral(n.elements[0]) && ["en", "zh"].includes(n.elements[0].text)) literals(n.elements[1], n.elements[0].text as Lang);
    ts.forEachChild(n, visit);
  };
  visit(source);
}
// 资料页里三元表达式中的固定语句
["Taller than you!", "Smaller than you!", "Heavier than you!", "Lighter than you!"].forEach((t) => en(t));
["它比你还高！", "它比你矮！", "它比你还重！", "它比你轻！"].forEach((t) => zh(t));

for (const prompt of DIARY_PROMPTS) zh(prompt.voice);

// Picture-book narration, repeated phrases and open conversation prompts.
for (const story of allStoryEditions(STORIES)) {
  for (const line of [...story.pages, ...story.pages.flatMap(p=>p.pictureWord?[p.pictureWord]:[]), story.phrase, story.question, ...story.pages.flatMap(p=>p.pause?.choices.map(c=>c.reply)??[])]) { en(line.en); zh(line.zh); }
  en(story.titleEn); zh(story.title);
}

// ---------- 2. 带变量的模板 ----------
const activitiesOf = (id: number): Activity[] => [...new Set([...((BEHAVIORS[id]?.schedule ?? DEFAULT_SCHEDULE).map(h=>h.activity)), "explore" as Activity, ...STATIONS.filter(s=>compatible(POKEMON.find(p=>p.id===id)!,s)).map(s=>s.activity)])];

for (const p of POKEMON) {
  const pz = pokemonVoice(p.id, "zh"), pe = pokemonVoice(p.id, "en");
  // 宝可梦自己说的话
  en(`Hi! I'm ${p.nameEn}!`, pe);
  zh(`我是${p.nameZh}！`, pz);
  // 捕捉
  en(`You caught ${p.nameEn}!`); zh(`你抓到了${p.nameZh}！`);
  // 资料页
  en(`${p.nameEn}!`); zh(`${p.nameZh}！`);
  en(p.nameEn); zh(p.nameZh);
  if (p.genusEn) en(p.genusEn);
  if (p.genusZh) zh(p.genusZh);
  const d = kidDescription(p); en(d.en); zh(d.zh);
  const h = hobby(p); en(h.en); zh(h.zh);
  const f = favoriteFood(p); en(`It likes ${f.en}.`); zh(`它爱吃${f.zh}。`);
  // 家园
  for (const a of activitiesOf(p.id)) {
    const A = ACTIVITY[a];
    en(`Shh… ${p.nameEn} ${A.en}.`); zh(`嘘，${p.nameZh}${A.zh}。`);
    zh(`${p.nameZh}${A.zh}。`); en(`${p.nameEn} ${A.en}.`);
  }
  const t = BEHAVIORS[p.id]?.trait; if (t) { zh(t.zh); en(t.en); }
  zh(`${p.nameZh}好开心！`); en(`${p.nameEn} is happy!`);
  en(`Here is ${f.one} for you!`); zh(`给你吃${f.zh}！`);
  en(`Good night, ${p.nameEn}!`); zh(`${p.nameZh}，晚安！`);
  zh(`${p.nameZh}听到啦！`);
  // 听一听
  zh(`${p.nameZh}在哪里？`); en(`Where is ${p.nameEn}?`);
  zh(`${p.nameZh}也很开心！`);
  // 说一说
  zh(`跟${p.nameZh}一起说：`); en(`${p.nameEn}!`);
}
for (const t of Object.values(TYPES)) { en(t.en); zh(`${t.zh}属性`); }
for (const c of Object.values(COLORS)) { en(c.en); zh(c.zh); }
for (const pr of PRAISE) { en(pr.en); zh(pr.zh); }
for (const ph of PHRASES) { en(ph.en); zh(ph.zh); }
for(const unit of LEARNING_UNITS){for(const scene of unitSituations(unit))zh(scene.situation);zh(unit.mission);}
for (const station of STATIONS) for (const level of [1,2] as const) { const l = facilityLesson(station,level); en(l.en); zh(l.zh); }
en("big"); en("small");
["One!", "Two!", "Three!", "Four!", "Five!"].forEach(t=>en(t));
for (let n = 0; n <= POKEMON.length; n++) { en(`You have ${n} Pokémon!`); zh(`训练师图鉴。你已经有${n}只宝可梦啦！`); }
for (const b of Object.values(BALLS)) { zh(`你换到了一个${b.zh}！`); en(`You got a ${b.en}!`); }
for (let n = 1; n <= 20; n++) zh(`能量还不够哦，还差${n}点。去做任务吧！`);
for (let n = 1; n <= 4; n++) zh(`你得到了${n}点能量！`);
zh(`连续7天完成全部任务，就能得到大师球！`);
// Both Pokémon letters and picture-word letters used by the beginner trace game.
for (const item of [...LETTERS,...PIC_WORDS.filter(w=>w.icon).map(w=>({...w,letter:w.en[0].toUpperCase()}))]) {
 for(const part of [...traceIntro(item),...traceSuccess(item)]) if(typeof part!=="number") add(part[0],part[1]);
}
// 认一认
for (const w of PIC_WORDS) {
  en(w.en);
}

// 家园环境英语（磨耳朵）：与 src/data/islandEnglish.ts 用同一套函数穷举
const kidVoice = pokemonVoice(25, "en");
const addNarration = (n: Narration | null) => {
  if (!n) return;
  n.en.forEach((t) => en(t));
  if (n.me) en(n.me, kidVoice);
  zh(n.zh);
  if (n.echo && n.echo !== n.me) en(n.echo);
};
for (const p of POKEMON) {
  for (const a of activitiesOf(p.id)) {
    addNarration(lookLine(p, a));
    addNarration(whereLine(p, a));
    addNarration(whatLine(p, a));
  }
  addNarration(colorLine(p));
}
for (const a of COUNTABLE) for (let n = 1; n <= 8; n++) addNarration(countLine(n, a));
for (const l of SCENE_LINES) addNarration({ en: l.en, zh: l.zh, echo: l.echo });
for (const g of Object.values(GREETINGS)) addNarration(g);
GOODNIGHT_TAIL.forEach((t) => en(t));
// 点宝可梦时的拟声词和第一人称回答
for (const A of Object.values(ACTIVITY)) { en(A.sound); en(A.me, kidVoice); }

// 任务页（3–6 岁）：与 src/data/taskEnglish.ts 用同一套函数穷举；每句独立配音，组合不会爆炸
const addLines = (l: Lines) => {
  l.en.forEach((t) => en(t));
  if (l.zh) (l.zhAudio ?? [l.zh]).forEach(t=>zh(t));
};
for (const c of Object.values(COLORS)) addLines(colorAsk(c.en, c.zh));
addLines(cryAsk);
for (const p of POKEMON) {
  if (COLORS[p.color]) {
    addLines(colorYes(p));
    for (const c of Object.values(COLORS)) addLines(colorNo(p, c.en));
  }
  addLines(nameAsk(p)); addLines(nameYes(p)); addLines(nameNo(p, p));
  addLines(cryYes(p)); addLines(cryNo(p));
  for (const big of [true, false]) { addLines(sizeAsk(p, big)); addLines(sizeYes(p, big)); }
}
for (const big of [true, false]) addLines(sizeNo(big));
for (const it of COUNT_ITEMS) for (let n = 1; n <= 5; n++) {
  addLines(countAsk(n, it)); addLines(countYes(n, it));
  for (let t = 1; t <= 5; t++) addLines(countNo(n, it, t));
}
for (const w of PIC_WORDS) {
  addLines(picAsk(w)); addLines(picYes(w)); addLines(picNo(w, w));
  en(`${w.en[0].toUpperCase()}${w.en.slice(1)}!`);
}
Object.values(SAY).forEach(addLines);
for (const ph of PHRASES) zh(`意思是：${ph.zh}`);
for (const l of LETTERS) en(letterChant(l.letter, l.en));

// 进化
const byIdMap = new Map(POKEMON.map((p) => [p.id, p]));
for (const p of POKEMON) {
  if (!p.evolvesTo.length) continue;
  for (const l of [evoReady(p), evoStart(p), evoStay(p)]) { l.en.forEach((t) => en(t)); zh(l.zh); }
  for (const id of p.evolvesTo) { const to = byIdMap.get(id); if (!to) continue; const l = evoDone(p, to); l.en.forEach((t) => en(t)); zh(l.zh); }
}

// Every catalog entry can now be selected, including evolved partners.
for (const p of POKEMON) {
  en(`Let’s meet ${p.nameEn}!`); zh(`${p.nameZh}在等你，轻轻点一下它吧！`);
}

const lines = [...out.values()];
mkdirSync(path.join(ROOT, "voice"), { recursive: true });
writeFileSync(path.join(ROOT, "voice/lines.json"), JSON.stringify(lines, null, 1));
const chars = lines.reduce((s, l) => s + l.text.length, 0);
console.log(`台词 ${lines.length} 条（中文 ${lines.filter((l) => l.lang === "zh").length}，英文 ${lines.filter((l) => l.lang === "en").length}），约 ${chars} 字符`);
