/** A pre-rendered illustrated clearing leaves the GPU free for the island. */
export default function WildMeadow() {
  return <div className="wild-meadow illustrated-meadow" aria-hidden="true">
    <img src="/art/world/meadow-clearing-v1.png" alt="" fetchPriority="high" draggable={false}/>
  </div>;
}
