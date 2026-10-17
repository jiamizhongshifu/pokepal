"""Transcode extracted APK cries, preserving originals and provenance."""
import json, subprocess, shutil, hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1];research=root/'models-src/_research/pogo-batch-20261014'
backup=research/'before/cry';backup.mkdir(parents=True,exist_ok=True)
rows=[]
for p in json.loads((root/'src/data/pokemon.json').read_text()):
 pid=p['id'];source=root/f'models-src/_research/pogo-20261014/extracted-cries/pv{pid:03}.wav';target=root/f'public/pokemon/cry/{pid}.m4a'
 if not source.exists():
  rows.append({'id':pid,'source':'existing-pokeapi','sha256':hashlib.sha256(target.read_bytes()).hexdigest()});continue
 if pid not in (1,6,25):
  if not (backup/target.name).exists():shutil.copy2(target,backup/target.name)
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-ac','1','-c:a','aac','-b:a','64k','-af','loudnorm=I=-16:TP=-1.5:LRA=11',str(target)],check=True)
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_name,channels:format=duration','-of','json',str(target)]))
 assert info['streams'][0]['codec_name']=='aac' and info['streams'][0]['channels']==1
 rows.append({'id':pid,'source':'pokemon-go-0.29.0-apk','sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'probe':info})
(research/'cry-report.json').write_text(json.dumps(rows,indent=2))
print('APK cries',sum(x['source'].endswith('-apk') for x in rows),'preserved',sum(x['source']=='existing-pokeapi' for x in rows))
