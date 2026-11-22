/**
 * A save for looking at what only appears late on the path: every lesson learned, and every island errand done
 * except the last one (so one errand is still waiting at the tent). Built from the test fixture with the same
 * functions the game uses, so it stays valid when the save format changes.
 *
 *   npx tsx scripts/dev/all-learned-save.ts            # writes output/test-saves/all-learned.json
 *
 * Open the dev server on an address the family save does not live on (http://127.0.0.1:5180 instead of
 * http://localhost:5180: a different origin has its own storage) and import the file in 家长中心 → 应用维护,
 * or from the console: `__game.getState().importSave(await (await fetch('/@fs/<absolute path>')).json())`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LEARNING_UNITS, unitRoundCount } from '../../src/data/curriculum';
import { attempt, progressUnit } from '../../src/lib/learningProgress';
import { finishErrand } from '../../src/island/errands';
import { validateSave } from '../../src/lib/saveValidation';
import { BABY_CREATURES } from '../../src/data/creatures';

const DAY = 86400000, now = Date.now();
const s = validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json', 'utf8')));
s.learning = { version: 1, records: {}, units: {} };
LEARNING_UNITS.forEach((u, i) => {
 const at = now - (LEARNING_UNITS.length - i + 2) * DAY;
 progressUnit(s, u.id, unitRoundCount(u), at);
 for (const key of [...u.words, u.phrase]) attempt(s, key, true, false, `unit:${u.id}`, at);
 if (i < LEARNING_UNITS.length - 1) finishErrand(s, u.id, undefined, at + 3600000);
});
// Friends whose own wishes cover every way of playing, including the two that repeat after the child.
const friends = ['bubbo', 'sayo', 'shady', 'rainbo', 'mossy', 'twinkle', 'nutty', 'moony'];
s.captures = friends.map((species, i) => ({ ...s.captures[0], id: BABY_CREATURES.find(c => c.species === species)!.id, friendship: 20 + i, played: 2 }));
s.dex = s.captures.map(c => c.id);
s.trainer = { ...s.trainer!, name: '测试小朋友' };
s.daily = { ...s.daily, date: new Date(now).toLocaleDateString('en-CA'), playSeconds: 0, heard: 0, words: [] };
delete s.islandWishes; delete s.islandParties;
const out = resolve('output/test-saves/all-learned.json');
mkdirSync(resolve('output/test-saves'), { recursive: true });
writeFileSync(out, JSON.stringify(validateSave(JSON.parse(JSON.stringify(s)))));
console.log(out, `lessons ${LEARNING_UNITS.length}, friends ${friends.join(' ')}`);
