import * as THREE from 'three';

export type StoneKind = 'coast' | 'perch' | 'fire' | 'path';

/** Closed bevelled stone, within radius .5 and y=0..1. Baked vertex colour
 * avoids extra textures, overlay meshes and per-frame work on tablets. */
export function stoneGeometry(kind: StoneKind, seed = 0) {
  const segments = 12;
  const profile = [
    [0, .76], [.06, .91], [.16, 1], [.30, .985], [.39, .97],
    [.435, .96], [.50, .95], [.72, .89], [.90, .77], [.98, .65], [1, .57],
  ];
  const phase = seed * 1.73;
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const palettes = {
    coast: ['#657675', '#9fa99c', '#d1cbb3'],
    perch: ['#687d79', '#a4b1a0', '#d2d2b8'],
    fire: ['#70695e', '#a3937d', '#c6b79a'],
    path: ['#919582', '#d0ceb6', '#e9e3cb'],
  };
  const [base, body, top] = palettes[kind].map(c => new THREE.Color(c));
  const mineral = new THREE.Color('#e3dcc5'), moss = new THREE.Color('#72845c');
  function colorAt(y: number, a: number) {
    const c = base.clone().lerp(body, THREE.MathUtils.smoothstep(y, 0, .45));
    c.lerp(top, THREE.MathUtils.smoothstep(y, .52, 1) * .76);
    if (kind === 'coast' || kind === 'perch') {
      // A broken mineral seam; sage lichen only on the shoulder, not the seat.
      const seam = Math.max(0, 1 - Math.abs(y - .435) / .047);
      c.lerp(mineral, seam * .62 * THREE.MathUtils.smoothstep(Math.cos(a + phase), -.4, .55));
      const patch = THREE.MathUtils.smoothstep(Math.sin(a * 3 + phase) * Math.cos(a * 2 - phase), .25, .7);
      c.lerp(moss, patch * .65 * THREE.MathUtils.smoothstep(y, .5, .75) * (1 - THREE.MathUtils.smoothstep(y, .88, 1)));
    }
    return c.multiplyScalar(1 + .035 * Math.sin(a * 2 + phase));
  }
  profile.forEach(([y, radius]) => {
    for (let i = 0; i < segments; i++) {
      const a = i / segments * Math.PI * 2;
      // Broad irregular planes rather than noisy bumps or perfect circles.
      const shape = .91 + .055 * Math.sin(3 * a + phase) + .035 * Math.cos(5 * a - phase);
      const r = .49 * radius * shape;
      const shift = Math.sin(y * Math.PI) * .009;
      const level = y + .055 * Math.sin(a * 2 + phase) * Math.sin(y * Math.PI);
      positions.push(Math.cos(a) * r + shift * Math.cos(phase), level, Math.sin(a) * r + shift * Math.sin(phase));
      const c = colorAt(y, a);
      colors.push(c.r, c.g, c.b);
    }
  });
  for (let j = 0; j < profile.length - 1; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * segments + i, b = j * segments + (i + 1) % segments;
      indices.push(a, a + segments, b, b, a + segments, b + segments);
    }
  }
  const bottom = positions.length / 3, cap = bottom + 1, last = bottom - segments;
  positions.push(0, 0, 0, 0, 1, 0);
  colors.push(base.r, base.g, base.b, top.r, top.g, top.b);
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(bottom, i, next, cap, last + next, last + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  const uv:number[]=[];for(let i=0;i<positions.length;i+=3)uv.push(positions[i]+.5,positions[i+2]+.5);
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.computeVertexNormals();
  // Retain soft bevels while allowing broad planes to catch the light.
  const smooth = g.toNonIndexed();
  const blended = smooth.attributes.normal.clone();
  smooth.computeVertexNormals();
  const normal = smooth.attributes.normal;
  const n = new THREE.Vector3(), face = new THREE.Vector3();
  for (let i = 0; i < normal.count; i++) {
    n.fromBufferAttribute(blended, i);
    face.fromBufferAttribute(normal, i);
    n.lerp(face, kind === 'path' ? .12 : .28).normalize();
    normal.setXYZ(i, n.x, n.y, n.z);
  }
  g.dispose();
  smooth.computeBoundingBox();
  smooth.computeBoundingSphere();
  return smooth;
}
