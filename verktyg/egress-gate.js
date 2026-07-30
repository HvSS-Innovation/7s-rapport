#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  EGRESS-GATE — statisk OPSEC-grind (Fas 3.1, roadmap-opsec-hardat-lage)
//
//  Körs i CI på varje push (och lokalt: `node verktyg/egress-gate.js`).
//  Failar bygget när serverad kod (rot-*.html/*.js + lib/ + shared/) bryter
//  mot härdat-lägets kontrakt:
//
//   1. NY EXTERN HOST — en URL-host som inte finns i ALLOWED_HOSTS nedan.
//      Varje host i appen ska vara ett medvetet, dokumenterat val.
//   2. FETCH-HOST I NY FIL — hosts som appen anropar programmatiskt
//      (tiles/geokod/väder/R2) får bara förekomma i registrerade filer.
//      Det var så PNG-export-läckan uppstod (E1, SECURITY_BACKLOG
//      2026-07-29): en ny fil återanvände tile-URL:erna utan härdat-gate.
//   3. SAKNAD GATE-MARKÖR — filer med fetch-hosts måste innehålla sina
//      härdat-spärrar (isHardened/renderHardenedStatic/swHardened osv.).
//      Raderas en gate av misstag blir bygget rött.
//   4. SAKNAD GUARD-INCLUDE — sidorna med nätfunktioner måste ladda
//      shared/hardened-guard.js i <head>.
//
//  Underhåll: lägger du till en ny extern tjänst eller en ny fil som pratar
//  med en befintlig — uppdatera konfigen här MEDVETET (och bygg gaten i den
//  nya koden först). Gaten ska vara obekväm att kringgå, det är poängen.
//
//  Scope-avgränsning: vendor/ (granskad tredjepartskod), audit/ + docs
//  (*.md), verktyg/ (byggverktyg som körs på dev-maskin, inte i appen) och
//  gitignorerade kataloger skannas INTE. stab/ ligger utanför appen (M5).
// ─────────────────────────────────────────────────────────────────────────────

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Hosts appen anropar programmatiskt. `files` = enda filer som får referera
// hosten. `gated` beskriver var/hur härdat-spärren sitter (dokumentation).
const FETCH_HOSTS = {
    'tile.opentopomap.org': {   // matchar även a/b/c-subdomäner + *.-wildcard i CSP
        files: ['ah.html', 'index.html', 'minkarta.html', 'obslosa.html', 'scrim.html',
                'sensorskiss.html', 'weft.html', 'what.html', 'upk.html',
                'minkarta-export.js', 'sensorskiss-export.js', 'offline-tiles.js',
                'topo-overlay.js', 'footer.js'],
        gated: 'sid-guard + SW-503 vid cachemiss i härdat; export via renderHardenedStatic'
    },
    'tile.openstreetmap.org': {
        files: ['ah.html', 'index.html', 'minkarta.html', 'obslosa.html', 'scrim.html',
                'sensorskiss.html', 'weft.html', 'what.html', 'upk.html',
                'minkarta-export.js', 'sensorskiss-export.js', 'offline-tiles.js'],
        gated: 'samma som opentopomap'
    },
    'nominatim.openstreetmap.org': {
        files: ['ah.html', 'index.html', 'minkarta.html', 'obslosa.html', 'scrim.html',
                'sensorskiss.html', 'weft.html', 'what.html', 'vader.html'],
        gated: 'isHardened()-gate före varje fetch (C1-fixen 8fbf10e)'
    },
    'overpass-api.de': {
        files: ['ah.html', 'index.html', 'minkarta.html', 'obslosa.html', 'scrim.html',
                'sensorskiss.html', 'weft.html', 'what.html'],
        gated: 'nås bara via reverse-geocode-callbacken som redan är gate:ad'
    },
    'api.open-meteo.com': {
        files: ['vader.html'],
        gated: 'isHardened()-gate + knapp-disable (VÄDER-fixen)'
    },
    'www.smhi.se': {
        files: ['vader.html', 'footer.js'],
        gated: 'autocomplete körs bara efter gate:ad prognoshämtning; footer = länk'
    },
    'pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev': {
        files: ['ah.html', 'index.html', 'minkarta.html', 'obslosa.html', 'scrim.html',
                'sensorskiss.html', 'weft.html', 'what.html', 'upk.html',
                'countries.js', 'landskap.js', 'pmtiles-layer.js', 'topo-overlay.js',
                'service-worker.js'],
        gated: 'prefetch = SW-jobb (vägras i härdat); range-läsning servas ur cache, miss → 503'
    },
    'raw.githubusercontent.com': {
        files: ['pmtiles-layer.js', 'topo-overlay.js'],
        gated: 'endast demo-filer via konsol-API; activate() kräver prefetchat paket'
    },
    'cache.kartverket.no': {
        files: ['offline-tiles.js'],
        gated: 'nedladdningsjobb via SW (vägras i härdat) + sid-guard'
    },
    'dawn-star-7fc5.nijoda.workers.dev': {
        files: ['tavla.html', 'tipsa.html'],
        gated: 'funktionen pausad 2026-07-25 (workern raderad, 3c59eaf)'
    }
};

