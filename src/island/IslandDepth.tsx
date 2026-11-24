import { useEffect, useRef, useState, type RefObject } from 'react';
import { useEvent } from '../lib/hooks';
import { LayeredArt } from '../components/LayeredArt';
import { layerArt } from '../data/sceneArt';
import { LAYER_AREA } from './islandLayers';
import { MAX_ZOOM, REST_VIEW, WORLD_H, WORLD_W, clampView, project, type View } from './depth';
import type { District } from './world';
import type { IslandScene } from './islandScene3d';

/** Things placed on the picture in % that stand on the island and follow the camera, with where their foot is. */
const ON_ISLAND = '.island-world-sticker, .island-world-trace, .island-place, .island-teaser, .island-walker';
/** How far the eye moves off the ground point while panning or scrolling: the nearer things slide this much more. */
const PAN_PARALLAX = .15, SCROLL_PARALLAX = 1.4;
const TAP_SLOP = 8;

/**
 * The island overview with depth: three.js draws the vector pieces, pinch or wheel zooms in (up to 2x), dragging
 * pans while zoomed in, and scrolling a wide island sideways lets near things slide past far ones. Friends, places
 * and signs stay page elements and are moved to where the camera shows their spot. Until three.js is ready, or
 * where a device cannot draw it, the same pieces show as flat pictures.
 */
