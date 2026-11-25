#!/usr/bin/env python3
"""
Repaint part of a painted ground with Codex image generation, keeping every other pixel of it.
  python3 scripts/art/repaint.py sides island-map learning-path ...
    Wide-screen sides: a canvas holding the ground's outer 40%, the rest blank, is painted on outward;
    writes output/rebrand/scenes/<prefix>-left|right/side.png (then: vectorize.py --sides <scene>).
  python3 scripts/art/repaint.py pads learning-path learning-path-2 ...
    The four lesson clearings of a learning-path ground are repainted as natural sandy clearings in the island's
    perspective; only an enlarged, feathered ellipse around each old clearing is taken into the ground
    (the first run keeps the untouched ground as <id>.orig.png). Then: vectorize.py <scene> and vectorize.py --sides <scene>.
Requires: pip install pillow numpy opencv-python; the codex CLI signed in.
"""
import sys, subprocess, shutil
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import numpy as np, cv2
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'output/rebrand/scenes'
GROUND = {'island-map': 'island-base', 'learning-path': 'path-base-1', **{f'learning-path-{n}': f'path-base-{n}' for n in range(2, 7)}}
SIDE = {'island-map': 'island-side', 'learning-path': 'path-side-1', **{f'learning-path-{n}': f'path-side-{n}' for n in range(2, 7)}}
KEPT = .4
STYLE = 'Same flat vector picture-book style, same colours, same level of detail, same viewing angle as the painted part.'

def side_prompt(scene: str, side: str) -> str:
  first, where = ('LEFT', 'first 40% of its width') if side == 'right' else ('RIGHT', 'last 40% of its width')
  if scene == 'island-map':
    scenery = ('the island\'s edge closes off, then open calm turquoise sea with a few gentle wave marks, two or three small rounded '
               f'rocks and one tiny grassy islet with a single bush far out. The far {side} edge of the picture shows only sea.')
    rules = 'No paths, no buildings, no fences, no boats, no characters, no text, no sky. The sea is one flat colour, the same as in the painted part, with only small wave marks on it.'
  else:
    scenery = ('the land ends in a rounded grassy headland with a few trees and bushes, then open calm sea with a few gentle wave marks, '
               'two or three small rocks and one tiny grassy islet far out; the distant hills sink into the sea. '
               f'The far {side} edge of the picture shows only sky above and sea below.')
    rules = ('No paths, no round sandy clearings, no buildings, no tents, no piers, no boats, no characters, no text. Along the whole top edge '
             'of the picture the sky is one flat colour, the same as in the painted part, and along the whole bottom edge the sea is one flat colour, the same as in the painted part.')
  return (f'The attached picture is a canvas. Its {first} part (the {where}) is already painted: the {side}-hand end of an island scene seen from above. '
          'The rest of the canvas is blank white.\nPaint the complete picture. Keep the painted part exactly as it is: the same shapes at the same positions '
          f'with the same colours; do not redraw, move or restyle it. Fill the blank area by continuing the same scenery to the {side}, so that every hill line, '
          f'shoreline and wave continues smoothly across where the blank began: {scenery}\n{rules} Fill the canvas edge to edge, no border or frame. {STYLE}')

PADS_PROMPT = (
  'The attached picture is a finished island level map. Repaint ONLY the four plain, flat, beige oval patches (lower left near the tent, upper '
  'middle-left beside the orchard, lower middle-right beside the picnic blanket, upper right on the hill). Everything else in the picture must stay '
  'exactly as it is: the same shapes at the same positions with the same colours; do not redraw, move or restyle anything else, and do not change the '
  "picture's size or framing. Each new patch keeps the same centre and about the same width as the old oval, and its middle stays an empty, plain, "
  'smooth area for a round level button. Same flat vector picture-book style and colours as the rest of the picture.\n'
  "Make each patch a natural sandy clearing lying flat on the ground, seen at the same three-quarter bird's-eye angle as the island: a wide, flattened "
  'oval (about one and a half times as wide as it is tall), with a soft irregular edge where the lawn, little grass tufts and a few small flowers overlap '
  'the sand, slightly deeper sand colour around the rim and a thin soft shade along its front (lower) edge, two or three small pebbles near the edge, '
  'and the sandy trail running into it without a seam. The middle is plain, slightly lighter sand.')