// Hosts som bara förekommer som länkar användaren klickar på, attribution,
// XML-namespaces eller doktext — ingen programmatisk egress.
const DOC_HOSTS = [
    '7srapport.com',            // självreferens (canonical/share)
    'github.com',               // källkodslänkar
    'gitjoda71.github.io',      // drondrift extern kalkylator-länk
    'dittanv',                  // trunkerad "dittanvändarnamn.github.io" i footer-guiden
    'en.wikipedia.org',         // APP6-referenslänkar
    'maps.google.com',          // KML-dokumentlänk i geo-export
    'www.google.com',           // upk Maps-länkar (dolda i härdat, M4-fixen)
    'waze.com',                 // upk Waze-länkar (dolda i härdat)
    'nominatim.org',            // footer-transparenslänk
    'open-meteo.com',           // footer-transparenslänk
    'openstreetmap.org',        // attribution
    'www.openstreetmap.org',    // attribution
    'opentopomap.org',          // attribution/om-sida
    'wiki.openstreetmap.org',   // footer-transparenslänk
    'wiki.osmfoundation.org',   // footer-transparenslänk
    'kartverket.no',            // attribution
    'dataspace.copernicus.eu',  // DEM-källkommentar i topo-overlay
    'penntacticalsolutions.com',// källhänvisning i tccc-data
    'www.soldf.com',            // källhänvisning i hjalm24
    'www.opengis.net',          // XML-namespace (KML)
    'www.topografix.com',       // XML-namespace (GPX)
    'www.w3.org',               // XML-namespace (SVG/XHTML)
    'fonts.googleapis.com',     // landing-smakprov — känd rest, backlog 2026-05-29 #3
    'fonts.gstatic.com',        // landing-smakprov — känd rest, backlog 2026-05-29 #3
    'pub-...r2.dev'             // platshållare i topo-overlay-kommentar (ej riktig URL)
];

// Härdat-spärrar som MÅSTE finnas kvar i respektive fil.
const REQUIRED_MARKERS = {
    'index.html': ['isHardened()', 'shared/hardened-guard.js', 'stripExif'],
    'ah.html': ['isHardened()', 'shared/hardened-guard.js'],
    'obslosa.html': ['isHardened()', 'shared/hardened-guard.js'],
    'scrim.html': ['isHardened()', 'shared/hardened-guard.js'],
    'what.html': ['isHardened()', 'shared/hardened-guard.js'],
    'weft.html': ['isHardened()', 'shared/hardened-guard.js'],
    'minkarta.html': ['isHardened()', 'shared/hardened-guard.js'],
    // sensorskiss gate:ar via controllern (SK_HARDENING.isActive), inte lokal isHardened()
    'sensorskiss.html': ['SK_HARDENING', 'shared/hardened-guard.js'],
    'upk.html': ['isHardened()', 'shared/hardened-guard.js'],
    'vader.html': ['isHardened()', 'shared/hardened-guard.js'],
    'minkarta-export.js': ['isHardened()', 'renderHardenedStatic'],
    'sensorskiss-export.js': ['isHardened()', 'renderHardenedStatic'],
    'topo-overlay.js': ['isHardened()'],
    'pmtiles-layer.js': ['isPrefetched', 'HVHardened', 'renderHardenedStatic'],
    'service-worker.js': ['swHardened(', 'hardenedMiss(', 'HARDENED_SET', 'jobUrlAllowed('],
    'shared/hardened-guard.js': ['HARDENED_SET', 'window.fetch', 'XMLHttpRequest.prototype.open', 'sendBeacon'],
    'shared/map-hardat-modal.js': ['checkPrefetched']
};

// ─────────────────────────────────────────────────────────────────────────────

