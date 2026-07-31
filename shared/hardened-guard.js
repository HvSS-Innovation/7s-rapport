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

    // ── Händelselogg ────────────────────────────────────────────────────────
    // Gör spärrens arbete synligt för härdat-testet (och för den som undrar
    // om skyddet gör något alls). ALDRIG full URL: ett blockerat geokod-anrop
    // bär koordinaten i query-strängen, och en logg som sparar den vore en ny
    // lagring av exakt det spärren finns för att skydda. Bara värdnamn.
    function loggaHandelse(handelse) {
        handelse.t = Date.now();
        handelse.kalla = 'guard';
        // Live till andra flikar (härdat-testet lyssnar) …
        try { if (bc) bc.postMessage({ type: 'HARDENED_EVENT', handelse: handelse }); } catch (_) {}
        try { window.dispatchEvent(new CustomEvent('hardened-event', { detail: handelse })); } catch (_) {}
        // … och till service workern för persistens. SW:n är enda skrivaren,
        // så två parter aldrig gör read-modify-write mot samma IDB-nyckel.
        try {
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'HARDENED_EVENT_LOG', handelse: handelse });
            }
        } catch (_) {}
    }

    function blockedError(what, u) {
        var host = '';
        try { host = new URL(u, location.href).host; } catch (_) {}
        loggaHandelse({ typ: 'blockerad', vard: host || '?', kategori: 'extern', text: what + ' stoppad av sid-spärren' });
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
            if (active && !isAllowedUrl(url)) {
                var h = '';
                try { h = new URL(url, location.href).host; } catch (_) {}
                loggaHandelse({ typ: 'blockerad', vard: h || '?', kategori: 'extern', text: 'sendBeacon stoppad av sid-spärren' });
                return false;
            }
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
    // Returnerar en Promise som löser NÄR transaktionen är committad — inte när
    // den är köad. Anroparen måste kunna veta att läget faktiskt ligger på disk
    // innan UI:t påstår att spärren gäller.
    function writeIdb(isActive) {
        return new Promise(function (resolve) {
            try {
                var req = indexedDB.open('hv-hardened', 1);
                req.onupgradeneeded = function () {
                    try { req.result.createObjectStore('kv'); } catch (_) {}
                };
                req.onerror = function () { resolve(false); };
                req.onblocked = function () { resolve(false); };
                req.onsuccess = function () {
                    try {
                        var db = req.result;
                        var tx = db.transaction('kv', 'readwrite');
                        tx.objectStore('kv').put({ active: isActive, ts: Date.now() }, 'state');
                        tx.oncomplete = function () { db.close(); resolve(true); };
                        tx.onerror = function () { try { db.close(); } catch (_) {} resolve(false); };
                        tx.onabort = function () { try { db.close(); } catch (_) {} resolve(false); };
                    } catch (_) { resolve(false); }
                };
            } catch (_) { resolve(false); }
        });
    }

    // Väntar in service workerns HARDENED_ACK. Timeout → false (vi vet inte att
    // spärren är verkställd), aldrig ett tyst "ja".
    // Varje operation bär ett eget id och sitt EGNA förväntade värde. Utan det
    // tog en väntande handler emot nästa bästa ACK och jämförde mot den
    // föränderliga globala `active`: om en annan flik hann ändra läget mitt i
    // väntan kunde en aktivering få kvittens för en avaktivering och ändå
    // rapportera lyckat. Nu ignoreras ACK som inte hör till just denna begäran.
    var ackRäknare = 0;
    function awaitAck(begärt, timeoutMs) {
        return new Promise(function (resolve) {
            var sw = navigator.serviceWorker;
            if (!sw || !sw.controller) { resolve(false); return; }
            var id = 'h' + (++ackRäknare) + '-' + Date.now().toString(36);
            var klar = false;
            function handler(ev) {
                var d = ev.data || {};
                if (d.type !== 'HARDENED_ACK' || d.id !== id) return;   // inte vår
                klar = true;
                sw.removeEventListener('message', handler);
                resolve(d.active === begärt);
            }
            sw.addEventListener('message', handler);
            try {
                sw.controller.postMessage({ type: 'HARDENED_SET', active: begärt, id: id });
            } catch (_) {
                sw.removeEventListener('message', handler);
                resolve(false);
                return;
            }
            setTimeout(function () {
                if (klar) return;
                sw.removeEventListener('message', handler);
                resolve(false);
            }, timeoutMs || 1500);
        });
    }

    // sync() är avsiktligt anropbar både fire-and-forget (äldre anropare) och
    // await:ad. Den lösta boolean:en betyder "spärren är bevisligen verkställd
    // i både IDB och service worker" — inte bara "meddelandet är skickat".
    //
    // `forvantat` är kritiskt: utan det bekräftade sync() bara att IDB och SW
    // stämmer med vad som RÅKAR ligga i localStorage. Misslyckades skrivningen
    // (full lagring, blockerad storage) läste den tillbaka `false`, speglade
    // `false` överallt, fick ack för `false` — och returnerade true. Anroparen
    // tolkade det som "härdat verkställt" och lämnade grönt UI med öppet nät.
    // Skicka därför alltid med det tillstånd du BEGÄRDE.
    function sync(forvantat) {
        active = readActive();
        try { if (bc) bc.postMessage({ type: 'sync' }); } catch (_) {}
        if (forvantat !== undefined && active !== forvantat) {
            console.warn('[hardened] Begärt läge ' + forvantat + ' men lagringen säger ' +
                active + ' — skrivningen gick inte igenom.');
            return Promise.resolve(false);
        }
        // Frys det värde operationen gäller. `active` kan hinna ändras av en
        // annan flik under den asynkrona IDB-transaktionen — då ska DENNA
        // operation misslyckas, inte tyst byta till det nya värdet.
        var begärt = active;
        return writeIdb(begärt).then(function (skrivenOk) {
            return awaitAck(begärt, 1500).then(function (ackOk) {
                // Ändrades läget under tiden? Då är vår kvittens inte längre
                // ett besked om nuläget.
                var oförändrat = readActive() === begärt;
                return skrivenOk && ackOk && oförändrat;
            });
        }).catch(function () { return false; });
    }

    // Härdat läge kan bara UPPRÄTTHÅLLAS av en kontrollerande service worker —
    // tile-bilder och andra resurser som inte går via fetch/XHR är osynliga för
    // sid-guarden. Saknas controller (force-refresh, allra första besöket) ska
    // härdat inte kunna påstås vara på. Väntar kort ifall workern är på väg att
    // ta över, i stället för att fälla direkt.
    function vantaPaController(timeoutMs) {
        return new Promise(function (resolve) {
            var sw = navigator.serviceWorker;
            if (!sw) { resolve(false); return; }
            if (sw.controller) { resolve(true); return; }
            var klar = false;
            function onChange() {
                if (!sw.controller) return;
                klar = true;
                sw.removeEventListener('controllerchange', onChange);
                resolve(true);
            }
            sw.addEventListener('controllerchange', onChange);
            setTimeout(function () {
                if (klar) return;
                sw.removeEventListener('controllerchange', onChange);
                resolve(!!sw.controller);
            }, timeoutMs || 3000);
        });
    }

    // Reparera ev. drift direkt vid sidladdning (IDB/SW kan ha missat en
    // toggle gjord från en sida utan guarden).
    sync();

    // Läser den persisterade loggen (skriven av service workern) så
    // härdat-testet kan visa evidens även för händelser som skedde innan
    // sidan öppnades.
    function lasLogg() {
        return new Promise(function (resolve) {
            try {
                var req = indexedDB.open('hv-hardened', 1);
                req.onupgradeneeded = function () { try { req.result.createObjectStore('kv'); } catch (_) {} };
                req.onerror = function () { resolve([]); };
                req.onsuccess = function () {
                    try {
                        var db = req.result;
                        var get = db.transaction('kv', 'readonly').objectStore('kv').get('logg');
                        get.onsuccess = function () { var v = get.result; db.close(); resolve(Array.isArray(v) ? v : []); };
                        get.onerror = function () { db.close(); resolve([]); };
                    } catch (_) { resolve([]); }
                };
            } catch (_) { resolve([]); }
        });
    }

    window.HVHardened = {
        isActive: function () { return active; },
        logg: lasLogg,
        loggaHandelse: loggaHandelse,
        sync: sync,
        // Explicit namn för anropare som MÅSTE vänta in verkställd spärr innan
        // de visar "Härdat: PÅ" (pmtiles-layer activate). Anropa med det
        // tillstånd du begärde: confirm(true).
        confirm: sync,
        awaitController: vantaPaController
    };
})();
