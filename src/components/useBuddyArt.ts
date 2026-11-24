import { useEffect } from 'react';
import { creatureArt, creatureExpression } from '../data/creatures';
import { moodExpression, useAnswerMood } from '../lib/answerMood';

/** The buddy's picture for the moment: cheering when the answer is found, thinking along on a try-again, its usual pose otherwise. */
export function useBuddyArt(id: number) {
  const expression = moodExpression(useAnswerMood());
  // Both faces are fetched up front, so the change is instant when the answer lands.
  useEffect(() => { for (const e of ['cheer', 'thinking']) new Image().src = creatureExpression(id, e); }, [id]);
  return expression ? creatureExpression(id, expression) : creatureArt(id);
}
