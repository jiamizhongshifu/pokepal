import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';

const START = 10, REACH = 28, CLICK_QUIET_MS = 350;
/** When the last drag ended, for every thing: the handlers are made anew on each render, the gesture is one. */
let dragged = 0;
/**
 * A thing a child can drag onto something, or simply tap. Dragging it onto `target` and tapping it both call `act`;
 * letting go anywhere else puts it back and counts for nothing. Spread the result onto the thing's button.
 */
export function dragTo(target: () => Element | null | undefined, act: () => void) {
 return {
  onPointerDown(e: ReactPointerEvent<HTMLElement>) {
   const el = e.currentTarget, id = e.pointerId, x0 = e.clientX, y0 = e.clientY;
   let moving = false;
   const move = (m: PointerEvent) => {
    if (m.pointerId !== id) return;
    const dx = m.clientX - x0, dy = m.clientY - y0;
    if (!moving && Math.hypot(dx, dy) < START) return;
    if (!moving) { moving = true; el.classList.add('is-dragging'); }
    el.style.translate = `${dx}px ${dy}px`;
   };
   const end = (u: PointerEvent) => {
    if (u.pointerId !== id) return;
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
    // A very fast drag may arrive as only its two ends.
    if (!moving && Math.hypot(u.clientX - x0, u.clientY - y0) < START) return;
    dragged = Date.now(); el.style.translate = ''; el.classList.remove('is-dragging');
    const r = u.type === 'pointerup' ? target()?.getBoundingClientRect() : undefined;
    if (r && u.clientX >= r.left - REACH && u.clientX <= r.right + REACH && u.clientY >= r.top - REACH && u.clientY <= r.bottom + REACH) act();
   };
   // The finger may leave the thing, so the rest of the gesture is followed on the window.
   window.addEventListener('pointermove', move); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  },
  // The click a browser sends after a drag is not a tap.
  onClick(e: ReactMouseEvent<HTMLElement>) { if (Date.now() - dragged < CLICK_QUIET_MS) { e.preventDefault(); return; } act(); },
 };
}
