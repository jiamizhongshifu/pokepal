import { checkOnlineUpdate, onlineUpdateEntry } from './onlineUpdate';

/**
 * Returning visitors get the newest release without a manual check: on opening and on coming back to the tab, the
 * release is compared with the one running; a newer one is prepared in the background and opened once, only at a
 * moment when nothing is in progress (never mid-lesson or mid-play). One attempt per release per tab session.
 */
export const AUTO_UPDATE_KEY = 'pokepal-auto-update';
export const RECHECK_MS = 10 * 60 * 1000;

export interface UpdateState { ready?: string; tried?: string | null; safe: boolean }
/** Open the prepared release only when it is not the one this tab already tried to open, and the moment is safe. */
export const shouldOpen = ({ ready, tried, safe }: UpdateState) => !!ready && ready !== tried && safe;
export const shouldCheck = (last: number, now: number) => now - last >= RECHECK_MS;

/** Everything the updater touches in the browser, so the order of its steps can be tested. */
export interface UpdateEnv {
 check: () => Promise<{ id: string; changed: boolean }>;
 read: () => string | null; write: (id: string) => void; note: (state: string) => void;
 hidden: () => boolean; online: () => boolean; now: () => number; open: () => void;
}
const browserEnv = (loadedBuild: string): UpdateEnv => ({
 check: () => checkOnlineUpdate({ loadedBuild, workers: navigator.serviceWorker }),
 read: () => { try { return sessionStorage.getItem(AUTO_UPDATE_KEY); } catch { return null; } },
 write: id => { try { sessionStorage.setItem(AUTO_UPDATE_KEY, id); } catch { /* Without storage, still open once per page. */ } },
 // The last step reached, kept in this tab only, to explain a release that did not open.
 note: state => { try { sessionStorage.setItem(`${AUTO_UPDATE_KEY}-state`, state); } catch { /* Diagnostic only. */ } },
 hidden: () => document.hidden, online: () => navigator.onLine, now: () => Date.now(),
 open: () => location.assign(onlineUpdateEntry()),
});

/**
 * The "already opened" mark is written only immediately before the page is replaced: a failed save or a moment that
 * stopped being quiet leaves the release waiting, and it opens at the next quiet moment instead of never.
 */
export function createAutoUpdate({ isSafe, beforeOpen, env }: { isSafe: () => boolean; beforeOpen: () => Promise<void>; env: UpdateEnv }) {
 let ready: string | undefined, checking = false, opening = false, last = -Infinity;
 const open = async () => {
  if (opening || !shouldOpen({ ready, tried: env.read(), safe: isSafe() })) return;
  opening = true;
  try { await beforeOpen(); } catch { opening = false; env.note('save-failed'); return; }
  if (!shouldOpen({ ready, tried: env.read(), safe: isSafe() })) { opening = false; env.note('not-quiet'); return; }
  env.write(ready!); env.note('opening'); env.open();
 };
 const check = async () => {
  if (checking || ready || env.hidden() || !env.online() || !shouldCheck(last, env.now())) return;
  checking = true; last = env.now();
  try { const { id, changed } = await env.check(); env.note(changed ? 'ready' : 'latest'); if (changed) { ready = id; await open(); } }
  catch { env.note('check-failed'); /* A failed check never interrupts play; the parent page keeps the manual check. */ }
  finally { checking = false; }
 };
 return { check, open, changed: () => { if (ready) void open(); } };
}

export function installAutoUpdate({ loadedBuild, isSafe, subscribe, beforeOpen }: {
 loadedBuild: string;
 /** True when leaving the page loses nothing: no lesson, game or save in progress. */
 isSafe: () => boolean;
 /** Called whenever the app state changes, so a waiting release opens as soon as the moment is safe. */
 subscribe: (listener: () => void) => () => void;
 /** Finish writing progress before the page is replaced. */
 beforeOpen: () => Promise<void>;
}) {
 if (!('serviceWorker' in navigator)) return () => {};
 const updater = createAutoUpdate({ isSafe, beforeOpen, env: browserEnv(loadedBuild) });
 const visible = () => { if (!document.hidden) { void updater.check(); void updater.open(); } };
 document.addEventListener('visibilitychange', visible);
 window.addEventListener('online', visible);
 const unsubscribe = subscribe(updater.changed);
 void updater.check();
 return () => { document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', visible); unsubscribe(); };
}

/** Screens a page reload cannot interrupt: a returning child's welcome, the learning path and the friends album. */
export function quietMoment(s: { loaded: boolean; saveBusy: boolean; saveIssue: unknown; screen: { name: string; view?: string; station?: string }; hasTrainer: boolean }) {
 if (s.saveBusy || s.saveIssue) return false;
 if (!s.loaded) return true;
 if (s.screen.name === 'welcome') return s.hasTrainer;
 if (s.screen.name === 'home') return !s.screen.view && !s.screen.station;
 return s.screen.name === 'dex';
}

/** Cloudflare Pages serves `/release-entry.html` as `/release-entry`. */
export const isUpdateEntry = (path: string) => path === '/release-entry' || path === '/release-entry.html';
/** After opening a release through its update entry, show the normal address again (bookmarks, home-screen icons). */
export function restoreEntryAddress() {
 if (isUpdateEntry(location.pathname)) try { history.replaceState(history.state, '', '/'); } catch { /* Address only. */ }
}
