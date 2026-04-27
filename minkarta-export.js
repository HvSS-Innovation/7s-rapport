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

    // Sektor-polygon för verkansomrade — ska matcha sectorPath() i
    // minkarta.html. apex = (lat,lng). 24 noder + apex.
    function sectorPath(lat, lng, rangeM, spreadDeg, rotationDeg) {
        const range = rangeM || 200;
        const half = (spreadDeg || 60) / 2;
        const start = (rotationDeg || 0) - half;
        const end   = (rotationDeg || 0) + half;
        const N = 24;
        const R = 6378137;
        const cosLat = Math.cos(lat * Math.PI / 180);
        const path = [[lat, lng]];
        for (let i = 0; i <= N; i++) {
            const bearing = start + (end - start) * (i / N);
            const br = bearing * Math.PI / 180;
            const dLat = (range * Math.cos(br)) / R * 180 / Math.PI;
            const dLng = (range * Math.sin(br)) / (R * cosLat) * 180 / Math.PI;
            path.push([lat + dLat, lng + dLng]);
        }
        return path;
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
            // Verkansomrade representeras som en sektor-polygon — använd dess
            // hela utbredning, inte bara apex-punkten, vid bbox-fallback.
            let pts;
            if (o.typ === 'verkansomrade') {
                pts = sectorPath(o.lat, o.lng, o.range || 200, o.spread || 60, o.rotation || 0)
                    .map(([la, ln]) => ({ lat: la, lng: ln }));
            } else {
                pts = o.path ? o.path : [{ lat: o.lat, lng: o.lng }];
            }
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

    // v4.2: Låst till z 17 i normalfallet — speglar skärm-vyn och OpenTopoMap-
    // detaljnivån som mottagaren förväntar sig. Klampar bara nedåt om bbox inte
    // ryms inom MAX_TILES (180). Aldrig under z 14 i export.
    function pickZoom(bbox) {
        for (let z = 17; z >= 14; z--) {
            const xMin = lon2x(bbox.minLng, z);
            const xMax = lon2x(bbox.maxLng, z);
            const yMin = lat2y(bbox.maxLat, z);
            const yMax = lat2y(bbox.minLat, z);
            const tilesW = Math.floor(xMax) - Math.floor(xMin) + 1;
            const tilesH = Math.floor(yMax) - Math.floor(yMin) + 1;
            if (tilesW * tilesH <= MAX_TILES) return z;
        }
        return 14;
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

    // Concurrency-limited paralleliseringshjälp. OpenTopoMap rate-limitar runt
    // ~1 req/s/IP och kastar 429 vid burst — så vi kör max N parallella jobb
    // i taget istället för Promise.all över hela tile-listan.
    async function runThrottled(jobs, concurrency) {
        const results = new Array(jobs.length);
        let next = 0;
        async function worker() {
            while (true) {
                const my = next++;
                if (my >= jobs.length) return;
                results[my] = await jobs[my]();
            }
        }
        const pool = [];
        const lim = Math.min(concurrency, jobs.length);
        for (let i = 0; i < lim; i++) pool.push(worker());
        await Promise.all(pool);
        return results;
    }

    // Tile-laddning med en retry vid fel (för att bemöta sporadiska 429:or
    // från OpenTopoMap). Andra försöket går efter ~600 ms.
    function loadImageWithRetry(url) {
        return loadImage(url).catch(() => new Promise(res => {
            setTimeout(() => loadImage(url).then(res, () => res(null)), 600);
        }));
    }

    async function renderExport(opts) {
        const objects = opts.objects || [];
        const title = opts.title || 'MINERING';
        const subtitle = opts.subtitle || '';
        const dpr = opts.dpr || 2;

        if (!objects.length) throw new Error('Inga objekt att exportera.');
        const bbox = computeBBox(objects);
        if (!bbox) throw new Error('Kan inte räkna ut utsträckning.');

        const z = pickZoom(bbox);

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
    // v4.2: `opts = { fontPx, padX, padY }` — explicita pixelvärden istället
    // för en skala. Default speglar skärmens .mk-label (font 600 11px,
    // padding 2/6 ≈ padX 5, padY 3). Exporten höjer fontPx till 14 så
    // texten är läsbar i PNG-skala utan att bli jumbo.
    function drawNameBadge(ctx, cx, cy, text, opts) {
        opts = opts || {};
        const fontPx = opts.fontPx || 11;
        const padX = opts.padX != null ? opts.padX : 5;
        const padY = opts.padY != null ? opts.padY : 3;
        ctx.save();
        ctx.font = '600 ' + fontPx + 'px Inter, sans-serif';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(text).width;
        const bw = tw + padX * 2;
        const bh = fontPx + padY * 2;
        const x = cx - bw / 2;
        const y = cy;
        ctx.fillStyle = 'rgba(13, 31, 13, 0.92)';
        ctx.fillRect(x, y, bw, bh);
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 1;
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
        const title = opts.title || 'MINERING';
        const subtitle = opts.subtitle || '';
        const dpr = opts.dpr || 2;

        if (!objects.length) throw new Error('Inga objekt att exportera.');
        const bbox = computeBBox(objects);
        if (!bbox) throw new Error('Kan inte räkna ut utsträckning.');

        // v4.2: pickZoom låser z 17 i normalfallet. Om bbox är för stor och
        // klampning sker, säg ifrån — annars ser användaren tyst en lågdetalj-
        // erad export.
        const z = pickZoom(bbox);
        if (z < 17 && typeof global.toast === 'function') {
            global.toast('Bbox för stor — sänker zoom till z ' + z, 3200);
        }
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

        // 2) Tiles — throttlat (max 4 parallella) + en retry per tile.
        // OpenTopoMap rate-limitar burst-requests; tidigare Promise.all
        // över alla tiles gjorde att flertalet tiles 429:ades samtidigt
        // och ritades som fallback-mörka rutor.
        const tileJobs = [];
        for (let ty = tileYMin; ty <= tileYMax; ty++) {
            for (let tx = tileXMin; tx <= tileXMax; tx++) {
                const url = tileUrl(z, tx, ty);
                const dx = (tx - tileXMin) * TILE_SIZE;
                const dy = (ty - tileYMin) * TILE_SIZE + 60;
                tileJobs.push(() =>
                    loadImageWithRetry(url).then(img => ({ img, dx, dy }))
                );
            }
        }
        const tiles = await runThrottled(tileJobs, 4);
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

        // 4) Pre-load SVG-symboler som bilder. Två spår:
        //    - typ-nivå för "vanliga" point/meta-symboler
        //    - obj-nivå för minomrade (SVG:n innehåller obj.antal)
        // Verkansomrade hoppas över helt — det ritas som sektor-polygon i
        // ritloopen, inte som SVG-bild.
        const uniqueTyps = [...new Set(objects.map(o => o.typ))];
        const symbolImages = {};
        const objectImages = new Map();
        const minomradeSvgFn = global.minomradeSvg;
        await Promise.all([
            ...uniqueTyps.map(typ => {
                const sym = SYM[typ];
                if (!sym) return Promise.resolve();
                if (typ === 'verkansomrade') return Promise.resolve();
                if (typ === 'minomrade') return Promise.resolve();
                if (!(sym.category === 'point' || sym.category === 'meta')) return Promise.resolve();
                const src = 'data:image/svg+xml;utf8,' + encodeURIComponent(sym.svg);
                return new Promise(res => {
                    const img = new Image();
                    img.onload = () => { symbolImages[typ] = img; res(); };
                    img.onerror = () => res();
                    img.src = src;
                });
            }),
            ...objects.filter(o => o.typ === 'minomrade').map(o => {
                if (!minomradeSvgFn) return Promise.resolve();
                const src = 'data:image/svg+xml;utf8,' + encodeURIComponent(minomradeSvgFn(o.antal));
                return new Promise(res => {
                    const img = new Image();
                    img.onload = () => { objectImages.set(o.id, img); res(); };
                    img.onerror = () => res();
                    img.src = src;
                });
            })
        ]);

        // 5) Rita objekt
        // v4.2: Exporten ska se ut som ett "rent foto" av skärmen. Symbolerna
        // skalas 1.5× (34→51 px) — knappt större än skärmens 34 px men tydliga
        // i 2× DPR-PNG. Namn-brickan får font 14 px (skärmen 11 px) med samma
        // padding-proportioner som .mk-label, så den landar lika kompakt.
        const drawLabels = opts.drawLabels !== false;
        const showModel = !!opts.showModel;            // v4.1: spegla skärmens toggle
        const SYMBOL_SCALE = 1.5;
        const SYMBOL_SIZE = 34 * SYMBOL_SCALE;         // 51 px
        const SYMBOL_HALF = SYMBOL_SIZE / 2;           // 25.5 px
        const LABEL_OFFSET = SYMBOL_HALF + 10;         // ~35 px under symbol-center
        const LABEL_OPTS = { fontPx: 14, padX: 5, padY: 3 };
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

            // Verkansomrade ritas som sektor-polygon, identiskt med skärmen
            if (o.typ === 'verkansomrade') {
                const sect = sectorPath(o.lat, o.lng,
                    o.range || 200, o.spread || 60, o.rotation || 0);
                ctx.beginPath();
                sect.forEach((pt, i) => {
                    const p = project(pt[0], pt[1]);
                    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                ctx.fillStyle = 'rgba(0,0,0,0.10)';
                ctx.fill();
                ctx.setLineDash([]);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
                ctx.stroke();
                ctx.setLineDash([6, 4]);
                ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.setLineDash([]);
                if (drawLabels) {
                    const apex = project(o.lat, o.lng);
                    drawNameBadge(ctx, apex.x, apex.y + LABEL_OFFSET, composeLabel(o, sym), LABEL_OPTS);
                }
                continue;
            }

            if (sym.category === 'point' || sym.category === 'meta') {
                const p = project(o.lat, o.lng);
                const img = symbolImages[o.typ];
                if (img) {
                    const rotDeg = o.rotation || 0;
                    if (rotDeg && (o.typ === 'fordon_sid' || o.typ === 'forsvar')) {
                        ctx.save();
                        ctx.translate(p.x, p.y);
                        ctx.rotate(rotDeg * Math.PI / 180);
                        ctx.drawImage(img, -SYMBOL_HALF, -SYMBOL_HALF, SYMBOL_SIZE, SYMBOL_SIZE);
                        ctx.restore();
                    } else {
                        ctx.drawImage(img, p.x - SYMBOL_HALF, p.y - SYMBOL_HALF, SYMBOL_SIZE, SYMBOL_SIZE);
                    }
                }
                // Namn-bricka under markern — kompakt, motsvarar skärmens
                if (drawLabels && o.typ !== 'ytter') {
                    drawNameBadge(ctx, p.x, p.y + LABEL_OFFSET, composeLabel(o, sym), LABEL_OPTS);
                }
            } else if (sym.category === 'line') {
                // v4.2: vit halo + färgad linje, skalat ~1.5× mot skärmens
                // baseW så linjen syns men inte dominerar bilden.
                ctx.beginPath();
                o.path.forEach((pt, i) => {
                    const p = project(pt.lat, pt.lng);
                    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                });
                const baseW = (sym.weight || 4);
                ctx.setLineDash([]);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = baseW * SYMBOL_SCALE + 1.5;
                ctx.stroke();
                if (sym.dashArray) ctx.setLineDash(parseDash(sym.dashArray));
                ctx.strokeStyle = sym.stroke; ctx.lineWidth = baseW * SYMBOL_SCALE;
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
                // v4.2: smal halo + tunn stroke — proportionellt mot 1.5×-symboler
                ctx.setLineDash([]);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
                ctx.stroke();
                if (sym.dashArray) ctx.setLineDash(parseDash(sym.dashArray));
                ctx.strokeStyle = sym.stroke; ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.setLineDash([]);
                // Centrum-SVG för minomrade — visar antal eller "M" i ellips-
                // symbolen, samma som Leaflet-renderingen.
                if (o.typ === 'minomrade') {
                    const objImg = objectImages.get(o.id);
                    if (objImg) {
                        const cxLng = o.path.reduce((s, p) => s + p.lng, 0) / o.path.length;
                        const cyLat = o.path.reduce((s, p) => s + p.lat, 0) / o.path.length;
                        const cp = project(cyLat, cxLng);
                        ctx.drawImage(objImg, cp.x - SYMBOL_HALF, cp.y - SYMBOL_HALF, SYMBOL_SIZE, SYMBOL_SIZE);
                    }
                } else if (o.etikett || o.antal) {
                    const cx = o.path.reduce((s, p) => s + p.lng, 0) / o.path.length;
                    const cy = o.path.reduce((s, p) => s + p.lat, 0) / o.path.length;
                    const c = project(cy, cx);
                    ctx.fillStyle = '#e8f0e8';
                    ctx.font = '700 14px Inter, sans-serif';
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
