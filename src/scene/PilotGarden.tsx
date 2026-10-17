import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { PILOT_GARDEN as G } from "./layout";
import { terrainHeight } from "./hq/Terrain";
import { BerryBush } from './hq/PokeProps';

const path = (name: string) => `/models/garden/${name}.glb`;
const at = (p: { x: number; z: number }): [number, number, number] => [p.x, terrainHeight(p.x, p.z), p.z];

/** Resting spot only; wildflowers are distributed by Grass. */
export function PilotGarden() {
  const assets = useGLTF([path("bench")], false);
  const objects = useMemo(() => assets.map(({ scene }) => {
    const copy = scene.clone(true);
    copy.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
    return copy;
  }), [assets]);
  return <group name="pilot-garden">
    <BerryBush {...G.tree} berry="pecha" s={1.2}/>
    <primitive object={objects[0]} name="garden-bench" position={at(G.bench)} rotation-y={G.bench.yaw}/>
  </group>;
}
