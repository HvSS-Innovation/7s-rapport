// ─────────────────────────────────────────────────────────────────────────────
//  SENSORSKISS — symbolbibliotek (v3 — RPAS-skala, prototypprofil)
//
//  Symbolerna kommer från Utbildningsanvisning sensorer Hemvärn 2025
//  (FM2025-8701:1) sid 72 + JL.pdf och prototyperna i stab/Ny mapp/.
//
//  Designprinciper:
//    • UMRA UMRA: stjärnan ÄR symbolen → stor stjärna fyller ikonen.
//    • CIM/PIR/KAMERA: liten stjärna i centrum (knutpunkt), delsymbolen
//      (pärllooper / V-strålar / lång stråle) är det visuellt dominanta.
//      Detta speglar prototyperna där pärllooparna är 3.6× stjärnan.
//    • Larmmina: stor fylld cirkel + utlösningsriktning.
//    • Enkelpost/Dubbelpost: stor ring + stam(mar) som pekar i riktning.
//
//  Rotationsmodell: en inre <g transform="rotate({ROT},12,12)"> innesluter
//  bara den roterande delen — stjärnan/ringen/cirkeln står still.
//  makeIcon ersätter {ROT} med obj.rotation vid render.
//
//  Kategorier:
//    'point'   — engångsklick placerar en punktsymbol (ev. directional)
//    'polygon' — sluten polygon (klicka noder, dubbelklick stänger)
// ─────────────────────────────────────────────────────────────────────────────

const SK_INK  = '#000000';
const SK_HALO = '#ffffff';
const SK_DASH = '6 4';   // streckad riktningslinje (PDF s. 72)

// UMRA-stjärnan i två varianter — anpassad efter visuell roll:
//  • STJÄRNA STOR (yttre r=10): UMRA UMRA där stjärnan ÄR symbolen.
//  • STJÄRNA LITEN (yttre r=3): CIM/PIR/KAMERA där delsymbolen dominerar.
const STAR_BIG_PATH =
    '<path d="M 12,2 Q 15.1,9.2 22,12 Q 15.1,14.8 12,22 ' +
    'Q 8.9,14.8 2,12 Q 8.9,9.2 12,2 Z" fill="' + SK_INK + '"/>';
const STAR_SMALL_PATH =
    '<path d="M 12,9 Q 12.94,11.16 15,12 Q 12.94,12.84 12,15 ' +
    'Q 11.06,12.84 9,12 Q 11.06,11.16 12,9 Z" fill="' + SK_INK + '"/>';

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

// CIM "flugvingar" — två lodrätta dashade ellipser ovan/under stjärnan,
// nästan från viewBox-toppen till -botten. Speglar prototypens pärllooper
// (rx=3, ry=5 = ratio 1:1.7, kompromiss för kvadratisk viewBox).
const CIM_ROT =
    '<ellipse cx="12" cy="6" rx="3" ry="5" fill="none" ' +
        'stroke="' + SK_INK + '" stroke-width="1.2" ' +
        'stroke-dasharray="1.4 0.8"/>' +
    '<ellipse cx="12" cy="18" rx="3" ry="5" fill="none" ' +
        'stroke="' + SK_INK + '" stroke-width="1.2" ' +
        'stroke-dasharray="1.4 0.8"/>';

// Vit "clearing disk" som döljer pärlloop-skärningen runt stjärnan i CIM.
const CIM_CLEARING = '<circle cx="12" cy="12" r="3" fill="' + SK_HALO + '"/>';

// PIR — lång streckad stråle +17.5° från norr. Startar vid LILLA stjärnans
// yttre kant (avstånd 3 från centrum) och sträcker sig ända till nära
// viewBox-toppen (avstånd 11). Längd ≈ 8 = 4 fulla dashes — inte längre
// någon "blindtarm". Den extra LÅNGA externa riktningslinjen ritas separat
// på kartan för PIR via externalLine-flaggan.
const PIR_ROT =
    '<line x1="12.9" y1="9.14" x2="15.31" y2="1.51" ' +
        'stroke="' + SK_INK + '" stroke-width="1.5" ' +
        'stroke-dasharray="1.8 1.2" stroke-linecap="round"/>';

// KAMERA — V-strålar, ±17.5° från norr, samma längd som PIR (8 ≈ 2 dashes
// längre per spröt än tidigare designversion).
const KAMERA_ROT =
    PIR_ROT +
    '<line x1="11.1" y1="9.14" x2="8.69" y2="1.51" ' +
        'stroke="' + SK_INK + '" stroke-width="1.5" ' +
        'stroke-dasharray="1.8 1.2" stroke-linecap="round"/>';

