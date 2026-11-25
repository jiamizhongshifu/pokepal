import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every text size is a step of the type scale in src/brand-tokens.css: var(--text-xs … --text-6xl), or a
 * var(--text-step-…) that takes one size on a phone and one from 601px. A size that follows the screen width (vw in a
 * clamp) or a written pixel value lands between the steps and makes the same kind of text a different size on every
 * page. Allowed besides: labels painted into a scene, which scale with the picture (clamp with cqw); em and % of the
 * parent; and emoji glyphs of 60px or more, which are pictures rather than text.
 */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : name.endsWith('.css') ? [path] : [];
  });
}

const ALLOWED = [/^var\(--text-[a-z0-9-]+\)$/, /^clamp\([^)]*cqw[^)]*\)$/, /^-?[\d.]+(em|%)$/, /^(inherit|1em|100%)$/];
function offScale(value: string) {
  const v = value.replace(/!important/, '').trim();
  const px = /^([\d.]+)px$/.exec(v);
  if (px) return parseFloat(px[1]) < 60;
  return !ALLOWED.some(re => re.test(v));
}

test('text sizes come from the type scale, never from the screen width or a written pixel value', () => {
  const found: string[] = [];
  for (const path of files('src').sort()) {
    // A standalone page with its own look (the story-adventure preview) is not part of the app's type.
    if (path.endsWith('brand-tokens.css') || path.endsWith('story-adventure-preview.css')) continue;
    const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, value] of css.matchAll(/font-size\s*:\s*([^;}]+)/g)) if (offScale(value)) found.push(`${path}: font-size ${value.trim()}`);
    for (const [, size] of css.matchAll(/\bfont\s*:\s*(?:[a-z-]+\s+|\d{3}\s+)*([^\s/;}]+)\s*\//g)) if (offScale(size)) found.push(`${path}: font ${size}`);
  }
  assert.deepEqual(found, [], 'Use var(--text-sm …) from the type scale, or var(--text-step-…) for text that grows on a tablet (src/brand-tokens.css). A label painted into a scene may scale with it: clamp(…, …cqw, …).');
});
