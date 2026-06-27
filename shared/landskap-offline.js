// ─────────────────────────────────────────────────────────────────────────────
//  LANDSKAP-OFFLINE — helskärms-väljare för offline-nedladdning per landskap.
//
//  Öppnas från "Ladda ner offline"- och "Härdat läge"-knapparna (minkarta.html
//  + rapportfilernas kartmodal). Operatören ser en interaktiv karta över
//  Sveriges landskap + en lista, hovrar/klickar för att lägga landskap i en
//  kö, och klickar "Ladda ner offline" för att hämta var och en som en egen
//  liten PMTiles-fil — istället för hela Sverige (~4,1 GB) i en klump.
//
//  Beroenden (alla via window-globaler, ingen modul-import):
//   - window.HVLandskap        (landskap.js)      — presets: bbox/center/url/bytes
//   - window.HVLandskapGeo     (landskap-geo.js)  — förenklad GeoJSON för kartan
//   - window.PMTilesPrefetch   (pmtiles-layer.js) — fetchSmart/isPrefetched/...
//
//  Ingen Leaflet-dep: kartan ritas som inline-SVG (Web Mercator), vilket gör
//  att väljaren fungerar identiskt på rapportsidorna (ingen tile-bakgrund =
//  noll utgående anrop bara för att öppna väljaren — OPSEC-rent).
//
//  open(opts):
//    opts.ctrl  — PMTiles härdat-controller (window.MK_HARDENING eller
//                 map.__hardenCtrl). Används för "Visa på kartan" (setUrl +
//                 activate) och "Stäng av härdat". Valfri.
//    opts.map   — Leaflet-kartan, för att panna till landskapet efter aktivering.
//    opts.onClose — callback när overlayn stängs.
// ─────────────────────────────────────────────────────────────────────────────

