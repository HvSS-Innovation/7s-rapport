// ─────────────────────────────────────────────────────────────────────────────
//  SENSORSKISS — symbolbibliotek (v2 — reglementsenliga former)
//
//  Symbolerna kommer från Utbildningsanvisning sensorer Hemvärn 2025
//  (FM2025-8701:1) sid 72 ("Symboler för sensorer") samt JL.pdf:
//
//    UMRA-stjärna är gemensam grundform för CIM/PIR/KAMERA/UMRA.
//    Pärllooper (CIM), V-strålar (KAMERA), enkel stråle (PIR) eller bara
//    stjärnan (UMRA) skiljer dem åt. För Larmmina används fylld svart cirkel
//    + linje (utlösningsriktning). Poster (Enkelpost, Dubbelpost) är ring +
//    stam(mar) — stammen pekar i bevakningsriktningen.
//
//  Rotationsmodell: en inre <g transform="rotate({ROT},12,12)"> innesluter
//  bara den roterande delen (stråle/looper/stam) — stjärnan/ringen/cirkeln
//  står still. makeIcon ersätter {ROT} med obj.rotation vid render.
//
//  Kategorier:
//    'point'   — engångsklick placerar en punktsymbol (ev. directional)
//    'polygon' — sluten polygon (klicka noder, dubbelklick stänger)
// ─────────────────────────────────────────────────────────────────────────────

const SK_INK  = '#000000';
const SK_HALO = '#ffffff';
const SK_DASH = '6 4';   // streckad riktningslinje (PDF s. 72)

// Gemensam UMRA-stjärna (4-uddig) centrerad på (12,12). Yttre uddar på
// avstånd 5 (= stjärnan spänner 10×10 i 24×24-viewBoxen, syns tydligt vid
// 34px ikonstorlek). Inre kontroll-punkter följer prototypens proportion
// (R/r ≈ 2.4) så formen blir lika "smal-uddig" som i UMRA-prototyperna.
const STAR_PATH =
    '<path d="M 12,7 Q 13.5,10.6 17,12 Q 13.5,13.4 12,17 ' +
    'Q 10.5,13.4 7,12 Q 10.5,10.6 12,7 Z" fill="' + SK_INK + '"/>';

// Bygger en SVG där den roterande delen ligger inne i en <g> som tar emot
// {ROT}-placeholder. Den statiska delen (stjärnan/ringen/cirkeln) ligger
// utanför och vrids inte med.
function rotSvg(rotatingInner, staticInner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' +
            'overflow="visible">' +
        '<g transform="rotate({ROT},12,12)">' + (rotatingInner || '') + '</g>' +
        (staticInner || '') +
    '</svg>';
}

// ── Roterande delar för stjärn-symbolerna ────────────────────────────────────

// CIM — två lodrätta ellipsringar ovan/under stjärnan (förenkling av
// pärlloop-mönstret; varje loop är en tunn ellips strax utanför stjärnans
// y-utsträckning på 7..17).
const CIM_ROT =
    '<ellipse cx="12" cy="3.5" rx="2.5" ry="3.5" fill="none" ' +
        'stroke="' + SK_INK + '" stroke-width="1.1" ' +
        'stroke-dasharray="1.2 0.7"/>' +
    '<ellipse cx="12" cy="20.5" rx="2.5" ry="3.5" fill="none" ' +
        'stroke="' + SK_INK + '" stroke-width="1.1" ' +
        'stroke-dasharray="1.2 0.7"/>';

// PIR — en streckad stråle +17.5° från norr. Startar vid stjärnans yttre
// kant (avstånd 5 från centrum) och sticker ut till nära viewBox-toppen
// (avstånd 11 från centrum).
const PIR_ROT =
    '<line x1="13.5" y1="7.2" x2="15.3" y2="1.5" ' +
        'stroke="' + SK_INK + '" stroke-width="1.3" ' +
        'stroke-dasharray="1.6 1.2" stroke-linecap="round"/>';

// KAMERA — V-strålar, ±17.5° från norr (PIR + spegelbild).
const KAMERA_ROT =
    PIR_ROT +
    '<line x1="10.5" y1="7.2" x2="8.7" y2="1.5" ' +
        'stroke="' + SK_INK + '" stroke-width="1.3" ' +
        'stroke-dasharray="1.6 1.2" stroke-linecap="round"/>';

// ── Symboldefinitioner ───────────────────────────────────────────────────────

