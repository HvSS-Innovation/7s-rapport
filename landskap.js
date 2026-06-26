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
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/blekinge.pmtiles', bytes: 29729437, sha256: '2639c075883ba6d373f9d3100983757cf4aecec010651bb715914930b686ff71'
            }
        },
        bohuslan: {
            id: 'bohuslan', namn: "Bohuslän", landsdel: "Götaland", kod: 9,
            bbox: { west: 11.1069, south: 57.6886, east: 12.2287, north: 59.1014 },
            center: [58.395, 11.6678], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/bohuslan.pmtiles', bytes: 92560468, sha256: '714af264ecf57e04bc3b2bf50546b4ec39bcda079b4cd67bf32d80024424a4b1'
            }
        },
        dalsland: {
            id: 'dalsland', namn: "Dalsland", landsdel: "Götaland", kod: 10,
            bbox: { west: 11.6518, south: 58.3799, east: 12.7824, north: 59.2637 },
            center: [58.8218, 12.2171], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/dalsland.pmtiles', bytes: 41486082, sha256: 'a2b4dee5b12eb99a5254dacf11f6fb801502ecdf7e8047d31af13bae7897c796'
            }
        },
        gotland: {
            id: 'gotland', namn: "Gotland", landsdel: "Götaland", kod: 6,
            bbox: { west: 18.11, south: 56.91, east: 19.3356, north: 58.3914 },
            center: [57.6507, 18.7228], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/gotland.pmtiles', bytes: 16554106, sha256: 'dcd3a4cb7c67cdef0de2d7702b453c8a7d9920e8c1a94b4a25f2b29e50a006d3'
            }
        },
        halland: {
            id: 'halland', namn: "Halland", landsdel: "Götaland", kod: 4,
            bbox: { west: 11.9014, south: 56.3241, east: 13.4675, north: 57.6327 },
            center: [56.9784, 12.6844], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/halland.pmtiles', bytes: 61890256, sha256: 'f2b272e18faf7e49734353cb09d0abe0d0468106e2e950772f85884917d5cbb1'
            }
        },
        skane: {
            id: 'skane', namn: "Skåne", landsdel: "Götaland", kod: 1,
            bbox: { west: 12.4517, south: 55.3392, east: 14.5863, north: 56.5328 },
            center: [55.936, 13.519], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/skane.pmtiles', bytes: 126753299, sha256: '5c28f58b1007ebb26755f88bda525027e41919ab6593c8ba964e0b40acc4b590'
            }
        },
        smaland: {
            id: 'smaland', namn: "Småland", landsdel: "Götaland", kod: 5,
            bbox: { west: 13.0771, south: 56.2974, east: 16.7842, north: 58.2718 },
            center: [57.2846, 14.9306], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/smaland.pmtiles', bytes: 243699207, sha256: 'edd64b57d1f182769bb982211e5a09e9a10ae4f31da8888319f63455ef63fe6b'
            }
        },
        vastergotland: {
            id: 'vastergotland', namn: "Västergötland", landsdel: "Götaland", kod: 7,
            bbox: { west: 11.7856, south: 57.1455, east: 14.7396, north: 59.0331 },
            center: [58.0893, 13.2626], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/vastergotland.pmtiles', bytes: 234883503, sha256: '13017ec7a1f78cf12e9a918b39bbfff9f7b16a135c71399eb9f9950521d1f4d3'
            }
        },
        oland: {
            id: 'oland', namn: "Öland", landsdel: "Götaland", kod: 3,
            bbox: { west: 16.3917, south: 56.2089, east: 17.1242, north: 57.3592 },
            center: [56.784, 16.7579], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/oland.pmtiles', bytes: 13919609, sha256: '60c8254319cef98e5f1d0c6be5df11dad3390c0960cbe4908234acf66bc5383e'
            }
        },
        ostergotland: {
            id: 'ostergotland', namn: "Östergötland", landsdel: "Götaland", kod: 8,
            bbox: { west: 14.4397, south: 57.6996, east: 16.9386, north: 59.0187 },
            center: [58.3592, 15.6891], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/ostergotland.pmtiles', bytes: 143592567, sha256: 'e63f13bcf33817c92a73da78f58033aceff4b048220e8c46e67a3f9972ea67b9'
            }
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
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/narke.pmtiles', bytes: 62714593, sha256: 'b1b176657ff60bd0b6662d06207e914a53ec1452edf363dd8fed668a1c2f2354'
            }
        },
        sodermanland: {
            id: 'sodermanland', namn: "Södermanland", landsdel: "Svealand", kod: 12,
            bbox: { west: 15.6166, south: 58.6161, east: 18.4917, north: 59.4914 },
            center: [59.0537, 17.0542], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/sodermanland.pmtiles', bytes: 146081712, sha256: '52e10fb1b0c4b4dd0b89b529c17c9ee742ae1f6377a3262652325a460095a31c'
            }
        },
        uppland: {
            id: 'uppland', namn: "Uppland", landsdel: "Svealand", kod: 15,
            bbox: { west: 16.6242, south: 59.2231, east: 19.0822, north: 60.6433 },
            center: [59.9332, 17.8532], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/uppland.pmtiles', bytes: 167788500, sha256: '191571dab1156ed9e67c44e8f3f338ec9b58ed144efa0dc85aa4b0301fcc4de6'
            }
        },
        varmland: {
            id: 'varmland', namn: "Värmland", landsdel: "Svealand", kod: 13,
            bbox: { west: 11.6911, south: 58.761, east: 14.79, north: 61.056 },
            center: [59.9085, 13.2405], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/varmland.pmtiles', bytes: 231159167, sha256: '7e0acec6b2267c0cacecfa3d690ac1c3e2b369ec4f81ee45a1b2d4b08b8c6e10'
            }
        },
        vastmanland: {
            id: 'vastmanland', namn: "Västmanland", landsdel: "Svealand", kod: 14,
            bbox: { west: 14.3318, south: 59.1979, east: 16.9193, north: 60.1951 },
            center: [59.6965, 15.6255], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/vastmanland.pmtiles', bytes: 109143246, sha256: '0ac079edfa17d4e4c86a789772e7fb89c83643394dfb4068c3121d535d012824'
            }
        },
        gastrikland: {
            id: 'gastrikland', namn: "Gästrikland", landsdel: "Norrland", kod: 16,
            bbox: { west: 16.131, south: 60.1886, east: 17.367, north: 61.0556 },
            center: [60.6221, 16.749], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/gastrikland.pmtiles', bytes: 34702411, sha256: '546698e7e84ce1e4f992ce2544aa45f183f0929131ab956bbc72e9527d266f30'
            }
        },
        halsingland: {
            id: 'halsingland', namn: "Hälsingland", landsdel: "Norrland", kod: 18,
            bbox: { west: 14.6864, south: 60.9921, east: 17.5236, north: 62.3435 },
            center: [61.6678, 16.105], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/halsingland.pmtiles', bytes: 109304275, sha256: '9c335db3306d8ace254021f81e1d0f20a22522e0565480b017973da9193db00a'
            }
        },
        harjedalen: {
            id: 'harjedalen', namn: "Härjedalen", landsdel: "Norrland", kod: 19,
            bbox: { west: 12.0561, south: 61.5639, east: 14.9395, north: 62.9734 },
            center: [62.2686, 13.4978], zoom: 7,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/harjedalen.pmtiles', bytes: 113155992, sha256: 'c099c2d48492537d10bacfbf8803ea81e07cce5968a531a0bb18323778b5d3be'
            }
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
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/medelpad.pmtiles', bytes: 81895875, sha256: 'ab3d19a6e6b25c7b284702e6f68555bea275622f7bceedf8d4dd9fcd41f6f42a'
            }
        },
        norrbotten: {
            id: 'norrbotten', namn: "Norrbotten", landsdel: "Norrland", kod: 25,
            bbox: { west: 19.6288, south: 65.0564, east: 24.1553, north: 68.1431 },
            center: [66.5997, 21.892], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/norrbotten.pmtiles', bytes: 140819267, sha256: '517a2083d96607b4584b641a340a46f45f22ed3bb30e86cee704240c2b317b5e'
            }
        },
        vasterbotten: {
            id: 'vasterbotten', namn: "Västerbotten", landsdel: "Norrland", kod: 23,
            bbox: { west: 18.7569, south: 63.5224, east: 21.585, north: 65.381 },
            center: [64.4517, 20.1709], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/vasterbotten.pmtiles', bytes: 69394020, sha256: '38ba009c0fd95c9a62472a220383f7f3c7073ef69580c55d3e674691e4742f88'
            }
        },
        angermanland: {
            id: 'angermanland', namn: "Ångermanland", landsdel: "Norrland", kod: 21,
            bbox: { west: 15.2996, south: 62.4822, east: 19.7792, north: 64.538 },
            center: [63.5101, 17.5394], zoom: 6,
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: {
                url: 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/angermanland.pmtiles', bytes: 128563347, sha256: '3d0e6bf422a530ab57563e7a5304a698233e209ff2fa8d3353808840e318a4dd'
            }
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
