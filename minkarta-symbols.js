// ─────────────────────────────────────────────────────────────────────────────
//  MINKARTA — symbolbibliotek (v4: nya SVG-symboler från stab-paketet 2026-04-26)
//
//  Symboler ritade enligt svenska militära kart-tecken för minor.
//
//  v4-paketet har 20 nya symbol-SVG:er + 2 behållna från v3 (upk, ytter)
//  = totalt 22 symboler. Åtta v3-nycklar är borttagna (strv_full,
//  strv_rojskydd, trad, avstand, skenminering, landmina_okand,
//  riktad_verkan, sp) — ingen motsvarighet i nya SVG-paketet från
//  2026-04-26. SP slopades 2026-04-27: reglementsvarningen kräver nu
//  bara minst 2 UPK. Migration av gammalt state sker i
//  minkarta.html loadPersisted().
//
//  Kategorier:
//    'point'   — engångsklick placerar en punktsymbol
//    'line'    — polyline (klicka punkter, dubbelklick avslutar)
//    'polygon' — sluten polygon (klicka, dubbelklick stänger)
//    'meta'    — styr-symbol (yttergräns, referenspunkt)
// ─────────────────────────────────────────────────────────────────────────────
//
//  <!-- färgmatris: v4 svart linjearbete, CSS-aura för halo --------------------
//    De 20 nya SVG:erna är rent svart-på-vitt (eller svart-på-transparent) och
//    har inga halo-strokes i sig själva. Vi får den nödvändiga kontrasten mot
//    kart-underlaget via CSS-filtret `.mk-icon svg` i minkarta.html (tre
//    staplade vita drop-shadows + en mjuk mörk kant). Det motsvarar v3:s
//    paint-order-halo i effekt. PNG-exporten ritar SVG-bilden direkt — ingen
//    halo där för punktsymboler, men linje- och polygon-strokes får vit halo
//    under svart linjearbete (v3-tekniken, oförändrad).
//
//    Vit  #ffffff   — CSS drop-shadow-aura + fyllning i SVG
//    Svart #000000  — allt linjearbete, fyllda piktogram, texter
//    Röd  #c62828   — UNDANTAG (ej använd i v4-SVG:erna; behålls som konstant
//                     för framtida behov, t.ex. incident-flagga)
//
//    Paint-order-halo inom SVG finns kvar för upk/ytter (v3-stilen).
//  -------------------------------------------------------------------------->

const MK_INK   = '#000000';
const MK_HALO  = '#ffffff';
const MK_WHITE = '#ffffff';
const MK_GRAY  = '#666666';
const MK_RED   = '#c62828';  // ej använd i v4-SVG:er — behålls för framtida bruk

// Bakåtkompatibla alias — minkarta.html och export refererar MK_STROKE/
// MK_FILL/... för Leaflet.Polyline/Polygon-stilen.
const MK_STROKE = MK_INK;
const MK_FILL   = 'rgba(0,0,0,0.08)';
const MK_ACCENT = MK_INK;
const MK_DANGER = MK_RED;
const MK_META   = MK_INK;

// Vit halo-stroke i given bredd (används av upk/sp/ytter som behåller v3-stilen).
function haloStroke(width) {
    return 'stroke="' + MK_HALO + '" stroke-width="' + (width || 3) + '" paint-order="stroke"';
}
function svg(inner, extra) {
    const attrs = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' + (extra || '');
    return '<svg ' + attrs + '>' + inner + '</svg>';
}

// Gemensam linje-SVG för båda linjesymbolerna i paletten. Rak svart linje
// med klassisk pilspets — Leaflet-renderingen på kartan får skilja sig
// (dashArray etc.) men palettknappen är identisk.
const MK_LINE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 200">' +
        '<line x1="60" y1="100" x2="980" y2="100" stroke="black" stroke-width="22" stroke-linecap="round"/>' +
        '<polygon points="980,55 1080,100 980,145" fill="black"/>' +
    '</svg>';

