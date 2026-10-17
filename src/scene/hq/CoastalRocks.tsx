import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { CAMPFIRE, COAST_ROCKS } from '../layout';
import { terrainHeight } from './Terrain';
import { surfaceTexture } from '../surfaceTextures';
import { stoneGeometry } from './stoneGeometry';

export function CoastalRocks() {
  const { coast, fire, material } = useMemo(() => ({
    coast: COAST_ROCKS.map((p, i) => stoneGeometry(p.top === undefined ? 'coast' : 'perch', i + 1)),
    fire: Array.from({ length: 3 }, (_, i) => stoneGeometry('fire', i + 7)),
    material: new THREE.MeshStandardMaterial({ vertexColors: true, map: surfaceTexture('stone'), bumpMap: surfaceTexture('stone'), bumpScale: .018, roughness: .93, metalness: 0, envMapIntensity: .2 }),
  }), []);
  useEffect(() => () => {
    [...coast, ...fire].forEach(g => g.dispose());
    material.dispose();
  }, [coast, fire, material]);
  const fireY = terrainHeight(CAMPFIRE.x, CAMPFIRE.z);
  return (
    <group name="coastal-stones" dispose={null}>
      {COAST_ROCKS.map((p, i) => {
        const base = terrainHeight(p.x, p.z) - .04;
        // The flat top remains exactly at the Pokémon meditation anchor.
        const height = p.top === undefined ? p.size[1] : p.top - base;
        return <mesh key={i} name={`coastal-rock-${i}`} geometry={coast[i]} material={material}
          position={[p.x, base, p.z]} rotation-y={p.yaw} scale={[p.size[0], height, p.size[2]]} castShadow receiveShadow />;
      })}
      <group name="rounded-fire-ring" position={[CAMPFIRE.x, fireY - .03, CAMPFIRE.z]}>
        {Array.from({ length: 10 }, (_, i) => {
          const a = i / 10 * Math.PI * 2;
          return <mesh key={i} geometry={fire[i % 3]} material={material}
            position={[Math.cos(a) * .77, 0, Math.sin(a) * .77]} rotation-y={-a + (i % 3 - 1) * .14}
            scale={[.42, .18 + (i % 3) * .025, .48]} castShadow receiveShadow />;
        })}
      </group>
    </group>
  );
}
