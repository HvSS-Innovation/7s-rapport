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
//  Status per 2026-07-28: FI, EE, LV, LT är byggda + uppladdade (källa:
//  Protomaps daily build 20260727, maxzoom 15 — samma schema som
//  sverige.pmtiles). DK + NO återstår; deras knappar är disabled tills
//  url + bytes + sha256 fyllts i. När en fil är klar:
//    1. ladda upp till samma R2-bucket som sverige.pmtiles
//    2. fyll i url + bytes + sha256 i pmtilesPresets nedan
//    3. lands-knappen aktiveras automatiskt (och landet blir valbart i
//       offline-väljaren, shared/landskap-offline.js)
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
    // Placeholders för pmtiles-filen (url/bytes/sha256) fylls i NÄR utvecklaren har
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
            // Byggd 2026-07-28 ur Protomaps daily 20260727, maxzoom 15.
            // Klart störst av grannländerna (hela landet i en fil) — den som
            // bara ska verka i ett hörn av Finland bör vara medveten om att
            // det är 2,6 GiB att hämta.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/finland.pmtiles',
                bytes: 2760021616,
                sha256: '6581b1826ff0c730b22945999aa530af0b972843e3c9f3c32a13afe0c12e25df'
            }
        },
        EE: {
            code: 'EE', label: 'Estland', flag: '🇪🇪',
            bbox: { west: 21.5, south: 57.5, east: 28.5, north: 59.8 },
            center: [58.6, 25.0], zoom: 7,
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/estland.pmtiles',
                bytes: 297876029,
                sha256: '7940c6911a012422fdd9d0cf6c29639b2d13d8646f4f579710f6ad61e8609e5d'
            }
        },
        LV: {
            code: 'LV', label: 'Lettland', flag: '🇱🇻',
            bbox: { west: 20.5, south: 55.5, east: 28.5, north: 58.2 },
            center: [56.9, 24.5], zoom: 7,
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/lettland.pmtiles',
                bytes: 549304526,
                sha256: '8d6e507dde8e41eb345d4198170c086b93fd69b949252ae2f45633b277910cdf'
            }
        },
        LT: {
            code: 'LT', label: 'Litauen', flag: '🇱🇹',
            bbox: { west: 20.5, south: 53.5, east: 27.0, north: 56.5 },
            center: [55.0, 23.8], zoom: 7,
            // Bbox:en täcker även Kaliningrad + gränsremsor av PL/BY — därav
            // större fil än Lettland trots mindre landyta.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/litauen.pmtiles',
                bytes: 748661006,
                sha256: '477fe1c3bb9aade7a1445c514f372072c071d0a70e47608ea18c1ef29f2b5579'
            }
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
