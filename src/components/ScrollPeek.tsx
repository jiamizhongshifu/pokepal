import { useEffect, useState, type RefObject } from 'react';
import { sfx } from '../lib/speech';
import './scroll-peek.css';

/**
 * Edge tabs for a painted scene wider than the screen: each side that still has more to see shows a tab that
 * slides the scene that way. Render it beside the scrolling element, inside a positioned parent.
 */
export function ScrollPeek({ target, watch }: { target: RefObject<HTMLElement | null>; watch?: unknown }) {
 const [more, setMore] = useState({ left: false, right: false });
 useEffect(() => {
  const v = target.current;
  if (!v) return;
  const check = () => setMore(m => {
   const left = v.scrollLeft > 8, right = v.scrollLeft + v.clientWidth < v.scrollWidth - 8;
   return m.left === left && m.right === right ? m : { left, right };
  });
  check();
  v.addEventListener('scroll', check, { passive: true });
  const ro = new ResizeObserver(check); ro.observe(v);
  return () => { v.removeEventListener('scroll', check); ro.disconnect(); };
 }, [target, watch]);
 const slide = (dir: -1 | 1) => {
  const v = target.current;
  if (!v) return;
  sfx('click');
  v.scrollBy({ left: dir * v.clientWidth * .6, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
 };
 return <>
  {more.left && <button type="button" className="scroll-peek is-left" aria-label="往左边看看" onClick={() => slide(-1)}><i aria-hidden="true" /></button>}
  {more.right && <button type="button" className="scroll-peek is-right" aria-label="往右边看看" onClick={() => slide(1)}><i aria-hidden="true" /></button>}
 </>;
}
