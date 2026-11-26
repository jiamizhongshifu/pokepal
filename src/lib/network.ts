import { useEffect, useState } from 'react';
import { useEvent } from './hooks';

/** What to tell when a voice did not play: without a network it is not "not ready", it is waiting for the network. */
export const voiceMissNote = (whenReady: string) => navigator.onLine ? whenReady : '网络断了，连上网后伙伴会自动接着说。';

/** Run `retry` once the network comes back, while `waiting` (a voice or picture that failed for want of it). */
export function useBackOnline(waiting: boolean, retry: () => void) {
  const run = useEvent(retry);
  useEffect(() => {
    if (!waiting) return;
    addEventListener('online', run);
    return () => removeEventListener('online', run);
  }, [waiting, run]);
}

/** Whether the device has a network now, following it as it drops and returns. */
export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    addEventListener('online', on); addEventListener('offline', off);
    return () => { removeEventListener('online', on); removeEventListener('offline', off); };
  }, []);
  return online;
}
