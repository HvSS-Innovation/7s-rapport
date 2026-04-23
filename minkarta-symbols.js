// ─────────────────────────────────────────────────────────────────────────────
//  MINKARTA — symbolbibliotek (v2: halo-kontrast)
//
//  Reglementsreferens: "Mineringar på karta — sammanställning"
//  (Fältarbeten s. 338–342, Handbok 11.7.1).
//
//  Alla symboler är inline-SVG med viewBox 0 0 24 24. Punktsymboler ritas
//  centrerade på given lat/lng. Linje- och polygon-symbolerna är bara
//  metadata-markörer här — ritningen av själva geometrin sker i minkarta.html
//  via Leaflet.Polyline/Polygon (med stilsignatur hämtad härifrån).
//
//  Kategorier:
//    'point'   — engångsklick placerar en punktsymbol
//    'line'    — polyline (klicka punkter, dubbelklick avslutar)
//    'polygon' — sluten polygon (klicka, dubbelklick stänger)
//    'meta'    — styr-symbol (yttergräns, referenspunkt)
// ─────────────────────────────────────────────────────────────────────────────
//
//  <!-- färgmatris: (v2 halo-princip) ----------------------------------------
//    Halo  #0a0a0a  — bred mörk outline via paint-order="stroke"
//    Gul   #ffc107  — neutral/info (strvminor, minlinje, fordon)
//    Röd   #e53935  — farligt/aktivt (utförd förstöring, sidverkan, avspärrning)
//    Cyan  #00e5ff  — styr/referens (yttergräns, UP/SP, planlagd förstöring)
//    Grå   #b0bec5  — inaktivt/sken (skenminering)
//    Vit   #ffffff  — text ovanpå halo
//
//    Kontrastvalidering: färgerna är valda så att huvudfärg + svart halo
//    läses tydligt mot vita kartblad, gröna skogspartier och blå vattendrag
//    i både OpenTopoMap och OSM Standard. Röd + svart halo hålls för farligt
//    material så att användaren kan skilja röd (DANGER) från gul (NEUTRAL)
//    även i perifer syn.
//  -------------------------------------------------------------------------->

const MK_HALO   = '#0a0a0a';           // svart outline (via paint-order)
const MK_YELLOW = '#ffc107';           // neutral / info
const MK_RED    = '#e53935';           // farligt / aktivt
const MK_CYAN   = '#00e5ff';           // styr / referens
const MK_GRAY   = '#b0bec5';           // inaktivt / sken
const MK_WHITE  = '#ffffff';           // text-mask ovanpå halo
const MK_INNER_DARK = '#1a1a1a';       // fyllning under starkfärg, läses som mörk kärna

// Bakåtkompatibla alias så minkarta.html / export inte behöver peta överallt
const MK_STROKE = MK_YELLOW;           // primär konturfärg (var #e8f0e8 i v1)
const MK_FILL   = 'rgba(10,10,10,0.85)'; // mörk halv-genomskinlig (var grön)
const MK_ACCENT = MK_YELLOW;
const MK_DANGER = MK_RED;
const MK_META   = MK_CYAN;

// Standard-svg-inställningar: paint-order="stroke" + bred mörk stroke = halo
// under fyllnaden. Detta gör att varje shape automatiskt får svart outline
// utan att vi behöver rita samma form dubbelt.
const HALO_ATTRS = 'paint-order="stroke" stroke-linejoin="round" stroke-linecap="round"';

// Hjälp: skapa komplett SVG-sträng
function svg(inner, extra) {
    const attrs = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' + (extra || '');
    return '<svg ' + attrs + '>' + inner + '</svg>';
}

// Hjälp: bred mörk stroke + smal färgstroke via paint-order.
// Används i shape-attribut: stroke="MK_HALO" stroke-width="3" paint-order="stroke"
// plus en separat smalare linje i starkfärg ovanpå där det behövs.
function haloStroke(width) {
    return 'stroke="' + MK_HALO + '" stroke-width="' + (width || 3) + '" paint-order="stroke"';
}