// ── Symboldefinitioner ───────────────────────────────────────────────────────

const SYMBOLS = {

    // Markbundna sensorer
    cim: {
        label: 'CIM',
        category: 'point',
        prefix: 'C',
        directional: true,
        // Render-ordning: pärllooper (roterande) → clearing-disk (vit) →
        // stjärna (svart, ovanpå clearing). Looparna döljs där de korsar
        // stjärncentrum, som i prototypen.
        svg: rotSvg(CIM_ROT, CIM_CLEARING + STAR_SMALL_PATH)
    },
    pir: {
        label: 'PIR',
        category: 'point',
        prefix: 'P',
        directional: true,
        externalLine: true,  // Endast PIR ritar lång riktningslinje på kartan
        svg: rotSvg(PIR_ROT, STAR_SMALL_PATH)
    },
    kamera: {
        label: 'KAMERA',
        category: 'point',
        prefix: 'K',
        directional: true,
        svg: rotSvg(KAMERA_ROT, STAR_SMALL_PATH)
    },
    umra: {
        // UMRA = bara stjärnan, ingen stråle. Inte directional — stjärnan
        // har fyra uddar och anger inte en specifik riktning. Stor stjärna
        // (r=10) fyller ikonen som RPAS gör.
        label: 'UMRA',
        category: 'point',
        prefix: 'U',
        directional: false,
        svg: rotSvg('', STAR_BIG_PATH)
    },

    // Larmmina — stor fylld svart cirkel + linje. Linjen anger
    // utlösnings-/snubbeltrådsriktning (directional).
    larmmina: {
        label: 'Larmmina',
        category: 'point',
        prefix: 'L',
        directional: true,
        svg: rotSvg(
            '<line x1="12" y1="3" x2="12" y2="0.5" ' +
                'stroke="' + SK_INK + '" stroke-width="2" ' +
                'stroke-linecap="square"/>',
            '<circle cx="12" cy="12" r="9" fill="' + SK_INK + '"/>'
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
            '<polygon points="3.2,0.05 13.1,2.6 21.6,0 21.6,4.5 12,10.2 3.2,4.5" ' +
                'fill="' + SK_INK + '"/>' +
            '<polygon points="0,5.1 0,23.7 12.2,15.9 24,23.7 24,5.4 12.5,13.4" ' +
                'fill="' + SK_INK + '"/>' +
        '</svg>'
    },

    // Poster — stor ring + stam(mar) som pekar i bevakningsriktningen.
    // Ring r=9 stroke=2 fyller viewBoxen (yttre kant på radie 10), och
    // lämnar 2 enheter remsa i toppen för stammen.
    enkelpost: {
        label: 'Enkelpost',
        category: 'point',
        prefix: null,
        directional: true,
        svg: rotSvg(
            '<line x1="12" y1="2" x2="12" y2="0.5" ' +
                'stroke="' + SK_INK + '" stroke-width="2" ' +
                'stroke-linecap="square"/>',
            '<circle cx="12" cy="12" r="9" fill="none" ' +
                'stroke="' + SK_INK + '" stroke-width="2"/>'
        )
    },
    dubbelpost: {
        label: 'Dubbelpost / patrull',
        category: 'point',
        prefix: null,
        directional: true,
        svg: rotSvg(
            '<line x1="10" y1="2" x2="10" y2="0.5" ' +
                'stroke="' + SK_INK + '" stroke-width="2" ' +
                'stroke-linecap="square"/>' +
            '<line x1="14" y1="2" x2="14" y2="0.5" ' +
                'stroke="' + SK_INK + '" stroke-width="2" ' +
                'stroke-linecap="square"/>',
            '<circle cx="12" cy="12" r="9" fill="none" ' +
                'stroke="' + SK_INK + '" stroke-width="2"/>'
        )
    },
    // In/Utfartspost — cirkel + pil. Pilen roterar, cirkeln står still.
    infart: {
        label: 'In/Utfartspost',
        category: 'point',
        prefix: null,
        directional: true,
        svg: rotSvg(
            '<line x1="2" y1="12" x2="19" y2="12" ' +
                'stroke="' + SK_INK + '" stroke-width="2.2" ' +
                'stroke-linecap="round"/>' +
            '<polygon points="22,12 16,8 16,16" fill="' + SK_INK + '"/>',
            '<circle cx="12" cy="12" r="10" fill="none" ' +
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
