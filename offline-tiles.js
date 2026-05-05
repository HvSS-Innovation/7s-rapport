// ─────────────────────────────────────────────────────────────────────────────
//  OFFLINE-TILES — per-användares tile-cache (Fas 1 MVP)
//
//  Används av minkarta.html (Fas 1) och kommer återanvändas av
//  sensorskiss.html (Fas 2). Lagrar OpenTopoMap- och OSM-tiles i en separat
//  Cache API-namespace ('hv-offline-tiles-v1') som service-workern prioriterar
//  före nätverk för matchande tile-URL:er.
//
//  INTEGRITET / OPSEC:
//   - Cache API är same-origin: tiles cache:as under vår SW och kan inte
//     läsas cross-origin av tredje part.
//   - Nedladdningen är ett burst av tile-requests till OpenTopoMap/OSM och
//     avslöjar valt område för respektive tile-server. Modalen varnar
//     tydligt om detta.
//   - Cache rensas av "Glöm allt" (när den knappen byggs).
//
//  TILE-SERVER-RESPEKT:
//   - Hård cap: max 5 000 tiles / nedladdningssession.
//   - Throttling: 2 parallella, ~100 ms paus mellan starter.
//   - Fail-fast vid icke-2xx — ingen retry, ingen burst-upprepning.
//   - Källor: openstreetmap.org/copyright (Tile Usage Policy),
//     opentopomap.org/about.
// ─────────────────────────────────────────────────────────────────────────────

