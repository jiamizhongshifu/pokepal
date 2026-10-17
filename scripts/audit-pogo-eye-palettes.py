"""Flag possible normal/shiny face mismatches for visual review; never auto-select."""
from PIL import Image
from pathlib import Path
import json, numpy as np
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'models-src/_research/pogo-20261014/pokeminers-20201127'
cfg=json.loads((ROOT/'scripts/pogo-textures.json').read_text());out=[]
def palette(p):
 a=np.array(Image.open(p).convert('RGB').resize((128,128)))
 q=(a//8)*8+4;v,n=np.unique(q.reshape(-1,3),axis=0,return_counts=True);idx=np.argsort(n)[::-1];return v[idx].astype(float),n[idx]/n.sum()
for sid,c in cfg.items():
 if not c.get('face'):continue
 folder=source/c.get('sourceStem',f'pm{int(sid):04}_00_Rig');face=folder/c['face'];stem=face.stem.split(' #')[0];body,n=palette(folder/c['body']);body=body[n>.003];scores=[]
 for f in folder.glob(stem+'*.png'):
  pal,w=palette(f);keep=w>.05;pal=pal[keep];w=w[keep]
  if not len(w):continue
  score=sum(float(np.min(np.sqrt(((body-v)**2).sum(axis=1))))*weight for v,weight in zip(pal,w))/sum(w)
  scores.append({'file':f.name,'score':round(float(score),2),'background':pal[0].astype(int).tolist()})
 if not scores:continue
 scores.sort(key=lambda s:s['score']);cur=next((s for s in scores if s['file']==c['face']),None)
 if cur:out.append({'id':int(sid),'body':c['body'],'face':c['face'],'currentScore':cur['score'],'best':scores[0],'candidates':scores,'flag':bool(cur['score']-scores[0]['score']>12)})
p=ROOT/'models-src/_research/pogo-eyes-gen9-20261015/eye-palette-audit.json';p.write_text(json.dumps(out,indent=2));print('separate face atlases',len(out));print('flags',[(x['id'],x['currentScore'],x['best']['score'],x['best']['file']) for x in out if x['flag']])
