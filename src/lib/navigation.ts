import type { TaskKind } from '../data/tasks';
import { withTransition } from './viewTransition';

export interface DexBrowseState { onlyOwned:boolean; query:string; generation:number; scrollTop:number; filtersOpen:boolean; focusId:number }

export type Screen =
  | { name: "welcome" }
  | { name: "home"; view?:"island"; station?:string; companion?:number }
  | { name: "lesson"; id:string }
  | { name: "notebook"; mode?:'all'|'saved'|'retry'; returnTo?:'parent' }
  | { name: "review"; keys:string[]; returnTo?:'home'|'parent' }
  | { name: "practice" }
  | { name: "diary"; id?:string }
  | { name: "stories" }
  | { name: "story"; id:string }
  | { name: "task"; kind: TaskKind; boardIndex: number | null; practice?:boolean; session?:number }
  | { name: "catch" }
  | { name: "dex"; picking?: boolean; browse?:DexBrowseState }
  | { name: "dexDetail"; id: number; picking?: boolean; browse?:DexBrowseState }
  | { name: "parent" };

const browsable: ReadonlySet<Screen['name']> = new Set(['home', 'stories', 'dex', 'dexDetail', 'notebook', 'practice', 'parent', 'catch']);
const sameScreen = (a: Screen, b: Screen) => JSON.stringify(a) === JSON.stringify(b);

export function createNavigation(read: () => Screen, display: (screen: Screen) => void, transition = withTransition) {
  let trail: Screen[] = [];
  let heading: Screen | undefined;
  let revision = 0;

  function show(screen: Screen) {
    heading = screen;
    const ticket = revision;
    transition(() => {
      if (ticket !== revision) return;
      display(screen);
      if (heading === screen) heading = undefined;
    });
  }

  return {
    show,
    go(screen: Screen) {
      const from = heading ?? read();
      if (trail.length && trail[trail.length - 1].name === screen.name) trail.pop();
      else if (browsable.has(from.name) && !sameScreen(from, screen)) trail = [...trail.slice(-19), from];
      show(screen);
    },
    back() {
      const here = heading ?? read();
      let to = trail.pop();
      while (to && sameScreen(to, here)) to = trail.pop();
      show(to ?? { name: 'home' });
    },
    reset() {
      // A navigation awaiting its transition must never reopen the previous family's page.
      revision++;
      heading = undefined;
      trail = [];
    },
  };
}
