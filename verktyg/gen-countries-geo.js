// ─────────────────────────────────────────────────────────────────────────────
//  GEN-COUNTRIES-GEO — genererar countries-geo.js (förenklad grannlands-
//  geometri för offline-väljarens SVG-karta) ur Natural Earth 50m admin_0.
//
//  Användning:
//    1. Ladda ner https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
//    2. node verktyg/gen-countries-geo.js <sökväg-till-ne50.geojson>
//    3. Utfilen countries-geo.js skrivs i repo-roten (window.HVCountriesGeo).
//
//  Länder: FI/EE/LV/LT (de som ritas i väljarens grannlands-panel, mockup
//  2026-07-29). DK/NO läggs till i COUNTRIES nedan när deras pmtiles-filer
//  byggts och panelen utökas — bbox-klippet (för att slippa Svalbard m.m.)
//  hämtas från countries.js-presetsens bbox.
//
//  Licens indata: Natural Earth, public domain.
//  Samma Douglas-Peucker-förenkling som verktyg/simplify-landskap.js.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];
if (!SRC) { console.error('Användning: node gen-countries-geo.js <ne_50m_admin_0_countries.geojson>'); process.exit(1); }

// NAME i Natural Earth → landskod + bbox-klipp (från countries.js-presets).
const COUNTRIES = {
    Finland:   { id: 'FI', namn: 'Finland',  clip: { west: 19.0, south: 59.5, east: 32.0, north: 70.5 } },
    Estonia:   { id: 'EE', namn: 'Estland',  clip: { west: 21.5, south: 57.5, east: 28.5, north: 59.8 } },
    Latvia:    { id: 'LV', namn: 'Lettland', clip: { west: 20.5, south: 55.5, east: 28.5, north: 58.2 } },
    Lithuania: { id: 'LT', namn: 'Litauen',  clip: { west: 20.5, south: 53.5, east: 27.0, north: 56.5 } }
};

const TOL = 0.008;        // DP-tolerans (grader)
const MIN_ISLAND = 0.06;  // öar vars bbox w&h båda < detta släpps

function perp(p, a, b) {
    const [px, py] = p, [ax, ay] = a, [bx, by] = b;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) { const ex = px - ax, ey = py - ay; return Math.sqrt(ex * ex + ey * ey); }
    let t = ((px - ax) * dx + (py - ay) * dy) / len2; t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy, ex = px - cx, ey = py - cy;
    return Math.sqrt(ex * ex + ey * ey);
}
function dp(pts, tol) {
    if (pts.length < 3) return pts;
    let dmax = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
        const d = perp(pts[i], pts[0], pts[pts.length - 1]);
        if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > tol) {
        const l = dp(pts.slice(0, idx + 1), tol), r = dp(pts.slice(idx), tol);
        return l.slice(0, -1).concat(r);
    }
    return [pts[0], pts[pts.length - 1]];
}
const round = (p, d = 3) => [+p[0].toFixed(d), +p[1].toFixed(d)];
function ringBbox(ring) {
    let W = 180, S = 90, E = -180, N = -90;
    for (const [x, y] of ring) { if (x < W) W = x; if (x > E) E = x; if (y < S) S = y; if (y > N) N = y; }
    return { W, S, E, N, w: E - W, h: N - S };
}
function simpRing(ring) {
    let s = dp(ring, TOL).map(p => round(p));
    if (s.length && (s[0][0] !== s[s.length - 1][0] || s[0][1] !== s[s.length - 1][1])) s.push(s[0]);
    return s.length >= 4 ? s : null;
}

const fc = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const out = { type: 'FeatureCollection', features: [] };

for (const f of fc.features) {
    const name = f.properties.NAME || f.properties.name;
    const spec = COUNTRIES[name];
    if (!spec) continue;
    const g = f.geometry;
    let polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    // Klipp: släpp delar helt utanför preset-bboxen (t.ex. avlägsna öar),
    // sortera störst först, släpp småöar under tröskeln.
    polys = polys
        .map(p => ({ p, bb: ringBbox(p[0]) }))
        .filter(o => o.bb.E > spec.clip.west && o.bb.W < spec.clip.east
                  && o.bb.N > spec.clip.south && o.bb.S < spec.clip.north)
        .sort((a, b) => b.bb.w * b.bb.h - a.bb.w * a.bb.h);
    const kept = [];
    polys.forEach((o, i) => {
        if (i === 0 || o.bb.w >= MIN_ISLAND || o.bb.h >= MIN_ISLAND) {
            const outer = simpRing(o.p[0]); // håltagning släpps (väljar-karta)
            if (outer) kept.push([outer]);
        }
    });
    const geom = kept.length === 1
        ? { type: 'Polygon', coordinates: kept[0] }
        : { type: 'MultiPolygon', coordinates: kept };
    out.features.push({ type: 'Feature', properties: { id: spec.id, namn: spec.namn }, geometry: geom });
}

// Stabil ordning: nord → syd (FI, EE, LV, LT) som i countries.js neighbors.
const orderIdx = { FI: 0, EE: 1, LV: 2, LT: 3, DK: 4, NO: 5 };
out.features.sort((a, b) => orderIdx[a.properties.id] - orderIdx[b.properties.id]);

const header =
    '// countries-geo.js — förenklad grannlands-geometri för offline-väljarens\n' +
    '// SVG-karta (shared/landskap-offline.js). GENERERAD av\n' +
    '// verktyg/gen-countries-geo.js ur Natural Earth 50m admin_0 (public\n' +
    '// domain) — redigera inte för hand, regenerera vid ändring.\n';
const geoStr = header + 'window.HVCountriesGeo=' + JSON.stringify(out) + ';\n';
const dest = path.join(__dirname, '..', 'countries-geo.js');
fs.writeFileSync(dest, geoStr);

let pts = 0;
for (const f of out.features) { const c = a => { if (typeof a[0] === 'number') { pts++; return; } a.forEach(c); }; c(f.geometry.coordinates); }
console.log('länder:', out.features.map(f => f.properties.id).join(','));
console.log('punkter totalt:', pts);
console.log('skrev', dest, (geoStr.length / 1024).toFixed(1) + ' KB');
