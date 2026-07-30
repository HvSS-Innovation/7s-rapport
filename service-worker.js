const CACHE = 'hv-20260730_170245';
// Separat cache för offline-tiles. FÅR INTE rensas av activate-cleanup
// nedan — användaren har själv laddat ner data hit och förväntar sig att
// den överlever en deploy. Versionera bara om format ändras.
const OFFLINE_TILES_CACHE = 'hv-offline-tiles-v1';
// PMTiles pre-download cache (Fas 2). Helt fil cachad — Range-requests
// serveras från denna utan extra fetch. Bevaras vid SW activate-cleanup.
const PMTILES_CACHE = 'hv-pmtiles-v1';
const FILES = [
  './',
  './manifest.json',
  './ah.html',
  './app6-data.js',
  './app6.html',
  './countries.js',
  './countries-geo.js',
  './data.html',
  './eobusare.html',
  './fg-data.js',
  './fg.html',
  './flashcards-engine.js',
  './footer.js',
  './forkort-data.js',
  './forkort.html',
  './fors.html',
  './hjalm24.html',
  './index.html',
  './landskap-geo.js',
  './landskap.js',
  './lib/geo-export.js',
  './lib/geo-import.js',
  './lib/layers.js',
  './lib/nav.css',
  './lib/nav.js',
  './linje.html',
  './matt.html',
  './minkarta-export.js',
  './minkarta-game.js',
  './minkarta-symbols.js',
  './minkarta-tutorial.css',
  './minkarta-tutorial.js',
  './minkarta.html',
  './obo.html',
  './obslosa.html',
  './offline-tiles-kamuflage.js',
  './offline-tiles.js',
  './opsec.html',
  './opsec.js',
  './ovningspass.html',
  './ovningspass.js',
  './patl.html',
  './pedars.html',
  './pmtiles-layer.js',
  './postschema.html',
  './pwa.js',
  './ra763-data.js',
  './ra763.html',
  './ramsor-data.js',
  './ramsor.html',
  './rassoika.html',
  './roadmap-data.js',
  './roadmap.html',
  './saekr.html',
  './scrim.html',
  './sensorskiss-export.js',
  './sensorskiss-symbols.js',
  './sensorskiss-tutorial.css',
  './sensorskiss-tutorial.js',
  './sensorskiss.html',
  './sigskydd-data.js',
  './sigskydd.html',
  './skyttebok-data.js',
  './skyttebok-extras.js',
  './skyttebok-info.html',
  './skyttebok-sig.js',
  './skyttebok.html',
  './skyttebok.js',
  './start.html',
  './symbol.html',
  './tccc-data.js',
  './tccc.html',
  './topo-overlay.js',
  './un.html',
  './upk-data.js',
  './upk.html',
  './vader.html',
  './version.js',
  './weft.html',
  './what.html',
  './favicon.ico',
  './icon.svg',
  './ortnamn.json',
  './fonts/inter-400.woff2',
  './fonts/inter-500.woff2',
  './fonts/inter-600.woff2',
  './fonts/inter-700.woff2',
  './fonts/inter.css',
  './vendor/exifr/full.umd.js',
  './vendor/jsqr/jsQR.js',
  './vendor/leaflet/images/layers-2x.png',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet.js',
  './vendor/pdfjs/pdf.min.js',
  './vendor/pdfjs/pdf.worker.min.js',
  './vendor/pmtiles/pmtiles.esm.js',
  './vendor/protomaps/protomaps-leaflet.esm.js',
  './vendor/qrcode-generator/qrcode.js',
  './shared/hardened-guard.js',
  './shared/landskap-offline.js',
  './shared/map-hardat-modal.js',
  './shared/theme-toggle.css',
  './shared/theme-toggle.js',
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
  // clients.claim() ligger INNE i waitUntil: annars kan workern hinna
  // termineras innan alla klienter är övertagna, och en okontrollerad sida
  // laddar resurser förbi härdat-spärren (tile-bilder syns inte för
  // sid-guarden — bara för SW:n).
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !KEEP.has(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
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

// ─────────────────────────────────────────────────────────────────────────
//  Härdat läge i SW-scope (Fas 2, roadmap-opsec-hardat-lage)
//
//  Invariant: härdat === true → SW:n gör ALDRIG fetch(). Cacheträff serveras,
//  cachemiss får 503 HARDENED_CACHE_MISS. Det gäller även same-origin-
//  revalidering av HTML/JS (beslut A 2026-07-30: en nätobservatör ska inte
//  se periodiska anrop från enheten; konsekvensen är att appen inte
//  auto-uppdaterar förrän härdat stängs av).
//
//  SW:n kan inte läsa localStorage. Kontraktet med shared/hardened-guard.js:
//  sidan speglar active-flaggan till IndexedDB db 'hv-hardened' / store 'kv'
//  / key 'state' och postMessage:ar HARDENED_SET vid toggle. Minnescachen
//  nollas när SW:n dödas mellan events → första fetch efter boot läser IDB.
// ─────────────────────────────────────────────────────────────────────────
let _hardenedMem = null; // null = okänt (läs IDB), annars boolean

// OKANT skiljs medvetet från false. "Inget läge lagrat" (användaren har aldrig
// slagit på härdat) är ett SVAR och betyder öppet. "Kunde inte läsa" är INTE
// ett svar — och ett okänt säkerhetstillstånd måste behandlas som härdat, annars
// blir ett lagringsfel en tyst läcka i stället för ett synligt funktionsfel.
const HARDENED_OKANT = 'okant';

function hardenedReadIDB() {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open('hv-hardened', 1);
      req.onupgradeneeded = () => { try { req.result.createObjectStore('kv'); } catch (_) {} };
      req.onerror = () => resolve(HARDENED_OKANT);
      req.onblocked = () => resolve(HARDENED_OKANT);
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction('kv', 'readonly');
          const get = tx.objectStore('kv').get('state');
          get.onsuccess = () => {
            // Tom store = aldrig aktiverat = öppet. Post finns = läs flaggan.
            const v = (get.result === undefined) ? false : !!get.result.active;
            db.close();
            resolve(v);
          };
          get.onerror = () => { db.close(); resolve(HARDENED_OKANT); };
          tx.onabort = () => { try { db.close(); } catch (_) {} resolve(HARDENED_OKANT); };
        } catch (_) { resolve(HARDENED_OKANT); }
      };
    } catch (_) { resolve(HARDENED_OKANT); }
  });
}

