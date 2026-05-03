// ─────────────────────────────────────────────────────────────────────────────
//  OFFLINE-TILES — KAMUFLAGE
//
//  Bortkopplad från sajten 2026-05-03. Filen ligger kvar i repo som
//  arkiv: ingen HTML-sida importerar den för närvarande. Skälet:
//  funktionen är ett medvetet brott mot OpenStreetMap/OpenTopoMap:s
//  bulk-policy och dess OPSEC-värde är begränsat utan VPN/Tor. Vi vill
//  fortsätta använda OSM/OTM:s ordinarie tjänst på sajten utan att
//  stöta oss med dem.
//
//  Hot-modell, design-motiv och faserad implementation finns i
//  audit/roadmap-kamuflage-nedladdning.md.
//
//  För att aktivera igen — i den ordningen:
//    1. Lägg <script src="offline-tiles-kamuflage.js" defer></script> i
//       minkarta.html och sensorskiss.html (efter offline-tiles.js).
//    2. Lägg tillbaka knappen i renderMapControls() i båda filerna —
//       se git-historik för exakt struktur (commit a7df397 är referens).
//    3. Lägg tillbaka kamuflage-rad i .about-panelen i båda filerna.
//
//  Modulen självregistrerar sig på window.OfflineTilesKamuflage. Den
//  läser core-helpers från window.OfflineTiles (tilesForBbox, startJob,
//  saveAreaMeta, etc.) och kräver att offline-tiles.js är laddad först.
// ─────────────────────────────────────────────────────────────────────────────

