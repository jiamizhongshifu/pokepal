import type { CSSProperties } from 'react';
import { layerArt, type WorldArt } from '../data/sceneArt';

/** On a screen wider than the 3:2 scene, the same ground continues on each side as its mirror image: still the vector
 *  picture, sharp at any size. (Above and below, the host shows the picture's own sky and water colours: sceneEdge.) */
export function SceneFill({ scene }: { scene: WorldArt }) {
  const art = { '--scene-art': `url(${layerArt(scene, 'base')})` } as CSSProperties;
  return <>
    <div className="scene-side is-left" style={art} aria-hidden="true" />
    <div className="scene-side is-right" style={art} aria-hidden="true" />
  </>;
}
