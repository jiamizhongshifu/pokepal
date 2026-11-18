import type { BallType } from "../types";
import { ICONS } from "../icons";

/** The invite berry a child offers to a new friend; every stored invite kind looks the same. */
export function InviteBerry({ size = 64, className = "" }: { type?: BallType; size?: number; className?: string }) {
  return <img src={ICONS["invite-berry"]} className={`invite-berry ${className}`} width={size} height={size} alt="" aria-hidden draggable={false} />;
}
