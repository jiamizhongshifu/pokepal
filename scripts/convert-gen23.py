"""Resume the bounded Gen II/III conversion; one isolated Blender process per species."""
import concurrent.futures,json,os,pathlib,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]; REPORT=ROOT/'models-src/_research/pogo-gen23-20261015'
config=json.loads((ROOT/'scripts/pogo-textures.json').read_text())
ids=[p['id'] for p in json.loads((REPORT/'model-roster.json').read_text())]
env=os.environ.copy();env.update(POGO_REPORT_DIR=str(REPORT.relative_to(ROOT)),POGO_ROSTER=str((REPORT/'model-roster.json').relative_to(ROOT)))
def job(pid):
 target=REPORT/f'conversion-{pid}.json'
 if target.exists() and (ROOT/f'models-src/{pid}/pokemon-go.glb').exists() and json.loads(target.read_text())['textures']==config[str(pid)]:return pid,True
 with (REPORT/f'blender-{pid}.log').open('w') as log:
  p=subprocess.run(['/Applications/Blender.app/Contents/MacOS/Blender','-b','-t','2','-P',str(ROOT/'scripts/prepare-pogo-batch.py'),'--',str(pid)],env=env,stdout=log,stderr=subprocess.STDOUT)
 return pid,p.returncode==0 and target.exists()
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for pid,ok in pool.map(job,ids):
  results.append({'id':pid,'ok':ok});print('MODEL',pid,'OK' if ok else 'FAILED',flush=True)
(REPORT/'conversion-status.json').write_text(json.dumps(results,indent=2))
print('COMPLETE',sum(x['ok'] for x in results),'/',len(results),flush=True)
