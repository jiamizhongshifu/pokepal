"""Align the vertical origin of walk to idle using a root animation channel.
Offsets were measured in the real Three.js skinning pipeline. Original joint
tracks stay unchanged. The existing home scene adds flight/swim movement.
Re-running is safe: already aligned outputs are skipped.
"""
import json,struct,shutil,hashlib,os
from pathlib import Path
root=Path(__file__).resolve().parents[1];offsets=json.loads((root/'scripts/pogo-motion-offsets.json').read_text());report=[]
for pid,offset in offsets.items():
 if os.environ.get("POGO_IDS") and pid not in os.environ["POGO_IDS"].split(","):continue
 file=root/f'models-src/{pid}/pokemon-go.glb';raw=file.read_bytes();n=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+n]);binary=bytearray(raw[28+n:])
 if not j.get('extras',{}).get('pogoMotionGrounded'):
  scene=j['scenes'][j.get('scene',0)];node=len(j['nodes']);j['nodes'].append({'name':'PogoMotionOrigin','children':scene['nodes'],'translation':[0,0,0]});scene['nodes']=[node]
  def append(values,kind):
   width={'SCALAR':1,'VEC3':3}[kind];start=len(binary);binary.extend(struct.pack('<'+'f'*len(values),*values));view=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(values)*4});index=len(j['accessors']);acc={'bufferView':view,'componentType':5126,'count':len(values)//width,'type':kind}
   if kind=='SCALAR':acc.update(min=[min(values)],max=[max(values)])
   j['accessors'].append(acc);return index
  for a in j['animations']:
   duration=max(j['accessors'][s['input']]['max'][0] for s in a['samplers']);input_=append([0,duration],'SCALAR');v=offset if a['name']=='walk' else [0,0,0];output=append(v+v,'VEC3');index=len(a['samplers']);a['samplers'].append({'input':input_,'output':output,'interpolation':'LINEAR'});a['channels'].append({'sampler':index,'target':{'node':node,'path':'translation'}})
  j.setdefault('extras',{})['pogoMotionGrounded']=True;j['buffers'][0]['byteLength']=len(binary)
  data=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode();data+=b' '*((-len(data))%4);body=struct.pack('<II',len(data),0x4e4f534a)+data+struct.pack('<II',len(binary),0x004e4942)+binary;file.write_bytes(struct.pack('<III',0x46546c67,2,len(body)+12)+body)
 shutil.copy2(file,root/f'public/models/pokemon/{pid}.glb');output=file.read_bytes();report.append({'id':int(pid),'bytes':len(output),'sha256':hashlib.sha256(output).hexdigest(),'skins':len(j['skins']),'images':len(j.get('images',[]))})
(root/os.environ.get('POGO_REPORT_DIR','models-src/_research/pogo-batch-20261014')/'delivery-manifest.json').write_text(json.dumps(sorted(report,key=lambda r:r['id']),indent=2));print('Aligned',len(report))
