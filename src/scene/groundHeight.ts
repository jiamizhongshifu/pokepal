// Pure terrain math shared by navigation and rendering; no renderer in the app entry bundle.
import {grassMask,islandK} from './layout';
const TERRACE=.3;
const sstep=(a:number,b:number,v:number)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t);};
const lerp=(a:number,b:number,t:number)=>(1-t)*a+t*b;
/** 草地台地的抬升高度 */
export function terraceAt(x: number, z: number) {
  return TERRACE * sstep(0.32, 0.62, grassMask(x, z));
}

export function terrainHeight(x: number, z: number) {
  const k = islandK(x, z);
  // 沙地广场几乎平整，只有很轻的起伏；草地台地整体抬高
  const n = 0.04 + Math.sin(x * 0.7) * Math.cos(z * 0.6) * 0.02 + terraceAt(x, z);
  if (k < 0.95) return n * (1 - k * 0.1);
  if (k < 1.05) return lerp(n * 0.9, -0.04, (k - 0.95) / 0.1);
  // 沙滩：缓坡，大约在 k≈1.32 处没入海面（海面 y=-0.12）
  if (k < 1.6) return lerp(-0.04, -0.28, (k - 1.05) / 0.55);
  return lerp(-0.28, -1.6, Math.min(1, (k - 1.6) / 0.8));
}

