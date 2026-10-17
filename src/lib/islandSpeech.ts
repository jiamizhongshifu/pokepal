import { modalIsOpen } from './modalLayer';
import { playLimitSeconds, useGame } from '../store';
import { playCry, sayWhile, sayCancellableWhile, type Part } from './speech';

/** The island stays mounted between screens; its audio belongs only to home. */
export function islandAudioAllowed() {
  const { screen, save, loaded, saveIssue } = useGame.getState();
  return loaded && !saveIssue && screen.name === 'home' && !document.hidden
    && !modalIsOpen() && !document.querySelector('dialog[open]') && !!save.trainer && save.daily.playSeconds < playLimitSeconds(save);
}

export const sayOnIsland = (...parts: Part[]) => sayWhile(islandAudioAllowed, ...parts);
export const narrateOnIsland = (...parts: Part[]) => sayCancellableWhile(islandAudioAllowed, ...parts);
export const cryOnIsland = (id: number) => islandAudioAllowed() ? playCry(id) : Promise.resolve();