const SYMBOLS = {

    // Markbundna sensorer — alla bygger på UMRA-stjärnan
    cim: {
        label: 'CIM',
        category: 'point',
        prefix: 'C',
        directional: true,
        svg: rotSvg(CIM_ROT, STAR_PATH)
    },
    pir: {
        label: 'PIR',
        category: 'point',
        prefix: 'P',
        directional: true,
        svg: rotSvg(PIR_ROT, STAR_PATH)
    },
    kamera: {
        label: 'KAMERA',
        category: 'point',
        prefix: 'K',
        directional: true,
        svg: rotSvg(KAMERA_ROT, STAR_PATH)
    },
    umra: {
        // UMRA = bara stjärnan, ingen stråle. Inte directional — stjärnan
        // har fyra uddar och anger inte en specifik riktning.
        label: 'UMRA',
        category: 'point',
        prefix: 'U',
        directional: false,
        svg: rotSvg('', STAR_PATH)
    },

    // Larmmina — fylld svart cirkel + linje. Linjen anger utlösnings-/
    // snubbeltrådsriktning (directional).
    larmmina: {
        label: 'Larmmina',
        category: 'point',
        prefix: 'L',
        directional: true,
        svg: rotSvg(
            '<line x1="12" y1="8" x2="12" y2="1.5" ' +
                'stroke="' + SK_INK + '" stroke-width="1.8" ' +
                'stroke-linecap="square"/>',
            '<circle cx="12" cy="12" r="4" fill="' + SK_INK + '"/>'
        )
    },

    // RPAS — fluga/M-form (övre vingsektion + nedre rombsektion). Inte
    // directional (drönare flyger dynamiskt; symbolen markerar utgångsplats).
    rpas: {
        label: 'RPAS',
        category: 'point',
        prefix: null,
        directional: false,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            // Övre M-sektion
            '<polygon points="3.2,0.05 13.1,2.6 21.6,0 21.6,4.5 12,10.2 3.2,4.5" ' +
                'fill="' + SK_INK + '"/>' +
            // Nedre rombsektion
            '<polygon points="0,5.1 0,23.7 12.2,15.9 24,23.7 24,5.4 12.5,13.4" ' +
                'fill="' + SK_INK + '"/>' +
        '</svg>'
    },

    // Poster — ring + stam(mar). Stammen(arna) pekar i bevakningsriktningen.
    // Ring r=6 (matchar prototypens 46/100 ≈ 46% av bredden). Stam strax
    // ovanför ring-kanten, längd ~3.5 (= prototypens 27/100 × 6).
    enkelpost: {
        label: 'Enkelpost',
        category: 'point',
        prefix: null,
        directional: true,
        svg: rotSvg(
            '<line x1="12" y1="5.2" x2="12" y2="1.5" ' +
                'stroke="' + SK_INK + '" stroke-width="1.8" ' +
                'stroke-linecap="square"/>',
            '<circle cx="12" cy="12" r="6" fill="none" ' +
                'stroke="' + SK_INK + '" stroke-width="1.8"/>'
        )
    },
    dubbelpost: {
        label: 'Dubbelpost / patrull',
        category: 'point',
        prefix: null,
        directional: true,
        svg: rotSvg(
            '<line x1="9.5" y1="5.2" x2="9.5" y2="1.5" ' +
                'stroke="' + SK_INK + '" stroke-width="1.8" ' +
                'stroke-linecap="square"/>' +
            '<line x1="14.5" y1="5.2" x2="14.5" y2="1.5" ' +
                'stroke="' + SK_INK + '" stroke-width="1.8" ' +
                'stroke-linecap="square"/>',
            '<circle cx="12" cy="12" r="6" fill="none" ' +
                'stroke="' + SK_INK + '" stroke-width="1.8"/>'
        )
    },
    // In/Utfartspost — cirkel + pil. Pilen roterar, cirkeln står still.
    infart: {
        label: 'In/Utfartspost',
        category: 'point',
        prefix: null,
        directional: true,
        svg: rotSvg(
            '<line x1="3" y1="12" x2="19" y2="12" ' +
                'stroke="' + SK_INK + '" stroke-width="2.2" ' +
                'stroke-linecap="round"/>' +
            '<polygon points="22,12 16,8 16,16" fill="' + SK_INK + '"/>',
            '<circle cx="12" cy="12" r="9" fill="none" ' +
                'stroke="' + SK_INK + '" stroke-width="2.2"/>'
        )
    },

    // Sensorområde — frihandsritad polygon med streckad svart kant.
    sensoromrade: {
        label: 'Sensorområde',
        category: 'polygon',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            '<path d="M3 8 Q6 3 12 4 Q19 6 21 11 Q21 17 16 20 Q9 22 4 17 Q1 12 3 8 Z" ' +
                'fill="rgba(0,0,0,0.08)" stroke="' + SK_INK + '" ' +
                'stroke-width="1.5" stroke-dasharray="2.5 2"/>' +
        '</svg>',
        stroke: SK_INK,
        fill: 'rgba(0,0,0,0.08)',
        fillOpacity: 0.08,
        dashArray: '6 4'
    }
};

// Palett-grupper (UI-layout). Speglar PDF-strukturen.
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

// Bygger en Leaflet divIcon för en symbol. Rotation appliceras genom att
// ersätta {ROT}-placeholdern i SVG:n — bara den inre <g>-gruppen vrids.
function makeIcon(id, obj) {
    const sym = SYMBOLS[id];
    if (!sym) return null;
    let svgStr = sym.svg;
    const rot = (obj && obj.rotation && DIRECTIONAL_TYPES.has(id))
        ? obj.rotation : 0;
    svgStr = svgStr.replace(/\{ROT\}/g, rot);
    return L.divIcon({
        className: 'sk-icon sk-icon-' + id,
        html: svgStr,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });
}

// Hjälpfunktion för export/preview: returnerar SVG-strängen med rotation
// applicerad (eller 0 om symbolen inte är directional eller obj saknar
// rotation).
function symbolSvg(id, obj) {
    const sym = SYMBOLS[id];
    if (!sym) return null;
    const rot = (obj && obj.rotation && DIRECTIONAL_TYPES.has(id))
        ? obj.rotation : 0;
    return sym.svg.replace(/\{ROT\}/g, rot);
}

window.SK_SYMBOLS = SYMBOLS;
window.SK_SYMBOL_GROUPS = SYMBOL_GROUPS;
window.skMakeIcon = makeIcon;
window.skSymbolSvg = symbolSvg;
window.SK_DIRECTIONAL_TYPES = DIRECTIONAL_TYPES;
