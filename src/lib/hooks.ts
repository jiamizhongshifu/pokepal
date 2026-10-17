import { useEffect } from "react";
import { stopSpeech } from "./speech";

/** 进入页面时朗读一次，离开时停止 */
export function useIntro(fn: () => void, deps: unknown[] = []) {
  useEffect(() => {
    const t = setTimeout(fn, 250);
    return () => {
      clearTimeout(t);
      stopSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
