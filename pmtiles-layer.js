// ─────────────────────────────────────────────────────────────────────────────
//  PMTILES — "Härdat läge"-adapter (Fas 1 av audit/roadmap-pmtiles.md)
//
//  Self-hosted pmtiles@4 + protomaps-leaflet@5 från vendor/. När toggle:n är
//  PÅ används en .pmtiles-URL istället för OTM/OSM. Inga utgående tile-
//  requests till tile.opentopomap.org / tile.openstreetmap.org under
//  "Härdat läge".
//
//  Fas 1 begränsningar:
//   - Användaren anger pmtiles-URL via prompt vid första aktivering. Sparas
//     i localStorage för efterföljande sessioner.
//   - Ingen pre-download — bara on-demand range-requests. Det innebär att
//     första request fortfarande syns hos hosting-servern, men inte hos
//     OTM/OSM. För full OPSEC krävs Fas 2 (pre-download + SHA-256
//     verifiering mot vår egen hostade fil).
//   - SHA-256-verifiering är förberedd som stub men inte aktiverad
//     (kräver känd fil + känd hash).
// ─────────────────────────────────────────────────────────────────────────────

import { PMTiles, leafletRasterLayer } from './vendor/pmtiles/pmtiles.esm.js';
import {
    leafletLayer,
    PolygonSymbolizer,
    LineSymbolizer,
    Static
} from './vendor/protomaps/protomaps-leaflet.esm.js';

// Custom 'topo'-flavor som efterliknar OpenTopoMap-känslan: byggnader
// svarta, kvarter ljusgrå, natur grön, vatten blå. Default Protomaps-
// flavors (light/dark/etc.) visar buggrå byggnader och vit landuse,
// vilket inte stack:ar mot terrängen i fält.
function topoPaintRules() {
    return [
        // Bakgrund: ljus grå för land som inte har specifik täckning
        {
            dataLayer: 'earth',
            symbolizer: new PolygonSymbolizer({ fill: '#f0ede5' })
        },
        // Naturmark: skog / parker — ljus grön
        {
            dataLayer: 'natural',
            symbolizer: new PolygonSymbolizer({ fill: '#c8dfb8' })
        },
        {
            dataLayer: 'land',
            symbolizer: new PolygonSymbolizer({ fill: '#c8dfb8' })
        },
        // Bebyggelse-landuse: kvarter, industri etc. — ljusgrå
        {
            dataLayer: 'landuse',
            symbolizer: new PolygonSymbolizer({ fill: '#d8d4cc' })
        },
        // Vatten — ljusblå. OBS: 'water'-lagret innehåller BÅDE polygoner
        // (sjöar/hav) och LineStrings (åar/bäckar). En PolygonSymbolizer
        // utan filter canvas-fyller även de öppna linjerna → långsmala blå
        // "kilar" över land (upptäckt i Estland 2026-07-28, fanns latent
        // även i Sverige). geomType: 1=punkt, 2=linje, 3=polygon.
        {
            dataLayer: 'water',
            symbolizer: new PolygonSymbolizer({ fill: '#a4cce0' }),
            filter: (z, f) => f.geomType === 3
        },
        // Vattendrag som linjer — samma blå, tunt streck (OTM-likt)
        {
            dataLayer: 'water',
            symbolizer: new LineSymbolizer({ color: '#a4cce0', width: 1.1 }),
            filter: (z, f) => f.geomType === 2
        },
        // Vägar — mörkgrå linjer
        {
            dataLayer: 'roads',
            symbolizer: new LineSymbolizer({ color: '#666', width: 1.2 })
        },
        // Byggnader — svarta polygoner (önskat beteende)
        {
            dataLayer: 'buildings',
            symbolizer: new PolygonSymbolizer({ fill: '#000' })
        }
    ];
}

const STORAGE_KEY = 'pmtiles.hardening';
const DEFAULT_FLAVOR = 'light'; // protomaps-leaflet: light/dark/white/grayscale/black
const PMTILES_CACHE = 'hv-pmtiles-v1'; // separat Cache API-namespace, bevaras av SW activate-cleanup

