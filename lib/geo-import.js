// ── lib/geo-import.js ───────────────────────────────────────────────────────
// Lossy GPX/KMZ/KML-import → items[] (samma format som geo-export.js tar in).
// Stödjer KMZ med STORE eller DEFLATE (kräver DecompressionStream för deflate).
// Återanvänds av minkarta och sensorskiss.
//
// API (window.GEO_IMPORT):
//   parseGpx(text)            → { name, items }
//   parseKml(text)            → { name, items }
//   parseKmz(arrayBuffer)     → Promise<{ name, items }>
//   importFile(file)          → Promise<{ name, items, format }>   // auto-detect
//
// items = [
//   { kind:'point',   lat, lng, name?, desc?, sym?, type?, color? },
//   { kind:'line',    coords:[[lat,lng], ...], name?, desc?, color?, dashed?, type? },
//   { kind:'polygon', coords:[[lat,lng], ...], name?, desc?, color?, fillColor? }
// ]

(function (global) {
    'use strict';

    // ── XML-helpers ─────────────────────────────────────────────────────────
    function parseXmlString(text) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'application/xml');
        // Felkontroll: parsererror-element finns i doc om input var trasigt
        const err = doc.getElementsByTagName('parsererror')[0];
        if (err) throw new Error('Trasigt XML: ' + (err.textContent || 'okänt fel'));
        return doc;
    }

    function childText(parent, tag) {
        if (!parent) return '';
        for (let i = 0; i < parent.childNodes.length; i++) {
            const c = parent.childNodes[i];
            if (c.nodeType === 1 && c.localName === tag) return (c.textContent || '').trim();
        }
        return '';
    }

    function firstChild(parent, tag) {
        if (!parent) return null;
        for (let i = 0; i < parent.childNodes.length; i++) {
            const c = parent.childNodes[i];
            if (c.nodeType === 1 && c.localName === tag) return c;
        }
        return null;
    }

    function children(parent, tag) {
        const out = [];
        if (!parent) return out;
        for (let i = 0; i < parent.childNodes.length; i++) {
            const c = parent.childNodes[i];
            if (c.nodeType === 1 && c.localName === tag) out.push(c);
        }
        return out;
    }

    function descendants(root, tag) {
        // Tag-namn utan namespace-prefix. Använder localName via traversal.
        const out = [];
        const walk = (node) => {
            for (let i = 0; i < node.childNodes.length; i++) {
                const c = node.childNodes[i];
                if (c.nodeType !== 1) continue;
                if (c.localName === tag) out.push(c);
                walk(c);
            }
        };
        walk(root);
        return out;
    }

    function parseNumber(s) {
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : null;
    }

    // ── GPX ─────────────────────────────────────────────────────────────────
    function parseGpx(text) {
        const doc = parseXmlString(text);
        const gpx = doc.documentElement;
        if (!gpx || gpx.localName !== 'gpx') throw new Error('Inte en GPX-fil');
        const meta = firstChild(gpx, 'metadata');
        const name = childText(meta, 'name') || 'GPX-import';
        const items = [];

        // wpt → point
        children(gpx, 'wpt').forEach(w => {
            const lat = parseNumber(w.getAttribute('lat'));
            const lng = parseNumber(w.getAttribute('lon'));
            if (lat == null || lng == null) return;
            items.push({
                kind: 'point',
                lat, lng,
                name: childText(w, 'name'),
                desc: childText(w, 'desc') || childText(w, 'cmt'),
                sym: childText(w, 'sym'),
                type: childText(w, 'type')
            });
        });

        // trk → line eller polygon (om type=polygon)
        children(gpx, 'trk').forEach(trk => {
            const tname = childText(trk, 'name');
            const tdesc = childText(trk, 'desc');
            const ttype = childText(trk, 'type');
            const coords = [];
            children(trk, 'trkseg').forEach(seg => {
                children(seg, 'trkpt').forEach(pt => {
                    const lat = parseNumber(pt.getAttribute('lat'));
                    const lng = parseNumber(pt.getAttribute('lon'));
                    if (lat != null && lng != null) coords.push([lat, lng]);
                });
            });
            if (coords.length < 2) return;
            const isPolygon = (ttype && ttype.toLowerCase() === 'polygon') ||
                (coords.length >= 4 &&
                 coords[0][0] === coords[coords.length - 1][0] &&
                 coords[0][1] === coords[coords.length - 1][1]);
            if (isPolygon) {
                // Ta bort den dubblerade slutpunkten för polygon-input
                const cleaned = coords.slice();
                if (cleaned.length >= 4 &&
                    cleaned[0][0] === cleaned[cleaned.length - 1][0] &&
                    cleaned[0][1] === cleaned[cleaned.length - 1][1]) {
                    cleaned.pop();
                }
                if (cleaned.length >= 3) {
                    items.push({
                        kind: 'polygon', coords: cleaned,
                        name: tname, desc: tdesc, type: ttype
                    });
                }
            } else {
                items.push({
                    kind: 'line', coords,
                    name: tname, desc: tdesc, type: ttype
                });
            }
        });

        // rte → line (för fullständighet)
        children(gpx, 'rte').forEach(rte => {
            const rname = childText(rte, 'name');
            const rdesc = childText(rte, 'desc');
            const coords = [];
            children(rte, 'rtept').forEach(pt => {
                const lat = parseNumber(pt.getAttribute('lat'));
                const lng = parseNumber(pt.getAttribute('lon'));
                if (lat != null && lng != null) coords.push([lat, lng]);
            });
            if (coords.length >= 2) {
                items.push({ kind: 'line', coords, name: rname, desc: rdesc });
            }
        });

        return { name, items };
    }

    // ── KML ─────────────────────────────────────────────────────────────────
    function parseKml(text) {
        const doc = parseXmlString(text);
        const kml = doc.documentElement;
        if (!kml || kml.localName !== 'kml') throw new Error('Inte en KML-fil');
        const docEl = firstChild(kml, 'Document') || kml;
        const name = childText(docEl, 'name') || 'KML-import';
        const items = [];

        // Stilar mappas till färg per id
        const styles = Object.create(null);
        descendants(kml, 'Style').forEach(st => {
            const id = st.getAttribute('id');
            if (!id) return;
            const ls = firstChild(st, 'LineStyle');
            const ps = firstChild(st, 'PolyStyle');
            const ic = firstChild(st, 'IconStyle');
            const lineCol = ls ? childText(ls, 'color') : '';
            const polyCol = ps ? childText(ps, 'color') : '';
            const iconCol = ic ? childText(ic, 'color') : '';
            styles[id] = {
                lineColor: kmlColorToHex(lineCol) || kmlColorToHex(iconCol),
                fillColor: kmlColorToHex(polyCol)
            };
        });

        descendants(kml, 'Placemark').forEach(pm => {
            const pname = childText(pm, 'name');
            const pdesc = childText(pm, 'description');
            const styleUrl = childText(pm, 'styleUrl').replace(/^#/, '');
            const st = styles[styleUrl] || {};

            const point = firstChild(pm, 'Point');
            const line = firstChild(pm, 'LineString');
            const poly = firstChild(pm, 'Polygon');
            const multi = firstChild(pm, 'MultiGeometry');

            const geoms = [];
            if (point) geoms.push({ kind: 'point', el: point });
            if (line) geoms.push({ kind: 'line', el: line });
            if (poly) geoms.push({ kind: 'polygon', el: poly });
            if (multi) {
                children(multi, 'Point').forEach(g => geoms.push({ kind: 'point', el: g }));
                children(multi, 'LineString').forEach(g => geoms.push({ kind: 'line', el: g }));
                children(multi, 'Polygon').forEach(g => geoms.push({ kind: 'polygon', el: g }));
            }

            geoms.forEach(g => {
                if (g.kind === 'point') {
                    const coordTxt = childText(g.el, 'coordinates');
                    const co = parseKmlCoords(coordTxt);
                    if (co.length) {
                        items.push({
                            kind: 'point', lat: co[0][0], lng: co[0][1],
                            name: pname, desc: pdesc, color: st.lineColor
                        });
                    }
                } else if (g.kind === 'line') {
                    const coordTxt = childText(g.el, 'coordinates');
                    const co = parseKmlCoords(coordTxt);
                    if (co.length >= 2) {
                        items.push({
                            kind: 'line', coords: co,
                            name: pname, desc: pdesc, color: st.lineColor
                        });
                    }
                } else if (g.kind === 'polygon') {
                    const outer = firstChild(g.el, 'outerBoundaryIs');
                    const ring = outer ? firstChild(outer, 'LinearRing') : null;
                    const coordTxt = ring ? childText(ring, 'coordinates') : '';
                    let co = parseKmlCoords(coordTxt);
                    // Ta bort dubblerad slutpunkt om finns
                    if (co.length >= 4 &&
                        co[0][0] === co[co.length - 1][0] &&
                        co[0][1] === co[co.length - 1][1]) {
                        co = co.slice(0, -1);
                    }
                    if (co.length >= 3) {
                        items.push({
                            kind: 'polygon', coords: co,
                            name: pname, desc: pdesc,
                            color: st.lineColor, fillColor: st.fillColor
                        });
                    }
                }
            });
        });

        return { name, items };
    }

    // KML <coordinates> innehåller "lng,lat[,alt] lng,lat[,alt] ..." separerat
    // av whitespace. Returnerar [[lat,lng], ...].
    function parseKmlCoords(txt) {
        if (!txt) return [];
        const out = [];
        const tokens = txt.trim().split(/\s+/);
        for (const t of tokens) {
            const parts = t.split(',');
            if (parts.length < 2) continue;
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            if (Number.isFinite(lat) && Number.isFinite(lng)) out.push([lat, lng]);
        }
        return out;
    }

    // KML-färg = aabbggrr (8 hex). Returnerar "#rrggbb".
    function kmlColorToHex(c) {
        if (!c) return null;
        const m = String(c).trim().match(/^[0-9a-fA-F]{8}$/);
        if (!m) return null;
        const r = c.slice(6, 8);
        const g = c.slice(4, 6);
        const b = c.slice(2, 4);
        return '#' + (r + g + b).toLowerCase();
    }

    // ── KMZ (zip extraction) ────────────────────────────────────────────────
    async function parseKmz(arrayBuffer) {
        const files = await unzip(arrayBuffer);
        // Hitta första .kml (vanligt: doc.kml)
        const kmlEntry = files.find(f => /\.kml$/i.test(f.name)) || files[0];
        if (!kmlEntry) throw new Error('KMZ saknar KML-fil');
        const text = new TextDecoder('utf-8').decode(kmlEntry.bytes);
        return parseKml(text);
    }

    // Minimal ZIP-läsare. Hanterar STORE och DEFLATE (om DecompressionStream finns).
    async function unzip(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        const bytes = new Uint8Array(arrayBuffer);
        // Hitta End of Central Directory (signature 0x06054b50), bakåt från slutet
        let eocd = -1;
        const maxBack = Math.min(arrayBuffer.byteLength, 65557); // 22 + 65535
        for (let i = arrayBuffer.byteLength - 22; i >= arrayBuffer.byteLength - maxBack; i--) {
            if (i < 0) break;
            if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd < 0) throw new Error('ZIP: hittade inte EOCD');
        const cdEntries = view.getUint16(eocd + 10, true);
        const cdSize = view.getUint32(eocd + 12, true);
        const cdOffset = view.getUint32(eocd + 16, true);

        const out = [];
        let p = cdOffset;
        for (let i = 0; i < cdEntries; i++) {
            if (view.getUint32(p, true) !== 0x02014b50) throw new Error('ZIP: ogiltig CD-post');
            const method = view.getUint16(p + 10, true);
            const compSize = view.getUint32(p + 20, true);
            const uncompSize = view.getUint32(p + 24, true);
            const nameLen = view.getUint16(p + 28, true);
            const extraLen = view.getUint16(p + 30, true);
            const commentLen = view.getUint16(p + 32, true);
            const localOffset = view.getUint32(p + 42, true);
            const name = new TextDecoder('utf-8').decode(bytes.subarray(p + 46, p + 46 + nameLen));
            p += 46 + nameLen + extraLen + commentLen;

            // Läs lokal header för att hoppa över extra fält
            if (view.getUint32(localOffset, true) !== 0x04034b50) continue;
            const lhNameLen = view.getUint16(localOffset + 26, true);
            const lhExtraLen = view.getUint16(localOffset + 28, true);
            const dataStart = localOffset + 30 + lhNameLen + lhExtraLen;
            const compressed = bytes.subarray(dataStart, dataStart + compSize);

            let data;
            if (method === 0) {
                data = compressed.slice();
            } else if (method === 8) {
                if (typeof DecompressionStream === 'undefined') {
                    throw new Error('KMZ-filen är komprimerad (DEFLATE) men browsern saknar DecompressionStream');
                }
                data = await inflate(compressed);
                if (data.length !== uncompSize) {
                    // Tolerera, men varna i konsol
                    if (data.length === 0) throw new Error('KMZ: tom efter inflate');
                }
            } else {
                throw new Error('ZIP: ostött compression-metod ' + method);
            }
            out.push({ name, bytes: data });
        }
        return out;
    }

    async function inflate(compressedBytes) {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compressedBytes);
        writer.close();
        const ab = await new Response(ds.readable).arrayBuffer();
        return new Uint8Array(ab);
    }

    // ── Auto-detection ──────────────────────────────────────────────────────
    async function importFile(file) {
        if (!file) throw new Error('Ingen fil vald');
        const name = file.name || 'fil';
        const ext = (name.split('.').pop() || '').toLowerCase();
        if (ext === 'gpx') {
            const text = await file.text();
            const r = parseGpx(text);
            return { name: stripExt(name), items: r.items, format: 'gpx' };
        } else if (ext === 'kml') {
            const text = await file.text();
            const r = parseKml(text);
            return { name: stripExt(name), items: r.items, format: 'kml' };
        } else if (ext === 'kmz' || ext === 'zip') {
            const ab = await file.arrayBuffer();
            const r = await parseKmz(ab);
            return { name: stripExt(name), items: r.items, format: 'kmz' };
        } else {
            // Sniff: testa GPX/KML från textinnehåll
            const text = await file.text();
            if (/<gpx[\s>]/i.test(text)) {
                const r = parseGpx(text);
                return { name: stripExt(name), items: r.items, format: 'gpx' };
            }
            if (/<kml[\s>]/i.test(text)) {
                const r = parseKml(text);
                return { name: stripExt(name), items: r.items, format: 'kml' };
            }
            throw new Error('Okänt filformat (stödjer .gpx, .kml, .kmz)');
        }
    }

    function stripExt(name) {
        return name.replace(/\.(gpx|kml|kmz|zip)$/i, '');
    }

    global.GEO_IMPORT = {
        parseGpx, parseKml, parseKmz, importFile
    };

}(window));
