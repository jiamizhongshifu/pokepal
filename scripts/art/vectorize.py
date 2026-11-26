#!/usr/bin/env python3
"""
把场景插画转成矢量图。
  python3 scripts/art/vectorize.py island-map [learning-path ...]
    分层：scenes.json 里 layerOf 指向这张画的 layer / layer-base 条目，各自转成矢量，并量出每块在原画里的位置。
  python3 scripts/art/vectorize.py --whole beach orchard ...
    整张：没有要单独动的东西的画，整张转成 public/scenes/flat-v1/<group>/<id>.svg。
  python3 scripts/art/vectorize.py --sides island-map learning-path ...
    宽屏两侧：<side>/side.png 是把地面边缘 40% 接着往外画满的整张，取新画的 60%（连同贴边的 4%，用来渐变盖住接缝）转成 layers/<scene>/side-left|right.svg。
  python3 scripts/art/vectorize.py --assets prop icon sprites
  python3 scripts/art/vectorize.py --compact
    把 public 下已有的矢量图改写成相对坐标的最短写法（画面不变，压缩后约小一半）；新转的图已经是这种写法。
    透明底的道具、图标和小精灵：public/scenes/flat-v1/<group>/（或 public/<group>/，含子目录）下打包好的每张图，
    按原画布（同样的留白）转成同名 .svg。
依赖：pip install vtracer opencv-python pillow numpy
输入：output/rebrand/scenes/<id>/<id>.png（generate.mjs scene 生成）
输出：public/scenes/flat-v1/layers/<scene>/<id>.svg（本地媒体，不入库）
      src/data/sceneLayers.generated.json（每层的位置，入库，界面按它摆放）
"""
import json, sys, gzip, re
from pathlib import Path
import numpy as np, cv2
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'output/rebrand/scenes'
catalog = json.loads((Path(__file__).parent / 'scenes.json').read_text())

# Tracing settings: upscale 2x and smooth first so edges come out clean, then trace in stacked colour layers.
TRACE = dict(colormode='color', hierarchical='stacked', mode='spline', filter_speckle=12, color_precision=6,
             layer_difference=14, corner_threshold=80, length_threshold=6.0, splice_threshold=50, path_precision=0)

def prepare(png: Path, dst: Path, cut: bool):
  im = Image.open(png).convert('RGBA')
  if cut:
    a = np.array(im)[:, :, 3]
    ys, xs = np.where(a > 20)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
  big = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
  rgb = big.convert('RGB').filter(ImageFilter.MedianFilter(5))
  alpha = big.getchannel('A').point(lambda v: 255 if v > 128 else 0)  # hard edge: vtracer keys out fully transparent pixels
  rgb.putalpha(alpha)
  rgb.save(dst)
  return im, big.size

PATH_TOKEN = re.compile(r'[MLCZmlcz]|-?\d+(?:\.\d+)?')

def _numbers(values):
  out = ''
  for v in values:
    s = '%g' % (v + 0)  # + 0 turns -0 into 0
    out += s if not out or s.startswith('-') or out[-1].isalpha() else ' ' + s
  return out

def compact_path(d: str) -> str:
  """The same outline in relative coordinates with the fewest characters: the picture is unchanged, the file about 40%
  smaller and its compressed download about half (absolute four-digit coordinates repeat little)."""
  t = PATH_TOKEN.findall(d); i = 0; cx = cy = sx = sy = 0.; out = []; last = None
  while i < len(t):
    c = t[i]; i += 1
    if c in 'Zz': out.append('z'); cx, cy = sx, sy; last = 'z'; continue
    n = 6 if c in 'Cc' else 2; first = True
    while i < len(t) and not t[i].isalpha():
      v = [float(x) for x in t[i:i + n]]; i += n
      if c.islower(): v = [v[k] + (cx if k % 2 == 0 else cy) for k in range(n)]
      letter = 'l' if c in 'Mm' and not first else c.lower()
      seg = _numbers([v[k] - (cx if k % 2 == 0 else cy) for k in range(n)])
      # A repeated command needs no letter again (numbers after m continue as l).
      out.append(letter + seg if letter != last or letter == 'm' else ('' if seg.startswith('-') else ' ') + seg)
      last = 'l' if letter == 'm' else letter
      cx, cy = v[-2], v[-1]
      if letter == 'm': sx, sy = cx, cy
      first = False
  return ''.join(out)

