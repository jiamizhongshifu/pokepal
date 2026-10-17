import assert from 'node:assert/strict';
import * as THREE from 'three';
import { stoneGeometry, type StoneKind } from '../src/scene/hq/stoneGeometry';
import { COAST_ROCKS, HIGH_ROCK } from '../src/scene/layout';

for (const kind of ['coast', 'perch', 'fire', 'path'] as StoneKind[]) {
  for (let seed = 0; seed < 12; seed++) {
    const g = stoneGeometry(kind, seed), p = g.attributes.position, normal = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      assert.ok(Math.hypot(p.getX(i), p.getZ(i)) <= .500001, `${kind}: stays inside existing collision footprint`);
      assert.ok(p.getY(i) >= 0 && p.getY(i) <= 1, `${kind}: no displaced base or perch height`);
      assert.ok(Math.abs(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)) - 1) < 1e-5, 'finite unit lighting normals');
    }
    const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, -1, 0));
    assert.ok(Math.abs(ray.intersectObject(mesh)[0]?.point.y - 1) < 1e-6, `${kind}: top faces outward and supports the resident`);
    ray.set(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0));
    assert.equal(ray.intersectObject(mesh)[0]?.point.y, 0, `${kind}: closed underside`);
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),cross=new THREE.Vector3();
    let volume=0;
    for(let i=0;i<p.count;i+=3){
      a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
      cross.crossVectors(b.clone().sub(a),c.clone().sub(a));
      assert.ok(cross.lengthSq()>1e-12,'no zero-area faces');
      volume+=a.dot(b.clone().cross(c))/6;
    }
    assert.ok(volume>.1,'consistent outward winding');
    g.dispose();mesh.material.dispose();
  }
}
assert.equal(COAST_ROCKS[0].top,HIGH_ROCK.top,'meditation anchor remains aligned');
console.log('PASS: 48 rock variants — collision envelope, perch height, outward faces, closed bases and lighting normals.');
