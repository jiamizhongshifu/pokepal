import { BlockingDialog } from "./BlockingDialog";
import { useEffect, useMemo, useState } from "react";
import { sfx } from "../lib/speech";
import { Icon } from "../icons";

/** A short shower: fewer pieces on a phone, and gone from the page once the last one has fallen. */
export function Confetti({ count = 36 }: { count?: number }) {
  const [falling, setFalling] = useState(true);
  useEffect(() => { const t = setTimeout(() => setFalling(false), 3600); return () => clearTimeout(t); }, []);
  const pieces = useMemo(
    () =>
      Array.from({ length: typeof innerWidth === "number" && innerWidth < 600 ? Math.min(count, 18) : count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.6 + Math.random() * 1.2,
        icon: ["star", "sparkle", "heart", "sparkle", "star"][i % 5],
        size: 26 + Math.random() * 26
      })),
    [count]
  );
  if (!falling) return null;
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
