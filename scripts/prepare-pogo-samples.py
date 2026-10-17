"""Blender 3.1: prepare the three reviewed PokeMiners FBX samples for PokéPal.

Run from the project root with Blender -b -P scripts/prepare-pogo-samples.py.
Source revision and hashes are recorded in sample-provenance.json. The FBX files
are remote Pokémon GO assets archived by PokeMiners, NOT models from our APK.
"""
import bpy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "models-src/_research/pogo-20261014"
report = []

def textured(name, path):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = .85
    bsdf.inputs["Specular"].default_value = .15
    texture = material.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(str(path), check_existing=True)
    material.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    return material

for pid in (1, 6, 25):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source = RESEARCH / "pokeminers-20201127" / f"pm{pid:04}_00_Rig" / f"pm{pid:04}_00_Rig.fbx"
    bpy.ops.import_scene.fbx(filepath=str(source), automatic_bone_orientation=False)
    folder = source.parent
    # The archived FBX merges Unity eye/face shader materials into the body.
    # UV tiles above 1 encode face atlas selection. Bake that routing into regular
    # glTF material assignments without changing the mesh, UV shape or skeleton.
    textures = {
        1: ("pm0001_00_BodyAll1 #267.png", "pm0001_00_Eye1 #535.png"),
        6: ("pm0006_00_BodyAll1 #2390.png", "pm0006_00_Eye1.png"),
        25: ("pm0025_00_BodyA1 #457.png", "pm0025_00_Face1.png"),
    }[pid]
    body, face = [textured(f"{pid}_{label}", folder / file) for label, file in zip(("body", "face"), textures)]
    cheek = textured("25_cheek", folder / "pm0025_00_BodyB1.png") if pid == 25 else None
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        mesh = obj.data
        for layer in list(mesh.vertex_colors):
            mesh.vertex_colors.remove(layer)  # Unity shader masks, not base colors
        originals = list(mesh.materials)
        original_indices = [p.material_index for p in mesh.polygons]
        mesh.materials.clear()
        mesh.materials.append(body)
        mesh.materials.append(face)
        if cheek:
            mesh.materials.append(cheek)
        else:
            for label, color in (("fire_core", (1, .48, .025, 1)), ("fire_outer", (1, .12, .005, 1))):
                mat = bpy.data.materials.new(label)
                mat.use_nodes = True
                bsdf = mat.node_tree.nodes.get("Principled BSDF")
                bsdf.inputs["Base Color"].default_value = color
                bsdf.inputs["Emission"].default_value = color
                bsdf.inputs["Emission Strength"].default_value = .7
                mesh.materials.append(mat)
        for poly in mesh.polygons:
            original_index = original_indices[poly.index]
            original = originals[original_index].name if original_index < len(originals) else ""
            uv = [mesh.uv_layers.active.data[i].uv for i in poly.loop_indices]
            tile = int(min(v.y for v in uv) + .0001)
            if pid == 6 and "Fire" in original:
                poly.material_index = 2 if "Core" in original else 3
            elif pid == 25 and original == "BodyB":
                poly.material_index = 2
                for v in uv:
                    v.y -= tile
            elif tile >= 1:
                poly.material_index = 1
                for v in uv:
                    v.y -= tile
            else:
                poly.material_index = 0
    # FBX has one action per animated object per clip. Matching NLA track names
    # merge the armature and helper-object channels into ONE glTF clip.
    actions = list(bpy.data.actions)
    selected = {"idle": "ba10_waitA01", "walk": "fi20_walk01"}
    for obj in bpy.data.objects:
        if obj.animation_data:
            obj.animation_data.action = None
            for track in list(obj.animation_data.nla_tracks):
                obj.animation_data.nla_tracks.remove(track)
        for label, clip in selected.items():
            action = next((a for a in actions if a.name == f"{obj.name}|{clip}|Base Layer"), None)
            if action:
                obj.animation_data_create()
                track = obj.animation_data.nla_tracks.new()
                track.name = label
                strip = track.strips.new(label, 1, action)
                strip.action_frame_start, strip.action_frame_end = action.frame_range
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        bsdf = next((n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf:
            bsdf.inputs["Metallic"].default_value = 0
            bsdf.inputs["Roughness"].default_value = 0.85
            bsdf.inputs["Specular"].default_value = 0.15
            # FBX's opacity connection is a shader mask, not skin transparency.
            for link in list(bsdf.inputs["Alpha"].links):
                material.node_tree.links.remove(link)
            bsdf.inputs["Alpha"].default_value = 1
    # Both sexes are stored in Pikachu's rig. Use the original straight tail.
    if pid == 25:
        for obj in list(bpy.data.objects):
            if obj.type == "MESH" and "pm0025_01_Sippo" in obj.name:
                bpy.data.objects.remove(obj, do_unlink=True)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    triangles = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    assert triangles <= 8000, (pid, triangles)
    out = ROOT / "models-src" / str(pid)
    out.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.frame_set(1)
    bpy.ops.export_scene.gltf(filepath=str(out / "pokemon-go.glb"), export_format="GLB",
        export_animations=True, export_nla_strips=True, export_force_sampling=True,
        export_frame_range=False, export_yup=True, export_apply=False)
    report.append({"id": pid, "triangles": triangles, "source": str(source.relative_to(ROOT)),
        "animations": selected, "bytes": (out / "pokemon-go.glb").stat().st_size})
(RESEARCH / "conversion-report.json").write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
