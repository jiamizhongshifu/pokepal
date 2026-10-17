"""Download the project's fixed-revision Pokémon GO model sources; verify Git hashes."""
from pathlib import Path
import json, hashlib, urllib.request, urllib.parse, concurrent.futures, time, argparse, subprocess
ROOT=Path(__file__).resolve().parents[1]
RESEARCH=ROOT/'models-src/_research/pogo-20261014'
parser=argparse.ArgumentParser();parser.add_argument('--ids',nargs='+',type=int);parser.add_argument('--report-dir',default='models-src/_research/pogo-batch-20261014');args=parser.parse_args()
BATCH=ROOT/args.report_dir
REV='c7ea15aa8bee189efba23fa5306a3e7aa71c09b5'
ids=args.ids or [p['id'] for p in json.loads((ROOT/'src/data/pokemon.json').read_text())]
tree=json.loads((RESEARCH/'pokeminers-old-full-tree.json').read_text())['tree']
forms={201:11,351:11,386:11}
items=[x for x in tree if x['type']=='blob' and any(x['path'].startswith(f'3D Assets/Pokemon/pm{i:04}_{forms.get(i,0):02}_Rig/') for i in ids)]
def fetch(item):
 rel=Path(item['path']).relative_to('3D Assets/Pokemon');target=RESEARCH/'pokeminers-20201127'/rel
 url=f'https://raw.githubusercontent.com/PokeMiners/pogo_assets/{REV}/'+urllib.parse.quote(item['path'])
 def valid(data):return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==item['sha']
 if target.exists() and valid(target.read_bytes()):data=target.read_bytes()
 else:
  for attempt in range(3):
   try:
    data=subprocess.check_output(['curl','--fail','--silent','--show-error','--location','--max-time','90',url])
    if not valid(data):raise ValueError('Git blob hash mismatch')
    target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);break
   except Exception:
    if attempt==2:raise
    time.sleep(attempt+1)
 return {'path':str(target.relative_to(ROOT)),'url':url,'git_blob':item['sha'],'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
BATCH.mkdir(exist_ok=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 result=[]
 for item in pool.map(fetch,items):
  result.append(item)
  if len(result)%40==0:print('verified',len(result),'/',len(items),flush=True)
(BATCH/'source-provenance.json').write_text(json.dumps(result,indent=2))
print('Complete',len(result),'files',sum(x['bytes'] for x in result),'bytes',flush=True)
