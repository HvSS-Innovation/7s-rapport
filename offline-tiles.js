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
                if (THROTTLE_MS > 0 && idx < items.length) {
                    await new Promise(function (r) { setTimeout(r, THROTTLE_MS); });
                }
            }
        }

        var workers = [];
        for (var w = 0; w < PARALLEL; w++) workers.push(worker());
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
    }

    function newAreaId() {
        return 'a_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
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
            '.ot-modal .ot-confirm{display:flex;align-items:center;gap:8px;font-size:0.78rem;color:#c8a24e;margin-top:8px;text-transform:none;letter-spacing:0}';
        var style = document.createElement('style');
        style.id = 'offline-tiles-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function fmtCoord(v, isLat) {
        var dir = isLat ? (v >= 0 ? 'N' : 'S') : (v >= 0 ? 'E' : 'W');
        return Math.abs(v).toFixed(4) + '° ' + dir;
    }

    function openModal(map) {
        if (!map || typeof map.getBounds !== 'function') {
            console.warn('[offline-tiles] openModal: map saknas eller saknar getBounds');
            return;
        }
        injectModalStyles();

        var bounds = map.getBounds();
        var bbox = {
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast()
        };
        var currentZoom = Math.round(map.getZoom());
        var initMin = Math.max(8, currentZoom - 1);
        var initMax = Math.min(17, currentZoom + 1);
        if (initMin > initMax) initMin = initMax;

        var overlay = document.createElement('div');
        overlay.className = 'ot-overlay';
        overlay.innerHTML =
            '<div class="ot-modal" role="dialog" aria-label="Spara område offline">' +
                '<h3>SPARA OMRÅDE OFFLINE</h3>' +
                '<div class="ot-warn">Nedladdningen avslöjar valt område för tile-servern (OpenTopoMap / OSM). Gör den helst från en annan plats än ni ska in i, och på ett annat nät.</div>' +
                '<label>Bounding box (nuvarande vy)</label>' +
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
                    '<button type="button" class="ot-btn" id="otCancel">Stäng</button>' +
                    '<button type="button" class="ot-btn ot-btn-primary" id="otStart">Spara</button>' +
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
        var progressWrap = overlay.querySelector('#otProgressWrap');
        var progressFill = overlay.querySelector('#otProgressFill');

        minSlider.value = initMin;
        maxSlider.value = initMax;

        var aborter = null;
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

        function close() {
            if (aborter) aborter.abort();
            overlay.remove();
        }

        cancelBtn.addEventListener('click', function () {
            if (running) {
                if (aborter) aborter.abort();
                cancelBtn.textContent = 'Stäng';
                running = false;
                startBtn.disabled = false;
                startBtn.textContent = 'Spara';
            } else {
                close();
            }
        });

        // Esc stänger när inte mid-download.
        function onEsc(e) {
            if (e.key === 'Escape' && !running) {
                document.removeEventListener('keydown', onEsc);
                close();
            }
        }
        document.addEventListener('keydown', onEsc);

        startBtn.addEventListener('click', async function () {
            if (running) return;
            running = true;
            startBtn.disabled = true;
            startBtn.textContent = 'Laddar…';
            cancelBtn.textContent = 'Avbryt';
            progressWrap.style.display = '';
            progressFill.style.width = '0%';

            var mn = parseInt(minSlider.value, 10);
            var mx = parseInt(maxSlider.value, 10);
            var items = tilesForBbox(bbox, mn, mx);

            statusEl.innerHTML = '<div class="ot-stat"><span>Förlopp</span><b id="otLive">0 / ' + items.length + '</b></div>';
            var liveEl = overlay.querySelector('#otLive');

            aborter = (typeof AbortController !== 'undefined') ? new AbortController() : null;

            var areaId = newAreaId();
            var savedAt = new Date().toISOString();

            try {
                var result = await downloadTiles(items, {
                    signal: aborter ? aborter.signal : undefined,
                    onProgress: function (p) {
                        var pct = Math.round(p.done / p.total * 100);
                        progressFill.style.width = pct + '%';
                        liveEl.textContent =
                            p.done + ' / ' + p.total +
                            ' · ' + formatBytes(p.bytes) +
                            (p.failed ? ' · ' + p.failed + ' fel' : '');

                        // Spara metadata efter var 50:e tile så att en
                        // halvfärdig session inte är osynlig om fliken stängs.
                        if (p.done % 50 === 0 || p.done === p.total) {
                            saveAreaMeta({
                                id: areaId,
                                bbox: bbox,
                                minZoom: mn,
                                maxZoom: mx,
                                tileCount: p.done,
                                bytes: p.bytes,
                                savedAt: savedAt,
                                complete: p.done === p.total
                            });
                        }
                    }
                });

                running = false;
                startBtn.textContent = 'Klar';
                cancelBtn.textContent = 'Stäng';
                statusEl.innerHTML =
                    '<div class="ot-stat"><span>Klart</span><b>' +
                        result.done + ' tiles · ' + formatBytes(result.bytes) +
                        (result.failed ? ' · ' + result.failed + ' fel' : '') +
                    '</b></div>' +
                    '<div class="ot-warn">Området är nu tillgängligt offline. Slå på flygplansläge och ladda om sidan för att verifiera.</div>';
            } catch (err) {
                running = false;
                startBtn.textContent = 'Spara';
                startBtn.disabled = false;
                cancelBtn.textContent = 'Stäng';
                if (err && err.name === 'AbortError') {
                    statusEl.innerHTML = '<div class="ot-warn">Avbruten. Tiles som hann sparas finns kvar i offline-cachen.</div>';
                } else if (err && err.name === 'QuotaExceededError') {
                    statusEl.innerHTML = '<div class="ot-block">Slut på lagringsutrymme i webbläsaren. Rensa områden eller välj ett mindre.</div>';
                } else {
                    statusEl.innerHTML = '<div class="ot-block">Fel vid nedladdning: ' + (err && err.message ? err.message : 'okänt') + '</div>';
                }
            }
        });
    }

    global.OfflineTiles = {
        OFFLINE_CACHE: OFFLINE_CACHE,
        tileUrl: tileUrl,
        tilesForBbox: tilesForBbox,
        countTiles: countTiles,
        estimateBytes: estimateBytes,
        formatBytes: formatBytes,
        downloadTiles: downloadTiles,
        getStoredAreas: getStoredAreas,
        saveAreaMeta: saveAreaMeta,
        openModal: openModal
    };
})(window);
