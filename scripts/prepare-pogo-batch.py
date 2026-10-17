"""Convert the remaining pinned PokeMiners sources. Run with Blender -b -P.
Raw inputs stay untouched; outputs are staged under models-src/<id>/.
The explicit texture choices were checked against the existing official art.
"""
import bpy, bmesh, json, re, sys, os
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'models-src/_research/pogo-20261014/pokeminers-20201127'
REPORT=ROOT/os.environ.get('POGO_REPORT_DIR','models-src/_research/pogo-batch-20261014');REPORT.mkdir(parents=True,exist_ok=True)
CONFIG=json.loads((ROOT/'scripts/pogo-textures.json').read_text())
roster=json.loads((ROOT/os.environ.get('POGO_ROSTER','src/data/pokemon.json')).read_text())
only=set(map(int,sys.argv[sys.argv.index('--')+1:])) if '--' in sys.argv else None
reports=[]
def material(name,path=None,color=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF')
 b.inputs['Roughness'].default_value=.85;b.inputs['Specular'].default_value=.15
 if path:
  n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(path),check_existing=True)
  if max(n.image.size)>1024:n.image.scale(min(n.image.size[0],1024),min(n.image.size[1],1024))
  m.node_tree.links.new(n.outputs['Color'],b.inputs['Base Color'])
 else:
  b.inputs['Base Color'].default_value=color;b.inputs['Emission'].default_value=color;b.inputs['Emission Strength'].default_value=.7
 return m
for p in roster:
 pid=p['id']
 if pid in (1,6,25) or (only and pid not in only):continue
 bpy.ops.wm.read_factory_settings(use_empty=True)
 cfg=CONFIG[str(pid)]
 stem=cfg.get('sourceStem',f'pm{pid:04}_00_Rig')
 folder=SOURCE/stem;source=folder/f'{stem}.fbx'
 bpy.ops.import_scene.fbx(filepath=str(source),automatic_bone_orientation=False)
 source_meshes=[{'name':o.name,'materials':[m.name for m in o.data.materials]} for o in bpy.data.objects if o.type=='MESH']
 body=material(f'{pid}_body',folder/cfg['body']);face=material(f'{pid}_face',folder/cfg['face']) if cfg.get('face') else body
 mats=[body,face,material('fire_core',color=(1,.48,.025,1)),material('fire_outer',color=(1,.12,.005,1))]
 if cfg.get('cheek'):mats.append(material(f'{pid}_cheek',folder/cfg['cheek']))
 overrides={}
 for original,texture in cfg.get('materialTextures',{}).items():
  m=material(f'{pid}_{original}',folder/texture)
  if original in cfg.get('alphaMaterials',[]):
   m.blend_method='BLEND';nodes=m.node_tree.nodes
   m.node_tree.links.new(next(n for n in nodes if n.type=='TEX_IMAGE').outputs['Alpha'],nodes.get('Principled BSDF').inputs['Alpha'])
  overrides[original]=len(mats);mats.append(m)
 for original,opacity in cfg.get('materialOpacity',{}).items():
  m=material(f'{pid}_{original}',folder/cfg['body']);m.blend_method='BLEND';m.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=opacity
  overrides[original]=len(mats);mats.append(m)
 removed=[]
 for obj in list(bpy.data.objects):
  if obj.type!='MESH':continue
  # Both sexes are exported together. Keep the _00 variant and no debug cube.
  if re.match(rf'pm{pid:04}_01_',obj.name) or 'dummy' in obj.name.lower() or (pid==186 and 'Tongue' in obj.name) or obj.name in cfg.get('removeMeshes',[]):
   removed.append(obj.name);bpy.data.objects.remove(obj,do_unlink=True);continue
  mesh=obj.data
  if cfg.get('geometryTranslation'):
   # Some Unity FBX exports have a uniform offset between cluster bind matrices
   # and Blender's reconstructed rest bones (Onix). Restore the measured offset.
   delta=Vector(cfg['geometryTranslation'])
   for vertex in mesh.vertices:vertex.co+=delta
  if cfg.get('removeMaterials'):
   slots={i for i,m in enumerate(mesh.materials) if m.name in cfg['removeMaterials']}
   bm=bmesh.new();bm.from_mesh(mesh)
   bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.material_index in slots],context='FACES')
   bm.to_mesh(mesh);bm.free()
   if not mesh.polygons:
    removed.append(obj.name);bpy.data.objects.remove(obj,do_unlink=True);continue
  for layer in list(mesh.vertex_colors):mesh.vertex_colors.remove(layer)
  originals=[m.name for m in mesh.materials];indices=[p.material_index for p in mesh.polygons]
  mesh.materials.clear()
  for m in mats:mesh.materials.append(m)
  for poly in mesh.polygons:
   original=originals[indices[poly.index]];uv=[mesh.uv_layers.active.data[i].uv for i in poly.loop_indices]
   tile=int(min(v.y for v in uv)+.0001)
   if 'Fire' in original:poly.material_index=2 if 'Core' in original else 3
   else:
    poly.material_index=1 if tile>=1 and cfg.get('face') else overrides[original] if original in overrides else 4 if cfg.get('cheek') and original=='BodyB' else 0
    if tile>=1:
     for v in uv:v.y-=tile
 meshes=[o for o in bpy.data.objects if o.type=='MESH']
 triangles=lambda:sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
 before=triangles()
 if before>8000:
  # Apply only decimation, keeping the Armature modifier and vertex weights.
  for o in meshes:
   bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
   mod=o.modifiers.new('mobile_budget','DECIMATE');mod.ratio=7900/before
   bpy.ops.object.modifier_apply(modifier=mod.name)
 actions=list(bpy.data.actions);available={a.name.split('|')[1] for a in actions if '|' in a.name}
 selected={}
 for label,base in {'idle':'ba10_waitA01','walk':'fi20_walk01'}.items():
  selected[label]=base if base in available else base+'_FBX_OVERRIDE'
  assert selected[label] in available,(pid,label,available)
 matched={k:0 for k in selected}
 for obj in bpy.data.objects:
  if obj.animation_data:
   obj.animation_data.action=None
   for tr in list(obj.animation_data.nla_tracks):obj.animation_data.nla_tracks.remove(tr)
  for label,clip in selected.items():
   a=next((a for a in actions if a.name==f'{obj.name}|{clip}|Base Layer'),None)
   if a:
    obj.animation_data_create();tr=obj.animation_data.nla_tracks.new();tr.name=label
    strip=tr.strips.new(label,1,a);strip.action_frame_start,strip.action_frame_end=a.frame_range
    if obj.type=='ARMATURE':matched[label]+=1
 assert all(matched.values()),(pid,matched)
 assert triangles()<=8000,(pid,triangles())
 bpy.context.scene.frame_set(1)
 out=ROOT/'models-src'/str(pid);out.mkdir(exist_ok=True)
 bpy.ops.export_scene.gltf(filepath=str(out/'pokemon-go.glb'),export_format='GLB',export_animations=True,export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_apply=False)
 result={'id':pid,'triangles':triangles(),'trianglesBeforeBudget':before,'removedMeshes':removed,'sourceMeshes':source_meshes,'availableAnimations':sorted(available),'textures':cfg,'animations':selected,'bytes':(out/'pokemon-go.glb').stat().st_size}
 reports.append(result);(REPORT/f'conversion-{pid}.json').write_text(json.dumps(result,indent=2));print('CONVERTED',pid,flush=True)
print('Completed',len(reports))
