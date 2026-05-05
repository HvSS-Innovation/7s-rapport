// ─────────────────────────────────────────────────────────────────────────────
//  TOPO-OVERLAY — Topografi-/höjddata-overlay för MINKARTA + SENSORSKISS
//
//  Lägger ett separat tile-/raster-lager OVANPÅ befintlig basemap (vanlig
//  HybridTileLayer eller PMTiles via Härdat läge). Tänkt för höjdkurvor /
//  hillshade så att operativ kart-läsning blir möjlig även i Härdat läge
//  där `sverige.pmtiles` saknar topografi (Protomaps Basemap-schema =
//  bara vägar/byggnader/landuse/water).
//
//  Designprinciper:
//   - Utbytbar datakälla: pmtiles-raster (offline-vänlig) eller online-
//     tile-template (snabb fallback). Adapter-mönstret gör att Lantmäteriet
//     /Copernicus/SRTM/NASA-källor kan kopplas in senare utan att UI ändras.
//   - Opt-in: knappen togglar lagret. State sparas i localStorage.
//   - Säker default: om ingen källa är konfigurerad eller laddningen
//     misslyckas så återgår appen tyst utan att krascha — knappen blir
//     bara inaktiv. Användaren får tydlig konsol-logg.
//   - OPSEC-medveten: online-källor varnar att tile-requests skickas innan
//     aktivering. Härdat läge varnar extra hårt.
//
//  Datakällor idag:
//   - Fas 1 default: ingen aktiv (vänta på sverige-hillshade.pmtiles).
//   - Fas 1 demo: Mt Whitney USGS hillshade WebP (publik, 1.9 MB) — låter
//     mekanismen testas omedelbart.
//   - Fas 2: sverige-hillshade.pmtiles byggd från Copernicus DEM GLO-30
//     (CC-BY 4.0). Pipeline: verktyg/build-sverige-hillshade.md.
//   - Fas 4: Lantmäteriets WMS för svenska höjdkurvor när konto finns.
// ─────────────────────────────────────────────────────────────────────────────

import { PMTiles, leafletRasterLayer } from './vendor/pmtiles/pmtiles.esm.js';

const STORAGE_KEY = 'topoOverlay.state';
const TOPO_CACHE = 'hv-topo-overlay-v1'; // Cache API-namespace för PMTiles-fil

// Konfig — utbytbar datakälla. Sätt url:'' för att inaktivera knappen helt
// (om ingen Sverige-fil är publicerad och inga online-fallbacks är ok).
//
// Plats för Joel att uppdatera när sverige-hillshade.pmtiles är byggd och
// uppladdad till R2:
//   1. kind: 'pmtiles-raster'
//   2. url:  'https://pub-...r2.dev/sverige-hillshade.pmtiles'
//   3. expectedBytes: <storlek i bytes>
//   4. attribution: 'Hillshade © Copernicus DEM GLO-30 (CC-BY 4.0)'
//   5. minZoom/maxZoom enligt din build (typ 5–13)
const SOURCES = {
    // 'sverige-hillshade': {
    //     kind: 'pmtiles-raster',
    //     url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/sverige-hillshade.pmtiles',
    //     expectedBytes: 0, // fyll i efter bygg
    //     expectedSha256: '', // fyll i efter bygg
    //     attribution: '© <a href="https://dataspace.copernicus.eu/">Copernicus DEM GLO-30</a> CC-BY 4.0',
    //     opacity: 0.55,
    //     minZoom: 5,
    //     maxZoom: 13,
    //     label: 'Höjdkurvor Sverige (offline)'
    // },
    'mt-whitney-demo': {
        kind: 'pmtiles-raster',
        url: 'https://raw.githubusercontent.com/protomaps/PMTiles/main/spec/v3/usgs-mt-whitney-8-15-webp-512.pmtiles',
        expectedBytes: 0, // GitHub Raw Content-Length kan vara felaktig — skip-check
        attribution: '© USGS / Mt Whitney demo',
        opacity: 0.85,
        minZoom: 8,
        maxZoom: 15,
        label: 'Demo: Mt Whitney (USGS)'
    },
    // Online OpenTopoMap som fallback. Notera: detta är samma server som
    // basemap använder i online-läget — i Härdat läge bryter detta OPSEC
    // eftersom det skickar tile-requests till tile.opentopomap.org. Bara
    // för medvetna lägen där operatören accepterar att synas.
    'otm-online': {
        kind: 'online-tile',
        urlTemplate: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c'],
        attribution: '© <a href="https://opentopomap.org/">OpenTopoMap</a> (CC-BY-SA)',
        opacity: 0.55,
        minZoom: 0,
        maxZoom: 17,
        opsecOnline: true, // visa varning innan aktivering
        label: 'Topografi (online OTM-overlay)'
    }
};

// Default-källa när användaren inte aktivt har valt. Sätt till null för att
// dölja knappen helt tills en explicit källa konfigureras.
const DEFAULT_SOURCE_ID = 'otm-online';

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
}

function saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (_) {}
}

