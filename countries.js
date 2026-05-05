// ─────────────────────────────────────────────────────────────────────────────
//  COUNTRIES — PMTiles-presets för "Härdat läge per land".
//
//  Driver knapparna [🇩🇰 DK] [🇳🇴 NO] [🇫🇮 FI] [🇪🇪 EE] [🇱🇻 LV] [🇱🇹 LT] i
//  minkarta.html. Klick på en knapp byter Härdat läge (pmtiles-layer.js) till
//  det landets pmtiles-fil och erbjuder pre-download — exakt samma flöde som
//  redan finns för Sverige, bara med en URL per land.
//
//  Datakälla: samma som sverige.pmtiles — extract från Protomaps daily build
//  via `pmtiles extract --bbox=... --maxzoom=15`. Bygg-pipeline: se
//  verktyg/build-grannlander-pmtiles.md.
//
//  Status (2026-05-05): pmtiles-filerna är INTE byggda + uppladdade än.
//  Knapparna visas men är disabled tills url + bytes + sha256 fyllts i
//  per land. När en fil är klar:
//    1. ladda upp till samma R2-bucket som sverige.pmtiles
//    2. fyll i url + bytes + sha256 i pmtilesPresets nedan
//    3. lands-knappen aktiveras automatiskt
//
//  Designprinciper:
//   - INGA API-nycklar i denna fil (klient-JS är publikt).
//   - URL ska peka på en R2/GitHub Release-host som stödjer Range-requests
//     + CORS för 7srapport.com (samma som SVERIGE_PMTILES_URL).
//   - Storlek + SHA-256 verifieras inte längre på klient (Web Crypto kan inte
//     streamingsumma 4 GB), men content-length-mismatch invaliderar gamla
//     cachade versioner — så bytes måste vara exakt rätt efter rebuild.
// ─────────────────────────────────────────────────────────────────────────────

(function (global) {
    'use strict';

    // Bbox + center + zoom per grannland. Bbox används av build-pipelinen
    // (`pmtiles extract --bbox=west,south,east,north`). Center + zoom används
    // av kartan när användaren byter härdat läge så vyn pannar dit automatiskt
    // istället för att stå kvar över Sverige.
    //
    // Placeholders för pmtiles-filen (url/bytes/sha256) fylls i NÄR Joel har
    // byggt och laddat upp filen. Tills dess: knappen är disabled.
    var pmtilesPresets = {
        DK: {
            code: 'DK', label: 'Danmark', flag: '🇩🇰',
            bbox: { west: 8.0, south: 54.5, east: 15.5, north: 58.0 },
            center: [56.0, 11.5], zoom: 7,
            // TODO: Bygg + ladda upp till R2. Se verktyg/build-grannlander-pmtiles.md.
            //   1. pmtiles extract <protomaps-daily>.pmtiles danmark.pmtiles --bbox=8.0,54.5,15.5,58.0 --maxzoom=15
            //   2. wrangler r2 object put hv-pmtiles/danmark.pmtiles --file=danmark.pmtiles
            //   3. sha256sum danmark.pmtiles
            //   4. stat -c%s danmark.pmtiles
            //   5. fyll i url, bytes, sha256 nedan
            pmtiles: {
                url: '', // ex: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/danmark.pmtiles'
                bytes: 0,
                sha256: ''
            }
        },
        NO: {
            code: 'NO', label: 'Norge', flag: '🇳🇴',
            // Bbox utan Svalbard/Jan Mayen — vill man ha med dem så utöka norra
            // gränsen till 81.0 och west till -10. Svalbard 4x storlek = mycket
            // större fil. v1 = bara fastlandet + öar upp till 71.5° N.
            bbox: { west: 4.0, south: 57.5, east: 31.5, north: 71.5 },
            center: [64.5, 11.0], zoom: 5,
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        FI: {
            code: 'FI', label: 'Finland', flag: '🇫🇮',
            bbox: { west: 19.0, south: 59.5, east: 32.0, north: 70.5 },
            center: [64.5, 26.0], zoom: 5,
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        EE: {
            code: 'EE', label: 'Estland', flag: '🇪🇪',
            bbox: { west: 21.5, south: 57.5, east: 28.5, north: 59.8 },
            center: [58.6, 25.0], zoom: 7,
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        LV: {
            code: 'LV', label: 'Lettland', flag: '🇱🇻',
            bbox: { west: 20.5, south: 55.5, east: 28.5, north: 58.2 },
            center: [56.9, 24.5], zoom: 7,
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        LT: {
            code: 'LT', label: 'Litauen', flag: '🇱🇹',
            bbox: { west: 20.5, south: 53.5, east: 27.0, north: 56.5 },
            center: [55.0, 23.8], zoom: 7,
            pmtiles: { url: '', bytes: 0, sha256: '' }
        }
    };

    // Knapprad i UI:n — ordning vänster→höger.
    // Specens grunduppsättning är DK/NO/FI/EE/LV/LT (Sveriges grannländer).
    // Sverige själv hanteras av befintlig "Härdat läge"-knapp som default.
    var neighbors = ['DK', 'NO', 'FI', 'EE', 'LV', 'LT'];

    function getPreset(code) {
        return pmtilesPresets[code] || null;
    }

    // True om landets pmtiles-fil är byggd + uppladdad (url + bytes ifyllda).
    // UI använder detta för att avgöra om knappen ska vara disabled.
    function isReady(code) {
        var p = pmtilesPresets[code];
        return !!(p && p.pmtiles && p.pmtiles.url && p.pmtiles.bytes > 0);
    }

    global.HVCountries = {
        pmtilesPresets: pmtilesPresets,
        neighbors: neighbors,
        getPreset: getPreset,
        isReady: isReady
    };
})(window);
