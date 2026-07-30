// ─────────────────────────────────────────────────────────────────────────────
//  HARDENED-GUARD — sid-scope egress-spärr + runtime-sync för Härdat läge
//  (Fas 1 av roadmap-opsec-hardat-lage: 1.1 single source of truth i runtime,
//  1.2 egress-guard som defense-in-depth ovanpå SW-spärren i service-worker.js)
//
//  Laddas som VANLIGT <script> i <head> på alla sidor med kart-/nätfunktioner
//  (rapportsidorna, minkarta, sensorskiss, upk, vader) — FÖRE alla andra
//  script, så inga anrop hinner före wrappningen.
//
//  Vad den gör i härdat läge:
//    - window.fetch / XMLHttpRequest.open / navigator.sendBeacon mot
//      cross-origin-mål kastar kontrollerat fel i stället för att gå ut.
//    - Tillåtet: same-origin (service workern garanterar att de servas ur
//      cache utan nät — se service-worker.js Fas 2), blob:, data:, samt
//      *.pmtiles-URL:er (kartläsningens range-requests; SW:n serverar dem
//      ur PMTILES_CACHE och 503:ar cachemiss i härdat — aldrig nät).
//    - navigator.share wrappas INTE (beslut C 2026-07-30): delning är lokal
//      IPC till OS:ets delningsark på användarens uttryckliga initiativ —
//      kärnflödet "dela till Signal/ATAK". Foton är redan EXIF-strippade.
//
//  Runtime-sync (kontrakt med service-worker.js):
//    - Källan till sanning är localStorage['pmtiles.hardening'] (samma som
//      pmtiles-layer.js). SW:n kan inte läsa localStorage, så sync() speglar
//      active-flaggan till IndexedDB db 'hv-hardened' / store 'kv' / key
//      'state' = { active, ts } och postMessage:ar HARDENED_SET till SW:n.
//    - Cross-flik: storage-event + BroadcastChannel 'hv-hardened' håller
//      guard-flaggan färsk i alla öppna flikar utan reload.
//    - sync() körs vid sidladdning (reparerar drift om en toggle skett från
//      en sida utan detta script) och anropas av pmtiles-layer.js saveState()
//      + vader.html:s setHardened() vid varje toggle.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    var KEY = 'pmtiles.hardening';

    function readActive() {
        try {
            var s = JSON.parse(localStorage.getItem(KEY) || '{}');
            return s.active === true && !!s.url;
        } catch (_) { return false; }
    }

    var active = readActive();

    function isAllowedUrl(u) {
        try {
            var url = new URL(u, location.href);
            if (url.protocol === 'blob:' || url.protocol === 'data:') return true;
            if (url.origin === location.origin) return true;
            if (url.pathname && url.pathname.endsWith('.pmtiles')) return true;
            return false;
        } catch (_) { return false; }
    }

    function blockedError(what, u) {
        var host = '';
        try { host = new URL(u, location.href).host; } catch (_) {}
        return new Error('Blockerad i härdat läge: ' + what + (host ? ' mot ' + host : '') +
            '. Stäng av härdat läge för att öppna nätet.');
    }

    // ── Egress-wrappar ──────────────────────────────────────────────────────
    var origFetch = window.fetch ? window.fetch.bind(window) : null;
    if (origFetch) {
        window.fetch = function (input, init) {
            if (active) {
                var u = (typeof input === 'string') ? input
                    : (input && typeof input.url === 'string') ? input.url : '';
                if (!isAllowedUrl(u)) return Promise.reject(blockedError('fetch', u));
            }
            return origFetch(input, init);
        };
    }

    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        if (active && !isAllowedUrl(url)) throw blockedError('XHR', url);
        return origOpen.apply(this, arguments);
    };

    if (navigator.sendBeacon) {
        var origBeacon = navigator.sendBeacon.bind(navigator);
        navigator.sendBeacon = function (url, data) {
            if (active && !isAllowedUrl(url)) return false;
            return origBeacon(url, data);
        };
    }

    // ── Cross-flik-synk ─────────────────────────────────────────────────────
    var bc = null;
    try {
        bc = new BroadcastChannel('hv-hardened');
        bc.onmessage = function () { active = readActive(); };
    } catch (_) { /* BroadcastChannel saknas — storage-eventet räcker */ }

    window.addEventListener('storage', function (ev) {
        if (ev.key === KEY) active = readActive();
    });

    // ── Runtime-sync till IDB + SW ──────────────────────────────────────────
    function writeIdb(isActive) {
        try {
            var req = indexedDB.open('hv-hardened', 1);
            req.onupgradeneeded = function () {
                try { req.result.createObjectStore('kv'); } catch (_) {}
            };
            req.onsuccess = function () {
                try {
                    var db = req.result;
                    var tx = db.transaction('kv', 'readwrite');
                    tx.objectStore('kv').put({ active: isActive, ts: Date.now() }, 'state');
                    tx.oncomplete = function () { db.close(); };
                } catch (_) {}
            };
        } catch (_) {}
    }

    function sync() {
        active = readActive();
        writeIdb(active);
        try { if (bc) bc.postMessage({ type: 'sync' }); } catch (_) {}
        try {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'HARDENED_SET', active: active });
            }
        } catch (_) {}
    }

    // Reparera ev. drift direkt vid sidladdning (IDB/SW kan ha missat en
    // toggle gjord från en sida utan guarden).
    sync();

    window.HVHardened = {
        isActive: function () { return active; },
        sync: sync
    };
})();