function listSources() {
    return Object.keys(SOURCES).map(id => ({
        id,
        label: SOURCES[id].label,
        kind: SOURCES[id].kind,
        opsecOnline: !!SOURCES[id].opsecOnline
    }));
}

function getSource(id) {
    return SOURCES[id] || null;
}

// Bygg ett Leaflet-lager för en given källa. Returnerar Promise<Layer> eller
// null vid fel. Kallaren ansvarar för addTo/removeLayer.
async function buildLayer(source) {
    if (!source) return null;
    if (source.kind === 'pmtiles-raster') {
        try {
            const p = new PMTiles(source.url);
            // Verifiera att headern går att läsa innan vi addar lagret —
            // annars får användaren en tyst svart karta.
            const header = await p.getHeader();
            if (!header) throw new Error('PMTiles-header kunde inte läsas');
            const layer = leafletRasterLayer(p, {
                attribution: source.attribution || '',
                opacity: source.opacity != null ? source.opacity : 0.55,
                minZoom: source.minZoom != null ? source.minZoom : 0,
                maxZoom: source.maxZoom != null ? source.maxZoom : 19,
                pane: 'overlayPane'
            });
            return layer;
        } catch (err) {
            console.error('[topo-overlay] PMTiles-källa kunde inte laddas:', source.url, err);
            return null;
        }
    }
    if (source.kind === 'online-tile') {
        try {
            const layer = L.tileLayer(source.urlTemplate, {
                subdomains: source.subdomains || 'abc',
                attribution: source.attribution || '',
                opacity: source.opacity != null ? source.opacity : 0.55,
                minZoom: source.minZoom != null ? source.minZoom : 0,
                maxZoom: source.maxZoom != null ? source.maxZoom : 19,
                crossOrigin: 'anonymous',
                pane: 'overlayPane'
            });
            return layer;
        } catch (err) {
            console.error('[topo-overlay] Online tile-källa kunde inte byggas:', err);
            return null;
        }
    }
    console.warn('[topo-overlay] Okänd källa-kind:', source.kind);
    return null;
}

function createController(map, opts) {
    opts = opts || {};
    let activeLayer = null;
    let activeSourceId = null;
    let pending = false; // pågående async aktivering

    const persisted = loadState();
    let sourceId = persisted.sourceId || DEFAULT_SOURCE_ID;
    let acceptedOpsec = persisted.acceptedOpsec || {}; // map<sourceId, true>

    const listeners = new Set();
    function emit() { listeners.forEach(fn => { try { fn(); } catch (_) {} }); }
    function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

    function isActive() { return activeLayer !== null; }
    function getSourceId() { return sourceId; }
    function getActiveSourceId() { return activeSourceId; }

    async function activate() {
        if (pending) return false;
        if (activeLayer) return true;
        const source = getSource(sourceId);
        if (!source) {
            console.warn('[topo-overlay] Ingen källa konfigurerad, ID:', sourceId);
            return false;
        }
        pending = true;
        try {
            const layer = await buildLayer(source);
            if (!layer) {
                pending = false;
                emit();
                return false;
            }
            layer.addTo(map);
            activeLayer = layer;
            activeSourceId = sourceId;
            saveState({ active: true, sourceId, acceptedOpsec });
            emit();
            return true;
        } catch (err) {
            console.error('[topo-overlay] activate misslyckades:', err);
            return false;
        } finally {
            pending = false;
        }
    }

    function deactivate() {
        if (activeLayer) {
            try { map.removeLayer(activeLayer); } catch (_) {}
            activeLayer = null;
            activeSourceId = null;
        }
        saveState({ active: false, sourceId, acceptedOpsec });
        emit();
    }

    async function toggle() {
        if (isActive()) {
            deactivate();
            return false;
        }
        return await activate();
    }

    async function setSource(newId) {
        const source = getSource(newId);
        if (!source) {
            console.warn('[topo-overlay] Okänd källa:', newId);
            return false;
        }
        const wasActive = isActive();
        if (wasActive) deactivate();
        sourceId = newId;
        saveState({ active: false, sourceId, acceptedOpsec });
        if (wasActive) return await activate();
        return true;
    }

    function hasAcceptedOpsec(id) {
        return !!(acceptedOpsec && acceptedOpsec[id]);
    }
    function markOpsecAccepted(id) {
        acceptedOpsec = Object.assign({}, acceptedOpsec || {}, { [id]: true });
        saveState({ active: isActive(), sourceId, acceptedOpsec });
    }

    // Auto-aktivera om föregående session lämnade overlay PÅ. Försök tyst,
    // fail = bara emit ändring så UI-knappen visar AV.
    if (persisted.active && sourceId) {
        Promise.resolve().then(() => activate());
    }

    return {
        isActive,
        activate,
        deactivate,
        toggle,
        getSourceId,
        getActiveSourceId,
        setSource,
        listSources,
        hasAcceptedOpsec,
        markOpsecAccepted,
        onChange
    };
}

window.TopoOverlay = {
    createController,
    listSources,
    DEFAULT_SOURCE_ID,
    CACHE_NAME: TOPO_CACHE
};

window.dispatchEvent(new CustomEvent('TopoOverlay:ready'));
