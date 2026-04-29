// ─────────────────────────────────────────────────────────────────────────────
//  SENSORSKISS — symbolbibliotek (v1)
//
//  Symbolerna kommer från Utbildningsanvisning sensorer Hemvärn 2025
//  (FM2025-8701:1) sid 72 ("Symboler för sensorer") samt JL.pdf:
//
//    Sensor-bokstäver (typ-prefix): C=CIM, P=PIR, K=KAMERA, U=UMRA, L=Larmmina
//    Övriga: RPAS, Enkelpost, Dubbelpost/patrull, In/Utfartspost, Sensorområde
//
//  Designspråk: rena svart-vita SVG:er, vit halo via CSS-filter
//  (.sk-icon i sensorskiss.html). Samma teknik som MINKARTA v4.
//
//  Kategorier:
//    'point'   — engångsklick placerar en punktsymbol (ev. directional)
//    'polygon' — sluten polygon (klicka noder, dubbelklick stänger)
// ─────────────────────────────────────────────────────────────────────────────

const SK_INK  = '#000000';
const SK_HALO = '#ffffff';
const SK_DASH = '6 4';   // streckad riktningslinje (PDF s. 72)

// Bygger en sensor-baseSVG: en geometrisk grundform (kvadrat / triangel /
// cirkel / romb) med en bokstav i mitten. Storlek 0–24 viewBox.
function sensorSvg(shapePath, letter) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
        shapePath +
        '<text x="12" y="16" text-anchor="middle" ' +
        'font-family="Inter,Arial,sans-serif" font-size="11" font-weight="800" ' +
        'fill="' + SK_HALO + '">' + letter + '</text>' +
    '</svg>';
}

// Sensor-baseSVG som tar ett dynamiskt label (t.ex. "C", "C1", "C12").
// Används av makeIcon när obj.numLabel är satt.
function sensorSvgLabeled(shapePath, label) {
    var len = (label || 'C').length;
    var fontSize = len <= 1 ? 11 : (len === 2 ? 9 : 7.5);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
        shapePath +
        '<text x="12" y="' + (len <= 1 ? 16 : 15) + '" text-anchor="middle" ' +
        'font-family="Inter,Arial,sans-serif" font-size="' + fontSize + '" ' +
        'font-weight="800" fill="' + SK_HALO + '">' + label + '</text>' +
    '</svg>';
}

// Geometriska grundformer för de fyra markbundna sensorerna.
const SHAPE_CIM    = '<rect x="3" y="3" width="18" height="18" fill="' + SK_INK + '"/>';
const SHAPE_PIR    = '<polygon points="12,3 22,21 2,21" fill="' + SK_INK + '"/>';
const SHAPE_KAMERA = '<circle cx="12" cy="12" r="10" fill="' + SK_INK + '"/>';
const SHAPE_UMRA   = '<polygon points="12,2 22,12 12,22 2,12" fill="' + SK_INK + '"/>';

