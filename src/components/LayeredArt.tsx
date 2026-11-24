import { layerArt } from '../data/sceneArt';
import { scenePieces, type LayeredScene } from '../data/sceneLayers';
import './layered-art.css';

/**
 * A painted scene drawn as vectors: its ground, then each piece on its own so the windmill turns, the fire
 * flickers and the boat rocks. Pieces sit where they were in the painting (% of the picture). `area` and `nudged`
 * let a tapped area's pieces hop; `still` pauses the little motions while the screen is out of sight.
 */
export function LayeredArt({ className, ground, scene, area, nudged, still }: { className: string; ground: string; scene: LayeredScene; area?: Record<string, string>; nudged?: string | null; still?: boolean }) {
 return <div className={`layered-art ${className}${still ? ' is-still' : ''}`} aria-hidden="true">
  <img className="layered-art-ground" src={ground} alt="" draggable={false} />
  {scenePieces(scene).map(([name, b]) => <img key={name} className={`layered-art-piece${nudged && area?.[name] === nudged ? ' is-nudged' : ''}`} data-piece={name}
   src={layerArt(scene, name)} alt="" draggable={false} style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }} />)}
 </div>;
}
