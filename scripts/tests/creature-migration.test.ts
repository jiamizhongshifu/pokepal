import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSave } from '../../src/lib/saveValidation';
import { currentCreatureId, migrateCreatureIds } from '../../src/lib/creatureMigration';
import { CREATURES, getCreature, isCreatureId } from '../../src/data/creatures';
import { LEGACY_CREATURE } from '../../src/data/legacyCreatureMap';

const legacy = () => JSON.parse(readFileSync('scripts/tests/fixtures/legacy-save.json', 'utf8'));

test('every legacy character id maps to an existing island creature, and new ids pass through', () => {
 assert.equal(Object.keys(LEGACY_CREATURE).length, 388);
 for (const [old, id] of Object.entries(LEGACY_CREATURE)) assert.ok(isCreatureId(id), `${old} → ${id}`);
 for (const c of CREATURES) assert.equal(currentCreatureId(c.id), c.id);
 assert.equal(currentCreatureId(99999), undefined);
 assert.equal(getCreature(25).id, LEGACY_CREATURE[25], 'stored legacy ids (diary companions) still resolve');
});

test('an old save loads with every stored id rewritten, and the imported backup object is left untouched', () => {
 const old = legacy(); const copy = structuredClone(old);
 const s = validateSave(old);
 assert.deepEqual(old, copy);
 assert.deepEqual(s.captures.map(c => c.id), copy.captures.map((c: { id: number }) => LEGACY_CREATURE[c.id]));
 assert.deepEqual(s.settings.favorites, copy.settings.favorites.map((id: number) => LEGACY_CREATURE[id]));
 assert.ok(s.captures.every(c => isCreatureId(c.id)));
 assert.deepEqual(validateSave(s), s, 'migrating twice changes nothing');
});

test('friends that land on the same creature merge without losing friendship or the first meeting', () => {
 const s = legacy();
 const [a, b] = Object.entries(LEGACY_CREATURE).reduce<[number, number] | undefined>((found, [id, to], _, all) => found ?? (() => { const twin = all.find(([o, t]) => t === to && o !== id); return twin ? [Number(id), Number(twin[0])] as [number, number] : undefined; })(), undefined)!;
 s.captures = [{ id: a, caughtAt: 200, ball: 'poke', friendship: 30 }, { id: b, caughtAt: 100, ball: 'poke', friendship: 80 }];
 s.settings.favorites = [a, b]; s.dex = [a, b]; s.daily.caught = [a, b]; s.catchWish = a;
 s.picnic = { version: 1, memories: [{ id: 'm1', pokemonId: a, berry: 'apple', at: 1 }], session: { id: 'p1', pokemonId: b, berry: 'apple', createdAt: 1 } };
 s.islandLiving = { ...(s.islandLiving ?? {}), memories: [{ id: 'l1', kind: 'ball', partners: [a, b], at: 1, context: 'play' }] };
 assert.equal(migrateCreatureIds(s), true);
 const to = LEGACY_CREATURE[a];
 assert.deepEqual(s.captures, [{ id: to, caughtAt: 100, ball: 'poke', friendship: 80 }]);
 assert.deepEqual(s.settings.favorites, [to]); assert.deepEqual(s.dex, [to]); assert.deepEqual(s.daily.caught, [to]);
 assert.equal(s.catchWish, to); assert.equal(s.picnic.memories[0].pokemonId, to); assert.equal(s.picnic.session.pokemonId, to);
 assert.deepEqual(s.islandLiving.memories[0].partners, [to]);
 assert.equal(migrateCreatureIds(s), false);
});

test('unrecognised ids are kept so validation rejects the corrupt save instead of silently dropping records', () => {
 const s = legacy();
 s.captures.push({ id: 99999, caughtAt: 1, ball: 'poke', friendship: 0 });
 migrateCreatureIds(s);
 assert.ok(s.captures.some((c: { id: number }) => c.id === 99999));
 assert.throws(() => validateSave(s), /伙伴编号/);
});