const SYMBOLS = {

    // ── Stridsvagnsminor ─────────────────────────────────────────────────────
    strv_tryck: {
        label: 'Strv-mina, tryckutlöst',
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="12" r="8" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + '/>' +
            '<circle cx="12" cy="12" r="7" fill="none" stroke="' + MK_YELLOW + '" stroke-width="1.6"/>' +
            '<circle cx="12" cy="12" r="2.4" fill="' + MK_YELLOW + '"/>'
        )
    },
    strv_full: {
        label: 'Strv-mina, fullbreddsverkande',
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="10" r="6.5" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + '/>' +
            '<circle cx="12" cy="10" r="5.6" fill="none" stroke="' + MK_YELLOW + '" stroke-width="1.4"/>' +
            '<circle cx="12" cy="10" r="2" fill="' + MK_YELLOW + '"/>' +
            '<line x1="3" y1="19" x2="21" y2="19" ' + haloStroke(3.5) + ' stroke="' + MK_HALO + '"/>' +
            '<line x1="3" y1="19" x2="21" y2="19" stroke="' + MK_YELLOW + '" stroke-width="1.8"/>'
        )
    },
    strv_rojskydd: {
        label: 'Strv-mina med röjskydd',
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="13" r="6.5" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + '/>' +
            '<circle cx="12" cy="13" r="5.6" fill="none" stroke="' + MK_YELLOW + '" stroke-width="1.4"/>' +
            '<circle cx="12" cy="13" r="1.9" fill="' + MK_YELLOW + '"/>' +
            '<text x="12" y="6.5" text-anchor="middle" font-family="Inter,sans-serif" font-size="7" font-weight="800" paint-order="stroke" stroke="' + MK_HALO + '" stroke-width="3" fill="' + MK_YELLOW + '">R</text>'
        )
    },

    // ── Truppminor ───────────────────────────────────────────────────────────
    tramp: {
        label: 'Trampmina',
        category: 'point',
        svg: svg(
            '<path d="M12 4 L20 20 L4 20 Z" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + '/>' +
            '<path d="M12 4 L20 20 L4 20 Z" fill="none" stroke="' + MK_YELLOW + '" stroke-width="1.4" stroke-linejoin="round"/>' +
            '<circle cx="12" cy="15" r="1.6" fill="' + MK_YELLOW + '"/>'
        )
    },
    trad: {
        label: 'Trådmina',
        category: 'point',
        svg: svg(
            '<path d="M12 4 L20 20 L4 20 Z" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + '/>' +
            '<path d="M12 4 L20 20 L4 20 Z" fill="none" stroke="' + MK_YELLOW + '" stroke-width="1.4" stroke-linejoin="round"/>' +
            '<line x1="2" y1="22" x2="22" y2="22" stroke="' + MK_HALO + '" stroke-width="2.4"/>' +
            '<line x1="2" y1="22" x2="22" y2="22" stroke="' + MK_YELLOW + '" stroke-width="1" stroke-dasharray="2 2"/>'
        )
    },
    larm: {
        label: 'Larmmina',
        category: 'point',
        svg: svg(
            '<path d="M12 4 L20 20 L4 20 Z" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + '/>' +
            '<path d="M12 4 L20 20 L4 20 Z" fill="none" stroke="' + MK_YELLOW + '" stroke-width="1.4" stroke-linejoin="round"/>' +
            '<text x="12" y="17.5" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="800" paint-order="stroke" stroke="' + MK_HALO + '" stroke-width="3" fill="' + MK_YELLOW + '">L</text>'
        )
    },

    // ── Fordonsminor ─────────────────────────────────────────────────────────
    fordonsmina: {
        label: 'Fordonsmina',
        category: 'point',
        svg: svg(
            '<rect x="4" y="7" width="16" height="10" rx="1.2" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + '/>' +
            '<rect x="4.7" y="7.7" width="14.6" height="8.6" rx="0.8" fill="none" stroke="' + MK_YELLOW + '" stroke-width="1.4"/>' +
            '<circle cx="12" cy="12" r="1.8" fill="' + MK_YELLOW + '"/>'
        )
    },
    fordon_sid: {
        label: 'Sidverkande fordonsmina',
        category: 'point',
        svg: svg(
            '<rect x="4" y="7" width="14" height="10" rx="1.2" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + '/>' +
            '<rect x="4.7" y="7.7" width="12.6" height="8.6" rx="0.8" fill="none" stroke="' + MK_RED + '" stroke-width="1.4"/>' +
            '<line x1="14" y1="12" x2="20" y2="12" stroke="' + MK_HALO + '" stroke-width="3.5"/>' +
            '<line x1="14" y1="12" x2="20" y2="12" stroke="' + MK_RED + '" stroke-width="1.6"/>' +
            '<path d="M22 12 L19 10 L19 14 Z" fill="' + MK_RED + '" stroke="' + MK_HALO + '" stroke-width="1.5" paint-order="stroke"/>'
        )
    },

    // ── Laddning / avstånd ───────────────────────────────────────────────────
    forsvar: {
        label: 'Försvarsladdning',
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="13" r="6.8" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + '/>' +
            '<circle cx="12" cy="13" r="5.9" fill="none" stroke="' + MK_YELLOW + '" stroke-width="1.4"/>' +
            '<text x="12" y="16" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" font-weight="800" paint-order="stroke" stroke="' + MK_HALO + '" stroke-width="3" fill="' + MK_YELLOW + '">F</text>'
        )
    },
    avstand: {
        label: 'Avståndslagd (R-symbol)',
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="12" r="8" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + '/>' +
            '<circle cx="12" cy="12" r="7" fill="none" stroke="' + MK_YELLOW + '" stroke-width="1.4"/>' +
            '<line x1="12" y1="5" x2="12" y2="19" stroke="' + MK_HALO + '" stroke-width="3.2"/>' +
            '<line x1="12" y1="5" x2="12" y2="19" stroke="' + MK_YELLOW + '" stroke-width="1.4"/>' +
            '<line x1="5" y1="12" x2="19" y2="12" stroke="' + MK_HALO + '" stroke-width="3.2"/>' +
            '<line x1="5" y1="12" x2="19" y2="12" stroke="' + MK_YELLOW + '" stroke-width="1.4"/>' +
            '<line x1="7" y1="7" x2="17" y2="17" stroke="' + MK_HALO + '" stroke-width="3"/>' +
            '<line x1="7" y1="7" x2="17" y2="17" stroke="' + MK_YELLOW + '" stroke-width="1.2"/>' +
            '<line x1="17" y1="7" x2="7" y2="17" stroke="' + MK_HALO + '" stroke-width="3"/>' +
            '<line x1="17" y1="7" x2="7" y2="17" stroke="' + MK_YELLOW + '" stroke-width="1.2"/>'
        )
    },

    // ── Förstöring ───────────────────────────────────────────────────────────
    forst_forb: {
        label: 'Förstöring, förberedd',
        category: 'point',
        svg: svg(
            '<rect x="5" y="6" width="14" height="12" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + '/>' +
            '<rect x="5.7" y="6.7" width="12.6" height="10.6" fill="none" stroke="' + MK_YELLOW + '" stroke-width="1.4"/>' +
            '<line x1="5" y1="6" x2="19" y2="18" stroke="' + MK_HALO + '" stroke-width="3.2"/>' +
            '<line x1="5" y1="6" x2="19" y2="18" stroke="' + MK_YELLOW + '" stroke-width="1.6"/>' +
            '<line x1="19" y1="6" x2="5" y2="18" stroke="' + MK_HALO + '" stroke-width="3.2"/>' +
            '<line x1="19" y1="6" x2="5" y2="18" stroke="' + MK_YELLOW + '" stroke-width="1.6"/>'
        )
    },
    forst_utf: {
        label: 'Förstöring, utförd',
        category: 'point',
        svg: svg(
            '<rect x="5" y="6" width="14" height="12" fill="' + MK_RED + '" ' + haloStroke(3) + '/>' +
            '<line x1="5" y1="6" x2="19" y2="18" stroke="' + MK_HALO + '" stroke-width="3.2"/>' +
            '<line x1="5" y1="6" x2="19" y2="18" stroke="' + MK_WHITE + '" stroke-width="1.6"/>' +
            '<line x1="19" y1="6" x2="5" y2="18" stroke="' + MK_HALO + '" stroke-width="3.2"/>' +
            '<line x1="19" y1="6" x2="5" y2="18" stroke="' + MK_WHITE + '" stroke-width="1.6"/>'
        )
    },
    forst_plan: {
        label: 'Förstöring, planlagd',
        category: 'point',
        svg: svg(
            '<rect x="5" y="6" width="14" height="12" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + ' stroke-dasharray="3 2"/>' +
            '<rect x="5.7" y="6.7" width="12.6" height="10.6" fill="none" stroke="' + MK_CYAN + '" stroke-width="1.2" stroke-dasharray="3 2"/>' +
            '<text x="12" y="15.5" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="800" paint-order="stroke" stroke="' + MK_HALO + '" stroke-width="3" fill="' + MK_CYAN + '">PL</text>'
        )
    },

    // ── Yttergränsmarkör (beskärning för export) ─────────────────────────────
    ytter: {
        label: 'Yttergränsmarkör (styr export)',
        category: 'meta',
        svg: svg(
            '<rect x="3" y="3" width="18" height="18" fill="none" stroke="' + MK_HALO + '" stroke-width="3.5" stroke-dasharray="4 2"/>' +
            '<rect x="3" y="3" width="18" height="18" fill="none" stroke="' + MK_CYAN + '" stroke-width="1.6" stroke-dasharray="4 2"/>' +
            '<line x1="3" y1="3" x2="9" y2="3" stroke="' + MK_HALO + '" stroke-width="4"/>' +
            '<line x1="3" y1="3" x2="9" y2="3" stroke="' + MK_CYAN + '" stroke-width="2.2"/>' +
            '<line x1="3" y1="3" x2="3" y2="9" stroke="' + MK_HALO + '" stroke-width="4"/>' +
            '<line x1="3" y1="3" x2="3" y2="9" stroke="' + MK_CYAN + '" stroke-width="2.2"/>' +
            '<line x1="21" y1="21" x2="15" y2="21" stroke="' + MK_HALO + '" stroke-width="4"/>' +
            '<line x1="21" y1="21" x2="15" y2="21" stroke="' + MK_CYAN + '" stroke-width="2.2"/>' +
            '<line x1="21" y1="21" x2="21" y2="15" stroke="' + MK_HALO + '" stroke-width="4"/>' +
            '<line x1="21" y1="21" x2="21" y2="15" stroke="' + MK_CYAN + '" stroke-width="2.2"/>'
        )
    },

    // ── Linjesymboler ────────────────────────────────────────────────────────
    minlinje: {
        label: 'Minlinje',
        category: 'line',
        svg: svg(
            '<line x1="3" y1="18" x2="21" y2="6" stroke="' + MK_HALO + '" stroke-width="3.4"/>' +
            '<line x1="3" y1="18" x2="21" y2="6" stroke="' + MK_YELLOW + '" stroke-width="1.6"/>' +
            '<circle cx="7" cy="15.3" r="1.5" fill="' + MK_YELLOW + '" stroke="' + MK_HALO + '" stroke-width="1" paint-order="stroke"/>' +
            '<circle cx="12" cy="12" r="1.5" fill="' + MK_YELLOW + '" stroke="' + MK_HALO + '" stroke-width="1" paint-order="stroke"/>' +
            '<circle cx="17" cy="8.7" r="1.5" fill="' + MK_YELLOW + '" stroke="' + MK_HALO + '" stroke-width="1" paint-order="stroke"/>'
        ),
        stroke: MK_YELLOW, weight: 4, dashArray: null
    },
    avsparrning: {
        label: 'Avspärrning / minvarning',
        // PDF s.339: sågtands-varningslinje ("wawa-tagg"). Vi ritar den som
        // polyline — Leaflet återger den som ren streckad linje, men i PNG-
        // exporten och i palett-previewn håller vi sågtandarna.
        category: 'line',
        svg: svg(
            '<polyline points="3,18 7,11 11,18 15,11 19,18" fill="none" stroke="' + MK_HALO + '" stroke-width="3.2" stroke-linejoin="round"/>' +
            '<polyline points="3,18 7,11 11,18 15,11 19,18" fill="none" stroke="' + MK_RED + '" stroke-width="1.6" stroke-linejoin="round"/>' +
            '<line x1="3" y1="21" x2="21" y2="21" stroke="' + MK_HALO + '" stroke-width="2.6"/>' +
            '<line x1="3" y1="21" x2="21" y2="21" stroke="' + MK_RED + '" stroke-width="1.2" stroke-dasharray="3 2"/>'
        ),
        stroke: MK_RED, weight: 4, dashArray: '6 3'
    },

    // ── Polygoner ────────────────────────────────────────────────────────────
    minruta: {
        label: 'Minruta',
        // PDF s.339: rektangel med hörnmarkeringar. Hörnmarkörerna ritas som
        // små ifyllda prickar i var och en av de fyra hörnposition­erna inom
        // polygonens palett-preview; själva rektangeln ritas av Leaflet.
        category: 'polygon',
        svg: svg(
            '<rect x="4" y="6" width="16" height="12" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + '/>' +
            '<rect x="4.8" y="6.8" width="14.4" height="10.4" fill="none" stroke="' + MK_YELLOW + '" stroke-width="1.3"/>' +
            '<circle cx="4" cy="6" r="1.6" fill="' + MK_YELLOW + '" stroke="' + MK_HALO + '" stroke-width="1" paint-order="stroke"/>' +
            '<circle cx="20" cy="6" r="1.6" fill="' + MK_YELLOW + '" stroke="' + MK_HALO + '" stroke-width="1" paint-order="stroke"/>' +
            '<circle cx="4" cy="18" r="1.6" fill="' + MK_YELLOW + '" stroke="' + MK_HALO + '" stroke-width="1" paint-order="stroke"/>' +
            '<circle cx="20" cy="18" r="1.6" fill="' + MK_YELLOW + '" stroke="' + MK_HALO + '" stroke-width="1" paint-order="stroke"/>'
        ),
        stroke: MK_YELLOW, fill: MK_YELLOW, fillOpacity: 0.18
    },
    minomrade: {
        label: 'Minerat område',
        category: 'polygon',
        svg: svg(
            '<path d="M4 6 L20 4 L21 18 L7 20 Z" fill="' + MK_INNER_DARK + '" ' + haloStroke(3) + ' stroke-linejoin="round"/>' +
            '<path d="M4 6 L20 4 L21 18 L7 20 Z" fill="none" stroke="' + MK_YELLOW + '" stroke-width="1.4" stroke-linejoin="round"/>' +
            '<text x="12" y="14" text-anchor="middle" font-family="Inter,sans-serif" font-size="7" font-weight="800" paint-order="stroke" stroke="' + MK_HALO + '" stroke-width="3" fill="' + MK_YELLOW + '">HIND</text>'
        ),
        stroke: MK_YELLOW, fill: MK_YELLOW, fillOpacity: 0.18,
        ambitionChoices: ['HIND', 'FÖRDR', 'STÖR', 'AVST']
    },
    skenminering: {
        label: 'Skenminering',
        category: 'polygon',
        svg: svg(
            '<path d="M4 6 L20 4 L21 18 L7 20 Z" fill="none" ' + haloStroke(3) + ' stroke-dasharray="3 2" stroke-linejoin="round"/>' +
            '<path d="M4 6 L20 4 L21 18 L7 20 Z" fill="none" stroke="' + MK_GRAY + '" stroke-width="1.4" stroke-dasharray="3 2" stroke-linejoin="round"/>' +
            '<text x="12" y="14" text-anchor="middle" font-family="Inter,sans-serif" font-size="7" font-weight="800" paint-order="stroke" stroke="' + MK_HALO + '" stroke-width="3" fill="' + MK_GRAY + '">SKEN</text>'
        ),
        stroke: MK_GRAY, fill: MK_GRAY, fillOpacity: 0.10, dashArray: '6 4'
    }

};

