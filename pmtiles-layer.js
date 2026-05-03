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
import { leafletLayer } from './vendor/protomaps/protomaps-leaflet.esm.js';

const STORAGE_KEY = 'pmtiles.hardening';
const DEFAULT_FLAVOR = 'light'; // protomaps-leaflet: light/dark/white/grayscale/black

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
}

function saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (_) {}
}

// Stub: SHA-256-verifiering aktiveras i Fas 2 när vi har en känd fil och
// en hash i sajt-koden. För Fas 1: bara loggar, blockerar inte.
async function verifyHashIfRequired(url, expectedSha256) {
    if (!expectedSha256) return true;
    try {
        const resp = await fetch(url);
        const buf = await resp.arrayBuffer();
        const hash = await crypto.subtle.digest('SHA-256', buf);
        const hex = Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        if (hex !== expectedSha256.toLowerCase()) {
            console.error('[pmtiles] SHA-256-mismatch', { expected: expectedSha256, got: hex });
            return false;
        }
        return true;
    } catch (err) {
        console.error('[pmtiles] hash-verifiering misslyckades', err);
        return false;
    }
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

    async function activate(promptedUrl) {
        if (promptedUrl) url = promptedUrl;
        if (!url) {
            const input = window.prompt(
                'PMTiles-URL\n\n' +
                'Ange en .pmtiles-URL som stödjer HTTP Range-requests och CORS.\n' +
                'Exempel:\n' +
                '  http://localhost:8000/sample.pmtiles  (lokal test-server)\n' +
                '  https://din-r2-bucket.example.com/sverige.pmtiles\n\n' +
                'Hostingen får inte vara aktiv tile-server (OTM/OSM blockerar bulk).',
                ''
            );
            if (!input) return false;
            url = input.trim();
        }

        try {
            kind = await detectKind(url);
            if (kind === 'vector') {
                hardLayer = leafletLayer({
                    url: url,
                    flavor: flavor,
                    lang: 'sv'
                });
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
            saveState({ active: true, url, flavor, kind });
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
        // Aktivera asynkront sa render-pipelinen inte blockerar.
        Promise.resolve().then(() => activate());
    }

    return {
        isActive, activate, deactivate, toggle,
        getUrl, setUrl,
        getFlavor, setFlavor,
        getKind,
        onChange,
        verifyHashIfRequired
    };
}

// Globalt namespace så icke-modul-script (renderMapControls i minkarta/
// sensorskiss) kan skapa en controller per karta.
window.PMTilesHardening = { createController };

// Signalera redoläge så script som körde innan denna modul laddats kan
// vänta in oss. Modul-script körs efter DOMContentLoaded men innan load,
// så de flesta UI-script hinner ändå binda först — eventet är till for
// race-conditions.
window.dispatchEvent(new CustomEvent('PMTilesHardening:ready'));