// Bygger minomrade-SVG:n med valfri text i M-positionerna. När ingen
// antal-siffra är satt visas reglementets "M" — annars siffran.
function minomradeSvg(antal) {
    const n = (antal != null && antal !== '' && Number(antal) > 0) ? String(antal) : 'M';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 580">' +
        '<ellipse cx="460" cy="290" rx="370" ry="215" fill="white" stroke="black" stroke-width="14"/>' +
        '<rect x="405" y="68" width="115" height="22" fill="white"/>' +
        '<rect x="405" y="490" width="115" height="22" fill="white"/>' +
        '<rect x="78" y="248" width="22" height="84" fill="white"/>' +
        '<rect x="820" y="248" width="22" height="84" fill="white"/>' +
        '<text x="460" y="115" font-family="Arial Black, Arial, sans-serif" font-size="115" font-weight="900" fill="black" text-anchor="middle">' + n + '</text>' +
        '<text x="460" y="565" font-family="Arial Black, Arial, sans-serif" font-size="115" font-weight="900" fill="black" text-anchor="middle">' + n + '</text>' +
        '<text x="18" y="345" font-family="Arial Black, Arial, sans-serif" font-size="115" font-weight="900" fill="black" text-anchor="start">' + n + '</text>' +
        '<text x="902" y="345" font-family="Arial Black, Arial, sans-serif" font-size="115" font-weight="900" fill="black" text-anchor="end">' + n + '</text>' +
    '</svg>';
}

