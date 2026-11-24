import { flushSync } from 'react-dom';

type Transitioning = { finished: Promise<void>; ready: Promise<void>; updateCallbackDone: Promise<void>; skipTransition: () => void };
type WithTransitions = Document & { startViewTransition?: (update: () => void) => Transitioning };
let running: Transitioning | null = null;

/**
 * Change what is on screen with a short crossfade, so a new page or scene arrives instead of jumping in. A change made
 * while one is still running finishes that one at once and starts from there. A crossfade does not move anything, so it
 * stays with reduced motion; in a background tab or without browser support the change is simply made.
 */
export function withTransition(update: () => void) {
 if (typeof document === 'undefined' || typeof matchMedia === 'undefined') { update(); return; }
 const doc = document as WithTransitions;
 if (!doc.startViewTransition || document.hidden) { update(); return; }
 running?.skipTransition();
 const t = doc.startViewTransition(() => flushSync(update));
 running = t;
 // A skipped transition rejects these; the page change itself still happened.
 t.ready.catch(() => {}); t.updateCallbackDone.catch(() => {});
 t.finished.catch(() => {}).finally(() => { if (running === t) running = null; });
}
