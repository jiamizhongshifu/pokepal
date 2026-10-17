"""Make each GLB's default node pose match idle at t=0, without freezing clips.
The game measures default geometry to set height and ground. FBX export can use
walk as the default pose, causing offsets on flying/swimming characters.
Only JSON node TRS is changed; mesh, skin bind matrices and animation stay intact.
"""
import json,struct,shutil,hashlib,os
from pathlib import Path
root=Path(__file__).resolve().parents[1];report=[]
config=json.loads((root/'scripts/pogo-textures.json').read_text())
for p in json.loads((root/'src/data/pokemon.json').read_text()):
 pid=p['id'];
 if os.environ.get('POGO_IDS') and pid not in set(map(int,os.environ['POGO_IDS'].split(','))):continue
 file=root/f'models-src/{pid}/pokemon-go.glb';raw=file.read_bytes();chunks=[];pos=12
 while pos<len(raw):
  n,kind=struct.unpack_from('<II',raw,pos);chunks.append((kind,raw[pos+8:pos+8+n]));pos+=8+n
 j=json.loads(chunks[0][1]);binary=chunks[1][1]
 # Steelix exports secondary physics bones with world-rest compensation tracks.
 # Let those segments follow the animated parent spine/tail chain; keep the
 # original driver motion and jaw animation instead of frozen, detached parts.
 followers=set(config.get(str(pid),{}).get('followParentBones',[]))
 if followers:
  targets={i for i,node in enumerate(j['nodes']) if node.get('name') in followers}
  assert len(targets)==len(followers),(pid,followers)
  for i in targets:j['nodes'][i].update(translation=[0,0,0],rotation=[0,0,0,1],scale=[1,1,1])
  for animation in j['animations']:animation['channels']=[ch for ch in animation['channels'] if ch['target']['node'] not in targets]
  j.setdefault('extras',{})['pogoPhysicsFollowers']=sorted(followers)
 idle=next(a for a in j['animations'] if a['name']=='idle')
 for ch in idle['channels']:
  target=ch['target'];path=target['path']
  if path not in ('translation','rotation','scale'):continue
  sampler=idle['samplers'][ch['sampler']];a=j['accessors'][sampler['output']];v=j['bufferViews'][a['bufferView']]
  assert a['componentType']==5126 and 'sparse' not in a
  width={'VEC3':3,'VEC4':4}[a['type']];offset=v.get('byteOffset',0)+a.get('byteOffset',0)
  if sampler.get('interpolation')=='CUBICSPLINE':offset+=v.get('byteStride',width*4)
  node=j['nodes'][target['node']];assert 'matrix' not in node
  node[path]=list(struct.unpack_from('<'+'f'*width,binary,offset))
 data=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode();data+=b' '*((-len(data))%4);chunks[0]=(chunks[0][0],data)
 output=b''.join(struct.pack('<II',len(d),k)+d for k,d in chunks);output=struct.pack('<III',0x46546c67,2,12+len(output))+output
 file.write_bytes(output);shutil.copy2(file,root/f'public/models/pokemon/{pid}.glb')
 report.append({'id':pid,'bytes':len(output),'sha256':hashlib.sha256(output).hexdigest(),'skins':len(j['skins']),'images':len(j.get('images',[]))})
(root/os.environ.get('POGO_REPORT_DIR','models-src/_research/pogo-batch-20261014')/'delivery-manifest.json').write_text(json.dumps(report,indent=2))
print('Normalized default idle pose:',len(report))