const SYMBOLS = {

    // ── Strv-minor ───────────────────────────────────────────────────────────
    strv_tryck: {
        label: 'Stridsvagnsmina',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
            '<circle cx="200" cy="200" r="185" fill="black"/>' +
        '</svg>'
    },

    // ── Truppminor ───────────────────────────────────────────────────────────
    tramp: {
        label: 'Truppmina',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 390">' +
            '<line x1="101" y1="141" x2="28" y2="55" stroke="black" stroke-width="13" stroke-linecap="round"/>' +
            '<line x1="299" y1="141" x2="372" y2="55" stroke="black" stroke-width="13" stroke-linecap="round"/>' +
            '<circle cx="200" cy="245" r="140" fill="black"/>' +
        '</svg>'
    },
    larm: {
        label: 'Larmmina',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 420">' +
            '<circle cx="210" cy="210" r="195" fill="black"/>' +
            '<line x1="405" y1="210" x2="980" y2="210" stroke="black" stroke-width="22" stroke-linecap="square"/>' +
        '</svg>'
    },

    // ── Fordon & skydd ───────────────────────────────────────────────────────
    fordonsmina: {
        label: 'Fordonsmina',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">' +
            '<defs>' +
                '<clipPath id="v4fmClip"><circle cx="250" cy="250" r="225"/></clipPath>' +
                '<pattern id="v4fmStripes" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45 250 250)">' +
                    '<rect x="0" y="0" width="30" height="60" fill="black"/>' +
                    '<rect x="30" y="0" width="30" height="60" fill="none"/>' +
                '</pattern>' +
            '</defs>' +
            '<circle cx="250" cy="250" r="225" fill="url(#v4fmStripes)" clip-path="url(#v4fmClip)"/>' +
            '<circle cx="250" cy="250" r="225" fill="none" stroke="black" stroke-width="22"/>' +
        '</svg>'
    },
    fordon_sid: {
        // ­ = mjukt bindestreck — bryts bara om det behövs (svensk stavelse).
        label: 'Sid­verkande fordons­mina',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 420">' +
            '<circle cx="195" cy="210" r="185" fill="black"/>' +
            '<line x1="390" y1="210" x2="650" y2="210" stroke="black" stroke-width="18" stroke-dasharray="55,30" stroke-linecap="square"/>' +
            '<polygon points="650,130 650,290 790,210" fill="black"/>' +
        '</svg>'
    },
    forsvar: {
        label: 'Försvarsladdning',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 630">' +
            '<circle cx="210" cy="280" r="155" fill="white" stroke="black" stroke-width="18"/>' +
            '<line x1="320" y1="170" x2="348" y2="142" stroke="black" stroke-width="10"/>' +
            '<polygon points="429,61 382,176 314,108" fill="black"/>' +
            '<line x1="320" y1="390" x2="348" y2="418" stroke="black" stroke-width="10"/>' +
            '<polygon points="429,499 382,384 314,452" fill="black"/>' +
            '<text x="30" y="530" font-family="Arial, sans-serif" font-size="100" font-weight="bold" fill="black">2</text>' +
        '</svg>'
    },
    prov_rojskydd: {
        label: 'Provi­soriskt fordons­röjnings­skydd',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 580">' +
            '<line x1="115" y1="295" x2="430" y2="75" stroke="black" stroke-width="12"/>' +
            '<line x1="115" y1="295" x2="430" y2="510" stroke="black" stroke-width="12"/>' +
            '<circle cx="115" cy="295" r="48" fill="black"/>' +
            '<circle cx="430" cy="75" r="48" fill="black"/>' +
            '<circle cx="430" cy="510" r="48" fill="black"/>' +
        '</svg>'
    },
    rojskydd: {
        label: 'Röjningsskydd',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 560">' +
            '<text x="20" y="530" font-family="Arial Black, Arial, sans-serif" font-size="580" font-weight="900" fill="black">R</text>' +
        '</svg>'
    },

    // ── Förstöring ───────────────────────────────────────────────────────────
    forst_forb: {
        label: 'Förberedd förstöring',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 420">' +
            '<line x1="0" y1="210" x2="1100" y2="210" stroke="black" stroke-width="12" stroke-linecap="square"/>' +
            '<polyline points="-150,400 250,100 600,400 900,100 1250,400" fill="none" stroke="black" stroke-width="12" stroke-linejoin="miter" stroke-linecap="square"/>' +
        '</svg>'
    },
    forst_forb_sakrad: {
        // NY i v4: "Förberedd förstöring, säkrad" (passage möjlig) — eget
        // reglementsbegrepp, får inte slås ihop med forst_forb eller rojskydd.
        label: 'Förberedd för­störing, säkrad',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 490">' +
            '<circle cx="250" cy="245" r="220" fill="white" stroke="black" stroke-width="2"/>' +
            '<defs><clipPath id="v4ffsClip"><circle cx="250" cy="245" r="220"/></clipPath></defs>' +
            '<g clip-path="url(#v4ffsClip)">' +
                '<line x1="60" y1="420" x2="440" y2="80" stroke="black" stroke-width="9" stroke-linecap="square"/>' +
                '<line x1="60" y1="370" x2="440" y2="30" stroke="black" stroke-width="9" stroke-linecap="square" stroke-dasharray="28,18"/>' +
            '</g>' +
        '</svg>'
    },
    forst_utf: {
        label: 'Utförd förstöring',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 490">' +
            '<defs><clipPath id="v4fuClip"><circle cx="250" cy="245" r="220"/></clipPath></defs>' +
            '<circle cx="250" cy="245" r="220" fill="white" stroke="black" stroke-width="2"/>' +
            '<g clip-path="url(#v4fuClip)">' +
                '<line x1="108" y1="77"  x2="418" y2="387" stroke="black" stroke-width="9" stroke-linecap="square"/>' +
                '<line x1="82"  y1="103" x2="392" y2="413" stroke="black" stroke-width="9" stroke-linecap="square"/>' +
                '<line x1="392" y1="77"  x2="82"  y2="387" stroke="black" stroke-width="9" stroke-linecap="square"/>' +
                '<line x1="418" y1="103" x2="108" y2="413" stroke="black" stroke-width="9" stroke-linecap="square"/>' +
            '</g>' +
        '</svg>'
    },
    forst_plan: {
        label: 'Planlagd förstöring',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 490">' +
            '<defs><clipPath id="v4fpClip"><circle cx="250" cy="245" r="220"/></clipPath></defs>' +
            '<circle cx="250" cy="245" r="220" fill="white" stroke="black" stroke-width="2"/>' +
            '<g clip-path="url(#v4fpClip)">' +
                '<line x1="70" y1="375" x2="380" y2="65" stroke="black" stroke-width="12" stroke-linecap="square" stroke-dasharray="28,42"/>' +
                '<line x1="120" y1="425" x2="430" y2="115" stroke="black" stroke-width="12" stroke-linecap="square" stroke-dasharray="28,42"/>' +
            '</g>' +
        '</svg>'
    },

    // ── Områdesverkan ────────────────────────────────────────────────────────
    omr_verkan: {
        label: 'Områdesverkande mina',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-95 0 690 520">' +
            '<polyline points="190,290 130,450 -90,242" fill="none" stroke="black" stroke-width="13" stroke-linecap="round" stroke-linejoin="miter"/>' +
            '<polyline points="310,290 370,450 590,242" fill="none" stroke="black" stroke-width="13" stroke-linecap="round" stroke-linejoin="miter"/>' +
            '<circle cx="250" cy="155" r="145" fill="black"/>' +
        '</svg>'
    },
    verkansomrade: {
        label: 'Verkansområde',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520">' +
            '<path d="M 50,490 A 400,400 0 0 1 850,490" fill="white" stroke="none"/>' +
            '<path d="M 50,490 A 400,400 0 0 1 850,490" fill="none" stroke="black" stroke-width="22" stroke-dasharray="40,80" stroke-linecap="square"/>' +
            '<line x1="50" y1="490" x2="850" y2="490" stroke="black" stroke-width="22" stroke-dasharray="40,80" stroke-linecap="square"/>' +
        '</svg>'
    },

    // ── Linjer ───────────────────────────────────────────────────────────────
    // 2026-04-27: enhetlig palett-SVG för båda linjesymbolerna (rak svart
    // linje + pilspets). Minlinjens bukiga pil och avspärrningens taggiga
    // kant gjorde paletten visuellt rörig — knappens uppgift är att visa
    // "det här är en linje", inte att simulera Leaflet-renderingen. Skill-
    // naden mellan dem framgår fortfarande på kartan via Leaflet-stilen
    // (stroke/dashArray) som lämnas oförändrad.
    minlinje: {
        label: 'Minlinje',
        category: 'line',
        svg: MK_LINE_SVG,
        stroke: MK_INK, weight: 4, dashArray: null
    },
    avsparrning: {
        label: 'Avspärrning, minvarning',
        category: 'line',
        svg: MK_LINE_SVG,
        stroke: MK_INK, weight: 4, dashArray: '6 3'
    },

    // ── Områden (polygoner) ──────────────────────────────────────────────────
    minruta: {
        label: 'Minruta',
        category: 'polygon',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 380">' +
            '<rect x="8" y="8" width="884" height="364" fill="none" stroke="black" stroke-width="16" rx="4"/>' +
            '<line x1="40" y1="190" x2="720" y2="190" stroke="black" stroke-width="12" stroke-linecap="square"/>' +
            '<polygon points="720,115 720,265 860,190" fill="black"/>' +
        '</svg>',
        stroke: MK_INK, fill: MK_INK, fillOpacity: 0.08
    },
    minomrade: {
        label: 'Minerat område',
        category: 'polygon',
        // Statisk fallback (med "M") för paletten. Centrum-markörens SVG
        // genereras dynamiskt via minomradeSvg(obj.antal) i mkMakeIcon().
        svg: minomradeSvg(null),
        stroke: MK_INK, fill: MK_INK, fillOpacity: 0.06,
        ambitionChoices: ['HIND', 'FÖRDR', 'STÖR', 'AVST']
    },

    // ── Avståndslagda (polygoner) ────────────────────────────────────────────
    avstand_tramp: {
        label: 'Avstånds­lagd tramp­minering',
        category: 'polygon',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 580">' +
            '<path d="M 240,45 C 400,5 660,15 790,80 C 875,130 905,230 885,350 C 865,455 775,535 615,555 C 445,575 270,562 155,498 C 55,445 35,355 50,265 C 68,155 125,75 240,45 Z" fill="white" stroke="black" stroke-width="16" stroke-linejoin="round"/>' +
            '<line x1="155" y1="215" x2="255" y2="215" stroke="black" stroke-width="10" stroke-linecap="square"/>' +
            '<line x1="400" y1="208" x2="495" y2="208" stroke="black" stroke-width="10" stroke-linecap="square"/>' +
            '<line x1="660" y1="335" x2="755" y2="335" stroke="black" stroke-width="10" stroke-linecap="square"/>' +
            '<line x1="190" y1="418" x2="285" y2="418" stroke="black" stroke-width="10" stroke-linecap="square"/>' +
            '<line x1="440" y1="428" x2="540" y2="428" stroke="black" stroke-width="10" stroke-linecap="square"/>' +
        '</svg>',
        stroke: MK_INK, fill: MK_INK, fillOpacity: 0.08, dashArray: null
    },
    avstand_strv: {
        label: 'Avstånds­lagd stridsvagns­minering',
        category: 'polygon',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 500">' +
            '<polygon points="20,292.5 546.3,292.5 819.4,19.4 934.6,134.6 613.7,455.5 20,455.5" fill="white" stroke="black" stroke-width="11" stroke-linejoin="miter"/>' +
            '<circle cx="105" cy="374" r="68" fill="black"/>' +
            '<circle cx="280" cy="374" r="68" fill="black"/>' +
            '<circle cx="455" cy="374" r="68" fill="black"/>' +
            '<circle cx="590" cy="360" r="68" fill="black"/>' +
            '<circle cx="697" cy="257" r="68" fill="black"/>' +
            '<circle cx="800" cy="155" r="68" fill="black"/>' +
        '</svg>',
        stroke: MK_INK, fill: MK_INK, fillOpacity: 0.08, dashArray: null
    },

    // ── Referenspunkter (UPK) — BEHÅLLEN från v3 ─────────────────────────────
    // UPK (Utgångs-Punkt-Koordinat) är en bestämbar terrängpunkt,
    // inte en skarp minposition. Stabilt slumpnummer 001–999 hanteras i
    // minkarta.html. Svartmålad v3-stil, oförändrad i v4.
    // SP-symbolen togs bort 2026-04-27 — reglementsvarningen kräver bara UPK.
    upk: {
        label: 'UPK',
        category: 'meta',
        svg: svg(
            '<circle cx="12" cy="12" r="9" fill="' + MK_INK + '" ' + haloStroke(3) + '/>' +
            '<text x="12" y="15.3" text-anchor="middle" font-family="Inter,sans-serif" font-size="7.8" font-weight="800" fill="' + MK_WHITE + '">UPK</text>'
        )
    },

    // ── Yttergränsmarkör — BEHÅLLEN från v3 ──────────────────────────────────
    // Styr PNG-exportens bounding box. Ritas som streckad svart kvadrat med
    // L-hörn.
    ytter: {
        label: 'Yttergränsmarkör (styr export)',
        category: 'meta',
        svg: svg(
            '<rect x="3" y="3" width="18" height="18" fill="none" stroke="' + MK_INK + '" stroke-width="1.8" stroke-dasharray="4 2" ' + haloStroke(3.5) + '/>' +
            '<line x1="3" y1="3" x2="9" y2="3" stroke="' + MK_INK + '" stroke-width="2.4"/>' +
            '<line x1="3" y1="3" x2="3" y2="9" stroke="' + MK_INK + '" stroke-width="2.4"/>' +
            '<line x1="21" y1="21" x2="15" y2="21" stroke="' + MK_INK + '" stroke-width="2.4"/>' +
            '<line x1="21" y1="21" x2="21" y2="15" stroke="' + MK_INK + '" stroke-width="2.4"/>'
        )
    },

    // ── Fri-text ─────────────────────────────────────────────────────────────
    // Punktsymbol som istället för en SVG-piktogram visar en användarens
    // egen text på kartan. Text-skrivflödet (text-cursor, Shift+Enter,
    // Enter/Tab för att avsluta) hanteras i minkarta.html. Sparas som
    // { typ:'text', lat, lng, text, … }.
    text: {
        label: 'Text',
        category: 'point',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            '<line x1="5" y1="6" x2="19" y2="6" stroke="' + MK_INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
            '<line x1="12" y1="6" x2="12" y2="20" stroke="' + MK_INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
        '</svg>'
    },

    // ── Fri-rita-penna ───────────────────────────────────────────────────────
    // Frihandsritad polyline. Ritas via mousedown→mousemove→mouseup i
    // minkarta.html (inte vanlig click-flow), men sparas som vilken linje
    // som helst (category 'line'). v2 (2026-05-22, issue #65): porterat
    // sensorskiss-feature-set — style ('heldragen'/'streckad') + arrows
    // + anteckning sätts via edit-popup. Defaults vid skapande: streckad +
    // arrows=true (matchar sensorskiss-frihand).
    frihand: {
        label: 'Frihand',
        category: 'line',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            '<path d="M2 19 Q5 9 9 13 T15 11 T22 5" fill="none" ' +
                'stroke="' + MK_INK + '" stroke-width="2" ' +
                'stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>',
        stroke: MK_INK, weight: 5, dashArray: null,
        defaultStyle: 'streckad', defaultArrows: true
    },

    // ── Linje (sensorskiss-style click-baserad polyline) ─────────────────────
    // Porterat från sensorskiss (issue #65). Click-add-noder, dubbelklick
    // avslutar. Style/arrows/anteckning i edit-popup. Defaults: heldragen,
    // arrows=false (matchar sensorskiss-linje).
    linje: {
        label: 'Linje',
        category: 'line',
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
            '<path d="M2 19 L9 11 L15 15 L22 5" fill="none" ' +
                'stroke="' + MK_INK + '" stroke-width="2" ' +
                'stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>',
        stroke: MK_INK, weight: 4, dashArray: null,
        defaultStyle: 'heldragen', defaultArrows: false
    }

    // BORTTAGNA v3-nycklar (ingen motsvarighet i nya SVG-paketet från
    // 2026-04-26): strv_full, strv_rojskydd, trad, avstand, skenminering,
    // landmina_okand, riktad_verkan. Borttaget 2026-04-27: sp.
    // Migration av gammalt state sker i minkarta.html loadPersisted().

};

