"""Small garden derivative of LerSent001/pokepia-town (MIT).
Source commit: 9caddf85107a3b8cd543d0f36de8181bc9b431ce
See public/models/garden/LICENSE.txt. No original Pokopia game assets.
Run: Blender -b -P scripts/build-pokopia-garden.py
"""
import bpy, bmesh, math, json, hashlib
from mathutils import Vector
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/garden'
OUT.mkdir(parents=True, exist_ok=True)
B = {}
colors = {'trunk':'997048','woodDark':'815834','leafDark':'4b963d','leaf':'65b53d','leafLight':'8aca40','metal':'454f4c','woodLight':'d3a967','stem':'519250','pink':'f3a4b7','yellow':'ffe282','earth':'815834','cream':'fff1d0'}
def add(k,verts,faces,smooth=False):
 if k not in B:B[k]=[[],[],[]]
 v,f,s=B[k];n=len(v);v.extend([(a,-c,b) for a,b,c in verts]);f.extend([tuple(n+i for i in face) for face in faces]);s.extend([smooth]*len(faces))

def box(k,x,y,z,sx,sy,sz):
 v=[(x+a*sx/2,y+b*sy/2,z+c*sz/2) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 add(k,v,[(0,3,2,1),(4,5,6,7),(0,4,7,3),(1,2,6,5),(3,7,6,2),(0,1,5,4)])

def sphere(k,x,y,z,sx,sy=None,sz=None,seg=12,rings=7):
 sy=sy if sy!=None else sx;sz=sz if sz!=None else sx
 v=[];f=[]
 for j in range(rings+1):
  t=math.pi*j/rings
  for i in range(seg):
   p=2*math.pi*i/seg;v.append((x+sx*math.sin(t)*math.cos(p),y+sy*math.cos(t),z+sz*math.sin(t)*math.sin(p)))
 for j in range(rings):
  for i in range(seg):
   a=j*seg+i;b=j*seg+(i+1)%seg;f.append((a,b,b+seg,a+seg))
 add(k,v,f,True)

def cyl(k,x,y,z,r,h,rt=None,seg=12):
 rt=r if rt==None else rt;v=[];f=[]
 for yy,rr in [(y-h/2,r),(y+h/2,rt)]:
  for i in range(seg):
   a=2*math.pi*i/seg;v.append((x+rr*math.cos(a),yy,z+rr*math.sin(a)))
 for i in range(seg):a=i;b=(i+1)%seg;f.append((a,a+seg,b+seg,b))
 f.extend([tuple(range(seg)),tuple(range(seg*2-1,seg-1,-1))]);add(k,v,f,True)

def beam(k,a,b,r,seg=8):
 a=Vector(a);b=Vector(b);d=(b-a).normalized();side=d.cross(Vector((0,1,0)))
 if side.length<.001:side=d.cross(Vector((1,0,0)))
 side.normalize();up=d.cross(side);v=[]
 for p in [a,b]:
  for i in range(seg):v.append(tuple(p+(side*math.cos(i*math.tau/seg)+up*math.sin(i*math.tau/seg))*r))
 f=[(i,(i+1)%seg,(i+1)%seg+seg,i+seg) for i in range(seg)];f.extend([tuple(range(seg)),tuple(range(seg*2-1,seg-1,-1))]);add(k,v,f,True)

def roundbox(k,x,y,z,sx,sy,sz,r=.15):
 # Rounded rectangle extrusion with a beveled top and bottom.
 r=min(r,sx/2-.001,sy/2-.001,sz/2-.001);v=[];f=[];segs=5 if r>.3 else (2 if r>.1 else 1)
 for yy,inset in [(y-sy/2,r*.45),(y-sy/2+r*.45,0),(y+sy/2-r*.45,0),(y+sy/2,r*.45)]:
  for cx,cz,start in [(1,1,0),(-1,1,90),(-1,-1,180),(1,-1,270)]:
   for i in range(segs+1):
    a=math.radians(start+i*90/segs);v.append((x+cx*(sx/2-r)+(r-inset)*math.cos(a),yy,z+cz*(sz/2-r)+(r-inset)*math.sin(a)))
 n=4*(segs+1)
 for j in range(3):
  for i in range(n):f.append((j*n+i,(j+1)*n+i,(j+1)*n+(i+1)%n,j*n+(i+1)%n))
 f.extend([tuple(range(n)),tuple(range(4*n-1,3*n-1,-1))]);add(k,v,f,True)

def tree(x,y,z,s=1):
 # Three continuous, softly scalloped crown tiers, with broad leaf relief.
 cyl('trunk',x,y+.94*s,z,.27*s,1.88*s,.22*s,16)
 for a in range(7):
  t=a*math.tau/7;beam('woodDark',(x+math.cos(t)*.245*s,y+.12*s,z+math.sin(t)*.245*s),(x+math.cos(t)*.22*s,y+1.55*s,z+math.sin(t)*.22*s),.027*s,6)
 for tier,(h,r,hh,k) in enumerate([(1.94,1.5,.69,'leafDark'),(2.56,1.35,.68,'leaf'),(3.04,1.04,.56,'leafLight')]):
  verts=[];faces=[];n=20;rows=6
  for j in range(rows+1):
   a=math.pi*j/rows
   for i in range(n):
    t=i*math.tau/n;rr=r*math.sin(a)*(1+.062*math.sin(9*t+tier))
    yy=h+hh*math.cos(a)+.10*math.sin(9*t+tier)*math.sin(a)**3
    verts.append((x+rr*math.cos(t)*s,y+yy*s,z+rr*math.sin(t)*s))
  for j in range(rows):
   for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
  add(k,verts,faces,True)

def flower(x,y,z,col='pink',s=1):
 # Low poly flower heads with five distinct petals, tilted towards the sun.
 beam('stem',(x,y,z),(x,y+.24*s,z),.018*s,5)
 for a in range(5):
  t=a*math.tau/5;sphere(col,x+math.cos(t)*.10*s,y+.27*s,z+math.sin(t)*.10*s,.094*s,.035*s,.09*s,6,3)
 sphere('yellow',x,y+.303*s,z,.057*s,.035*s,.057*s,6,3)

def bench(x,y,z):
 for xx in [-.75,.75]:
  for zz in [-.19,.24]:box('metal',x+xx,y+.27,z+zz,.075,.55,.085)
  beam('metal',(x+xx,y+.3,z-.23),(x+xx,y+1,z-.37),.042)
 for zz in [-.2,0,.2]:roundbox('woodLight',x,y+.58,z+zz,1.95,.1,.17,.04)
 for yy in [.79,1.02]:roundbox('woodLight',x,y+yy,z-.32,1.95,.18,.075,.03)

def export(name):
    verts, faces, shades, palette = [], [], [], []
    for key, (v, f, smooth) in B.items():
        offset = len(verts)
        verts.extend(v)
        faces.extend([tuple(i+offset for i in face) for face in f])
        shades.extend(smooth)
        h=colors[key]
        rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
        rgb=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in rgb]
        palette.extend([(*rgb,1)]*len(f))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    col=mesh.vertex_colors.new(name='Color')
    for p, smooth, color in zip(mesh.polygons,shades,palette):
        p.use_smooth=smooth
        for i in p.loop_indices: col.data[i].color=color
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    bm.to_mesh(mesh);bm.free()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    nodes=mat.node_tree.nodes
    attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='Color'
    bsdf=nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.85
    mat.node_tree.links.new(attr.outputs['Color'],bsdf.inputs['Base Color'])
    mesh.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    path=OUT/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_draco_mesh_compression_enable=False)
    mesh.calc_loop_triangles()
    stats.append({'file':path.name,'triangles':len(mesh.loop_triangles),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'materials':1})
    B.clear()

bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
stats=[]
tree(0,0,0,.65);export('tree')
bench(0,0,0);export('bench')
# Open planter with a dark soil surface and four rounded wooden sides.
roundbox('woodLight',0,.15,0,1.95,.3,1.25,.1)
roundbox('earth',0,.31,0,1.72,.06,1.03,.025)
for x in [-.94,.94]:roundbox('cream',x,.35,0,.1,.15,1.25,.04)
for z in [-.59,.59]:roundbox('cream',0,.35,z,1.95,.15,.1,.04)
export('planter')
for x in [-.52,0,.52]:
    for z in [-.25,.25]:
        beam('stem',(x,.34,z),(x,.62,z),.025,5)
        for sign in [-1,1]:sphere('leaf',x+sign*.09,.48,z,.13,.045,.07,6,3)
export('seedlings')
for i,x in enumerate([-.52,0,.52]):
    for z in [-.25,.25]:flower(x,.49,z,'pink' if i%2==0 else 'cream',1.35)
export('flowers')
(OUT/'manifest.json').write_text(json.dumps({'source':'https://github.com/LerSent001/pokepia-town','commit':'9caddf85107a3b8cd543d0f36de8181bc9b431ce','license':'MIT','description':'Fan-made procedural garden derivatives, not extracted Pokopia assets. Tree resolution reduced; planter and growth stages adapted; vertex palette merged to one material per asset.','assets':stats},indent=2)+'\n')
print(json.dumps(stats))
