// ── lib/geo-export.js ───────────────────────────────────────────────────────
// Generisk GPX/KMZ-export för WGS84-data. Återanvänds av minkarta och
// sensorskiss. Inga externa beroenden — minimal STORE-zip-writer ingår.
//
// API (window.GEO_EXPORT):
//   toGpx({ name, items })                   → string  (GPX 1.1, UTF-8)
//   toGeoJson({ name, items })               → object  (FeatureCollection)
//   toKmz({ name, items, iconsByType? })     → Promise<Blob>  (KMZ = zip med doc.kml)
//   svgToPngBytes(svg, size?)                → Promise<Uint8Array>  (browser only)
//   downloadBlob(blob, filename)             → void
//   stampFilename(prefix, ext)               → string  (`prefix-YYYY-MM-DD-HHMM.ext`)
//
// `items` är en array av objekt med fältet `kind`:
//   { kind:'point',   lat, lng, name?, desc?, sym?, color?, rotation? }
//   { kind:'line',    coords:[[lat,lng], …], name?, desc?, color?, dashed?, arrows? }
//   { kind:'polygon', coords:[[lat,lng], …], name?, desc?, color?, fillColor?, fillOpacity? }
//
// Färger anges som "#rrggbb" eller "rrggbb". KML konverteras internt till ABGR.
// GPX saknar polygoner; de exporteras som slutna tracks med <type>polygon</type>.
//
// `iconsByType` = { [typeKey]: Uint8Array }  → PNG-bytes packas in i KMZ:en
// som `files/icon-<typeKey>.png` och refereras från Style/IconStyle/Icon. Saknas
// en typ-key faller IconStyle tillbaka till generisk cirkel-pin.

