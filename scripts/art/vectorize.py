#!/usr/bin/env python3
"""
把场景插画转成矢量图。
  python3 scripts/art/vectorize.py island-map [learning-path ...]
    分层：scenes.json 里 layerOf 指向这张画的 layer / layer-base 条目，各自转成矢量，并量出每块在原画里的位置。
  python3 scripts/art/vectorize.py --whole beach orchard ...
    整张：没有要单独动的东西的画，整张转成 public/scenes/flat-v1/<group>/<id>.svg。
依赖：pip install vtracer opencv-python pillow numpy
输入：output/rebrand/scenes/<id>/<id>.png（generate.mjs scene 生成）
输出：public/scenes/flat-v1/layers/<scene>/<id>.svg（本地媒体，不入库）
      src/data/sceneLayers.generated.json（每层的位置，入库，界面按它摆放）
"""
import json, sys, gzip, re
from pathlib import Path
import numpy as np, cv2, vtracer
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

def trace(src: Path, dst: Path, size, **finer):
  vtracer.convert_image_to_svg_py(str(src), str(dst), **{**TRACE, **finer})
  svg = dst.read_text()
  svg = re.sub(r'<svg [^>]*>', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size[0]} {size[1]}">', svg, count=1)
  # Drop what a browser does not need: the XML prolog, the generator comment, empty moves and the space before Z.
  svg = re.sub(r'<\?xml[^>]*>\s*|<!--.*?-->\s*', '', svg)
  svg = svg.replace(' transform="translate(0,0)"', '').replace(' Z ', 'Z').replace('\n', '')
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
    raw, gz = trace(work / f"{s['id']}.png", out_dir / f'{name}.svg', size)
    total += gz
    if not base: layout[name] = locate(im, original, s.get('near'))
    print(f"{scene}/{name:18s} {raw // 1024:5d}KB  压缩后 {gz // 1024:4d}KB  {layout.get(name, '底图')}")
  print(f'{scene} 合计压缩后 {total // 1024}KB')
  if layout:
    gen = ROOT / 'src/data/sceneLayers.generated.json'
    data = json.loads(gen.read_text()) if gen.exists() else {}
    data[scene] = layout
    gen.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n')

def whole(id):
  s = next(s for s in catalog['scenes'] if s['id'] == id)
  work = SRC / id / 'vector.png'
  _, size = prepare(SRC / id / f'{id}.png', work, cut=False)
  out = ROOT / 'public/scenes/flat-v1' / s['group'] / f'{id}.svg'
  # A whole background is mostly large soft areas: finer colour steps keep its faint light patches.
  raw, gz = trace(work, out, size, layer_difference=7, color_precision=7)
  print(f"{s['group']}/{id:16s} {raw // 1024:5d}KB  压缩后 {gz // 1024:4d}KB")

args = sys.argv[1:] or ['island-map']
if args[0] == '--whole':
  for id in args[1:]: whole(id)
else:
  for scene in args: layered(scene)
