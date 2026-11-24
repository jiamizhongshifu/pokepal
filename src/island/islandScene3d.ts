import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { layerArt, storyProp } from '../data/sceneArt';
import { scenePieces } from '../data/sceneLayers';
import { ASPECT, REST, TAN, WORLD_H, WORLD_W, depthAt, restScale, type View } from './depth';

/**
 * The island's vector pieces drawn by three.js: each SVG file becomes one mesh (its paths triangulated and merged
 * in drawing order), the ground at the back and each piece standing in front by its depth (see depth.ts).
 * Loaded on demand by IslandDepth; until it is ready the same pieces show as plain pictures.
 */
const geometries = new Map<string, Promise<THREE.BufferGeometry>>();
/** One SVG file as a unit-square geometry (origin bottom-left, y up) with a colour per vertex. Parsed once per visit to the app. */
function svgGeometry(url: string) {
 let g = geometries.get(url);
 if (!g) {
  g = fetch(url).then(r => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.text(); }).then(text => {
   const data = new SVGLoader().parse(text);
   const [, , vw, vh] = (data.xml as unknown as Element).getAttribute('viewBox')!.split(/\s+/).map(Number);
   const parts: THREE.BufferGeometry[] = [];
   for (const path of data.paths) {
    const color = new THREE.Color().setStyle(path.userData?.style.fill ?? '#000', THREE.SRGBColorSpace);
    for (const shape of SVGLoader.createShapes(path)) {
     const shapeGeo = new THREE.ShapeGeometry(shape, 4), geo = shapeGeo.toNonIndexed();
     shapeGeo.dispose();
     const n = geo.attributes.position.count, c = new Float32Array(n * 3);
     for (let i = 0; i < n; i++) color.toArray(c, i * 3);
     geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
     geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
     parts.push(geo);
    }
   }
   const merged = mergeGeometries(parts)!;
   parts.forEach(p => p.dispose());
   merged.scale(1 / vw, -1 / vh, 1); merged.translate(0, 1, 0);
   return merged;
  });
  g.catch(() => geometries.delete(url));
  geometries.set(url, g);
 }
 return g;
}

/** A piece that sits on another stands at that one's depth and is drawn after it. */
const ON: Record<string, string> = { 'windmill-sails': 'windmill', flame: 'campfire-stones' };
/** Pieces that turn about their middle rather than stand on their foot. */
const CENTRED = new Set(['windmill-sails']);

/** A prop standing on the island: centred on `spot` (% of the picture), `size` % of the picture's width. */
export interface IslandProp { id: string; spot: readonly [number, number]; size: number }

export interface IslandScene {
 /** The props standing on the island now (stickers the child has earned). */
 props(list: IslandProp[]): void;
 /** Show this view (the caller eases it). */
 view(v: View): void;
 /** The pieces of these names hop once. */
 hop(names: string[]): void;
 /** Run or pause the little motions and drawing (paused while the screen is out of sight). */
 run(on: boolean): void;
 resize(width: number, height: number): void;
 dispose(): void;
}

