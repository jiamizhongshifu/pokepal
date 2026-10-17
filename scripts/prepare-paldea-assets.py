"""Preserve source rigs with glTF Transform; Blender 3.1 distorts these physics bones."""
from pathlib import Path
import json,struct,subprocess,hashlib
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'models-src/_research/pogo-eyes-gen9-20261015'
report=[]
for pid in [999,1000]:
 b=(R/f'{pid}-decoded.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);removed=[]
 for node in j['nodes']:
  if 'mesh' not in node:continue
  name=j['meshes'][node['mesh']].get('name','')
  hide=(pid==1000 and ('_coin_' in name or '_board_' in name)) or (pid==999 and ('_coin_' in name or '_eye_b_' in name or '_eye_c_' in name))
  if hide:removed.append(name);del node['mesh'];node.pop('skin',None)
 data=json.dumps(j,separators=(',',':')).encode();data+=b' '*((-len(data))%4);chunks=struct.pack('<II',len(data),0x4e4f534a)+data+b[20+n:]
 trimmed=R/f'{pid}-trimmed.glb';trimmed.write_bytes(struct.pack('<III',0x46546c67,2,len(chunks)+12)+chunks)
 sized=R/f'{pid}-resized.glb';out=ROOT/f'models-src/{pid}/pokemon-go.glb'
 for args in [['resize',str(trimmed),str(sized),'--width','512','--height','512'],['prune',str(sized),str(out)]]:
  subprocess.run(['npx','--yes','@gltf-transform/cli@4.5.1',*args],check=True,cwd=ROOT)
 report.append({'id':pid,'removedHiddenProps':removed,'bytes':out.stat().st_size,'sourceSha256':hashlib.sha256((R/f'{pid}-source.glb').read_bytes()).hexdigest(),'source':f'https://raw.githubusercontent.com/pokemon-party/3d-pokemon/429de1288cea0d43f5b4f56305d2276e94239d65/models/opt/regular/{pid}.glb'})
(R/'paldea-conversion.json').write_text(json.dumps(report,indent=2))
