// ─────────────────────────────────────────────────────────────────────────────
//  MINKARTA — spelläge "SÄNKA MINOR"
//
//  Integritetskontrakt (samma som minkarta.html):
//    - Ingen state-sync över nätet. Ingen WebSocket. Inget auto-upload.
//    - All delning sker user-initiated via PNG + clipboard/share-sheet.
//    - Spelstate hålls strikt separerat från skarpt tillstånd så att
//      övning och verklig minläggning aldrig blandas ihop.
// ─────────────────────────────────────────────────────────────────────────────

(function (global) {

    const LS_KEY = 'minkarta.game';

    const gameState = {
        active: false,              // true när övningsläge är på
        role: null,                 // 'A' (minerare) | 'B' (röjare)
        centerLL: null,             // { lat, lng }
        sideM: 500,                 // kvadratens sida i meter
        budgetM2: 10000,            // tillåten "minerbar" yta
        zoneLayer: null,            // Leaflet rectangle
        objects: []                 // spelets egna objekt
    };

    // Helper: förflytta lat/lng n meter norr/öst
    function offsetLL(lat, lng, dEast, dNorth) {
        const R = 6378137;
        const dLat = dNorth / R * 180 / Math.PI;
        const dLng = dEast / (R * Math.cos(lat * Math.PI / 180)) * 180 / Math.PI;
        return { lat: lat + dLat, lng: lng + dLng };
    }

    function zoneBounds() {
        if (!gameState.centerLL) return null;
        const half = gameState.sideM / 2;
        const sw = offsetLL(gameState.centerLL.lat, gameState.centerLL.lng, -half, -half);
        const ne = offsetLL(gameState.centerLL.lat, gameState.centerLL.lng, half, half);
        return [[sw.lat, sw.lng], [ne.lat, ne.lng]];
    }

    function drawZone(map) {
        if (gameState.zoneLayer) { map.removeLayer(gameState.zoneLayer); gameState.zoneLayer = null; }
        const b = zoneBounds(); if (!b) return;
        gameState.zoneLayer = L.rectangle(b, {
            color: '#e65100', weight: 3, fill: false, dashArray: '6 4'
        }).addTo(map);
    }

    function totalUsedArea() {
        // Polygoner: shoelace på platt approximation (bra för små ytor)
        let used = 0;
        for (const o of gameState.objects) {
            const sym = global.MK_SYMBOLS[o.typ];
            if (!sym) continue;
            if (sym.category === 'polygon' && o.path && o.path.length >= 3) {
                used += polygonAreaM2(o.path);
            } else if (sym.category === 'line' && o.path && o.path.length >= 2) {
                // Antag 5 m bredd för minlinje
                used += polylineLengthM(o.path) * 5;
            }
        }
        return used;
    }

    function polygonAreaM2(path) {
        // Ekvirektangulär projektion runt centroid
        let cLat = 0, cLng = 0;
        for (const p of path) { cLat += p.lat; cLng += p.lng; }
        cLat /= path.length; cLng /= path.length;
        const mPerDegLat = 111320;
        const mPerDegLng = 111320 * Math.cos(cLat * Math.PI / 180);
        let sum = 0;
        for (let i = 0; i < path.length; i++) {
            const a = path[i], b = path[(i + 1) % path.length];
            const ax = (a.lng - cLng) * mPerDegLng;
            const ay = (a.lat - cLat) * mPerDegLat;
            const bx = (b.lng - cLng) * mPerDegLng;
            const by = (b.lat - cLat) * mPerDegLat;
            sum += (ax * by) - (bx * ay);
        }
        return Math.abs(sum) / 2;
    }

    function polylineLengthM(path) {
        const R = 6371000;
        let tot = 0;
        for (let i = 1; i < path.length; i++) {
            const a = path[i - 1], b = path[i];
            const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
            const dla = la2 - la1;
            const dlo = (b.lng - a.lng) * Math.PI / 180;
            const h = Math.sin(dla / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dlo / 2) ** 2;
            tot += 2 * R * Math.asin(Math.sqrt(h));
        }
        return tot;
    }

    function save() {
        try { localStorage.setItem(LS_KEY, JSON.stringify({
            active: gameState.active, role: gameState.role,
            centerLL: gameState.centerLL, sideM: gameState.sideM, budgetM2: gameState.budgetM2,
            objects: gameState.objects
        })); } catch (_) {}
    }

    function load() {
        try {
            const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
            if (s) Object.assign(gameState, s);
        } catch (_) {}
    }

    // ── UI: banner + kontrollpanel ──────────────────────────────────────────
    function installBanner() {
        if (document.getElementById('mkGameBanner')) return;
        const banner = document.createElement('div');
        banner.id = 'mkGameBanner';
        banner.style.cssText = 'display:none;position:sticky;top:0;z-index:5000;background:#e65100;color:#fff;padding:8px 14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;text-align:center;font-size:0.82rem;margin:-16px -16px 12px;';
        banner.textContent = 'ÖVNING – FIKTIV DATA';
        document.body.insertBefore(banner, document.body.firstChild);
    }

    function setBannerVisible(v) {
        const b = document.getElementById('mkGameBanner');
        if (b) b.style.display = v ? 'block' : 'none';
    }

    function installPanel() {
        if (document.getElementById('mkGamePanel')) return;
        const root = document.querySelector('main') || document.body;
        const panel = document.createElement('details');
        panel.id = 'mkGamePanel';
        panel.className = 'about';
        panel.innerHTML = `
            <summary>Spelläge — SÄNKA MINOR</summary>
            <div class="about-body">
                <p style="margin-bottom:8px">
                    Övningsspel: en spelare placerar minor inom en avgränsad kvadrat, skickar en
                    <i>blind</i> PNG (utan minor) + MGRS-center via Signal. Motspelaren öppnar samma
                    snitt i MINKARTA, gissar och skickar tillbaka sin egen PNG. Facit jämförs
                    manuellt. Ingen data går över nätet.
                </p>
                <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
                    <button type="button" class="btn btn-sm btn-ghost" id="gStart">Starta övning här</button>
                    <button type="button" class="btn btn-sm btn-ghost" id="gRoleToggle">Byt roll</button>
                    <button type="button" class="btn btn-sm" id="gEnd" style="background:#c62828;color:#fff">Avsluta övning</button>
                </div>
                <div id="gStats" style="margin-top:10px;font-size:0.8rem;color:var(--text-secondary);line-height:1.6"></div>
                <div id="gActions" style="display:none;margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
                    <button type="button" class="btn btn-sm btn-ghost" id="gBlind" style="flex:1">Exportera BLIND</button>
                    <button type="button" class="btn btn-sm btn-ghost" id="gFacit" style="flex:1">Exportera FACIT</button>
                </div>
            </div>
        `;
        // Sätt in FÖRE "Om MINKARTA"-detailset så spel-panelen kommer
        // direkt efter minprotokollet i läsordningen (2026-04-28).
        const about = document.getElementById('aboutPanel');
        if (about && about.parentNode === root) {
            root.insertBefore(panel, about);
        } else {
            root.appendChild(panel);
        }

        document.getElementById('gStart').addEventListener('click', onStart);
        document.getElementById('gRoleToggle').addEventListener('click', onRoleToggle);
        document.getElementById('gEnd').addEventListener('click', onEnd);
        document.getElementById('gBlind').addEventListener('click', () => onExport('blind'));
        document.getElementById('gFacit').addEventListener('click', () => onExport('facit'));
    }

    function refreshStats() {
        const box = document.getElementById('gStats');
        if (!box) return;
        if (!gameState.active) {
            box.textContent = 'Övning avstängd.';
            document.getElementById('gActions').style.display = 'none';
            return;
        }
        const used = totalUsedArea();
        const pct = Math.min(100, Math.round(used / gameState.budgetM2 * 100));
        const lines = [
            'Roll: <b>' + (gameState.role === 'A' ? 'A (minerare)' : 'B (röjare)') + '</b>',
            'Zon: ' + gameState.sideM + ' × ' + gameState.sideM + ' m',
            'Budget: ' + gameState.budgetM2.toLocaleString('sv-SE') + ' m²',
            'Använt: ' + Math.round(used).toLocaleString('sv-SE') + ' m² (' + pct + ' %)'
        ];
        box.innerHTML = lines.join('<br>');
        document.getElementById('gActions').style.display = 'flex';
    }

    // ── Handlers ────────────────────────────────────────────────────────────
    function onStart() {
        const map = global.__minkartaMap;
        if (!map) { alert('Kartan är inte redo.'); return; }
        const c = map.getCenter();
        const sideStr = prompt('Zonens sida i meter (t.ex. 500):', String(gameState.sideM || 500));
        const side = parseInt(sideStr, 10);
        if (!side || side < 50 || side > 5000) return;
        const budStr = prompt('Minbudget i m² (t.ex. 10000):', String(gameState.budgetM2 || 10000));
        const bud = parseInt(budStr, 10);
        if (!bud || bud < 100) return;

        gameState.active = true;
        gameState.role = gameState.role || 'A';
        gameState.centerLL = { lat: c.lat, lng: c.lng };
        gameState.sideM = side;
        gameState.budgetM2 = bud;
        gameState.objects = [];
        drawZone(map);
        setBannerVisible(true);
        save();
        refreshStats();
        if (global.toast) global.toast('ÖVNING startad. Placera minor inom den orange kvadraten.', 3000);
    }

    function onRoleToggle() {
        if (!gameState.active) { alert('Starta övning först.'); return; }
        gameState.role = gameState.role === 'A' ? 'B' : 'A';
        // Om rollen byts till B, rensa bort mineringen så att B börjar på en tom zon
        if (gameState.role === 'B') {
            gameState.objects = [];
        }
        save();
        refreshStats();
    }

    function onEnd() {
        if (!gameState.active) return;
        if (!confirm('Avsluta övningen? All spelstate nollställs.')) return;
        const map = global.__minkartaMap;
        if (gameState.zoneLayer && map) { map.removeLayer(gameState.zoneLayer); gameState.zoneLayer = null; }
        gameState.active = false;
        gameState.role = null;
        gameState.objects = [];
        setBannerVisible(false);
        save();
        refreshStats();
    }

    async function onExport(mode) {
        if (!gameState.active) return;
        if (!global.MK_EXPORT) { alert('Exportmodulen saknas.'); return; }
        const toExport = [];
        // Lägg två yttergränsmarkörer i zon-hörnen så bbox blir rätt
        const b = zoneBounds();
        if (b) {
            toExport.push({ id: 'gz1', typ: 'ytter', lat: b[0][0], lng: b[0][1], created: Date.now() });
            toExport.push({ id: 'gz2', typ: 'ytter', lat: b[1][0], lng: b[1][1], created: Date.now() });
        }
        if (mode === 'facit') {
            for (const o of gameState.objects) toExport.push(o);
        }
        const title = mode === 'blind'
            ? 'ÖVNING — SÄNKA MINOR (BLIND)'
            : 'ÖVNING — SÄNKA MINOR (FACIT)';
        const subtitle = 'Roll ' + gameState.role + ' · ' + gameState.sideM + '×' + gameState.sideM + ' m · FIKTIV DATA';
        try {
            const res = await global.MK_EXPORT.renderExportAsync({
                objects: toExport, title, subtitle, targetPx: 2048, dpr: 2
            });
            let centerMgrs = '';
            try {
                const cLat = (res.bbox.minLat + res.bbox.maxLat) / 2;
                const cLng = (res.bbox.minLng + res.bbox.maxLng) / 2;
                centerMgrs = global.MGRS.forward(cLat, cLng);
            } catch (_) {}
            const name = global.MK_EXPORT.exportFilename(centerMgrs).replace('minkarta_', 'ovning_' + mode + '_');
            await global.MK_EXPORT.shareOrDownload(res.blob, name);
            if (global.toast) global.toast('Exporterad som ' + name);
        } catch (e) {
            alert('Fel vid export: ' + e.message);
        }
    }

    // ── Integration med klickhanteraren ─────────────────────────────────────
    // Patch: om övning är aktiv och rollen är A eller B, registrera klick
    // som spel-objekt i stället för skarp minering.
    function wrapHandleMapClick(origHandler) {
        return function (e) {
            if (!gameState.active) return origHandler(e);
            if (!global.activeTool) return origHandler(e);
            const sym = global.MK_SYMBOLS[global.activeTool];
            if (!sym) return origHandler(e);
            if (sym.category === 'point' || sym.category === 'meta') {
                const obj = {
                    id: 'g_' + Date.now().toString(36),
                    typ: global.activeTool,
                    lat: e.latlng.lat, lng: e.latlng.lng, created: Date.now()
                };
                gameState.objects.push(obj);
                L.marker(e.latlng, { icon: global.mkMakeIcon(global.activeTool), draggable: false })
                    .addTo(global.__minkartaMap);
                save();
                refreshStats();
            } else {
                if (global.toast) global.toast('Använd punktverktyg i övningsläget.', 2200);
            }
        };
    }

    function init(opts) {
        installBanner();
        installPanel();
        load();
        if (opts && opts.onReady) opts.onReady(gameState);
        // Re-draw zonen om en övning var aktiv före reload
        if (gameState.active && global.__minkartaMap) {
            drawZone(global.__minkartaMap);
            setBannerVisible(true);
            refreshStats();
        } else {
            refreshStats();
        }
    }

    global.MK_GAME = {
        init,
        state: gameState,
        wrapHandleMapClick
    };

})(window);