const SYMBOLS = {

    // ── Markbundna sensorer ──────────────────────────────────────────────────
    cim: {
        label: 'CIM',
        category: 'point',
        prefix: 'C',
        directional: true,
        svg: sensorSvg(SHAPE_CIM, 'C'),
        shape: SHAPE_CIM
    },
    pir: {
        label: 'PIR',
        category: 'point',
        prefix: 'P',
        directional: true,
        svg: sensorSvg(SHAPE_PIR, 'P'),
        shape: SHAPE_PIR
    },
    kamera: {
        label: 'KAMERA',
        category: 'point',
        prefix: 'K',
        directional: true,
        svg: sensorSvg(SHAPE_KAMERA, 'K'),
        shape: SHAPE_KAMERA
    },
    umra: {
        label: 'UMRA',
        category: 'point',
        prefix: 'U',
        directional: true,
        svg: sensorSvg(SHAPE_UMRA, 'U'),
        shape: SHAPE_UMRA
    },

    // ── Larmmina ─────────────────────────────────────────────────────────────
    // Reglementetstecknet i Utbildningsanvisning s. 72 — fylld svart cirkel.
    // L-prefix kommer från JL.pdf-listan. Inte directional (utlöses passivt
    // via snubbeltråd; placering pekar inte i en bestämd riktning).
    larmmina: {
        label: 'Larmmina',
        category: 'point',
        prefix: 'L',
        directional: false,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            '<circle cx="12" cy="12" r="10" fill="' + SK_INK + '"/>' +
            '<text x="12" y="16" text-anchor="middle" ' +
                'font-family="Inter,Arial,sans-serif" font-size="11" font-weight="800" ' +
                'fill="' + SK_HALO + '">L</text>' +
        '</svg>'
    },

    // ── RPAS (propellerdriven UAV) ───────────────────────────────────────────
    // Quadkopter — fyra rotorer i hörnen + ram. Inte directional (drönare
    // flyger dynamiskt; en uppritad RPAS-symbol markerar utgångsplats).
    rpas: {
        label: 'RPAS',
        category: 'point',
        prefix: null,
        directional: false,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            // Diagonala armar (X-form)
            '<line x1="5" y1="5" x2="19" y2="19" stroke="' + SK_INK + '" stroke-width="1.8" stroke-linecap="round"/>' +
            '<line x1="19" y1="5" x2="5" y2="19" stroke="' + SK_INK + '" stroke-width="1.8" stroke-linecap="round"/>' +
            // Centrumkropp
            '<circle cx="12" cy="12" r="2.4" fill="' + SK_INK + '"/>' +
            // Rotor-cirklar (öppna)
            '<circle cx="5" cy="5"   r="3" fill="none" stroke="' + SK_INK + '" stroke-width="1.5"/>' +
            '<circle cx="19" cy="5"  r="3" fill="none" stroke="' + SK_INK + '" stroke-width="1.5"/>' +
            '<circle cx="5" cy="19"  r="3" fill="none" stroke="' + SK_INK + '" stroke-width="1.5"/>' +
            '<circle cx="19" cy="19" r="3" fill="none" stroke="' + SK_INK + '" stroke-width="1.5"/>' +
        '</svg>'
    },

    // ── Poster ───────────────────────────────────────────────────────────────
    // Reglementets enkelpost = en triangel pekande uppåt med en cirkel inuti.
    enkelpost: {
        label: 'Enkelpost',
        category: 'point',
        prefix: null,
        directional: false,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            '<polygon points="12,4 21,21 3,21" fill="' + SK_INK + '"/>' +
            '<circle cx="12" cy="16" r="3" fill="' + SK_HALO + '"/>' +
        '</svg>'
    },
    // Dubbelpost / patrull — två trianglar bredvid varandra.
    dubbelpost: {
        label: 'Dubbelpost / patrull',
        category: 'point',
        prefix: null,
        directional: false,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            '<polygon points="7,5 13,21 1,21" fill="' + SK_INK + '"/>' +
            '<circle cx="7" cy="17" r="2" fill="' + SK_HALO + '"/>' +
            '<polygon points="17,5 23,21 11,21" fill="' + SK_INK + '"/>' +
            '<circle cx="17" cy="17" r="2" fill="' + SK_HALO + '"/>' +
        '</svg>'
    },
    // In/Utfartspost (från JL.pdf) — cirkel med pil tvärsigenom, visar passage.
    infart: {
        label: 'In/Utfartspost',
        category: 'point',
        prefix: null,
        directional: true,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            '<circle cx="12" cy="12" r="9" fill="none" stroke="' + SK_INK + '" stroke-width="2.4"/>' +
            '<line x1="3" y1="12" x2="19" y2="12" stroke="' + SK_INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
            '<polygon points="22,12 16,8 16,16" fill="' + SK_INK + '"/>' +
        '</svg>'
    },

    // ── Sensorområde ─────────────────────────────────────────────────────────
    // Frihandsritad polygon med streckad svart kant + ljus fyllning.
    // Användaren skriver in antalText (t.ex. "3 PIR + 1 KAMERA") som visas
    // som tooltip i polygonens centrum. Reglementets exempel s. 72.
    'sensoromrade': {
        label: 'Sensorområde',
        category: 'polygon',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            '<path d="M3 8 Q6 3 12 4 Q19 6 21 11 Q21 17 16 20 Q9 22 4 17 Q1 12 3 8 Z" ' +
                'fill="rgba(0,0,0,0.08)" stroke="' + SK_INK + '" stroke-width="1.5" stroke-dasharray="2.5 2"/>' +
        '</svg>',
        stroke: SK_INK,
        fill: 'rgba(0,0,0,0.08)',
        fillOpacity: 0.08,
        dashArray: '6 4'
    }
};

