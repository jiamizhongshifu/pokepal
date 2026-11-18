// Response headers for the online site. Every third-party origin the page may load at runtime is listed here.
const CHATWOOT='https://app.chatwoot.com';

export const CONTENT_SECURITY_POLICY=[
 "default-src 'self'",
 `script-src 'self' https://*.googletagmanager.com ${CHATWOOT}`,
 "style-src 'self' 'unsafe-inline'",
 `img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com ${CHATWOOT}`,
 "font-src 'self' data:",
 "media-src 'self' data: blob:",
 `connect-src 'self' data: blob: https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com ${CHATWOOT} wss://app.chatwoot.com`,
 `frame-src ${CHATWOOT}`,
 "worker-src 'self'",
 "manifest-src 'self'",
 "object-src 'none'",
 "base-uri 'self'",
 "form-action 'self'",
 "frame-ancestors 'self'",
].join('; ');

export const PERMISSIONS_POLICY='microphone=(self), camera=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=()';

export const SECURITY_HEADERS={
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'strict-origin-when-cross-origin',
 'X-Frame-Options':'SAMEORIGIN',
 'Content-Security-Policy':CONTENT_SECURITY_POLICY,
 'Permissions-Policy':PERMISSIONS_POLICY,
};

const CACHE_RULES=[
 ['/','no-cache'],
 ['/index.html','no-cache'],
 ['/assets/*','public, max-age=31536000, immutable'],
 ['/voice-online/index/*','public, max-age=31536000, immutable',{'Access-Control-Allow-Origin':'*'}],
 ['/voice-online/packs/*','public, max-age=31536000, immutable',{'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'Content-Range'}],
 ['/announcements.json','no-store'],
 ['/release-entry','no-store'],
 ['/release-entry.html','no-store'],
 ['/release-recovery','no-store'],
 ['/release-recovery.html','no-store'],
 ['/release.json','no-store'],
 ['/sw.js','no-cache'],
];

const block=(path,headers)=>`${path}\n${Object.entries(headers).map(([k,v])=>`  ${k}: ${v}`).join('\n')}\n`;

export function pagesHeaders(){
 return block('/*',SECURITY_HEADERS)+CACHE_RULES.map(([path,cache,extra={}])=>block(path,{'Cache-Control':cache,...extra})).join('');
}
