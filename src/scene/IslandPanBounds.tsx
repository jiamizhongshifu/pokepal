import { islandExpansion } from './layout';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils } from 'three';
import type { OrbitControls } from 'three-stdlib';

/** Two-finger ground pan avoids iPadOS's reserved three-finger editing gesture. */
export function IslandPanBounds({disabled=false}:{disabled?:boolean}) {
  const {camera,controls}=useThree();
  useFrame(()=>{
    if(!controls||disabled)return;
    const target=(controls as OrbitControls).target;
    const x=MathUtils.clamp(target.x,-18,18)-target.x;
    const z=MathUtils.clamp(target.z,-16-islandExpansion*3,14)-target.z;
    target.x+=x;target.z+=z;
    camera.position.x+=x;camera.position.z+=z;
  });
  return null;
}
