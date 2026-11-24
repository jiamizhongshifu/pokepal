import { layerArt } from '../data/sceneArt';
import { ISLAND_PIECES, LAYER_AREA } from './islandLayers';
import type { District } from './world';
import './island-art.css';

/**
 * The island drawn as vectors: the ground, then each piece on its own so the windmill turns, the fire flickers,
 * the boat rocks and a tapped area hops. Pieces sit where they were in the painted island (% of the picture).
 */
export function IslandArt({ className, nudged, still }: { className: string; nudged?: District | null; still?: boolean }) {
 return <div className={`island-art ${className}${still ? ' is-still' : ''}`} aria-hidden="true">
  <img className="island-art-ground" src={layerArt('island-map', 'base')} alt="" draggable={false} />
  {ISLAND_PIECES.map(([name, b]) => <img key={name} className={`island-art-piece${nudged && LAYER_AREA[name] === nudged ? ' is-nudged' : ''}`} data-piece={name}
   src={layerArt('island-map', name)} alt="" draggable={false} style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }} />)}
 </div>;
}