(function (global) {
    'use strict';

    var OT = global.OfflineTiles;
    if (!OT || !OT._internal) {
        console.warn('[offline-tiles-kamuflage] window.OfflineTiles inte laddad — kamuflage-modul inaktiv');
        return;
    }

    // Core-helpers via OfflineTiles publika API + _internal-namespace.
    var I = OT._internal;
    var tilesForBbox = OT.tilesForBbox;
    var countTiles = OT.countTiles;
    var estimateBytes = OT.estimateBytes;
    var formatBytes = OT.formatBytes;
    var startJob = OT.startJob;
    var cancelJob = OT.cancelJob;
    var getStoredAreas = OT.getStoredAreas;
    var OFFLINE_CACHE = OT.OFFLINE_CACHE;
    var fmtCoord = I.fmtCoord;
    var injectModalStyles = I.injectModalStyles;
    var newAreaId = I.newAreaId;
    var notifyChange = I.notifyChange;
    var BYTES_PER_TILE_AVG = I.BYTES_PER_TILE_AVG;
    var STORAGE_KEY = I.STORAGE_KEY;

    // Kamuflage-konstanter — medveten överträdelse av tile-leverantörens
    // bulk-policy. Lägre throttling-default än standard "Spara område
    // offline" så burst-signaturen är mindre igenkännlig.
    var BULK_MAX_TILES = 30000;
    var BULK_PARALLEL = 1;
    var BULK_THROTTLE_MS = 500;

    // ── Kamuflage-modal ────────────────────────────────────────────────────
    function scaleBbox(centerLat, centerLon, viewportBbox, factor) {
        var halfLat = (viewportBbox.north - viewportBbox.south) / 2;
        var halfLon = (viewportBbox.east - viewportBbox.west) / 2;
        var newHalfLat = halfLat * factor;
        var newHalfLon = halfLon * factor;
        var south = Math.max(-85, centerLat - newHalfLat);
        var north = Math.min(85, centerLat + newHalfLat);
        var west = centerLon - newHalfLon;
        var east = centerLon + newHalfLon;
        if (east - west >= 360) { west = -180; east = 180; }
        return { south: south, west: west, north: north, east: east };
    }

    async function checkStorageHeadroom(estimateBytes) {
        try {
            if (!navigator.storage || !navigator.storage.estimate) return null;
            var est = await navigator.storage.estimate();
            var quota = est.quota || 0;
            var usage = est.usage || 0;
            var free = Math.max(0, quota - usage);
            var ok = free >= estimateBytes * 1.5;
            return { ok: ok, freeBytes: free, quota: quota, usage: usage };
        } catch (_) {
            return null;
        }
    }

    // ── Beskär (Fas 2) ─────────────────────────────────────────────────────
    // Tar ett kamuflage-område och raderar tiles utanför ett valt delområde.
    function planPrune(area, keepBbox) {
        var allItems = tilesForBbox(area.bbox, area.minZoom, area.maxZoom);
        var keepItems = tilesForBbox(keepBbox, area.minZoom, area.maxZoom);
        var keepSet = Object.create(null);
        for (var i = 0; i < keepItems.length; i++) keepSet[keepItems[i].url] = true;
        var toDelete = [];
        for (var j = 0; j < allItems.length; j++) {
            if (!keepSet[allItems[j].url]) toDelete.push(allItems[j]);
        }
        return {
            keepCount: keepItems.length,
            deleteCount: toDelete.length,
            totalCount: allItems.length,
            toDelete: toDelete
        };
    }

    async function pruneArea(id, keepBbox, opts) {
        opts = opts || {};
        var action = opts.action || 'replace';
        var onProgress = opts.onProgress || function () {};

        var list = getStoredAreas();
        var area = list.find(function (a) { return a.id === id; });
        if (!area) throw new Error('Området saknas');

        var plan = planPrune(area, keepBbox);
        var cache = await caches.open(OFFLINE_CACHE);

        var deleted = 0;
        for (var i = 0; i < plan.toDelete.length; i++) {
            try {
                var ok = await cache.delete(plan.toDelete[i].url);
                if (ok) deleted++;
            } catch (_) {}
            if (i % 50 === 0) onProgress({ done: i, total: plan.toDelete.length });
        }
        onProgress({ done: plan.toDelete.length, total: plan.toDelete.length });

        var avgBytes = (area.bytes && area.tileCount) ? (area.bytes / area.tileCount) : BYTES_PER_TILE_AVG;
        var remainingBytes = Math.round(avgBytes * plan.keepCount);

        var nextArea;
        if (action === 'replace') {
            nextArea = {
                id: newAreaId(),
                kind: 'area',
                bbox: keepBbox,
                minZoom: area.minZoom,
                maxZoom: area.maxZoom,
                tileCount: plan.keepCount,
                bytes: remainingBytes,
                savedAt: new Date().toISOString(),
                complete: true,
                prunedFrom: area.id
            };
            list = list.filter(function (a) { return a.id !== area.id; });
            list.push(nextArea);
        } else {
            var idx = list.findIndex(function (a) { return a.id === area.id; });
            if (idx >= 0) {
                list[idx] = Object.assign({}, area, {
                    kind: 'kamuflage-pruned',
                    bbox: keepBbox,
                    tileCount: plan.keepCount,
                    bytes: remainingBytes,
                    prunedAt: new Date().toISOString()
                });
                nextArea = list[idx];
            }
        }

        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (_) {}
        notifyChange();
        return { area: nextArea, deleted: deleted, kept: plan.keepCount };
    }

    function clampBbox(inner, outer) {
        return {
            south: Math.max(inner.south, outer.south),
            west: Math.max(inner.west, outer.west),
            north: Math.min(inner.north, outer.north),
            east: Math.min(inner.east, outer.east)
        };
    }
    function isValidBbox(b) {
        return b && isFinite(b.south) && isFinite(b.north) && isFinite(b.west) && isFinite(b.east)
            && b.north > b.south && b.east > b.west;
    }

    function openPruneModal(area, map) {
        if (!area || !map || typeof L === 'undefined' || !L.rectangle) {
            console.warn('[offline-tiles-kamuflage] openPruneModal: krav saknas (area, map, Leaflet L.rectangle)');
            return;
        }
        if (area.kind !== 'kamuflage') {
            console.warn('[offline-tiles-kamuflage] Beskär stöds bara på kamuflage-områden');
            return;
        }
        injectModalStyles();

        var bounds = map.getBounds();
        var keepBbox = clampBbox({
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast()
        }, area.bbox);
        if (!isValidBbox(keepBbox)) keepBbox = Object.assign({}, area.bbox);

        var areaRect = L.rectangle(
            [[area.bbox.south, area.bbox.west], [area.bbox.north, area.bbox.east]],
            { color: '#888', weight: 1, fillColor: '#888', fillOpacity: 0.04, dashArray: '2,4', interactive: false }
        ).addTo(map);
        var keepRect = L.rectangle(
            [[keepBbox.south, keepBbox.west], [keepBbox.north, keepBbox.east]],
            { color: '#c8a24e', weight: 2, fillColor: '#c8a24e', fillOpacity: 0.15, dashArray: '6,4', interactive: false }
        ).addTo(map);

        var overlay = document.createElement('div');
        overlay.className = 'ot-overlay ot-overlay-panel';
        overlay.innerHTML =
            '<div class="ot-modal" role="dialog" aria-label="Beskär kamuflage-område">' +
                '<h3>BESKÄR KAMUFLAGE-OMRÅDE</h3>' +
                '<div class="ot-warn">Raderar tiles utanför valt delområde lokalt på enheten. Tile-server-loggen är redan skapad — denna åtgärd krymper bara cachen så att en forensisk analys av enheten i fält inte avslöjar verkansområdet.</div>' +
                '<label>Delområde att behålla (NV / SE)</label>' +
                '<div class="ot-bbox" id="otpBbox"></div>' +
                '<div class="ot-actions" style="margin-top:8px;justify-content:flex-start;flex-wrap:wrap">' +
                    '<button type="button" class="ot-btn" id="otpUseView">Använd nuvarande vy</button>' +
                    '<button type="button" class="ot-btn" id="otpToggleManual">Koord-input…</button>' +
                '</div>' +
                '<div id="otpManual" style="display:none;margin-top:10px">' +
                    '<div class="ot-row">' +
                        '<div><label>N (lat)</label><input type="number" step="0.0001" id="otpN"></div>' +
                        '<div><label>S (lat)</label><input type="number" step="0.0001" id="otpS"></div>' +
                    '</div>' +
                    '<div class="ot-row">' +
                        '<div><label>V (lon)</label><input type="number" step="0.0001" id="otpW"></div>' +
                        '<div><label>Ö (lon)</label><input type="number" step="0.0001" id="otpE"></div>' +
                    '</div>' +
                    '<div style="margin-top:6px"><button type="button" class="ot-btn" id="otpApplyManual">Använd koordinater</button></div>' +
                '</div>' +
                '<div class="ot-stat"><span>Behåller</span><b id="otpKeep">—</b></div>' +
                '<div class="ot-stat"><span>Raderar</span><b id="otpDel">—</b></div>' +
                '<div class="ot-stat"><span>Frigör</span><b id="otpFree">—</b></div>' +
                '<label style="margin-top:12px">Efter beskärning</label>' +
                '<div style="font-size:0.78rem;color:#e8f0e8;line-height:1.5">' +
                    '<label class="ot-confirm" style="margin:0"><input type="radio" name="otpAction" value="replace" checked> Ersätt kamuflage-området med delområdet (kind: <code>area</code>). Det stora kamuflage-omr. försvinner ur listan.</label>' +
                    '<label class="ot-confirm" style="margin:6px 0 0"><input type="radio" name="otpAction" value="mark-pruned"> Markera som beskuret kamuflage (kind: <code>kamuflage-pruned</code>). Behåller spårbarhet.</label>' +
                '</div>' +
                '<div id="otpStatus"></div>' +
                '<div class="ot-progress" id="otpProgressWrap" style="display:none"><div class="ot-progress-fill" id="otpProgressFill"></div></div>' +
                '<div class="ot-actions">' +
                    '<button type="button" class="ot-btn" id="otpCancel">Stäng</button>' +
                    '<button type="button" class="ot-btn ot-btn-primary" id="otpStart">Beskär</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        var bboxEl = overlay.querySelector('#otpBbox');
        var keepEl = overlay.querySelector('#otpKeep');
        var delEl = overlay.querySelector('#otpDel');
        var freeEl = overlay.querySelector('#otpFree');
        var statusEl = overlay.querySelector('#otpStatus');
        var startBtn = overlay.querySelector('#otpStart');
        var cancelBtn = overlay.querySelector('#otpCancel');
        var useViewBtn = overlay.querySelector('#otpUseView');
        var toggleManual = overlay.querySelector('#otpToggleManual');
        var manualBox = overlay.querySelector('#otpManual');
        var applyManual = overlay.querySelector('#otpApplyManual');
        var nIn = overlay.querySelector('#otpN');
        var sIn = overlay.querySelector('#otpS');
        var wIn = overlay.querySelector('#otpW');
        var eIn = overlay.querySelector('#otpE');
        var progressWrap = overlay.querySelector('#otpProgressWrap');
        var progressFill = overlay.querySelector('#otpProgressFill');

        var avgBytes = (area.bytes && area.tileCount) ? (area.bytes / area.tileCount) : BYTES_PER_TILE_AVG;
        var awaitingConfirm = false;
        var running = false;

        function syncManualInputs() {
            nIn.value = keepBbox.north.toFixed(4);
            sIn.value = keepBbox.south.toFixed(4);
            wIn.value = keepBbox.west.toFixed(4);
            eIn.value = keepBbox.east.toFixed(4);
        }

        function recalc() {
            keepRect.setBounds([[keepBbox.south, keepBbox.west], [keepBbox.north, keepBbox.east]]);
            bboxEl.textContent =
                'NV: ' + fmtCoord(keepBbox.north, true) + ', ' + fmtCoord(keepBbox.west, false) + '\n' +
                'SE: ' + fmtCoord(keepBbox.south, true) + ', ' + fmtCoord(keepBbox.east, false);
            syncManualInputs();

            var plan = planPrune(area, keepBbox);
            keepEl.textContent = plan.keepCount.toLocaleString('sv-SE') + ' tiles';
            delEl.textContent = plan.deleteCount.toLocaleString('sv-SE') + ' tiles';
            freeEl.textContent = '~' + formatBytes(Math.round(avgBytes * plan.deleteCount));

            awaitingConfirm = false;
            startBtn.textContent = 'Beskär';
            startBtn.disabled = plan.keepCount === 0 || plan.deleteCount === 0;
            statusEl.innerHTML = '';
        }

        useViewBtn.addEventListener('click', function () {
            var b = map.getBounds();
            keepBbox = clampBbox({
                south: b.getSouth(), west: b.getWest(),
                north: b.getNorth(), east: b.getEast()
            }, area.bbox);
            if (!isValidBbox(keepBbox)) {
                statusEl.innerHTML = '<div class="ot-block">Nuvarande vy ligger utanför kamuflage-området. Pan:a in i området först.</div>';
                return;
            }
            recalc();
        });

        toggleManual.addEventListener('click', function () {
            manualBox.style.display = manualBox.style.display === 'none' ? '' : 'none';
        });

        applyManual.addEventListener('click', function () {
            var n = parseFloat(nIn.value), s = parseFloat(sIn.value);
            var w = parseFloat(wIn.value), e = parseFloat(eIn.value);
            if (!isFinite(n) || !isFinite(s) || !isFinite(w) || !isFinite(e)) {
                statusEl.innerHTML = '<div class="ot-block">Ogiltiga koordinater.</div>';
                return;
            }
            var next = clampBbox({ south: s, west: w, north: n, east: e }, area.bbox);
            if (!isValidBbox(next)) {
                statusEl.innerHTML = '<div class="ot-block">Koordinaterna täcker inget område inom kamuflage-bbox.</div>';
                return;
            }
            keepBbox = next;
            recalc();
        });

        function close() {
            try { keepRect.remove(); } catch (_) {}
            try { areaRect.remove(); } catch (_) {}
            overlay.remove();
        }

        cancelBtn.addEventListener('click', close);

        startBtn.addEventListener('click', async function () {
            if (running) return;
            var plan = planPrune(area, keepBbox);
            if (plan.keepCount === 0 || plan.deleteCount === 0) return;

            if (!awaitingConfirm) {
                awaitingConfirm = true;
                startBtn.textContent = 'Bekräfta: behåll ' + plan.keepCount + ', radera ' + plan.deleteCount;
                statusEl.innerHTML = '<div class="ot-warn">Detta går inte att ångra. Klicka knappen igen för att bekräfta.</div>';
                return;
            }

            var actionRadio = overlay.querySelector('input[name="otpAction"]:checked');
            var action = actionRadio ? actionRadio.value : 'replace';

            running = true;
            startBtn.disabled = true;
            startBtn.textContent = 'Beskär…';
            cancelBtn.disabled = true;
            progressWrap.style.display = '';
            progressFill.style.width = '0%';
            statusEl.innerHTML = '<div class="ot-stat"><span>Förlopp</span><b id="otpProg">0 / ' + plan.deleteCount + '</b></div>';

            try {
                var result = await pruneArea(area.id, keepBbox, {
                    action: action,
                    onProgress: function (p) {
                        var pct = p.total ? Math.round(p.done / p.total * 100) : 0;
                        progressFill.style.width = pct + '%';
                        var prog = overlay.querySelector('#otpProg');
                        if (prog) prog.textContent = p.done + ' / ' + p.total;
                    }
                });
                statusEl.innerHTML =
                    '<div class="ot-stat"><span>Klart</span><b>Behöll ' + result.kept +
                    ', raderade ' + result.deleted + '</b></div>' +
                    '<div class="ot-warn">Verkansområdet finns kvar offline. Stäng modalen för att se uppdaterad områdes-lista.</div>';
                cancelBtn.disabled = false;
                cancelBtn.textContent = 'Klar';
            } catch (err) {
                running = false;
                cancelBtn.disabled = false;
                startBtn.disabled = false;
                startBtn.textContent = 'Beskär';
                awaitingConfirm = false;
                var msg = err && err.message ? err.message : 'okänt';
                statusEl.innerHTML = '<div class="ot-block">Fel vid beskärning: ' + msg + '</div>';
            }
        });

        recalc();
    }

    function openKamuflageModal(map) {
        if (!map || typeof map.getBounds !== 'function') {
            console.warn('[offline-tiles-kamuflage] openKamuflageModal: map saknas eller saknar getBounds');
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
                        '<input type="range" id="otkMin" min="6" max="17" step="1" value="' + initMin + '">' +
                    '</div>' +
                    '<div>' +
                        '<label>Max zoom: <span id="otkMaxLbl">' + initMax + '</span></label>' +
                        '<input type="range" id="otkMax" min="6" max="17" step="1" value="' + initMax + '">' +
                    '</div>' +
                '</div>' +
                '<div class="ot-stat"><span>Tiles att ladda ner</span><b id="otkCount">—</b></div>' +
                '<div class="ot-stat"><span>Uppskattad storlek</span><b id="otkBytes">—</b></div>' +
                '<div class="ot-stat"><span>Uppskattad tid</span><b id="otkTime">—</b></div>' +
                '<label style="margin-top:12px">Hastighet</label>' +
                '<div style="font-size:0.78rem;color:#e8f0e8;line-height:1.5">' +
                    '<label class="ot-confirm" style="margin:0"><input type="radio" name="otkSpeed" value="standard" checked> Standard (1 req / 0,5 s) — färdigt på ~minuter</label>' +
                    '<label class="ot-confirm" style="margin:6px 0 0"><input type="radio" name="otkSpeed" value="schedule"> Schemalagd (1 req / 3 s, lägre signatur, kör över natt). Auto-paus vid offline / batteri &lt; 20 %. Wake Lock håller skärm aktiv.</label>' +
                '</div>' +
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

            var speedRadio = overlay.querySelector('input[name="otkSpeed"]:checked');
            var chosenThrottle = (speedRadio && speedRadio.value === 'schedule') ? 3000 : BULK_THROTTLE_MS;
            var ms = currentTileCount * (chosenThrottle / BULK_PARALLEL);
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
        var speedRadios = overlay.querySelectorAll('input[name="otkSpeed"]');
        for (var sr = 0; sr < speedRadios.length; sr++) {
            speedRadios[sr].addEventListener('change', recalc);
        }
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
                    '<div class="ot-warn">Området är nedladdat och markerat som kamuflage. Klicka <b>Beskär</b> i listan för att rensa cachen ner till verkansområdet.</div>';
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

            var speedRadio = overlay.querySelector('input[name="otkSpeed"]:checked');
            var throttleChoice = (speedRadio && speedRadio.value === 'schedule') ? 3000 : BULK_THROTTLE_MS;

            activeJobId = startJob({
                bbox: currentBbox,
                minZoom: mn,
                maxZoom: mx,
                kind: 'kamuflage',
                mode: 'new',
                parallel: BULK_PARALLEL,
                throttleMs: throttleChoice
            });
        });
    }

    global.OfflineTilesKamuflage = {
        BULK_MAX_TILES: BULK_MAX_TILES,
        BULK_PARALLEL: BULK_PARALLEL,
        BULK_THROTTLE_MS: BULK_THROTTLE_MS,
        openKamuflageModal: openKamuflageModal,
        openPruneModal: openPruneModal,
        pruneArea: pruneArea,
        planPrune: planPrune
    };
})(window);
