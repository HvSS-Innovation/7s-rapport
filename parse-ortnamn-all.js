// Parse alla Lantmäteriet Ortnamn XML/JSON-filer → ortnamn.json
const fs = require('fs');
const path = require('path');

const rawDir = path.join(__dirname, 'raw');
let all = [];

for (const f of fs.readdirSync(rawDir).sort()) {
    const fp = path.join(rawDir, f);
    const content = fs.readFileSync(fp, 'utf8');
    const type = f.startsWith('sjo_') ? 's' : f.startsWith('oar_') ? 'ö' : f.startsWith('berg_') ? 'b' : null;
    if (!type) continue;

    // Parse XML
    const re = /<OrtnamnMember>([\s\S]*?)<\/OrtnamnMember>/g;
    let m, count = 0;
    while ((m = re.exec(content)) !== null) {
        const b = m[1];
        const namn = (b.match(/<namn>(.*?)<\/namn>/) || [])[1];
        const pos = (b.match(/<gml:pos>(.*?)<\/gml:pos>/) || [])[1];
        if (!namn || !pos) continue;
        const [n, e] = pos.split(' ').map(Number);
        const [la, lo] = sweref99ToWgs84(n, e);
        all.push({ n: namn, t: type, la, lo });
        count++;
    }

    // Try JSON if no XML matches
    if (count === 0) {
        try {
            const data = JSON.parse(content);
            for (const feat of (data.features || [])) {
                const namn = (feat.properties || {}).namn;
                const coords = feat.geometry && feat.geometry.coordinates;
                if (!namn || !coords) continue;
                const [e, n] = coords;
                const [la, lo] = sweref99ToWgs84(n, e);
                all.push({ n: namn, t: type, la, lo });
                count++;
            }
        } catch (e) {}
    }

    if (count > 0) console.log(`  ${f}: ${count}`);
}

// Dedup
const seen = new Set();
all = all.filter(p => {
    const key = `${p.n}|${p.la}|${p.lo}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
});

const sjo = all.filter(x => x.t === 's').length;
const oar = all.filter(x => x.t === 'ö').length;
const berg = all.filter(x => x.t === 'b').length;
console.log(`\nTotalt: ${sjo} sjöar + ${oar} öar + ${berg} berg = ${all.length} unika`);

fs.writeFileSync(path.join(__dirname, 'ortnamn.json'), JSON.stringify(all));
console.log(`ortnamn.json: ${(fs.statSync(path.join(__dirname, 'ortnamn.json')).size / 1024).toFixed(1)} KB`);

function sweref99ToWgs84(n, e) {
    const axis = 6378137.0, flattening = 1.0 / 298.257222101;
    const n_val = flattening / (2.0 - flattening);
    const a_roof = axis / (1.0 + n_val) * (1.0 + n_val * n_val / 4.0 + n_val ** 4 / 64.0);
    const e2 = flattening * (2.0 - flattening);
    const d1 = n_val / 2 - 2 * n_val ** 2 / 3 + 37 * n_val ** 3 / 96 - n_val ** 4 / 360;
    const d2 = n_val ** 2 / 48 + n_val ** 3 / 15 - 437 * n_val ** 4 / 1440;
    const d3 = 17 * n_val ** 3 / 480 - 37 * n_val ** 4 / 840;
    const d4 = 4397 * n_val ** 4 / 161280;
    const A = e2 + e2 ** 2 + e2 ** 3 + e2 ** 4;
    const B = -(7 * e2 ** 2 + 17 * e2 ** 3 + 30 * e2 ** 4) / 6;
    const C = (224 * e2 ** 3 + 889 * e2 ** 4) / 120;
    const D = -(4279 * e2 ** 4) / 1260;
    const lz = 15 * Math.PI / 180;
    const xi = n / (0.9996 * a_roof), eta = (e - 500000) / (0.9996 * a_roof);
    const xp = xi - d1 * Math.sin(2 * xi) * Math.cosh(2 * eta) - d2 * Math.sin(4 * xi) * Math.cosh(4 * eta) - d3 * Math.sin(6 * xi) * Math.cosh(6 * eta) - d4 * Math.sin(8 * xi) * Math.cosh(8 * eta);
    const ep = eta - d1 * Math.cos(2 * xi) * Math.sinh(2 * eta) - d2 * Math.cos(4 * xi) * Math.sinh(4 * eta) - d3 * Math.cos(6 * xi) * Math.sinh(6 * eta) - d4 * Math.cos(8 * xi) * Math.sinh(8 * eta);
    const ps = Math.asin(Math.sin(xp) / Math.cosh(ep));
    const dl = Math.atan(Math.sinh(ep) / Math.cos(xp));
    const lat = (ps + Math.sin(ps) * Math.cos(ps) * (A + B * Math.sin(ps) ** 2 + C * Math.sin(ps) ** 4 + D * Math.sin(ps) ** 6)) * 180 / Math.PI;
    const lon = (lz + dl) * 180 / Math.PI;
    return [Math.round(lat * 100000) / 100000, Math.round(lon * 100000) / 100000];
}
