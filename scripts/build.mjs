import {execFileSync} from 'node:child_process';
import {sourceSnapshot} from './source-snapshot.mjs';
execFileSync('npm',['run','check'],{stdio:'inherit'});
const sourceHash=sourceSnapshot();
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{stdio:'inherit',env:{...process.env,SOURCE_HASH:sourceHash}});