// Palett-grupper (för UI-layout). v4 efter 2026-04-28: 4 grupper.
// Rad 1: referenser & annotering — UPK, yttergränsmarkör + fri-rita/text.
// Rad 2: mineringar (Block A) — pjäser + larm + områdesverkan + minerat omr.
// Rad 3: linjer & ytor (Block B).
// Rad 4: förstöring & spärr (Block C).
const SYMBOL_GROUPS = [
    { title: 'Referenser & annotering', ids: ['upk', 'ytter', 'linje', 'frihand', 'text'] },
    { title: 'Mineringar',         ids: [
        'strv_tryck', 'fordonsmina', 'fordon_sid', 'tramp', 'forsvar',
        'omr_verkan', 'larm'
    ] },
    { title: 'Linjer & ytor',      ids: [
        'avstand_tramp', 'avstand_strv', 'minlinje', 'minruta', 'minomrade', 'verkansomrade'
    ] },
    { title: 'Förstöring & spärr', ids: [
        'forst_forb', 'forst_forb_sakrad', 'forst_plan', 'prov_rojskydd',
        'rojskydd', 'forst_utf', 'avsparrning'
    ] }
];

// Vridbara symboler — rotation appliceras på inre wrapper-div så att
// Leaflet-ikonen visas vriden. Lagras på obj.rotation (heltal grader).
const ROTATABLE_TYPES = new Set(['fordon_sid', 'forsvar']);

// Skapa en Leaflet-divIcon från ett SYMBOLS-entry. obj är valfritt och
// används bara för objekt-specifik rendering (minomrade-antal, rotation).
function makeIcon(id, obj) {
    const sym = SYMBOLS[id];
    if (!sym) return null;
    let svgStr = sym.svg;
    if (id === 'minomrade' && obj) svgStr = minomradeSvg(obj.antal);
    let html = svgStr;
    if (obj && obj.rotation && ROTATABLE_TYPES.has(id)) {
        html = '<div class="mk-rot" style="width:100%;height:100%;transform:rotate(' + obj.rotation + 'deg)">' + svgStr + '</div>';
    }
    return L.divIcon({
        className: 'mk-icon mk-icon-' + id,
        html: html,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });
}

window.MK_SYMBOLS = SYMBOLS;
window.MK_SYMBOL_GROUPS = SYMBOL_GROUPS;
window.mkMakeIcon = makeIcon;
window.minomradeSvg = minomradeSvg;
window.MK_ROTATABLE_TYPES = ROTATABLE_TYPES;
window.MK_COLORS = { MK_INK, MK_HALO, MK_WHITE, MK_GRAY, MK_RED };