(function (global) {
    'use strict';

    var OFFLINE_CACHE = 'hv-offline-tiles-v1';
    var TILE_SUBDOMAINS = ['a', 'b', 'c'];
    var MAX_TILES = 5000;
    var WARN_TILES = 1000;
    var WARN_BYTES = 50 * 1024 * 1024;
    var BYTES_PER_TILE_AVG = 18 * 1024;
    var PARALLEL = 2;
    var THROTTLE_MS = 100;
    var STORAGE_KEY = 'offlineTiles.areas';

    // Speglar HybridTileLayer.getTileUrl i minkarta.html: OTM z≤17, OSM z 18–19.
    function tileUrl(z, x, y) {
        if (z <= 17) {
            var s = TILE_SUBDOMAINS[(x + y) % TILE_SUBDOMAINS.length];
            return 'https://' + s + '.tile.opentopomap.org/' + z + '/' + x + '/' + y + '.png';
        }
        return 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
    }

    // Standard Web Mercator-projektion: lat/lon → tile-koord.
    function lon2tile(lon, z) {
        return Math.floor((lon + 180) / 360 * Math.pow(2, z));
    }
    function lat2tile(lat, z) {
        var rad = lat * Math.PI / 180;
        return Math.floor(
            (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, z)
        );
    }

    function tilesForBbox(bbox, minZoom, maxZoom) {
        // bbox = { south, west, north, east } i grader.
        var out = [];
        for (var z = minZoom; z <= maxZoom; z++) {
            var xMin = lon2tile(bbox.west, z);
            var xMax = lon2tile(bbox.east, z);
            var yMin = lat2tile(bbox.north, z);
            var yMax = lat2tile(bbox.south, z);
            if (xMin > xMax) { var tx = xMin; xMin = xMax; xMax = tx; }
            if (yMin > yMax) { var ty = yMin; yMin = yMax; yMax = ty; }
            var nMax = Math.pow(2, z) - 1;
            xMin = Math.max(0, xMin); xMax = Math.min(nMax, xMax);
            yMin = Math.max(0, yMin); yMax = Math.min(nMax, yMax);
            for (var x = xMin; x <= xMax; x++) {
                for (var y = yMin; y <= yMax; y++) {
                    out.push({ z: z, x: x, y: y, url: tileUrl(z, x, y) });
                }
            }
        }
        return out;
    }

    function countTiles(bbox, minZoom, maxZoom) {
        var n = 0;
        for (var z = minZoom; z <= maxZoom; z++) {
            var xMin = lon2tile(bbox.west, z);
            var xMax = lon2tile(bbox.east, z);
            var yMin = lat2tile(bbox.north, z);
            var yMax = lat2tile(bbox.south, z);
            if (xMin > xMax) { var tx = xMin; xMin = xMax; xMax = tx; }
            if (yMin > yMax) { var ty = yMin; yMin = yMax; yMax = ty; }
            var nMax = Math.pow(2, z) - 1;
            xMin = Math.max(0, xMin); xMax = Math.min(nMax, xMax);
            yMin = Math.max(0, yMin); yMax = Math.min(nMax, yMax);
            n += (xMax - xMin + 1) * (yMax - yMin + 1);
        }
        return n;
    }

    function estimateBytes(tileCount) {
        return tileCount * BYTES_PER_TILE_AVG;
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' kB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
        return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    }

    // Cache API: bara resp.ok cachas. Speglar safePut i service-worker.js för
    // att undvika att felmeddelanden (403/429/500) fastnar som tile-bilder.
    async function fetchAndCache(cache, item, signal) {
        var resp = await fetch(item.url, {
            mode: 'cors',
            credentials: 'omit',
            referrerPolicy: 'strict-origin',
            signal: signal
        });
        if (!resp || !resp.ok) {
            throw new Error('HTTP ' + (resp ? resp.status : '?'));
        }
        await cache.put(item.url, resp.clone());
        var blob = await resp.blob();
        return blob.size;
    }

    // Throttlad nedladdning: max PARALLEL workers, ~THROTTLE_MS mellan starter.
    // Fail-fast: HTTP-fel räknas som fel, men avbryter inte hela jobbet — det
    // gör bara AbortSignal eller quota-exception. Tile-server-bans triggas av
    // burst, inte av ett enstaka 404.
    async function downloadTiles(items, opts) {
        opts = opts || {};
        var onProgress = opts.onProgress || function () {};
        var signal = opts.signal;
        // parallel/throttleMs konfigureras per anrop så standard "Spara
        // område offline" och "Kamuflage-nedladdning" kan ha olika
        // burst-profiler utan att duplicera nedladdnings-loop:en.
        var parallel = (typeof opts.parallel === 'number' && opts.parallel > 0)
            ? opts.parallel : PARALLEL;
        var throttleMs = (typeof opts.throttleMs === 'number' && opts.throttleMs >= 0)
            ? opts.throttleMs : THROTTLE_MS;
        // shouldPause: callback som workers kollar mellan tiles. När den
        // returnerar true vantar workers ~2 sek innan de kollar igen. Anvands
        // av startJob for auto-pause vid offline/lagt batteri (Fas 3).
        var shouldPause = opts.shouldPause || function () { return false; };
        var cache = await caches.open(OFFLINE_CACHE);

        var done = 0, failed = 0, bytes = 0;
        var idx = 0;

        async function waitWhilePaused() {
            while (shouldPause() && !(signal && signal.aborted)) {
                await new Promise(function (r) { setTimeout(r, 2000); });
            }
        }

        async function worker() {
            while (idx < items.length) {
                if (signal && signal.aborted) return;
                await waitWhilePaused();
                if (signal && signal.aborted) return;
                var i = idx++;
                var item = items[i];
                try {
                    var sz = await fetchAndCache(cache, item, signal);
                    bytes += sz;
                } catch (err) {
                    if (err && err.name === 'AbortError') return;
                    if (err && err.name === 'QuotaExceededError') {
                        throw err;
                    }
                    failed++;
                }
                done++;
                onProgress({ done: done, failed: failed, bytes: bytes, total: items.length });
                if (throttleMs > 0 && idx < items.length) {
                    await new Promise(function (r) { setTimeout(r, throttleMs); });
                }
            }
        }

        var workers = [];
        for (var w = 0; w < parallel; w++) workers.push(worker());
        await Promise.all(workers);
        return { done: done, failed: failed, bytes: bytes };
    }

    // ── Områdes-metadata i localStorage ─────────────────────────────────────
    function getStoredAreas() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            var parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) { return []; }
    }

    function saveAreaMeta(area) {
        var list = getStoredAreas();
        var i = list.findIndex(function (a) { return a.id === area.id; });
        if (i >= 0) list[i] = area; else list.push(area);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
        notifyChange();
    }

    function notifyChange() {
        try { global.dispatchEvent(new CustomEvent('offline-tiles:updated')); } catch (_) {}
    }

    function newAreaId() {
        return 'a_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    }

    // Räknar bara unika URL:er — om två områden överlappar är det inte ett
    // problem för delete (URL existerar bara som en cache-entry).
    async function removeArea(id) {
        var list = getStoredAreas();
        var area = list.find(function (a) { return a.id === id; });
        if (!area) return false;
        try {
            var cache = await caches.open(OFFLINE_CACHE);
            var items = tilesForBbox(area.bbox, area.minZoom, area.maxZoom);
            for (var i = 0; i < items.length; i++) {
                await cache.delete(items[i].url);
            }
        } catch (_) {
            // Forts. trots fel så att metadata försvinner — annars hänger
            // ett "spöke"-område kvar i listan utan tiles att rensa.
        }
        var next = list.filter(function (a) { return a.id !== id; });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (_) {}
        notifyChange();
        return true;
    }

    // ── Viewport-täckning ───────────────────────────────────────────────────
    // Räknar hur stor andel av tiles i nuvarande viewport som redan finns
    // i offline-cachen. Cap:ar på MAX_COVERAGE_TILES så att vi inte gör
    // tusentals cache.match-anrop när användaren zoomar ut. Returnerar
    // null om viewporten är för stor (UI:n visar då "—").
    var MAX_COVERAGE_TILES = 400;

    async function coverageFor(bounds, zoom) {
        var bbox = {
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast()
        };
        var n = countTiles(bbox, zoom, zoom);
        if (n === 0 || n > MAX_COVERAGE_TILES) return null;
        var items = tilesForBbox(bbox, zoom, zoom);
        var cache = await caches.open(OFFLINE_CACHE);
        var hits = 0;
        for (var i = 0; i < items.length; i++) {
            var hit = await cache.match(items[i].url);
            if (hit) hits++;
        }
        return { total: items.length, cached: hits, fraction: hits / items.length };
    }

    // Debouncad indikator-uppdaterare. Stylar statusEl utifrån täckning:
    // 100 % → grön, partiell → orange, 0 → muted.
    function attachCoverageIndicator(map, statusEl) {
        if (!map || !statusEl) return;
        var pending = null;
        var seq = 0;

        function update() {
            var mySeq = ++seq;
            if (pending) clearTimeout(pending);
            pending = setTimeout(async function () {
                pending = null;
                var z = Math.round(map.getZoom());
                var b = map.getBounds();
                try {
                    var cov = await coverageFor(b, z);
                    if (mySeq !== seq) return;
                    if (cov === null) {
                        statusEl.textContent = '';
                        statusEl.title = '';
                        return;
                    }
                    var pct = Math.round(cov.fraction * 100);
                    statusEl.textContent = 'offline ' + pct + '%';
                    statusEl.title = cov.cached + ' / ' + cov.total + ' tiles cachade i nuvarande vy';
                    if (pct >= 100) {
                        statusEl.style.color = '#4caf50';
                    } else if (pct > 0) {
                        statusEl.style.color = '#c8a24e';
                    } else {
                        statusEl.style.color = 'var(--text-muted)';
                    }
                } catch (_) {
                    if (mySeq !== seq) return;
                    statusEl.textContent = '';
                }
            }, 250);
        }

        map.on('moveend zoomend', update);
        global.addEventListener('offline-tiles:updated', update);
        update();
        return update;
    }

    // Leaflet-kontroll-variant: lägger en pille i kart-hörnet (default
    // top-right) med samma stilbas som zoom-kontrollen. Enhetligt över alla
    // sidors kart-modaler. Returnerar L.Control-instansen så anroparen kan
    // remove-a vid behov.
    function injectCoverageControlStyles() {
        if (document.getElementById('offline-tiles-cov-styles')) return;
        var css =
            '.ot-cov-ctrl{background:#fff;padding:4px 10px;font-family:Inter,system-ui,sans-serif;' +
                'font-size:0.78rem;font-weight:600;border-radius:4px;' +
                'box-shadow:0 1px 5px rgba(0,0,0,0.4);user-select:none;' +
                'cursor:default;letter-spacing:0.02em;line-height:1.4;' +
                'border:2px solid rgba(0,0,0,0.2)}';
        var style = document.createElement('style');
        style.id = 'offline-tiles-cov-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function attachCoverageControl(map, opts) {
        if (!map || typeof L === 'undefined' || !L.Control) return null;
        opts = opts || {};
        var position = opts.position || 'topright';
        injectCoverageControlStyles();

        var Control = L.Control.extend({
            onAdd: function () {
                var div = L.DomUtil.create('div', 'ot-cov-ctrl leaflet-control');
                div.style.display = 'none';
                // Hindra att klick/drag på kontrollen triggar kart-events
                // (annars kan zoom-kart-rörelse aktiveras vid tryck på pille:n).
                L.DomEvent.disableClickPropagation(div);
                L.DomEvent.disableScrollPropagation(div);
                this._div = div;
                return div;
            },
            update: function (text, color, title) {
                if (!this._div) return;
                if (!text) {
                    this._div.style.display = 'none';
                    return;
                }
                this._div.style.display = '';
                this._div.textContent = text;
                this._div.style.color = color || '#222';
                this._div.title = title || '';
            }
        });

        var ctrl = new Control({ position: position });
        ctrl.addTo(map);

        var pending = null;
        var seq = 0;

        function update() {
            var mySeq = ++seq;
            if (pending) clearTimeout(pending);
            pending = setTimeout(async function () {
                pending = null;
                var z = Math.round(map.getZoom());
                var b = map.getBounds();
                try {
                    var cov = await coverageFor(b, z);
                    if (mySeq !== seq) return;
                    if (cov === null) {
                        ctrl.update('', '', '');
                        return;
                    }
                    var pct = Math.round(cov.fraction * 100);
                    if (pct === 0) {
                        // Inget cachat i vyn → dölj helt så kontrollen inte
                        // skräpar UI:n när inget område laddats ner.
                        ctrl.update('', '', '');
                        return;
                    }
                    var color = pct >= 100 ? '#2e7d32' : '#c8632e';
                    var title = cov.cached + ' / ' + cov.total + ' tiles cachade i nuvarande vy';
                    ctrl.update('offline ' + pct + '%', color, title);
                } catch (_) {
                    if (mySeq !== seq) return;
                    ctrl.update('', '', '');
                }
            }, 250);
        }

        map.on('moveend zoomend', update);
        global.addEventListener('offline-tiles:updated', update);
        update();

        return ctrl;
    }

    // ── Sparade-områden-panel ───────────────────────────────────────────────
    // Renderar en lista i `container` (typ <div>). Kan kallas om för att
    // refresh:a efter add/delete. Tom lista → vänlig hint.
    var STALE_DAYS = 30;

    function ageText(savedAt) {
        if (!savedAt) return null;
        var t = new Date(savedAt).getTime();
        if (isNaN(t)) return null;
        var sec = Math.floor((Date.now() - t) / 1000);
        if (sec < 60) return 'just nu';
        if (sec < 3600) return Math.floor(sec / 60) + ' min';
        if (sec < 86400) return Math.floor(sec / 3600) + ' h';
        var days = Math.floor(sec / 86400);
        if (days < 14) return days + ' dagar';
        if (days < 60) return Math.floor(days / 7) + ' veckor';
        return Math.floor(days / 30) + ' mån';
    }
    function isStale(savedAt) {
        if (!savedAt) return false;
        var t = new Date(savedAt).getTime();
        if (isNaN(t)) return false;
        return (Date.now() - t) > STALE_DAYS * 86400 * 1000;
    }

    function renderAreasPanel(container, opts) {
        if (!container) return;
        opts = opts || {};
        var onChange = opts.onChange || function () {};
        var map = opts.map || null;
        injectModalStyles();
        container.innerHTML = '';

        // Header med "Importera fil"-knapp finns alltid, även när listan
        // är tom — annars går det inte att starta från ett delat paket
        // utan att först ha laddat ner ett område på enheten.
        var header = renderImportHeader();
        container.appendChild(header);

        var areas = getStoredAreas();
        if (!areas.length) {
            var hint = document.createElement('p');
            hint.style.cssText = 'font-size:0.82rem;color:var(--text-secondary);margin:8px 0 0';
            hint.innerHTML = 'Inga områden sparade än. Klicka <b>Spara område offline</b> ovanför kartan, eller importera ett paket nedan.';
            container.appendChild(hint);
            return;
        }

        // Senaste först.
        areas = areas.slice().sort(function (a, b) {
            return (b.savedAt || '').localeCompare(a.savedAt || '');
        });

        var list = document.createElement('div');
        list.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:10px';
        for (var i = 0; i < areas.length; i++) {
            list.appendChild(renderAreaRow(areas[i], onChange, map));
        }
        container.appendChild(list);
    }

    function renderImportHeader() {
        var bar = document.createElement('div');
        bar.style.cssText = 'display:flex;justify-content:flex-end;gap:6px;align-items:center';

        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.hvoffline,application/octet-stream';
        input.style.display = 'none';

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-ghost';
        btn.textContent = 'Importera paket…';
        btn.title = 'Läs in ett offline-paket (.hvoffline) som någon annan har exporterat';
        btn.addEventListener('click', function () { input.click(); });

        var status = document.createElement('span');
        status.style.cssText = 'font-size:0.74rem;color:var(--text-secondary)';

        input.addEventListener('change', async function () {
            var f = input.files && input.files[0];
            if (!f) return;
            btn.disabled = true;
            btn.textContent = 'Importerar…';
            status.textContent = '';
            try {
                var area = await importPackage(f, {
                    onProgress: function (p) {
                        status.textContent = p.done + ' / ' + p.total + ' tiles';
                    }
                });
                status.textContent = 'Importerat ' + (area.tileCount || 0) + ' tiles';
                status.style.color = '#4caf50';
            } catch (err) {
                status.textContent = 'Fel: ' + (err && err.message ? err.message : 'okänt');
                status.style.color = '#ff8a8a';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Importera paket…';
                input.value = '';
            }
        });

        bar.appendChild(status);
        bar.appendChild(btn);
        bar.appendChild(input);
        return bar;
    }

    function renderAreaRow(area, onChange, map) {
        var row = document.createElement('div');
        row.style.cssText = 'background:#0f240f;border:1px solid #2d4a2d;border-radius:4px;padding:10px 12px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap';
        row.dataset.areaId = area.id;

        var savedDate = '';
        try {
            savedDate = new Date(area.savedAt).toLocaleString('sv-SE', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (_) { savedDate = area.savedAt || ''; }

        var bboxLine =
            fmtCoord(area.bbox.north, true) + ', ' + fmtCoord(area.bbox.west, false) +
            '  →  ' +
            fmtCoord(area.bbox.south, true) + ', ' + fmtCoord(area.bbox.east, false);

        var age = ageText(area.savedAt);
        var stale = isStale(area.savedAt);
        var ageBadge = age
            ? ' <span style="color:' + (stale ? '#c8a24e' : 'var(--text-muted)') + ';font-weight:400">· ' + age + (stale ? ' (gammal)' : '') + '</span>'
            : '';

        var info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:200px;font-size:0.78rem;line-height:1.5;color:var(--text-primary)';
        var status = area.complete === false
            ? '<span style="color:#c8a24e">· avbruten</span>'
            : '';
        // Kamuflage-områden får en distinkt badge så operatören ser i
        // listan vilka som är medvetna bulk-downloads (potentiellt
        // beskärbara) och vilka som är vanlig "Spara område offline".
        var kindBadge = area.kind === 'kamuflage'
            ? ' <span style="color:#c8a24e;background:#2a1a0a;border:1px solid #c8a24e;border-radius:3px;padding:0 6px;font-size:0.66rem;letter-spacing:0.06em;text-transform:uppercase">Kamuflage</span>'
            : (area.kind === 'kamuflage-pruned'
                ? ' <span style="color:#8aaa8a;background:#0f240f;border:1px solid #2d4a2d;border-radius:3px;padding:0 6px;font-size:0.66rem;letter-spacing:0.06em;text-transform:uppercase">Beskuren</span>'
                : '');
        info.innerHTML =
            '<div style="font-weight:600;margin-bottom:2px">' + savedDate + kindBadge + ' ' + status + ageBadge + '</div>' +
            '<div style="color:var(--text-secondary);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:0.7rem">' +
                bboxLine +
            '</div>' +
            '<div style="color:var(--text-secondary);margin-top:2px">' +
                'z ' + area.minZoom + '–' + area.maxZoom +
                ' · ' + (area.tileCount || 0).toLocaleString('sv-SE') + ' tiles' +
                ' · ' + formatBytes(area.bytes || 0) +
            '</div>';

        var actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';

        if (map) {
            var refresh = document.createElement('button');
            refresh.type = 'button';
            refresh.className = 'btn btn-sm btn-ghost';
            refresh.textContent = 'Uppdatera';
            refresh.title = stale
                ? 'Området är äldre än ' + STALE_DAYS + ' dagar — uppdatera tiles från servern'
                : 'Ladda ner tiles på nytt och ersätt cache-entries';
            refresh.addEventListener('click', function () {
                refreshAreaWithModal(area.id, map);
            });
            actions.appendChild(refresh);
        }

        // Beskär-knappen visas bara på kamuflage-områden OCH bara om
        // kamuflage-modulen är inläst. Funktionen är bortkopplad från sajten
        // (2026-05-03) — knappen syns inte normalt, men logiken är kvar så
        // att importerade .hvoffline-paket med kind:kamuflage hanteras rätt
        // om modulen någon gång kopplas in igen.
        if (map && area.kind === 'kamuflage'
                && global.OfflineTilesKamuflage
                && typeof global.OfflineTilesKamuflage.openPruneModal === 'function') {
            var prune = document.createElement('button');
            prune.type = 'button';
            prune.className = 'btn btn-sm btn-ghost';
            prune.textContent = 'Beskär';
            prune.title = 'Välj ett delområde att behålla; resten av kamuflage-cachen raderas lokalt';
            prune.addEventListener('click', function () {
                global.OfflineTilesKamuflage.openPruneModal(area, map);
            });
            actions.appendChild(prune);
        }

        // Återuppta-knappen visas bara på avbrutna områden (complete: false).
        // Kollar vilka tiles som faktiskt saknas i cachen och startar ett
        // jobb med bara dem — sa redan-nedladdade tiles inte hamtas igen.
        if (area.complete === false) {
            var resume = document.createElement('button');
            resume.type = 'button';
            resume.className = 'btn btn-sm btn-ghost';
            resume.textContent = 'Återuppta';
            resume.title = 'Hämta de tiles som saknas — redan cachade hoppas över';
            resume.addEventListener('click', async function () {
                resume.disabled = true;
                resume.textContent = 'Förbereder…';
                try {
                    // Bestam throttling: vanliga omraden anvander defaults.
                    // Kamuflage-omraden anvander modul-en's egna konstanter
                    // om OfflineTilesKamuflage ar laddad (kamuflage ar
                    // bortkopplad fran sajten 2026-05-03 — fallback till
                    // defaults om modul-en saknas, vilket bara intraffar
                    // om nagon importerat ett gammalt kamuflage-paket).
                    var kamOpts = (area.kind === 'kamuflage' && global.OfflineTilesKamuflage)
                        ? {
                            parallel: global.OfflineTilesKamuflage.BULK_PARALLEL,
                            throttleMs: global.OfflineTilesKamuflage.BULK_THROTTLE_MS
                        }
                        : {};
                    var jobId = await resumeArea(area.id, kamOpts);
                    resume.textContent = jobId ? 'Pågår' : 'Klart';
                    setTimeout(function () { resume.remove(); onChange(); }, 1500);
                } catch (err) {
                    resume.textContent = 'Fel';
                    resume.title = (err && err.message) || 'Resume misslyckades';
                    setTimeout(function () {
                        resume.disabled = false;
                        resume.textContent = 'Återuppta';
                    }, 3000);
                }
            });
            actions.appendChild(resume);
        }

        var exp = document.createElement('button');
        exp.type = 'button';
        exp.className = 'btn btn-sm btn-ghost';
        exp.textContent = 'Exportera';
        exp.title = 'Spara området som .hvoffline-fil att dela till annan enhet';
        exp.addEventListener('click', async function () {
            exp.disabled = true;
            var origLabel = exp.textContent;
            exp.textContent = 'Exporterar…';
            try {
                var pkg = await exportArea(area.id, {
                    onProgress: function (p) {
                        exp.textContent = 'Exporterar ' + Math.round(p.done / p.total * 100) + '%';
                    }
                });
                var stamp = (area.savedAt || new Date().toISOString()).replace(/[:.]/g, '').slice(0, 15);
                var fname = 'hv-offline-' + area.id + '-' + stamp + '.hvoffline';
                downloadBlob(pkg.blob, fname);
                exp.textContent = 'Klar';
                setTimeout(function () { exp.textContent = origLabel; exp.disabled = false; }, 2000);
            } catch (err) {
                exp.textContent = 'Fel';
                exp.title = (err && err.message) ? err.message : 'Export misslyckades';
                setTimeout(function () { exp.textContent = origLabel; exp.disabled = false; }, 3000);
            }
        });
        actions.appendChild(exp);

        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn btn-sm btn-ghost';
        del.textContent = 'Radera';
        del.title = 'Tar bort tiles för det här området ur offline-cachen';
        del.addEventListener('click', async function () {
            if (!window.confirm('Radera området? Tiles tas bort ur offline-cachen.')) return;
            del.disabled = true;
            del.textContent = 'Raderar…';
            await removeArea(area.id);
            row.remove();
            onChange();
        });
        actions.appendChild(del);

        row.appendChild(info);
        row.appendChild(actions);
        return row;
    }

    // ── Export / import av offline-paket ───────────────────────────────────
    // Eget container-format (.hvoffline) — ingen tredjepart-zip-dep.
    //
    //   Offset  Bytes   Field
    //   0       4       Magic "HVOA"
    //   4       1       Version 0x01
    //   5..7    3       Reserved (noll)
    //   8       4       Manifest-länged (uint32 big-endian)
    //   12      N       UTF-8 JSON manifest (bbox, zoom-range, tile-index)
    //   12+N    ...     Konkatenerade tile-blobs (offset+length i manifest)
    //
    // Same-origin: paket kan delas via t.ex. Signal/SD-kort utan att tile-
    // server-loggen avslöjar att en kopia gjordes. Manifest innehåller
    // areans bbox men inga sensor-/min-data.
    var MAGIC_BYTES = [0x48, 0x56, 0x4F, 0x41]; // "HVOA"
    var PACKAGE_VERSION = 0x01;

    async function exportArea(id, opts) {
        opts = opts || {};
        var onProgress = opts.onProgress || function () {};
        var area = getStoredAreas().find(function (a) { return a.id === id; });
        if (!area) throw new Error('Området saknas');

        var items = tilesForBbox(area.bbox, area.minZoom, area.maxZoom);
        var cache = await caches.open(OFFLINE_CACHE);

        var manifest = {
            version: PACKAGE_VERSION,
            createdAt: new Date().toISOString(),
            area: {
                id: area.id,
                bbox: area.bbox,
                minZoom: area.minZoom,
                maxZoom: area.maxZoom,
                savedAt: area.savedAt,
                tileCount: 0,
                bytes: 0
            },
            tiles: []
        };

        var blobBuffers = [];
        var totalLen = 0;
        for (var i = 0; i < items.length; i++) {
            var hit = await cache.match(items[i].url);
            if (!hit) continue;
            var blob = await hit.blob();
            var ab = await blob.arrayBuffer();
            manifest.tiles.push({
                url: items[i].url,
                type: blob.type || 'image/png',
                length: ab.byteLength,
                offset: totalLen
            });
            blobBuffers.push(ab);
            totalLen += ab.byteLength;
            manifest.area.tileCount++;
            manifest.area.bytes += ab.byteLength;
            onProgress({ done: i + 1, total: items.length, bytes: totalLen });
        }

        var manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));
        var headerLen = 12;
        var totalSize = headerLen + manifestBytes.byteLength + totalLen;
        var out = new Uint8Array(totalSize);
        var dv = new DataView(out.buffer);

        out[0] = MAGIC_BYTES[0]; out[1] = MAGIC_BYTES[1];
        out[2] = MAGIC_BYTES[2]; out[3] = MAGIC_BYTES[3];
        out[4] = PACKAGE_VERSION;
        // bytes 5..7 lämnas som noll (reserved)
        dv.setUint32(8, manifestBytes.byteLength, false);
        out.set(manifestBytes, headerLen);

        var pos = headerLen + manifestBytes.byteLength;
        for (var k = 0; k < blobBuffers.length; k++) {
            out.set(new Uint8Array(blobBuffers[k]), pos);
            pos += blobBuffers[k].byteLength;
        }

        return {
            blob: new Blob([out], { type: 'application/octet-stream' }),
            manifest: manifest
        };
    }

    async function importPackage(file, opts) {
        opts = opts || {};
        var onProgress = opts.onProgress || function () {};
        var ab = await file.arrayBuffer();
        if (ab.byteLength < 12) throw new Error('Filen är för kort för att vara ett offline-paket');

        var dv = new DataView(ab);
        for (var m = 0; m < MAGIC_BYTES.length; m++) {
            if (dv.getUint8(m) !== MAGIC_BYTES[m]) {
                throw new Error('Inte ett giltigt offline-paket (felaktig magic-byte)');
            }
        }
        var version = dv.getUint8(4);
        if (version !== PACKAGE_VERSION) {
            throw new Error('Stöder inte paket-version ' + version);
        }
        var manifestLen = dv.getUint32(8, false);
        if (12 + manifestLen > ab.byteLength) {
            throw new Error('Skadat paket: manifest-längd är längre än filen');
        }

        var manifest;
        try {
            var manifestBytes = new Uint8Array(ab, 12, manifestLen);
            manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
        } catch (_) {
            throw new Error('Skadad manifest-JSON');
        }
        if (!manifest || !manifest.area || !Array.isArray(manifest.tiles)) {
            throw new Error('Manifest saknar förväntad struktur');
        }

        var dataStart = 12 + manifestLen;
        var cache = await caches.open(OFFLINE_CACHE);

        for (var i = 0; i < manifest.tiles.length; i++) {
            var t = manifest.tiles[i];
            if (!t || typeof t.url !== 'string' || typeof t.offset !== 'number' || typeof t.length !== 'number') {
                throw new Error('Skadad tile-post #' + i);
            }
            var start = dataStart + t.offset;
            var end = start + t.length;
            if (end > ab.byteLength) throw new Error('Tile-data sträcker sig utanför filen (#' + i + ')');
            var slice = ab.slice(start, end);
            var blob = new Blob([slice], { type: t.type || 'image/png' });
            var resp = new Response(blob, {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': t.type || 'image/png' }
            });
            await cache.put(t.url, resp);
            onProgress({ done: i + 1, total: manifest.tiles.length });
        }

        // Vid id-kollision: ge importerade kopian ett nytt id istället för
        // att skriva över existerande område. Användaren förväntar sig
        // sällan att import "ersätter" — additiv är säkrare default.
        var areaCopy = {
            id: manifest.area.id,
            bbox: manifest.area.bbox,
            minZoom: manifest.area.minZoom,
            maxZoom: manifest.area.maxZoom,
            tileCount: manifest.area.tileCount,
            bytes: manifest.area.bytes,
            savedAt: manifest.area.savedAt || new Date().toISOString(),
            complete: true
        };
        var existing = getStoredAreas().find(function (a) { return a.id === areaCopy.id; });
        if (existing) areaCopy.id = newAreaId();
        saveAreaMeta(areaCopy);

        return areaCopy;
    }

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    // ── Bakgrundsjobb ──────────────────────────────────────────────────────
    // En singleton _jobs-tabell med löpande nedladdningar. Modal-en startar
    // ett jobb via startJob(); det körs vidare även om modal-en stängs.
    // Bakgrundspille:n (renderJobsBar) lyssnar på 'offline-tiles:job-update'
    // och visar alla aktiva jobb. Designen är tight-decoupled: modal och pill
    // kommunicerar bara via event, inte via shared state-references.
    //
    // Fas 1 (audit/roadmap-bakgrundsnedladdning.md): om Service Worker är
    // aktiv delegeras själva fetch-loopen till SW så att jobbet överlever
    // sid-navigering. Lokala _jobs[jobId] fungerar då som spegelbild av SW:s
    // job-state — pille:n och modal-en bryr sig inte om var loopen kör.
    var _jobs = Object.create(null);

    // ── Service Worker-bro ─────────────────────────────────────────────────
    // canUseSW(): true om navigator.serviceWorker.controller finns. Vid
    // första pageload (innan SW har tagit kontroll) är controller null —
    // då hydreras lokal lista bara när SW skickar OT_JOBS_LIST efter ready.
    function canUseSW() {
        return typeof navigator !== 'undefined'
            && 'serviceWorker' in navigator
            && !!navigator.serviceWorker.controller;
    }

    function sendToSW(msg) {
        if (!canUseSW()) return false;
        try { navigator.serviceWorker.controller.postMessage(msg); return true; }
        catch (_) { return false; }
    }

    // Snapshot från SW innehåller inte controller/wakeLock. Vi bevarar dem
    // om jobbet redan finns lokalt så att cleanup på sida-sidan funkar.
    function applyJobSnapshot(snapshot) {
        if (!snapshot || !snapshot.id) return;
        var existing = _jobs[snapshot.id] || {};
        var merged = {
            id: snapshot.id,
            areaId: snapshot.areaId,
            label: snapshot.label,
            mode: snapshot.mode,
            kind: snapshot.kind,
            bbox: snapshot.bbox,
            minZoom: snapshot.minZoom,
            maxZoom: snapshot.maxZoom,
            total: snapshot.total,
            done: snapshot.done,
            bytes: snapshot.bytes,
            failed: snapshot.failed,
            status: snapshot.status,
            savedAt: snapshot.savedAt,
            paused: snapshot.paused,
            pauseReason: snapshot.pauseReason,
            error: snapshot.error ? new Error(snapshot.error) : null,
            // bevara sida-bara fält
            controller: existing.controller || null,
            wakeLock: existing.wakeLock || null,
            cleanup: existing.cleanup || null,
            delegated: true
        };
        _jobs[snapshot.id] = merged;
        // Persistera area-meta varje ~50 tiles + vid status != running.
        var lastSavedAt = existing.lastSavedDone || -100;
        var shouldSave = (merged.status !== 'running')
            || (merged.done - lastSavedAt >= 50)
            || (merged.done === merged.total);
        if (shouldSave && merged.bbox && typeof merged.minZoom === 'number') {
            try {
                saveAreaMeta({
                    id: merged.areaId,
                    kind: merged.kind || 'area',
                    bbox: merged.bbox,
                    minZoom: merged.minZoom,
                    maxZoom: merged.maxZoom,
                    tileCount: merged.done,
                    bytes: merged.bytes,
                    savedAt: merged.savedAt,
                    complete: merged.done === merged.total
                });
                merged.lastSavedDone = merged.done;
            } catch (_) { /* localStorage full / locked → ignorera */ }
        } else {
            merged.lastSavedDone = lastSavedAt;
        }

        ensureJobsBar();
        emitJobUpdate(merged.id);

        if (merged.status !== 'running') {
            if (existing.cleanup) {
                try { existing.cleanup(); } catch (_) {}
                merged.cleanup = null;
            }
            if (existing.wakeLock) {
                try { existing.wakeLock.release(); } catch (_) {}
                merged.wakeLock = null;
            }
        }
    }

    function handleSwMessage(ev) {
        var data = ev.data || {};
        if (data.type === 'OT_PROGRESS') {
            if (data.job === null) {
                // SW signalerar att jobbet är färdigrensat på sin sida.
                if (_jobs[data.jobId]) {
                    delete _jobs[data.jobId];
                    emitJobUpdate(data.jobId);
                }
                return;
            }
            applyJobSnapshot(data.job);
        } else if (data.type === 'OT_JOBS_LIST') {
            var list = Array.isArray(data.jobs) ? data.jobs : [];
            for (var i = 0; i < list.length; i++) applyJobSnapshot(list[i]);
            // Fas 4: efter hydrering — om någon area är complete:false utan
            // aktivt job, visa resume-toast en gång per session.
            maybeShowResumeToast();
        }
    }

    // ── Resume-toast (Fas 4) ────────────────────────────────────────────────
    // En sida som öppnas efter att alla flikar varit stängda mid-download
    // hittar ett complete:false-område utan aktivt SW-jobb. Toast:en
    // pekar användaren mot offline-listan där "Återuppta"-knappen finns.
    var RESUME_TOAST_KEY = 'ot-resume-toast-shown';
    function maybeShowResumeToast() {
        try {
            if (sessionStorage.getItem(RESUME_TOAST_KEY)) return;
        } catch (_) {}
        var areas = getStoredAreas();
        var incomplete = [];
        for (var i = 0; i < areas.length; i++) {
            if (areas[i].complete === false) incomplete.push(areas[i]);
        }
        if (!incomplete.length) return;
        var activeAreaIds = Object.create(null);
        var jobs = getActiveJobs();
        for (var k = 0; k < jobs.length; k++) {
            if (jobs[k].areaId) activeAreaIds[jobs[k].areaId] = true;
        }
        var stuckCount = 0;
        for (var m = 0; m < incomplete.length; m++) {
            if (!activeAreaIds[incomplete[m].id]) stuckCount++;
        }
        if (!stuckCount) return;
        try { sessionStorage.setItem(RESUME_TOAST_KEY, '1'); } catch (_) {}
        showResumeToast(stuckCount);
    }

    function showResumeToast(count) {
        if (document.getElementById('ot-resume-toast')) return;
        var t = document.createElement('div');
        t.id = 'ot-resume-toast';
        var plural = count > 1;
        t.innerHTML =
            'Du har ' + count + ' avbruten' + (plural ? 'a' : '') +
            ' nedladdning' + (plural ? 'ar' : '') +
            '.<br>Öppna offline-listan i kartan för att återuppta.';
        t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
            'background:#152815;color:#c8e6c9;border:1px solid #c8a24e;border-radius:10px;' +
            'padding:14px 20px;font-size:0.82rem;line-height:1.5;z-index:99999;max-width:340px;' +
            'text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.5);opacity:0;' +
            'transition:opacity 0.4s;font-family:Inter,system-ui,sans-serif';
        document.body.appendChild(t);
        requestAnimationFrame(function () { t.style.opacity = '1'; });
        setTimeout(function () {
            t.style.opacity = '0';
            setTimeout(function () { t.remove(); }, 400);
        }, 6000);
    }

    var _swListenerInstalled = false;
    function requestJobsList() {
        if (!navigator.serviceWorker.controller) return;
        try {
            navigator.serviceWorker.controller.postMessage({ type: 'OT_LIST_JOBS' });
        } catch (_) {}
    }

    function ensureSwListener() {
        if (_swListenerInstalled) return;
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
        _swListenerInstalled = true;
        navigator.serviceWorker.addEventListener('message', handleSwMessage);
        // Vänta på ready och fråga efter aktiva jobb. Hydrerar pille:n om
        // ett jobb startats i annan flik och fortfarande lever i SW.
        if (navigator.serviceWorker.ready && navigator.serviceWorker.ready.then) {
            navigator.serviceWorker.ready.then(requestJobsList);
        }
        // På första-någonsin-besök är `controller` null tills SW activate +
        // claim körs. controllerchange-eventet fyrar då, och vi frågar igen
        // så pille:n hydreras även om sidan laddats innan SW tagit kontroll.
        navigator.serviceWorker.addEventListener('controllerchange', requestJobsList);
        // När fliken kommer tillbaka i fokus: fråga igen för att täcka
        // edge-case där SW-meddelanden missats medan fliken var bakgrundad
        // (browser kan throttla postMessage till bakgrundsflikar).
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') requestJobsList();
        });
    }
    // Installera lyssnaren direkt — pille:n syns även om sidan inte själv
    // startat något jobb.
    ensureSwListener();

    // Resume-toast fallback: om SW inte hinner svara med OT_JOBS_LIST inom
    // 1.5s (eller saknas helt), kolla ändå om det finns avbrutna områden.
    setTimeout(function () { try { maybeShowResumeToast(); } catch (_) {} }, 1500);

    function emitJobUpdate(jobId) {
        try {
            global.dispatchEvent(new CustomEvent('offline-tiles:job-update', {
                detail: { jobId: jobId, job: _jobs[jobId] || null }
            }));
        } catch (_) {}
    }

    function getJob(jobId) { return _jobs[jobId] || null; }
    function getActiveJobs() {
        var out = [];
        for (var k in _jobs) out.push(_jobs[k]);
        return out;
    }

    function cancelJob(jobId) {
        var j = _jobs[jobId];
        if (!j) return;
        if (j.delegated) {
            sendToSW({ type: 'OT_CANCEL', jobId: jobId });
            return;
        }
        if (j.controller) j.controller.abort();
    }

    // ── Auto-pause + Wake Lock (Fas 3) ─────────────────────────────────────
    // Vid offline → paus tills nät kommer tillbaka. Vid batteri < 20 % och
    // inte laddande → paus tills laddning eller nivå höjs. Wake Lock håller
    // skärmen aktiv så schemalagda nattliga downloads inte avbryts av OS:ens
    // sömn. Battery Status API är borttaget i Firefox; pause-checken tål
    // `undefined` graciöst.
    var BATTERY_PAUSE_THRESHOLD = 0.2;

    function setJobPause(job, reason) {
        if (job.status !== 'running') return;
        if (job.paused && job.pauseReason === reason) return;
        job.paused = true;
        job.pauseReason = reason;
        if (job.delegated) {
            sendToSW({ type: 'OT_PAUSE', jobId: job.id, paused: true, reason: reason });
        }
        emitJobUpdate(job.id);
    }
    function clearJobPause(job, reason) {
        if (!job.paused) return;
        // Bara den anledning som satt pausen får clear:a den. Annars skulle
        // 'online' kunna släppa en battery-pause.
        if (reason && job.pauseReason !== reason) return;
        job.paused = false;
        job.pauseReason = null;
        if (job.delegated) {
            sendToSW({ type: 'OT_PAUSE', jobId: job.id, paused: false, reason: null });
        }
        emitJobUpdate(job.id);
    }

    function installAutoPause(job) {
        var battery = null;
        var batteryCheck = null;

        function onOffline() { setJobPause(job, 'offline'); }
        function onOnline() { clearJobPause(job, 'offline'); }
        global.addEventListener('offline', onOffline);
        global.addEventListener('online', onOnline);
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            setJobPause(job, 'offline');
        }

        if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
            navigator.getBattery().then(function (bat) {
                battery = bat;
                batteryCheck = function () {
                    if (bat.level < BATTERY_PAUSE_THRESHOLD && !bat.charging) {
                        setJobPause(job, 'battery');
                    } else {
                        clearJobPause(job, 'battery');
                    }
                };
                bat.addEventListener('levelchange', batteryCheck);
                bat.addEventListener('chargingchange', batteryCheck);
                batteryCheck();
            }).catch(function () { /* API saknas eller blockerad */ });
        }

        return function cleanup() {
            global.removeEventListener('offline', onOffline);
            global.removeEventListener('online', onOnline);
            if (battery && batteryCheck) {
                try {
                    battery.removeEventListener('levelchange', batteryCheck);
                    battery.removeEventListener('chargingchange', batteryCheck);
                } catch (_) {}
            }
        };
    }

    async function acquireWakeLock() {
        if (typeof navigator === 'undefined' || !navigator.wakeLock) return null;
        try {
            return await navigator.wakeLock.request('screen');
        } catch (_) {
            return null;
        }
    }

    function installWakeLockReacquire(job) {
        var handler = async function () {
            // OS:et släpper Wake Lock automatiskt när skärmen blir mörk.
            // Re-acquire när användaren tittar på skärmen igen och jobbet
            // fortfarande kör.
            if (document.visibilityState === 'visible' && job.status === 'running' && !job.wakeLock) {
                job.wakeLock = await acquireWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handler);
        return function cleanup() {
            document.removeEventListener('visibilitychange', handler);
        };
    }

    // Startar en nedladdning som ett bakgrundsjobb. Returnerar jobId direkt;
    // jobbets framgång/avslut signaleras via event-strömmen.
    //
    // Om Service Worker är aktiv (canUseSW) körs själva fetch-loopen i SW så
    // att jobbet överlever sid-navigering. Sidan håller ett spegel-job-objekt
    // i _jobs och hydrerar det från OT_PROGRESS-meddelanden. Saknas SW (t.ex.
    // Firefox incognito) går vi tillbaka till in-page-loopen oförändrat.
    function startJob(spec) {
        var jobId = 'j_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);
        // spec.items: valfri override som anvands av resumeArea — bara
        // saknade tiles laddas ner istallet for hela bbox-uppsattningen.
        var items = (spec.items && spec.items.length)
            ? spec.items
            : tilesForBbox(spec.bbox, spec.minZoom, spec.maxZoom);
        var fullCount = (typeof spec.totalTiles === 'number' && spec.totalTiles > 0)
            ? spec.totalTiles
            : items.length;
        var alreadyDone = (typeof spec.alreadyDone === 'number' && spec.alreadyDone >= 0)
            ? spec.alreadyDone : 0;
        var areaId = spec.areaId || newAreaId();
        var savedAt = new Date().toISOString();

        // kind = 'area' (default) eller 'kamuflage'. Kamuflage-jobb laddar
        // ner ett medvetet stort område som omsluter verkansområdet — se
        // audit/roadmap-kamuflage-nedladdning.md. Persisteras i area-meta så
        // att UI:n kan visa det och Fas 2 (beskär) kan filtrera på det.
        var kind = spec.kind || 'area';

        var useSW = canUseSW();
        var controller = (!useSW && typeof AbortController !== 'undefined')
            ? new AbortController() : null;

        var job = {
            id: jobId,
            areaId: areaId,
            label: spec.label || '',
            mode: spec.mode || 'new',
            kind: kind,
            bbox: spec.bbox,
            minZoom: spec.minZoom,
            maxZoom: spec.maxZoom,
            total: fullCount,
            done: alreadyDone,
            bytes: 0,
            failed: 0,
            status: 'running',
            controller: controller,
            savedAt: savedAt,
            error: null,
            paused: false,
            pauseReason: null,
            wakeLock: null,
            delegated: useSW,
            cleanup: null
        };
        _jobs[jobId] = job;
        emitJobUpdate(jobId);
        ensureJobsBar();

        // Wake Lock + auto-pause installeras synkront sa att events fangas
        // direkt — t.ex. om enheten redan ar offline nar jobbet startar.
        var cleanupAutoPause = installAutoPause(job);
        var cleanupWakeLock = installWakeLockReacquire(job);
        acquireWakeLock().then(function (lock) { job.wakeLock = lock; });
        job.cleanup = function () {
            try { cleanupAutoPause(); } catch (_) {}
            try { cleanupWakeLock(); } catch (_) {}
        };

        if (useSW) {
            // SW-läge: skicka spec + items, lyssna på OT_PROGRESS via global
            // handleSwMessage. applyJobSnapshot() driver pille + saveAreaMeta.
            sendToSW({
                type: 'OT_START_JOB',
                spec: {
                    jobId: jobId,
                    items: items,
                    totalTiles: fullCount,
                    alreadyDone: alreadyDone,
                    parallel: spec.parallel,
                    throttleMs: spec.throttleMs,
                    bbox: spec.bbox,
                    minZoom: spec.minZoom,
                    maxZoom: spec.maxZoom,
                    areaId: areaId,
                    kind: kind,
                    mode: spec.mode || 'new',
                    label: spec.label || '',
                    savedAt: savedAt
                }
            });
            return jobId;
        }

        (async function run() {
            try {
                var result = await downloadTiles(items, {
                    signal: controller ? controller.signal : undefined,
                    parallel: spec.parallel,
                    throttleMs: spec.throttleMs,
                    shouldPause: function () { return job.paused; },
                    onProgress: function (p) {
                        job.done = alreadyDone + p.done;
                        job.bytes = p.bytes;
                        job.failed = p.failed;
                        emitJobUpdate(jobId);
                        if (p.done % 50 === 0 || p.done === p.total) {
                            saveAreaMeta({
                                id: areaId,
                                kind: kind,
                                bbox: spec.bbox,
                                minZoom: spec.minZoom,
                                maxZoom: spec.maxZoom,
                                tileCount: alreadyDone + p.done,
                                bytes: p.bytes,
                                savedAt: savedAt,
                                complete: (alreadyDone + p.done) === fullCount
                            });
                        }
                    }
                });
                job.status = 'done';
                job.done = alreadyDone + result.done;
                job.bytes = result.bytes;
                job.failed = result.failed;
            } catch (err) {
                job.error = err;
                job.status = (err && err.name === 'AbortError') ? 'aborted'
                          : (err && err.name === 'QuotaExceededError') ? 'quota'
                          : 'error';
            } finally {
                cleanupAutoPause();
                cleanupWakeLock();
                if (job.wakeLock) {
                    try { await job.wakeLock.release(); } catch (_) {}
                    job.wakeLock = null;
                }
            }
            emitJobUpdate(jobId);
            // Behåll en stund så pille:n kan visa "klart" innan den fader ut.
            setTimeout(function () {
                delete _jobs[jobId];
                emitJobUpdate(jobId);
            }, 5000);
        })();

        return jobId;
    }

    // Återupptar ett område där `complete: false`. Kollar vilka tiles som
    // redan finns i cachen och startar ett nytt jobb med bara de saknade.
    // Behåller area-id så listan inte växer med duplikat.
    async function resumeArea(id, opts) {
        opts = opts || {};
        var area = getStoredAreas().find(function (a) { return a.id === id; });
        if (!area) throw new Error('Området saknas');
        if (area.complete) return null;

        var allItems = tilesForBbox(area.bbox, area.minZoom, area.maxZoom);
        var cache = await caches.open(OFFLINE_CACHE);
        var missing = [];
        for (var i = 0; i < allItems.length; i++) {
            var hit = await cache.match(allItems[i].url);
            if (!hit) missing.push(allItems[i]);
        }

        if (!missing.length) {
            // Allt finns redan — markera complete och avsluta.
            saveAreaMeta(Object.assign({}, area, { complete: true }));
            return null;
        }

        return startJob({
            bbox: area.bbox,
            minZoom: area.minZoom,
            maxZoom: area.maxZoom,
            kind: area.kind || 'area',
            mode: 'resume',
            areaId: area.id,
            items: missing,
            totalTiles: allItems.length,
            alreadyDone: allItems.length - missing.length,
            parallel: opts.parallel,
            throttleMs: opts.throttleMs
        });
    }

    // ── Bakgrunds-pille (UI) ───────────────────────────────────────────────
    // Singleton som ritar en flytande lista över aktiva nedladdningar längst
    // ner i fönstret. Auto-tom när inga jobb finns. Klick på avbryt kallar
    // cancelJob; klick på pille (utanför avbryt) öppnar full-modal igen.
    function ensureJobsBar() {
        if (document.getElementById('offline-tiles-jobsbar')) return;
        injectModalStyles();
        var bar = document.createElement('div');
        bar.id = 'offline-tiles-jobsbar';
        bar.className = 'ot-jobsbar';
        document.body.appendChild(bar);
        global.addEventListener('offline-tiles:job-update', function () {
            renderJobsBar(bar);
        });
        renderJobsBar(bar);
    }

    function renderJobsBar(bar) {
        bar = bar || document.getElementById('offline-tiles-jobsbar');
        if (!bar) return;
        var jobs = getActiveJobs();
        if (!jobs.length) {
            bar.innerHTML = '';
            bar.style.display = 'none';
            return;
        }
        bar.style.display = '';
        // Senaste först.
        jobs.sort(function (a, b) { return (b.savedAt || '').localeCompare(a.savedAt || ''); });

        var html = '';
        for (var i = 0; i < jobs.length; i++) {
            var j = jobs[i];
            var pct = j.total ? Math.round(j.done / j.total * 100) : 0;
            var label = j.mode === 'refresh' ? 'Uppdaterar'
                      : j.mode === 'resume' ? 'Återupptar'
                      : (j.kind === 'kamuflage' ? 'Kamuflage' : 'Laddar ner');
            var statusTxt = '';
            if (j.status === 'done') { statusTxt = 'Klart'; pct = 100; }
            else if (j.status === 'aborted') statusTxt = 'Avbruten';
            else if (j.status === 'error') statusTxt = 'Fel';
            else if (j.status === 'quota') statusTxt = 'Slut på utrymme';
            else if (j.paused) {
                var reasonTxt = j.pauseReason === 'offline' ? 'inget nät'
                              : j.pauseReason === 'battery' ? 'lågt batteri'
                              : 'manuell';
                statusTxt = 'Pausad: ' + reasonTxt + ' · ' + j.done + ' / ' + j.total;
            }
            else statusTxt = j.done + ' / ' + j.total + ' · ' + formatBytes(j.bytes) +
                              (j.failed ? ' · ' + j.failed + ' fel' : '');

            html +=
                '<div class="ot-jobpill" data-job="' + j.id + '" data-status="' + j.status + '" data-paused="' + (j.paused ? '1' : '0') + '">' +
                    '<div class="ot-jobpill-head">' +
                        '<span class="ot-jobpill-label">' + label + (j.label ? ': ' + j.label : '') + '</span>' +
                        (j.status === 'running'
                            ? '<button type="button" class="ot-jobpill-x" data-cancel="' + j.id + '" title="Avbryt">×</button>'
                            : '') +
                    '</div>' +
                    '<div class="ot-jobpill-status">' + statusTxt + '</div>' +
                    '<div class="ot-jobpill-bar"><div class="ot-jobpill-fill" style="width:' + pct + '%"></div></div>' +
                '</div>';
        }
        bar.innerHTML = html;

        var cancels = bar.querySelectorAll('[data-cancel]');
        for (var k = 0; k < cancels.length; k++) {
            cancels[k].addEventListener('click', function (e) {
                e.stopPropagation();
                cancelJob(this.getAttribute('data-cancel'));
            });
        }
    }

    // ── Modal ───────────────────────────────────────────────────────────────
    // Bygger en lättviktig modal mot DOM. Matchar layoutstil i minkarta.html
    // (dark green palette + .btn .btn-sm). Allt CSS injiceras lokalt till
    // modalen för att inte vara beroende av sidans stilark.
    function injectModalStyles() {
        if (document.getElementById('offline-tiles-styles')) return;
        var css =
            '.ot-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px}' +
            // Panel-mode: gor overlay genomskinligt + non-interactive sa
            // anvandaren kan klicka pa kartan bakom (panorera, zooma).
            // Modal-en sjalv halls klickbar via pointer-events:auto.
            '.ot-overlay.ot-overlay-panel{background:rgba(0,0,0,0.15);pointer-events:none;align-items:flex-end;justify-content:flex-end;padding:12px}' +
            '.ot-overlay.ot-overlay-panel .ot-modal{pointer-events:auto;max-width:420px}' +
            '.ot-modal{background:#1a321a;border:1px solid #2d4a2d;border-radius:8px;padding:16px;max-width:560px;width:100%;max-height:90vh;overflow:auto;color:#e8f0e8;font-family:Inter,system-ui,sans-serif}' +
            '.ot-modal h3{margin:0 0 8px;font-size:1rem;letter-spacing:0.04em}' +
            '.ot-modal label{display:block;font-size:0.72rem;color:#8aaa8a;margin-top:10px;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.06em}' +
            '.ot-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
            '.ot-modal input[type=range]{width:100%;accent-color:#4caf50}' +
            '.ot-modal .ot-bbox{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:0.72rem;color:#8aaa8a;background:#0f240f;padding:8px;border-radius:4px;border:1px solid #2d4a2d;line-height:1.5;white-space:pre-wrap}' +
            '.ot-modal .ot-warn{background:#2a1a0a;border:1px solid #c8a24e;color:#c8a24e;padding:8px 12px;border-radius:4px;font-size:0.74rem;margin:10px 0;line-height:1.45}' +
            '.ot-modal .ot-block{background:#3d1a1a;border:1px solid #c62828;color:#ff8a8a;padding:8px 12px;border-radius:4px;font-size:0.74rem;margin:10px 0;line-height:1.45}' +
            '.ot-modal .ot-stat{display:flex;justify-content:space-between;font-size:0.78rem;margin:8px 0;color:#e8f0e8;background:#0f240f;padding:8px 12px;border-radius:4px;border:1px solid #2d4a2d}' +
            '.ot-modal .ot-stat b{color:#4caf50;font-weight:600}' +
            '.ot-modal .ot-actions{display:flex;gap:8px;margin-top:12px;justify-content:flex-end}' +
            '.ot-modal .ot-btn{padding:8px 14px;border-radius:4px;border:1px solid #2d4a2d;background:#1a321a;color:#e8f0e8;font-family:inherit;font-size:0.82rem;cursor:pointer}' +
            '.ot-modal .ot-btn:hover{background:#243d24}' +
            '.ot-modal .ot-btn-primary{background:#4caf50;color:#0d1f0d;border-color:#4caf50;font-weight:600}' +
            '.ot-modal .ot-btn-primary:hover{background:#66bb6a}' +
            '.ot-modal .ot-btn-primary:disabled{background:#2d4a2d;color:#5a7a5a;cursor:not-allowed}' +
            '.ot-modal .ot-progress{height:8px;background:#0f240f;border-radius:4px;overflow:hidden;border:1px solid #2d4a2d;margin-top:8px}' +
            '.ot-modal .ot-progress-fill{height:100%;background:#4caf50;width:0;transition:width 0.2s}' +
            '.ot-modal .ot-confirm{display:flex;align-items:center;gap:8px;font-size:0.78rem;color:#c8a24e;margin-top:8px;text-transform:none;letter-spacing:0}' +
            '.ot-jobsbar{position:fixed;bottom:12px;right:12px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:320px;font-family:Inter,system-ui,sans-serif;pointer-events:auto}' +
            '.ot-jobpill{background:#152815;border:1px solid #2d4a2d;border-radius:6px;padding:10px 12px;color:#e8f0e8;box-shadow:0 4px 12px rgba(0,0,0,0.4);font-size:0.78rem}' +
            '.ot-jobpill[data-status="done"]{border-color:#4caf50;opacity:0.9}' +
            '.ot-jobpill[data-status="aborted"]{border-color:#c8a24e;opacity:0.85}' +
            '.ot-jobpill[data-paused="1"]{border-color:#c8a24e}' +
            '.ot-jobpill[data-paused="1"] .ot-jobpill-fill{background:#c8a24e}' +
            '.ot-jobpill[data-status="error"],.ot-jobpill[data-status="quota"]{border-color:#c62828;opacity:0.9}' +
            '.ot-jobpill-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px}' +
            '.ot-jobpill-label{font-weight:600;color:#c8e6c9;letter-spacing:0.04em;text-transform:uppercase;font-size:0.7rem}' +
            '.ot-jobpill-x{background:none;border:1px solid #2d4a2d;color:#8aaa8a;border-radius:4px;width:24px;height:24px;cursor:pointer;font-size:1rem;line-height:1;display:flex;align-items:center;justify-content:center;padding:0}' +
            '.ot-jobpill-x:hover{background:#3d1a1a;color:#ff8a8a;border-color:#c62828}' +
            '.ot-jobpill-status{color:#8aaa8a;font-size:0.72rem;font-family:ui-monospace,Menlo,Consolas,monospace;margin-bottom:6px}' +
            '.ot-jobpill-bar{height:4px;background:#0f240f;border-radius:2px;overflow:hidden;border:1px solid #2d4a2d}' +
            '.ot-jobpill-fill{height:100%;background:#4caf50;transition:width 0.2s}';
        var style = document.createElement('style');
        style.id = 'offline-tiles-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function fmtCoord(v, isLat) {
        var dir = isLat ? (v >= 0 ? 'N' : 'S') : (v >= 0 ? 'E' : 'W');
        return Math.abs(v).toFixed(4) + '° ' + dir;
    }

    function openModal(map, opts) {
        opts = opts || {};
        var refreshArea = opts.area || null;
        var isRefresh = !!refreshArea;

        if (!map || typeof map.getBounds !== 'function') {
            console.warn('[offline-tiles] openModal: map saknas eller saknar getBounds');
            return;
        }
        injectModalStyles();

        var bbox, initMin, initMax, bboxLabelTxt;
        if (isRefresh) {
            bbox = refreshArea.bbox;
            initMin = refreshArea.minZoom;
            initMax = refreshArea.maxZoom;
            bboxLabelTxt = 'Bounding box (sparat område)';
        } else {
            var bounds = map.getBounds();
            bbox = {
                south: bounds.getSouth(),
                west: bounds.getWest(),
                north: bounds.getNorth(),
                east: bounds.getEast()
            };
            var currentZoom = Math.round(map.getZoom());
            initMin = Math.max(8, currentZoom - 1);
            initMax = Math.min(17, currentZoom + 1);
            if (initMin > initMax) initMin = initMax;
            bboxLabelTxt = 'Bounding box (nuvarande vy)';
        }

        var titleTxt = isRefresh ? 'UPPDATERA OFFLINE-OMRÅDE' : 'SPARA OMRÅDE OFFLINE';
        var startTxt = isRefresh ? 'Uppdatera' : 'Spara';
        var startTxtRunning = isRefresh ? 'Uppdaterar…' : 'Laddar…';

        var overlay = document.createElement('div');
        overlay.className = 'ot-overlay';
        overlay.innerHTML =
            '<div class="ot-modal" role="dialog" aria-label="' + titleTxt + '">' +
                '<h3>' + titleTxt + '</h3>' +
                '<div class="ot-warn">Nedladdningen avslöjar valt område för tile-servern (OpenTopoMap / OSM). Gör den helst från en annan plats än ni ska in i, och på ett annat nät.</div>' +
                '<label>' + bboxLabelTxt + '</label>' +
                '<div class="ot-bbox" id="otBbox"></div>' +
                '<div class="ot-row" style="margin-top:12px">' +
                    '<div>' +
                        '<label>Min zoom: <span id="otMinLbl"></span></label>' +
                        '<input type="range" id="otMin" min="6" max="17" step="1">' +
                    '</div>' +
                    '<div>' +
                        '<label>Max zoom: <span id="otMaxLbl"></span></label>' +
                        '<input type="range" id="otMax" min="6" max="17" step="1">' +
                    '</div>' +
                '</div>' +
                '<div class="ot-stat"><span>Tiles att ladda ner</span><b id="otCount">—</b></div>' +
                '<div class="ot-stat"><span>Uppskattad storlek</span><b id="otBytes">—</b></div>' +
                '<div id="otStatus"></div>' +
                '<div class="ot-progress" id="otProgressWrap" style="display:none"><div class="ot-progress-fill" id="otProgressFill"></div></div>' +
                '<div class="ot-actions">' +
                    '<button type="button" class="ot-btn" id="otBackground" style="display:none">Kör i bakgrunden</button>' +
                    '<button type="button" class="ot-btn" id="otCancel">Stäng</button>' +
                    '<button type="button" class="ot-btn ot-btn-primary" id="otStart">' + startTxt + '</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        var bboxEl = overlay.querySelector('#otBbox');
        bboxEl.textContent =
            'NV: ' + fmtCoord(bbox.north, true) + ', ' + fmtCoord(bbox.west, false) + '\n' +
            'SE: ' + fmtCoord(bbox.south, true) + ', ' + fmtCoord(bbox.east, false);

        var minSlider = overlay.querySelector('#otMin');
        var maxSlider = overlay.querySelector('#otMax');
        var minLbl = overlay.querySelector('#otMinLbl');
        var maxLbl = overlay.querySelector('#otMaxLbl');
        var countEl = overlay.querySelector('#otCount');
        var bytesEl = overlay.querySelector('#otBytes');
        var statusEl = overlay.querySelector('#otStatus');
        var startBtn = overlay.querySelector('#otStart');
        var cancelBtn = overlay.querySelector('#otCancel');
        var bgBtn = overlay.querySelector('#otBackground');
        var progressWrap = overlay.querySelector('#otProgressWrap');
        var progressFill = overlay.querySelector('#otProgressFill');

        minSlider.value = initMin;
        maxSlider.value = initMax;

        var activeJobId = null;
        var running = false;

        function recalc() {
            var mn = parseInt(minSlider.value, 10);
            var mx = parseInt(maxSlider.value, 10);
            if (mn > mx) { minSlider.value = mx; mn = mx; }
            minLbl.textContent = mn;
            maxLbl.textContent = mx;
            var n = countTiles(bbox, mn, mx);
            var b = estimateBytes(n);
            countEl.textContent = n.toLocaleString('sv-SE');
            bytesEl.textContent = '~' + formatBytes(b);
            statusEl.innerHTML = '';

            if (n === 0) {
                statusEl.innerHTML = '<div class="ot-block">Inga tiles att ladda ner.</div>';
                startBtn.disabled = true;
                return;
            }
            if (n > MAX_TILES) {
                statusEl.innerHTML = '<div class="ot-block">Över hård cap på ' + MAX_TILES.toLocaleString('sv-SE') + ' tiles. Minska zoom-spannet eller välj ett mindre område.</div>';
                startBtn.disabled = true;
                return;
            }

            var msgs = [];
            if (n > WARN_TILES) {
                msgs.push('Stort område — ' + n.toLocaleString('sv-SE') + ' tiles. Använd sparsamt mot tile-leverantören.');
            }
            if (b > WARN_BYTES) {
                msgs.push('<label class="ot-confirm"><input type="checkbox" id="otConfirmBig"> Jag förstår att detta tar ~' + formatBytes(b) + ' utrymme på enheten.</label>');
            }
            if (msgs.length) {
                statusEl.innerHTML = '<div class="ot-warn">' + msgs.join('<br><br>') + '</div>';
            }
            startBtn.disabled = false;

            var bigConfirm = overlay.querySelector('#otConfirmBig');
            if (bigConfirm) {
                startBtn.disabled = true;
                bigConfirm.addEventListener('change', function () {
                    startBtn.disabled = !bigConfirm.checked;
                });
            }
        }
        minSlider.addEventListener('input', recalc);
        maxSlider.addEventListener('input', recalc);
        recalc();

        // Stänger overlayn. När ett jobb körs avbryts det INTE — användaren
        // kan klicka "Kör i bakgrunden" för det. Stäng under download = avbryt.
        function close(opts) {
            opts = opts || {};
            if (running && !opts.keepJob && activeJobId) {
                cancelJob(activeJobId);
            }
            global.removeEventListener('offline-tiles:job-update', onJobUpdate);
            document.removeEventListener('keydown', onEsc);
            overlay.remove();
        }

        cancelBtn.addEventListener('click', function () {
            close();
        });

        bgBtn.addEventListener('click', function () {
            // Jobbet får leva vidare — pille:n visar progress.
            close({ keepJob: true });
        });

        // Esc stänger när inte mid-download (samma beteende som tidigare).
        function onEsc(e) {
            if (e.key === 'Escape' && !running) close();
        }
        document.addEventListener('keydown', onEsc);

        function onJobUpdate(ev) {
            var det = ev.detail || {};
            if (det.jobId !== activeJobId) return;
            var job = det.job;
            // Om jobbet är borttaget (efter cleanup-timeout) har vi redan
            // visat slutläget och behöver bara hålla overlay rensad.
            if (!job) return;

            var pct = job.total ? Math.round(job.done / job.total * 100) : 0;
            progressFill.style.width = pct + '%';

            if (job.status === 'running') {
                statusEl.innerHTML =
                    '<div class="ot-stat"><span>Förlopp</span><b>' +
                        job.done + ' / ' + job.total +
                        ' · ' + formatBytes(job.bytes) +
                        (job.failed ? ' · ' + job.failed + ' fel' : '') +
                    '</b></div>';
                return;
            }

            // Slutfas
            running = false;
            bgBtn.style.display = 'none';
            cancelBtn.textContent = 'Stäng';

            if (job.status === 'done') {
                startBtn.textContent = 'Klar';
                statusEl.innerHTML =
                    '<div class="ot-stat"><span>Klart</span><b>' +
                        job.done + ' tiles · ' + formatBytes(job.bytes) +
                        (job.failed ? ' · ' + job.failed + ' fel' : '') +
                    '</b></div>' +
                    '<div class="ot-warn">Området är nu tillgängligt offline. Slå på flygplansläge och ladda om sidan för att verifiera.</div>';
            } else if (job.status === 'aborted') {
                startBtn.textContent = startTxt;
                startBtn.disabled = false;
                statusEl.innerHTML = '<div class="ot-warn">Avbruten. Tiles som hann sparas finns kvar i offline-cachen.</div>';
            } else if (job.status === 'quota') {
                startBtn.textContent = startTxt;
                startBtn.disabled = false;
                statusEl.innerHTML = '<div class="ot-block">Slut på lagringsutrymme i webbläsaren. Rensa områden eller välj ett mindre.</div>';
            } else {
                startBtn.textContent = startTxt;
                startBtn.disabled = false;
                var msg = job.error && job.error.message ? job.error.message : 'okänt';
                statusEl.innerHTML = '<div class="ot-block">Fel vid nedladdning: ' + msg + '</div>';
            }
        }
        global.addEventListener('offline-tiles:job-update', onJobUpdate);

        startBtn.addEventListener('click', function () {
            if (running) return;
            running = true;
            startBtn.disabled = true;
            startBtn.textContent = startTxtRunning;
            cancelBtn.textContent = 'Avbryt';
            bgBtn.style.display = '';
            progressWrap.style.display = '';
            progressFill.style.width = '0%';

            var mn = parseInt(minSlider.value, 10);
            var mx = parseInt(maxSlider.value, 10);
            statusEl.innerHTML = '<div class="ot-stat"><span>Förlopp</span><b>0 / ' + countTiles(bbox, mn, mx) + '</b></div>';

            activeJobId = startJob({
                bbox: bbox,
                minZoom: mn,
                maxZoom: mx,
                areaId: isRefresh ? refreshArea.id : null,
                mode: isRefresh ? 'refresh' : 'new'
            });
        });
    }

    // Öppnar modal:n pre-fylld med ett befintligt områdes bbox/zoom-range.
    // Ny nedladdning ersätter cache-entries och uppdaterar metadata under
    // samma areaId (savedAt får dock ett nytt värde via saveAreaMeta).
    function refreshAreaWithModal(id, map) {
        var area = getStoredAreas().find(function (a) { return a.id === id; });
        if (!area) return;
        openModal(map, { area: area });
    }


    global.OfflineTiles = {
        OFFLINE_CACHE: OFFLINE_CACHE,
        STALE_DAYS: STALE_DAYS,
        MAX_TILES: MAX_TILES,
        tileUrl: tileUrl,
        tilesForBbox: tilesForBbox,
        countTiles: countTiles,
        estimateBytes: estimateBytes,
        formatBytes: formatBytes,
        downloadTiles: downloadTiles,
        getStoredAreas: getStoredAreas,
        saveAreaMeta: saveAreaMeta,
        removeArea: removeArea,
        coverageFor: coverageFor,
        attachCoverageIndicator: attachCoverageIndicator,
        attachCoverageControl: attachCoverageControl,
        renderAreasPanel: renderAreasPanel,
        openModal: openModal,
        refreshArea: refreshAreaWithModal,
        startJob: startJob,
        cancelJob: cancelJob,
        resumeArea: resumeArea,
        getJob: getJob,
        getActiveJobs: getActiveJobs,
        exportArea: exportArea,
        importPackage: importPackage,
        downloadBlob: downloadBlob,
        // Privata helpers — exponerade för offline-tiles-kamuflage.js (om
        // den någonsin kopplas in igen). Ingen extern konsument bör ta
        // beroende av dessa; de kan ändras utan varning.
        _internal: {
            fmtCoord: fmtCoord,
            injectModalStyles: injectModalStyles,
            newAreaId: newAreaId,
            notifyChange: notifyChange,
            BYTES_PER_TILE_AVG: BYTES_PER_TILE_AVG,
            STORAGE_KEY: STORAGE_KEY
        }
    };
})(window);
