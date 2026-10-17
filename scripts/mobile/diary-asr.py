"""Private local bridge. Credentials stay on the Mac; audio and transcript are not logged."""
import base64,json,os,sys,uuid,urllib.request,urllib.error
try:
 c=json.load(open(os.environ.get('VOLCENGINE_CONFIG',os.path.expanduser('~/.config/volcengine/config.json'))))
 s=c['services']['speech_asr'];key=c['credentials'][s['credential_ref']]
 audio=sys.stdin.buffer.read(2_000_001)
 if not 44<len(audio)<=2_000_000 or audio[:4]!=b'RIFF' or audio[8:12]!=b'WAVE':raise ValueError('audio')
 body={'user':{'uid':'pokepal-local-diary'},'audio':{'data':base64.b64encode(audio).decode(),'format':'wav'},'request':{'model_name':'bigmodel','enable_itn':True,'enable_punc':True}}
 req=urllib.request.Request('https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','X-Api-Key':key,'X-Api-Resource-Id':'volc.bigasr.auc_turbo','X-Api-Request-Id':str(uuid.uuid4()),'X-Api-Sequence':'-1'})
 with urllib.request.urlopen(req,timeout=45) as r:
  status=r.headers.get('X-Api-Status-Code');data=json.load(r)
 if status!='20000000':print(json.dumps({'error':'no-speech' if status=='20000003' else 'provider','code':status}));sys.exit()
 text=data.get('result',{}).get('text','').strip()
 print(json.dumps({'text':text[:2000]} if text else {'error':'no-speech'},ensure_ascii=False))
except urllib.error.HTTPError as e:
 print(json.dumps({'error':'authorization' if e.code in (401,403) else 'provider','code':e.code}))
except (TimeoutError,OSError):print(json.dumps({'error':'network'}))
except Exception:print(json.dumps({'error':'configuration'}))