(function (global) {
    'use strict';

    // ── XML-hjälpare ────────────────────────────────────────────────────────
    function xmlEscape(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function fmtCoord(n) {
        // 7 decimaler ≈ 11 mm vid ekvatorn; mer än nog för vår användning.
        return Number(n).toFixed(7).replace(/0+$/, '').replace(/\.$/, '.0');
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function pad2(n) { return String(n).padStart(2, '0'); }

    function stampFilename(prefix, ext) {
        const d = new Date();
        const stamp = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
            + '-' + pad2(d.getHours()) + pad2(d.getMinutes());
        return `${prefix}-${stamp}.${ext}`;
    }

    // ── Färg-konvertering ───────────────────────────────────────────────────
    function normHex(c) {
        if (!c) return null;
        let h = String(c).trim();
        if (h.startsWith('#')) h = h.slice(1);
        if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
        return h.toLowerCase();
    }
    // KML-färg = aabbggrr. alpha 0–1.
    function kmlColor(hex, alpha) {
        const h = normHex(hex);
        if (!h) return null;
        const a = Math.max(0, Math.min(1, alpha == null ? 1 : alpha));
        const aa = Math.round(a * 255).toString(16).padStart(2, '0');
        return aa + h.slice(4, 6) + h.slice(2, 4) + h.slice(0, 2);
    }

    // ── GPX ─────────────────────────────────────────────────────────────────
    function toGpx(opts) {
        const name = opts && opts.name ? opts.name : 'Export';
        const items = (opts && opts.items) || [];
        const parts = [];
        parts.push('<?xml version="1.0" encoding="UTF-8"?>');
        parts.push('<gpx version="1.1" creator="hv (joel)" xmlns="http://www.topografix.com/GPX/1/1">');
        parts.push('  <metadata>');
        parts.push('    <name>' + xmlEscape(name) + '</name>');
        parts.push('    <time>' + nowIso() + '</time>');
        parts.push('  </metadata>');

        // Punkter → <wpt>
        for (const it of items) {
            if (it.kind !== 'point') continue;
            parts.push('  <wpt lat="' + fmtCoord(it.lat) + '" lon="' + fmtCoord(it.lng) + '">');
            if (it.name) parts.push('    <name>' + xmlEscape(it.name) + '</name>');
            if (it.desc) parts.push('    <desc>' + xmlEscape(it.desc) + '</desc>');
            if (it.sym)  parts.push('    <sym>'  + xmlEscape(it.sym)  + '</sym>');
            if (it.type) parts.push('    <type>' + xmlEscape(it.type) + '</type>');
            parts.push('  </wpt>');
        }

        // Linjer → <trk> med en <trkseg>
        for (const it of items) {
            if (it.kind !== 'line') continue;
            const coords = (it.coords || []).filter(c => Array.isArray(c) && c.length >= 2);
            if (coords.length < 2) continue;
            parts.push('  <trk>');
            if (it.name) parts.push('    <name>' + xmlEscape(it.name) + '</name>');
            if (it.desc) parts.push('    <desc>' + xmlEscape(it.desc) + '</desc>');
            if (it.type) parts.push('    <type>' + xmlEscape(it.type) + '</type>');
            parts.push('    <trkseg>');
            for (const c of coords) {
                parts.push('      <trkpt lat="' + fmtCoord(c[0]) + '" lon="' + fmtCoord(c[1]) + '"/>');
            }
            parts.push('    </trkseg>');
            parts.push('  </trk>');
        }

        // Polygoner → sluten <trk> + <type>polygon</type>. GPX 1.1 saknar
        // riktig polygon-typ, men många klienter visar slutna tracks korrekt.
        for (const it of items) {
            if (it.kind !== 'polygon') continue;
            const coords = (it.coords || []).filter(c => Array.isArray(c) && c.length >= 2);
            if (coords.length < 3) continue;
            const closed = coords.slice();
            const first = closed[0], last = closed[closed.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) closed.push(first);
            parts.push('  <trk>');
            if (it.name) parts.push('    <name>' + xmlEscape(it.name) + '</name>');
            if (it.desc) parts.push('    <desc>' + xmlEscape(it.desc) + '</desc>');
            parts.push('    <type>polygon</type>');
            parts.push('    <trkseg>');
            for (const c of closed) {
                parts.push('      <trkpt lat="' + fmtCoord(c[0]) + '" lon="' + fmtCoord(c[1]) + '"/>');
            }
            parts.push('    </trkseg>');
            parts.push('  </trk>');
        }

        parts.push('</gpx>');
        return parts.join('\n');
    }

    // ── KML (text) ──────────────────────────────────────────────────────────
    function kmlCoordTriple(lat, lng) {
        return fmtCoord(lng) + ',' + fmtCoord(lat) + ',0';
    }

    // Vilka typ-nycklar har en inbäddad PNG-ikon? (Avgör om vi väljer
    // ikon-baserad point-style eller fallback-cirkel.)
    function buildKml(opts) {
        const name = opts && opts.name ? opts.name : 'Export';
        const items = (opts && opts.items) || [];
        const iconTypes = opts && opts.iconTypes instanceof Set ? opts.iconTypes : new Set();
        const styles = [];
        const placemarks = [];
        let styleCounter = 0;
        const styleCache = new Map();

        function styleIdFor(kind, color, dashed, fillColor, fillOpacity, iconType) {
            const key = kind + '|' + (color||'') + '|' + (dashed?1:0) + '|' + (fillColor||'') + '|' + (fillOpacity||'') + '|' + (iconType||'');
            if (styleCache.has(key)) return styleCache.get(key);
            const id = 's' + (styleCounter++);
            styleCache.set(key, id);

            const lineRgb = normHex(color) || '0066cc';
            const lineCol = kmlColor(lineRgb, 1);
            const fillRgb = normHex(fillColor) || lineRgb;
            const fOp = fillOpacity == null ? 0.25 : fillOpacity;
            const fillCol = kmlColor(fillRgb, fOp);

            if (kind === 'point') {
                if (iconType && iconTypes.has(iconType)) {
                    // Anpassad ikon inbäddad i KMZ:en — använd ingen färg-tinting
                    // (PNG:en bär själv sin look).
                    styles.push(
                        '    <Style id="' + id + '">' +
                        '<IconStyle><scale>1.2</scale>' +
                        '<Icon><href>files/icon-' + xmlEscape(iconType) + '.png</href></Icon>' +
                        '</IconStyle>' +
                        '<LabelStyle><scale>0.9</scale></LabelStyle>' +
                        '</Style>'
                    );
                } else {
                    styles.push(
                        '    <Style id="' + id + '">' +
                        '<IconStyle><color>' + lineCol + '</color>' +
                        '<scale>1.1</scale>' +
                        '<Icon><href>https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>' +
                        '</IconStyle>' +
                        '<LabelStyle><scale>0.9</scale></LabelStyle>' +
                        '</Style>'
                    );
                }
            } else if (kind === 'line') {
                styles.push(
                    '    <Style id="' + id + '">' +
                    '<LineStyle><color>' + lineCol + '</color>' +
                    '<width>' + (dashed ? 3 : 3) + '</width>' +
                    '</LineStyle></Style>'
                );
            } else if (kind === 'polygon') {
                styles.push(
                    '    <Style id="' + id + '">' +
                    '<LineStyle><color>' + lineCol + '</color><width>2</width></LineStyle>' +
                    '<PolyStyle><color>' + fillCol + '</color><fill>1</fill><outline>1</outline></PolyStyle>' +
                    '</Style>'
                );
            }
            return id;
        }

        for (const it of items) {
            if (it.kind === 'point') {
                const sid = styleIdFor('point', it.color, false, null, null, it.sym);
                placemarks.push(
                    '    <Placemark>' +
                    (it.name ? '<name>' + xmlEscape(it.name) + '</name>' : '') +
                    (it.desc ? '<description>' + xmlEscape(it.desc) + '</description>' : '') +
                    '<styleUrl>#' + sid + '</styleUrl>' +
                    '<Point><coordinates>' + kmlCoordTriple(it.lat, it.lng) + '</coordinates></Point>' +
                    '</Placemark>'
                );
            } else if (it.kind === 'line') {
                const coords = (it.coords || []).filter(c => Array.isArray(c) && c.length >= 2);
                if (coords.length < 2) continue;
                const sid = styleIdFor('line', it.color, !!it.dashed);
                const coordsStr = coords.map(c => kmlCoordTriple(c[0], c[1])).join(' ');
                placemarks.push(
                    '    <Placemark>' +
                    (it.name ? '<name>' + xmlEscape(it.name) + '</name>' : '') +
                    (it.desc ? '<description>' + xmlEscape(it.desc) + '</description>' : '') +
                    '<styleUrl>#' + sid + '</styleUrl>' +
                    '<LineString><tessellate>1</tessellate><coordinates>' + coordsStr + '</coordinates></LineString>' +
                    '</Placemark>'
                );
            } else if (it.kind === 'polygon') {
                const coords = (it.coords || []).filter(c => Array.isArray(c) && c.length >= 2);
                if (coords.length < 3) continue;
                const closed = coords.slice();
                const first = closed[0], last = closed[closed.length - 1];
                if (first[0] !== last[0] || first[1] !== last[1]) closed.push(first);
                const sid = styleIdFor('polygon', it.color, false, it.fillColor || it.color, it.fillOpacity);
                const coordsStr = closed.map(c => kmlCoordTriple(c[0], c[1])).join(' ');
                placemarks.push(
                    '    <Placemark>' +
                    (it.name ? '<name>' + xmlEscape(it.name) + '</name>' : '') +
                    (it.desc ? '<description>' + xmlEscape(it.desc) + '</description>' : '') +
                    '<styleUrl>#' + sid + '</styleUrl>' +
                    '<Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>' +
                    coordsStr +
                    '</coordinates></LinearRing></outerBoundaryIs></Polygon>' +
                    '</Placemark>'
                );
            }
        }

        const out = [];
        out.push('<?xml version="1.0" encoding="UTF-8"?>');
        out.push('<kml xmlns="http://www.opengis.net/kml/2.2">');
        out.push('  <Document>');
        out.push('    <name>' + xmlEscape(name) + '</name>');
        out.push.apply(out, styles);
        out.push.apply(out, placemarks);
        out.push('  </Document>');
        out.push('</kml>');
        return out.join('\n');
    }

    // ── CRC32 (för zip) ─────────────────────────────────────────────────────
    let _crcTable = null;
    function crc32(bytes) {
        if (!_crcTable) {
            _crcTable = new Uint32Array(256);
            for (let n = 0; n < 256; n++) {
                let c = n;
                for (let k = 0; k < 8; k++) {
                    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                }
                _crcTable[n] = c >>> 0;
            }
        }
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) {
            crc = (_crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    // ── Minimal ZIP-writer (STORE, ingen komprimering) ──────────────────────
    // Räcker för en doc.kml-fil; KMZ-spec tillåter okomprimerade entries.
    function makeZip(files) {
        // files = [{ name, bytes:Uint8Array }]
        const enc = new TextEncoder();
        const chunks = [];
        const centralDir = [];
        let offset = 0;

        for (const f of files) {
            const nameBytes = enc.encode(f.name);
            const data = f.bytes;
            const crc = crc32(data);
            const size = data.length;

            // Local file header
            const lfh = new Uint8Array(30 + nameBytes.length);
            const dv = new DataView(lfh.buffer);
            dv.setUint32(0, 0x04034b50, true);     // signature
            dv.setUint16(4, 20, true);              // version needed
            dv.setUint16(6, 0, true);               // gp bit flag
            dv.setUint16(8, 0, true);               // method = STORE
            dv.setUint16(10, 0, true);              // mod time
            dv.setUint16(12, 0, true);              // mod date
            dv.setUint32(14, crc, true);
            dv.setUint32(18, size, true);           // compressed size
            dv.setUint32(22, size, true);           // uncompressed size
            dv.setUint16(26, nameBytes.length, true);
            dv.setUint16(28, 0, true);              // extra len
            lfh.set(nameBytes, 30);
            chunks.push(lfh);
            chunks.push(data);

            // Central directory entry
            const cdh = new Uint8Array(46 + nameBytes.length);
            const dv2 = new DataView(cdh.buffer);
            dv2.setUint32(0, 0x02014b50, true);
            dv2.setUint16(4, 20, true);             // version made by
            dv2.setUint16(6, 20, true);             // version needed
            dv2.setUint16(8, 0, true);
            dv2.setUint16(10, 0, true);
            dv2.setUint16(12, 0, true);
            dv2.setUint16(14, 0, true);
            dv2.setUint32(16, crc, true);
            dv2.setUint32(20, size, true);
            dv2.setUint32(24, size, true);
            dv2.setUint16(28, nameBytes.length, true);
            dv2.setUint16(30, 0, true);
            dv2.setUint16(32, 0, true);
            dv2.setUint16(34, 0, true);
            dv2.setUint16(36, 0, true);
            dv2.setUint32(38, 0, true);             // ext attr
            dv2.setUint32(42, offset, true);        // local header offset
            cdh.set(nameBytes, 46);
            centralDir.push(cdh);

            offset += lfh.length + data.length;
        }

        const cdStart = offset;
        let cdSize = 0;
        for (const c of centralDir) { chunks.push(c); cdSize += c.length; }
        offset += cdSize;

        // End of central directory record
        const eocd = new Uint8Array(22);
        const dv = new DataView(eocd.buffer);
        dv.setUint32(0, 0x06054b50, true);
        dv.setUint16(4, 0, true);                   // disk
        dv.setUint16(6, 0, true);                   // disk w/ cd
        dv.setUint16(8, files.length, true);
        dv.setUint16(10, files.length, true);
        dv.setUint32(12, cdSize, true);
        dv.setUint32(16, cdStart, true);
        dv.setUint16(20, 0, true);                  // comment len
        chunks.push(eocd);

        return new Blob(chunks, { type: 'application/vnd.google-earth.kmz' });
    }

    function toKmz(opts) {
        const icons = (opts && opts.iconsByType) || null;
        const iconTypes = new Set();
        if (icons) {
            for (const k of Object.keys(icons)) {
                if (icons[k] && icons[k].length) iconTypes.add(k);
            }
        }
        const kml = buildKml({ name: opts && opts.name, items: opts && opts.items, iconTypes });
        const files = [{ name: 'doc.kml', bytes: new TextEncoder().encode(kml) }];
        if (icons) {
            for (const k of iconTypes) {
                files.push({ name: 'files/icon-' + k + '.png', bytes: icons[k] });
            }
        }
        return Promise.resolve(makeZip(files));
    }

    // ── GeoJSON ─────────────────────────────────────────────────────────────
    // Skriver en FeatureCollection. Returnerar en JS-objekt; serialisera med
    // JSON.stringify(obj, null, 2) vid behov. Polygoner stängs automatiskt.
    function toGeoJson(opts) {
        const name = opts && opts.name ? opts.name : 'Export';
        const items = (opts && opts.items) || [];
        const features = [];
        for (const it of items) {
            const props = {};
            if (it.name) props.name = it.name;
            if (it.desc) props.description = it.desc;
            if (it.sym) props.sym = it.sym;
            if (it.type) props.type = it.type;
            if (it.color) props.stroke = it.color;
            if (it.fillColor) props.fill = it.fillColor;
            if (it.fillOpacity != null) props['fill-opacity'] = it.fillOpacity;
            if (it.dashed) props['stroke-dasharray'] = '6 4';

            if (it.kind === 'point' && it.lat != null && it.lng != null) {
                features.push({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [Number(it.lng), Number(it.lat)] },
                    properties: props
                });
            } else if (it.kind === 'line') {
                const coords = (it.coords || []).filter(c => Array.isArray(c) && c.length >= 2);
                if (coords.length < 2) continue;
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: coords.map(c => [Number(c[1]), Number(c[0])])
                    },
                    properties: props
                });
            } else if (it.kind === 'polygon') {
                const coords = (it.coords || []).filter(c => Array.isArray(c) && c.length >= 2);
                if (coords.length < 3) continue;
                const closed = coords.slice();
                const f = closed[0], l = closed[closed.length - 1];
                if (f[0] !== l[0] || f[1] !== l[1]) closed.push(f);
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [closed.map(c => [Number(c[1]), Number(c[0])])]
                    },
                    properties: props
                });
            }
        }
        return {
            type: 'FeatureCollection',
            name,
            features
        };
    }

    // ── SVG → PNG (browser-only helper) ─────────────────────────────────────
    // Tar en komplett SVG-sträng (måste innehålla <svg>-rot) och ritar den
    // till en canvas vid önskad px-storlek. Returnerar PNG som Uint8Array.
    // Bilden ritas på vit bakgrund så att svartmålade symboler är synliga
    // även mot mörka kartlager — för KML-ikoner är detta nödvändigt eftersom
    // KMZ-ikoner inte får CSS-halo.
    function svgToPngBytes(svgString, sizePx) {
        if (typeof document === 'undefined' || typeof Image === 'undefined') {
            return Promise.reject(new Error('svgToPngBytes kräver browser-miljö'));
        }
        const size = sizePx || 64;
        return new Promise((resolve, reject) => {
            const svg = (svgString || '').trim();
            if (!svg.startsWith('<svg')) {
                reject(new Error('svgToPngBytes: SVG-rot saknas'));
                return;
            }
            // Säkerställ xmlns för rendering i Image.
            const svgWithNs = /xmlns=/.test(svg)
                ? svg
                : svg.replace(/^<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
            const blob = new Blob([svgWithNs], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = function () {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = size; canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    // Vit halo-padding så svarta symboler syns mot mörka KML-bakgrunder.
                    const pad = Math.round(size * 0.10);
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.drawImage(img, pad, pad, size - 2*pad, size - 2*pad);
                    canvas.toBlob(b => {
                        URL.revokeObjectURL(url);
                        if (!b) { reject(new Error('canvas.toBlob gav null')); return; }
                        b.arrayBuffer().then(buf => resolve(new Uint8Array(buf))).catch(reject);
                    }, 'image/png');
                } catch (err) {
                    URL.revokeObjectURL(url);
                    reject(err);
                }
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error('Image kunde inte ladda SVG'));
            };
            img.src = url;
        });
    }

    // ── Nedladdning ─────────────────────────────────────────────────────────
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    global.GEO_EXPORT = {
        toGpx,
        toKmz,
        toGeoJson,
        buildKml,
        svgToPngBytes,
        downloadBlob,
        stampFilename
    };
})(typeof window !== 'undefined' ? window : globalThis);
