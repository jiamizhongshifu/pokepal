/** A pre-rendered illustrated clearing leaves the GPU free for the island. */
export default function WildMeadow() {
  return <div className="wild-meadow illustrated-meadow" aria-hidden="true">
    <img src="/scenes/flat-v1/world/meadow-clearing.webp" alt="" draggable={false}/>
  </div>;
}
