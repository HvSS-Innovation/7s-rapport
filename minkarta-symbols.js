// ─────────────────────────────────────────────────────────────────────────────
//  MINKARTA — symbolbibliotek
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
//    'meta'    — styr-symbol, räknas inte som skarp mina (yttergräns)
// ─────────────────────────────────────────────────────────────────────────────

const MK_STROKE = '#e8f0e8';
const MK_FILL   = 'rgba(26,50,26,0.85)';
const MK_ACCENT = '#4caf50';
const MK_DANGER = '#e65100';
const MK_META   = '#8aaa8a';

// Hjälp: skapa komplett SVG-sträng
function svg(inner, extra) {
    const attrs = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' + (extra || '');
    return '<svg ' + attrs + '>' + inner + '</svg>';
}

const SYMBOLS = {

    // ── Stridsvagnsminor ─────────────────────────────────────────────────────
    strv_tryck: {
        label: 'Strv-mina, tryckutlöst',
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="12" r="8" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6"/>' +
            '<circle cx="12" cy="12" r="2.2" fill="' + MK_STROKE + '"/>'
        )
    },
    strv_full: {
        label: 'Strv-mina, fullbreddsverkande',
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="10" r="6.5" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6"/>' +
            '<circle cx="12" cy="10" r="1.8" fill="' + MK_STROKE + '"/>' +
            '<line x1="3" y1="19" x2="21" y2="19" stroke="' + MK_STROKE + '" stroke-width="1.8"/>'
        )
    },
    strv_rojskydd: {
        label: 'Strv-mina med röjskydd',
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="13" r="6.5" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6"/>' +
            '<circle cx="12" cy="13" r="1.8" fill="' + MK_STROKE + '"/>' +
            '<text x="12" y="6" text-anchor="middle" fill="' + MK_STROKE + '" font-family="Inter,sans-serif" font-size="7" font-weight="700">R</text>'
        )
    },

    // ── Truppminor ───────────────────────────────────────────────────────────
    tramp: {
        label: 'Trampmina',
        category: 'point',
        svg: svg(
            '<path d="M12 4 L20 20 L4 20 Z" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6" stroke-linejoin="round"/>' +
            '<circle cx="12" cy="15" r="1.4" fill="' + MK_STROKE + '"/>'
        )
    },
    trad: {
        label: 'Trådmina',
        category: 'point',
        svg: svg(
            '<path d="M12 4 L20 20 L4 20 Z" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6" stroke-linejoin="round"/>' +
            '<line x1="4" y1="20" x2="20" y2="20" stroke="' + MK_STROKE + '" stroke-width="1" stroke-dasharray="2 2"/>' +
            '<line x1="2" y1="22" x2="22" y2="22" stroke="' + MK_STROKE + '" stroke-width="0.8" stroke-dasharray="1 2"/>'
        )
    },
    larm: {
        label: 'Larmmina',
        category: 'point',
        svg: svg(
            '<path d="M12 4 L20 20 L4 20 Z" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6" stroke-linejoin="round"/>' +
            '<text x="12" y="17" text-anchor="middle" fill="' + MK_STROKE + '" font-family="Inter,sans-serif" font-size="7" font-weight="700">L</text>'
        )
    },

    // ── Fordonsminor ─────────────────────────────────────────────────────────
    fordonsmina: {
        label: 'Fordonsmina',
        category: 'point',
        svg: svg(
            '<rect x="4" y="7" width="16" height="10" rx="1.2" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6"/>' +
            '<circle cx="12" cy="12" r="1.6" fill="' + MK_STROKE + '"/>'
        )
    },
    fordon_sid: {
        label: 'Sidverkande fordonsmina',
        category: 'point',
        svg: svg(
            '<rect x="4" y="7" width="16" height="10" rx="1.2" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6"/>' +
            '<path d="M20 12 L23 10 L23 14 Z" fill="' + MK_STROKE + '"/>' +
            '<line x1="14" y1="12" x2="20" y2="12" stroke="' + MK_STROKE + '" stroke-width="1.4"/>'
        )
    },

    // ── Laddning / avstånd ───────────────────────────────────────────────────
    forsvar: {
        label: 'Försvarsladdning',
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="13" r="6.5" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6"/>' +
            '<text x="12" y="16" text-anchor="middle" fill="' + MK_STROKE + '" font-family="Inter,sans-serif" font-size="8" font-weight="700">F</text>' +
            '<text x="20" y="8" text-anchor="middle" fill="' + MK_STROKE + '" font-family="Inter,sans-serif" font-size="6" font-weight="700">n</text>'
        )
    },
    avstand: {
        label: 'Avståndslagd (R-symbol)',
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="12" r="8" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6"/>' +
            '<line x1="12" y1="4" x2="12" y2="20" stroke="' + MK_STROKE + '" stroke-width="1.2"/>' +
            '<line x1="4" y1="12" x2="20" y2="12" stroke="' + MK_STROKE + '" stroke-width="1.2"/>' +
            '<line x1="6.3" y1="6.3" x2="17.7" y2="17.7" stroke="' + MK_STROKE + '" stroke-width="1.2"/>' +
            '<line x1="17.7" y1="6.3" x2="6.3" y2="17.7" stroke="' + MK_STROKE + '" stroke-width="1.2"/>'
        )
    },

    // ── Förstöring ───────────────────────────────────────────────────────────
    forst_forb: {
        label: 'Förstöring, förberedd',
        category: 'point',
        svg: svg(
            '<rect x="5" y="6" width="14" height="12" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6"/>' +
            '<line x1="5" y1="6" x2="19" y2="18" stroke="' + MK_STROKE + '" stroke-width="1.6"/>' +
            '<line x1="19" y1="6" x2="5" y2="18" stroke="' + MK_STROKE + '" stroke-width="1.6"/>'
        )
    },
    forst_utf: {
        label: 'Förstöring, utförd',
        category: 'point',
        svg: svg(
            '<rect x="5" y="6" width="14" height="12" fill="' + MK_DANGER + '" stroke="' + MK_STROKE + '" stroke-width="1.6"/>' +
            '<line x1="5" y1="6" x2="19" y2="18" stroke="' + MK_STROKE + '" stroke-width="1.6"/>' +
            '<line x1="19" y1="6" x2="5" y2="18" stroke="' + MK_STROKE + '" stroke-width="1.6"/>'
        )
    },
    forst_plan: {
        label: 'Förstöring, planlagd',
        category: 'point',
        svg: svg(
            '<rect x="5" y="6" width="14" height="12" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6" stroke-dasharray="3 2"/>' +
            '<text x="12" y="15.5" text-anchor="middle" fill="' + MK_STROKE + '" font-family="Inter,sans-serif" font-size="7" font-weight="700">PL</text>'
        )
    },

    // ── Yttergränsmarkör (beskärning för export) ─────────────────────────────
    ytter: {
        label: 'Yttergränsmarkör (styr export)',
        category: 'meta',
        svg: svg(
            '<rect x="3" y="3" width="18" height="18" fill="none" stroke="' + MK_META + '" stroke-width="1.6" stroke-dasharray="4 2"/>' +
            '<line x1="3" y1="3" x2="9" y2="3" stroke="' + MK_META + '" stroke-width="2.2"/>' +
            '<line x1="3" y1="3" x2="3" y2="9" stroke="' + MK_META + '" stroke-width="2.2"/>' +
            '<line x1="21" y1="21" x2="15" y2="21" stroke="' + MK_META + '" stroke-width="2.2"/>' +
            '<line x1="21" y1="21" x2="21" y2="15" stroke="' + MK_META + '" stroke-width="2.2"/>'
        )
    },

    // ── Linjesymboler ────────────────────────────────────────────────────────
    minlinje: {
        label: 'Minlinje',
        category: 'line',
        svg: svg(
            '<line x1="3" y1="18" x2="21" y2="6" stroke="' + MK_STROKE + '" stroke-width="1.6"/>' +
            '<circle cx="7" cy="15.3" r="1.3" fill="' + MK_STROKE + '"/>' +
            '<circle cx="12" cy="12" r="1.3" fill="' + MK_STROKE + '"/>' +
            '<circle cx="17" cy="8.7" r="1.3" fill="' + MK_STROKE + '"/>'
        ),
        stroke: MK_STROKE, weight: 3, dashArray: null
    },
    avsparrning: {
        label: 'Avspärrning / minvarning',
        category: 'line',
        svg: svg(
            '<polyline points="3,18 7,12 11,18 15,12 19,18" fill="none" stroke="' + MK_DANGER + '" stroke-width="1.6"/>' +
            '<line x1="3" y1="20" x2="21" y2="20" stroke="' + MK_DANGER + '" stroke-width="1.2"/>'
        ),
        stroke: MK_DANGER, weight: 3, dashArray: '6 3'
    },

    // ── Polygoner ────────────────────────────────────────────────────────────
    minruta: {
        label: 'Minruta',
        category: 'polygon',
        svg: svg(
            '<rect x="4" y="6" width="16" height="12" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6"/>' +
            '<circle cx="8" cy="10" r="1" fill="' + MK_STROKE + '"/>' +
            '<circle cx="16" cy="10" r="1" fill="' + MK_STROKE + '"/>' +
            '<circle cx="8" cy="14" r="1" fill="' + MK_STROKE + '"/>' +
            '<circle cx="16" cy="14" r="1" fill="' + MK_STROKE + '"/>'
        ),
        stroke: MK_STROKE, fill: '#1a321a', fillOpacity: 0.35
    },
    minomrade: {
        label: 'Minerat område',
        category: 'polygon',
        svg: svg(
            '<path d="M4 6 L20 4 L21 18 L7 20 Z" fill="' + MK_FILL + '" stroke="' + MK_STROKE + '" stroke-width="1.6" stroke-linejoin="round"/>' +
            '<text x="12" y="14" text-anchor="middle" fill="' + MK_STROKE + '" font-family="Inter,sans-serif" font-size="6" font-weight="700">HIND</text>'
        ),
        stroke: MK_STROKE, fill: '#1a321a', fillOpacity: 0.3,
        ambitionChoices: ['HIND', 'FÖRDR', 'STÖR', 'AVST']
    },
    skenminering: {
        label: 'Skenminering',
        category: 'polygon',
        svg: svg(
            '<path d="M4 6 L20 4 L21 18 L7 20 Z" fill="none" stroke="' + MK_META + '" stroke-width="1.6" stroke-dasharray="3 2" stroke-linejoin="round"/>' +
            '<text x="12" y="14" text-anchor="middle" fill="' + MK_META + '" font-family="Inter,sans-serif" font-size="6" font-weight="700">SKEN</text>'
        ),
        stroke: MK_META, fill: '#1a321a', fillOpacity: 0.15, dashArray: '6 4'
    }

};

// Paletten-grupper (för UI-layout)
const SYMBOL_GROUPS = [
    { title: 'Strv-minor',     ids: ['strv_tryck', 'strv_full', 'strv_rojskydd'] },
    { title: 'Truppminor',     ids: ['tramp', 'trad', 'larm'] },
    { title: 'Fordon & verkan', ids: ['fordonsmina', 'fordon_sid', 'forsvar', 'avstand'] },
    { title: 'Förstöring',     ids: ['forst_forb', 'forst_utf', 'forst_plan'] },
    { title: 'Linjer',         ids: ['minlinje', 'avsparrning'] },
    { title: 'Områden',        ids: ['minruta', 'minomrade', 'skenminering'] },
    { title: 'Export',         ids: ['ytter'] }
];

// Skapa en Leaflet-divIcon från ett SYMBOLS-entry
function makeIcon(id) {
    const sym = SYMBOLS[id];
    if (!sym) return null;
    return L.divIcon({
        className: 'mk-icon mk-icon-' + id,
        html: sym.svg,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
}

window.MK_SYMBOLS = SYMBOLS;
window.MK_SYMBOL_GROUPS = SYMBOL_GROUPS;
window.mkMakeIcon = makeIcon;
