import type { ImgHTMLAttributes } from 'react';
import { CreatureImg } from './CreatureImg';
import { Icon } from '../icons';
import { useBuddyArt } from './useBuddyArt';
import { useAnswerMood } from '../lib/answerMood';
import { MOOD_MARK } from '../island/mood';
import './buddy-mood.css';

/**
 * The buddy beside an answer card, wearing the face of the moment. It also hops at a found answer and sways at a
 * try-again, with the same small sign over it as a friend on the island, so a grown buddy without faces answers too.
 */
export function BuddyImg({ id, className, ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'id'> & { id: number }) {
  const mood = useAnswerMood();
  return <>
    <CreatureImg {...rest} className={[className, mood !== 'idle' && `buddy-is-${mood}`].filter(Boolean).join(' ') || undefined} src={useBuddyArt(id)} />
    {mood !== 'idle' && <i key={mood} className="buddy-mood-mark" aria-hidden="true"><Icon name={MOOD_MARK[mood === 'good' ? 'cheer' : 'thinking']} size={44} /></i>}
  </>;
}
