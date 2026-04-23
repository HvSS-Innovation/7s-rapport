// ─────────────────────────────────────────────────────────────────────────────
//  MINKARTA — symbolbibliotek (v3: svart linjearbete + vit halo)
//
//  Reglementsreferens: "Mineringar på karta — sammanställning"
//  (Fältarbeten s. 338–342, Handbok 11.7.1 + Handbok 9.5 s. 86).
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
//  <!-- färgmatris: (v3 svart linjearbete + vit halo) -----------------------
//    PDF-referensen (Fältarbeten s. 339) ritar alla minbeteckningar i svart
//    linjearbete mot vit bakgrund. v2 använde gul/cyan/röd paletten med svart
//    halo för kontrast mot topografisk karta — v3 inverterar:
//    svart linjearbete + vit 3 px korona (halo) via paint-order="stroke",
//    plus en yttre drop-shadow-aura som förstärker kanten mot gröna/blå ytor.
//
//    Vit  #ffffff   — halo (yttre korona) + fyllning (ljus mask)
//    Svart #000000  — allt linjearbete, fyllda piktogram, texter
//    Grå  #666666   — skenminering (visuellt separerad från skarpa symboler)
//    Röd  #c62828   — UNDANTAG. Endast `forst_utf` (utförd förstöring):
//                     PDF:en själv markerar den med röd accent för att betona
//                     borttagen passage. Alla andra symboler är svart-vita.
//
//    Kontrastvalidering: svart kärna + vit halo läses mot vita kartblad,
//    gröna skogspartier och blå vattendrag i både OpenTopoMap och OSM
//    Standard. CSS-filtret `.mk-icon svg` lägger en yttre vit aura ovanpå
//    för Leaflet-ikonens slutliga kontrast.
//  -------------------------------------------------------------------------->

const MK_INK   = '#000000';            // svart linjearbete (primär)
const MK_HALO  = '#ffffff';            // vit korona (paint-order stroke)
const MK_WHITE = '#ffffff';            // fyllning som "ljus mask"
const MK_GRAY  = '#666666';            // skenminering + dim
const MK_RED   = '#c62828';            // UNDANTAG: endast `forst_utf`

// Bakåtkompatibla alias så minkarta.html / export inte behöver peta överallt.
// Leaflet.Polyline/Polygon läser dessa för sin stroke/fill.
const MK_STROKE = MK_INK;              // primär konturfärg
const MK_FILL   = 'rgba(0,0,0,0.08)';  // ljus grå fyllning för polygoner
const MK_ACCENT = MK_INK;
const MK_DANGER = MK_RED;
const MK_META   = MK_INK;

// Standard-svg-inställningar: paint-order="stroke" lägger bred stroke (vit)
// UNDER fyllning, vilket ger en vit korona runt varje form. Linjearbetet
// ovanpå ritas i svart.
const HALO_ATTRS = 'paint-order="stroke" stroke-linejoin="round" stroke-linecap="round"';

function svg(inner, extra) {
    const attrs = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ' + (extra || '');
    return '<svg ' + attrs + '>' + inner + '</svg>';
}

// Vit halo-stroke i given bredd (typiskt 3 px). Svart linjearbete ritas separat.
function haloStroke(width) {
    return 'stroke="' + MK_HALO + '" stroke-width="' + (width || 3) + '" paint-order="stroke"';
}

