"""
把任意来源的宝可梦 3D 模型（DAE / FBX / OBJ / GLB / GLTF）批量转成适合 iPad 的 GLB。
- 输入目录结构：models-src/<全国图鉴编号>/<任意文件名>.<格式>，贴图放在同一文件夹
- 超过面数预算时自动减面（保留骨骼权重），保留动画
- 输出到 public/models/pokemon/<编号>.glb，并登记到 src/data/pokemonModels.json

用法（在项目根目录）：
  /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/convert-models.py -- models-src
  可选参数：--faces 8000  --out public/models/pokemon  --manifest src/data/pokemonModels.json
"""
import bpy, sys, os, json

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def opt(name, default):
    if name in argv:
        i = argv.index(name)
        return argv[i + 1]
    return default

SRC = argv[0] if argv and not argv[0].startswith("--") else "models-src"
OUT = opt("--out", "public/models/pokemon")
MANIFEST = opt("--manifest", "src/data/pokemonModels.json")
FACES = int(opt("--faces", "8000"))
EXTS = (".glb", ".gltf", ".fbx", ".dae", ".obj")

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def import_file(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=True)
    elif ext == ".dae":
        bpy.ops.wm.collada_import(filepath=path, auto_connect=True, fix_orientation=True)
    elif ext == ".obj":
        bpy.ops.import_scene.obj(filepath=path)

def tri_count(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)

def decimate(meshes):
    total = sum(tri_count(m) for m in meshes)
    if total <= FACES:
        return total, total
    ratio = max(0.05, FACES / total)
    for m in meshes:
        if m.data.shape_keys:  # 带形态键的网格无法应用减面，保持原样
            continue
        # 先临时移除骨骼修改器，应用减面后再加回，骨骼权重随顶点组保留
        arm = [(md.name, md.object) for md in m.modifiers if md.type == "ARMATURE"]
        for md in [md for md in m.modifiers if md.type == "ARMATURE"]:
            m.modifiers.remove(md)
        dec = m.modifiers.new("decimate", "DECIMATE")
        dec.ratio = ratio
        bpy.context.view_layer.objects.active = m
        for o in bpy.context.selected_objects:
            o.select_set(False)
        m.select_set(True)
        bpy.ops.object.modifier_apply(modifier=dec.name)
        for name, target in arm:
            md = m.modifiers.new(name, "ARMATURE")
            md.object = target
    return total, sum(tri_count(m) for m in meshes)

def convert(pid, path):
    reset()
    import_file(path)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise RuntimeError("文件里没有网格")
    before, after = decimate(meshes)
    anims = len(bpy.data.actions)
    out = os.path.join(OUT, f"{pid}.glb")
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        export_animations=True,
        export_apply=True,
        export_yup=True,
        export_image_format="AUTO",
    )
    kb = os.path.getsize(out) // 1024
    print(f"✓ #{pid} {os.path.basename(path)}  三角面 {before} → {after}  动画 {anims} 个  {kb} KB")
    return out

def find_source(folder):
    files = sorted(f for f in os.listdir(folder) if f.lower().endswith(EXTS))
    # 优先 glb/gltf，其次 fbx、dae、obj
    for ext in EXTS:
        for f in files:
            if f.lower().endswith(ext):
                return os.path.join(folder, f)
    return None

os.makedirs(OUT, exist_ok=True)
manifest = {}
if os.path.exists(MANIFEST):
    with open(MANIFEST) as fh:
        manifest = json.load(fh)

ok = 0
for name in sorted(os.listdir(SRC)) if os.path.isdir(SRC) else []:
    folder = os.path.join(SRC, name)
    if not (os.path.isdir(folder) and name.isdigit()):
        continue
    src = find_source(folder)
    if not src:
        print(f"#{name} 文件夹里没有支持的模型文件，跳过")
        continue
    try:
        convert(int(name), src)
        # Keep reviewed orientation, pose and animation choices on reconversion.
        key = str(int(name))
        manifest[key] = {**manifest.get(key, {}), "file": f"{int(name)}.glb"}
        ok += 1
    except Exception as e:
        print(f"✗ #{name} 转换失败：{e}")

with open(MANIFEST, "w") as fh:
    json.dump(manifest, fh, indent=2, ensure_ascii=False)
    fh.write("\n")
print(f"完成：成功 {ok} 个。重新构建后家园会使用这些模型：npm run build")
