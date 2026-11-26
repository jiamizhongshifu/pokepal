/**
 * What the online release keeps for use without a network (vite.config.ts hands these to the service worker).
 * scripts/tests/offline-cache.test.ts checks that every kind of picture and recording the app asks for is covered.
 */

/** The pictures a failed picture falls back to: they come with the app, so they never fail themselves. */
export const FALLBACK_PICTURES = ['scenes/flat-v1/icon/face.svg', 'scenes/flat-v1/prop/invite-berry.svg'];
/** Downloaded with the app on the first visit. */
export const WITH_APP = ['icons/icon-192.png', 'icons/icon-512.png', ...FALLBACK_PICTURES];

const DAY = 24 * 60 * 60;
/** Kept once seen: a page the child has opened before still shows its pictures and speaks without a network. */
export const RUNTIME_CACHE = [
 { urlPattern: /\/scenes\/flat-v1\/.*\.(?:svg|webp|png)$/, handler: 'StaleWhileRevalidate', options: { cacheName: 'pokepal-scenes-v1', cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 400, maxAgeSeconds: 30 * DAY } } },
 { urlPattern: /\/sprites\/.*\.(?:svg|webp|png)$/, handler: 'StaleWhileRevalidate', options: { cacheName: 'pokepal-sprites-v1', cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 300, maxAgeSeconds: 30 * DAY } } },
 // Recordings are packed in files named by their content, so a kept one never goes stale.
 { urlPattern: /\/voice-online\/(?:index|packs)\/[a-f0-9]+\.(?:json|bin)$/, handler: 'CacheFirst', options: { cacheName: 'pokepal-voice-v1', cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 240, maxAgeSeconds: 90 * DAY } } },
 { urlPattern: /\/environment\/[a-z-]+-v\d+\.m4a$/, handler: 'CacheFirst', options: { cacheName: 'pokepal-nature-v1', cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 6, maxAgeSeconds: 365 * DAY } } },
 { urlPattern: /\/music\/[a-z]+-v\d+\.m4a$/, handler: 'CacheFirst', options: { cacheName: 'pokepal-music-v1', cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 8, maxAgeSeconds: 365 * DAY } } },
];