# What the tracer writes: absolute M, L, C and Z with whole numbers. Anything else (hand-drawn icons, a path already
# compacted) is left as it is.
TRACED = re.compile(r'[MLCZ0-9 -]*')

def compact(svg: str) -> str:
  return re.sub(r' d="([^"]*)"', lambda m: f' d="{compact_path(m.group(1)) if TRACED.fullmatch(m.group(1)) else m.group(1)}"', svg)

def trace(src: Path, dst: Path, size, **finer):
  import vtracer  # only tracing needs it; --compact does not
  vtracer.convert_image_to_svg_py(str(src), str(dst), **{**TRACE, **finer})
  svg = dst.read_text()
  svg = re.sub(r'<svg [^>]*>', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size[0]} {size[1]}">', svg, count=1)
  # Drop what a browser does not need: the XML prolog, the generator comment, empty moves and the space before Z.
  svg = re.sub(r'<\?xml[^>]*>\s*|<!--.*?-->\s*', '', svg)
  svg = compact(svg.replace(' transform="translate(0,0)"', '').replace('\n', ''))
  dst.write_text(svg)
  return len(svg), len(gzip.compress(svg.encode(), 9))

def locate(layer: Image.Image, original: np.ndarray, near=None):
  """Find where (and how big) the cut-out layer sits in the original picture: masked template match over scales.
  `near` ([x%, y%, width%], from scenes.json) narrows the search for small pieces that look like many places."""
  H, W = original.shape[:2]
  ox = oy = 0
  if near:
    r = max(10, near[2])  # search a window a little wider than the piece itself
    ox, oy = max(0, int((near[0] - r) * W / 100)), max(0, int((near[1] - r) * H / 100))
    original = original[oy:int((near[1] + r) * H / 100), ox:int((near[0] + r) * W / 100)]
  FW, FH = W, H
  H, W = original.shape[:2]
  k = 0.5  # search on a half-size copy, then refine around the best hit at full size
  small = cv2.resize(original, (int(W * k), int(H * k)), interpolation=cv2.INTER_AREA)
  def best_at(img, width):
    h = max(4, round(layer.height * width / layer.width))
    if width >= img.shape[1] or h >= img.shape[0]: return None
    t = np.array(layer.resize((width, h), Image.LANCZOS))
    mask = (t[:, :, 3] > 128).astype(np.float32)
    rgb = cv2.cvtColor(t[:, :, :3], cv2.COLOR_RGB2BGR).astype(np.float32)
    # Normalised correlation: a flat patch of lawn or sea scores nothing, so a small template cannot hide in it.
    r = cv2.matchTemplate(img.astype(np.float32), rgb, cv2.TM_CCOEFF_NORMED, mask=cv2.merge([mask] * 3))
    r[~np.isfinite(r)] = -1
    _, top, _, loc = cv2.minMaxLoc(r)
    return float(top), loc, (width, h)
  lo, hi = (int(near[2] * FW / 100 * k * 0.7), int(near[2] * FW / 100 * k * 1.3)) if near else (20, int(W * k * 0.6))
  hits = [h for w in range(lo, hi, 2) if (h := best_at(small, w))]
  score, loc, size = max(hits, key=lambda h: h[0])
  w0 = round(size[0] / k)
  fine = [h for w in range(max(8, w0 - 12), w0 + 13, 2) if (h := best_at(original, w))]
  score, (x, y), (w, h) = max(fine, key=lambda h: h[0])
  return dict(x=round((x + ox) / FW * 100, 2), y=round((y + oy) / FH * 100, 2), w=round(w / FW * 100, 2), h=round(h / FH * 100, 2), fit=round(score, 2))

