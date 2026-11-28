import test from 'node:test';
import assert from 'node:assert/strict';
import { createNavigation, type Screen } from '../../src/lib/navigation';

test('fast taps remember a pending browse destination and skip finished activities on back', () => {
  const updates: (() => void)[] = [];
  let screen: Screen = {name: 'home'};
  const nav = createNavigation(() => screen, next => { screen = next; }, cb => updates.push(cb));
  nav.go({name: 'stories'});
  nav.go({name: 'story', id: 'magic-words'});
  nav.back();
  updates.splice(0).forEach(update => update());
  assert.deepEqual(screen, {name: 'stories'});
  nav.back();
  updates.shift()!();
  assert.deepEqual(screen, {name: 'home'});
});

test('replacing a save cancels in-flight page changes and clears the browse trail', () => {
  const updates: (() => void)[] = [];
  let screen: Screen = {name: 'parent'};
  const nav = createNavigation(() => screen, next => { screen = next; }, cb => updates.push(cb));
  nav.go({name: 'stories'});
  nav.reset();
  screen = {name: 'welcome'};
  updates.shift()!();
  assert.deepEqual(screen, {name: 'welcome'});
  nav.back();
  updates.shift()!();
  assert.deepEqual(screen, {name: 'home'});
});
