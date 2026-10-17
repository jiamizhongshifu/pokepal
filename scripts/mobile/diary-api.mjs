import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const jobs=new Map(),limits=new Map();
function transcribe(audio){return new Promise(resolve=>{const p=spawn('python3',[fileURLToPath(new URL('./diary-asr.py',import.meta.url))],{stdio:['pipe','pipe','ignore']});let out='';const timer=setTimeout(()=>{p.kill();resolve({error:'network'});},50000);p.stdout.on('data',c=>{out+=c;if(out.length>16000)p.kill();});p.on('error',()=>{clearTimeout(timer);resolve({error:'configuration'});});p.on('close',()=>{clearTimeout(timer);try{resolve(JSON.parse(out));}catch{resolve({error:'network'});}});p.stdin.on('error',()=>{});p.stdin.end(audio);});}
export async function diaryApi(req,res){
 if(req.url!=='/__ipad/diary-asr')return false;
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 const origin=req.headers.origin;let originUrl;try{originUrl=new URL(origin);}catch{}
 if(req.method!=='POST'){send(405,{error:'method'});return true;}
 // Require an exact same-origin browser request, including port, on the existing private LAN service.
 if(!originUrl||!['http:','https:'].includes(originUrl.protocol)||originUrl.host!==req.headers.host){send(403,{error:'origin'});return true;}
 if(req.headers['content-type']!=='audio/wav'){send(415,{error:'audio'});return true;}
 const id=String(req.headers['x-diary-request']??'');if(!/^[a-zA-Z0-9-]{16,80}$/.test(id)){send(400,{error:'request'});return true;}
 try{
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2000000){send(413,{error:'too-long'});return true;}chunks.push(chunk);}
  const audio=Buffer.concat(chunks);
  // Browser encoder produces PCM16 mono 16kHz; reject arbitrary uploads before paid calls.
  if(audio.length<44||audio.toString('ascii',0,4)!=='RIFF'||audio.toString('ascii',8,12)!=='WAVE'||audio.readUInt16LE(20)!==1||audio.readUInt16LE(22)!==1||audio.readUInt32LE(24)!==16000||audio.readUInt16LE(34)!==16||audio.readUInt32LE(40)!==audio.length-44){send(400,{error:'audio'});return true;}
  const now=Date.now();for(const[k,v]of jobs)if(now-v.at>300000)jobs.delete(k);for(const[k,v]of limits)if(now-v.at>60000)limits.delete(k);
  const hash=createHash('sha256').update(audio).digest('hex');let job=jobs.get(id);
  if(job&&job.hash!==hash){send(409,{error:'request'});return true;}
  if(!job){const ip=req.socket.remoteAddress,count=limits.get(ip)??{at:now,count:0};if(count.count>=6||jobs.size>=50){send(429,{error:'rate'});return true;}count.count++;limits.set(ip,count);job={hash,at:now,promise:transcribe(audio)};jobs.set(id,job);}
  const result=await job.promise;if(result.error)jobs.delete(id);send(result.error?503:200,result);
 }catch{if(!res.headersSent)send(400,{error:'request'});}
 return true;
}
