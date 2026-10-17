/* Full offline voice installation uses immutable bundles instead of 23k cache entries. */
(() => {
  const base = new URL('voice/', self.registration.scope);
  const indexUrl = new URL('pack-index.json', base).href;
  const cacheName = `pokepal-voice-packs-v1-${self.registration.scope}`;
  let indexPromise;
  let voice = null;
  let installing = false;
  let failure = '';
  const inFlight = new Map();
  const release = self.POKE_RELEASE;
  let snapshotAt = 0, snapshotValue, snapshotJob;
  let installJob;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function report(phase, error = '') {
    // Only technical update status; never send game saves, recordings or personal data.
    try { await fetch(new URL('__ipad/update-report', self.registration.scope), {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({version:'ipad-update-1',release:release?.id,phase,error:String(error).slice(0,600),voice}),
      signal:AbortSignal.timeout(5000)
    }); } catch {};
  }
  async function snapshot() {
    if (snapshotValue && Date.now()-snapshotAt<4000) return {...snapshotValue,error:failure};
    if (!snapshotJob) snapshotJob=scanSnapshot().then(value=>{snapshotValue=value;snapshotAt=Date.now();return value;}).finally(()=>{snapshotJob=undefined;});
    return snapshotJob;
  }
  async function scanSnapshot() {
    const coreCache = await caches.open(`pokepal-core-v2-precache-v2-${self.registration.scope}`);
    const keys = new Set((await coreCache.keys()).map(r => r.url));
    const assets = release?.assets || [];
    const present = assets.filter(asset => {
      const key = new URL(asset.url, self.registration.scope);
      if (asset.revision) key.searchParams.set('__WB_REVISION__', asset.revision);
      return keys.has(key.href);
    });
    if (!installing) {
      const cache = await caches.open(cacheName);
      indexPromise ||= cache.match(indexUrl).then(r=>r?.json());
      const index = await indexPromise;
      if (index) {
        const available = new Set((await cache.keys()).map(r => r.url));
        const packs = index.packs.filter(p => available.has(new URL(`packs/${p.file}`, base).href));
        voice = { done:packs.length, total:index.packs.length, bytes:packs.reduce((n,p)=>n+p.bytes,0), totalBytes:index.packs.reduce((n,p)=>n+p.bytes,0) };
      }
    }
    return { type:'POKE_OFFLINE_STATUS', id:release?.id,
      core:{done:present.length,total:assets.length,bytes:present.reduce((n,a)=>n+a.bytes,0),totalBytes:assets.reduce((n,a)=>n+a.bytes,0)},
      voice:voice ? {...voice, bytes:Math.min(voice.totalBytes,voice.bytes+[...inFlight.values()].reduce((a,b)=>a+b,0))} : {done:0,total:0,bytes:0,totalBytes:0},
      error:failure };
  }
  async function announce() {
    const state = await snapshot();
    for (const client of await self.clients.matchAll({type:'window',includeUncontrolled:true})) client.postMessage(state);
  }
  self.addEventListener('message', event => {
    if (event.data?.type === 'POKE_OFFLINE_RETRY') {
      event.waitUntil(installVoice().then(announce).catch(()=>{}));
      return;
    }
    if (event.data?.type !== 'POKE_OFFLINE_STATUS') return;
    event.waitUntil(snapshot().then(state => event.ports[0]?.postMessage(state)).catch(error => event.ports[0]?.postMessage({type:'POKE_OFFLINE_STATUS',id:release?.id,error:String(error)})));
  });

  async function fetchPack(pack, cache) {
    const url = new URL(`packs/${pack.file}`, base).href;
    if (await cache.match(url)) { voice.done++; voice.bytes += pack.bytes; return; }
    for (let attempt = 0; attempt < 3; attempt++) {
      const abort = new AbortController();
      const timeout = setTimeout(()=>abort.abort(),45000);
      try {
        const response = await fetch(url, { cache: 'no-store', signal:abort.signal });
        if (!response.ok) throw new Error(`Voice pack HTTP ${response.status}`);
        let bytes;
        if (response.body) {
          const reader=response.body.getReader(), chunks=[]; let size=0;
          inFlight.set(url,0);
          while (true) { const {done,value}=await reader.read(); if(done)break; chunks.push(value);size+=value.byteLength;inFlight.set(url,size); }
          const buffer=new Uint8Array(size); let offset=0; for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;} bytes=buffer.buffer;
        } else { bytes=await response.arrayBuffer(); inFlight.set(url,bytes.byteLength); }
        if (bytes.byteLength !== pack.bytes) throw new Error('Incomplete voice pack');
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
        if (!pack.file.startsWith(digest.slice(0, 24))) throw new Error('Voice pack hash mismatch');
        await cache.put(url, new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream' } }));
        inFlight.delete(url); voice.done++; voice.bytes += pack.bytes;
        return;
      } catch (error) {
        inFlight.delete(url);
        if (error?.name === 'QuotaExceededError' || attempt === 2) throw new Error(`${error?.name || 'DownloadError'}: ${url.split('/').pop()}: ${error?.message || error}`);
        await delay(750*(attempt+1));
      } finally { clearTimeout(timeout); }
    }
  }

  function installVoice() {
    if (installJob) return installJob;
    installing = true; failure = ''; snapshotAt = 0;
    installJob = (async () => {
      const response = await fetch(indexUrl, { cache:'no-store', signal:AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Voice index HTTP ${response.status}`);
      const index = await response.json();
      if (!Array.isArray(index.packs) || !index.packs.length) throw new Error('Invalid voice index');
      voice = {done:0,total:index.packs.length,bytes:0,totalBytes:index.packs.reduce((n,p)=>n+p.bytes,0)};
      const cache = await caches.open(cacheName);
      const previous = await cache.match(indexUrl).then(r=>r?.json());
      // Keep the installed release and all incoming packs. Only obsolete downloadable
      // bundles are removed; IndexedDB (Pokémon, learning, recordings) is untouched.
      const keep = new Set([...(previous?.packs || []),...index.packs].map(p=>new URL(`packs/${p.file}`,base).href));
      for (const key of await cache.keys()) if (key.url.startsWith(new URL('packs/',base).href) && !keep.has(key.url)) await cache.delete(key);
      let cursor = 0, firstError;
      // Bound memory/network pressure on iPad. Drain both jobs before a retry.
      await Promise.all(Array.from({ length:2 }, async () => {
        while (cursor < index.packs.length && !firstError) {
          try { await fetchPack(index.packs[cursor++],cache); }
          catch(error) { firstError=error; }
        }
      }));
      if (firstError) throw firstError;
      await cache.put(indexUrl,new Response(JSON.stringify(index),{headers:{'Content-Type':'application/json'}}));
      indexPromise = Promise.resolve(index);
      void report('voice-ready');
    })().catch(async error => {
      failure=String(error); snapshotAt=0;
      await report('voice-error',error);
      await announce().catch(()=>{});
      throw error;
    }).finally(()=>{installing=false;installJob=undefined;snapshotAt=0;});
    return installJob;
  }
  self.addEventListener('install', event => { event.waitUntil(installVoice()); });

  self.addEventListener('activate', event => {
    // Remove only incomplete per-file voice caches from the migration.
    event.waitUntil(caches.keys().then(names => Promise.all(names
      .filter(name => name.startsWith(`pokepal-voice-v1-${self.registration.scope}-`))
      .map(name => caches.delete(name)))));
  });

  self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const file = url.pathname.slice(base.pathname.length);
    if (event.request.method !== 'GET' || url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || !/^[a-f0-9]{16}\.mp3$/.test(file)) return;
    event.respondWith((async () => {
      const cache = await caches.open(cacheName);
      indexPromise ||= cache.match(indexUrl).then(response => response?.json()).catch(() => { indexPromise = undefined; });
      const entry = (await indexPromise)?.files[file];
      if (!entry) return fetch(event.request);
      const [pack, offset, size] = entry;
      const response = await cache.match(new URL(`packs/${pack}`, base).href);
      if (!response) return fetch(event.request);
      const bytes = (await response.arrayBuffer()).slice(offset, offset + size);
      return new Response(bytes, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(size) } });
    })());
  });
})();
