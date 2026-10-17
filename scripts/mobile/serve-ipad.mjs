import { diaryApi } from './diary-api.mjs';
import http from 'node:http';
import https from 'node:https';
import { appendFile, readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { networkInterfaces } from 'node:os';

// Serve only built public assets and explicitly allowed public certificate downloads.
// Certificate private keys and the source checkout are never served.
const host=process.env.IPAD_HOST || networkInterfaces().en0?.find(a=>a.family==='IPv4')?.address;
if(!host)throw new Error('No Wi-Fi IPv4 address. Set IPAD_HOST to a certificate-covered LAN address.');
const dist=path.resolve('dist');
const setup=path.resolve('output/ipad');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.m4a':'audio/mp4','.ogg':'audio/ogg','.glb':'model/gltf-binary','.wasm':'application/wasm','.mobileconfig':'application/x-apple-aspen-config','.cer':'application/pkix-cert'};
async function sendFile(req,res,file){
  try{
    const info=await stat(file);
    if(!info.isFile()){res.writeHead(404);res.end();return;}
    let start=0,end=info.size-1,code=200;
    if(req.headers.range){
      const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if(!m){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
      start=Number(m[1]);end=m[2]?Number(m[2]):end;
      if(start>end||end>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
      code=206;
    }
    res.writeHead(code,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff',...(code===206?{'Content-Range':`bytes ${start}-${end}/${info.size}`}:{})});
    if(req.method==='HEAD'){res.end();return;}
    createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(404);res.end('Not found');}
}
function validMethod(req,res){if(req.method==='GET'||req.method==='HEAD')return true;res.writeHead(405);res.end();return false;}
https.createServer({key:await readFile('certs/key.pem'),cert:await readFile('certs/cert.pem')},async(req,res)=>{
  if(await diaryApi(req,res))return;
  if(req.url==='/__ipad/update-report' && req.method==='POST'){
    if(req.headers.origin!==`https://${host}:4173` || !String(req.headers['content-type']).startsWith('application/json')){res.writeHead(403);res.end();return;}
    try{
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192){res.writeHead(413);res.end();return;}}
      const r=JSON.parse(body);if(r.version!=='ipad-update-1')throw new Error('Invalid report');
      const data={at:new Date().toISOString(),release:String(r.release||'').slice(0,60),phase:String(r.phase||'').slice(0,40),error:String(r.error||'').slice(0,600),core:r.core,voice:r.voice};
      await appendFile(path.join(setup,'update-reports.jsonl'),JSON.stringify(data)+'\n');
      console.log(data.at,'update',data.phase,data.release,data.error);
      res.writeHead(204,{'Cache-Control':'no-store'});res.end();
    }catch{res.writeHead(400);res.end('Invalid report');}return;
  }
  if(req.url==='/__ipad/camera-report' && req.method==='POST'){
    if(req.headers.origin!==`https://${host}:4173` || !String(req.headers['content-type']).startsWith('application/json')){res.writeHead(403);res.end();return;}
    try{
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>32768){res.writeHead(413);res.end();return;}}
      const r=JSON.parse(body);if(r.version!=='camera-1'||!Array.isArray(r.history)||r.history.length>75)throw new Error('Invalid camera report');
      const fields=['at','reason','view','elapsed','pointers','candidates','reduced','subject','lastInput'];
      const sample=s=>s&&Object.fromEntries(fields.map(k=>[k,typeof s[k]==='string'?s[k].slice(0,100):typeof s[k]==='number'||typeof s[k]==='boolean'?s[k]:null]));
      await appendFile(path.join(setup,'camera-reports.jsonl'),JSON.stringify({receivedAt:new Date().toISOString(),release:String(r.release||'').slice(0,60),latest:sample(r.latest),history:r.history.map(sample)})+'\n');
      res.writeHead(204,{'Cache-Control':'no-store'});res.end();
    }catch{res.writeHead(400);res.end('Invalid report');}return;
  }
  if(req.url==='/__ipad/display-report' && req.method==='POST'){
    if(req.headers.origin!==`https://${host}:4173` || !String(req.headers['content-type']).startsWith('application/json')){res.writeHead(403);res.end();return;}
    try {
      let body='';
      for await (const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192){res.writeHead(413);res.end();return;}}
      const report=JSON.parse(body);
      if(!['ipad-viewport-20261015-1','ipad-viewport-20261015-2','ipad-viewport-20261015-3'].includes(report.version) || typeof report.window?.height!=='number')throw new Error('Invalid report');
      const allowed=['version','standalone','window','screen','visual','safe','fixed','root','page','canvas','scroll','statusBar','fullscreen','units','sizing','document','body'];
      const data=Object.fromEntries(allowed.map(key=>[key,report[key]]));
      await appendFile(path.join(setup,'display-reports.jsonl'),JSON.stringify({at:new Date().toISOString(),...data})+'\n');
      res.writeHead(204,{'Cache-Control':'no-store'});res.end();
      console.log(new Date().toISOString(),'display report received');
    }catch{res.writeHead(400);res.end('Invalid report');}
    return;
  }
  if(!validMethod(req,res))return;
  let name;
  try{name=decodeURIComponent(new URL(req.url,'https://local').pathname);}catch{res.writeHead(400);res.end();return;}
  if(name==='/'||name==='/index.html')console.log(new Date().toISOString(),'game opened',String(req.headers['user-agent']||'').slice(0,160));
  const file=path.resolve(dist,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(dist+path.sep)||name.split('/').some(s=>s.startsWith('.'))){res.writeHead(403);res.end();return;}
  await sendFile(req,res,file);
}).listen(4173,host,()=>console.log(`Game: https://${host}:4173/`));
http.createServer(async(req,res)=>{
  if(!validMethod(req,res))return;
  const name=new URL(req.url,'http://local').pathname;
  const files={'/':'install.html','/pokepal-local-test.mobileconfig':'pokepal-local-test.mobileconfig','/pokepal-local-ca.cer':'pokepal-local-ca.cer'};
  if(!files[name]){res.writeHead(404);res.end();return;}
  console.log(new Date().toISOString(),'setup',name,String(req.headers['user-agent']||'').slice(0,160));
  await sendFile(req,res,path.join(setup,files[name]));
}).listen(4189,host,()=>console.log(`Installation guide: http://${host}:4189/`));
