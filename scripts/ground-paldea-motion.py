"""Keep original limb motion; home navigation supplies horizontal displacement."""
import json,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
for pid in [999,1000]:
 p=ROOT/f'models-src/{pid}/pokemon-go.glb';b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);binary=bytearray(b[28+n:]);count=0
 for anim in j['animations']:
  if anim['name']!='walk':continue
  for ch in anim['channels']:
   if ch['target']['path']!='translation' or j['nodes'][ch['target']['node']]['name']!='origin_03':continue
   a=j['accessors'][anim['samplers'][ch['sampler']]['output']];v=j['bufferViews'][a['bufferView']];start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',12)
   for i in range(a['count']):
    offset=start+i*stride;xyz=struct.unpack_from('<fff',binary,offset);struct.pack_into('<fff',binary,offset,0,xyz[1],0)
   a.pop('min',None);a.pop('max',None);count+=1
 assert count==1,(pid,count)
 data=json.dumps(j,separators=(',',':')).encode();data+=b' '*((-len(data))%4);chunks=struct.pack('<II',len(data),0x4e4f534a)+data+struct.pack('<II',len(binary),0x004e4942)+binary;p.write_bytes(struct.pack('<III',0x46546c67,2,len(chunks)+12)+chunks)
