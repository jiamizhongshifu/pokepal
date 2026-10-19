import {ANALYTICS_HOST} from '../../src/lib/analyticsPolicy';
import {parsePageCounts,TRAFFIC_RETENTION_DAYS} from '../../src/lib/trafficPolicy';
interface Statement {bind(...values:(string|number)[]):Statement;}
export interface CounterDatabase {prepare(sql:string):Statement;batch(statements:Statement[]):Promise<unknown>;}
type Context={request:Request;env:{TRAFFIC_DB?:CounterDatabase}};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(status:number)=>new Response(null,{status,headers});
export async function onRequest({request,env}:Context):Promise<Response>{
 if(request.method!=='POST')return reply(405);
 const url=new URL(request.url),origin=request.headers.get('Origin');
 const local=['127.0.0.1','localhost'].includes(url.hostname);
 if(url.hostname!==ANALYTICS_HOST&&!local)return reply(403);
 if(origin!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return reply(403);
 if(request.headers.get('DNT')==='1'||request.headers.get('Sec-GPC')==='1')return reply(204);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply(415);
 if(Number(request.headers.get('Content-Length')??0)>2048)return reply(413);
 // Bound reads even for chunked requests. Do not log bodies, headers, IPs or errors.
 const reader=request.body?.getReader();if(!reader)return reply(400);
 const chunks:Uint8Array[]=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>2048){await reader.cancel();return reply(413);}chunks.push(value);}}catch{return reply(400);}
 let counts;
 try{const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}counts=parsePageCounts(JSON.parse(new TextDecoder().decode(bytes)));}catch{return reply(400);}
 if(!counts)return reply(400);
 if(!env.TRAFFIC_DB)return reply(503);
 const now=Date.now(),day=new Date(now).toISOString().slice(0,10),cutoff=new Date(now-(TRAFFIC_RETENTION_DAYS-1)*86400000).toISOString().slice(0,10);
 try{
  await env.TRAFFIC_DB.batch([
   env.TRAFFIC_DB.prepare('DELETE FROM traffic_daily WHERE day < ?').bind(cutoff),
   ...counts.map(({page,count})=>env.TRAFFIC_DB!.prepare('INSERT INTO traffic_daily(day,page,views) VALUES(?,?,?) ON CONFLICT(day,page) DO UPDATE SET views=views+excluded.views').bind(day,page,count)),
  ]);
  return reply(204);
 }catch{return reply(503);}
}
