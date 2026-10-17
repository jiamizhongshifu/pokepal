"""Cache PokéAPI data and media for the explicit project roster; preserve existing records.
--stage-only writes the candidate JSON to the research directory for review.
Runtime uses local files only. Cries prefer the already extracted GO APK WAV.
"""
import argparse,concurrent.futures,hashlib,json,subprocess,time,urllib.request,os,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];RESEARCH=ROOT/os.environ.get('POGO_REPORT_DIR','models-src/_research/pogo-kanto-20261014')
RESEARCH.mkdir(parents=True,exist_ok=True)
CACHE=ROOT/'scripts/.cache/pokeapi';CACHE.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('--stage-only',action='store_true');args=parser.parse_args()
config=json.loads((ROOT/'scripts/pokemon-roster.json').read_text());ids=set(config['ids'])
old={p['id']:p for p in json.loads((ROOT/'src/data/pokemon.json').read_text())};provenance=[]
def read_url(url):
 for attempt in range(3):
  try:
   return subprocess.check_output(['curl','--fail','--silent','--show-error','--location','--max-time','60',url])
  except Exception:
   if attempt==2:raise
   time.sleep(attempt+1)
def get(url):
 f=CACHE/(url.rstrip('/').split('/api/v2/')[-1].replace('/','-')+'.json')
 if f.exists():return json.loads(f.read_text())
 data=read_url(url);value=json.loads(data);f.write_bytes(data);return value
def media(url,file):
 if not file.exists():file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(read_url(url))
 return {'path':str(file.relative_to(ROOT)),'url':url,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
def pick(items,lang,key):return next((x[key] for x in items if x['language']['name']==lang),'')
def clean(s):return ' '.join(s.split())
def job(pid):
 p=get(f'https://pokeapi.co/api/v2/pokemon/{pid}/');s=get(f'https://pokeapi.co/api/v2/pokemon-species/{pid}/');evo=get(s['evolution_chain']['url']);node=None
 def find(n):
  nonlocal node
  if int(n['species']['url'].rstrip('/').split('/')[-1])==pid:node=n
  for c in n['evolves_to']:find(c)
 find(evo['chain']);assert node
 kids=[int(c['species']['url'].rstrip('/').split('/')[-1]) for c in node['evolves_to']];kids=[i for i in kids if i in ids]
 parent=s.get('evolves_from_species');parent_id=int(parent['url'].rstrip('/').split('/')[-1]) if parent else None
 if pid in old:
  # Expanding the roster can add children to an existing species (e.g. Scyther).
  # Keep existing catch eligibility and all authored descriptions unchanged.
  row={**old[pid],'evolvesTo':kids}
  return row,[]
 row={'id':pid,'nameEn':pick(s['names'],'en','name'),'nameZh':pick(s['names'],'zh-hans','name'),'genusEn':unicodedata.normalize('NFKC',pick(s['genera'],'en','genus')),'genusZh':unicodedata.normalize('NFKC',pick(s['genera'],'zh-hans','genus')),'types':[t['type']['name'] for t in p['types']],'color':s['color']['name'],'habitat':(s['habitat'] or {'name':'grassland'})['name'],'heightCm':p['height']*10,'weightKg':p['weight']/10,'captureRate':s['capture_rate'],'isBaby':s['is_baby'],'isLegendary':s['is_legendary'],'isMythical':s['is_mythical'],'isFinal':not node['evolves_to'],'flavorEn':clean(pick(list(reversed(s['flavor_text_entries'])),'en','flavor_text')),'flavorZh':''.join(pick(list(reversed(s['flavor_text_entries'])),'zh-hans','flavor_text').split()),'evolvesTo':kids}
 if parent_id in ids:row['evoOnly']=True
 assert row['nameEn'] and row['nameZh']
 records=[]
 for label,key in [('art','official-artwork'),('home','home')]:records.append(media(p['sprites']['other'][key]['front_default'],ROOT/f'public/pokemon/{label}/{pid}.png'))
 wav=ROOT/f'models-src/_research/pogo-20261014/extracted-cries/pv{pid:03}.wav'
 cry_url=None
 if not wav.exists():
  cry_url=p.get('cries',{}).get('latest');assert cry_url,('missing cry',pid)
  wav=CACHE/f'cry-{pid}.ogg';media(cry_url,wav)
 cry=ROOT/f'public/pokemon/cry/{pid}.m4a'
 if not cry.exists():subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-ac','1','-c:a','aac','-b:a','64k','-af','loudnorm=I=-16:TP=-1.5:LRA=11',str(cry)],check=True)
 records.append({'path':str(cry.relative_to(ROOT)),'source':str(wav.relative_to(ROOT)),'url':cry_url,'sha256':hashlib.sha256(cry.read_bytes()).hexdigest()});print('DATA',pid,row['nameZh'],flush=True)
 return row,records
rows=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for row,records in pool.map(job,sorted(ids)):rows.append(row);provenance.extend(records)
assert all(i in {p['id'] for p in rows} for i in range(1,152))
assert all(k in ids for p in rows for k in p['evolvesTo'])
target=RESEARCH/'pokemon.json' if args.stage_only else ROOT/'src/data/pokemon.json';target.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
provenance_file=RESEARCH/'data-provenance.json'
previous=json.loads(provenance_file.read_text()) if provenance_file.exists() else []
merged={record['path']:record for record in previous}
merged.update({record['path']:record for record in provenance})
provenance_file.write_text(json.dumps(list(merged.values()),ensure_ascii=False,indent=2));print('Wrote',len(rows),'to',target)
