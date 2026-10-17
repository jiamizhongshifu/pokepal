"""Render original Pokepal scores, without third-party melodies or samples.
Deterministic additive instruments; stereo reverb wraps around the loop seam.
Requires numpy and ffmpeg. Re-run to reproduce assets + provenance manifest.
"""
from pathlib import Path
import numpy as np
import subprocess, wave, tempfile, hashlib, json

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/music'; OUT.mkdir(exist_ok=True)
SR=32000
# C major / A minor pentatonic phrases: small intervals, pauses, no busy percussion.
PHRASES=[[(0,76,1), (1.5,79,.5), (2,81,1.5)],[(0,79,1.5),(2,76,1),(3,74,.6)],
 [(0,72,1.5),(2,74,.8),(3,76,.8)],[(0,79,2.5)],
 [(0,81,1),(1.5,84,.8),(3,81,.8)],[(.5,79,1.5),(2.5,76,1)],
 [(0,74,1),(1.5,76,.8),(2.5,72,1)],[(0,72,2.5)]]
CHORDS=[(48,[60,64,67,71]),(43,[59,62,67,69]),(45,[60,64,69,71]),(41,[60,64,65,69]),
 (48,[60,64,67,74]),(45,[60,64,67,69]),(41,[60,64,65,69]),(43,[59,62,67,69])]
TRACKS=[
 ('morning','晨光里的问候',78,'flute',0,.78),
 ('day','树果与微风',86,'marimba',0,.85),
 ('evening','回家的小路',70,'piano',-5,.68),
 ('night','星星陪你入梦',60,'bell',-12,.40),
 ('meadow','草叶里的新朋友',82,'pluck',2,.80),
 ('storybook','一起翻开故事',66,'piano',0,.58),
 ('village','小小发现之旅',76,'marimba',-5,.65),
]

def instrument(note, seconds, kind):
 t=np.arange(int(seconds*SR))/SR; f=440*2**((note-69)/12)
 attack=np.minimum(1,t/({'pad':.45,'flute':.13}.get(kind,.012)))
 release=np.minimum(1,(seconds-t)/({'pad':.8,'flute':.24}.get(kind,.14)))
 if kind=='pad':
  sig=sum(a*np.sin(2*np.pi*f*h*t + .004*np.sin(t*2)) for h,a in [(1,1),(2,.16),(3,.07)])*.38
 elif kind=='flute':
  phase=2*np.pi*f*t+.09*np.sin(2*np.pi*4.6*t)*np.minimum(t,1)
  sig=(np.sin(phase)+.09*np.sin(2*phase)+.035*np.sin(3*phase))*.65
 elif kind=='bass':
  sig=(np.sin(2*np.pi*f*t)+.12*np.sin(4*np.pi*f*t))*np.exp(-t*1.1)
 elif kind=='bell':
  sig=sum(a*np.sin(2*np.pi*f*h*t)*np.exp(-t*d) for h,a,d in [(1,1,1.4),(2,.18,2.8),(3,.04,4)])*.65
 elif kind=='marimba':
  sig=(np.sin(2*np.pi*f*t)*np.exp(-t*2.8)+.16*np.sin(8*np.pi*f*t)*np.exp(-t*12))*.9
 elif kind=='pluck':
  sig=sum((1/h**1.8)*np.sin(2*np.pi*f*h*t)*np.exp(-t*(2.4+h*.5)) for h in range(1,6))*.65
 else:
  sig=sum(a*np.sin(2*np.pi*f*h*t)*np.exp(-t*(1.25+h*.36)) for h,a in [(1,1),(2,.27),(3,.09),(4,.03)])*.72
 return (sig*attack*release).astype(np.float32)

manifest={'version':1,'origin':'Original authored score and deterministic additive synthesis; no external samples or existing game melodies.','sampleRate':SR,'tracks':[]}
for name,title,bpm,lead,transpose,density in TRACKS:
 beat=60/bpm; duration=24*4*beat; frames=round(SR*duration)
 mix=np.zeros((frames,2),dtype=np.float32)
 def add(note,start,length,kind,amp,pan=0):
  snd=instrument(note+transpose,length*beat,kind)*amp
  idx=(np.arange(len(snd))+round(start*beat*SR))%frames
  np.add.at(mix[:,0],idx,snd*np.sqrt((1-pan)/2));np.add.at(mix[:,1],idx,snd*np.sqrt((1+pan)/2))
 for bar in range(24):
  root,chord=CHORDS[bar%8]; start=bar*4
  # Sustained warm harmony, gentle low root and an unhurried answering arpeggio.
  for n in chord[:3]:add(n,start,4.8,'pad',.035, -.25 if n%2 else .25)
  add(root,start,3.5,'bass',.11)
  order=[0,2,1,3] if bar%2==0 else [1,2,3,2]
  for k,i in enumerate(order):
   if name=='night' and k%2:continue
   add(chord[i],start+k+.12,2.5,'pluck' if name in ['day','meadow'] else 'piano',.075*density,(-.4 if k%2 else .4))
  # Middle eight bars leave extra breathing room; final phrase resolves home.
  phrase=PHRASES[(bar+(2 if name=='meadow' else 0))%8]
  if bar in [7,15,23]: phrase=[(0,72,2.7)] if bar==23 else [(0,76,1.8)]
  if 8<=bar<16 and bar%2:phrase=phrase[:1]
  for off,n,l in phrase:
   add(n,start+off,l+.7,lead,.16*density,.08)
  if bar in [3,11,19] and name!='night':add(84,start+3,2.2,'bell',.035,-.25)
 # Short stereo room and soft echoes, circular to preserve the musical seam.
 dry=mix.copy()
 for delay,level in [(.071,.14),(.137,.11),(.283,.12),(.461,.07),(.719,.035)]:
  mix+=np.roll(dry[:,::-1],round(delay*SR),axis=0)*level
 peak=float(np.abs(mix).max()); mix*=.63/max(peak,1e-9)
 # Tiny endpoint fades avoid codec-padding clicks without an audible musical pause.
 edge=round(.012*SR);mix[:edge]*=np.linspace(0,1,edge)[:,None];mix[-edge:]*=np.linspace(1,0,edge)[:,None]
 rms=float(np.sqrt(np.mean(mix**2)))
 filename=f'{name}-v1.m4a'
 with tempfile.TemporaryDirectory() as tmp:
  wav=Path(tmp)/'score.wav'
  with wave.open(str(wav),'wb') as w:
   w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((mix*32767).astype('<i2').tobytes())
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','aac','-b:a','96k','-movflags','+faststart',str(OUT/filename)],check=True)
 data=(OUT/filename).read_bytes()
 manifest['tracks'].append({'id':name,'title':title,'file':filename,'bpm':bpm,'duration':duration,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'peak':.63,'rms':rms})
 print(name,round(duration,1),len(data),flush=True)
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
