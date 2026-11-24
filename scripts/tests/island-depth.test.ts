import test from 'node:test';
import assert from 'node:assert/strict';
import { REST_VIEW, clampView, depthAt, project } from '../../src/island/depth';

const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 1e-6, `${what}: ${a} vs ${b}`);

test('at rest every spot shows exactly where the flat picture puts it', () => {
 for (const [x, y] of [[0, 0], [50, 50], [17.5, 47], [74, 81], [100, 100]]) {
  const p = project(x, y, REST_VIEW);
  near(p.x, x, 'x'); near(p.y, y, 'y'); near(p.scale, 1, 'scale');
 }
});

test('moving the eye keeps the ground still and slides nearer things more', () => {
 const v = { zoom: 1.5, gx: 1, gy: -.5, px: .4, py: .1 }, flat = { ...v, px: 0, py: 0 };
 assert.equal(depthAt(0), 0);
 // A spot on the ground (depth 0) does not move with the eye.
 const ground = project(30, 0, v), groundFlat = project(30, 0, flat);
 near(ground.x, groundFlat.x, 'ground x'); near(ground.y, groundFlat.y, 'ground y');
 // A near spot does.
 const shift = (y: number) => Math.abs(project(30, y, v).x - project(30, y, flat).x);
 assert.ok(shift(90) > shift(40) && shift(40) > 0);
 // Zooming in makes things bigger.
 assert.ok(project(50, 50, { ...REST_VIEW, zoom: 2 }).scale > 1.5);
});

test('the view never leaves the picture', () => {
 const v = clampView({ zoom: 5, gx: 99, gy: -99, px: 0, py: 0 });
 assert.equal(v.zoom, 2);
 near(v.gx, 3.75, 'gx'); near(v.gy, -2.5, 'gy');
 assert.deepEqual(clampView({ ...REST_VIEW, gx: 3 }), REST_VIEW);
});
