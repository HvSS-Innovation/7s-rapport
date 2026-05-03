const CACHE = 'hv-20260503_082019';
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './favicon.ico',
  './obslosa.html',
  './fors.html',
  './pedars.html',
  './postschema.html',
  './eobusare.html',
  './obo.html',
  './rassoika.html',
  './vader.html',
  './what.html',
  './scrim.html',
  './weft.html',
  './ah.html',
  './minkarta.html',
  './minkarta-symbols.js',
  './minkarta-export.js',
  './minkarta-tutorial.js',
  './minkarta-tutorial.css',
  './sensorskiss.html',
  './sensorskiss-symbols.js',
  './sensorskiss-export.js',
  './sensorskiss-tutorial.js',
  './sensorskiss-tutorial.css',
  './version.js',
  './pwa.js',
  './opsec.js',
  './opsec.html',
  './ortnamn.json',
  './fonts/inter.css',
  './fonts/inter-400.woff2',
  './fonts/inter-500.woff2',
  './fonts/inter-600.woff2',
  './fonts/inter-700.woff2'
];

self.addEventListener('install', e => {
  // Tidigare addAll(FILES) — om EN fil saknas (404) avbryts hela installationen
  // tyst. Här cachas filerna individuellt så installationen lyckas och saknade
  // filer rapporteras i console för felsökning.
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const results = await Promise.allSettled(FILES.map(url => cache.add(url)));
    const failed = results
      .map((r, i) => ({ r, url: FILES[i] }))
      .filter(x => x.r.status === 'rejected');
    if (failed.length) {
      console.warn('[SW] ' + failed.length + ' fil(er) kunde inte cachas:',
        failed.map(x => x.url + ' (' + (x.r.reason && x.r.reason.message) + ')'));
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// Cache:a ENDAST framgångsrika svar. Tidigare cachades 403/500/etc som
// permanenta tile-bilder — t.ex. OSMs "Access blocked"-felmeddelande som
// tile-image fastnade i evighet om en request gjordes utan korrekt Referer.
// resp.ok täcker 200-299. Opaque cross-origin svar har resp.ok=false så de
// hamnar i browser:ns standard HTTP-cache istället, vilket är önskvärt.
function safePut(request, resp) {
  if (resp && resp.ok) {
    const clone = resp.clone();
    caches.open(CACHE).then(c => c.put(request, clone));
  }
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Network-first för HTML och JS (alltid senaste version online, cache som fallback)
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('.js')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        safePut(e.request, resp);
        return resp;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first för allt annat (ikoner, JSON-data, kart-tiles, etc.)
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
        safePut(e.request, resp);
        return resp;
      }))
    );
  }
});
