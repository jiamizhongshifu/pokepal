// Explicit publishing entrypoint. Never called by build or release:prepare.
import {execFileSync} from 'node:child_process';
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
if(git(['status','--porcelain']))throw new Error('Commit reviewed source and docs before publishing.');
if(git(['branch','--show-current'])!=='main')throw new Error('Production release requires main.');
const commit=git(['rev-parse','HEAD']);
execFileSync(process.execPath,['scripts/online/release-prepare.mjs'],{stdio:'inherit'});
if(git(['status','--porcelain'])||git(['rev-parse','HEAD'])!==commit)throw new Error('Source changed during preparation.');
execFileSync('wrangler',['pages','deploy','dist-online','--project-name','pokepal-online','--branch','main','--commit-hash',commit],{stdio:'inherit'});
console.log('Upload finished. Verify production release.json, resources and user flows before reporting acceptance.');
