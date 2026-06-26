// ─────────────────────────────────────────────────────────────────────────────
//  LANDSKAP — PMTiles-presets för "Härdat läge per landskap" (offline i bitar).
//
//  Driver landskaps-väljaren (shared/landskap-offline.js) som öppnas från
//  "Ladda ner offline"- och "Härdat läge"-knapparna. Operatören väljer ett
//  eller flera landskap, köar dem och laddar ner var och en som en egen liten
//  PMTiles-fil — istället för hela Sverige (~4,1 GB) i en klump.
//
//  Datakälla: extract från Protomaps daily build via
//  `pmtiles extract --bbox=west,south,east,north --maxzoom=15`, samma pipeline
//  som grannländerna (countries.js). Bbox per landskap är beräknad från
//  Lantmäteriets landskapsgeometri (perliedman/svenska-landskap, CC0).
//  Bygg-recept: verktyg/build-landskap-pmtiles.md.
//
//  Status: pmtiles-filerna är INTE byggda + uppladdade än. Väljaren visar alla
//  landskap men bara de med url+bytes ifyllt är nedladdningsbara ("kommer
//  snart" annars). När en fil är klar:
//    1. ladda upp till samma R2-bucket som sverige.pmtiles
//    2. fyll i url + bytes + sha256 i presets nedan
//    3. landskapet blir automatiskt nedladdningsbart
//
//  Designprinciper (samma som countries.js):
//   - INGA API-nycklar i denna fil (klient-JS är publikt).
//   - URL ska peka på R2/host med Range-requests + CORS för 7srapport.com.
//   - bytes måste vara EXAKT rätt efter rebuild (content-length-mismatch
//     invaliderar cachade gamla versioner).
// ─────────────────────────────────────────────────────────────────────────────

