import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const files=readdirSync('scripts/tests').filter(n=>/\.test\.(ts|mjs)$/.test(n)).sort().map(n=>`scripts/tests/${n}`);
files.push('scripts/online/residents.test.ts');
const result=spawnSync(process.execPath,['--import','tsx','--test',...files],{stdio:'inherit'});
if(result.error)console.error(result.error.message);
process.exit(result.status??1);
