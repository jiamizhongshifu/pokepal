import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CONTENT_SECURITY_POLICY,PERMISSIONS_POLICY,pagesHeaders} from '../online/headers.mjs';

const directive=name=>CONTENT_SECURITY_POLICY.split('; ').find(d=>d.startsWith(`${name} `))?.split(' ').slice(1)??[];

test('site-wide headers carry CSP and permissions policy before cache rules',()=>{
 const site=pagesHeaders().split('\n/\n')[0]+'\n';
 assert.match(site,/^\/\*\n/);
 assert.ok(site.includes(`  Content-Security-Policy: ${CONTENT_SECURITY_POLICY}\n`));
 assert.ok(site.includes(`  Permissions-Policy: ${PERMISSIONS_POLICY}\n`));
});

test('CSP blocks inline and eval scripts, plugins and foreign framing',()=>{
 assert.deepEqual(directive('object-src'),["'none'"]);
 assert.deepEqual(directive('frame-ancestors'),["'self'"]);
 for(const unsafe of ["'unsafe-inline'","'unsafe-eval'",'*','data:','blob:'])assert.ok(!directive('script-src').includes(unsafe),unsafe);
});

test('CSP allows the third-party scripts the app actually loads',()=>{
 const analytics=readFileSync('src/lib/analytics.ts','utf8'),chat=readFileSync('src/components/ParentLiveChat.tsx','utf8');
 assert.match(analytics,/https:\/\/www\.googletagmanager\.com\/gtag\/js/);
 assert.ok(directive('script-src').includes('https://*.googletagmanager.com'));
 const chatwoot=chat.match(/baseUrl:'(https:\/\/[^']+)'/)?.[1];
 assert.ok(chatwoot);
 for(const name of ['script-src','frame-src','connect-src'])assert.ok(directive(name).includes(chatwoot),name);
});

test('microphone stays limited to the island itself; camera and location are off',()=>{
 assert.match(PERMISSIONS_POLICY,/\bmicrophone=\(self\)/);
 assert.match(PERMISSIONS_POLICY,/\bcamera=\(\)/);
 assert.match(PERMISSIONS_POLICY,/\bgeolocation=\(\)/);
});