export async function createIslandScene(canvas: HTMLCanvasElement, opts: { calm: boolean }): Promise<IslandScene> {
 const pieces = scenePieces('island-map');
 const [ground, ...pieceGeos] = await Promise.all([svgGeometry(layerArt('island-map', 'base')), ...pieces.map(([name]) => svgGeometry(layerArt('island-map', name)))]);

 const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
 renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
 renderer.outputColorSpace = THREE.SRGBColorSpace;
 const scene = new THREE.Scene();
 const camera = new THREE.PerspectiveCamera(30, ASPECT, 0.1, 100);
 // Every layer is flat and drawn in order: no depth test, the order of drawing is the order of the painting.
 const material = new THREE.MeshBasicMaterial({ vertexColors: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });

 const groundMesh = new THREE.Mesh(ground, material);
 groundMesh.scale.set(WORLD_W, WORLD_H, 1); groundMesh.position.set(-WORLD_W / 2, -WORLD_H / 2, 0);
 scene.add(groundMesh);
 const pivots = new Map<string, { pivot: THREE.Group; rest: THREE.Vector3; scale: number }>();
 pieces.forEach(([name, b], i) => {
  const mesh = new THREE.Mesh(pieceGeos[i], material), w = b.w / 100 * WORLD_W, h = b.h / 100 * WORLD_H, centred = CENTRED.has(name);
  mesh.scale.set(w, h, 1); mesh.position.set(-w / 2, centred ? -h / 2 : 0, 0); mesh.renderOrder = i + 1;
  const base = ON[name] ? pieces.find(([n]) => n === ON[name])?.[1] : undefined;
  const z = depthAt((base ?? b).y + (base ?? b).h), s = restScale(z);
  const pivot = new THREE.Group(), x = (b.x + b.w / 2) / 100 * WORLD_W - WORLD_W / 2, y = WORLD_H / 2 - (centred ? b.y + b.h / 2 : b.y + b.h) / 100 * WORLD_H;
  pivot.position.set(x * s, y * s, z); pivot.scale.setScalar(s); pivot.add(mesh); scene.add(pivot);
  pivots.set(name, { pivot, rest: pivot.position.clone(), scale: s });
 });
 let view: View = { zoom: 1, gx: 0, gy: 0, px: 0, py: 0 }, running = false, frame = 0, dirty = true;
 // Props go between the pieces by where their foot is, so a prop in front of a piece is drawn over it.
 const bottoms = pieces.map(([, b]) => b.y + b.h);
 const propGroup = new THREE.Group(); scene.add(propGroup);
 let propKey = '', propTicket = 0;
 async function showProps(list: IslandProp[]) {
  const key = JSON.stringify(list);
  if (key === propKey) return;
  propKey = key;
  const ticket = ++propTicket, geos = await Promise.all(list.map(p => svgGeometry(storyProp(p.id)).catch(() => null)));
  if (ticket !== propTicket) return;
  propGroup.clear();
  list.forEach((p, i) => {
   const geo = geos[i];
   if (!geo) return;
   const size = p.size / 100 * WORLD_W, foot = p.spot[1] + p.size * WORLD_W / WORLD_H / 2;
   const z = depthAt(foot), s = restScale(z), mesh = new THREE.Mesh(geo, material);
   mesh.scale.set(size, size, 1); mesh.position.set(-size / 2, -size / 2, 0);
   mesh.renderOrder = bottoms.filter(b => b <= foot).length + .5;
   const pivot = new THREE.Group(), x = (p.spot[0] / 100 - .5) * WORLD_W, y = (.5 - p.spot[1] / 100) * WORLD_H;
   pivot.position.set(x * s, y * s, z); pivot.scale.setScalar(s); pivot.add(mesh); propGroup.add(pivot);
  });
  dirty = true;
  if (!running) { place(); renderer.render(scene, camera); dirty = false; }
 }

 const hops = new Map<string, number>();
 function place() {
  const cz = REST / view.zoom, near = camera.near;
  camera.position.set(view.gx + view.px, view.gy + view.py, cz);
  camera.lookAt(camera.position.x, camera.position.y, 0);
  // Shift the lens so the ground stays put while the eye moves (parallax): see project() in depth.ts.
  const r = near * TAN * ASPECT, t = near * TAN, dx = view.px / cz / (TAN * ASPECT), dy = view.py / cz / TAN;
  camera.projectionMatrix.makePerspective(-r - r * dx, r - r * dx, t - t * dy, -t - t * dy, near, camera.far);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
 }
 const clock = new THREE.Clock();
 function tick() {
  frame = running ? requestAnimationFrame(tick) : 0;
  const now = clock.getElapsedTime();
  const moving = !opts.calm;
  if (moving) {
   const sails = pivots.get('windmill-sails'), boat = pivots.get('boat'), flame = pivots.get('flame');
   if (sails) sails.pivot.rotation.z = -now * 0.4;
   if (boat) { boat.pivot.position.y = boat.rest.y + Math.sin(now * 1.6) * 0.03; boat.pivot.rotation.z = Math.sin(now * 1.2) * 0.03; }
   if (flame) flame.pivot.scale.y = flame.scale * (1 + Math.sin(now * 9) * 0.07);
  }
  for (const [name, at] of hops) {
   const p = pivots.get(name)!, k = (performance.now() - at) / 480;
   if (k >= 1) { p.pivot.position.y = p.rest.y; hops.delete(name); continue; }
   p.pivot.position.y = p.rest.y + Math.sin(k * Math.PI) * 0.25 * (1 - k * 0.5);
  }
  if (moving || hops.size || dirty) { place(); renderer.render(scene, camera); dirty = false; }
 }
 return {
  props(list) { void showProps(list); },
  view(v) { view = v; dirty = true; if (!running) { place(); renderer.render(scene, camera); dirty = false; } },
  hop(names) { const at = performance.now(); names.forEach(n => pivots.has(n) && hops.set(n, at)); if (running && !frame) tick(); },
  run(on) { if (on === running) return; running = on; if (on) { dirty = true; tick(); } else if (frame) { cancelAnimationFrame(frame); frame = 0; } },
  resize(width, height) { renderer.setSize(width, height, false); dirty = true; if (!running) { place(); renderer.render(scene, camera); } },
  dispose() { running = false; if (frame) cancelAnimationFrame(frame); material.dispose(); renderer.dispose(); },
 };
}