def layered(scene):
  items = [s for s in catalog['scenes'] if s.get('layerOf') == scene]
  out_dir = ROOT / 'public/scenes/flat-v1/layers' / scene
  out_dir.mkdir(parents=True, exist_ok=True)
  work = SRC / scene / 'layers'
  work.mkdir(exist_ok=True)
  original = cv2.cvtColor(np.array(Image.open(SRC / scene / f'{scene}.png').convert('RGB')), cv2.COLOR_RGB2BGR)
  layout, total = {}, 0
  for s in items:
    png = SRC / s['id'] / f"{s['id']}.png"
    if not png.exists(): print('缺少', s['id']); continue
    base = s['group'] == 'layer-base'
    im, size = prepare(png, work / f"{s['id']}.png", cut=not base)
    name = s.get('piece') or s['id'].removeprefix(scene.split('-')[0] + '-')
    # A painted ground has dark, close colours at dusk and night: finer colour steps keep a tree apart from its lawn.
    raw, gz = trace(work / f"{s['id']}.png", out_dir / f'{name}.svg', size, **(dict(layer_difference=7, color_precision=7) if base else {}))
    total += gz
    if not base:
      box = locate(im, original, s.get('near'))
      # A redrawn piece can match its spot but come out thinner than the painting (the sails): `fitWidth` (% of the
      # picture, measured on the painting) sets its size about the matched centre.
      if s.get('fitWidth'):
        k = s['fitWidth'] / box['w']
        box.update(x=round(box['x'] - box['w'] * (k - 1) / 2, 2), y=round(box['y'] - box['h'] * (k - 1) / 2, 2), w=round(box['w'] * k, 2), h=round(box['h'] * k, 2))
      layout[name] = box
    print(f"{scene}/{name:18s} {raw // 1024:5d}KB  压缩后 {gz // 1024:4d}KB  {layout.get(name, '底图')}")
  print(f'{scene} 合计压缩后 {total // 1024}KB')
  if layout:
    gen = ROOT / 'src/data/sceneLayers.generated.json'
    data = json.loads(gen.read_text()) if gen.exists() else {}
    data[scene] = layout
    gen.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n')

# Where each scene's wide-screen side paintings are: output/rebrand/scenes/<prefix>-left|right/side.png.
SIDE_SOURCE = {'island-map': 'island-side', 'learning-path': 'path-side-1', **{f'learning-path-{n}': f'path-side-{n}' for n in range(2, 7)}}
KEPT = .4  # the part of each side painting that is the ground's own edge, painted over unchanged
OVER = .04  # how much of that edge each side keeps, to fade in over the scene (styles.css .scene-side: --scene-over)

def to_palette(png: Path, ground: Path):
  """Every pixel takes the nearest colour of the traced ground beside it. A side painting's open sky fades into the
  sea with no hill between them, and traced as it is the whole fade would merge into the sea colour; in the ground's
  own colour bands it splits where the ground splits, and the two meet at the seam in the same colours."""
  palette = np.array([[int(h[i:i + 2], 16) for i in (0, 2, 4)] for h in sorted(set(re.findall(r'fill="#([0-9A-Fa-f]{6})"', ground.read_text())))], np.int32)
  im = np.array(Image.open(png).convert('RGBA'))
  rgb = im[:, :, :3].reshape(-1, 3).astype(np.int32)
  colours, back = np.unique(rgb, axis=0, return_inverse=True)
  nearest = palette[np.argmin(((colours[:, None, :] - palette[None, :, :]) ** 2).sum(2), axis=1)]
  im[:, :, :3] = nearest[back.ravel()].reshape(im.shape[0], im.shape[1], 3)
  Image.fromarray(im.astype(np.uint8)).save(png)