// Sverige-paketet — Protomaps Basemap-schema (matchar protomaps-leaflet
// flavor:light renderer). Extraherat 2026-05-04 från Protomaps daily build
// 20260503 via `pmtiles extract --bbox=10.5,55.0,24.5,69.5 --maxzoom=15`.
// Hostat på Cloudflare R2 med CORS för 7srapport.com.
//
// Tidigare attempts:
//   2026-05-04 (567 MB, maxzoom=13): Planetiler default OpenMapTiles
//     schema. Inga detaljer över z 13.
//   2026-05-04 (2.1 GB, maxzoom=15): Planetiler default OpenMapTiles
//     schema. Schema-mismatch mot protomaps-leaflet → bara landuse/water
//     renderades, inga gator/byggnader synliga.
//   2026-05-04 (4.1 GB, Protomaps Basemap): denna. Korrekt schema, gator
//     + byggnader renderas via flavor:light.
const SVERIGE_PMTILES_URL = 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/sverige.pmtiles';
const SVERIGE_PMTILES_SHA256 = '296561038cbde633f7c17b49e54157649ab4fd547f868c00b3d744c5fc472d80';
const SVERIGE_PMTILES_BYTES = 4376446035;

// Sverige + tre demo-filer. Sverige är default; demos kvar för testing av
// stilar mot publika små filer.
const DEMO_URLS = [
    {
        name: 'Sverige z 0–15 (Protomaps, 4,1 GB)',
        url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/sverige.pmtiles',
        description: 'Hela Sverige, Protomaps Basemap-schema. Gator + byggnader synliga vid z 14–15.',
        center: [62.0, 16.5],
        zoom: 5
    },
    {
        name: 'Florens (vector, 6,6 MB)',
        url: 'https://raw.githubusercontent.com/protomaps/PMTiles/main/spec/v3/protomaps%28vector%29ODbL_firenze.pmtiles',
        description: 'Stadskarta över Florens, Italien — visar protomaps-stilen i praktiken',
        center: [43.77, 11.25],
        zoom: 13
    },
    {
        name: 'Världen z 0-3 (raster, 0,7 MB)',
        url: 'https://raw.githubusercontent.com/protomaps/PMTiles/main/spec/v3/stamen_toner%28raster%29CC-BY+ODbL_z3.pmtiles',
        description: 'Stamen Toner svartvit, världstäckning men bara extremt utzoomad',
        center: [0, 0],
        zoom: 2
    },
    {
        name: 'Mt Whitney (raster WebP, 1,9 MB)',
        url: 'https://raw.githubusercontent.com/protomaps/PMTiles/main/spec/v3/usgs-mt-whitney-8-15-webp-512.pmtiles',
        description: 'USGS topografi över Mt Whitney, Kalifornien',
        center: [36.58, -118.29],
        zoom: 12
    }
];
const DEFAULT_DEMO_URL = DEMO_URLS[0].url;

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
}

function saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (_) {}
    // Fas 1/2: spegla läget till IndexedDB + service workern via
    // shared/hardened-guard.js (laddas i <head> på alla sidor med kartor).
    // Utan sync ser SW:n inte toggeln och spärren blir verkningslös.
    if (window.HVHardened && window.HVHardened.sync) {
        window.HVHardened.sync();
    } else {
        console.warn('[pmtiles] shared/hardened-guard.js saknas på sidan — härdat-läget når inte service workern');
    }
}

// SHA-256-verifiering — beräknar hash av en ArrayBuffer och jämför med
// känd hash. Tom expected = skip. Returnerar { ok, hex }.
async function verifyHash(buf, expectedSha256) {
    try {
        const hash = await crypto.subtle.digest('SHA-256', buf);
        const hex = Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        const ok = !expectedSha256 || hex === expectedSha256.toLowerCase();
        if (!ok) {
            console.error('[pmtiles] SHA-256-mismatch', { expected: expectedSha256, got: hex });
        }
        return { ok, hex };
    } catch (err) {
        console.error('[pmtiles] hash-beräkning misslyckades', err);
        return { ok: false, hex: null };
    }
}

