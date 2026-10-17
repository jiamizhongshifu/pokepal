import { BlockingDialog } from "./BlockingDialog";
import { useEffect, useMemo } from "react";
import { sfx } from "../lib/speech";
import { Icon } from "../icons";

export function Confetti({ count = 36 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.6 + Math.random() * 1.2,
        icon: ["star", "sparkle", "heart", "sparkle", "star"][i % 5],
        size: 26 + Math.random() * 26
      })),
    [count]
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}>
          <Icon name={p.icon} size={p.size} />
        </span>
      ))}
    </div>
  );
}

export function Celebration({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  useEffect(() => {
    sfx("sparkle");
  }, []);
  return (
    <BlockingDialog className="modal-backdrop celebrate" label="这次的小收获" onClose={onClose}>
      <Confetti />
      <div className="modal celebrate-card" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </BlockingDialog>
  );
}
