import type { BallType } from "../types";
import { ICONS } from "../icons";

export function PokeBall({ type, size = 64, className = "" }: { type: BallType; size?: number; className?: string }) {
  return <img src={ICONS[`ball-${type}`]} className={`pokeball ${className}`} width={size} height={size} alt="" aria-hidden draggable={false} />;
}