// Paletten-grupper (för UI-layout). Lämnar plats för fas 3 (avstand_tramp,
// avstand_strv) under "Avståndslagda" och fas 6 (up, sp) under
// "Referenspunkter".
const SYMBOL_GROUPS = [
    { title: 'Strv-minor',         ids: ['strv_tryck', 'strv_full', 'strv_rojskydd'] },
    { title: 'Truppminor',         ids: ['tramp', 'trad', 'larm'] },
    { title: 'Fordon & verkan',    ids: ['fordonsmina', 'fordon_sid', 'forsvar'] },
    { title: 'Förstöring',         ids: ['forst_forb', 'forst_utf', 'forst_plan'] },
    { title: 'Linjer',             ids: ['minlinje', 'avsparrning'] },
    { title: 'Områden',            ids: ['minruta', 'minomrade', 'skenminering'] },
    { title: 'Avståndslagda',      ids: ['avstand'] },   // fylls på i fas 3
    { title: 'Export & referens',  ids: ['ytter'] }      // fylls på i fas 6 med up/sp
];

// Skapa en Leaflet-divIcon från ett SYMBOLS-entry
function makeIcon(id) {
    const sym = SYMBOLS[id];
    if (!sym) return null;
    return L.divIcon({
        className: 'mk-icon mk-icon-' + id,
        html: sym.svg,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });
}

window.MK_SYMBOLS = SYMBOLS;
window.MK_SYMBOL_GROUPS = SYMBOL_GROUPS;
window.mkMakeIcon = makeIcon;
window.MK_COLORS = { MK_HALO, MK_YELLOW, MK_RED, MK_CYAN, MK_GRAY, MK_WHITE, MK_INNER_DARK };