const SYMBOLS = {

    // ── Stridsvagnsminor ─────────────────────────────────────────────────────
    // PDF s.339 + Handbok s.86: stridsvagnsmina ritas som fylld svart cirkel.
    // Vi lägger en fin vit inner-prick för att skilja tryck/fullbredd via
    // detalj (punkt i center = tryck; punkt + fullbreddslinje = fullbredd).
    strv_tryck: {
        label: 'Strv-mina, tryckutlöst',
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="12" r="7.5" fill="' + MK_INK + '" ' + haloStroke(3) + '/>' +
            '<circle cx="12" cy="12" r="1.8" fill="' + MK_WHITE + '"/>'
        )
    },
    strv_full: {
        label: 'Strv-mina, fullbreddsverkande',
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="10" r="6.2" fill="' + MK_INK + '" ' + haloStroke(3) + '/>' +
            '<circle cx="12" cy="10" r="1.6" fill="' + MK_WHITE + '"/>' +
            '<line x1="3" y1="19" x2="21" y2="19" ' + haloStroke(3.2) + ' stroke="' + MK_HALO + '"/>' +
            '<line x1="3" y1="19" x2="21" y2="19" stroke="' + MK_INK + '" stroke-width="1.8"/>'
        )
    },
    strv_rojskydd: {
        label: 'Strv-mina med röjskydd',
        // PDF s.339: cirkel med R-text över/bredvid. Vi placerar R ovanför
        // cirkeln (text i svart med vit halo för läsbarhet).
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="14" r="6.2" fill="' + MK_INK + '" ' + haloStroke(3) + '/>' +
            '<circle cx="12" cy="14" r="1.5" fill="' + MK_WHITE + '"/>' +
            '<text x="12" y="7.5" text-anchor="middle" font-family="Inter,sans-serif" font-size="7.5" font-weight="800" paint-order="stroke" stroke="' + MK_HALO + '" stroke-width="3" fill="' + MK_INK + '">R</text>'
        )
    },

    // ── Truppminor ───────────────────────────────────────────────────────────
    // PDF s.339: Truppmina = liten fylld svart cirkel. Vi ritar trampmina
    // som trekant + inner-punkt (historisk MINKARTA-tolkning — skiljer tramp
    // från en enkel strvmina visuellt). Trådmina = trekant + utlösningslinje.
    tramp: {
        label: 'Trampmina',
        category: 'point',
        svg: svg(
            '<path d="M12 4 L20 20 L4 20 Z" fill="' + MK_INK + '" ' + haloStroke(3) + '/>' +
            '<circle cx="12" cy="15" r="1.4" fill="' + MK_WHITE + '"/>'
        )
    },
    trad: {
        label: 'Trådmina',
        category: 'point',
        svg: svg(
            '<path d="M12 4 L20 20 L4 20 Z" fill="' + MK_INK + '" ' + haloStroke(3) + '/>' +
            '<circle cx="12" cy="15" r="1.2" fill="' + MK_WHITE + '"/>' +
            '<line x1="2" y1="22" x2="22" y2="22" stroke="' + MK_HALO + '" stroke-width="3"/>' +
            '<line x1="2" y1="22" x2="22" y2="22" stroke="' + MK_INK + '" stroke-width="1.2" stroke-dasharray="2 2"/>'
        )
    },
    larm: {
        label: 'Larmmina',
        category: 'point',
        svg: svg(
            '<path d="M12 4 L20 20 L4 20 Z" fill="' + MK_INK + '" ' + haloStroke(3) + '/>' +
            '<text x="12" y="17.8" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="800" paint-order="stroke" stroke="' + MK_INK + '" stroke-width="0.4" fill="' + MK_WHITE + '">L</text>'
        )
    },

    // ── Fordonsminor ─────────────────────────────────────────────────────────
    // PDF s.339: Fordonsmina = svart cirkel med diagonala skraffer-linjer
    // (visar fyllning). Vi ritar den som svart rektangel med diagonal-fyllning
    // för att behålla särskiljning från strvmina (som är en cirkel).
    fordonsmina: {
        label: 'Fordonsmina',
        category: 'point',
        svg: svg(
            '<rect x="4" y="7" width="16" height="10" rx="1.2" fill="' + MK_INK + '" ' + haloStroke(3) + '/>' +
            '<line x1="6" y1="17" x2="18" y2="7" stroke="' + MK_WHITE + '" stroke-width="0.9"/>' +
            '<line x1="9" y1="17" x2="21" y2="7" stroke="' + MK_WHITE + '" stroke-width="0.9"/>' +
            '<line x1="3" y1="15" x2="15" y2="7" stroke="' + MK_WHITE + '" stroke-width="0.9"/>'
        )
    },
    fordon_sid: {
        label: 'Sidverkande fordonsmina',
        // PDF s.339: fylld svart cirkel med pil åt höger = riktad sidverkan.
        category: 'point',
        svg: svg(
            '<circle cx="9" cy="12" r="4.8" fill="' + MK_INK + '" ' + haloStroke(3) + '/>' +
            '<line x1="13" y1="12" x2="21" y2="12" stroke="' + MK_HALO + '" stroke-width="3"/>' +
            '<line x1="13" y1="12" x2="21" y2="12" stroke="' + MK_INK + '" stroke-width="1.6"/>' +
            '<path d="M22 12 L19 10 L19 14 Z" fill="' + MK_INK + '" ' + haloStroke(2) + '/>'
        )
    },

    // ── Laddning / avstånd ───────────────────────────────────────────────────
    forsvar: {
        label: 'Försvarsladdning',
        // PDF s.339: Q-symbol (cirkel med bokstav/siffra för nummer).
        // Vi ritar den som svart cirkel med F-text + underscore för numrering.
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="11" r="6.2" fill="' + MK_WHITE + '" stroke="' + MK_INK + '" stroke-width="1.6" ' + haloStroke(3) + '/>' +
            '<text x="12" y="14" text-anchor="middle" font-family="Inter,sans-serif" font-size="8.5" font-weight="800" fill="' + MK_INK + '">F</text>' +
            '<line x1="14" y1="17" x2="20" y2="19" stroke="' + MK_INK + '" stroke-width="1.6" ' + haloStroke(2.6) + '/>'
        )
    },
    avstand: {
        label: 'Avståndslagd (R-symbol)',
        // PDF s.339: R-spindel — en R-form med utstickande "ben" som visar
        // att mineringen är avståndslagd från öppning. Vi ritar en svart
        // cirkel med R + fyra utstickande linjer.
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="12" r="5.5" fill="' + MK_WHITE + '" stroke="' + MK_INK + '" stroke-width="1.6" ' + haloStroke(3) + '/>' +
            '<text x="12" y="15" text-anchor="middle" font-family="Inter,sans-serif" font-size="7.5" font-weight="800" fill="' + MK_INK + '">R</text>' +
            '<line x1="12" y1="6.5" x2="12" y2="3" stroke="' + MK_INK + '" stroke-width="1.4"/>' +
            '<line x1="12" y1="17.5" x2="12" y2="21" stroke="' + MK_INK + '" stroke-width="1.4"/>' +
            '<line x1="6.5" y1="12" x2="3" y2="12" stroke="' + MK_INK + '" stroke-width="1.4"/>' +
            '<line x1="17.5" y1="12" x2="21" y2="12" stroke="' + MK_INK + '" stroke-width="1.4"/>'
        )
    },

    // ── Förstöring ───────────────────────────────────────────────────────────
    // PDF s.339: förstöring ritas som cirkel (säkrad = en diagonal, osäkrad
    // = dubbeldiagonal) för förberedd; X-kors på linje för utförd (röd
    // accent i PDF). Vi ritar rektangel + diagonal som tidigare — svart + halo.
    forst_forb: {
        label: 'Förstöring, förberedd',
        category: 'point',
        svg: svg(
            '<rect x="5" y="6" width="14" height="12" fill="' + MK_WHITE + '" stroke="' + MK_INK + '" stroke-width="1.6" ' + haloStroke(3) + '/>' +
            '<line x1="5" y1="18" x2="19" y2="6" stroke="' + MK_INK + '" stroke-width="1.8"/>'
        )
    },
    forst_utf: {
        label: 'Förstöring, utförd',
        // PDF s.339: UTFÖRD förstöring markeras med röd accent i PDF-exemplet
        // för att betona borttagen passage. Vi behåller röd kärna + svart
        // X-kors. Enda symbolen i registret som avviker från ren svart-vit.
        category: 'point',
        svg: svg(
            '<rect x="5" y="6" width="14" height="12" fill="' + MK_RED + '" stroke="' + MK_INK + '" stroke-width="1.6" ' + haloStroke(3) + '/>' +
            '<line x1="5" y1="6" x2="19" y2="18" stroke="' + MK_INK + '" stroke-width="1.8"/>' +
            '<line x1="19" y1="6" x2="5" y2="18" stroke="' + MK_INK + '" stroke-width="1.8"/>'
        )
    },
    forst_plan: {
        label: 'Förstöring, planlagd',
        // PDF s.339: bågsymbol "~~" (planlagd broförstöring som exempel).
        // Vi ritar streckad rektangel med PL-text.
        category: 'point',
        svg: svg(
            '<rect x="5" y="6" width="14" height="12" fill="' + MK_WHITE + '" stroke="' + MK_INK + '" stroke-width="1.4" stroke-dasharray="3 2" ' + haloStroke(3) + '/>' +
            '<text x="12" y="15" text-anchor="middle" font-family="Inter,sans-serif" font-size="7.5" font-weight="800" fill="' + MK_INK + '">PL</text>'
        )
    },

    // ── Yttergränsmarkör (beskärning för export) ─────────────────────────────
    // Egen tilläggssymbol (inte i PDF) — styr PNG-exportens bounding box.
    // Ritas som streckad svart kvadrat med små L-hörn för tydlighet.
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

    // ── Linjesymboler ────────────────────────────────────────────────────────
    minlinje: {
        label: 'Minlinje',
        // PDF s.339: liten fylld cirkel + krokig linje = minlinje.
        category: 'line',
        svg: svg(
            '<line x1="3" y1="18" x2="21" y2="6" stroke="' + MK_HALO + '" stroke-width="3.4"/>' +
            '<line x1="3" y1="18" x2="21" y2="6" stroke="' + MK_INK + '" stroke-width="1.6"/>' +
            '<circle cx="7" cy="15.3" r="1.5" fill="' + MK_INK + '" ' + haloStroke(2) + '/>' +
            '<circle cx="12" cy="12" r="1.5" fill="' + MK_INK + '" ' + haloStroke(2) + '/>' +
            '<circle cx="17" cy="8.7" r="1.5" fill="' + MK_INK + '" ' + haloStroke(2) + '/>'
        ),
        stroke: MK_INK, weight: 4, dashArray: null
    },
    avsparrning: {
        label: 'Avspärrning / minvarning',
        // PDF s.339: sågtands-varningslinje ("wawa-tagg" VVVVVV). Vi ritar
        // den som polyline — Leaflet återger rak linje, men palett-previewn
        // håller sågtanden för igenkänning.
        category: 'line',
        svg: svg(
            '<polyline points="3,18 6,11 9,18 12,11 15,18 18,11 21,18" fill="none" stroke="' + MK_HALO + '" stroke-width="3.2" stroke-linejoin="round"/>' +
            '<polyline points="3,18 6,11 9,18 12,11 15,18 18,11 21,18" fill="none" stroke="' + MK_INK + '" stroke-width="1.6" stroke-linejoin="round"/>'
        ),
        stroke: MK_INK, weight: 4, dashArray: '6 3'
    },

    // ── Polygoner ────────────────────────────────────────────────────────────
    minruta: {
        label: 'Minruta',
        // PDF s.339: rektangel med pil inuti. Vi ritar svart rektangel +
        // svart pil i palett-previewn.
        category: 'polygon',
        svg: svg(
            '<rect x="4" y="7" width="16" height="10" fill="' + MK_WHITE + '" stroke="' + MK_INK + '" stroke-width="1.6" ' + haloStroke(3) + '/>' +
            '<line x1="7" y1="12" x2="16" y2="12" stroke="' + MK_INK + '" stroke-width="1.6"/>' +
            '<path d="M17 12 L14 10 L14 14 Z" fill="' + MK_INK + '"/>'
        ),
        stroke: MK_INK, fill: MK_INK, fillOpacity: 0.08
    },
    minomrade: {
        label: 'Minerat område',
        // PDF s.339: avlång oval med "M"-markeringar i kanterna. Vi ritar
        // en polygon + M-bokstäver runt om.
        category: 'polygon',
        svg: svg(
            '<ellipse cx="12" cy="12" rx="9" ry="6" fill="' + MK_WHITE + '" stroke="' + MK_INK + '" stroke-width="1.6" ' + haloStroke(3) + '/>' +
            '<text x="12" y="8" text-anchor="middle" font-family="Inter,sans-serif" font-size="5.5" font-weight="800" fill="' + MK_INK + '">M</text>' +
            '<text x="4" y="13" text-anchor="middle" font-family="Inter,sans-serif" font-size="5.5" font-weight="800" fill="' + MK_INK + '">M</text>' +
            '<text x="20" y="13" text-anchor="middle" font-family="Inter,sans-serif" font-size="5.5" font-weight="800" fill="' + MK_INK + '">M</text>' +
            '<text x="12" y="19" text-anchor="middle" font-family="Inter,sans-serif" font-size="5.5" font-weight="800" fill="' + MK_INK + '">M</text>'
        ),
        stroke: MK_INK, fill: MK_INK, fillOpacity: 0.06,
        ambitionChoices: ['HIND', 'FÖRDR', 'STÖR', 'AVST']
    },
    skenminering: {
        label: 'Skenminering',
        // Egen tolkning (PDF visar inte skenminering direkt). Medium-grå
        // streckad polygon för visuell separation från skarpa mineringar.
        category: 'polygon',
        svg: svg(
            '<path d="M4 6 L20 4 L21 18 L7 20 Z" fill="' + MK_WHITE + '" stroke="' + MK_GRAY + '" stroke-width="1.4" stroke-dasharray="3 2" ' + haloStroke(3) + '/>' +
            '<text x="12" y="14" text-anchor="middle" font-family="Inter,sans-serif" font-size="6.5" font-weight="800" fill="' + MK_GRAY + '">SKEN</text>'
        ),
        stroke: MK_GRAY, fill: MK_GRAY, fillOpacity: 0.08, dashArray: '6 4'
    },

    // ── Referenspunkter (UP / SP) ────────────────────────────────────────────
    // UP och SP är bestämbara terrängpunkter (PDF s.338), inte skarpa
    // minpositioner. v3 renderar dem som svart fylld form med vit text +
    // vit halo för konsekvens med övriga beteckningar.
    up: {
        label: 'UP',
        category: 'meta',
        svg: svg(
            '<circle cx="12" cy="12" r="8.5" fill="' + MK_INK + '" ' + haloStroke(3) + '/>' +
            '<text x="12" y="15.5" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" font-weight="800" fill="' + MK_WHITE + '">UP</text>'
        )
    },
    sp: {
        label: 'SP',
        category: 'meta',
        svg: svg(
            '<rect x="3.5" y="3.5" width="17" height="17" rx="2" fill="' + MK_INK + '" ' + haloStroke(3) + '/>' +
            '<text x="12" y="15.5" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" font-weight="800" fill="' + MK_WHITE + '">SP</text>'
        )
    },

    // ── Avståndslagda mineringar (polygoner, PDF s.339) ──────────────────────
    // PDF s.339 visar dessa som streckade områden med inbäddad mintyp-symbol.
    // Vi ritar paletten-preview som streckad polygon + svart inner-mintyp.
    avstand_tramp: {
        label: 'Avståndslagd trampminering',
        category: 'polygon',
        svg: svg(
            '<ellipse cx="12" cy="12" rx="9" ry="5.5" fill="' + MK_WHITE + '" stroke="' + MK_INK + '" stroke-width="1.4" stroke-dasharray="3 2" ' + haloStroke(3) + '/>' +
            '<path d="M12 9 L16 16 L8 16 Z" fill="' + MK_INK + '"/>' +
            '<circle cx="12" cy="14" r="0.9" fill="' + MK_WHITE + '"/>'
        ),
        stroke: MK_INK, fill: MK_INK, fillOpacity: 0.08, dashArray: '6 4'
    },
    avstand_strv: {
        label: 'Avståndslagd stridsvagnsminering',
        category: 'polygon',
        svg: svg(
            '<ellipse cx="12" cy="12" rx="9" ry="5.5" fill="' + MK_WHITE + '" stroke="' + MK_INK + '" stroke-width="1.4" stroke-dasharray="3 2" ' + haloStroke(3) + '/>' +
            '<circle cx="12" cy="13" r="3.6" fill="' + MK_INK + '"/>' +
            '<circle cx="12" cy="13" r="0.9" fill="' + MK_WHITE + '"/>'
        ),
        stroke: MK_INK, fill: MK_INK, fillOpacity: 0.08, dashArray: '6 4'
    },

    // ── Saknade beteckningar från PDF (tillägg v3 FAS 2) ─────────────────────
    // Efter v2 saknades sex beteckningar från PDF s.339 + Handbok s.86.
    // Var och en har ett designbeslutskommentar nedan som förklarar tolkningen.

    landmina_okand: {
        label: 'Landmina, okänd typ',
        // PDF s.339 + Handbok s.86 ("Ospecificerad mina"): ritas som en tom
        // liten svart cirkel-outline utan fyllning (dvs. typen är okänd,
        // symbolen markerar bara att det finns en mina). Vi ritar den som
        // outlined cirkel med vit fyllning — särskiljer sig från
        // strv_tryck (fylld) genom avsaknad av fyllnad.
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="12" r="7" fill="' + MK_WHITE + '" stroke="' + MK_INK + '" stroke-width="1.8" ' + haloStroke(3) + '/>'
        )
    },

    prov_rojskydd: {
        label: 'Provisoriskt fordonsröjningsskydd',
        // PDF s.339: kort linjesegment med punkt i båda ändarna och en vikning
        // i mitten (< • — • >) — representerar en provisorisk uppläggning.
        // Vi ritar det som två svarta cirklar Ø 2.2 px i ändpunkterna
        // sammanbundna med ett svart streck med en lätt vinkling.
        category: 'point',
        svg: svg(
            '<polyline points="4,16 12,8 20,16" fill="none" stroke="' + MK_INK + '" stroke-width="1.8" ' + haloStroke(3) + ' stroke-linejoin="round"/>' +
            '<circle cx="4" cy="16" r="2.2" fill="' + MK_INK + '" ' + haloStroke(2) + '/>' +
            '<circle cx="20" cy="16" r="2.2" fill="' + MK_INK + '" ' + haloStroke(2) + '/>'
        )
    },

    rojskydd: {
        label: 'Röjningsskydd',
        // PDF s.339: stor svart "R"-text som egen beteckning (inte kombinerad
        // med annan symbol). Vi ritar R centrerat i SVG:n med vit halo.
        category: 'point',
        svg: svg(
            '<text x="12" y="17" text-anchor="middle" font-family="Inter,sans-serif" font-size="16" font-weight="800" paint-order="stroke" stroke="' + MK_HALO + '" stroke-width="3" fill="' + MK_INK + '">R</text>'
        )
    },

    verkansomrade: {
        label: 'Verkansområde',
        // PDF s.339: streckad halvcirkel (cirkelbåge) som visar verkansområde.
        // Vi ritar en halvcirkelbåge med svart streckad linje, vit halo.
        // Kategori 'point' — en enskild markör som representerar riktningen.
        category: 'point',
        svg: svg(
            '<path d="M3 18 A9 9 0 0 1 21 18" fill="' + MK_WHITE + '" stroke="' + MK_INK + '" stroke-width="1.6" stroke-dasharray="3 2" ' + haloStroke(3) + '/>' +
            '<line x1="3" y1="18" x2="21" y2="18" stroke="' + MK_INK + '" stroke-width="1.2"/>'
        )
    },

    omr_verkan: {
        label: 'Områdesverkande mina',
        // Handbok s.86 (9.5 Ammunition): fylld svart cirkel med W-hake under
        // (symboliserar spridd verkan). Vi ritar svart cirkel + svart W
        // under, vit halo.
        category: 'point',
        svg: svg(
            '<circle cx="12" cy="9" r="4.5" fill="' + MK_INK + '" ' + haloStroke(3) + '/>' +
            '<path d="M6 15 L9 20 L12 16 L15 20 L18 15" fill="none" stroke="' + MK_INK + '" stroke-width="1.6" ' + haloStroke(2.6) + ' stroke-linejoin="round"/>'
        )
    },

    riktad_verkan: {
        label: 'Riktad verkan',
        // Handbok s.86: fylld svart cirkel med pil åt höger = riktad verkan
        // (generisk variant av fordon_sid, men utan fordon-specifik form).
        // Vi ritar en mindre svart cirkel + svart pil, vit halo.
        category: 'point',
        svg: svg(
            '<circle cx="9" cy="12" r="4.2" fill="' + MK_INK + '" ' + haloStroke(3) + '/>' +
            '<line x1="13" y1="12" x2="19" y2="12" stroke="' + MK_INK + '" stroke-width="1.6" ' + haloStroke(2.6) + '/>' +
            '<path d="M20 12 L17 10 L17 14 Z" fill="' + MK_INK + '" ' + haloStroke(2) + '/>'
        )
    }

};

