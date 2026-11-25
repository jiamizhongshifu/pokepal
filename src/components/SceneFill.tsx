import type { CSSProperties } from 'react';
import { layerArt, type WorldArt } from '../data/sceneArt';

/** On a screen wider than the 3:2 scene, the ground goes on at each side in its own painted continuation (vector,
 *  sharp at any size), out to open sky and sea. Above and below, the host shows the picture's sky and water: sceneEdge. */
export function SceneFill({ scene }: { scene: WorldArt }) {
  const art = (side: string) => ({ '--scene-art': `url(${layerArt(scene, `side-${side}`)})` }) as CSSProperties;
  return <>
    <div className="scene-side is-left" style={art('left')} aria-hidden="true" />
    <div className="scene-side is-right" style={art('right')} aria-hidden="true" />
  </>;
}
