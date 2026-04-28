const CACHE = 'hv-20260428_193454';
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
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
  './version.js',
  './pwa.js',
  './ortnamn.json',
  './fonts/inter.css',
  './fonts/inter-400.woff2',
  './fonts/inter-500.woff2',
  './fonts/inter-600.woff2',
  './fonts/inter-700.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Network-first för HTML och JS (alltid senaste version online, cache som fallback)
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('.js')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first för allt annat (ikoner, JSON-data, etc.)
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }))
    );
  }
});
