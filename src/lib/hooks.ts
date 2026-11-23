import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { stopSpeech } from "./speech";

/** 进入页面时朗读一次，离开时停止 */
export function useIntro(fn: () => void) {
  const intro = useEvent(fn);
  useEffect(() => {
    const t = setTimeout(intro, 250);
    return () => {
      clearTimeout(t);
      stopSpeech();
    };
  }, [intro]);
}

/**
 * A function with a fixed identity that always runs the latest render's version.
 * Effects list it as a dependency without re-running when the values it reads change.
 */
export function useEvent<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const latest = useRef(fn);
  useLayoutEffect(() => { latest.current = fn; });
  return useCallback((...args: A) => latest.current(...args), []);
}
