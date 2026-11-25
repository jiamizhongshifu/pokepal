/**
 * After a page change, a screen reader should land on the new page, not stay on the button that is gone: focus moves to
 * the page's heading (the first visible h1 outside hidden pages), and the tab title names the page. Pointer users see
 * nothing (a heading focused by script shows no ring after a tap). A dialog that is open keeps the focus.
 */
const APP = '啵啵岛';

function visibleHeading(): HTMLElement | null {
  for (const h of document.querySelectorAll<HTMLElement>('h1')) {
    if (h.closest('[aria-hidden="true"], [hidden], [inert]')) continue;
    const r = h.getBoundingClientRect();
    // A screen-reader-only heading is 1px; a heading of a page hidden with display:none measures 0.
    if (r.width > 0 && r.height > 0) return h;
  }
  return null;
}

/** Name the tab after the page and, unless something else on the page already holds focus, put focus on its heading. */
export function landOnPage(moveFocus: boolean) {
  const h = visibleHeading();
  const name = h?.textContent?.trim();
  document.title = name && name !== APP ? `${name} · ${APP}` : APP;
  if (!h || !moveFocus || document.querySelector('dialog[open]')) return !!h;
  const now = document.activeElement;
  if (now && now !== document.body && now.isConnected && !now.closest('[aria-hidden="true"]') && now.getBoundingClientRect().width > 0) return true;
  if (!h.hasAttribute('tabindex')) h.tabIndex = -1;
  h.focus({ preventScroll: true });
  return true;
}

/** Pages load lazily: try again for a moment until the new page has drawn its heading. */
export function landOnPageSoon(moveFocus: boolean) {
  let tries = 0, timer = 0;
  const attempt = () => { if (!landOnPage(moveFocus) && ++tries < 8) timer = window.setTimeout(attempt, 150); };
  timer = window.setTimeout(attempt, 60);
  return () => clearTimeout(timer);
}