(function (global) {
    'use strict';

    var LANDSDELAR = ['Götaland', 'Svealand', 'Norrland'];

    // bbox används av build-pipelinen; center + zoom används för att panna
    // härdat-kartan till landskapet efter aktivering.
    var presets = {
        blekinge: {
            id: 'blekinge', namn: "Blekinge", landsdel: "Götaland", kod: 2,
            bbox: { west: 14.3901, south: 56.0003, east: 16.0582, north: 56.5035 },
            center: [56.2519, 15.2241], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        bohuslan: {
            id: 'bohuslan', namn: "Bohuslän", landsdel: "Götaland", kod: 9,
            bbox: { west: 11.1069, south: 57.6886, east: 12.2287, north: 59.1014 },
            center: [58.395, 11.6678], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        dalsland: {
            id: 'dalsland', namn: "Dalsland", landsdel: "Götaland", kod: 10,
            bbox: { west: 11.6518, south: 58.3799, east: 12.7824, north: 59.2637 },
            center: [58.8218, 12.2171], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        gotland: {
            id: 'gotland', namn: "Gotland", landsdel: "Götaland", kod: 6,
            bbox: { west: 18.11, south: 56.91, east: 19.3356, north: 58.3914 },
            center: [57.6507, 18.7228], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        halland: {
            id: 'halland', namn: "Halland", landsdel: "Götaland", kod: 4,
            bbox: { west: 11.9014, south: 56.3241, east: 13.4675, north: 57.6327 },
            center: [56.9784, 12.6844], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        skane: {
            id: 'skane', namn: "Skåne", landsdel: "Götaland", kod: 1,
            bbox: { west: 12.4517, south: 55.3392, east: 14.5863, north: 56.5328 },
            center: [55.936, 13.519], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        smaland: {
            id: 'smaland', namn: "Småland", landsdel: "Götaland", kod: 5,
            bbox: { west: 13.0771, south: 56.2974, east: 16.7842, north: 58.2718 },
            center: [57.2846, 14.9306], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        vastergotland: {
            id: 'vastergotland', namn: "Västergötland", landsdel: "Götaland", kod: 7,
            bbox: { west: 11.7856, south: 57.1455, east: 14.7396, north: 59.0331 },
            center: [58.0893, 13.2626], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        oland: {
            id: 'oland', namn: "Öland", landsdel: "Götaland", kod: 3,
            bbox: { west: 16.3917, south: 56.2089, east: 17.1242, north: 57.3592 },
            center: [56.784, 16.7579], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        ostergotland: {
            id: 'ostergotland', namn: "Östergötland", landsdel: "Götaland", kod: 8,
            bbox: { west: 14.4397, south: 57.6996, east: 16.9386, north: 59.0187 },
            center: [58.3592, 15.6891], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        dalarna: {
            id: 'dalarna', namn: "Dalarna", landsdel: "Svealand", kod: 17,
            bbox: { west: 12.1377, south: 59.8541, east: 16.7048, north: 62.2675 },
            center: [61.0608, 14.4213], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        narke: {
            id: 'narke', namn: "Närke", landsdel: "Svealand", kod: 11,
            bbox: { west: 14.2891, south: 58.6462, east: 15.8621, north: 59.473 },
            center: [59.0596, 15.0756], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        sodermanland: {
            id: 'sodermanland', namn: "Södermanland", landsdel: "Svealand", kod: 12,
            bbox: { west: 15.6166, south: 58.6161, east: 18.4917, north: 59.4914 },
            center: [59.0537, 17.0542], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        uppland: {
            id: 'uppland', namn: "Uppland", landsdel: "Svealand", kod: 15,
            bbox: { west: 16.6242, south: 59.2231, east: 19.0822, north: 60.6433 },
            center: [59.9332, 17.8532], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        varmland: {
            id: 'varmland', namn: "Värmland", landsdel: "Svealand", kod: 13,
            bbox: { west: 11.6911, south: 58.761, east: 14.79, north: 61.056 },
            center: [59.9085, 13.2405], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        vastmanland: {
            id: 'vastmanland', namn: "Västmanland", landsdel: "Svealand", kod: 14,
            bbox: { west: 14.3318, south: 59.1979, east: 16.9193, north: 60.1951 },
            center: [59.6965, 15.6255], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        gastrikland: {
            id: 'gastrikland', namn: "Gästrikland", landsdel: "Norrland", kod: 16,
            bbox: { west: 16.131, south: 60.1886, east: 17.367, north: 61.0556 },
            center: [60.6221, 16.749], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        halsingland: {
            id: 'halsingland', namn: "Hälsingland", landsdel: "Norrland", kod: 18,
            bbox: { west: 14.6864, south: 60.9921, east: 17.5236, north: 62.3435 },
            center: [61.6678, 16.105], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        harjedalen: {
            id: 'harjedalen', namn: "Härjedalen", landsdel: "Norrland", kod: 19,
            bbox: { west: 12.0561, south: 61.5639, east: 14.9395, north: 62.9734 },
            center: [62.2686, 13.4978], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        jamtland: {
            id: 'jamtland', namn: "Jämtland", landsdel: "Norrland", kod: 22,
            bbox: { west: 11.9746, south: 62.2808, east: 16.999, north: 65.1189 },
            center: [63.6999, 14.4868], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        lappland: {
            id: 'lappland', namn: "Lappland", landsdel: "Norrland", kod: 24,
            bbox: { west: 14.3259, south: 63.8801, east: 23.2694, north: 69.0581 },
            center: [66.4691, 18.7976], zoom: 5,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        medelpad: {
            id: 'medelpad', namn: "Medelpad", landsdel: "Norrland", kod: 20,
            bbox: { west: 14.7811, south: 62.1374, east: 17.7475, north: 62.947 },
            center: [62.5422, 16.2643], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        norrbotten: {
            id: 'norrbotten', namn: "Norrbotten", landsdel: "Norrland", kod: 25,
            bbox: { west: 19.6288, south: 65.0564, east: 24.1553, north: 68.1431 },
            center: [66.5997, 21.892], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        vasterbotten: {
            id: 'vasterbotten', namn: "Västerbotten", landsdel: "Norrland", kod: 23,
            bbox: { west: 18.7569, south: 63.5224, east: 21.585, north: 65.381 },
            center: [64.4517, 20.1709], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        },
        angermanland: {
            id: 'angermanland', namn: "Ångermanland", landsdel: "Norrland", kod: 21,
            bbox: { west: 15.2996, south: 62.4822, east: 19.7792, north: 64.538 },
            center: [63.5101, 17.5394], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        }
    };

    // Ordning i listan: grupperad per landsdel, alfabetisk inom gruppen.
    var order = ["blekinge","bohuslan","dalsland","gotland","halland","skane","smaland","vastergotland","oland","ostergotland","dalarna","narke","sodermanland","uppland","varmland","vastmanland","gastrikland","halsingland","harjedalen","jamtland","lappland","medelpad","norrbotten","vasterbotten","angermanland"];

    var byLandsdel = {"Götaland":["blekinge","bohuslan","dalsland","gotland","halland","skane","smaland","vastergotland","oland","ostergotland"],"Svealand":["dalarna","narke","sodermanland","uppland","varmland","vastmanland"],"Norrland":["gastrikland","halsingland","harjedalen","jamtland","lappland","medelpad","norrbotten","vasterbotten","angermanland"]};

    function getPreset(id) { return presets[id] || null; }

    // True om landskapets pmtiles-fil är byggd + uppladdad (url + bytes ifyllt).
    function isReady(id) {
        var p = presets[id];
        return !!(p && p.pmtiles && p.pmtiles.url && p.pmtiles.bytes > 0);
    }

    global.HVLandskap = {
        presets: presets,
        order: order,
        byLandsdel: byLandsdel,
        LANDSDELAR: LANDSDELAR,
        getPreset: getPreset,
        isReady: isReady
    };
})(window);
