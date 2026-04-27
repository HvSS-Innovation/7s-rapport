// ─────────────────────────────────────────────────────────────────────────────
//  MINKARTA — PNG-export
//
//  Renderar en komplett minläggeskarta till en PNG:
//    1. Hittar bounding box: primärt från yttergränssymbolerna (typ "ytter"),
//       annars fallback = alla objekt + 20% padding.
//    2. Räknar ut zoom-nivå och de OpenTopoMap-tiles som behövs.
//    3. Laddar tiles via Image (CORS anonymous) parallellt.
//    4. Ritar kartan i en <canvas>, sedan alla objekt ovanpå, sedan overlays:
//       titel, fyra hörn-MGRS + center-MGRS, norrpil, skalstock, dekorruta.
//    5. toBlob -> nedladdning eller navigator.share.
//
//  INTEGRITET: inga minsymbolpositioner skickas ut. Enda utgående anrop är
//  OpenTopoMap-tiles (z/x/y), och endast för de rutor som täcker vy-bbox.
// ─────────────────────────────────────────────────────────────────────────────

(function (global) {

    const TILE_SUBDOMAINS = ['a', 'b', 'c'];
    const TILE_SIZE = 256;
    const MAX_TILES = 180;     // säkerhetslås — stora exporter sprängs annars
    const SCALE_BAR_TARGET_PX = 180;

    // Hybrid tile-URL: OpenTopoMap upp till z 17, OSM Standard för z 18–19
    // (speglar HybridTileLayer i minkarta.html). OSM Standard har inga
    // subdomäner längre; OpenTopoMap roterar a/b/c.
    function tileUrl(z, x, y) {
        if (z <= 17) {
            const s = TILE_SUBDOMAINS[(x + y) % TILE_SUBDOMAINS.length];
            return 'https://' + s + '.tile.opentopomap.org/' + z + '/' + x + '/' + y + '.png';
        }
        return 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
    }
    function tileLayerLabel(z) {
        return z <= 17 ? 'OpenTopoMap (CC-BY-SA)' : 'OSM Standard (ODbL)';
    }

    function lon2x(lon, z) { return (lon + 180) / 360 * Math.pow(2, z); }
    function lat2y(lat, z) {
        const r = lat * Math.PI / 180;
        return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z);
    }
    function x2lon(x, z) { return x / Math.pow(2, z) * 360 - 180; }
    function y2lat(y, z) {
        const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
        return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    }

    function computeBBox(objects) {
        const ytter = objects.filter(o => o.typ === 'ytter');
        const use = (ytter.length >= 2) ? ytter : objects;
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        for (const o of use) {
            const pts = o.path ? o.path : [{ lat: o.lat, lng: o.lng }];
            for (const p of pts) {
                if (p.lat < minLat) minLat = p.lat;
                if (p.lat > maxLat) maxLat = p.lat;
                if (p.lng < minLng) minLng = p.lng;
                if (p.lng > maxLng) maxLng = p.lng;
            }
        }
        if (!isFinite(minLat)) return null;

        // Padding om vi föll tillbaka till alla objekt
        if (ytter.length < 2) {
            const dLat = Math.max(0.002, (maxLat - minLat) * 0.2);
            const dLng = Math.max(0.002, (maxLng - minLng) * 0.2);
            minLat -= dLat; maxLat += dLat;
            minLng -= dLng; maxLng += dLng;
        }
        return { minLat, maxLat, minLng, maxLng, usedYtter: ytter.length >= 2 };
    }

    function pickZoom(bbox, targetPx) {
        for (let z = 19; z >= 3; z--) {
            const xMin = lon2x(bbox.minLng, z) * TILE_SIZE;
            const xMax = lon2x(bbox.maxLng, z) * TILE_SIZE;
            const yMin = lat2y(bbox.maxLat, z) * TILE_SIZE;
            const yMax = lat2y(bbox.minLat, z) * TILE_SIZE;
            const w = Math.abs(xMax - xMin);
            const h = Math.abs(yMax - yMin);
            if (w <= targetPx && h <= targetPx) return z;
        }
        return 3;
    }

    function loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('tile ' + url));
            img.src = url;
        });
    }

    async function renderExport(opts) {
        const objects = opts.objects || [];
        const targetPx = opts.targetPx || 2048;
        const title = opts.title || 'MINERING';
        const subtitle = opts.subtitle || '';
        const dpr = opts.dpr || 2;

        if (!objects.length) throw new Error('Inga objekt att exportera.');
        const bbox = computeBBox(objects);
        if (!bbox) throw new Error('Kan inte räkna ut utsträckning.');

        const z = pickZoom(bbox, targetPx);

        const xMinF = lon2x(bbox.minLng, z);
        const xMaxF = lon2x(bbox.maxLng, z);
        const yMinF = lat2y(bbox.maxLat, z);      // norr -> lägre y
        const yMaxF = lat2y(bbox.minLat, z);

        const tileXMin = Math.floor(xMinF);
        const tileXMax = Math.floor(xMaxF);
        const tileYMin = Math.floor(yMinF);
        const tileYMax = Math.floor(yMaxF);

        const tilesW = tileXMax - tileXMin + 1;
        const tilesH = tileYMax - tileYMin + 1;
        const tileCount = tilesW * tilesH;
        if (tileCount > MAX_TILES) {
            throw new Error('För stort område — minska exportytan eller välj lägre upplösning (' + tileCount + ' tiles).');
        }

        const canvasW = tilesW * TILE_SIZE;
        const canvasH = tilesH * TILE_SIZE;

        const canvas = document.createElement('canvas');
        canvas.width = canvasW * dpr;
        canvas.height = (canvasH + 120) * dpr;     // 120 px för titellist
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // Titellist
        ctx.fillStyle = '#0d1f0d';
        ctx.fillRect(0, 0, canvasW, 60);
        ctx.fillStyle = '#4caf50';
        ctx.font = '700 22px Inter, system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, 16, 30);
        if (subtitle) {
            ctx.fillStyle = '#8aaa8a';
            ctx.font = '500 14px Inter, system-ui, sans-serif';
            ctx.fillText(subtitle, 16, 50);
        }

        // Ladda tiles parallellt
        const tilePromises = [];
        for (let ty = tileYMin; ty <= tileYMax; ty++) {
            for (let tx = tileXMin; tx <= tileXMax; tx++) {
                const url = tileUrl(z, tx, ty);
                const dx = (tx - tileXMin) * TILE_SIZE;
                const dy = (ty - tileYMin) * TILE_SIZE + 60;
                tilePromises.push(
                    loadImage(url).then(img => ({ img, dx, dy }))
                                  .catch(() => ({ img: null, dx, dy }))
                );
            }
        }
        const tiles = await Promise.all(tilePromises);
        for (const t of tiles) {
            if (t.img) ctx.drawImage(t.img, t.dx, t.dy);
            else {
                // fallback: mörk ruta så vi ser att tiles saknas
                ctx.fillStyle = '#152815'; ctx.fillRect(t.dx, t.dy, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#2d4a2d'; ctx.strokeRect(t.dx + 0.5, t.dy + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
            }
        }

        // Transform från lat/lng → canvas-pixel (rumslig del börjar vid y=60)
        const SYM = global.MK_SYMBOLS || {};
        function project(lat, lng) {
            const px = (lon2x(lng, z) - tileXMin) * TILE_SIZE;
            const py = (lat2y(lat, z) - tileYMin) * TILE_SIZE + 60;
            return { x: px, y: py };
        }

        // Rita objekten
        for (const o of objects) {
            const sym = SYM[o.typ];
            if (!sym) continue;
            if (sym.category === 'point' || sym.category === 'meta') {
                const p = project(o.lat, o.lng);
                drawSvgAt(ctx, sym.svg, p.x, p.y, 32);
            } else if (sym.category === 'line') {
                // Halo-dubbel: mörk bred underst, färgad smalare ovanpå
                ctx.beginPath();
                o.path.forEach((pt, i) => {
                    const p = project(pt.lat, pt.lng);
                    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                });
                // v3: vit halo under, svart linjearbete ovanpå (inverterat från v2)
                ctx.setLineDash([]);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = (sym.weight || 4) + 2.5;
                ctx.stroke();
                if (sym.dashArray) ctx.setLineDash(parseDash(sym.dashArray));
                ctx.strokeStyle = sym.stroke; ctx.lineWidth = (sym.weight || 4);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (sym.category === 'polygon') {
                ctx.beginPath();
                o.path.forEach((pt, i) => {
                    const p = project(pt.lat, pt.lng);
                    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                // Fyllning
                ctx.fillStyle = hexToRgba(sym.fill, sym.fillOpacity || 0.2);
                ctx.fill();
                // v3: vit halo bred under + svart linjearbete ovanpå
                ctx.setLineDash([]);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5;
                ctx.stroke();
                if (sym.dashArray) ctx.setLineDash(parseDash(sym.dashArray));
                ctx.strokeStyle = sym.stroke; ctx.lineWidth = 2;
                ctx.stroke();
                ctx.setLineDash([]);
                if (o.etikett || o.antal) {
                    const cx = o.path.reduce((s, p) => s + p.lng, 0) / o.path.length;
                    const cy = o.path.reduce((s, p) => s + p.lat, 0) / o.path.length;
                    const c = project(cy, cx);
                    ctx.fillStyle = '#e8f0e8';
                    ctx.font = '700 12px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(((o.etikett || '') + ' ' + (o.antal || '')).trim(), c.x, c.y);
                    ctx.textAlign = 'start';
                }
            }
        }

        // Overlays: hörn-MGRS, center-MGRS, norrpil, skalstock
        const MGRS = global.MGRS;
        if (MGRS && MGRS.forward) {
            const cornerLL = [
                { name: 'NV', lat: bbox.maxLat, lng: bbox.minLng },
                { name: 'NÖ', lat: bbox.maxLat, lng: bbox.maxLng },
                { name: 'SV', lat: bbox.minLat, lng: bbox.minLng },
                { name: 'SÖ', lat: bbox.minLat, lng: bbox.maxLng },
            ];
            ctx.fillStyle = '#e8f0e8';
            ctx.strokeStyle = 'rgba(13,31,13,0.85)';
            ctx.lineWidth = 3;
            ctx.font = '700 11px "Courier New", monospace';
            for (const c of cornerLL) {
                try {
                    const s = MGRS.forward(c.lat, c.lng);
                    const p = project(c.lat, c.lng);
                    const label = c.name + ' ' + s;
                    const padX = c.name.includes('V') ? 6 : -6;
                    const padY = c.name.includes('N') ? 16 : -6;
                    const align = c.name.includes('V') ? 'left' : 'right';
                    ctx.textAlign = align;
                    ctx.strokeText(label, p.x + padX, p.y + padY);
                    ctx.fillText(label, p.x + padX, p.y + padY);
                } catch (_) { /* ignore */ }
            }
            ctx.textAlign = 'start';

            // Center-MGRS i footer
            const cLat = (bbox.minLat + bbox.maxLat) / 2;
            const cLng = (bbox.minLng + bbox.maxLng) / 2;
            let centerMgrs = '';
            try { centerMgrs = MGRS.forward(cLat, cLng); } catch (_) {}
            ctx.fillStyle = '#0d1f0d';
            ctx.fillRect(0, canvasH + 60, canvasW, 60);
            ctx.fillStyle = '#4caf50';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.fillText('Center ' + centerMgrs, 16, canvasH + 82);
            ctx.fillStyle = '#8aaa8a';
            ctx.font = '500 12px Inter, sans-serif';
            ctx.fillText('Zoom ' + z + ' · ' + tileLayerLabel(z) + ' · ' + new Date().toLocaleString('sv-SE'), 16, canvasH + 104);
        }

        // Norrpil (nedre höger)
        drawNorthArrow(ctx, canvasW - 50, canvasH + 90);

        // Skalstock (nedre mitt)
        drawScaleBar(ctx, canvasW / 2 - 90, canvasH + 95, z, (bbox.minLat + bbox.maxLat) / 2);

        return new Promise(resolve => {
            canvas.toBlob(blob => resolve({ blob, width: canvas.width, height: canvas.height, zoom: z, bbox }), 'image/png', 0.95);
        });
    }

    function drawSvgAt(ctx, svgText, cx, cy, size) {
        // Kodar SVG som data-URI och ritar. Snabb nog för ~100 symboler.
        const src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgText);
        const img = new Image();
        // Synkron fallback: om bilden inte är klar innan toBlob hinner köras,
        // ritas inget. Vi gör därför en tvåpass-lösning via pre-load i caller.
        // Här löser vi det helt synkront genom att använda drawImage när den är klar.
        // Men vi behöver promisify detta. Se drawSvgAtAsync istället.
        // -- obs: funktionen behålls som synkron stub för läsbarhet --
        // Använd drawSvgAtAsync i praktiken (se renderObjectsAsync).
    }

    // Hjälp: parseDash strings "6 3" -> [6,3]
    function parseDash(s) { return String(s).split(/[\s,]+/).map(Number).filter(n => !isNaN(n)); }

    function hexToRgba(hex, alpha) {
        if (!hex) return 'rgba(26,50,26,' + alpha + ')';
        if (hex.startsWith('rgb')) return hex;
        const m = hex.match(/^#?([0-9a-f]{6})$/i);
        if (!m) return hex;
        const n = parseInt(m[1], 16);
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
    }

    // Namn-bricka under en punkt-symbol. Matchar .mk-label i minkarta.html:
    // mörk bakgrund, vit text, 1 px border i accent-grön.
    // v4: `scale`-param (default 1) skalar font + padding + höjd så att
    // brickan följer med den förstorade PNG-symbolen (136×136 vid scale 4).
    function drawNameBadge(ctx, cx, cy, text, scale) {
        const s = scale || 1;
        ctx.save();
        ctx.font = '600 ' + (11 * s) + 'px Inter, sans-serif';
        ctx.textBaseline = 'middle';
        const padX = 5 * s, padY = 3 * s;
        const tw = ctx.measureText(text).width;
        const bw = tw + padX * 2;
        const bh = 16 * s;
        const x = cx - bw / 2;
        const y = cy;
        ctx.fillStyle = 'rgba(13, 31, 13, 0.92)';
        ctx.fillRect(x, y, bw, bh);
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = Math.max(1, s);
        ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(text, cx, y + bh / 2 + 0.5);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }

    function drawNorthArrow(ctx, cx, cy) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = '#e8f0e8';
        ctx.strokeStyle = '#0d1f0d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -22); ctx.lineTo(8, 12); ctx.lineTo(0, 6); ctx.lineTo(-8, 12); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e8f0e8';
        ctx.font = '700 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', 0, 24);
        ctx.textAlign = 'start';
        ctx.restore();
    }

    function drawScaleBar(ctx, x, y, zoom, centerLat) {
        // Meter per pixel vid given zoom + latitud
        const metersPerPixel = 40075016.686 * Math.cos(centerLat * Math.PI / 180) / Math.pow(2, zoom + 8);
        const target = SCALE_BAR_TARGET_PX;
        const meters = target * metersPerPixel;
        const nice = niceRound(meters);
        const px = nice / metersPerPixel;
        ctx.fillStyle = '#e8f0e8';
        ctx.strokeStyle = '#0d1f0d';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, px, 8);
        ctx.strokeRect(x, y, px, 8);
        ctx.fillStyle = '#e8f0e8';
        ctx.font = '700 11px Inter, sans-serif';
        ctx.textAlign = 'left';
        const label = nice >= 1000 ? (nice / 1000) + ' km' : nice + ' m';
        ctx.fillText('0', x - 4, y + 22);
        ctx.fillText(label, x + px + 6, y + 7);
    }

    function niceRound(v) {
        const exp = Math.pow(10, Math.floor(Math.log10(v)));
        const f = v / exp;
        if (f < 1.5) return exp;
        if (f < 3.5) return 2 * exp;
        if (f < 7.5) return 5 * exp;
        return 10 * exp;
    }

    // ── Asynk render — laddar alla SVG till bilder FÖRE toBlob ──────────────
    async function renderExportAsync(opts) {
        const objects = opts.objects || [];
        const targetPx = opts.targetPx || 2048;
        const title = opts.title || 'MINERING';
        const subtitle = opts.subtitle || '';
        const dpr = opts.dpr || 2;

        if (!objects.length) throw new Error('Inga objekt att exportera.');
        const bbox = computeBBox(objects);
        if (!bbox) throw new Error('Kan inte räkna ut utsträckning.');

        const z = pickZoom(bbox, targetPx);
        const xMinF = lon2x(bbox.minLng, z), xMaxF = lon2x(bbox.maxLng, z);
        const yMinF = lat2y(bbox.maxLat, z), yMaxF = lat2y(bbox.minLat, z);
        const tileXMin = Math.floor(xMinF), tileXMax = Math.floor(xMaxF);
        const tileYMin = Math.floor(yMinF), tileYMax = Math.floor(yMaxF);
        const tilesW = tileXMax - tileXMin + 1;
        const tilesH = tileYMax - tileYMin + 1;
        const tileCount = tilesW * tilesH;
        if (tileCount > MAX_TILES) {
            throw new Error('För stort område (' + tileCount + ' tiles). Minska exportytan.');
        }
        const canvasW = tilesW * TILE_SIZE;
        const canvasH = tilesH * TILE_SIZE;
        const canvas = document.createElement('canvas');
        canvas.width = canvasW * dpr;
        canvas.height = (canvasH + 120) * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // 1) Titellist
        ctx.fillStyle = '#0d1f0d';
        ctx.fillRect(0, 0, canvasW, 60);
        ctx.fillStyle = '#4caf50';
        ctx.font = '700 22px Inter, system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, 16, 30);
        if (subtitle) {
            ctx.fillStyle = '#8aaa8a';
            ctx.font = '500 14px Inter, system-ui, sans-serif';
            ctx.fillText(subtitle, 16, 50);
        }
        ctx.textBaseline = 'alphabetic';

        // 2) Tiles
        const tilePromises = [];
        for (let ty = tileYMin; ty <= tileYMax; ty++) {
            for (let tx = tileXMin; tx <= tileXMax; tx++) {
                const url = tileUrl(z, tx, ty);
                const dx = (tx - tileXMin) * TILE_SIZE;
                const dy = (ty - tileYMin) * TILE_SIZE + 60;
                tilePromises.push(
                    loadImage(url).then(img => ({ img, dx, dy }))
                                  .catch(() => ({ img: null, dx, dy }))
                );
            }
        }
        const tiles = await Promise.all(tilePromises);
        for (const t of tiles) {
            if (t.img) ctx.drawImage(t.img, t.dx, t.dy);
            else {
                ctx.fillStyle = '#152815'; ctx.fillRect(t.dx, t.dy, TILE_SIZE, TILE_SIZE);
            }
        }

        // 3) Projektion
        const SYM = global.MK_SYMBOLS || {};
        function project(lat, lng) {
            const px = (lon2x(lng, z) - tileXMin) * TILE_SIZE;
            const py = (lat2y(lat, z) - tileYMin) * TILE_SIZE + 60;
            return { x: px, y: py };
        }

        // 4) Pre-load SVG-symboler som bilder
        const uniqueTyps = [...new Set(objects.map(o => o.typ))];
        const symbolImages = {};
        await Promise.all(uniqueTyps.map(typ => {
            const sym = SYM[typ];
            if (!sym || !(sym.category === 'point' || sym.category === 'meta')) return Promise.resolve();
            const src = 'data:image/svg+xml;utf8,' + encodeURIComponent(sym.svg);
            return new Promise(res => {
                const img = new Image();
                img.onload = () => { symbolImages[typ] = img; res(); };
                img.onerror = () => res();
                img.src = src;
            });
        }));

        // 5) Rita objekt
        // v4: point/meta-symboler förstoras 4× (34→136 px) så de syns tydligt
        // när mottagaren öppnar PNG:n i Signal. Namn-brickan skalas med scale=4
        // så texten "UPK 594", "HIND" osv. blir läsbar utan inzoom.
        // Linje-/polygon-strokes skalas proportionellt så haloen ser kraftig
        // ut bredvid jumbo-symbolerna.
        const drawLabels = opts.drawLabels !== false;
        const showModel = !!opts.showModel;            // v4.1: spegla skärmens toggle
        const SYMBOL_SCALE = 4;
        const SYMBOL_SIZE = 34 * SYMBOL_SCALE;         // 136 px
        const SYMBOL_HALF = SYMBOL_SIZE / 2;           // 68 px
        const LABEL_OFFSET = SYMBOL_HALF + 16;         // ~84 px under symbol-center
        // Komponera bricka likadant som minkarta.html brickaText():
        // UPK/SP behåller obj.label; övriga ärver sym.label + ev. modell-suffix.
        function composeLabel(o, sym) {
            if (o.label) return o.label;
            if (showModel && o.modell) return sym.label + ' ' + o.modell;
            return sym.label;
        }
        for (const o of objects) {
            const sym = SYM[o.typ];
            if (!sym) continue;
            if (sym.category === 'point' || sym.category === 'meta') {
                const p = project(o.lat, o.lng);
                const img = symbolImages[o.typ];
                if (img) ctx.drawImage(img, p.x - SYMBOL_HALF, p.y - SYMBOL_HALF, SYMBOL_SIZE, SYMBOL_SIZE);
                // Namn-bricka under markern (samma bild som skärmen, 4× skalad)
                if (drawLabels && o.typ !== 'ytter') {
                    drawNameBadge(ctx, p.x, p.y + LABEL_OFFSET, composeLabel(o, sym), SYMBOL_SCALE);
                }
            } else if (sym.category === 'line') {
                // v4: vit halo bred under, svart linjearbete ovanpå — skalat
                // så linjen inte ser tunn ut bredvid jumbo-symbolerna.
                ctx.beginPath();
                o.path.forEach((pt, i) => {
                    const p = project(pt.lat, pt.lng);
                    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                });
                const baseW = (sym.weight || 4);
                ctx.setLineDash([]);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = baseW * 2 + 2;
                ctx.stroke();
                if (sym.dashArray) ctx.setLineDash(parseDash(sym.dashArray));
                ctx.strokeStyle = sym.stroke; ctx.lineWidth = baseW * 2;
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (sym.category === 'polygon') {
                ctx.beginPath();
                o.path.forEach((pt, i) => {
                    const p = project(pt.lat, pt.lng);
                    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                // Fyllning
                ctx.fillStyle = hexToRgba(sym.fill, sym.fillOpacity || 0.2);
                ctx.fill();
                // v4: bredare halo + stroke för kontrast mot jumbo-symbolerna
                ctx.setLineDash([]);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10;
                ctx.stroke();
                if (sym.dashArray) ctx.setLineDash(parseDash(sym.dashArray));
                ctx.strokeStyle = sym.stroke; ctx.lineWidth = 4;
                ctx.stroke();
                ctx.setLineDash([]);
                if (o.etikett || o.antal) {
                    const cx = o.path.reduce((s, p) => s + p.lng, 0) / o.path.length;
                    const cy = o.path.reduce((s, p) => s + p.lat, 0) / o.path.length;
                    const c = project(cy, cx);
                    ctx.fillStyle = '#e8f0e8';
                    ctx.font = '700 24px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(((o.etikett || '') + ' ' + (o.antal || '')).trim(), c.x, c.y);
                    ctx.textAlign = 'start';
                }
            }
        }

        // 6) Hörn- och center-MGRS
        const MGRS = global.MGRS;
        if (MGRS && MGRS.forward) {
            const cornerLL = [
                { name: 'NV', lat: bbox.maxLat, lng: bbox.minLng },
                { name: 'NÖ', lat: bbox.maxLat, lng: bbox.maxLng },
                { name: 'SV', lat: bbox.minLat, lng: bbox.minLng },
                { name: 'SÖ', lat: bbox.minLat, lng: bbox.maxLng },
            ];
            ctx.strokeStyle = 'rgba(13,31,13,0.85)';
            ctx.lineWidth = 3;
            ctx.font = '700 11px "Courier New", monospace';
            for (const c of cornerLL) {
                try {
                    const s = MGRS.forward(c.lat, c.lng);
                    const p = project(c.lat, c.lng);
                    const label = c.name + ' ' + s;
                    const padX = c.name.includes('V') ? 6 : -6;
                    const padY = c.name.includes('N') ? 16 : -6;
                    ctx.textAlign = c.name.includes('V') ? 'left' : 'right';
                    ctx.strokeText(label, p.x + padX, p.y + padY);
                    ctx.fillStyle = '#e8f0e8';
                    ctx.fillText(label, p.x + padX, p.y + padY);
                } catch (_) {}
            }
            ctx.textAlign = 'start';

            const cLat = (bbox.minLat + bbox.maxLat) / 2;
            const cLng = (bbox.minLng + bbox.maxLng) / 2;
            let centerMgrs = '';
            try { centerMgrs = MGRS.forward(cLat, cLng); } catch (_) {}
            ctx.fillStyle = '#0d1f0d';
            ctx.fillRect(0, canvasH + 60, canvasW, 60);
            ctx.fillStyle = '#4caf50';
            ctx.font = '700 14px Inter, sans-serif';
            ctx.fillText('Center ' + centerMgrs, 16, canvasH + 82);
            ctx.fillStyle = '#8aaa8a';
            ctx.font = '500 12px Inter, sans-serif';
            ctx.fillText('Zoom ' + z + ' · ' + tileLayerLabel(z) + ' · ' + new Date().toLocaleString('sv-SE'), 16, canvasH + 104);
        }

        // 7) Norrpil + skalstock
        drawNorthArrow(ctx, canvasW - 50, canvasH + 90);
        drawScaleBar(ctx, canvasW / 2 - 90, canvasH + 95, z, (bbox.minLat + bbox.maxLat) / 2);

        const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
        return { blob, width: canvas.width, height: canvas.height, zoom: z, bbox };
    }

    // ── Filnamn + delning ───────────────────────────────────────────────────
    function exportFilename(centerMgrs) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const ts = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '-' + pad(now.getHours()) + pad(now.getMinutes());
        const mgrsSafe = (centerMgrs || 'okand').replace(/\s+/g, '');
        return 'minkarta_' + mgrsSafe + '_' + ts + '.png';
    }

    // Explicit download — används av popover när användaren valt "Ladda ner"
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.style.display = 'none';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        return 'downloaded';
    }

    async function shareBlob(blob, filename, textOrNull) {
        const file = new File([blob], filename, { type: 'image/png' });
        const payload = { files: [file], title: 'Minkarta' };
        if (textOrNull) payload.text = textOrNull;
        if (navigator.canShare && navigator.canShare(payload)) {
            try {
                await navigator.share(payload);
                return 'shared';
            } catch (e) {
                if (e && e.name === 'AbortError') return 'cancelled';
                return null;
            }
        }
        return 'unsupported';
    }

    async function shareOrDownload(blob, filename) {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: 'Minkarta', text: 'Minläggningskarta' });
                return 'shared';
            } catch (e) {
                if (e && e.name === 'AbortError') return 'cancelled';
                // fallthrough till download
            }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.style.display = 'none';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        return 'downloaded';
    }

    global.MK_EXPORT = {
        renderExportAsync,
        exportFilename,
        shareOrDownload,
        downloadBlob,
        shareBlob,
        computeBBox
    };

})(window);
