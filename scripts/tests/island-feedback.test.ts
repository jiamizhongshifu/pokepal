import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { PLAYS } from '../../src/island/plays';
import { DISTRICTS, PLACES, placesIn } from '../../src/island/world';
import { SCENE_LAYOUT } from '../../src/island/sceneLayout';
import { hiddenToday } from '../../src/island/hidden';
import { FIND_SPOTS } from '../../src/lib/islandAsk';
import { MOOD_MARK, SENTENCE_MOODS, type Mood } from '../../src/island/mood';
import { BABY_CREATURES, creatureExpression } from '../../src/data/creatures';
import { ICON_ASSETS as ICONS } from '../../src/icons/generated';

/** What a child does on the island always shows: the friend answers, and nothing to tap hides another. */

test('the friend acts out every sentence the child can say to it', () => {
  const said = PLAYS.filter(p => p.kind === 'lead').flatMap(p => p.pool);
  assert.deepEqual(said.filter(s => !SENTENCE_MOODS[s]), [], 'Give the sentence a mood in SENTENCE_MOODS (src/island/mood.ts).');
});

test('media: every mood has a face for each young friend and a sign for grown ones', () => {
  const moods = Object.keys(MOOD_MARK) as Mood[];
  const missing = BABY_CREATURES.flatMap(c => moods.map(m => `public${creatureExpression(c.id, m)}`)).filter(path => !existsSync(path));
  assert.deepEqual(missing, [], 'Draw the expression, or pick a mood the friends already have.');
  assert.deepEqual(moods.filter(m => !(MOOD_MARK[m] in ICONS)), [], 'A mood sign must be an existing icon.');
});

test('the activities offered in one scene have different pictures', () => {
  const same = DISTRICTS.flatMap(d => {
    const icons = PLAYS.filter(p => placesIn(d.id).some(place => place.id === p.place)).map(p => `${p.icon}`);
    return icons.filter((icon, i) => icons.indexOf(icon) !== i).map(icon => `${d.name}: ${icon}`);
  });
  assert.deepEqual(same, [], 'A child tells the activities of a scene apart only by their picture: give each its own icon.');
});

test('things to find never cover each other', () => {
  const HIGH = 44, WIDE = 30, covered: string[] = [];
  FIND_SPOTS.forEach((a, i) => FIND_SPOTS.slice(i + 1).forEach(b => {
    if (Math.abs(a[0] - b[0]) < WIDE && Math.abs(a[1] - b[1]) < HIGH) covered.push(`${a} / ${b}`);
  }));
  assert.deepEqual(covered, []);
  assert.ok(FIND_SPOTS.every(([x, y]) => x + WIDE <= 100 && y + HIGH <= 100), 'Every thing stays inside the box.');
});

test('media: every place stands in its scene as an object a child can tap, and objects keep apart', () => {
  const missing = PLACES.filter(p => !SCENE_LAYOUT[p.district].objects[p.id]).map(p => p.name);
  assert.deepEqual(missing, [], 'Give the place an object in SCENE_LAYOUT (src/island/sceneLayout.ts): its activities start from it.');
  const art = Object.values(SCENE_LAYOUT).flatMap(l => Object.values(l.objects)).filter(o => 'icon' in o.art ? !(o.art.icon in ICONS) : !existsSync(`public/scenes/flat-v1/prop/${o.art.prop}.svg`));
  assert.deepEqual(art, [], 'An object is drawn with an existing icon or prop.');
  const close = Object.entries(SCENE_LAYOUT).flatMap(([d, l]) => {
    const all = Object.entries(l.objects);
    return all.flatMap(([a, x], i) => all.slice(i + 1).filter(([, y]) => Math.abs(x.spot[0] - y.spot[0]) < (x.size + y.size) / 2 && Math.abs(x.spot[1] - y.spot[1]) < 10).map(([b]) => `${d}: ${a} / ${b}`));
  });
  assert.deepEqual(close, [], 'Objects in one scene stand apart, so each can be tapped.');
});

test('the beach keeps its right side for the boat that brings a new friend', () => {
  // .beach-boat (island-home.css) stands at the right of the beach, from about 70% across and halfway down.
  const under = Object.entries(SCENE_LAYOUT.beach.objects).filter(([, o]) => o.spot[0] + o.size / 2 > 70 && o.spot[1] > 50).map(([id]) => id);
  assert.deepEqual(under, [], 'An object under the boat cannot be tapped: the boat takes the tap.');
});

test('each scene toy is placed once', () => {
  const toys = Object.values(SCENE_LAYOUT).flatMap(l => Object.values(l.objects)).flatMap(o => o.toy ? [o.toy.kind] : []).sort();
  assert.deepEqual(toys, ['castle', 'roast', 'shake']);
});

test('the little surprises hide only learned picture words, not ones lying in the scene, and change by day', () => {
  const learned = ['ball', 'book', 'hat', 'apple', 'red', 'Hello!', 'fish', 'bird', 'star', 'moon'];
  const a = hiddenToday(learned, ['ball'], 'camp', '2026-11-26', 3), b = hiddenToday(learned, ['ball'], 'camp', '2026-11-27', 3);
  assert.equal(a.length, 3);
  assert.ok(a.every(k => learned.includes(k) && k !== 'ball' && k !== 'red' && k !== 'Hello!'), 'No colour, sentence or thing already in the scene.');
  assert.deepEqual(a, hiddenToday(learned, ['ball'], 'camp', '2026-11-26', 3), 'The same all day.');
  assert.notDeepEqual(a, b, 'Another set tomorrow.');
  assert.deepEqual(hiddenToday([], [], 'camp', '2026-11-26', 3), [], 'Nothing hides before anything is learned.');
});

test('media: every scene has three hiding places apart from its objects, drawn with existing art', () => {
  const wrong = Object.entries(SCENE_LAYOUT).flatMap(([d, l]) => {
    const art = l.hides.filter(h => 'icon' in h.art ? !(h.art.icon in ICONS) : !existsSync(`public/scenes/flat-v1/prop/${h.art.prop}.svg`)).map(() => `${d}: missing art`);
    // Each covers its width across and, on a 3:2 screen, about 1.4 times that upward from its foot.
    const box = (p: { spot: readonly [number, number]; size: number }) => [p.spot[0] - p.size / 2, p.spot[0] + p.size / 2, p.spot[1] - p.size * 1.4, p.spot[1]];
    const meet = (a: number[], b: number[]) => a[0] < b[1] && b[0] < a[1] && a[2] < b[3] && b[2] < a[3];
    const close = l.hides.flatMap((h, i) => [...Object.entries(l.objects), ...l.hides.slice(i + 1).map(x => ['another hide', x] as const)].filter(([, o]) => meet(box(o), box(h))).map(([id]) => `${d}: hide at ${h.spot} / ${id}`));
    return [...(l.hides.length === 3 ? [] : [`${d}: ${l.hides.length} hides`]), ...art, ...close];
  });
  assert.deepEqual(wrong, []);
});

test('no friend stands in front of a hiding place', () => {
  // A friend covers about 12% to each side of where it stands and some 30% above its feet.
  const hidden = Object.entries(SCENE_LAYOUT).flatMap(([d, l]) => l.hides.filter(h => l.friends.some(f => Math.abs(f[0] - h.spot[0]) < 12 && h.spot[1] > f[1] - 30 && h.spot[1] <= f[1] + 2)).map(h => `${d}: ${h.spot}`));
  assert.deepEqual(hidden, [], 'Move the hiding place to the front or the sides of the scene.');
});