async function swHardened() {
  if (_hardenedMem !== null) return _hardenedMem;
  const lage = await hardenedReadIDB();
  if (lage === HARDENED_OKANT) {
    // Fail-closed, men cacha INTE — nästa request försöker läsa igen så ett
    // övergående IDB-fel inte låser workern i härdat tills den dödas.
    console.warn('[SW] Kunde inte läsa härdat-läget — behandlar som HÄRDAT (fail-closed).');
    return true;
  }
  _hardenedMem = lage;
  return _hardenedMem;
}

// 503 utan detaljer — svaret ska inte läcka vad som saknas eller varför.
function hardenedMiss() {
  return new Response('HARDENED_CACHE_MISS', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Nedladdningsjobb får bara röra kända mål: egna origin, R2-bucketen och
// tile-hosts. Allt annat (t.ex. en injicerad postMessage med främmande URL)
// avvisas — SW:n ska inte kunna användas som generell exfil-/hämtmotor.
const R2_HOST = 'pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev';
function jobUrlAllowed(u) {
  try {
    const url = new URL(u, self.location.href);
    if (url.origin === self.location.origin) return true;
    if (url.protocol !== 'https:') return false;
    if (url.host === R2_HOST) return true;
    if (isTileHost(url.host)) return true;
    return false;
  } catch (_) { return false; }
}

self.addEventListener('message', (e) => {
  const data = e.data || {};
  if (data.type !== 'HARDENED_SET') return;
  // Bara samma origin får styra spärren. Tomt origin släpps igenom
  // (äldre browser-beteende för SW-messages) — cross-origin-sidor kan ändå
  // aldrig nå vår registration, kollen är defense-in-depth.
  if (e.origin && e.origin !== self.location.origin) return;
  _hardenedMem = !!data.active;
  // Kvittera så sidan kan vänta in att spärren faktiskt är verkställd innan
  // UI:t säger "Härdat: PÅ". Utan ack fanns ett fönster där användaren fick
  // grönt läge medan workern ännu inte kände till det.
  try {
    if (e.source && e.source.postMessage) {
      // Spegla tillbaka avsändarens id så sidan kan skilja SIN kvittens från
      // en annan fliks — utan det kunde en aktivering ta emot ACK:en för en
      // samtidig avaktivering och tro att den lyckats.
      e.source.postMessage({ type: 'HARDENED_ACK', active: _hardenedMem, id: data.id });
    }
  } catch (_) {}
  if (_hardenedMem) {
    // Fail-closed aktivering (Fas 1.3): pågående nedladdningsjobb avbryts
    // direkt — inga kvardröjande fetch-loopar efter att härdat slagits på.
    Object.values(_otJobs).forEach(j => { try { j.controller.abort(); } catch (_) {} });
    Object.values(_pmJobs).forEach(j => { try { j.controller.abort(); } catch (_) {} });
  }
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // PMTiles-fil: kolla pre-download-cachen först. Cache hit → svara med
  // Range-stöd lokalt (inga utgående requests). Cache miss → i härdat läge
  // 503 (aldrig nät); annars vanlig fetch (klienten gör range-requests mot
  // original-host som måste stödja CORS + Range; SW cachar ej automatiskt).
  if (e.request.method === 'GET' && url.pathname.endsWith('.pmtiles')) {
    e.respondWith((async () => {
      const local = await servePmtilesRange(e.request);
      if (local) return local;
      if (await swHardened()) return hardenedMiss();
      return fetch(e.request);
    })());
    return;
  }

  // Tile-requests: kolla offline-cachen FÖRST (oberoende av subdomän-rotation
  // och query-strängar). Hit landar nedladdade tiles från offline-tiles.js.
  // I härdat läge: huvudcachen som sista lokala utväg, sedan 503 — aldrig nät.
  // Annars: nät, med huvudcachen som fallback om nätet är nere.
  if (e.request.method === 'GET' && isTileHost(url.host)) {
    e.respondWith((async () => {
      const offline = await caches.open(OFFLINE_TILES_CACHE);
      const hit = await offline.match(e.request);
      if (hit) return hit;
      if (await swHardened()) {
        return (await caches.match(e.request)) || hardenedMiss();
      }
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

  // Network-first för HTML och JS (alltid senaste version online, cache som
  // fallback). I härdat läge inverteras det: cache-first utan nätfallback —
  // ingen revalidering, ingen appskal-reparation (Fas 2.4).
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('.js')) {
    e.respondWith((async () => {
      if (await swHardened()) {
        return (await caches.match(e.request)) || hardenedMiss();
      }
      try {
        const resp = await fetch(e.request);
        safePut(e.request, resp);
        return resp;
      } catch (err) {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        throw err;
      }
    })());
  } else {
    // Cache-first för allt annat (ikoner, JSON-data, etc.). I härdat läge:
    // cachemiss → 503. Täcker även POST m.m. (matchar aldrig cache → 503).
    e.respondWith((async () => {
      const cached = await caches.match(e.request);
      if (cached) return cached;
      if (await swHardened()) return hardenedMiss();
      const resp = await fetch(e.request);
      safePut(e.request, resp);
      return resp;
    })());
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  Bakgrundsnedladdning av tiles (Fas 1, audit/roadmap-bakgrundsnedladdning.md)
//
//  Sidor delegerar tile-jobb till SW via postMessage. Fördel: jobbet lever
//  vidare när användaren navigerar mellan minkarta/sensorskiss/index/etc.
//  Cache-namespacet (`hv-offline-tiles-v1`) är oförändrat — vi flyttar bara
//  fetch-loopen från page-scope till SW-scope.
// ─────────────────────────────────────────────────────────────────────────
const _otJobs = Object.create(null);

function otSnapshot(j) {
  return {
    id: j.id, areaId: j.areaId, label: j.label, mode: j.mode, kind: j.kind,
    bbox: j.bbox, minZoom: j.minZoom, maxZoom: j.maxZoom,
    total: j.total, done: j.done, bytes: j.bytes, failed: j.failed,
    status: j.status, savedAt: j.savedAt,
    paused: j.paused, pauseReason: j.pauseReason,
    error: j.error ? String((j.error && j.error.message) || j.error) : null
  };
}

function otBroadcast(message) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients => {
      clients.forEach(c => { try { c.postMessage(message); } catch (_) {} });
    });
}

function otEmit(job) {
  return otBroadcast({ type: 'OT_PROGRESS', jobId: job.id, job: otSnapshot(job) });
}

async function otFetchTile(cache, item, signal) {
  const resp = await fetch(item.url, {
    mode: 'cors',
    credentials: 'omit',
    referrerPolicy: 'strict-origin',
    signal: signal
  });
  if (!resp || !resp.ok) throw new Error('HTTP ' + (resp ? resp.status : '?'));
  const clone = resp.clone();
  const blob = await resp.blob();
  await cache.put(item.url, clone);
  return blob.size;
}

async function otRunTileJob(spec) {
  // spec: {jobId, items:[{url}], totalTiles, alreadyDone, parallel, throttleMs,
  //        bbox, minZoom, maxZoom, areaId, kind, mode, label, savedAt}
  const items = spec.items || [];
  const parallel = (typeof spec.parallel === 'number' && spec.parallel > 0) ? spec.parallel : 2;
  const throttleMs = (typeof spec.throttleMs === 'number' && spec.throttleMs >= 0) ? spec.throttleMs : 100;
  const alreadyDone = (typeof spec.alreadyDone === 'number' && spec.alreadyDone >= 0) ? spec.alreadyDone : 0;
  const totalTiles = (typeof spec.totalTiles === 'number' && spec.totalTiles > 0) ? spec.totalTiles : items.length;

  const job = {
    id: spec.jobId,
    areaId: spec.areaId || null,
    label: spec.label || '',
    mode: spec.mode || 'new',
    kind: spec.kind || 'area',
    bbox: spec.bbox,
    minZoom: spec.minZoom,
    maxZoom: spec.maxZoom,
    total: totalTiles,
    done: alreadyDone,
    bytes: 0,
    failed: 0,
    status: 'running',
    savedAt: spec.savedAt || new Date().toISOString(),
    paused: false,
    pauseReason: null,
    controller: new AbortController(),
    error: null
  };
  _otJobs[job.id] = job;
  otEmit(job);

  const cache = await caches.open(OFFLINE_TILES_CACHE);
  let idx = 0;
  let runDone = 0;
  let lastEmit = 0;

  function flush(force) {
    job.done = alreadyDone + runDone;
    const now = Date.now();
    if (force || now - lastEmit > 250) {
      lastEmit = now;
      otEmit(job);
    }
  }

  async function waitWhilePaused() {
    while (job.paused && !job.controller.signal.aborted) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  async function worker() {
    while (idx < items.length) {
      if (job.controller.signal.aborted) return;
      await waitWhilePaused();
      if (job.controller.signal.aborted) return;
      const i = idx++;
      try {
        const sz = await otFetchTile(cache, items[i], job.controller.signal);
        job.bytes += sz;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        if (err && err.name === 'QuotaExceededError') throw err;
        job.failed += 1;
      }
      runDone += 1;
      flush(false);
      if (throttleMs > 0 && idx < items.length) {
        await new Promise(r => setTimeout(r, throttleMs));
      }
    }
  }

  try {
    const workers = [];
    for (let w = 0; w < parallel; w++) workers.push(worker());
    await Promise.all(workers);
    job.status = job.controller.signal.aborted ? 'aborted' : 'done';
  } catch (err) {
    job.error = err;
    job.status = (err && err.name === 'QuotaExceededError') ? 'quota' : 'error';
  }
  job.done = alreadyDone + runDone;
  flush(true);
  // Lämna kvar i _otJobs en kort stund så sidor som hydrerar precis efter
  // klart-event ändå ser slutläget och kan visa "Klar"-pille.
  setTimeout(() => {
    delete _otJobs[job.id];
    otBroadcast({ type: 'OT_PROGRESS', jobId: job.id, job: null });
  }, 8000);
}

self.addEventListener('message', (e) => {
  const data = e.data || {};
  if (data.type === 'OT_START_JOB') {
    const spec = data.spec || {};
    if (!spec.jobId || !Array.isArray(spec.items)) return;
    // Fas 2.3: bara samma origin får starta jobb, och bara mot kända hosts.
    if (e.origin && e.origin !== self.location.origin) return;
    if (!spec.items.every(it => it && jobUrlAllowed(it.url))) {
      console.warn('[SW] OT_START_JOB avvisad: otillåten tile-URL i spec');
      return;
    }
    if (_otJobs[spec.jobId]) {
      // Dedup: en annan flik startade redan samma job-id.
      otEmit(_otJobs[spec.jobId]);
      return;
    }
    e.waitUntil((async () => {
      if (await swHardened()) {
        // Inga nedladdningsjobb i härdat läge — säg det till UI:t i samma
        // format som ett jobbfel så sidan inte väntar i evighet.
        await otBroadcast({ type: 'OT_PROGRESS', jobId: spec.jobId, job: {
          id: spec.jobId, status: 'error', error: 'Blockerad i härdat läge',
          total: 0, done: 0, bytes: 0, failed: 0
        } });
        return;
      }
      return otRunTileJob(spec);
    })().catch(err => {
      console.error('[SW] otRunTileJob fel', err);
    }));
  } else if (data.type === 'OT_CANCEL') {
    const j = _otJobs[data.jobId];
    if (j && j.controller) j.controller.abort();
  } else if (data.type === 'OT_PAUSE') {
    const j = _otJobs[data.jobId];
    if (j) {
      j.paused = !!data.paused;
      j.pauseReason = data.reason || null;
      otEmit(j);
    }
  } else if (data.type === 'OT_LIST_JOBS') {
    const list = Object.values(_otJobs).map(otSnapshot);
    const target = e.source;
    if (target) {
      try { target.postMessage({ type: 'OT_JOBS_LIST', jobs: list }); } catch (_) {}
    } else {
      otBroadcast({ type: 'OT_JOBS_LIST', jobs: list });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────
//  PMTiles-prefetch i bakgrunden (Fas 3, audit/roadmap-bakgrundsnedladdning.md)
//
//  Större filer (Sverige.pmtiles ~ 4 GB) får nu överleva sid-navigering.
//  Dedup nyckel = URL — om en flik redan startat prefetch för en URL
//  attaches efterföljande sidor till den existerande job-strömmen istället
//  för att starta en parallell (vilket annars skulle dubbelladda 4 GB).
//
//  Skillnad mot in-page-versionen i pmtiles-layer.js:
//    - SHA-256-verifiering hoppas över helt här. Web Crypto subtle.digest
//      kräver hela filen i ArrayBuffer i RAM, vilket sprängde mobil-RAM
//      vid 2+ GB. In-page-koden hade samma threshold (256 MB). Lita på
//      TLS + R2 ETag för integritet.
// ─────────────────────────────────────────────────────────────────────────
const _pmJobs = Object.create(null);

function pmSnapshot(j) {
  return {
    url: j.url, expectedBytes: j.expectedBytes,
    loaded: j.loaded, total: j.total, percent: j.percent,
    status: j.status,
    error: j.error ? String((j.error && j.error.message) || j.error) : null
  };
}

function pmBroadcast(message) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients => {
      clients.forEach(c => { try { c.postMessage(message); } catch (_) {} });
    });
}

function pmEmit(job) {
  return pmBroadcast({ type: 'PM_PROGRESS', url: job.url, job: pmSnapshot(job) });
}

async function runPmtilesJob(spec) {
  const url = spec.url;
  if (!url) return;
  if (_pmJobs[url]) {
    // Dedup: jobbet löper redan från en tidigare flik. Emit nuläget så
    // den nya flikens UI hänger på, sen returnera utan att starta om.
    pmEmit(_pmJobs[url]);
    return;
  }
  const job = {
    url: url,
    expectedBytes: spec.expectedBytes || 0,
    loaded: 0,
    total: 0,
    percent: 0,
    status: 'running',
    error: null,
    controller: new AbortController()
  };
  _pmJobs[url] = job;
  pmEmit(job);

  let lastEmit = 0;
  function flush(force) {
    const now = Date.now();
    if (force || now - lastEmit > 250) {
      lastEmit = now;
      pmEmit(job);
    }
  }

  try {
    const resp = await fetch(url, { signal: job.controller.signal, mode: 'cors' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const total = parseInt(resp.headers.get('content-length') || '0', 10);
    job.total = total;

    // Strömma nät → cache via TransformStream. Tidigare versionen samlade
    // varje chunk i en blobChunks-array och byggde slut-Blob:en innan
    // cache.put — på Sverige.pmtiles (~4 GB) sprängde det mobil-RAM.
    // Cache API konsumerar Response-body:n lat: data flödar direkt från
    // fetch-streamen genom transformen (där vi observerar chunk-storleken
    // för progress) ner till disk. Abort/nätverksfel propageras via
    // stream-error och cache.put rejectar — ingen partiell cache-post.
    const progressStream = new TransformStream({
      transform(chunk, controller) {
        job.loaded += chunk.length;
        job.percent = total ? Math.round(job.loaded / total * 100) : 0;
        flush(false);
        controller.enqueue(chunk);
      }
    });

    const cache = await caches.open(PMTILES_CACHE);
    const cacheResp = new Response(resp.body.pipeThrough(progressStream), {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': resp.headers.get('content-type') || 'application/octet-stream',
        'Content-Length': String(total),
        'Accept-Ranges': 'bytes'
      }
    });
    await cache.put(url, cacheResp);

    job.status = 'done';
    job.percent = 100;
  } catch (err) {
    job.error = err;
    job.status = (err && err.name === 'AbortError') ? 'aborted' : 'error';
  }
  flush(true);
  setTimeout(() => {
    delete _pmJobs[url];
    pmBroadcast({ type: 'PM_PROGRESS', url: url, job: null });
  }, 8000);
}

self.addEventListener('message', (e) => {
  const data = e.data || {};
  if (data.type === 'PM_START_JOB') {
    const spec = data.spec || {};
    if (!spec.url) return;
    // Fas 2.3: bara samma origin, bara kända hosts (egna origin/R2/tiles).
    if (e.origin && e.origin !== self.location.origin) return;
    if (!jobUrlAllowed(spec.url)) {
      console.warn('[SW] PM_START_JOB avvisad: otillåten URL');
      return;
    }
    e.waitUntil((async () => {
      if (await swHardened()) {
        await pmBroadcast({ type: 'PM_PROGRESS', url: spec.url, job: {
          url: spec.url, status: 'error', error: 'Blockerad i härdat läge',
          loaded: 0, total: 0, percent: 0
        } });
        return;
      }
      return runPmtilesJob(spec);
    })().catch(err => {
      console.error('[SW] runPmtilesJob fel', err);
    }));
  } else if (data.type === 'PM_CANCEL') {
    const j = _pmJobs[data.url];
    if (j && j.controller) j.controller.abort();
  } else if (data.type === 'PM_LIST_JOBS') {
    const list = Object.values(_pmJobs).map(pmSnapshot);
    const target = e.source;
    if (target) {
      try { target.postMessage({ type: 'PM_JOBS_LIST', jobs: list }); } catch (_) {}
    } else {
      pmBroadcast({ type: 'PM_JOBS_LIST', jobs: list });
    }
  }
});
