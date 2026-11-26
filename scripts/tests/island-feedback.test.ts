import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { PLAYS } from '../../src/island/plays';
import { DISTRICTS, PLACES, placesIn } from '../../src/island/world';
import { SCENE_LAYOUT } from '../../src/island/sceneLayout';
import { FIND_SPOTS } from '../../src/lib/islandAsk';
import { MOOD_MARK, SENTENCE_MOODS, type Mood } from '../../src/island/mood';
import { BABY_CREATURES, creatureExpression } from '../../src/data/creatures';
import { ICON_ASSETS as ICONS } from '../../src/icons/generated';

/** What a child does on the island always shows: the friend answers, and nothing to tap hides another. */

test('the friend acts out every sentence the child can say to it', () => {
  const said = PLAYS.filter(p => p.kind === 'lead').flatMap(p => p.pool);
  assert.deepEqual(said.filter(s => !SENTENCE_MOODS[s]), [], 'Give the sentence a mood in SENTENCE_MOODS (src/island/mood.ts).');
});

test('every mood has a face for each young friend and a sign for grown ones', () => {
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

test('every place stands in its scene as an object a child can tap, and objects keep apart', () => {
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