export function IslandDepth({ world, scroller, nudged, active }: { world: RefObject<HTMLDivElement | null>; scroller: RefObject<HTMLDivElement | null>; nudged: District | null; active: boolean }) {
 const canvas = useRef<HTMLCanvasElement>(null);
 const scene = useRef<IslandScene | null>(null);
 const [ready, setReady] = useState(false);
 const calm = useRef(matchMedia('(prefers-reduced-motion: reduce)').matches);
 const target = useRef<View>(REST_VIEW), shown = useRef<View>(REST_VIEW), easing = useRef(0);

 // Move every page element standing on the island to where the camera shows its spot.
 const follow = useEvent(() => {
  const box = world.current;
  if (!box) return;
  const v = shown.current, rest = v.zoom === 1 && !v.px && !v.py && !v.gx && !v.gy;
  const w = box.clientWidth, h = box.clientHeight;
  for (const el of box.querySelectorAll<HTMLElement>(ON_ISLAND)) {
   const x = parseFloat(el.style.left), y = parseFloat(el.style.top);
   if (Number.isNaN(x) || Number.isNaN(y)) continue;
   const p = project(x, y, v);
   const moved = rest ? '' : `translate(${((p.x - x) / 100 * w).toFixed(1)}px, ${((p.y - y) / 100 * h).toFixed(1)}px) scale(${p.scale.toFixed(4)})`;
   // Write only a change: the observer below watches these styles, and an unchanged write would wake it again.
   if (el.style.transform !== moved) el.style.transform = moved;
  }
 });
 const show = (v: View) => { shown.current = v; scene.current?.view(v); follow(); };
 // Ease the shown view toward the target; reduced motion jumps there.
 const settle = () => {
  cancelAnimationFrame(easing.current);
  const step = () => {
   const t = target.current, s = shown.current, k = calm.current ? 1 : .28;
   const next = { zoom: s.zoom + (t.zoom - s.zoom) * k, gx: s.gx + (t.gx - s.gx) * k, gy: s.gy + (t.gy - s.gy) * k, px: s.px + (t.px - s.px) * k, py: s.py + (t.py - s.py) * k };
   const done = Math.abs(t.zoom - next.zoom) < 1e-3 && Math.abs(t.gx - next.gx) + Math.abs(t.gy - next.gy) + Math.abs(t.px - next.px) + Math.abs(t.py - next.py) < 1e-3;
   show(done ? t : next);
   if (!done) easing.current = requestAnimationFrame(step);
  };
  step();
 };
 const aim = useEvent((v: View) => {
  const c = clampView(v), scroll = scrollParallax();
  // Reduced motion keeps zoom and pan but no parallax: things sliding at different speeds is what unsettles.
  const depth = calm.current ? 0 : 1;
  target.current = { ...c, px: (c.gx * PAN_PARALLAX + scroll) * depth, py: c.gy * PAN_PARALLAX * depth };
  const el = world.current;
  if (el) el.style.touchAction = c.zoom > 1.01 ? 'none' : 'pan-x';
  settle();
 });
 const scrollParallax = () => {
  const s = scroller.current;
  if (!s || s.scrollWidth <= s.clientWidth + 1) return 0;
  return (s.scrollLeft / (s.scrollWidth - s.clientWidth) - .5) * 2 * SCROLL_PARALLAX;
 };

 // Load three.js only for this page; a device that cannot draw it keeps the flat pieces.
 useEffect(() => {
  let gone = false, made: IslandScene | null = null;
  const c = canvas.current;
  if (!c) return;
  import('./islandScene3d').then(m => m.createIslandScene(c, { calm: calm.current })).then(s => {
   if (gone) { s.dispose(); return; }
   made = scene.current = s;
   const box = world.current;
   if (box) s.resize(box.clientWidth, box.clientHeight);
   s.view(shown.current); setReady(true);
  }).catch(() => { /* stays on the flat pieces */ });
  return () => { gone = true; made?.dispose(); scene.current = null; cancelAnimationFrame(easing.current); };
 }, [world]);
 useEffect(() => { scene.current?.run(active && ready); }, [active, ready]);
 useEffect(() => { if (nudged && !calm.current) scene.current?.hop(Object.keys(LAYER_AREA).filter(n => LAYER_AREA[n] === nudged)); }, [nudged]);

 // Size, scroll and gestures.
 useEffect(() => {
  const box = world.current, sc = scroller.current;
  if (!box) return;
  const ro = new ResizeObserver(() => { scene.current?.resize(box.clientWidth, box.clientHeight); follow(); });
  ro.observe(box);
  // Friends walk and things appear: keep them on their spots in the current view.
  const mo = new MutationObserver(follow);
  mo.observe(box, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
  const onScroll = () => aim(target.current);
  sc?.addEventListener('scroll', onScroll, { passive: true });

  const down = new Map<number, { x: number; y: number }>();
  let start: { view: View; x: number; y: number; dist: number; mid: { x: number; y: number } } | null = null, moved = false;
  const local = (e: { clientX: number; clientY: number }) => { const r = box.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
  // The ground point under a spot of the box stays under it while zooming.
  const zoomAt = (from: View, zoom: number, at: { x: number; y: number }) => {
   const z = Math.min(MAX_ZOOM, Math.max(1, zoom));
   const gx = from.gx + (at.x - .5) * WORLD_W / from.zoom, gy = from.gy - (at.y - .5) * WORLD_H / from.zoom;
   return { ...from, zoom: z, gx: gx - (at.x - .5) * WORLD_W / z, gy: gy + (at.y - .5) * WORLD_H / z };
  };
  const begin = () => {
   const pts = [...down.values()], mid = pts.length > 1 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[0];
   start = { view: target.current, x: mid.x, y: mid.y, dist: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0, mid: local({ clientX: mid.x, clientY: mid.y }) };
  };
  const onDown = (e: PointerEvent) => { down.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (down.size === 1) moved = false; begin(); };
  const onMove = (e: PointerEvent) => {
   if (!down.has(e.pointerId) || !start) return;
   down.set(e.pointerId, { x: e.clientX, y: e.clientY });
   const pts = [...down.values()];
   if (pts.length > 1 && start.dist > 0) {
    moved = true;
    aim(zoomAt(start.view, start.view.zoom * Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / start.dist, start.mid));
   } else if (start.view.zoom > 1.01) {
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    moved = true;
    aim({ ...start.view, gx: start.view.gx - dx / box.clientWidth * WORLD_W / start.view.zoom, gy: start.view.gy + dy / box.clientHeight * WORLD_H / start.view.zoom });
   }
  };
  const onUp = (e: PointerEvent) => { if (!down.delete(e.pointerId)) return; if (down.size) begin(); else start = null; };
  // A drag or a pinch is not a tap on whatever it started on.
  const onClick = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
  const onWheel = (e: WheelEvent) => {
   if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
   e.preventDefault();
   aim(zoomAt(target.current, target.current.zoom * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015)), local(e)));
  };
  box.addEventListener('pointerdown', onDown);
  addEventListener('pointermove', onMove);
  addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
  box.addEventListener('click', onClick, true);
  box.addEventListener('wheel', onWheel, { passive: false });
  box.style.touchAction = 'pan-x';
  return () => {
   ro.disconnect(); mo.disconnect(); sc?.removeEventListener('scroll', onScroll);
   box.removeEventListener('pointerdown', onDown); removeEventListener('pointermove', onMove);
   removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
   box.removeEventListener('click', onClick, true); box.removeEventListener('wheel', onWheel);
  };
 }, [world, scroller, follow, aim]);

 return <>
  <canvas ref={canvas} className={`island-depth${ready ? ' is-ready' : ''}`} aria-hidden="true" />
  {!ready && <LayeredArt className="island-world-art" ground={layerArt('island-map', 'base')} scene="island-map" area={LAYER_AREA} nudged={nudged} still={!active} />}
 </>;
}