(function (global) {
    'use strict';

    var STYLE_ID = 'landskap-offline-styles';
    var OVERLAY_ID = 'landskap-offline-overlay';

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var css = [
            '.lo-overlay{position:fixed;inset:0;z-index:100000;background:#0d1f0d;color:#e8f0e8;',
                'font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;overflow:hidden}',
            '.lo-head{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #2d4a2d;background:#152815;flex:0 0 auto}',
            '.lo-head h2{margin:0;font-size:1rem;letter-spacing:0.04em;color:#c8e6c9;font-weight:700;flex:1;min-width:0}',
            '.lo-head .lo-sub{font-size:0.72rem;color:#8aaa8a;font-weight:400;display:block;margin-top:2px;letter-spacing:0}',
            '.lo-hovername{font-size:0.8rem;color:#c8a24e;font-weight:600;white-space:nowrap}',
            '.lo-x{background:none;border:1px solid #2d4a2d;color:#8aaa8a;border-radius:6px;width:38px;height:38px;font-size:1.3rem;line-height:1;cursor:pointer;flex:0 0 auto}',
            '.lo-x:hover{background:#3d1a1a;color:#ff8a8a;border-color:#c62828}',
            '.lo-body{flex:1 1 auto;display:flex;min-height:0;overflow:hidden}',
            '.lo-mapwrap{flex:1 1 55%;min-width:0;position:relative;background:#132613;display:flex;align-items:center;justify-content:center;padding:8px}',
            '.lo-svg{width:100%;height:100%;touch-action:manipulation}',
            '.lo-land{fill:#3a6e3a;stroke:#0d1f0d;stroke-width:1;cursor:pointer;transition:fill 0.12s}',
            '.lo-land:hover,.lo-land.lo-hover{fill:#62b562}',
            // Flytande etikett som följer muspekaren och visar landskapets namn.
            '.lo-tip{position:absolute;pointer-events:none;left:0;top:0;z-index:5;background:rgba(13,31,13,0.96);border:1px solid #62b562;',
                'color:#eafaea;padding:4px 11px;border-radius:7px;font-size:0.92rem;font-weight:700;white-space:nowrap;',
                'box-shadow:0 3px 10px rgba(0,0,0,0.55);opacity:0;transition:opacity 0.08s;will-change:transform}',
            '.lo-tip.lo-tip-on{opacity:1}',
            '.lo-land.lo-queued{fill:#4caf50;stroke:#0d1f0d}',
            '.lo-land.lo-cached{fill:#2f6d8c;stroke:#0d1f0d}',
            '.lo-land.lo-cached.lo-active{fill:#4aa3c8}',
            '.lo-land.lo-soon{fill:#162a16;cursor:not-allowed;opacity:0.65}',
            '.lo-land.lo-soon:hover{fill:#162a16}',
            '.lo-side{flex:0 0 360px;max-width:46%;display:flex;flex-direction:column;border-left:1px solid #2d4a2d;background:#10220f;min-height:0}',
            '.lo-list{flex:1 1 auto;overflow-y:auto;padding:8px 10px}',
            '.lo-group-h{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.08em;color:#8aaa8a;margin:12px 4px 4px;font-weight:700}',
            '.lo-group-h:first-child{margin-top:2px}',
            '.lo-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #1e3d1e;border-radius:6px;margin-bottom:5px;cursor:pointer;background:#0f240f}',
            '.lo-row:hover,.lo-row.lo-hover{border-color:#356b35;background:#133013}',
            '.lo-row.lo-queued{border-color:#4caf50;background:#15331a}',
            '.lo-row.lo-soon{opacity:0.55;cursor:not-allowed}',
            '.lo-row-main{flex:1;min-width:0}',
            '.lo-row-name{font-size:0.86rem;font-weight:600;color:#e8f0e8}',
            '.lo-row-meta{font-size:0.7rem;color:#8aaa8a;margin-top:1px}',
            '.lo-badge{font-size:0.64rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:2px 7px;border-radius:10px;white-space:nowrap}',
            '.lo-badge.b-soon{background:#23331f;color:#8aaa8a;border:1px solid #2d4a2d}',
            '.lo-badge.b-avail{background:#1e3d1e;color:#9ed99e;border:1px solid #356b35}',
            '.lo-badge.b-queued{background:#4caf50;color:#0d1f0d}',
            '.lo-badge.b-cached{background:#1d4456;color:#9fd6ee;border:1px solid #2f6d8c}',
            '.lo-badge.b-busy{background:#2a1a0a;color:#c8a24e;border:1px solid #c8a24e}',
            '.lo-rowbtns{display:flex;gap:5px;flex:0 0 auto}',
            '.lo-mini{font-size:0.66rem;padding:3px 8px;border-radius:5px;border:1px solid #2d4a2d;background:#0f240f;color:#cfe6cf;cursor:pointer}',
            '.lo-mini:hover{background:#1e3d1e;border-color:#4caf50}',
            '.lo-mini.lo-danger:hover{background:#3d1a1a;border-color:#c62828;color:#ff8a8a}',
            '.lo-foot{flex:0 0 auto;border-top:1px solid #2d4a2d;background:#152815;padding:12px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
            '.lo-foot-info{flex:1;min-width:160px;font-size:0.78rem;color:#cfe6cf;line-height:1.4}',
            '.lo-foot-info b{color:#4caf50}',
            '.lo-warn{color:#c8a24e}',
            '.lo-err{color:#ff8a8a}',
            '.lo-btn{padding:9px 16px;border-radius:6px;border:1px solid #2d4a2d;background:#1a321a;color:#e8f0e8;font:inherit;font-size:0.82rem;cursor:pointer}',
            '.lo-btn:hover{background:#243d24}',
            '.lo-btn-primary{background:#4caf50;color:#0d1f0d;border-color:#4caf50;font-weight:700}',
            '.lo-btn-primary:hover{background:#66bb6a}',
            '.lo-btn-primary:disabled{background:#23331f;color:#5a7a5a;border-color:#2d4a2d;cursor:not-allowed}',
            '.lo-btn-ghost{background:transparent;color:#8aaa8a}',
            '@media (max-width:760px){',
                '.lo-body{flex-direction:column}',
                // Kartan är hög och smal (Sverige) — ge den rejäl höjd så den inte
                // krymper till en oläslig strimma på en bred/kort mobilskärm.
                '.lo-mapwrap{flex:0 0 auto;height:52vh;min-height:260px;padding:4px}',
                '.lo-side{flex:1 1 auto;max-width:none;border-left:none;border-top:1px solid #2d4a2d}',
                '.lo-tip{font-size:1rem;padding:5px 13px}',
                '.lo-hovername{display:none}', // floating-tippen räcker på mobil
            '}'
        ].join('');
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = css;
        document.head.appendChild(s);
    }

    // ── Web Mercator-projektion av landskaps-GeoJSON till SVG-koordinater ────
    function mercY(lat) { return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }

    // Bygg { paths: {id:{d, cx, cy}}, viewBox } från GeoJSON. Uniform skala på
    // x/y så aspekten bevaras (X = lon i radianer, Y = mercator-lat).
    function buildProjection(geo, width) {
        var Xmin = Infinity, Xmax = -Infinity, Ymin = Infinity, Ymax = -Infinity;
        function scan(coords) {
            if (typeof coords[0] === 'number') {
                var X = coords[0] * Math.PI / 180;
                var Y = mercY(coords[1]);
                if (X < Xmin) Xmin = X; if (X > Xmax) Xmax = X;
                if (Y < Ymin) Ymin = Y; if (Y > Ymax) Ymax = Y;
                return;
            }
            for (var i = 0; i < coords.length; i++) scan(coords[i]);
        }
        for (var f = 0; f < geo.features.length; f++) scan(geo.features[f].geometry.coordinates);

        var pad = 6;
        var scale = (width - pad * 2) / (Xmax - Xmin);
        var height = (Ymax - Ymin) * scale + pad * 2;
        function px(lon) { return pad + (lon * Math.PI / 180 - Xmin) * scale; }
        function py(lat) { return pad + (Ymax - mercY(lat)) * scale; }

        var paths = {};
        for (var k = 0; k < geo.features.length; k++) {
            var feat = geo.features[k];
            var id = feat.properties.id;
            var g = feat.geometry;
            var polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
            var d = '';
            var sumX = 0, sumY = 0, n = 0;
            for (var p = 0; p < polys.length; p++) {
                var rings = polys[p];
                for (var r = 0; r < rings.length; r++) {
                    var ring = rings[r];
                    for (var q = 0; q < ring.length; q++) {
                        var X2 = px(ring[q][0]), Y2 = py(ring[q][1]);
                        d += (q === 0 ? 'M' : 'L') + X2.toFixed(1) + ' ' + Y2.toFixed(1);
                        if (r === 0) { sumX += X2; sumY += Y2; n++; }
                    }
                    d += 'Z';
                }
            }
            paths[id] = { d: d, cx: n ? sumX / n : 0, cy: n ? sumY / n : 0 };
        }
        return { paths: paths, width: width, height: height };
    }

    function fmtBytes(bytes) {
        if (!bytes) return '—';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' kB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(0) + ' MB';
        return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
    }
    function esc(s) {
        return String(s).replace(/[<>&"]/g, function (c) {
            return c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : '&quot;';
        });
    }

    // ── Huvud-entry ─────────────────────────────────────────────────────────
    function open(opts) {
        opts = opts || {};
        var ctrl = opts.ctrl || null;
        var map = opts.map || null;
        var onClose = opts.onClose || function () {};

        if (document.getElementById(OVERLAY_ID)) return; // redan öppen
        if (!global.HVLandskap || !global.HVLandskap.presets) {
            global.alert('Landskaps-data är inte laddad (landskap.js saknas).');
            return;
        }
        injectStyles();

        var PF = global.PMTilesPrefetch || null;

        // Syntetiskt "Hela Sverige"-val överst — filen finns redan (samma som
        // dagens "Ladda ner offline"), så väljaren är användbar direkt även
        // innan landskaps-filerna byggts.
        var svPreset = (PF && PF.SVERIGE_URL) ? {
            id: '_sverige', namn: 'Hela Sverige', landsdel: 'Hela landet', whole: true,
            center: [62.0, 16.5], zoom: 5,
            pmtiles: { url: PF.SVERIGE_URL, bytes: PF.SVERIGE_BYTES || 0, sha256: PF.SVERIGE_SHA256 || '' }
        } : null;

        function presetFor(id) {
            if (id === '_sverige') return svPreset;
            return global.HVLandskap.getPreset(id);
        }
        function isReady(p) { return !!(p && p.pmtiles && p.pmtiles.url && p.pmtiles.bytes > 0); }

        // state per id: { state:'soon'|'avail'|'cached', busy:false, pct:0, err:null }
        var status = {};
        var queue = [];        // ids i kö (i ordning)
        var busy = false;      // hela nedladdningssekvensen kör
        var cancelSignal = null;

        // ── DOM ──────────────────────────────────────────────────────────────
        var overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.className = 'lo-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Ladda ner kartor offline per landskap');
        overlay.innerHTML =
            '<div class="lo-head">' +
                '<h2>Ladda ner kartor offline' +
                    '<span class="lo-sub">Välj ett eller flera landskap — varje landskap blir en egen liten offline-fil.</span>' +
                '</h2>' +
                '<span class="lo-hovername" id="loHover"></span>' +
                '<button type="button" class="lo-x" id="loClose" title="Stäng (Esc)" aria-label="Stäng">×</button>' +
            '</div>' +
            '<div class="lo-body">' +
                '<div class="lo-mapwrap"><svg class="lo-svg" id="loSvg" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg></div>' +
                '<div class="lo-side"><div class="lo-list" id="loList"></div></div>' +
            '</div>' +
            '<div class="lo-foot">' +
                '<div class="lo-foot-info" id="loInfo"></div>' +
                '<button type="button" class="lo-btn lo-btn-ghost" id="loHardOff" style="display:none">Stäng av härdat</button>' +
                '<button type="button" class="lo-btn lo-btn-primary" id="loDownload" disabled>Ladda ner offline</button>' +
            '</div>';
        document.body.appendChild(overlay);

        var svg = overlay.querySelector('#loSvg');
        var mapWrap = overlay.querySelector('.lo-mapwrap');
        var listEl = overlay.querySelector('#loList');
        var infoEl = overlay.querySelector('#loInfo');
        var dlBtn = overlay.querySelector('#loDownload');
        var hardOffBtn = overlay.querySelector('#loHardOff');
        var hoverEl = overlay.querySelector('#loHover');

        // Flytande etikett som följer muspekaren över kartan.
        var tip = document.createElement('div');
        tip.className = 'lo-tip';
        mapWrap.appendChild(tip);
        var hoverId = null;        // landskapet pekaren är över just nu
        function moveTip(clientX, clientY) {
            if (!hoverId) return;
            var r = mapWrap.getBoundingClientRect();
            var x = clientX - r.left, y = clientY - r.top;
            var tw = tip.offsetWidth, th = tip.offsetHeight, off = 16;
            // Placera nedtill höger om pekaren; vänd in mot kartan vid kanterna.
            var px = (x + off + tw > r.width) ? x - off - tw : x + off;
            var py = (y + off + th > r.height) ? y - off - th : y + off;
            if (px < 2) px = 2;
            if (py < 2) py = 2;
            tip.style.transform = 'translate(' + Math.round(px) + 'px,' + Math.round(py) + 'px)';
        }
        function showTip(id, clientX, clientY) {
            var p = presetFor(id);
            tip.textContent = p ? p.namn : '';
            tip.classList.add('lo-tip-on');
            moveTip(clientX, clientY);
        }
        function hideTip() { tip.classList.remove('lo-tip-on'); }

        // ── SVG-karta ──────────────────────────────────────────────────────
        var proj = buildProjection(global.HVLandskapGeo, 1000);
        svg.setAttribute('viewBox', '0 0 ' + proj.width + ' ' + Math.round(proj.height));
        var pathEls = {};
        var order = global.HVLandskap.order || Object.keys(global.HVLandskap.presets);
        order.forEach(function (id) {
            var pr = proj.paths[id];
            if (!pr) return;
            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pr.d);
            path.setAttribute('class', 'lo-land');
            path.dataset.id = id;
            svg.appendChild(path);
            pathEls[id] = path;
        });

        // ── Lista ──────────────────────────────────────────────────────────
        var rowEls = {};
        function buildList() {
            listEl.innerHTML = '';
            var groups = [];
            if (svPreset) groups.push({ namn: 'Hela landet', ids: ['_sverige'] });
            (global.HVLandskap.LANDSDELAR || []).forEach(function (ld) {
                var ids = (global.HVLandskap.byLandsdel && global.HVLandskap.byLandsdel[ld]) || [];
                if (ids.length) groups.push({ namn: ld, ids: ids });
            });
            groups.forEach(function (grp) {
                var h = document.createElement('div');
                h.className = 'lo-group-h';
                h.textContent = grp.namn;
                listEl.appendChild(h);
                grp.ids.forEach(function (id) {
                    var row = document.createElement('div');
                    row.className = 'lo-row';
                    row.dataset.id = id;
                    row.innerHTML =
                        '<div class="lo-row-main">' +
                            '<div class="lo-row-name"></div>' +
                            '<div class="lo-row-meta"></div>' +
                        '</div>' +
                        '<span class="lo-badge"></span>' +
                        '<div class="lo-rowbtns"></div>';
                    listEl.appendChild(row);
                    rowEls[id] = row;
                });
            });
        }
        buildList();

        // ── Status-init (vilka filer finns redan cachade) ────────────────────
        async function refreshStatuses() {
            var ids = Object.keys(rowEls);
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                var p = presetFor(id);
                var st = status[id] || (status[id] = { state: 'soon', busy: false, pct: 0, err: null });
                if (st.busy) continue;
                if (!isReady(p)) { st.state = 'soon'; continue; }
                var cached = false;
                if (PF && PF.isPrefetched) {
                    try { cached = await PF.isPrefetched(p.pmtiles.url, p.pmtiles.bytes); } catch (_) {}
                }
                st.state = cached ? 'cached' : 'avail';
            }
            renderAll();
        }

        function activeUrl() {
            return (ctrl && ctrl.isActive && ctrl.isActive() && ctrl.getUrl) ? ctrl.getUrl() : null;
        }

        // ── Render ───────────────────────────────────────────────────────────
        function renderRow(id) {
            var row = rowEls[id]; if (!row) return;
            var p = presetFor(id);
            var st = status[id] || { state: 'soon' };
            var queued = queue.indexOf(id) >= 0;
            var isActive = p && activeUrl() === p.pmtiles.url;

            row.querySelector('.lo-row-name').textContent = p ? p.namn : id;
            var meta = row.querySelector('.lo-row-meta');
            var badge = row.querySelector('.lo-badge');
            var btns = row.querySelector('.lo-rowbtns');
            btns.innerHTML = '';

            row.classList.toggle('lo-soon', st.state === 'soon');
            row.classList.toggle('lo-queued', queued);

            if (st.busy) {
                meta.textContent = fmtBytes(p.pmtiles.bytes) + ' · hämtar…';
                badge.className = 'lo-badge b-busy';
                badge.textContent = (st.pct || 0) + '%';
            } else if (st.state === 'soon') {
                meta.textContent = 'PMTiles-fil ej byggd än';
                badge.className = 'lo-badge b-soon';
                badge.textContent = 'Kommer snart';
            } else if (st.state === 'cached') {
                meta.textContent = fmtBytes(p.pmtiles.bytes) + (isActive ? ' · visas nu' : ' · finns offline');
                badge.className = 'lo-badge b-cached';
                badge.textContent = isActive ? 'Visas' : 'Nedladdad';
                if (ctrl) {
                    var showBtn = document.createElement('button');
                    showBtn.className = 'lo-mini';
                    showBtn.textContent = isActive ? 'Dölj' : 'Visa';
                    showBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        if (isActive) { deactivateHard(); } else { activateLandskap(id); }
                    });
                    btns.appendChild(showBtn);
                }
                var delBtn = document.createElement('button');
                delBtn.className = 'lo-mini lo-danger';
                delBtn.textContent = 'Radera';
                delBtn.addEventListener('click', async function (e) {
                    e.stopPropagation();
                    if (!global.confirm('Radera ' + p.namn + ' ur offline-lagret?')) return;
                    if (PF && PF.remove) { try { await PF.remove(p.pmtiles.url); } catch (_) {} }
                    status[id].state = 'avail';
                    if (isActive) deactivateHard();
                    renderAll();
                });
                btns.appendChild(delBtn);
            } else { // avail
                meta.textContent = '~' + fmtBytes(p.pmtiles.bytes);
                if (queued) {
                    badge.className = 'lo-badge b-queued';
                    badge.textContent = 'I kö';
                } else {
                    badge.className = 'lo-badge b-avail';
                    badge.textContent = 'Ladda ner';
                }
            }
        }

        function renderAll() {
            Object.keys(rowEls).forEach(renderRow);
            // SVG-klasser
            Object.keys(pathEls).forEach(function (id) {
                var el = pathEls[id];
                var st = status[id] || { state: 'soon' };
                var queued = queue.indexOf(id) >= 0;
                var p = presetFor(id);
                var isActive = p && activeUrl() === p.pmtiles.url;
                el.classList.toggle('lo-soon', st.state === 'soon' && !st.busy);
                el.classList.toggle('lo-queued', queued || st.busy);
                el.classList.toggle('lo-cached', st.state === 'cached');
                el.classList.toggle('lo-active', !!isActive);
            });
            updateFoot();
        }

        function queuedAvail() {
            return queue.filter(function (id) {
                var st = status[id]; return st && st.state === 'avail' && !st.busy;
            });
        }

        function updateFoot() {
            var q = queuedAvail();
            var totalBytes = q.reduce(function (s, id) { return s + (presetFor(id).pmtiles.bytes || 0); }, 0);
            if (busy) {
                var doneCount = queue.length - q.length;
                infoEl.innerHTML = 'Laddar ner… <b>' + (queue.filter(function (id) { return status[id] && status[id].state === 'cached'; }).length) +
                    '</b> klara av ' + queue.length + ' i kön.';
            } else if (q.length === 0) {
                infoEl.innerHTML = 'Klicka på ett landskap (kartan eller listan) för att lägga det i kön.';
            } else {
                infoEl.innerHTML = '<b>' + q.length + '</b> i kö · totalt <b>~' + fmtBytes(totalBytes) + '</b> att ladda ner.';
            }
            dlBtn.disabled = busy || q.length === 0;
            dlBtn.textContent = busy ? 'Laddar ner…' : 'Ladda ner offline';
            hardOffBtn.style.display = (ctrl && ctrl.isActive && ctrl.isActive()) ? '' : 'none';
        }

        // ── Interaktion ──────────────────────────────────────────────────────
        function selectId(id) {
            if (busy) return;
            var st = status[id] || { state: 'soon' };
            if (st.state === 'soon') { flashHover(presetFor(id).namn + ' — kommer snart'); return; }
            if (st.state === 'cached') { activateLandskap(id); return; }
            // avail → toggla kö
            var i = queue.indexOf(id);
            if (i >= 0) queue.splice(i, 1); else queue.push(id);
            renderAll();
        }

        function setHover(id, on) {
            if (pathEls[id]) pathEls[id].classList.toggle('lo-hover', on);
            if (rowEls[id]) rowEls[id].classList.toggle('lo-hover', on);
            if (on) {
                var p = presetFor(id);
                hoverEl.textContent = p ? p.namn : '';
            } else if (hoverEl.textContent === (presetFor(id) ? presetFor(id).namn : '')) {
                hoverEl.textContent = '';
            }
        }
        var flashTimer = null;
        function flashHover(text) {
            hoverEl.textContent = text;
            if (flashTimer) clearTimeout(flashTimer);
            flashTimer = setTimeout(function () { hoverEl.textContent = ''; }, 1800);
        }

        Object.keys(pathEls).forEach(function (id) {
            var el = pathEls[id];
            el.addEventListener('mouseenter', function (e) {
                hoverId = id; setHover(id, true); showTip(id, e.clientX, e.clientY);
            });
            el.addEventListener('mouseleave', function () {
                setHover(id, false);
                if (hoverId === id) { hoverId = null; hideTip(); }
            });
            el.addEventListener('click', function () { selectId(id); });
        });
        // Etiketten följer pekaren; göm den när musen lämnar kartan helt.
        svg.addEventListener('mousemove', function (e) { moveTip(e.clientX, e.clientY); });
        mapWrap.addEventListener('mouseleave', function () { hoverId = null; hideTip(); });
        Object.keys(rowEls).forEach(function (id) {
            var row = rowEls[id];
            row.addEventListener('mouseenter', function () { setHover(id, true); });
            row.addEventListener('mouseleave', function () { setHover(id, false); });
            row.addEventListener('click', function () { selectId(id); });
        });

        // ── Härdat-aktivering / -avstängning ──────────────────────────────────
        async function activateLandskap(id) {
            var p = presetFor(id);
            if (!ctrl || !p) return;
            try {
                if (ctrl.setUrl) await ctrl.setUrl(p.pmtiles.url);
                if (!ctrl.isActive()) { if (ctrl.activate) await ctrl.activate(); }
                if (map && map.setView && p.center) {
                    try { map.setView(p.center, p.zoom || 7); } catch (_) {}
                }
                renderAll();
                // Visa = "tillbaka till kartan": stäng väljaren så operatören
                // ser landskapet i härdat läge.
                close();
            } catch (err) {
                flashHover('Kunde inte visa: ' + ((err && err.message) || 'fel'));
            }
        }
        function deactivateHard() {
            if (ctrl && ctrl.deactivate) ctrl.deactivate();
            renderAll();
        }
        hardOffBtn.addEventListener('click', function () { deactivateHard(); });

        // ── Nedladdning (seriellt) ────────────────────────────────────────────
        async function startDownloads() {
            if (busy) return;
            var q = queuedAvail();
            if (!q.length) return;

            // Lagringskoll: varna om uppskattat fritt utrymme < ~1,15× behov.
            var needBytes = q.reduce(function (s, id) { return s + (presetFor(id).pmtiles.bytes || 0); }, 0);
            try {
                if (navigator.storage && navigator.storage.estimate) {
                    var est = await navigator.storage.estimate();
                    var free = (est.quota || 0) - (est.usage || 0);
                    if (free > 0 && free < needBytes * 1.15) {
                        if (!global.confirm('Det kan saknas utrymme: ~' + fmtBytes(needBytes) +
                            ' behövs men bara ~' + fmtBytes(free) + ' är ledigt enligt webbläsaren.\n\nFortsätt ändå?')) {
                            return;
                        }
                    }
                }
            } catch (_) {}

            busy = true;
            updateFoot();
            for (var i = 0; i < q.length; i++) {
                var id = q[i];
                var p = presetFor(id);
                var st = status[id];
                st.busy = true; st.pct = 0; st.err = null;
                renderRow(id);
                if (pathEls[id]) pathEls[id].classList.add('lo-queued');

                /* eslint-disable no-loop-func */
                var result = await (function (theId, preset) {
                    cancelSignal = (typeof AbortController !== 'undefined') ? new AbortController() : null;
                    var hash = (preset.pmtiles.url === (PF && PF.SVERIGE_URL)) ? (PF.SVERIGE_SHA256 || '') : (preset.pmtiles.sha256 || '');
                    return PF.fetchSmart(preset.pmtiles.url, {
                        expectedBytes: preset.pmtiles.bytes,
                        expectedSha256: hash,
                        signal: cancelSignal ? cancelSignal.signal : undefined,
                        onProgress: function (pr) {
                            status[theId].pct = pr.percent || 0;
                            renderRow(theId);
                        }
                    });
                })(id, p);
                /* eslint-enable no-loop-func */

                st.busy = false;
                cancelSignal = null;
                if (result && result.ok) {
                    st.state = 'cached';
                    var qi = queue.indexOf(id);
                    if (qi >= 0) queue.splice(qi, 1);
                } else {
                    st.err = (result && result.error) || 'okänt fel';
                    st.state = 'avail';
                }
                renderAll();
            }
            busy = false;

            // Sammanfatta + erbjud "visa" för det första nedladdade.
            var firstCached = q.find(function (id) { return status[id] && status[id].state === 'cached'; });
            var failed = q.filter(function (id) { return status[id] && status[id].err; });
            if (failed.length) {
                infoEl.innerHTML = '<span class="lo-err">' + failed.length + ' misslyckades</span> · ' +
                    (q.length - failed.length) + ' klara. Försök igen senare.';
            } else if (firstCached && ctrl) {
                infoEl.innerHTML = 'Klart! Alla valda landskap finns nu offline.';
            } else {
                infoEl.innerHTML = 'Klart! Landskapen finns nu offline.';
            }
            updateFoot();
        }
        dlBtn.addEventListener('click', startDownloads);

        // ── Stäng ──────────────────────────────────────────────────────────
        function close() {
            // Avbryt ev. pågående SW-prefetch? Nej — låt den fortsätta i
            // bakgrunden (SW äger fetchen). Bara den lokala vyn stängs.
            document.removeEventListener('keydown', onKey);
            overlay.remove();
            try { onClose(); } catch (_) {}
        }
        function onKey(e) {
            if (e.key === 'Escape' && !busy) close();
        }
        overlay.querySelector('#loClose').addEventListener('click', function () {
            if (busy && !global.confirm('En nedladdning pågår. Den fortsätter i bakgrunden. Stänga vyn?')) return;
            close();
        });
        document.addEventListener('keydown', onKey);

        // Init
        Object.keys(rowEls).forEach(function (id) { status[id] = { state: 'soon', busy: false, pct: 0, err: null }; });
        renderAll();
        refreshStatuses();

        return { close: close };
    }

    global.LandskapOffline = { open: open };

})(window);
