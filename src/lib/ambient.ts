import { useEffect, useRef, useState } from "react";
import type { Pokemon } from "../types";
import { activityAt, skyFor, type Activity } from "./routine";
import { isSpeaking, type Part } from "./speech";
import { narrateOnIsland as sayCancellable, islandAudioAllowed } from './islandSpeech';
import { COUNTABLE, GREETINGS, SCENE_LINES, colorLine, countLine, lookLine, whatLine, whereLine, type Narration } from "../data/islandEnglish";

/** 一段旁白朗读：英文 → (中文提示) → 英文复述；宝可梦自己的回答用宝可梦的声音 */
export function narrationParts(n: Narration, mode: "bilingual" | "english"): Part[] {
  const parts: Part[] = [];
  n.en.forEach((t, i) => {
    if (i) parts.push(350);
    parts.push(["en", t, {en:t,zh:n.zh}]);
  });
  if (n.me) parts.push(450, ["en", n.me]);
  if (mode === "bilingual") parts.push(500, ["zh", n.zh, {en:n.en.join(" "),zh:n.zh}]);
  if (n.echo) parts.push(500, ["en", n.echo]);
  return parts;
}

let rr = 0;
/** 挑下一句：几种句型轮流出现，宝可梦优先挑醒着的 */
function nextNarration(pokemon: Pokemon[], now: Date, facilities: Record<number,Activity> = {}): Narration {
  const action=(p:Pokemon)=>facilities[p.id] ?? activityAt(p,now);
  const sky = skyFor(now);
  const awake = pokemon.filter((p) => !["sleep", "nap"].includes(action(p)));
  const pool = awake.length ? awake : pokemon;
  const p = pool[Math.floor(Math.random() * pool.length)];
  const kinds = ["look", "where", "what", "scene", "count", "color", "look", "what"];
  const selectedKind = pokemon.length ? kinds[rr++ % kinds.length] : "scene";
  // Existing location phrases describe the old routine locations; use an action for facility visitors.
  const kind=selectedKind==="where" && p && facilities[p.id] ? "look" : selectedKind;
  const a = p ? action(p) : "play";
  if (kind === "look") return lookLine(p, a);
  if (kind === "where") return whereLine(p, a);
  if (kind === "what") return whatLine(p, a);
  if (kind === "color") return colorLine(p) ?? lookLine(p, a);
  if (kind === "count") {
    // 数正在做同一件事的宝可梦（至少 2 只才有意思）
    const by = new Map<Activity, number>();
    for (const q of pokemon) {
      const qa = action(q);
      const key = qa === "nap" ? "sleep" : qa;
      if (COUNTABLE.includes(key)) by.set(key, (by.get(key) ?? 0) + 1);
    }
    const best = [...by.entries()].filter(([, n]) => n >= 2 && n <= 8).sort((x, y) => y[1] - x[1])[0];
    if (best) return countLine(best[1], best[0]);
    return lookLine(p, a);
  }
  const scenes = SCENE_LINES.filter((l) => l.when.includes(sky));
  const l = scenes[Math.floor(Math.random() * scenes.length)];
  return { en: l.en, zh: l.zh, echo: l.echo };
}

/**
 * 家园环境英语：空闲一段时间后，旁白挑一只宝可梦描述它正在做的事（它会跳一下吸引视线），
 * 或者描述看得见的风景、数一数。孩子正在互动、或者正在朗读别的内容时不插话。
 */
export function useAmbientEnglish(opts: {
  pokemon: Pokemon[];
  facilityActivities?: Record<number,Activity>;
  enabled: boolean;
  level: "off" | "some" | "more";
  mode: "bilingual" | "english";
  busy: boolean;
  onFocus: (id: number) => void;
  focusId?: number | null;
  focusReady?: boolean;
  activityFor?: (id: number) => Activity | undefined;
}) {
  const [caption, setCaption] = useState<{ en: string; zh: string } | null>(null);
  const last = useRef(performance.now());
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const greeted = useRef(false);
  const currentNarration = useRef<Narration | null>(null);
  const narration = useRef<ReturnType<typeof sayCancellable> | null>(null);
  const cancelNarration = () => {
    narration.current?.cancel();
    narration.current = null;
    currentNarration.current = null;
    setCaption(null);
  };
  useEffect(() => {
    cancelNarration();
    return cancelNarration;
  }, [opts.focusId, opts.enabled, opts.busy, opts.level, opts.mode]);
  // Returning from a lesson starts a fresh quiet period, not an overdue narration.
  useEffect(() => { last.current = performance.now(); }, [opts.enabled]);
  useEffect(() => {
    const interrupt = () => { cancelNarration(); last.current = performance.now(); };
    window.addEventListener('pointerdown', interrupt, true);
    window.addEventListener('wheel', interrupt, {passive:true, capture:true});
    window.addEventListener('keydown', interrupt, true);
    document.addEventListener('visibilitychange', interrupt);
    return () => {
      window.removeEventListener('pointerdown', interrupt, true);
      window.removeEventListener('wheel', interrupt, true);
      window.removeEventListener('keydown', interrupt, true);
      document.removeEventListener('visibilitychange', interrupt);
    };
  }, []);

  /** 孩子有任何操作时调用：重新计时 */
  const poke = () => {
    cancelNarration();
    last.current = performance.now();
  };

  const speak = async (n: Narration) => {
    const o = optsRef.current;
    if (!o.enabled || o.busy || o.level === 'off' || !islandAudioAllowed()) return;
    setCaption({ en: n.en.join(" "), zh: n.zh });
    if (n.focus) o.onFocus(n.focus);
    const run = sayCancellable(...narrationParts(n, o.mode));
    narration.current = run;
    currentNarration.current = n;
    await run.done;
    if (narration.current !== run) return;
    narration.current = null;
    currentNarration.current = null;
    setCaption(null);
    last.current = performance.now();
  };

  // 进家园先按时段打个招呼
  useEffect(() => {
    const o = optsRef.current;
    if (greeted.current || !o.enabled || o.level === "off" || !o.pokemon.length) return;
    greeted.current = true;
    const t = setTimeout(() => {
      if (optsRef.current.enabled && !optsRef.current.busy && optsRef.current.focusId == null && !isSpeaking()) speak(GREETINGS[skyFor()]);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const o = optsRef.current;
      // 仅开发模式：window.__ambient 查看调度状态
      if (import.meta.env.DEV) (globalThis as { __ambient?: unknown }).__ambient = { enabled: o.enabled, level: o.level, busy: o.busy, speaking: isSpeaking(), focusId:o.focusId, focusReady:o.focusReady, narration:currentNarration.current, idle: Math.round((performance.now() - last.current) / 1000) };
      if (!o.enabled || o.level === "off" || o.busy || !islandAudioAllowed()) return;
      if (isSpeaking()) {
        last.current = performance.now();
        return;
      }
      const gap = (o.level === "more" ? 25 : 50) * 1000;
      if (performance.now() - last.current < gap) return;
      if (o.focusId != null) {
        if (!o.focusReady) return;
        const p = o.pokemon.find(p => p.id === o.focusId);
        if (!p) return; // Never fall back to another resident during a directed shot.
        const activity = o.activityFor?.(p.id);
        if (!activity) return;
        const n = lookLine(p, activity);
        // Keep the bilingual sentence inside the 18-second observation shot.
        speak({ en: [n.en[0]], zh: n.zh, focus: p.id });
      } else {
        speak(nextNarration(o.pokemon, new Date(), o.facilityActivities));
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { caption, poke };
}
