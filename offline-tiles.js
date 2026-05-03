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

    // Kamuflage-nedladdning: medveten överträdelse av tile-leverantörens
    // bulk-policy för att täcka ett mycket större område än verkansområdet,
    // så att tile-server-loggen inte avslöjar VAR operatören ska in. Hot-
    // modell + UX-krav i audit/roadmap-kamuflage-nedladdning.md. Mer
    // konservativ throttling än standard — burst-signaturen ska vara mindre
    // igenkännlig, inte mer.
    var BULK_MAX_TILES = 30000;
    var BULK_PARALLEL = 1;
    var BULK_THROTTLE_MS = 500;

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
        var cache = await caches.open(OFFLINE_CACHE);

        var done = 0, failed = 0, bytes = 0;
        var idx = 0;

        async function worker() {
            while (idx < items.length) {
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
    var _jobs = Object.create(null);

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
        if (j && j.controller) j.controller.abort();
    }

    // Startar en nedladdning som ett bakgrundsjobb. Returnerar jobId direkt;
    // jobbets framgång/avslut signaleras via event-strömmen.
    function startJob(spec) {
        var jobId = 'j_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5);
        var items = tilesForBbox(spec.bbox, spec.minZoom, spec.maxZoom);
        var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var areaId = spec.areaId || newAreaId();
        var savedAt = new Date().toISOString();

        // kind = 'area' (default) eller 'kamuflage'. Kamuflage-jobb laddar
        // ner ett medvetet stort område som omsluter verkansområdet — se
        // audit/roadmap-kamuflage-nedladdning.md. Persisteras i area-meta så
        // att UI:n kan visa det och Fas 2 (beskär) kan filtrera på det.
        var kind = spec.kind || 'area';

        var job = {
            id: jobId,
            areaId: areaId,
            label: spec.label || '',
            mode: spec.mode || 'new',
            kind: kind,
            bbox: spec.bbox,
            minZoom: spec.minZoom,
            maxZoom: spec.maxZoom,
            total: items.length,
            done: 0,
            bytes: 0,
            failed: 0,
            status: 'running',
            controller: controller,
            savedAt: savedAt,
            error: null
        };
        _jobs[jobId] = job;
        emitJobUpdate(jobId);
        // Säkerställ att bakgrundspille:n existerar så jobbet inte kan
        // försvinna ur sikte om modal-en stängs direkt.
        ensureJobsBar();

        (async function run() {
            try {
                var result = await downloadTiles(items, {
                    signal: controller ? controller.signal : undefined,
                    parallel: spec.parallel,
                    throttleMs: spec.throttleMs,
                    onProgress: function (p) {
                        job.done = p.done;
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
                                tileCount: p.done,
                                bytes: p.bytes,
                                savedAt: savedAt,
                                complete: p.done === p.total
                            });
                        }
                    }
                });
                job.status = 'done';
                job.done = result.done;
                job.bytes = result.bytes;
                job.failed = result.failed;
            } catch (err) {
                job.error = err;
                job.status = (err && err.name === 'AbortError') ? 'aborted'
                          : (err && err.name === 'QuotaExceededError') ? 'quota'
                          : 'error';
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
                      : (j.kind === 'kamuflage' ? 'Kamuflage' : 'Laddar ner');
            var statusTxt = '';
            if (j.status === 'done') { statusTxt = 'Klart'; pct = 100; }
            else if (j.status === 'aborted') statusTxt = 'Avbruten';
            else if (j.status === 'error') statusTxt = 'Fel';
            else if (j.status === 'quota') statusTxt = 'Slut på utrymme';
            else statusTxt = j.done + ' / ' + j.total + ' · ' + formatBytes(j.bytes) +
                              (j.failed ? ' · ' + j.failed + ' fel' : '');

            html +=
                '<div class="ot-jobpill" data-job="' + j.id + '" data-status="' + j.status + '">' +
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

    // ── Kamuflage-modal ────────────────────────────────────────────────────
    // Skala-baserad bbox runt vy-centrum (1× = nuvarande viewport,
    // 20× ≈ 200×200 km) så att operatören kan ladda ner ett stort område som
    // omsluter verkansområdet. Beskäring lokalt i Fas 2.
    //
    // Designmotiv för konstanter och defaults: audit/roadmap-kamuflage-
    // nedladdning.md. Kort: BULK_MAX_TILES = 30000 (~600 MB), throttling 1
    // par. + 500 ms (under normal pan/zoom-aktivitet, vilket gör burst-
    // signaturen mindre igenkännlig). Två obligatoriska checkboxes — utan
    // dem är start-knappen disabled.
    function scaleBbox(centerLat, centerLon, viewportBbox, factor) {
        // Skala bbox runt centrum genom att räkna ny halv-bredd/halv-höjd.
        // Funkar bra inom Sverige; vid hög nordlig breddgrad är lon-grader
        // smalare i meter, men det är okej här — användaren ser MB-summan
        // och tile-räkningen och kan justera, det är inte en surveying-grad
        // beräkning.
        var halfLat = (viewportBbox.north - viewportBbox.south) / 2;
        var halfLon = (viewportBbox.east - viewportBbox.west) / 2;
        var newHalfLat = halfLat * factor;
        var newHalfLon = halfLon * factor;
        var south = Math.max(-85, centerLat - newHalfLat);
        var north = Math.min(85, centerLat + newHalfLat);
        var west = centerLon - newHalfLon;
        var east = centerLon + newHalfLon;
        // Vid extremt stora skalor kan lon-spannet bli > 180 — clamp:a.
        if (east - west >= 360) { west = -180; east = 180; }
        return { south: south, west: west, north: north, east: east };
    }

    async function checkStorageHeadroom(estimateBytes) {
        // navigator.storage.estimate() är tillgängligt i alla moderna
        // browsers. Returnerar { ok, freeBytes, quota, usage } eller null
        // om API:t saknas (då hoppar vi över check-en — bättre att låta
        // användaren prova än att blockera grundlöst).
        try {
            if (!navigator.storage || !navigator.storage.estimate) return null;
            var est = await navigator.storage.estimate();
            var quota = est.quota || 0;
            var usage = est.usage || 0;
            var free = Math.max(0, quota - usage);
            // 1.5× headroom — cache-data + metadata + Response-objektens
            // overhead i Cache API (vilket inte är linjärt med blob-storlek).
            var ok = free >= estimateBytes * 1.5;
            return { ok: ok, freeBytes: free, quota: quota, usage: usage };
        } catch (_) {
            return null;
        }
    }

    function openKamuflageModal(map) {
        if (!map || typeof map.getBounds !== 'function') {
            console.warn('[offline-tiles] openKamuflageModal: map saknas eller saknar getBounds');
            return;
        }
        injectModalStyles();

        var bounds = map.getBounds();
        var center = map.getCenter();
        var viewportBbox = {
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast()
        };

        var initScale = 5;
        var initMin = 9;
        var initMax = 13;

        var overlay = document.createElement('div');
        overlay.className = 'ot-overlay';
        overlay.innerHTML =
            '<div class="ot-modal" role="dialog" aria-label="Kamuflage-nedladdning">' +
                '<h3>KAMUFLAGE-NEDLADDNING</h3>' +
                '<div class="ot-block">' +
                    '<b>Bulk-download.</b> Tile-leverantörens IP-logg ser exakt vilken region som laddades ner. Funktionen döljer <b>var</b> ni ska verka — inte <b>att</b> nedladdningen sker. ' +
                    'Kör via VPN eller Tor från ett annat nät, helst från en plats långt från verkansområdet och vid en annan tid. ' +
                    'Detta är ett medvetet brott mot OpenStreetMap/OpenTopoMap:s bulk-policy.' +
                '</div>' +
                '<label>Område: skala kring vy-centrum</label>' +
                '<div style="display:flex;align-items:center;gap:10px">' +
                    '<input type="range" id="otkScale" min="1" max="20" step="1" value="' + initScale + '" style="flex:1">' +
                    '<span id="otkScaleLbl" style="font-family:ui-monospace,Menlo,Consolas,monospace;color:#c8e6c9;min-width:42px;text-align:right">' + initScale + '×</span>' +
                '</div>' +
                '<label>Bounding box</label>' +
                '<div class="ot-bbox" id="otkBbox"></div>' +
                '<div class="ot-row" style="margin-top:12px">' +
                    '<div>' +
                        '<label>Min zoom: <span id="otkMinLbl">' + initMin + '</span></label>' +
                        '<input type="range" id="otkMin" min="6" max="14" step="1" value="' + initMin + '">' +
                    '</div>' +
                    '<div>' +
                        '<label>Max zoom: <span id="otkMaxLbl">' + initMax + '</span></label>' +
                        '<input type="range" id="otkMax" min="6" max="14" step="1" value="' + initMax + '">' +
                    '</div>' +
                '</div>' +
                '<div class="ot-stat"><span>Tiles att ladda ner</span><b id="otkCount">—</b></div>' +
                '<div class="ot-stat"><span>Uppskattad storlek</span><b id="otkBytes">—</b></div>' +
                '<div class="ot-stat"><span>Uppskattad tid</span><b id="otkTime">—</b></div>' +
                '<div id="otkStatus"></div>' +
                '<div class="ot-warn" style="margin-top:10px">' +
                    '<label class="ot-confirm" style="margin:0"><input type="checkbox" id="otkAck1"> Jag förstår att tile-leverantören ser denna nedladdning i sin IP-logg.</label>' +
                    '<label class="ot-confirm" style="margin:6px 0 0"><input type="checkbox" id="otkAck2"> Jag använder VPN/Tor och ett annat nät än verkansområdet.</label>' +
                '</div>' +
                '<div class="ot-progress" id="otkProgressWrap" style="display:none"><div class="ot-progress-fill" id="otkProgressFill"></div></div>' +
                '<div class="ot-actions">' +
                    '<button type="button" class="ot-btn" id="otkBackground" style="display:none">Kör i bakgrunden</button>' +
                    '<button type="button" class="ot-btn" id="otkCancel">Stäng</button>' +
                    '<button type="button" class="ot-btn ot-btn-primary" id="otkStart" disabled>Starta</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        var scaleSlider = overlay.querySelector('#otkScale');
        var scaleLbl = overlay.querySelector('#otkScaleLbl');
        var minSlider = overlay.querySelector('#otkMin');
        var maxSlider = overlay.querySelector('#otkMax');
        var minLbl = overlay.querySelector('#otkMinLbl');
        var maxLbl = overlay.querySelector('#otkMaxLbl');
        var bboxEl = overlay.querySelector('#otkBbox');
        var countEl = overlay.querySelector('#otkCount');
        var bytesEl = overlay.querySelector('#otkBytes');
        var timeEl = overlay.querySelector('#otkTime');
        var statusEl = overlay.querySelector('#otkStatus');
        var ack1 = overlay.querySelector('#otkAck1');
        var ack2 = overlay.querySelector('#otkAck2');
        var startBtn = overlay.querySelector('#otkStart');
        var cancelBtn = overlay.querySelector('#otkCancel');
        var bgBtn = overlay.querySelector('#otkBackground');
        var progressWrap = overlay.querySelector('#otkProgressWrap');
        var progressFill = overlay.querySelector('#otkProgressFill');

        var currentBbox = viewportBbox;
        var currentTileCount = 0;
        var currentBytes = 0;

        function recalc() {
            var scale = parseInt(scaleSlider.value, 10);
            var mn = parseInt(minSlider.value, 10);
            var mx = parseInt(maxSlider.value, 10);
            if (mn > mx) { minSlider.value = mx; mn = mx; }
            scaleLbl.textContent = scale + '×';
            minLbl.textContent = mn;
            maxLbl.textContent = mx;

            currentBbox = scaleBbox(center.lat, center.lng, viewportBbox, scale);
            bboxEl.textContent =
                'NV: ' + fmtCoord(currentBbox.north, true) + ', ' + fmtCoord(currentBbox.west, false) + '\n' +
                'SE: ' + fmtCoord(currentBbox.south, true) + ', ' + fmtCoord(currentBbox.east, false);

            currentTileCount = countTiles(currentBbox, mn, mx);
            currentBytes = estimateBytes(currentTileCount);
            countEl.textContent = currentTileCount.toLocaleString('sv-SE');
            bytesEl.textContent = '~' + formatBytes(currentBytes);

            // Tid = tiles × (throttleMs / parallel) i ms.
            var ms = currentTileCount * (BULK_THROTTLE_MS / BULK_PARALLEL);
            var sec = Math.round(ms / 1000);
            var tStr;
            if (sec < 60) tStr = sec + ' s';
            else if (sec < 3600) tStr = Math.floor(sec / 60) + ' min ' + (sec % 60) + ' s';
            else tStr = Math.floor(sec / 3600) + ' h ' + Math.round((sec % 3600) / 60) + ' min';
            timeEl.textContent = '~' + tStr;

            statusEl.innerHTML = '';

            if (currentTileCount === 0) {
                statusEl.innerHTML = '<div class="ot-block">Inga tiles att ladda ner i valt område.</div>';
                refreshStartState(true);
                return;
            }
            if (currentTileCount > BULK_MAX_TILES) {
                statusEl.innerHTML = '<div class="ot-block">Över hård cap på ' + BULK_MAX_TILES.toLocaleString('sv-SE') + ' tiles. Minska skala eller zoom-spann.</div>';
                refreshStartState(true);
                return;
            }
            refreshStartState(false);
        }

        function refreshStartState(forceDisable) {
            startBtn.disabled = forceDisable || !ack1.checked || !ack2.checked;
        }

        scaleSlider.addEventListener('input', recalc);
        minSlider.addEventListener('input', recalc);
        maxSlider.addEventListener('input', recalc);
        ack1.addEventListener('change', function () { refreshStartState(currentTileCount === 0 || currentTileCount > BULK_MAX_TILES); });
        ack2.addEventListener('change', function () { refreshStartState(currentTileCount === 0 || currentTileCount > BULK_MAX_TILES); });
        recalc();

        var activeJobId = null;
        var running = false;

        function close(opts) {
            opts = opts || {};
            if (running && !opts.keepJob && activeJobId) {
                cancelJob(activeJobId);
            }
            global.removeEventListener('offline-tiles:job-update', onJobUpdate);
            document.removeEventListener('keydown', onEsc);
            overlay.remove();
        }

        cancelBtn.addEventListener('click', function () { close(); });
        bgBtn.addEventListener('click', function () { close({ keepJob: true }); });

        function onEsc(e) {
            if (e.key === 'Escape' && !running) close();
        }
        document.addEventListener('keydown', onEsc);

        function onJobUpdate(ev) {
            var det = ev.detail || {};
            if (det.jobId !== activeJobId) return;
            var job = det.job;
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
                    '<div class="ot-warn">Området är nedladdat och markerat som kamuflage. Fas 2 kommer låta dig beskära det till verkansområdet.</div>';
            } else if (job.status === 'aborted') {
                startBtn.textContent = 'Starta';
                refreshStartState(false);
                statusEl.innerHTML = '<div class="ot-warn">Avbruten. Tiles som hann sparas finns kvar i offline-cachen som kamuflage-område.</div>';
            } else if (job.status === 'quota') {
                startBtn.textContent = 'Starta';
                refreshStartState(false);
                statusEl.innerHTML = '<div class="ot-block">Slut på lagringsutrymme i webbläsaren. Rensa områden eller välj ett mindre.</div>';
            } else {
                startBtn.textContent = 'Starta';
                refreshStartState(false);
                var msg = job.error && job.error.message ? job.error.message : 'okänt';
                statusEl.innerHTML = '<div class="ot-block">Fel vid nedladdning: ' + msg + '</div>';
            }
        }
        global.addEventListener('offline-tiles:job-update', onJobUpdate);

        startBtn.addEventListener('click', async function () {
            if (running) return;

            // Storage-headroom-check INNAN start. Om quota är otillräcklig
            // får användaren välja att avbryta eller fortsätta ändå (det
            // sistnämnda kan vara önskvärt på enheter med dynamisk quota
            // som växer vid behov).
            startBtn.disabled = true;
            startBtn.textContent = 'Kontrollerar utrymme…';
            var head = await checkStorageHeadroom(currentBytes);
            if (head && !head.ok) {
                statusEl.innerHTML =
                    '<div class="ot-block">Inte tillräckligt med utrymme: ' +
                        formatBytes(head.freeBytes) + ' fritt, ' +
                        '~' + formatBytes(currentBytes * 1.5) + ' rekommenderat.' +
                    '<br><label class="ot-confirm" style="margin-top:6px"><input type="checkbox" id="otkForceQuota"> Fortsätt ändå (risk för avbrott mid-download)</label>' +
                    '</div>';
                startBtn.textContent = 'Starta';
                startBtn.disabled = true;
                var force = overlay.querySelector('#otkForceQuota');
                force.addEventListener('change', function () {
                    startBtn.disabled = !force.checked;
                });
                return;
            }

            running = true;
            startBtn.textContent = 'Laddar…';
            cancelBtn.textContent = 'Avbryt';
            bgBtn.style.display = '';
            progressWrap.style.display = '';
            progressFill.style.width = '0%';

            var mn = parseInt(minSlider.value, 10);
            var mx = parseInt(maxSlider.value, 10);
            statusEl.innerHTML = '<div class="ot-stat"><span>Förlopp</span><b>0 / ' + currentTileCount + '</b></div>';

            activeJobId = startJob({
                bbox: currentBbox,
                minZoom: mn,
                maxZoom: mx,
                kind: 'kamuflage',
                mode: 'new',
                parallel: BULK_PARALLEL,
                throttleMs: BULK_THROTTLE_MS
            });
        });
    }

    global.OfflineTiles = {
        OFFLINE_CACHE: OFFLINE_CACHE,
        STALE_DAYS: STALE_DAYS,
        MAX_TILES: MAX_TILES,
        BULK_MAX_TILES: BULK_MAX_TILES,
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
        renderAreasPanel: renderAreasPanel,
        openModal: openModal,
        openKamuflageModal: openKamuflageModal,
        refreshArea: refreshAreaWithModal,
        startJob: startJob,
        cancelJob: cancelJob,
        getJob: getJob,
        getActiveJobs: getActiveJobs,
        exportArea: exportArea,
        importPackage: importPackage,
        downloadBlob: downloadBlob
    };
})(window);
