// ─────────────────────────────────────────────────────────────────────────────
//  SENSORSKISS — symbolbibliotek
//
//  TILLFÄLLIG STATUS: markbundna sensorer (CIM/PIR/KAMERA/UMRA) är just nu
//  text-placeholders. Slutgiltiga vektorformer ritas i externt program och
//  byts in senare via textIcon → riktig svg.
//
//  Övriga symboler (Larmmina, RPAS, Enkelpost, Dubbelpost, In/Utfartspost,
//  Sensorområde) är reglementsenliga (PDF s. 72 + JL.pdf).
//
//  Rotationsmodell för directional symboler: inre <g transform="rotate({ROT},
//  12,12)"> innesluter bara den roterande delen — central form står still.
//  makeIcon ersätter {ROT} med obj.rotation vid render.
//
//  Kategorier:
//    'point'    — engångsklick placerar en punktsymbol (ev. directional)
//    'polygon'  — sluten polygon (klicka noder, dubbelklick stänger)
//    'polyline' — öppen linje (klicka noder, dubbelklick avslutar)
//
//  Extra-flaggor:
//    sym.externalLine — lång streckad riktningslinje (PIR)
//    sym.sector       — { angle, range } vridbar sektor (CCTV/DSLR-kameror)
//    sym.toggle       — { field, on, off } toggle-fält i edit-popup (Hund)
// ─────────────────────────────────────────────────────────────────────────────

const SK_INK  = '#000000';
const SK_HALO = '#ffffff';
const SK_DASH = '6 4';   // streckad riktningslinje (PDF s. 72)

// PLACEHOLDER för markbundna sensorer (CIM/PIR/KAMERA/UMRA): bara texten
// renderas i ikonen tills slutgiltiga vektorformer är klara. Anpassar
// fontstorlek efter teckenantal så även "KAMERA" (6 tecken) ryms.
function textIcon(label) {
    const fs = label.length <= 4 ? 8 : 5.6;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
        '<text x="12" y="15" text-anchor="middle" ' +
            'font-family="Inter,Arial,sans-serif" font-size="' + fs + '" ' +
            'font-weight="800" fill="' + SK_INK + '">' + label + '</text>' +
    '</svg>';
}

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

// ── Symboldefinitioner ───────────────────────────────────────────────────────

const SYMBOLS = {

    // Markbundna sensorer — PLACEHOLDER med ren text. Ersätts senare med
    // vektorformer (slutar PR-cykeln med dem i externt program). Inget
    // prefix → ingen auto-numrering, inget "C1"/"P1" etiketten — bara typen.
    cim: {
        label: 'CIM',
        category: 'point',
        prefix: null,
        directional: false,
        svg: textIcon('CIM')
    },
    pir: {
        label: 'PIR',
        category: 'point',
        prefix: null,
        directional: false,
        svg: textIcon('PIR')
    },
    kamera: {
        label: 'KAMERA',
        category: 'point',
        prefix: null,
        directional: false,
        svg: textIcon('KAMERA')
    },
    umra: {
        label: 'UMRA',
        category: 'point',
        prefix: null,
        directional: false,
        svg: textIcon('UMRA')
    },

    // CCTV — vridbar kamera med sektorfält (~60° default, räckvidd ~50 m).
    // Sektorn ritas som halvgenomskinlig polygon från symbolens center i
    // obj.rotation grader. Anvandaren kan andra angle/range i edit-popupen.
    cctv: {
        label: 'CCTV',
        category: 'point',
        prefix: null,
        directional: true,
        sector: { angle: 60, range: 50 },
        svg: textIcon('CCTV')
    },

    // Digital systemkamera med stark zoom — smalare sektor (~15°) men
    // langre rackvidd (~300 m). Samma rendering som CCTV men andra defaults.
    dslr: {
        label: 'DSLR',
        category: 'point',
        prefix: null,
        directional: true,
        sector: { angle: 15, range: 300 },
        svg: textIcon('DSLR')
    },

    // Hund — markbunden sensor. Toggle "Fast / Patrullerande" i edit-popup
    // styr obj.patrull (default false). Vid patrullerande ritar Joel en
    // separat patrullstig (linje-verktyget) for rutten. Directional = vart
    // hunden tittar/gar.
    hund: {
        label: 'Hund',
        category: 'point',
        prefix: 'H',
        directional: true,
        toggle: { field: 'patrull', on: 'Patrullerande', off: 'Fast' },
        svg: textIcon('HUND')
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
    },

    // Linje — oppen polyline. Stilen (heldragen/streckad) + pilar-toggle
    // valjs i edit-popupen efter ritning. Min 2 noder, dubbelklick avslutar.
    linje: {
        label: 'Linje',
        category: 'polyline',
        draw: 'click',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            '<path d="M2 19 L9 11 L15 15 L22 5" fill="none" ' +
                'stroke="' + SK_INK + '" stroke-width="2" ' +
                'stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>',
        stroke: SK_INK,
        defaultStyle: 'heldragen'
    },

    // Frihandsritning — samma datatyp som linje (polyline) men pekare hales
    // istallet for att klickas. Punkter samplas med min avstand ~6 px sa
    // path inte blir overdrivet ten. Edit-popup identisk med linje.
    frihand: {
        label: 'Frihand',
        category: 'polyline',
        draw: 'freehand',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            '<path d="M2 19 Q5 9 9 13 T15 11 T22 5" fill="none" ' +
                'stroke="' + SK_INK + '" stroke-width="2" ' +
                'stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>',
        stroke: SK_INK,
        defaultStyle: 'heldragen'
    }
};

// Palett-grupper (UI-layout). Speglar PDF-strukturen.
const SYMBOL_GROUPS = [
    { title: 'Markbundna sensorer', ids: ['cim', 'pir', 'kamera', 'umra', 'cctv', 'dslr', 'hund'] },
    { title: 'Larmmina',            ids: ['larmmina'] },
    { title: 'Luftburna sensorer',  ids: ['rpas'] },
    { title: 'Poster',              ids: ['enkelpost', 'dubbelpost', 'infart'] },
    { title: 'Områden & linjer',    ids: ['sensoromrade', 'linje', 'frihand'] }
];

// Symboler där rotation/riktningslinje gäller (directional).
const DIRECTIONAL_TYPES = new Set(
    Object.keys(SYMBOLS).filter(k => SYMBOLS[k].directional === true)
);

// Posters (enkelpost, dubbelpost, infart) kan ha utrustning. Listan delas
// med edit-popup, protokoll-export och PNG-export.
const POST_UTRUSTNING = [
    { id: 'kikare',      label: 'Kikare',       short: 'K'   },
    { id: 'morkerkikare', label: 'Mörkerkikare', short: 'MN' },
    { id: 'varmekam',    label: 'Värmekamera',  short: 'VK'  }
];
const POST_TYPES = new Set(['enkelpost', 'dubbelpost', 'infart']);

// Linje-stilar. Visas i edit-popupen som dropdown. Pilar ar en separat
// toggle (obj.arrows) som kan kombineras med bada stilar.
const LINJE_STILAR = [
    { id: 'streckad',  label: 'Streckad' },
    { id: 'heldragen', label: 'Heldragen' }
];

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
window.SK_POST_UTRUSTNING = POST_UTRUSTNING;
window.SK_POST_TYPES = POST_TYPES;
window.SK_LINJE_STILAR = LINJE_STILAR;