def sides(scene):
  out_dir = ROOT / 'public/scenes/flat-v1/layers' / scene
  for side in ('left', 'right'):
    src = SRC / f'{SIDE_SOURCE[scene]}-{side}'
    im = Image.open(src / 'side.png').convert('RGB')
    k = round(im.width * (KEPT - OVER))
    im.crop((0, 0, im.width - k, im.height) if side == 'left' else (k, 0, im.width, im.height)).save(src / 'new.png')
    to_palette(src / 'new.png', out_dir / 'base.svg')
    _, size = prepare(src / 'new.png', src / 'vector.png', cut=False)
    raw, gz = trace(src / 'vector.png', out_dir / f'side-{side}.svg', size, layer_difference=7, color_precision=7)
    print(f"{scene}/side-{side:5s} {raw // 1024:5d}KB  压缩后 {gz // 1024:4d}KB")

def whole(id):
  s = next(s for s in catalog['scenes'] if s['id'] == id)
  work = SRC / id / 'vector.png'
  _, size = prepare(SRC / id / f'{id}.png', work, cut=False)
  out = ROOT / 'public/scenes/flat-v1' / s['group'] / f'{id}.svg'
  # A whole background is mostly large soft areas: finer colour steps keep its faint light patches.
  raw, gz = trace(work, out, size, layer_difference=7, color_precision=7)
  print(f"{s['group']}/{id:16s} {raw // 1024:5d}KB  压缩后 {gz // 1024:4d}KB")

# Marks drawn in one flat colour that the interface wants in another: the close mark is a quiet grey that reads on
# light and night surfaces (red is kept for recording and deleting).
SINGLE_COLOUR = {'ui-close': '#8A8A8A'}

def asset(png: Path):
  """A packaged transparent prop, icon or creature, traced on its own canvas so it keeps the same margins and size."""
  work = SRC / '_assets' / f'{png.parent.parent.name}-{png.parent.name}-{png.stem}.png'
  work.parent.mkdir(exist_ok=True)
  # Creatures carry pale, low-contrast detail (cloud edges, belly stripes): finer colour steps keep it.
  source, finer = png, (dict(layer_difference=8, color_precision=7) if png.parent.parent.name == 'sprites' else {})
  if png.stem.startswith('avatar-'):
    # A creature's avatar is its stage portrait framed a little tighter (package.mjs fits the art to 92% instead of
    # 86%). Cut it from the 1024px portrait rather than tracing the 256px avatar, so the outline stays smooth.
    stage = Image.open(png.with_name(png.stem.replace('avatar-', 'stage-') + '.webp')).convert('RGBA')
    side = round(stage.width * .86 / .92); off = (stage.width - side) // 2
    stage.crop((off, off, off + side, off + side)).resize((512, 512), Image.LANCZOS).save(work)
    source, finer = work, {**finer, 'filter_speckle': 20}
  _, size = prepare(source, work, cut=False)
  sizes = trace(work, png.with_suffix('.svg'), size, **finer)
  if png.stem in SINGLE_COLOUR:
    svg = png.with_suffix('.svg')
    svg.write_text(re.sub(r'fill="#[0-9A-Fa-f]{6}"', f'fill="{SINGLE_COLOUR[png.stem]}"', svg.read_text()))
  return sizes

args = sys.argv[1:] or ['island-map']
if args[0] == '--compact':
  before = after = 0
  for f in sorted(ROOT.glob('public/**/*.svg')):
    old = f.read_text(); new = compact(old)
    before += len(gzip.compress(old.encode(), 9)); after += len(gzip.compress(new.encode(), 9))
    if new != old: f.write_text(new)
  print(f'压缩后合计 {before // 1024}KB → {after // 1024}KB')
elif args[0] == '--whole':
  for id in args[1:]: whole(id)
elif args[0] == '--sides':
  for scene in args[1:]: sides(scene)
elif args[0] == '--assets':
  for group in args[1:]:
    folder = ROOT / 'public/scenes/flat-v1' / group
    files = sorted((folder if folder.exists() else ROOT / 'public' / group).rglob('*.webp'))
    sizes = [asset(f) for f in files]
    print(f"{group}: {len(files)} 个，合计 {sum(r for r, _ in sizes) // 1024}KB，压缩后 {sum(g for _, g in sizes) // 1024}KB")
else:
  for scene in args: layered(scene)
