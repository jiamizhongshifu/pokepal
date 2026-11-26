import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';
import { useOnline } from '../lib/network';
import './network-notice.css';

/**
 * A short note for the grown-up when the network drops or comes back: what still works without it, and that voices
 * and pictures return by themselves. It shows for a few seconds and never takes a tap.
 */
export function NetworkNotice() {
  const online = useOnline();
  const [shown, setShown] = useState<'off' | 'back' | null>(() => navigator.onLine ? null : 'off');
  // The words stay while the note fades out.
  const [said, setSaid] = useState<'off' | 'back'>('off');
  useEffect(() => { if (shown) setSaid(shown); }, [shown]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; if (online) return; }
    setShown(online ? 'back' : 'off');
  }, [online]);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), shown === 'off' ? 6000 : 3000);
    return () => clearTimeout(t);
  }, [shown]);
  const text = (shown ?? said) === 'back' ? '网络连上了，声音和图片会自己回来。' : '网络断了，玩过的地方还能接着玩，新的声音和图片连上网后补上。';
  return <div className={`network-notice${shown ? ' is-visible' : ''}`} role="status" aria-live="polite" aria-atomic="true" aria-hidden={!shown}>
    <Icon name="cloud" size={28} /><span>{text}</span>
  </div>;
}
