const CACHE = 'hv-20260506_062636';
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
  './skyttebok-sig.js',
  './skyttebok-extras.js',
  './skyttebok-info.html',
  './vendor/qrcode-generator/qrcode.js',
  './vendor/jsqr/jsQR.js',
  './version.js',
  './pwa.js',
  './opsec.js',
  './offline-tiles.js',
  './countries.js',
  './pmtiles-layer.js',
  './topo-overlay.js',
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
    if (_otJobs[spec.jobId]) {
      // Dedup: en annan flik startade redan samma job-id.
      otEmit(_otJobs[spec.jobId]);
      return;
    }
    e.waitUntil(otRunTileJob(spec).catch(err => {
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

    const reader = resp.body.getReader();
    const blobChunks = [];
    while (true) {
      if (job.controller.signal.aborted) {
        throw Object.assign(new Error('Avbruten'), { name: 'AbortError' });
      }
      const { done, value } = await reader.read();
      if (done) break;
      blobChunks.push(new Blob([value]));
      job.loaded += value.length;
      job.percent = total ? Math.round(job.loaded / total * 100) : 0;
      flush(false);
    }

    const fullBlob = new Blob(blobChunks, { type: 'application/octet-stream' });
    blobChunks.length = 0;

    const cache = await caches.open(PMTILES_CACHE);
    const cacheResp = new Response(fullBlob, {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(job.loaded),
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
    e.waitUntil(runPmtilesJob(spec).catch(err => {
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