function servedFiles() {
    const out = [];
    for (const f of fs.readdirSync(ROOT)) {
        if (/\.(html|js)$/.test(f) && fs.statSync(path.join(ROOT, f)).isFile()) out.push(f);
    }
    for (const dir of ['lib', 'shared']) {
        const abs = path.join(ROOT, dir);
        if (!fs.existsSync(abs)) continue;
        for (const f of fs.readdirSync(abs)) {
            if (/\.(html|js)$/.test(f)) out.push(dir + '/' + f);
        }
    }
    return out;
}

function normalizeHost(h) {
    h = h.toLowerCase().replace(/^\*\./, '').replace(/^[abc]\.(tile\.opentopomap\.org)$/, '$1');
    return h;
}

function scan(files, readFile) {
    const errors = [];
    const hostsSeen = {}; // host -> Set(file)

    for (const file of files) {
        const src = readFile(file);
        for (const m of src.matchAll(/https?:\/\/([a-z0-9.*-]+)/gi)) {
            const host = normalizeHost(m[1]);
            (hostsSeen[host] = hostsSeen[host] || new Set()).add(file);
        }
    }

    for (const host of Object.keys(hostsSeen).sort()) {
        const inFiles = [...hostsSeen[host]];
        const fetchCfg = FETCH_HOSTS[host];
        if (fetchCfg) {
            for (const f of inFiles) {
                if (!fetchCfg.files.includes(f)) {
                    errors.push('FETCH-HOST I NY FIL: ' + host + ' refereras i ' + f +
                        ' som inte är registrerad. Bygg härdat-gate i filen och lägg till den i FETCH_HOSTS i verktyg/egress-gate.js.');
                }
            }
        } else if (!DOC_HOSTS.includes(host)) {
            errors.push('NY EXTERN HOST: ' + host + ' (' + inFiles.join(', ') + ') finns inte i allowlisten. ' +
                'Är det ett medvetet val: dokumentera + registrera i verktyg/egress-gate.js. Annars: ta bort.');
        }
    }

    for (const [file, markers] of Object.entries(REQUIRED_MARKERS)) {
        if (!files.includes(file)) {
            errors.push('SAKNAD FIL: ' + file + ' (krävs av REQUIRED_MARKERS — har den bytt namn? Uppdatera gaten medvetet).');
            continue;
        }
        const src = readFile(file);
        for (const marker of markers) {
            if (!src.includes(marker)) {
                errors.push('SAKNAD GATE-MARKÖR: "' + marker + '" saknas i ' + file +
                    ' — en härdat-spärr kan ha raderats.');
            }
        }
    }
    return errors;
}

function selftest() {
    // Gaten ska larma på: okänd host, fetch-host i oregistrerad fil, raderad markör.
    const fakeFiles = ['index.html', 'evil-ny-fil.js'].concat(Object.keys(REQUIRED_MARKERS));
    const real = f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (_) { return ''; } };
    const fakeRead = f => {
        if (f === 'evil-ny-fil.js') return 'fetch("https://exfil.example.com/x"); const t = "https://tile.opentopomap.org/1/2/3.png";';
        if (f === 'index.html') return real(f).replace(/stripExif/g, 'borttagen');
        return real(f);
    };
    const errs = scan(fakeFiles, fakeRead);
    const expect = [
        errs.some(e => e.includes('exfil.example.com')),
        errs.some(e => e.includes('tile.opentopomap.org') && e.includes('evil-ny-fil.js')),
        errs.some(e => e.includes('stripExif'))
    ];
    if (expect.every(Boolean)) { console.log('Självtest OK — gaten larmar på alla tre felklasserna.'); return 0; }
    console.error('SJÄLVTEST MISSLYCKADES — gaten larmar inte som den ska:', expect);
    return 1;
}

if (process.argv.includes('--selftest')) {
    process.exit(selftest());
}

const files = servedFiles();
const errors = scan(files, f => fs.readFileSync(path.join(ROOT, f), 'utf8'));
if (errors.length) {
    console.error('EGRESS-GATE RÖD — ' + errors.length + ' fel:\n');
    for (const e of errors) console.error('  ✗ ' + e);
    console.error('\nSe kommentaren i verktyg/egress-gate.js för hur konfigen underhålls.');
    process.exit(1);
}
console.log('EGRESS-GATE GRÖN — ' + files.length + ' filer skannade, alla hosts kända, alla gate-markörer på plats.');