// Palett-grupper (UI-layout). Speglar PDF-strukturen: först de fyra "tekniska"
// markbundna sensorerna (CIM/PIR/KAMERA/UMRA), sen Larmmina, RPAS, poster,
// och områden.
const SYMBOL_GROUPS = [
    { title: 'Markbundna sensorer', ids: ['cim', 'pir', 'kamera', 'umra'] },
    { title: 'Larmmina',            ids: ['larmmina'] },
    { title: 'Luftburna sensorer',  ids: ['rpas'] },
    { title: 'Poster',              ids: ['enkelpost', 'dubbelpost', 'infart'] },
    { title: 'Områden',             ids: ['sensoromrade'] }
];

// Symboler där rotation/riktningslinje gäller (directional).
const DIRECTIONAL_TYPES = new Set(
    Object.keys(SYMBOLS).filter(k => SYMBOLS[k].directional === true)
);

// Bygger en Leaflet divIcon för en symbol. obj är valfritt — om obj.numLabel
// finns rendereras den siffran inne i symbolens textfält (för C/P/K/U/L).
// Rotation appliceras via inre wrapper-div så att Leaflet-ikonen visas vriden.
function makeIcon(id, obj) {
    const sym = SYMBOLS[id];
    if (!sym) return null;
    let svgStr = sym.svg;

    // Ersätt textinnehållet för C/P/K/U/L när obj.numLabel finns. Vi
    // bygger om SVG:n via sensorSvgLabeled så att font-storleken anpassas
    // till etikettens längd.
    if (obj && obj.numLabel && sym.shape) {
        svgStr = sensorSvgLabeled(sym.shape, obj.numLabel);
    } else if (obj && obj.numLabel && id === 'larmmina') {
        var len = obj.numLabel.length;
        var fs = len <= 1 ? 11 : (len === 2 ? 9 : 7.5);
        svgStr = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            '<circle cx="12" cy="12" r="10" fill="' + SK_INK + '"/>' +
            '<text x="12" y="' + (len <= 1 ? 16 : 15) + '" text-anchor="middle" ' +
                'font-family="Inter,Arial,sans-serif" font-size="' + fs + '" font-weight="800" ' +
                'fill="' + SK_HALO + '">' + obj.numLabel + '</text>' +
        '</svg>';
    }

    let html = svgStr;
    if (obj && obj.rotation && DIRECTIONAL_TYPES.has(id)) {
        html = '<div class="sk-rot" style="width:100%;height:100%;transform:rotate(' +
            obj.rotation + 'deg)">' + svgStr + '</div>';
    }
    return L.divIcon({
        className: 'sk-icon sk-icon-' + id,
        html: html,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });
}

window.SK_SYMBOLS = SYMBOLS;
window.SK_SYMBOL_GROUPS = SYMBOL_GROUPS;
window.skMakeIcon = makeIcon;
window.SK_DIRECTIONAL_TYPES = DIRECTIONAL_TYPES;
