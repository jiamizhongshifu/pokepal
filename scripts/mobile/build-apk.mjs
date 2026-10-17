import { existsSync, readdirSync } from 'node:fs';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root=process.cwd();
const cache=path.join(root,'scripts/.cache/android');
const jdkRoot=path.join(cache,'jdk');
const bundledJdk=existsSync(jdkRoot)?readdirSync(jdkRoot).map(n=>path.join(jdkRoot,n,'Contents/Home')).find(p=>existsSync(path.join(p,'bin/java'))):undefined;
const java=process.env.JAVA_HOME||bundledJdk;
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||path.join(cache,'sdk');
if(!java||!existsSync(path.join(sdk,'platforms/android-36/android.jar')))throw new Error('需要 JDK 21 和 Android SDK 36；详见 docs/mobile-testing.md。');
const env={...process.env,JAVA_HOME:java,ANDROID_HOME:sdk,ANDROID_SDK_ROOT:sdk};
async function run(cmd,args,cwd=root){
  await new Promise((resolve,reject)=>{const p=spawn(cmd,args,{cwd,env,stdio:'inherit'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error(cmd+' exit '+code)));});
}
if(!process.argv.includes('--prepared'))await run('npm',['run','android:prepare']);
await writeFile(path.join(root,'android/local.properties'),'sdk.dir='+sdk+'\n');
await run('./gradlew',['--no-daemon',':app:assembleDebug'],path.join(root,'android'));
const source=path.join(root,'android/app/build/outputs/apk/debug/app-debug.apk');
const target=path.join(root,'output/android/PokePal-0.1.0-test1.apk');
await mkdir(path.dirname(target),{recursive:true});
await copyFile(source,target);
const bytes=await readFile(target);
const checksum=createHash('sha256').update(bytes).digest('hex');
await writeFile(target+'.sha256',checksum+'  '+path.basename(target)+'\n');
console.log(JSON.stringify({apk:target,bytes:bytes.length,sha256:checksum,build:'debug test; not a store release'},null,2));
