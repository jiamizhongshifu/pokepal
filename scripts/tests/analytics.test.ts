import test from 'node:test';
import assert from 'node:assert/strict';
import {ANALYTICS_CONSENT_VERSION,ANALYTICS_HOST,ANALYTICS_CONSENT_DAYS,readAnalyticsConsent,analyticsPermitted,trafficPage,trafficReferrer} from '../../src/lib/analyticsPolicy';

test('traffic requires fresh explicit consent, never missing, malformed or future consent',()=>{
 const now=1800000000000;
 const read=(v:unknown)=>readAnalyticsConsent({getItem:()=>JSON.stringify(v)},now);
 for(const v of [null,{}, {version:ANALYTICS_CONSENT_VERSION,allowed:false,at:now},{version:1,allowed:true,at:now},{version:ANALYTICS_CONSENT_VERSION,allowed:true,at:now+1},{version:ANALYTICS_CONSENT_VERSION,allowed:true,at:now-ANALYTICS_CONSENT_DAYS*86400000}])assert.equal(read(v),false);
 assert.equal(read({version:ANALYTICS_CONSENT_VERSION,allowed:true,at:now}),true);
 assert.equal(readAnalyticsConsent({getItem:()=>'{broken'}),false);
 assert.equal(readAnalyticsConsent({getItem:()=>{throw Error('storage blocked');}}),false);
});
test('preview, local, forked and mobile builds never collect',()=>{
 assert.equal(analyticsPermitted(true,ANALYTICS_HOST,'G-TEST',true),true);
 for(const host of ['localhost','127.0.0.1','preview.pokepal-online.pages.dev','other.example'])assert.equal(analyticsPermitted(true,host,'G-TEST',true),false);
 assert.equal(analyticsPermitted(false,ANALYTICS_HOST,'G-TEST',true),false);
 assert.equal(analyticsPermitted(true,ANALYTICS_HOST,'',true),false);
 assert.equal(analyticsPermitted(true,ANALYTICS_HOST,'G-TEST',false),false);
});
test('only fixed pages and origin referrers are allowed; private query and lesson IDs cannot pass',()=>{
 for(const name of ['__proto__','constructor','story/private-child','?name=baby','unknown'])assert.equal(trafficPage(name),null);
 assert.deepEqual(trafficPage('story'),{page_title:'宝可梦小小训练师 · 绘本课堂',page_location:`https://${ANALYTICS_HOST}/story/`});
 assert.equal(trafficReferrer('https://user:password@example.com/private-child?email=private#token'),'https://example.com/');
 for(const url of ['javascript:alert(1)','file:///private/child','broken',''])assert.equal(trafficReferrer(url),'');
});