// Paletten-grupper (för UI-layout). v3 FAS 2 lägger till "Övriga landminor"
// för de beteckningar som inte hör hemma i strv/trupp-grupperna, plus
// utökningar i befintliga grupper (rojskydd + prov_rojskydd i fordon-gruppen).
const SYMBOL_GROUPS = [
    { title: 'Strv-minor',         ids: ['strv_tryck', 'strv_full', 'strv_rojskydd'] },
    { title: 'Truppminor',         ids: ['tramp', 'trad', 'larm'] },
    { title: 'Övriga landminor',   ids: ['landmina_okand', 'omr_verkan', 'riktad_verkan', 'verkansomrade'] },
    { title: 'Fordon & skydd',     ids: ['fordonsmina', 'fordon_sid', 'forsvar', 'rojskydd', 'prov_rojskydd'] },
    { title: 'Förstöring',         ids: ['forst_forb', 'forst_utf', 'forst_plan'] },
    { title: 'Linjer',             ids: ['minlinje', 'avsparrning'] },
    { title: 'Områden',            ids: ['minruta', 'minomrade', 'skenminering'] },
    { title: 'Avståndslagda',      ids: ['avstand', 'avstand_tramp', 'avstand_strv'] },
    { title: 'Referenspunkter',    ids: ['up', 'sp'] },
    { title: 'Export',             ids: ['ytter'] }
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
window.MK_COLORS = { MK_INK, MK_HALO, MK_WHITE, MK_GRAY, MK_RED };
