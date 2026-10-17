"""Apply visually reviewed normal eye atlases without re-exporting mesh or animation."""
from pathlib import Path
import json, struct, hashlib, shutil, copy
ROOT=Path(__file__).resolve().parents[1]
R=ROOT/'models-src/_research/pogo-eyes-gen9-20261015'
source=ROOT/'models-src/_research/pogo-20261014/pokeminers-20201127'
audit=R/'eye-palette-audit-before.json'
if not audit.exists():shutil.copy2(R/'eye-palette-audit.json',audit)
rows=json.loads(audit.read_text())
fixes={str(r['id']):r['best']['file'] for r in rows if r['flag']}
fixes.update({'50':'pm0050_00_Eye1.png','53':'pm0053_00_Eye1.png','79':'pm0079_00_Eye1.png','81':'pm0081_00_Eye1 #20003.png','105':'pm0105_00_Eye1.png'})
cfgfile=ROOT/'scripts/pogo-textures.json';cfg=json.loads(cfgfile.read_text());report=[]
def sha(b):return hashlib.sha256(b).hexdigest()
for sid,newname in sorted(fixes.items(),key=lambda v:int(v[0])):
 c=cfg[sid];png=(source/c.get('sourceStem',f'pm{int(sid):04}_00_Rig')/newname).read_bytes()
 for folder in ['public/models/pokemon','models-src/'+sid]:
  f=ROOT/folder/(sid+'.glb' if folder.startswith('public') else 'pokemon-go.glb')
  before=R/'before'/f.relative_to(ROOT);before.parent.mkdir(parents=True,exist_ok=True)
  if not before.exists():shutil.copy2(f,before)
  raw=before.read_bytes();n=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+n]);old=copy.deepcopy(j);binary=raw[28+n:]
  m=next(m for m in j['materials'] if m['name']==sid+'_face')
  tex=j['textures'][m['pbrMetallicRoughness']['baseColorTexture']['index']];im=j['images'][tex['source']]
  image_view=j['bufferViews'][im['bufferView']];start=image_view.get('byteOffset',0);end=start+image_view['byteLength']
  original=binary[start:end]
  # Append only image data; every original accessor byte remains untouched.
  binary+=b'\0'*((-len(binary))%4);offset=len(binary);binary+=png
  j['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(png)})
  im.update(bufferView=len(j['bufferViews'])-1,mimeType='image/png',name=Path(newname).stem)
  j['buffers'][0]['byteLength']=len(binary);binary+=b'\0'*((-len(binary))%4)
  for key in ['meshes','skins','animations','nodes','accessors','materials','textures']:
   assert j.get(key)==old.get(key),(sid,key)
  assert binary[:len(raw[28+n:])]==raw[28+n:]
  data=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode();data+=b' '*((-len(data))%4)
  chunks=struct.pack('<II',len(data),0x4e4f534a)+data+struct.pack('<II',len(binary),0x004e4942)+binary
  result=struct.pack('<III',0x46546c67,2,len(chunks)+12)+chunks;f.write_bytes(result)
  if folder.startswith('public'):report.append({'id':int(sid),'oldFace':old['images'][tex['source']]['name'],'newFace':newname,'oldImageSha256':sha(original),'newImageSha256':sha(png),'beforeSha256':sha(raw),'afterSha256':sha(result),'bytes':len(result),'geometrySkinAnimationUnchanged':True})
 c['face']=newname
cfgfile.write_text(json.dumps(cfg,ensure_ascii=False,indent=2)+'\n')
(R/'eye-fixes.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Replaced',len(report),'face atlases; geometry, UVs, skins and animation preserved.')
