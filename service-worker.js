const CACHE = 'hv-20260504_191741';
// Separat cache för offline-tiles. FÅR INTE rensas av activate-cleanup
// nedan — användaren har själv laddat ner data hit och förväntar sig att
// den överlever en deploy. Versionera bara om format ändras.
const OFFLINE_TILES_CACHE = 'hv-offline-tiles-v1';
// PMTiles pre-download cache (Fas 2). Helt fil cachad — Range-requests
// serveras från denna utan extra fetch. Bevaras vid SW activate-cleanup.
const PMTILES_CACHE = 'hv-pmtiles-v1';
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
  './skyttebok.html',
  './skyttebok.js',
  './skyttebok-data.js',
  './version.js',
  './pwa.js',
  './opsec.js',
  './offline-tiles.js',
  './pmtiles-layer.js',
  './vendor/pmtiles/pmtiles.esm.js',
  './vendor/protomaps/protomaps-leaflet.esm.js',
  './footer.js',
  './opsec.html',
  './ortnamn.json',
  './fonts/inter.css',
  './fonts/inter-400.woff2',
  './fonts/inter-500.woff2',
  './fonts/inter-600.woff2',
  './fonts/inter-700.woff2',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/layers-2x.png',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/exifr/full.umd.js'
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
  // Bevara både huvudcachen (versionsstämpel), offline-tiles-cachen och
  // pmtiles-cachen. Allt annat (gamla CACHE-stämplar) raderas.
  const KEEP = new Set([CACHE, OFFLINE_TILES_CACHE, PMTILES_CACHE]);
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => !KEEP.has(k)).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// Tile-host-detektion: matchar HybridTileLayer i minkarta.html /
// sensorskiss.html (OpenTopoMap a/b/c-subdomäner + tile.openstreetmap.org).
function isTileHost(host) {
  return /(^|\.)tile\.opentopomap\.org$/.test(host)
      || host === 'tile.openstreetmap.org';
}

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

// Range-stöd för pmtiles cachade i PMTILES_CACHE. Klienten gör
// HTTP Range-requests när protomaps-leaflet plockar individuella tiles ur
// filen. Cache API matchar utan Range-header by default — vi extraherar
// byte-rangen via Blob.slice() (disk-backed, lazy) istället för att läsa
// hela filen i RAM. Tidigare arrayBuffer()-versionen sprängde mobil-RAM
// vid 2+ GB-filer.
async function servePmtilesRange(request) {
  const cache = await caches.open(PMTILES_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  if (!cached) return null;

  const range = request.headers.get('range');
  if (!range) return cached.clone();

  const m = range.match(/^bytes=(\d+)-(\d*)$/);
  if (!m) return cached.clone();

  const blob = await cached.clone().blob();
  const start = parseInt(m[1], 10);
  const end = m[2] ? parseInt(m[2], 10) : blob.size - 1;
  if (start >= blob.size || end < start) {
    return new Response(null, { status: 416, statusText: 'Range Not Satisfiable' });
  }
  // blob.slice() ar O(1) och kopierar inte data — bara en view in i samma
  // underliggande lagring. Browser läser bara dessa bytes från disk när
  // Response-konsumenten begär dem.
  const slice = blob.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cached.headers.get('content-type') || 'application/octet-stream',
      'Content-Length': String(slice.size),
      'Content-Range': 'bytes ' + start + '-' + end + '/' + blob.size,
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // PMTiles-fil: kolla pre-download-cachen först. Cache hit → svara med
  // Range-stöd lokalt (inga utgående requests). Cache miss → låt vanlig
  // fetch gå igenom (klienten gör range-requests mot original-host som
  // måste stödja CORS + Range; SW cachar ej automatiskt).
  if (e.request.method === 'GET' && url.pathname.endsWith('.pmtiles')) {
    e.respondWith((async () => {
      const local = await servePmtilesRange(e.request);
      if (local) return local;
      return fetch(e.request);
    })());
    return;
  }

  // Tile-requests: kolla offline-cachen FÖRST (oberoende av subdomän-rotation
  // och query-strängar). Hit landar nedladdade tiles från offline-tiles.js.
  // Faller tillbaka till nät, sedan vidare till huvudcachen om nätet är nere.
  if (e.request.method === 'GET' && isTileHost(url.host)) {
    e.respondWith((async () => {
      const offline = await caches.open(OFFLINE_TILES_CACHE);
      const hit = await offline.match(e.request);
      if (hit) return hit;
      try {
        const resp = await fetch(e.request);
        if (resp && resp.ok) safePut(e.request, resp);
        return resp;
      } catch (_) {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        throw _;
      }
    })());
    return;
  }

  // Network-first för HTML och JS (alltid senaste version online, cache som fallback)
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('.js')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        safePut(e.request, resp);
        return resp;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first för allt annat (ikoner, JSON-data, etc.)
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
        safePut(e.request, resp);
        return resp;
      }))
    );
  }
});
