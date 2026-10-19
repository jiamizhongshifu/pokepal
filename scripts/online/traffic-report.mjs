import {execFileSync} from 'node:child_process';
// Read-only and account-authenticated; there is deliberately no public dashboard API.
const local=process.argv.includes('--local');
const date=new Date();date.setUTCDate(date.getUTCDate()-29);
const cutoff=date.toISOString().slice(0,10);
const sql=`SELECT day,page,views FROM traffic_daily WHERE day >= '${cutoff}' ORDER BY day DESC,page`;
const output=execFileSync('wrangler',['d1','execute','TRAFFIC_DB',local?'--local':'--remote','--command',sql,'--json'],{encoding:'utf8',maxBuffer:4*1024*1024});
const result=JSON.parse(output.slice(output.indexOf('[')));
const rows=result.flatMap(r=>r.results??[]);
console.log(`最近 30 个 UTC 日 · 页面访问次数（不是独立用户数） · ${local?'本地测试':'正式数据库'}`);
console.table(rows);
console.log(`合计 ${rows.reduce((n,r)=>n+Number(r.views),0)} 次；GA4 交互事件需在 Google Analytics 中查看。`);
