import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const read = path => JSON.parse(readFileSync(path, 'utf8'));

/** Game data for each species merged with its art-only description (prototype animal, stage bodies, look-alikes to avoid). */
export function loadCreatures() {
 const art = new Map(read(resolve(here, 'creature-art.json')).map(a => [a.id, a]));
 return read(resolve(root, 'src/data/creatures.json')).map(s => {
  const a = art.get(s.id);
  if (!a) throw new Error(`creature-art.json 缺少 ${s.id}`);
  return { ...s, animal: a.animal, word: a.word, not: a.not, portrait: a.portrait ?? '', stages: s.stages.map((st, i) => ({ ...st, body: a.stages[i].body })) };
 });
}