// Pre-download: hämta hela pmtiles-filen och skriv till Cache API. För
// stora filer (>SHA_THRESHOLD) hoppas SHA-256-verifieringen över för att
// undvika OOM på mobila enheter — Web Crypto API saknar streaming-digest
// så vi måste annars buffra hela filen i RAM, vilket sprängde Array
// buffer-allokeringen vid 2 GB. Fallback: lita på TLS + R2 ETag.
//
// För filer under tröskeln behålls hash-verifiering (demos är 0,7–6,6 MB).
// Returnerar Promise<{ok, bytes, hex, error}>. onProgress kallas med
// {loaded, total, percent}.
const SHA_THRESHOLD_BYTES = 256 * 1024 * 1024; // 256 MB

async function prefetchPMTiles(url, opts) {
    opts = opts || {};
    const onProgress = opts.onProgress || function () {};
    const expectedSha256 = opts.expectedSha256 || '';
    const signal = opts.signal;

    try {
        const resp = await fetch(url, { signal, mode: 'cors' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const total = parseInt(resp.headers.get('content-length') || '0', 10);

        const tooBigForHash = total > SHA_THRESHOLD_BYTES;
        const cache = await caches.open(PMTILES_CACHE);

        if (tooBigForHash) {
            // Stora filer: läs streamen i chunks och bygg upp en Blob-of-
            // blobs. Browser:n disk-backar stora Blobs automatiskt, så vi
            // håller inte 4 GB Uint8Array i JS-RAM. Tee-approach (förra
            // versionen) gav ingen progress eftersom cache.put konsumerade
            // streamen synkront utan att schemalägga progress-tee:n.
            const reader = resp.body.getReader();
            const blobChunks = [];
            let loaded = 0;
            while (true) {
                if (signal && signal.aborted) {
                    throw Object.assign(new Error('Avbruten'), { name: 'AbortError' });
                }
                const { done, value } = await reader.read();
                if (done) break;
                // new Blob([Uint8Array]) släpper referensen till typed
                // array:en så GC kan ta den. Browser flyttar Blob:s data
                // till disk när total storlek överstiger threshold (oftast
                // ~64 MB). Progress-callbacken triggas per chunk.
                blobChunks.push(new Blob([value]));
                loaded += value.length;
                onProgress({
                    loaded,
                    total,
                    percent: total ? Math.round(loaded / total * 100) : 0
                });
            }

            // Bygg final Blob — referenserar samma underliggande disk-data
            // som chunk-bloben, ingen kopiering. type='octet-stream' för
            // korrekt MIME i Cache.
            const fullBlob = new Blob(blobChunks, { type: 'application/octet-stream' });
            blobChunks.length = 0; // släpp chunk-references

            const cacheResponse = new Response(fullBlob, {
                status: 200,
                statusText: 'OK',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': String(loaded),
                    'Accept-Ranges': 'bytes'
                }
            });
            await cache.put(url, cacheResponse);

            if (expectedSha256) {
                console.warn('[pmtiles] Hoppar SHA-256 för fil > ' +
                    Math.round(SHA_THRESHOLD_BYTES / 1024 / 1024) + ' MB. ' +
                    'Litar på TLS + R2 ETag för integritet.');
            }
            return { ok: true, bytes: loaded, hex: null, hashSkipped: true };
        }

        // Små filer: buffer + hash (demos).
        const reader = resp.body.getReader();
        const chunks = [];
        let loaded = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            loaded += value.length;
            onProgress({
                loaded,
                total,
                percent: total ? Math.round(loaded / total * 100) : 0
            });
        }

        const buf = new Uint8Array(loaded);
        let pos = 0;
        for (const c of chunks) { buf.set(c, pos); pos += c.length; }

        const verification = await verifyHash(buf.buffer, expectedSha256);
        if (!verification.ok) {
            return {
                ok: false,
                bytes: loaded,
                hex: verification.hex,
                error: 'SHA-256 stämmer inte med förväntad hash. Filen avvisas.'
            };
        }

        const cacheResp = new Response(buf, {
            status: 200,
            statusText: 'OK',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Length': String(loaded),
                'Accept-Ranges': 'bytes'
            }
        });
        await cache.put(url, cacheResp);

        return { ok: true, bytes: loaded, hex: verification.hex };
    } catch (err) {
        if (err && err.name === 'AbortError') {
            return { ok: false, error: 'Avbruten' };
        }
        return { ok: false, error: (err && err.message) || 'okänt fel' };
    }
}

