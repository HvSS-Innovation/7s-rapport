// ─────────────────────────────────────────────────────────────────────────────
//  SENSORSKISS — symbolbibliotek
//
//  Markbundna sensorer (CIM/PIR/KAMERA/UMRA) följer de roterbara
//  HTML-prototyperna i stab/Ny mapp/ (reglementsspråket): en 4-uddig
//  konkav stjärna som bas — UMRA är bara stjärnan, PIR har EN streckad
//  arm 17,5° från vertikalen, KAMERA ett V-par ±17,5°, CIM två pärlslingor
//  (här förenklade till streckade ellipser) ovan/under stjärnan.
//
//  CCTV/DSLR/HUND saknar prototyp — egna former i samma språk (beslut
//  2026-07-29): CCTV = stjärna + brett V ±30° (matchar 60°-sektorn),
//  DSLR = stjärna + smalt V ±7,5° (15°-sektorn), HUND = tassavtryck
//  (riktning = dit hunden är vänd).
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

// 4-uddig konkav stjärna (sensorsymbolens bas, från prototyperna i
// stab/Ny mapp/ — proportioner: kontrollpunkt ≈ 31 % ut / 28 % upp av
// halvhöjden). half = halva höjden i viewBox-enheter, centrum (12,12).
function sensorStar(half) {
    const cx = 12, cy = 12;
    const qx = +(half * 0.31).toFixed(2);
    const qy = +(half * 0.28).toFixed(2);
    return 'M' + cx + ',' + (cy - half) +
        ' Q' + (cx + qx) + ',' + (cy - qy) + ' ' + (cx + half) + ',' + cy +
        ' Q' + (cx + qx) + ',' + (cy + qy) + ' ' + cx + ',' + (cy + half) +
        ' Q' + (cx - qx) + ',' + (cy + qy) + ' ' + (cx - half) + ',' + cy +
        ' Q' + (cx - qx) + ',' + (cy - qy) + ' ' + cx + ',' + (cy - half) + ' Z';
}
function starPath(half) {
    return '<path d="' + sensorStar(half) + '" fill="' + SK_INK + '"/>';
}

// Streckad riktningsarm från stjärnspetsen utåt, vinkel i grader från
// vertikalen (prototypen: arm från r≈stjärnhalva till ~3,5× ut; här klipps
// den vid viewBox-kanten så paletten inte beskär den).
function sensorArm(angleDeg, r0, r1) {
    const a = angleDeg * Math.PI / 180;
    const x = r => (12 + r * Math.sin(a)).toFixed(1);
    const y = r => (12 - r * Math.cos(a)).toFixed(1);
    return '<line x1="' + x(r0) + '" y1="' + y(r0) + '" x2="' + x(r1) + '" y2="' + y(r1) + '" ' +
        'stroke="' + SK_INK + '" stroke-width="1.6" ' +
        'stroke-dasharray="2.2 1.8" stroke-linecap="round"/>';
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

    // Markbundna sensorer — vektorformer enligt prototyperna i stab/Ny mapp/.
    // Inget prefix → ingen auto-numrering, inget "C1"/"P1" i etiketten.

    // CIM — stjärna + två pärlslingor (prototypens 20-pärlors ellipsringar
    // förenklade till streckade ellipser; läsbart i 24 px). Slingorna
    // roterar runt stjärnan (prototypens reglage), stjärnan står still.
    cim: {
        label: 'CIM',
        category: 'point',
        prefix: null,
        directional: true,
        svg: rotSvg(
            '<ellipse cx="12" cy="6.9" rx="2.6" ry="5.0" fill="none" ' +
                'stroke="' + SK_INK + '" stroke-width="1.3" stroke-dasharray="1.6 1.4"/>' +
            '<ellipse cx="12" cy="17.1" rx="2.6" ry="5.0" fill="none" ' +
                'stroke="' + SK_INK + '" stroke-width="1.3" stroke-dasharray="1.6 1.4"/>',
            starPath(5.5)
        )
    },
    // PIR — stjärna + EN streckad arm 17,5° från vertikalen (prototypen).
    pir: {
        label: 'PIR',
        category: 'point',
        prefix: null,
        directional: true,
        svg: rotSvg(sensorArm(17.5, 6.4, 11.3), starPath(6))
    },
    // KAMERA — stjärna + V-par ±17,5° (35° öppning, prototypen).
    kamera: {
        label: 'KAMERA',
        category: 'point',
        prefix: null,
        directional: true,
        svg: rotSvg(
            sensorArm(17.5, 6.4, 11.3) + sensorArm(-17.5, 6.4, 11.3),
            starPath(6)
        )
    },
    // UMRA — bara stjärnan (prototypen). Ingen riktning.
    umra: {
        label: 'UMRA',
        category: 'point',
        prefix: null,
        directional: false,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            starPath(9) +
        '</svg>'
    },

    // CCTV — vridbar kamera med sektorfält (~60° default, räckvidd ~50 m).
    // Sektorn ritas som halvgenomskinlig polygon från symbolens center i
    // obj.rotation grader. Anvandaren kan andra angle/range i edit-popupen.
    // Ikon: stjärna + brett V ±30° — samma formspråk som KAMERA men med
    // öppning som speglar 60°-sektorn (egen form, prototyp saknas).
    cctv: {
        label: 'CCTV',
        category: 'point',
        prefix: null,
        directional: true,
        sector: { angle: 60, range: 50 },
        svg: rotSvg(
            sensorArm(30, 6.4, 11.2) + sensorArm(-30, 6.4, 11.2),
            starPath(6)
        )
    },

    // Digital systemkamera med stark zoom — smalare sektor (~15°) men
    // langre rackvidd (~300 m). Samma rendering som CCTV men andra defaults.
    // Ikon: stjärna + smalt V ±7,5° (egen form, prototyp saknas).
    dslr: {
        label: 'DSLR',
        category: 'point',
        prefix: null,
        directional: true,
        sector: { angle: 15, range: 300 },
        svg: rotSvg(
            sensorArm(7.5, 6.4, 11.4) + sensorArm(-7.5, 6.4, 11.4),
            starPath(6)
        )
    },

    // Hund — markbunden sensor. Toggle "Fast / Patrullerande" i edit-popup
    // styr obj.patrull (default false). Vid patrullerande ritas en
    // separat patrullstig (linje-verktyget) for rutten. Directional = vart
    // hunden tittar/gar. Ikon: tassavtryck som pekar i riktningen (egen
    // form, prototyp saknas) — hela tassen roterar.
    hund: {
        label: 'Hund',
        category: 'point',
        prefix: 'H',
        directional: true,
        toggle: { field: 'patrull', on: 'Patrullerande', off: 'Fast' },
        svg: rotSvg(
            '<ellipse cx="12" cy="14.6" rx="3.5" ry="2.9" fill="' + SK_INK + '"/>' +
            '<circle cx="8.4" cy="10.6" r="1.35" fill="' + SK_INK + '"/>' +
            '<circle cx="10.9" cy="9.0" r="1.35" fill="' + SK_INK + '"/>' +
            '<circle cx="13.1" cy="9.0" r="1.35" fill="' + SK_INK + '"/>' +
            '<circle cx="15.6" cy="10.6" r="1.35" fill="' + SK_INK + '"/>',
            ''
        )
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
        defaultStyle: 'streckad',
        defaultArrows: true
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
