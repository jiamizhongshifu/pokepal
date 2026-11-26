import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { FALLBACK_PICTURES, RUNTIME_CACHE, WITH_APP } from '../online/offline-cache';
import { ICONS } from '../../src/icons';
import { BABY_CREATURES, CREATURES, creatureArt, creatureAvatar, creatureExpression } from '../../src/data/creatures';
import { layerArt, pathArt, storyBackground, storyProp } from '../../src/data/sceneArt';

/**
 * Once a page has been opened, its pictures and voice keep working without a network: every kind of address the app
 * asks for is kept by the service worker. A new picture format or folder that no rule covers would quietly work only
 * while online (the switch to SVG once did exactly that).
 */
const kept = (url: string) => WITH_APP.includes(url.replace(/^\//, '')) || RUNTIME_CACHE.some(rule => rule.urlPattern.test(url));
const hex = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 24);

test('every picture, recording and sound the app loads is kept for use without a network', () => {
  const urls = [
    ...Object.values(ICONS),
    ...CREATURES.flatMap(c => [creatureArt(c.id), creatureAvatar(c.id)]),
    ...BABY_CREATURES.map(c => creatureExpression(c.id, 'cheer')),
    pathArt(0), pathArt(5), layerArt('island-map', 'base'), layerArt('island-map', 'side-left'), storyBackground('meadow'), storyProp('bench'),
    `/voice-online/index/${hex('index')}.json`, `/voice-online/packs/${hex('pack')}.bin`,
    '/music/morning-v1.m4a', '/environment/waves-v1.m4a',
  ];
  assert.deepEqual(urls.filter(url => !kept(url)), [], 'Add a rule for this kind of address to RUNTIME_CACHE (or the file to WITH_APP) in scripts/online/offline-cache.ts.');
});

test('the pictures a failed picture falls back to come with the app itself', () => {
  for (const url of [ICONS.face, ICONS['invite-berry']]) assert.ok(FALLBACK_PICTURES.includes(url.replace(/^\//, '')), `${url} must be in FALLBACK_PICTURES`);
});