# Where the lesson clearings are painted (% of the picture): src/lib/pathScene.ts LESSON_SPOTS.
CLEARINGS = [(20.5, 62), (40, 31), (61.5, 59), (83, 29)]

def paint(folder: Path, refs: list[Path], prompt: str, out: str):
  folder.mkdir(parents=True, exist_ok=True)
  (folder / 'prompt.txt').write_text(prompt)
  task = (f'Read prompt.txt in the current directory and generate exactly that image with your built-in image generation tool (highest quality, '
          f'landscape 1536x1024), editing the attached picture. Save it in the current directory as {out}. Do not create or change any other files.')
  # stdin closed: codex exec otherwise waits for more input when it is not a terminal.
  with open(folder / 'codex.log', 'w') as log:
    subprocess.run(['codex', 'exec', '--skip-git-repo-check', '-s', 'workspace-write', '-C', str(folder), *[a for r in refs for a in ('-i', str(r))], '--', task],
                   stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT)
  return (folder / out).exists()

def sides(scene: str):
  ground = Image.open(SRC / GROUND[scene] / f'{GROUND[scene]}.png').convert('RGB'); W, H = ground.size; k = int(W * KEPT)
  jobs = []
  for side in ('left', 'right'):
    folder = SRC / f'{SIDE[scene]}-{side}'; folder.mkdir(parents=True, exist_ok=True)
    canvas = Image.new('RGB', (W, H), 'white')
    canvas.paste(ground.crop((W - k, 0, W, H)), (0, 0)) if side == 'right' else canvas.paste(ground.crop((0, 0, k, H)), (W - k, 0))
    canvas.save(folder / 'canvas.png')
    jobs.append((folder, [folder / 'canvas.png'], side_prompt(scene, side), 'side.png'))
  return jobs

def clearing_mask(ground: Image.Image, grow=1.35, feather=14):
  a = np.asarray(ground).astype(int); H, W = a.shape[:2]
  sand = (np.abs(a - np.array([253, 218, 144])).sum(2) < 30).astype(np.uint8)
  _, label, stats, _ = cv2.connectedComponentsWithStats(sand, 8)
  m = np.zeros((H, W), np.uint8)
  for x, y in CLEARINGS:
    bx, by, bw, bh, _ = stats[label[int(y / 100 * H), int(x / 100 * W)]]
    assert bw < W / 4, f'no plain clearing at {x},{y}: already repainted? (start again from the .orig.png)'
    cv2.ellipse(m, (int(bx + bw / 2), int(by + bh / 2)), (int(bw / 2 * grow), int(bh / 2 * grow)), 0, 0, 360, 255, -1)
  return Image.fromarray(m).filter(ImageFilter.GaussianBlur(feather))

def pads(scene: str):
  png = SRC / GROUND[scene] / f'{GROUND[scene]}.png'; orig = png.with_suffix('.orig.png')
  if not orig.exists(): shutil.copy(png, orig)
  folder = SRC / f'{GROUND[scene]}-pads'; folder.mkdir(exist_ok=True)
  shutil.copy(orig, folder / 'input.png')
  return [(folder, [folder / 'input.png'], PADS_PROMPT, 'pads.png')]

def take_pads(scene: str):
  png = SRC / GROUND[scene] / f'{GROUND[scene]}.png'; orig = Image.open(png.with_suffix('.orig.png')).convert('RGB')
  new = Image.open(SRC / f'{GROUND[scene]}-pads' / 'pads.png').convert('RGB').resize(orig.size, Image.LANCZOS)
  Image.composite(new, orig, clearing_mask(orig)).save(png)

kind, scenes = sys.argv[1], sys.argv[2:]
jobs = [j for s in scenes for j in (sides(s) if kind == 'sides' else pads(s))]
with ThreadPoolExecutor(4) as pool:
  done = list(pool.map(lambda j: paint(*j), jobs))
for j, ok in zip(jobs, done): print(j[0].name, '完成' if ok else '失败，见 codex.log')
if kind == 'pads':
  for s, ok in zip(scenes, done):
    if ok: take_pads(s); print(s, '空地已合成进地面')
