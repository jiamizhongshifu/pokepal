import { useEffect } from 'react';
import { Icon } from '../icons';
import { setAnswerMood } from '../lib/answerMood';
import './feedback-strip.css';

export type FeedbackTone = 'idle' | 'good' | 'again';

/**
 * The line at the foot of an answer card. Found it: soft green with a tick. Try again: the hint blue with the retry badge, never red,
 * and because it looks like something to press, pressing it plays the question again.
 */
export function FeedbackStrip({ tone, onReplay, children }: { tone: FeedbackTone; onReplay?: () => void; children: React.ReactNode }) {
  // The buddy beside the card shares the moment; it goes back to its usual pose when the card leaves.
  useEffect(() => { setAnswerMood(tone); return () => setAnswerMood('idle'); }, [tone]);
  const body = <>
    {tone === 'good' && <i className="feedback-mark" aria-hidden="true">✓</i>}
    {tone === 'again' && <i className="feedback-mark" aria-hidden="true"><Icon name="refresh" size={22} /></i>}
    <span>{children}</span>
  </>;
  return <div className="feedback-strip-host" role="status">
    {tone === 'again' && onReplay
      ? <button type="button" className="feedback-strip is-again is-tappable" onClick={onReplay}>{body}</button>
      : <p className={`feedback-strip is-${tone}`}>{body}</p>}
  </div>;
}
