import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Style debt only goes down. Colours live in src/brand-tokens.css and soft shadows are for things floating on a scene,
 * so every colour written straight into a stylesheet and every blurred shadow is counted per file against
 * scripts/tests/fixtures/style-debt.json. Add one and this fails; remove one and it asks for the lower number,
 * so the count can never drift back up.
 *
 *   UPDATE_STYLE_DEBT=1 npx tsx --test scripts/tests/brand-palette.test.ts   # record lower counts (it refuses to raise any)
 */
const BASELINE = 'scripts/tests/fixtures/style-debt.json';
type Debt = Record<string, { colours: number; blurs: number }>;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : name.endsWith('.css') ? [path] : [];
  });
}

const lengths = (part: string) => part.replace('inset', '').trim().split(/\s+/).filter(t => /^-?\d*\.?\d+(px)?$/.test(t)).map(t => parseFloat(t));
function blurs(css: string) {
  let n = 0;
  for (const [, value] of css.matchAll(/box-shadow:([^;}]*)/g)) for (const part of value.split(/,(?![^(]*\))/)) { const l = lengths(part); if (l.length >= 3 && l[2] > 0) n++; }
  for (const [, , blur] of css.matchAll(/drop-shadow\(\s*(\S+\s+\S+)\s+(-?\d*\.?\d+)/g)) if (parseFloat(blur) > 0) n++;
  return n;
}

function measure(): Debt {
  const debt: Debt = {};
  for (const path of files('src').sort()) {
    if (path.endsWith('brand-tokens.css')) continue;
    const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const colours = (css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).length, blurred = blurs(css);
    if (colours || blurred) debt[path] = { colours, blurs: blurred };
  }
  return debt;
}

test('no stylesheet adds a hard-coded colour or a blurred shadow, and what is removed stays removed', () => {
  const now = measure(), was: Debt = JSON.parse(readFileSync(BASELINE, 'utf8'));
  const raised: string[] = [], lowered: string[] = [];
  for (const path of new Set([...Object.keys(now), ...Object.keys(was)])) {
    const a = now[path] ?? { colours: 0, blurs: 0 }, b = was[path] ?? { colours: 0, blurs: 0 };
    for (const key of ['colours', 'blurs'] as const) {
      if (a[key] > b[key]) raised.push(`${path}: ${key} ${b[key]} -> ${a[key]}`);
      if (a[key] < b[key]) lowered.push(`${path}: ${key} ${b[key]} -> ${a[key]}`);
    }
  }
  assert.deepEqual(raised, [], 'Use a variable from src/brand-tokens.css instead of a new colour, and a solid edge (0 var(--brand-press) 0 ...) instead of a new blurred shadow');
  if (lowered.length && process.env.UPDATE_STYLE_DEBT) { writeFileSync(BASELINE, `${JSON.stringify(now, null, 1)}\n`); return; }
  assert.deepEqual(lowered, [], 'Debt went down: record it with UPDATE_STYLE_DEBT=1 npx tsx --test scripts/tests/brand-palette.test.ts');
});

test('icons on a coloured fill are never darkened into the fill', () => {
  const darkened = files('src').filter(path => /brightness\(0\)\s*opacity\(/.test(readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\.dex-cell\.unknown[^{]*\{[^}]*\}/g, '')));
  assert.deepEqual(darkened, [], 'An action mark on a green fill turns white (Icon marks it is-glyph, src/brand-components.css paints it); a picture sits on a white chip there. Add the fill to that rule instead of darkening the icon.');
});