// SW-driven prefetch (Fas 3, audit/roadmap-bakgrundsnedladdning.md). Skickar
// PM_START_JOB till active SW och resolverar samma form som prefetchPMTiles
// returnerar — så caller-koden i createController() kan vara oförändrad.
// Dedup på URL i SW: om en annan flik redan startat samma URL attaches vi
// till den strömmen istället för att dubbelfetcha 4 GB.
function swPrefetchPMTiles(url, opts) {
    opts = opts || {};
    const onProgress = opts.onProgress || function () {};
    return new Promise((resolve) => {
        function handler(ev) {
            const data = ev.data || {};
            if (data.type !== 'PM_PROGRESS' || data.url !== url) return;
            const j = data.job;
            if (j === null) {
                navigator.serviceWorker.removeEventListener('message', handler);
                return;
            }
            if (j.status === 'running') {
                onProgress({ loaded: j.loaded, total: j.total, percent: j.percent });
            } else if (j.status === 'done') {
                navigator.serviceWorker.removeEventListener('message', handler);
                resolve({ ok: true, bytes: j.loaded, hex: null, hashSkipped: true });
            } else if (j.status === 'aborted') {
                navigator.serviceWorker.removeEventListener('message', handler);
                resolve({ ok: false, error: 'Avbruten' });
            } else {
                navigator.serviceWorker.removeEventListener('message', handler);
                resolve({ ok: false, error: j.error || 'okänt fel' });
            }
        }
        navigator.serviceWorker.addEventListener('message', handler);
        try {
            navigator.serviceWorker.controller.postMessage({
                type: 'PM_START_JOB',
                spec: { url: url, expectedBytes: opts.expectedBytes || 0 }
            });
        } catch (err) {
            navigator.serviceWorker.removeEventListener('message', handler);
            resolve({ ok: false, error: (err && err.message) || 'postMessage misslyckades' });
        }
    });
}

function canDelegateToSW() {
    return typeof navigator !== 'undefined'
        && 'serviceWorker' in navigator
        && !!navigator.serviceWorker.controller;
}

// Slår upp expected bytes för en pmtiles-URL: Sverige-filen är hardcodad,
// grannländer slås upp via window.HVCountries.pmtilesPresets om countries.js
// är inläst. Returnerar 0 om okänd URL → då hoppas storlekskontrollen över.
function getExpectedBytesForUrl(url) {
    if (url === SVERIGE_PMTILES_URL) return SVERIGE_PMTILES_BYTES;
    if (typeof window !== 'undefined' && window.HVCountries
            && window.HVCountries.pmtilesPresets) {
        const presets = window.HVCountries.pmtilesPresets;
        for (const code in presets) {
            const p = presets[code];
            if (p && p.pmtiles && p.pmtiles.url && p.pmtiles.url === url) {
                return p.pmtiles.bytes || 0;
            }
        }
    }
    // Landskaps-presets (landskap.js) — samma form som grannländerna, men
    // nyckeln är landskaps-id istället för landskod.
    if (typeof window !== 'undefined' && window.HVLandskap
            && window.HVLandskap.presets) {
        const lp = window.HVLandskap.presets;
        for (const id in lp) {
            const p = lp[id];
            if (p && p.pmtiles && p.pmtiles.url && p.pmtiles.url === url) {
                return p.pmtiles.bytes || 0;
            }
        }
    }
    return 0;
}

