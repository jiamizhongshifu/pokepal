import { useEffect, useRef, useState } from "react";
import { sfx } from "../../lib/speech";

/**
 * 答错卡片留在原位并变淡；减少可选项，但不移动孩子正在观察的图片。
 */
export function useChoice<T>(options: T[], correct: T) {
  const [removed, setRemoved] = useState<T[]>([]);
  const [solved, setSolved] = useState(false);
  const solvedRef = useRef(false);
  const [shake, setShake] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  const visible = options;
  const pick = (o: T): "correct" | "wrong" | "ignored" => {
    if (solvedRef.current || pending.current || removed.includes(o)) return "ignored";
    if (o === correct) {
      solvedRef.current = true;
      sfx("ding");
      setSolved(true);
      return "correct";
    }
    sfx("boop");
    pending.current = true;
    setShake(o);
    timer.current = setTimeout(() => {
      pending.current = false;
      setShake(null);
      setRemoved((r) => [...r, o]);
    }, 500);
    return "wrong";
  };
  return { visible, pick, solved, shake, eliminated: removed, hint: removed.length >= options.length - 1 };
}
