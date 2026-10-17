import { BASE_OBSTACLES, BEACH_TOWEL, PICNIC, obstacleDist } from './layout';
import { DECOR_RESERVED } from './decorationLayout';

/** Keep path pebbles out of both solid models and flat furnishing surfaces.
 * Reserve optional decorations too, so adding one never buries a path. */
export function pathDetailClear(x:number,z:number,radius=.36) {
  if (Math.hypot(x-BEACH_TOWEL.x,z-BEACH_TOWEL.z)<BEACH_TOWEL.r+radius) return false;
  if (BASE_OBSTACLES.some(o=>obstacleDist(o,x,z)<o.r+radius+.08)) return false;
  if (DECOR_RESERVED.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+radius+.06)) return false;
  // The upgraded picnic cloth is wider than the optional table's collider.
  if (Math.abs(x-PICNIC.x)<1.35+radius && Math.abs(z-PICNIC.z)<.9+radius) return false;
  return true;
}
