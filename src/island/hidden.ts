import { learningEntry } from '../data/curriculum';
import { seedOf } from '../lib/islandAsk';
import type { District } from './world';

/** The things hidden today in a scene: learned picture words not already lying in it, a different set each day. */
export function hiddenToday(learned: Iterable<string>, lying: readonly string[], district: District, date: string, count: number): string[] {
 const pool = [...new Set(learned)].filter(k => { const e = learningEntry(k); return e?.kind === 'word' && !e.css && !lying.includes(e.key); });
 return pool.map(k => ({ k, n: seedOf(`${date}|${district}|${k}`) })).sort((a, b) => a.n - b.n).slice(0, count).map(x => x.k);
}
