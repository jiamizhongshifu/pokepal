/**
 * The island seen with depth. The painted ground lies at z = 0; every piece and every friend stands in front of it
 * by how near the viewer its foot is, so moving the camera shows near things sliding past far ones. At rest the
 * view matches the flat picture exactly, so everything placed in % of the picture lands where it always did.
 *
 * View: `zoom` (1 = whole picture), `gx/gy` the ground point in the middle of the view, `px/py` how far the eye
 * has moved off that point (parallax). Moving only the eye keeps the ground still and shifts the nearer things.
 */
export const WORLD_W = 15, WORLD_H = 10;
/** How far the nearest thing stands in front of the ground. */
export const DEPTH = 2.2;
const FOV = 30;
export const TAN = Math.tan(FOV / 2 * Math.PI / 180);
/** Eye distance at which the picture just fills the view (the island box is the picture's 3:2). */
export const REST = (WORLD_H / 2) / TAN;
export const ASPECT = WORLD_W / WORLD_H;
export const MAX_ZOOM = 2;

export interface View { zoom: number; gx: number; gy: number; px: number; py: number }
export const REST_VIEW: View = { zoom: 1, gx: 0, gy: 0, px: 0, py: 0 };

/** Depth of a thing whose foot is at `y`% of the picture (0 top, 100 bottom). */
export const depthAt = (y: number) => DEPTH * Math.pow(Math.min(1, Math.max(0, y / 100)), 1.4);
/** A thing standing nearer would look bigger; it is shrunk by this so it covers the same spot at rest. */
export const restScale = (z: number) => (REST - z) / REST;
/** World point (x right, y up) of a spot in % of the picture, at the ground. */
export const groundPoint = (x: number, y: number) => ({ x: (x / 100 - .5) * WORLD_W, y: (.5 - y / 100) * WORLD_H });

/** Where a spot (% of the picture, foot at `foot`% depth) shows in the box (% of its size), and how much bigger. */
export function project(x: number, y: number, view: View, foot = y): { x: number; y: number; scale: number } {
 const z = depthAt(foot), s = restScale(z), p = groundPoint(x, y), cz = REST / view.zoom;
 const ex = view.gx + view.px, ey = view.gy + view.py;
 const nx = ((p.x * s - ex) / (cz - z) + view.px / cz) / (TAN * ASPECT);
 const ny = ((p.y * s - ey) / (cz - z) + view.py / cz) / TAN;
 return { x: (nx + 1) / 2 * 100, y: (1 - ny) / 2 * 100, scale: (REST - z) / (cz - z) };
}

/** Keep the view on the picture: the ground in view never runs past its edges. */
export function clampView(v: View): View {
 const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
 const mx = WORLD_W / 2 * (1 - 1 / zoom), my = WORLD_H / 2 * (1 - 1 / zoom);
 return { ...v, zoom, gx: Math.min(mx, Math.max(-mx, v.gx)), gy: Math.min(my, Math.max(-my, v.gy)) };
}
