import {GA_MEASUREMENT_ID} from '../data/analytics';
import {ANALYTICS_CONSENT_KEY,ANALYTICS_CONSENT_VERSION,analyticsPermitted,readAnalyticsConsent,trafficPage,trafficReferrer} from './analyticsPolicy';
const CHANGE='pokepal-analytics-change';
const win=window as unknown as Record<string,unknown>;
const queue:unknown[]=[];
let installed=false,granted=false,blockedHere=false,currentPage='',lastPage='';
const denied={analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
export function analyticsConsent(){try{return !blockedHere&&readAnalyticsConsent(localStorage);}catch{return false;}}
export function analyticsAvailable(){return analyticsPermitted(!!import.meta.env.VITE_ONLINE,location.hostname,GA_MEASUREMENT_ID,true);}
function command(...args:unknown[]){void args;queue.push(arguments);}
function clearAnalyticsCookies(){
 for(const cookie of document.cookie.split(';')){
  const name=cookie.trim().split('=')[0];if(!/^pokepal_ga(?:_|$)/.test(name))continue;
  for(const domain of ['',`; Domain=${location.hostname}`,`; Domain=.${location.hostname}`])document.cookie=`${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax`;
 }
}
function sync(){
 const permitted=analyticsAvailable()&&analyticsConsent();
 win[`ga-disable-${GA_MEASUREMENT_ID}`]=!permitted;
 if(!permitted){granted=false;queue.length=0;lastPage='';clearAnalyticsCookies();return;}
 if(!trafficPage(currentPage)||granted&&currentPage===lastPage)return;
 command('set',{...trafficPage(currentPage),page_referrer:trafficReferrer(document.referrer)});
 if(!granted){
  win.pokepalDataLayer=queue;
  command('consent','default',denied);
  command('consent','update',{...denied,analytics_storage:'granted'});
  command('js',new Date());
  command('config',GA_MEASUREMENT_ID,{...trafficPage(currentPage),page_referrer:trafficReferrer(document.referrer),send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_prefix:'pokepal',cookie_domain:location.hostname,cookie_expires:0,cookie_update:false,cookie_flags:'SameSite=Lax;Secure'});
 }
 if(!installed){
  installed=true;
  const script=document.createElement('script');script.id='pokepal-analytics';script.async=true;script.referrerPolicy='origin';script.src=`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}&l=pokepalDataLayer`;
  script.onerror=()=>{/* Statistics must never interrupt play or block rendering. */};
  document.head.append(script);
 }
 granted=true;
 if(currentPage!==lastPage){command('event','page_view',{...trafficPage(currentPage),page_referrer:trafficReferrer(document.referrer),send_to:GA_MEASUREMENT_ID});lastPage=currentPage;}
}
export function recordTrafficPage(name:string){currentPage=trafficPage(name)?name:'';sync();}
export function setAnalyticsConsent(allowed:boolean){
 if(!allowed)blockedHere=true;
 try{localStorage.setItem(ANALYTICS_CONSENT_KEY,JSON.stringify({version:ANALYTICS_CONSENT_VERSION,allowed,at:Date.now()}));}
 catch{if(allowed)return false;}
 if(allowed)blockedHere=false;
 if(!allowed){win[`ga-disable-${GA_MEASUREMENT_ID}`]=true;queue.length=0;clearAnalyticsCookies();}
 window.dispatchEvent(new Event(CHANGE));return true;
}
export function subscribeAnalytics(listener:()=>void){window.addEventListener(CHANGE,listener);const storage=(e:StorageEvent)=>{if(e.key===null||e.key===ANALYTICS_CONSENT_KEY)listener();};window.addEventListener('storage',storage);return()=>{window.removeEventListener(CHANGE,listener);window.removeEventListener('storage',storage);};}
export function initializeAnalytics(){
 const unsubscribe=subscribeAnalytics(sync);
 const focus=()=>{if(!document.hidden)sync();};document.addEventListener('visibilitychange',focus);
 sync();return()=>{unsubscribe();document.removeEventListener('visibilitychange',focus);};
}