// Per-URL prefetch oberoende av controller-instans. Behövs av landskaps-
// väljaren (shared/landskap-offline.js) som laddar ner flera filer som inte
// är "den aktiva" controller-URL:en. Speglar controller.prefetch:s logik:
// SW-delegerad om möjligt (överlever sid-navigering), annars in-page-loop.
// Returnerar samma form som prefetchPMTiles: { ok, bytes, error, ... }.
function fetchSmart(url, opts) {
    opts = opts || {};
    if (!url) return Promise.resolve({ ok: false, error: 'Ingen URL angiven' });
    if (canDelegateToSW()) {
        return swPrefetchPMTiles(url, {
            expectedBytes: opts.expectedBytes || getExpectedBytesForUrl(url),
            onProgress: opts.onProgress
        });
    }
    return prefetchPMTiles(url, {
        signal: opts.signal,
        expectedSha256: opts.expectedSha256 || '',
        onProgress: opts.onProgress
    });
}

// Avbryt en pågående SW-delegerad prefetch för en URL. (In-page-loopen
// avbryts av anroparens egen AbortSignal.)
function cancelSmart(url) {
    if (canDelegateToSW() && navigator.serviceWorker.controller) {
        try { navigator.serviceWorker.controller.postMessage({ type: 'PM_CANCEL', url: url }); }
        catch (_) {}
    }
}

async function isPrefetched(url, expectedBytes) {
    try {
        const cache = await caches.open(PMTILES_CACHE);
        const hit = await cache.match(url);
        if (!hit) return false;
        // Storlekskontroll mot expected — hindrar att gamla cachade
        // versioner anses giltiga efter rebuild av pmtiles-filen.
        if (expectedBytes && expectedBytes > 0) {
            const cl = parseInt(hit.headers.get('content-length') || '0', 10);
            if (cl > 0 && cl !== expectedBytes) {
                console.warn('[pmtiles] cachad fil har fel storlek (' + cl +
                    ' bytes, väntar ' + expectedBytes + '). Invaliderar.');
                await cache.delete(url);
                return false;
            }
        }
        return true;
    } catch (_) { return false; }
}

async function removePrefetched(url) {
    try {
        const cache = await caches.open(PMTILES_CACHE);
        return await cache.delete(url);
    } catch (_) { return false; }
}

// ─── Statisk export-render (härdat läge) ─────────────────────────────────────
// Ritar härdat-lägets vektorkarta till en given canvas-kontext utan Leaflet-
// karta (protomaps Static-frontend). Används av PNG-exporten i minkarta/
// sensorskiss så export i härdat läge läser den lokala PMTiles-filen i
// stället för att hämta OTM/OSM-raster från nätet.
//
// center = { lng, lat } och zoom är exportens tile-grid-parametrar. OBS:
// anroparen måste räkna center som INVERS mercator av grid-pixelcentrum
// (inte aritmetiskt lat-mitt) — annars linjerar bakgrunden inte med
// overlay-projektionen. drawContext respekterar befintlig ctx-transform
// (translate/scale), så anroparen kan rita med offset och dpr-skala.
//
// Fail-closed: kräver aktivt härdat läge med fullständigt nedladdat paket.
// Utan paket skulle PmtilesSource:ns range-requests gå ut till R2 via SW:ns
// nätfallback — då är blockering rätt svar, inte en "nästan lokal" export.
async function renderHardenedStatic(ctx, center, zoom, widthPx, heightPx) {
    const s = loadState();
    if (!(s.active === true && s.url)) {
        throw new Error('Härdat läge är inte aktivt.');
    }
    if (s.kind === 'raster') {
        throw new Error('Aktiv härdad karta är i rasterformat — PNG-export stöds bara för vektorkartor.');
    }
    const cached = await isPrefetched(s.url, getExpectedBytesForUrl(s.url));
    if (!cached) {
        throw new Error('Kartpaketet är inte nedladdat — exporten skulle hämta kartdata från nätet. Ladda ner paketet via offline-väljaren och försök igen.');
    }
    const flavor = s.flavor || DEFAULT_FLAVOR;
    const staticOpts = { url: s.url, lang: 'sv' };
    if (flavor === 'topo') {
        staticOpts.paintRules = topoPaintRules();
        // Matchar topo-flavorns 'earth'-ton så ytor utan täckning (utanför
        // extraktets bbox) inte blir genomskinliga hål i exporten.
        staticOpts.backgroundColor = '#f0ede5';
    } else {
        staticOpts.flavor = flavor;
    }
    const st = new Static(staticOpts);
    return st.drawContext(ctx, widthPx, heightPx, { x: center.lng, y: center.lat }, zoom);
}

