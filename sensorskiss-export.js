// ─────────────────────────────────────────────────────────────────────────────
//  SENSORSKISS — PNG-export
//
//  Renderar en komplett sensorskiss till PNG:
//    1. Bbox från alla objekt + 20% padding.
//    2. OpenTopoMap/OSM-tiles (z 14–17, throttlat 4 parallella).
//    3. Sensor-symboler (med numLabel inbakad i SVG:n) + riktningslinje
//       (streckad svart, ~100 m).
//    4. Sensorområde-polygon (ljus fyllning + streckad kant + antalText i
//       centroid).
//    5. Hörn-MGRS + Center-MGRS + Norrpil + Skalstock.
//
//  INTEGRITET: inga sensorpositioner skickas ut. Endast OpenTopoMap-/OSM-
//  tiles (z/x/y) för rutor som täcker bbox.
// ─────────────────────────────────────────────────────────────────────────────

(function (global) {

    const TILE_SUBDOMAINS = ['a', 'b', 'c'];
    const TILE_SIZE = 256;
    const MAX_TILES = 180;
    const SCALE_BAR_TARGET_PX = 180;

    function tileUrl(z, x, y) {
        if (z <= 17) {
            const s = TILE_SUBDOMAINS[(x + y) % TILE_SUBDOMAINS.length];
            return 'https://' + s + '.tile.opentopomap.org/' + z + '/' + x + '/' + y + '.png';
        }
        return 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
    }
    function tileLayerLabel(z) { return z <= 17 ? 'OpenTopoMap (CC-BY-SA)' : 'OSM Standard (ODbL)'; }

    function lon2x(lon, z) { return (lon + 180) / 360 * Math.pow(2, z); }
    function lat2y(lat, z) {
        const r = lat * Math.PI / 180;
        return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, z);
    }

    function dirEndpoint(lat, lng, bearingDeg, meters) {
        const R = 6378137;
        const br = bearingDeg * Math.PI / 180;
        const cosLat = Math.cos(lat * Math.PI / 180);
        const dLat = (meters * Math.cos(br)) / R * 180 / Math.PI;
        const dLng = (meters * Math.sin(br)) / (R * cosLat) * 180 / Math.PI;
        return { lat: lat + dLat, lng: lng + dLng };
    }

    function computeBBox(objects) {
        const SYM = global.SK_SYMBOLS || {};
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        function include(lat, lng) {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
        }
        for (const o of objects) {
            const pts = o.path ? o.path : [{ lat: o.lat, lng: o.lng }];
            for (const p of pts) include(p.lat, p.lng);
            // Inkludera etikettens drag-bara position så den ryms i exporten.
            if (o.labelLat != null && o.labelLng != null) include(o.labelLat, o.labelLng);
            const sym = SYM[o.typ];
            if (!sym) continue;
            // Inkludera ändpunkten av den långa externa riktningslinjen så
            // bbox täcker den. Bara symboler med externalLine-flagga (= PIR).
            if (o.rotation && o.lat != null && o.lng != null && sym.externalLine) {
                const e = dirEndpoint(o.lat, o.lng, o.rotation, 100);
                include(e.lat, e.lng);
            }
            // Inkludera sektorns ytterhorn (CCTV/DSLR) sa hela synfaltet ryms.
            if (sym.sector && o.lat != null && o.lng != null) {
                const ang = Number.isFinite(o.sectorAngle) ? o.sectorAngle : sym.sector.angle;
                const rng = Number.isFinite(o.sectorRange) ? o.sectorRange : sym.sector.range;
                const bear = Number.isFinite(o.rotation) ? o.rotation : 0;
                const half = ang / 2;
                // Sampla pa bagens kanter (8 punkter racker for bbox).
                for (let i = 0; i <= 8; i++) {
                    const a = bear - half + (ang * i / 8);
                    const e = dirEndpoint(o.lat, o.lng, a, rng);
                    include(e.lat, e.lng);
                }
            }
        }
        if (!isFinite(minLat)) return null;
        const dLat = Math.max(0.002, (maxLat - minLat) * 0.2);
        const dLng = Math.max(0.002, (maxLng - minLng) * 0.2);
        minLat -= dLat; maxLat += dLat;
        minLng -= dLng; maxLng += dLng;
        return { minLat, maxLat, minLng, maxLng };
    }

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
    function loadImageWithRetry(url) {
        return loadImage(url).catch(() => new Promise(res => {
            setTimeout(() => loadImage(url).then(res, () => res(null)), 600);
        }));
    }
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

    // Bygger SVG-strängen för en symbol med rätt rotation applicerad. v2-
    // symbolerna roterar bara inre <g>-grupper (stjärna/ring/cirkel står still)
    // — så det räcker att ersätta {ROT}-placeholdern. numLabel renderas inte
    // inne i symbolen längre; identifieringssiffran visas via name-badge
    // bredvid symbolen (se drawNameBadge nedan).
    function buildSymbolSvg(obj) {
        if (global.skSymbolSvg) return global.skSymbolSvg(obj.typ, obj);
        const SYM = global.SK_SYMBOLS || {};
        const sym = SYM[obj.typ];
        if (!sym) return null;
        const directional = global.SK_DIRECTIONAL_TYPES &&
            global.SK_DIRECTIONAL_TYPES.has(obj.typ);
        const rot = (directional && Number.isFinite(obj.rotation)) ? obj.rotation : 0;
        return sym.svg.replace(/\{ROT\}/g, rot);
    }

    async function renderExportAsync(opts) {
        const objects = opts.objects || [];
        const title = opts.title || 'SENSORSKISS';
        const subtitle = opts.subtitle || '';
        const dpr = opts.dpr || 2;

        if (!objects.length) throw new Error('Inga objekt att exportera.');
        const bbox = computeBBox(objects);
        if (!bbox) throw new Error('Kan inte räkna ut utsträckning.');

        const z = pickZoom(bbox);
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
        ctx.textBaseline = 'alphabetic';

        // Tiles
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
            else { ctx.fillStyle = '#152815'; ctx.fillRect(t.dx, t.dy, TILE_SIZE, TILE_SIZE); }
        }

        function project(lat, lng) {
            const px = (lon2x(lng, z) - tileXMin) * TILE_SIZE;
            const py = (lat2y(lat, z) - tileYMin) * TILE_SIZE + 60;
            return { x: px, y: py };
        }

        // Pre-load symbol-bilder (en per unik typ+rotation; numLabel påverkar
        // inte längre SVG-innehållet). Nyckel: "<typ>:<rotation>".
        const SYM = global.SK_SYMBOLS || {};
        const symbolImages = {};
        function imgKey(o) {
            const directional = global.SK_DIRECTIONAL_TYPES &&
                global.SK_DIRECTIONAL_TYPES.has(o.typ);
            const rot = (directional && Number.isFinite(o.rotation)) ? o.rotation : 0;
            return o.typ + ':' + rot;
        }
        await Promise.all(objects.map(o => {
            const sym = SYM[o.typ];
            if (!sym || sym.category !== 'point') return Promise.resolve();
            const key = imgKey(o);
            if (symbolImages[key]) return Promise.resolve();
            const svgStr = buildSymbolSvg(o);
            if (!svgStr) return Promise.resolve();
            const src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgStr);
            return new Promise(res => {
                const img = new Image();
                img.onload = () => { symbolImages[key] = img; res(); };
                img.onerror = () => res();
                img.src = src;
            });
        }));

        const drawLabels = opts.drawLabels !== false;
        const SYMBOL_SCALE = 1.5;
        const SYMBOL_SIZE = 34 * SYMBOL_SCALE;
        const SYMBOL_HALF = SYMBOL_SIZE / 2;
        const LABEL_OFFSET = SYMBOL_HALF + 10;
        const LABEL_OPTS = { fontPx: 14, padX: 5, padY: 3 };

        // Rita långa externa riktningslinjer FÖRE symboler så symbolen ligger
        // ovanpå. Bara symboler med externalLine-flagga (= PIR) får extern
        // linje; övriga directional symboler indikerar riktning via sin
        // inre roterande delsymbol.
        for (const o of objects) {
            if (!o.rotation && o.rotation !== 0) continue;
            const sym = SYM[o.typ];
            if (!sym) continue;
            if (sym.externalLine && o.rotation) {
                const start = project(o.lat, o.lng);
                const endLL = dirEndpoint(o.lat, o.lng, o.rotation, 100);
                const end = project(endLL.lat, endLL.lng);
                ctx.save();
                ctx.setLineDash([6, 4]);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
                ctx.restore();
            } else if (sym.sector) {
                // Sektor-polygon (CCTV/DSLR): center + bage som halvgenomskinlig
                // fyllning med streckad kant.
                const ang = Number.isFinite(o.sectorAngle) ? o.sectorAngle : sym.sector.angle;
                const rng = Number.isFinite(o.sectorRange) ? o.sectorRange : sym.sector.range;
                const bear = Number.isFinite(o.rotation) ? o.rotation : 0;
                const half = ang / 2;
                const steps = 18;
                const pts = [project(o.lat, o.lng)];
                for (let i = 0; i <= steps; i++) {
                    const a = bear - half + (ang * i / steps);
                    const e = dirEndpoint(o.lat, o.lng, a, rng);
                    pts.push(project(e.lat, e.lng));
                }
                ctx.save();
                ctx.beginPath();
                pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
                ctx.closePath();
                ctx.fillStyle = 'rgba(0,0,0,0.07)';
                ctx.fill();
                ctx.setLineDash([4, 3]);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
            }
        }

        // Rita objekten
        for (const o of objects) {
            const sym = SYM[o.typ];
            if (!sym) continue;

            if (sym.category === 'point') {
                const p = project(o.lat, o.lng);
                const key = imgKey(o);
                const img = symbolImages[key];
                if (img) {
                    ctx.drawImage(img, p.x - SYMBOL_HALF, p.y - SYMBOL_HALF, SYMBOL_SIZE, SYMBOL_SIZE);
                }
                if (drawLabels) {
                    const t = o.numLabel || sym.label;
                    // Etiketten renderas vid obj.labelLat/labelLng om satt
                    // (= drag-bar position), annars default-offset under symbolen.
                    let lx, ly;
                    if (o.labelLat != null && o.labelLng != null) {
                        const lp = project(o.labelLat, o.labelLng);
                        lx = lp.x; ly = lp.y;
                    } else {
                        lx = p.x; ly = p.y + LABEL_OFFSET;
                    }
                    drawNameBadge(ctx, lx, ly, t, LABEL_OPTS);
                }
            } else if (sym.category === 'polygon') {
                ctx.beginPath();
                o.path.forEach((pt, i) => {
                    const p = project(pt.lat, pt.lng);
                    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                ctx.fillStyle = sym.fill || 'rgba(0,0,0,0.08)';
                ctx.fill();
                ctx.setLineDash([]);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
                ctx.stroke();
                ctx.setLineDash(parseDash(sym.dashArray || '6 4'));
                ctx.strokeStyle = sym.stroke || '#000'; ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.setLineDash([]);
                // Centrum-text (antalText)
                if (o.antalText) {
                    const cx = o.path.reduce((s, p) => s + p.lng, 0) / o.path.length;
                    const cy = o.path.reduce((s, p) => s + p.lat, 0) / o.path.length;
                    const c = project(cy, cx);
                    ctx.save();
                    ctx.font = '700 14px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
                    ctx.lineWidth = 4;
                    ctx.strokeText(o.antalText, c.x, c.y);
                    ctx.fillStyle = '#000000';
                    ctx.fillText(o.antalText, c.x, c.y);
                    ctx.restore();
                }
            } else if (sym.category === 'polyline') {
                const style = o.style || sym.defaultStyle || 'heldragen';
                const projected = o.path.map(pt => project(pt.lat, pt.lng));
                // Vit halo for kontrast mot karta.
                ctx.save();
                ctx.setLineDash([]);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4.5;
                ctx.beginPath();
                projected.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
                ctx.stroke();
                ctx.setLineDash(style === 'streckad' ? [6, 4] : []);
                ctx.strokeStyle = sym.stroke || '#000'; ctx.lineWidth = 2.5;
                ctx.beginPath();
                projected.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
                ctx.stroke();
                ctx.setLineDash([]);
                // Pilspetsar pa segment-midpunkter for patrullstig-stil.
                if (style === 'pilad') {
                    for (let i = 0; i < projected.length - 1; i++) {
                        const p1 = projected[i], p2 = projected[i + 1];
                        const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
                        const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                        ctx.save();
                        ctx.translate(mx, my);
                        ctx.rotate(ang);
                        ctx.fillStyle = '#000';
                        ctx.beginPath();
                        ctx.moveTo(8, 0); ctx.lineTo(-4, -5); ctx.lineTo(-1, 0); ctx.lineTo(-4, 5);
                        ctx.closePath();
                        ctx.fill();
                        ctx.restore();
                    }
                }
                // Linje-text vid midpunkten.
                if (o.antalText && projected.length >= 2) {
                    const midIdx = Math.floor(projected.length / 2);
                    const mid = projected[midIdx];
                    ctx.save();
                    ctx.font = '700 13px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
                    ctx.lineWidth = 4;
                    ctx.strokeText(o.antalText, mid.x, mid.y - 10);
                    ctx.fillStyle = '#000';
                    ctx.fillText(o.antalText, mid.x, mid.y - 10);
                    ctx.restore();
                }
                ctx.restore();
            }
        }

        // Hörn- och center-MGRS
        const MGRS = global.SK_MGRS || global.MGRS;
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

        drawNorthArrow(ctx, canvasW - 50, canvasH + 90);
        drawScaleBar(ctx, canvasW / 2 - 90, canvasH + 95, z, (bbox.minLat + bbox.maxLat) / 2);

        const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
        return { blob, width: canvas.width, height: canvas.height, zoom: z, bbox };
    }

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
    function parseDash(s) { return String(s).split(/[\s,]+/).map(Number).filter(n => !isNaN(n)); }

    function exportFilename(centerMgrs) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const ts = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '-' + pad(now.getHours()) + pad(now.getMinutes());
        const mgrsSafe = (centerMgrs || 'okand').replace(/\s+/g, '');
        return 'sensorskiss_' + mgrsSafe + '_' + ts + '.png';
    }

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
        const payload = { files: [file], title: 'Sensorskiss' };
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

    global.SK_EXPORT = {
        renderExportAsync,
        exportFilename,
        downloadBlob,
        shareBlob,
        computeBBox
    };

})(window);
