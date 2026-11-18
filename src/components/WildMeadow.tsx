import { worldArt } from '../data/sceneArt';
/** A pre-rendered illustrated clearing leaves the GPU free for the island. */
export default function WildMeadow() {
  return <div className="wild-meadow illustrated-meadow" aria-hidden="true">
    <img src={worldArt('meadow-clearing')} alt="" draggable={false}/>
  </div>;
}