function createController(map, normalLayer, opts) {
    opts = opts || {};
    let hardLayer = null;
    let kind = null; // 'vector' eller 'raster' — bestäms av PMTiles-headern

    const persisted = loadState();
    let url = persisted.url || '';
    let flavor = persisted.flavor || DEFAULT_FLAVOR;

    const listeners = new Set();
    function emit() {
        listeners.forEach(fn => { try { fn(); } catch (_) {} });
    }

    function isActive() { return hardLayer !== null; }
    function getUrl() { return url; }
    function getFlavor() { return flavor; }
    function getKind() { return kind; }

    function onChange(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    // Bestäm om filen är vector (MVT) eller raster (PNG/WebP) genom att läsa
    // PMTiles-headerns tile_type-byte. Vector → protomaps-leaflet, raster →
    // pmtiles' inbyggda leafletRasterLayer.
    async function detectKind(pmtilesUrl) {
        try {
            const p = new PMTiles(pmtilesUrl);
            const header = await p.getHeader();
            // tile_type: 0 = unknown, 1 = MVT, 2 = PNG, 3 = JPEG, 4 = WEBP, 5 = AVIF
            return header.tileType === 1 ? 'vector' : 'raster';
        } catch (err) {
            console.warn('[pmtiles] kunde inte läsa header, antar vector', err);
            return 'vector';
        }
    }

    async function activate(promptedUrl, quiet) {
        if (promptedUrl) url = promptedUrl;
        if (!url) {
            // Fas 1: defaulta till demo-fil (Florens) sa anvandaren ser
            // resultatet direkt. Fas 2 byter till svensk hostad fil med
            // SHA-256-verifiering. Anvandaren kan andra URL via
            // window.MK_HARDENING.setUrl(...) eller setDemo().
            url = DEFAULT_DEMO_URL;
            console.info('[pmtiles] Anvander default demo-URL (Florens). Byt via setUrl() eller setDemo(index).');
        }

        // Fas 1.4: härdat läge kräver ett KOMPLETT nedladdat paket. Utan det
        // skulle kartan range-hämta on-demand från R2 medan UI:t påstår
        // isolering — "nästan lokal" är värre än ärlig blockering. Gäller
        // även setDemo() från konsolen: prefetcha demot först.
        let prefetched = false;
        try { prefetched = await isPrefetched(url, getExpectedBytesForUrl(url)); } catch (_) {}
        if (!prefetched) {
            hardLayer = null;
            kind = null;
            saveState({ active: false, url, flavor });
            emit();
            if (!quiet) {
                window.alert('Härdat läge kräver ett nedladdat kartpaket.\n\n' +
                    'Ladda ner via "Ladda ner offline"-väljaren först (kräver nät), ' +
                    'och aktivera härdat läge när nedladdningen är klar.');
            } else {
                console.warn('[pmtiles] Härdat läge auto-avaktiverat: paketet är inte (längre) nedladdat.');
            }
            return false;
        }

        try {
            kind = await detectKind(url);
            if (kind === 'vector') {
                // 'topo' = vår custom paintRules (OTM-likt: svarta byggnader,
                // grå kvarter, grön natur). Övriga flavors = protomaps inbyggda
                // light/dark/white/grayscale/black.
                const layerOpts = { url: url, lang: 'sv' };
                if (flavor === 'topo') {
                    layerOpts.paintRules = topoPaintRules();
                } else {
                    layerOpts.flavor = flavor;
                }
                hardLayer = leafletLayer(layerOpts);
            } else {
                const p = new PMTiles(url);
                hardLayer = leafletRasterLayer(p, {
                    attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
                    maxZoom: 19
                });
            }
            hardLayer.addTo(map);
            if (normalLayer && map.hasLayer(normalLayer)) {
                map.removeLayer(normalLayer);
            }
            // Pan-till-demo: om aktiv URL ar en av de kanda demos och
            // anvandarens vy ar utanfor dess tackningsomrade, hoppa dit.
            // Annars ser man bara grå rutor och tror funktionen ar trasig.
            const demo = DEMO_URLS.find(d => d.url === url);
            if (demo && demo.center && map.setView) {
                try { map.setView(demo.center, demo.zoom); } catch (_) {}
            }
            saveState({ active: true, url, flavor, kind });
            // Fas 1.3 / fail-closed aktivering: vänta in att läget är committat
            // i IDB OCH kvitterat av service workern innan UI:t säger "PÅ".
            // Utan detta fanns ett fönster där operatören fick grönt läge medan
            // SW:n fortfarande släppte igenom nätverk.
            if (window.HVHardened && window.HVHardened.confirm) {
                const verkstalld = await window.HVHardened.confirm();
                if (!verkstalld) {
                    console.warn('[pmtiles] Härdat läge kunde inte bekräftas av service workern.');
                    if (!quiet) {
                        window.alert('Härdat läge kunde inte verifieras mot appens nätverksspärr.\n\n' +
                            'Kartan visas lokalt, men lita INTE på att nätet är stängt. ' +
                            'Ladda om sidan och försök igen.');
                    }
                }
            }
            emit();
            return true;
        } catch (err) {
            console.error('[pmtiles] kunde inte aktivera härdat läge', err);
            hardLayer = null;
            kind = null;
            saveState({ active: false, url, flavor });
            window.alert('Kunde inte ladda PMTiles-fil: ' + (err && err.message || 'okänt fel') + '\n\nKontrollera att URL:n stödjer Range-requests + CORS.');
            return false;
        }
    }

    function deactivate() {
        if (hardLayer) {
            try { map.removeLayer(hardLayer); } catch (_) {}
            hardLayer = null;
            kind = null;
        }
        if (normalLayer && !map.hasLayer(normalLayer)) {
            normalLayer.addTo(map);
        }
        saveState({ active: false, url, flavor });
        emit();
    }

    function toggle() {
        if (isActive()) {
            deactivate();
            return Promise.resolve(false);
        }
        return activate();
    }

    function setUrl(newUrl) {
        const wasActive = isActive();
        if (wasActive) deactivate();
        url = newUrl || '';
        saveState({ active: false, url, flavor });
        if (wasActive && url) return activate();
        return Promise.resolve(false);
    }

    // Hjalpare for att byta till en av de inbyggda demo-filerna och
    // auto-pan:a till dess center. Anvands via console: MK_HARDENING.setDemo(0/1/2).
    async function setDemo(index) {
        const demo = DEMO_URLS[index] || DEMO_URLS[0];
        await setUrl(demo.url);
        if (!isActive()) await activate();
        if (demo.center && map) {
            map.setView(demo.center, demo.zoom);
        }
        return demo;
    }
    function listDemos() { return DEMO_URLS.map((d, i) => ({ index: i, ...d })); }

    function setFlavor(f) {
        flavor = f;
        const wasActive = isActive();
        if (wasActive) {
            deactivate();
            return activate();
        }
        saveState({ active: false, url, flavor });
        return Promise.resolve(false);
    }

    // Auto-aktivera om föregående session lämnade härdat läge på.
    if (persisted.active && persisted.url) {
        // Aktivera asynkront sa render-pipelinen inte blockerar. quiet=true:
        // vid boot ska ett saknat paket inte alert:a — bara logga + slå av.
        Promise.resolve().then(() => activate(undefined, true));
    }

    // Pre-download-wrapper bunden till nuvarande URL + signal.
    let activeAbortController = null;
    let activeSWPrefetch = false; // Fas 3: när SW-jobbet löper sätts denna
    async function prefetch(prefetchOpts) {
        prefetchOpts = prefetchOpts || {};
        if (!url) {
            return { ok: false, error: 'Ingen URL satt — aktivera Härdat läge först.' };
        }
        if (activeAbortController || activeSWPrefetch) {
            return { ok: false, error: 'Pre-download pågår redan.' };
        }
        // Fas 3: SW-läge — fetch-loopen lever i SW och överlever sid-navigering.
        // SHA-256 hoppas över oavsett filstorlek (Web Crypto subtle.digest
        // kräver hela filen i RAM). Fallback till in-page-loop om SW saknas.
        if (canDelegateToSW()) {
            activeSWPrefetch = true;
            try {
                return await swPrefetchPMTiles(url, {
                    expectedBytes: getExpectedBytesForUrl(url),
                    onProgress: prefetchOpts.onProgress
                });
            } finally {
                activeSWPrefetch = false;
            }
        }
        activeAbortController = new AbortController();
        try {
            return await prefetchPMTiles(url, {
                signal: activeAbortController.signal,
                expectedSha256: prefetchOpts.expectedSha256 || '',
                onProgress: prefetchOpts.onProgress
            });
        } finally {
            activeAbortController = null;
        }
    }
    function cancelPrefetch() {
        if (activeAbortController) activeAbortController.abort();
        if (activeSWPrefetch && navigator.serviceWorker.controller) {
            try {
                navigator.serviceWorker.controller.postMessage({
                    type: 'PM_CANCEL', url: url
                });
            } catch (_) {}
        }
    }
    // Vid checkPrefetched: slå upp förväntad storlek per URL via
    // getExpectedBytesForUrl (Sverige + grannländer från HVCountries).
    // Det invaliderar automatiskt gamla cachade versioner efter pmtiles-
    // rebuild (t.ex. bytt maxzoom).
    function checkPrefetched() {
        return isPrefetched(url, getExpectedBytesForUrl(url));
    }
    function clearPrefetched() { return removePrefetched(url); }

    return {
        isActive, activate, deactivate, toggle,
        getUrl, setUrl,
        getFlavor, setFlavor,
        getKind,
        setDemo, listDemos,
        onChange,
        prefetch, cancelPrefetch, checkPrefetched, clearPrefetched
    };
}

// Globala helpers (oberoende av controller-instans).
window.PMTilesPrefetch = {
    fetch: prefetchPMTiles,
    fetchSmart: fetchSmart,
    cancel: cancelSmart,
    expectedBytesForUrl: getExpectedBytesForUrl,
    isPrefetched: isPrefetched,
    remove: removePrefetched,
    verifyHash: verifyHash,
    SVERIGE_URL: SVERIGE_PMTILES_URL,
    SVERIGE_SHA256: SVERIGE_PMTILES_SHA256,
    SVERIGE_BYTES: SVERIGE_PMTILES_BYTES,
    CACHE_NAME: PMTILES_CACHE
};

// Globalt namespace så icke-modul-script (renderMapControls i minkarta/
// sensorskiss) kan skapa en controller per karta.
// FLAVORS: kanonisk lista över härdat-lägets kartstilar (värde + etikett).
// Används av minkarta, sensorskiss och offline-väljarens "Kartstil"-rad så
// alternativen inte definieras på tre ställen.
window.PMTilesHardening = {
    createController,
    renderHardenedStatic,
    FLAVORS: [
        ['topo', 'Topo (svart bygg)'],
        ['light', 'Light'],
        ['dark', 'Dark'],
        ['white', 'White'],
        ['grayscale', 'Grayscale'],
        ['black', 'Black']
    ]
};

// Signalera redoläge så script som körde innan denna modul laddats kan
// vänta in oss. Modul-script körs efter DOMContentLoaded men innan load,
// så de flesta UI-script hinner ändå binda först — eventet är till for
// race-conditions.
window.dispatchEvent(new CustomEvent('PMTilesHardening:ready'));
