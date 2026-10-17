"""Original sound-design approximations; no game audio or external samples.
Periodic filtered noise and additive bird/cricket synthesis, rendered offline.
"""
from pathlib import Path
import numpy as np
import subprocess, wave, tempfile, hashlib, json
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'public/environment';OUT.mkdir(exist_ok=True);SR=24000
rng=np.random.default_rng(171026)
def noise(n,low,high):
 f=np.fft.rfftfreq(n,1/SR);amp=np.zeros_like(f);m=(f>low)&(f<high);amp[m]=1/np.sqrt(np.maximum(f[m],90));amp*=np.minimum(1,np.maximum(0,(f-low)/150))*np.minimum(1,np.maximum(0,(high-f)/500))
 s=np.fft.irfft((rng.normal(size=len(f))+1j*rng.normal(size=len(f)))*amp,n);return s/(np.std(s)+1e-9)
manifest={'origin':'Original procedural nature sound design; no third-party recordings.','sampleRate':SR,'tracks':[]}
for name,seconds in [('waves',24),('leaves',20),('rain',16),('crickets',12),('bird-a',3),('bird-b',3)]:
 n=seconds*SR;t=np.arange(n)/SR
 if name=='waves':
  env=.22+.78*(.5+.5*np.sin(2*np.pi*t/8))**2;s=noise(n,75,2300)*env*.13
 elif name=='leaves':
  env=.15+.85*(.5+.5*np.sin(2*np.pi*t/10))*(.6+.4*np.sin(2*np.pi*t/5)**2);s=noise(n,400,5500)*env*.085
 elif name=='rain':s=noise(n,200,6500)*(.9+.1*np.cos(2*np.pi*t/8))*.085
 elif name=='crickets':
  env=np.maximum(0,np.sin(2*np.pi*t/3))**12*(.5+.5*np.sin(2*np.pi*t*15))**4;s=np.sin(2*np.pi*3800*t)*env*.08
 else:
  s=np.zeros(n)
  for i,start in enumerate([.15,.46,.87,1.6]):
   length=.16 if i!=2 else .29;u=np.arange(int(SR*length))/SR;freq=(2600 if name=='bird-a' else 2000)+1000*np.sin(np.pi*u/length)+220*np.sin(30*u);phase=np.cumsum(freq)*2*np.pi/SR
   chirp=(np.sin(phase)+.09*np.sin(phase*2))*np.sin(np.pi*u/length)**2*.16
   at=int(start*SR);s[at:at+len(u)]+=chirp
 stereo=np.stack([s,np.roll(s,113) if name not in ['bird-a','bird-b'] else s*.93],axis=1)
 with tempfile.NamedTemporaryFile(suffix='.wav') as f:
  with wave.open(f.name,'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(stereo,-.9,.9)*32767).astype('<i2').tobytes())
  dest=OUT/(name+'-v1.m4a');subprocess.run(['ffmpeg','-v','error','-y','-i',f.name,'-c:a','aac','-b:a','80k',str(dest)],check=True)
 manifest['tracks'].append({'name':name,'seconds':seconds,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'peak':float(np.abs(stereo).max()),'rms':float(np.sqrt(np.mean(stereo**2)))})
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));print(json.dumps(manifest,indent=2))
