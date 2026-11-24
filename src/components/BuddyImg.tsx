import type { ImgHTMLAttributes } from 'react';
import { CreatureImg } from './CreatureImg';
import { useBuddyArt } from './useBuddyArt';

/** The buddy beside an answer card, wearing the face of the moment. */
export function BuddyImg({ id, ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'id'> & { id: number }) {
  return <CreatureImg {...rest} src={useBuddyArt(id)} />;
}
