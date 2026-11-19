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
 let ready: string | undefined, checking = false, opening = false, last = -Infinity;
 const tried = () => { try { return sessionStorage.getItem(AUTO_UPDATE_KEY); } catch { return null; } };
 const open = async () => {
  if (opening || !shouldOpen({ ready, tried: tried(), safe: isSafe() })) return;
  opening = true;
  try { sessionStorage.setItem(AUTO_UPDATE_KEY, ready!); } catch { /* Without storage, still open once per page. */ }
  try { await beforeOpen(); } catch { opening = false; return; }
  if (!isSafe()) { opening = false; return; }
  location.assign(onlineUpdateEntry());
 };
 const check = async () => {
  if (checking || ready || document.hidden || !navigator.onLine || !shouldCheck(last, Date.now())) return;
  checking = true; last = Date.now();
  try {
   const { id, changed } = await checkOnlineUpdate({ loadedBuild, workers: navigator.serviceWorker });
   if (changed) { ready = id; void open(); }
  } catch { /* A failed check never interrupts play; the parent page keeps the manual check. */ }
  finally { checking = false; }
 };
 const visible = () => { if (!document.hidden) { void check(); void open(); } };
 document.addEventListener('visibilitychange', visible);
 window.addEventListener('online', visible);
 const unsubscribe = subscribe(() => { if (ready) void open(); });
 void check();
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
