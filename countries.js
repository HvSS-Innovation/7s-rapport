// ─────────────────────────────────────────────────────────────────────────────
//  COUNTRIES — Bbox- och zoom-presets för offline-kartcache.
//
//  Driver knapparna "🇸🇪 SE / 🇩🇰 DK / 🇳🇴 NO / 🇫🇮 FI / 🇪🇪 EE / 🇱🇻 LV / 🇱🇹 LT"
//  i minkarta.html samt "Andra länder"-listan. Varje preset levererar en bbox
//  (lat/lon) och ett rekommenderat zoom-spann så att tile-räkningen håller sig
//  under MAX_TILES (5 000) i offline-tiles.js.
//
//  Källa: ungefärliga bbox från Natural Earth / OSM, avrundade till 0.5°.
//  Defaults är overview-detalj — användaren kan utöka i modalen.
//
//  Designprinciper:
//   - sourceId pekar på en post i SOURCES-tabellen i offline-tiles.js.
//     Default = 'otm-osm-hybrid' (samma URL-mall som svensk cache).
//   - Inga API-nycklar i denna fil — tile-källan ska alltid vara nyckelfri
//     så att klient-JS inte läcker credentials.
//   - flag = unicode-emoji (renderas konsekvent på iOS/Android/desktop;
//     äldre Windows-WebViews visar SE/DK/etc. som textfallback).
// ─────────────────────────────────────────────────────────────────────────────

(function (global) {
    'use strict';

    var DEFAULT_SOURCE = 'otm-osm-hybrid';

    // Grunduppsättning: Sverige + 6 grannländer. Visas som knapprad i UI.
    // Sverige inkluderas så användaren har samma snabbflöde för "ladda hem
    // hela Sverige overview" som för grannländerna.
    var presets = {
        SE: {
            code: 'SE', label: 'Sverige', flag: '🇸🇪',
            bbox: { south: 55.0, west: 11.0, north: 69.5, east: 24.5 },
            defaultMinZoom: 6, defaultMaxZoom: 10,
            sourceId: DEFAULT_SOURCE,
            attribution: '© OpenTopoMap (CC-BY-SA)'
        },
        DK: {
            code: 'DK', label: 'Danmark', flag: '🇩🇰',
            bbox: { south: 54.5, west: 8.0, north: 58.0, east: 15.5 },
            defaultMinZoom: 7, defaultMaxZoom: 11,
            sourceId: DEFAULT_SOURCE,
            attribution: '© OpenTopoMap (CC-BY-SA)'
        },
        NO: {
            code: 'NO', label: 'Norge', flag: '🇳🇴',
            bbox: { south: 57.5, west: 4.0, north: 71.5, east: 31.5 },
            // Norge har stor nord-syd-utstrackning + Svalbard exkluderas.
            // Defaultas lagre min/max sa first-burst hamnar under cap.
            defaultMinZoom: 5, defaultMaxZoom: 9,
            sourceId: DEFAULT_SOURCE,
            attribution: '© OpenTopoMap (CC-BY-SA)'
        },
        FI: {
            code: 'FI', label: 'Finland', flag: '🇫🇮',
            bbox: { south: 59.5, west: 19.0, north: 70.5, east: 32.0 },
            defaultMinZoom: 6, defaultMaxZoom: 10,
            sourceId: DEFAULT_SOURCE,
            attribution: '© OpenTopoMap (CC-BY-SA)'
        },
        EE: {
            code: 'EE', label: 'Estland', flag: '🇪🇪',
            bbox: { south: 57.5, west: 21.5, north: 59.8, east: 28.5 },
            defaultMinZoom: 7, defaultMaxZoom: 11,
            sourceId: DEFAULT_SOURCE,
            attribution: '© OpenTopoMap (CC-BY-SA)'
        },
        LV: {
            code: 'LV', label: 'Lettland', flag: '🇱🇻',
            bbox: { south: 55.5, west: 20.5, north: 58.2, east: 28.5 },
            defaultMinZoom: 7, defaultMaxZoom: 11,
            sourceId: DEFAULT_SOURCE,
            attribution: '© OpenTopoMap (CC-BY-SA)'
        },
        LT: {
            code: 'LT', label: 'Litauen', flag: '🇱🇹',
            bbox: { south: 53.5, west: 20.5, north: 56.5, east: 27.0 },
            defaultMinZoom: 7, defaultMaxZoom: 11,
            sourceId: DEFAULT_SOURCE,
            attribution: '© OpenTopoMap (CC-BY-SA)'
        }
    };

    // Knapprad i UI:n — ordning vänster→höger.
    // Specens grunduppsättning är DK/NO/FI/EE/LV/LT (Sveriges grannländer).
    // SE finns kvar i presets-objektet ovan för API-konsumenter och som
    // fallback i "Andra länder"-listan, men visas inte som egen knapp
    // eftersom den befintliga "Spara område offline"-knappen redan täcker
    // Sverige (väljer nuvarande viewport, vilket nästan alltid är SE).
    var neighbors = ['DK', 'NO', 'FI', 'EE', 'LV', 'LT'];

    // "Andra länder"-listan — ~40 länder att välja bland när användaren
    // klickar på expandern. Bbox-källa: samma princip som ovan,
    // overview-detalj med default z 6–10 (eller lägre för stora ytor).
    // Lista i ungefärlig nord→syd, sedan väst→öst-ordning.
    var extras = [
        { code: 'IS', label: 'Island', flag: '🇮🇸',
          bbox: { south: 63.0, west: -25.0, north: 67.0, east: -13.0 },
          defaultMinZoom: 6, defaultMaxZoom: 10 },
        { code: 'GL', label: 'Grönland', flag: '🇬🇱',
          bbox: { south: 59.5, west: -73.0, north: 84.0, east: -10.0 },
          defaultMinZoom: 4, defaultMaxZoom: 7 },
        { code: 'FO', label: 'Färöarna', flag: '🇫🇴',
          bbox: { south: 61.3, west: -7.7, north: 62.5, east: -6.2 },
          defaultMinZoom: 8, defaultMaxZoom: 12 },
        { code: 'IE', label: 'Irland', flag: '🇮🇪',
          bbox: { south: 51.4, west: -10.5, north: 55.5, east: -5.5 },
          defaultMinZoom: 7, defaultMaxZoom: 10 },
        { code: 'GB', label: 'Storbritannien', flag: '🇬🇧',
          bbox: { south: 49.8, west: -8.5, north: 60.9, east: 1.8 },
          defaultMinZoom: 6, defaultMaxZoom: 9 },
        { code: 'NL', label: 'Nederländerna', flag: '🇳🇱',
          bbox: { south: 50.7, west: 3.3, north: 53.6, east: 7.3 },
          defaultMinZoom: 7, defaultMaxZoom: 11 },
        { code: 'BE', label: 'Belgien', flag: '🇧🇪',
          bbox: { south: 49.5, west: 2.5, north: 51.6, east: 6.5 },
          defaultMinZoom: 7, defaultMaxZoom: 11 },
        { code: 'LU', label: 'Luxemburg', flag: '🇱🇺',
          bbox: { south: 49.4, west: 5.7, north: 50.2, east: 6.6 },
          defaultMinZoom: 9, defaultMaxZoom: 13 },
        { code: 'DE', label: 'Tyskland', flag: '🇩🇪',
          bbox: { south: 47.2, west: 5.8, north: 55.1, east: 15.1 },
          defaultMinZoom: 6, defaultMaxZoom: 9 },
        { code: 'PL', label: 'Polen', flag: '🇵🇱',
          bbox: { south: 49.0, west: 14.1, north: 54.9, east: 24.2 },
          defaultMinZoom: 6, defaultMaxZoom: 9 },
        { code: 'BY', label: 'Vitryssland', flag: '🇧🇾',
          bbox: { south: 51.2, west: 23.1, north: 56.2, east: 32.8 },
          defaultMinZoom: 6, defaultMaxZoom: 9 },
        { code: 'UA', label: 'Ukraina', flag: '🇺🇦',
          bbox: { south: 44.3, west: 22.1, north: 52.4, east: 40.2 },
          defaultMinZoom: 5, defaultMaxZoom: 8 },
        { code: 'RU', label: 'Ryssland (västra)', flag: '🇷🇺',
          // Bara europeisk del — hela Ryssland är för stort för en burst.
          bbox: { south: 50.0, west: 27.0, north: 70.0, east: 60.0 },
          defaultMinZoom: 4, defaultMaxZoom: 7 },
        { code: 'FR', label: 'Frankrike', flag: '🇫🇷',
          bbox: { south: 41.3, west: -5.2, north: 51.1, east: 9.6 },
          defaultMinZoom: 5, defaultMaxZoom: 8 },
        { code: 'CH', label: 'Schweiz', flag: '🇨🇭',
          bbox: { south: 45.8, west: 5.9, north: 47.8, east: 10.5 },
          defaultMinZoom: 7, defaultMaxZoom: 11 },
        { code: 'AT', label: 'Österrike', flag: '🇦🇹',
          bbox: { south: 46.4, west: 9.5, north: 49.0, east: 17.2 },
          defaultMinZoom: 7, defaultMaxZoom: 10 },
        { code: 'CZ', label: 'Tjeckien', flag: '🇨🇿',
          bbox: { south: 48.5, west: 12.1, north: 51.1, east: 18.9 },
          defaultMinZoom: 7, defaultMaxZoom: 10 },
        { code: 'SK', label: 'Slovakien', flag: '🇸🇰',
          bbox: { south: 47.7, west: 16.8, north: 49.6, east: 22.6 },
          defaultMinZoom: 7, defaultMaxZoom: 11 },
        { code: 'HU', label: 'Ungern', flag: '🇭🇺',
          bbox: { south: 45.7, west: 16.1, north: 48.6, east: 22.9 },
          defaultMinZoom: 7, defaultMaxZoom: 10 },
        { code: 'RO', label: 'Rumänien', flag: '🇷🇴',
          bbox: { south: 43.6, west: 20.3, north: 48.3, east: 29.7 },
          defaultMinZoom: 6, defaultMaxZoom: 9 },
        { code: 'BG', label: 'Bulgarien', flag: '🇧🇬',
          bbox: { south: 41.2, west: 22.4, north: 44.2, east: 28.6 },
          defaultMinZoom: 7, defaultMaxZoom: 10 },
        { code: 'GR', label: 'Grekland', flag: '🇬🇷',
          bbox: { south: 34.8, west: 19.4, north: 41.8, east: 28.3 },
          defaultMinZoom: 6, defaultMaxZoom: 9 },
        { code: 'IT', label: 'Italien', flag: '🇮🇹',
          bbox: { south: 35.5, west: 6.6, north: 47.1, east: 18.5 },
          defaultMinZoom: 5, defaultMaxZoom: 8 },
        { code: 'ES', label: 'Spanien', flag: '🇪🇸',
          bbox: { south: 35.9, west: -9.5, north: 43.8, east: 4.4 },
          defaultMinZoom: 5, defaultMaxZoom: 8 },
        { code: 'PT', label: 'Portugal', flag: '🇵🇹',
          bbox: { south: 36.9, west: -9.6, north: 42.2, east: -6.2 },
          defaultMinZoom: 7, defaultMaxZoom: 10 },
        { code: 'HR', label: 'Kroatien', flag: '🇭🇷',
          bbox: { south: 42.4, west: 13.5, north: 46.6, east: 19.5 },
          defaultMinZoom: 7, defaultMaxZoom: 10 },
        { code: 'SI', label: 'Slovenien', flag: '🇸🇮',
          bbox: { south: 45.4, west: 13.4, north: 46.9, east: 16.6 },
          defaultMinZoom: 8, defaultMaxZoom: 11 },
        { code: 'RS', label: 'Serbien', flag: '🇷🇸',
          bbox: { south: 42.2, west: 18.8, north: 46.2, east: 23.0 },
          defaultMinZoom: 7, defaultMaxZoom: 10 },
        { code: 'BA', label: 'Bosnien-Herc.', flag: '🇧🇦',
          bbox: { south: 42.5, west: 15.7, north: 45.3, east: 19.7 },
          defaultMinZoom: 7, defaultMaxZoom: 10 },
        { code: 'AL', label: 'Albanien', flag: '🇦🇱',
          bbox: { south: 39.6, west: 19.2, north: 42.7, east: 21.1 },
          defaultMinZoom: 8, defaultMaxZoom: 11 },
        { code: 'TR', label: 'Turkiet', flag: '🇹🇷',
          bbox: { south: 35.8, west: 26.0, north: 42.1, east: 44.8 },
          defaultMinZoom: 5, defaultMaxZoom: 8 },
        { code: 'MD', label: 'Moldavien', flag: '🇲🇩',
          bbox: { south: 45.4, west: 26.6, north: 48.5, east: 30.2 },
          defaultMinZoom: 8, defaultMaxZoom: 11 },
        { code: 'GE', label: 'Georgien', flag: '🇬🇪',
          bbox: { south: 41.0, west: 40.0, north: 43.6, east: 46.7 },
          defaultMinZoom: 7, defaultMaxZoom: 10 },
        { code: 'CA', label: 'Kanada (södra)', flag: '🇨🇦',
          // Bara södra remsan — hela Kanada är för stort.
          bbox: { south: 42.0, west: -141.0, north: 60.0, east: -52.0 },
          defaultMinZoom: 4, defaultMaxZoom: 6 },
        { code: 'US', label: 'USA (kontinentala)', flag: '🇺🇸',
          bbox: { south: 24.5, west: -125.0, north: 49.5, east: -66.9 },
          defaultMinZoom: 4, defaultMaxZoom: 6 },
        { code: 'MX', label: 'Mexiko', flag: '🇲🇽',
          bbox: { south: 14.5, west: -118.4, north: 32.7, east: -86.7 },
          defaultMinZoom: 5, defaultMaxZoom: 8 },
        { code: 'AU', label: 'Australien', flag: '🇦🇺',
          bbox: { south: -43.7, west: 113.1, north: -10.7, east: 153.6 },
          defaultMinZoom: 4, defaultMaxZoom: 7 },
        { code: 'NZ', label: 'Nya Zeeland', flag: '🇳🇿',
          bbox: { south: -47.3, west: 166.3, north: -34.4, east: 178.6 },
          defaultMinZoom: 6, defaultMaxZoom: 9 },
        { code: 'JP', label: 'Japan', flag: '🇯🇵',
          bbox: { south: 30.0, west: 128.6, north: 45.6, east: 146.0 },
          defaultMinZoom: 6, defaultMaxZoom: 9 },
        { code: 'KR', label: 'Sydkorea', flag: '🇰🇷',
          bbox: { south: 33.1, west: 124.6, north: 38.7, east: 131.9 },
          defaultMinZoom: 7, defaultMaxZoom: 10 }
    ];

    // Default-attribution + sourceId for extras (samma som DEFAULT_SOURCE).
    extras.forEach(function (e) {
        e.sourceId = DEFAULT_SOURCE;
        e.attribution = '© OpenTopoMap (CC-BY-SA)';
    });

    function getPreset(code) {
        if (presets[code]) return presets[code];
        for (var i = 0; i < extras.length; i++) {
            if (extras[i].code === code) return extras[i];
        }
        return null;
    }

    function listAll() {
        var out = [];
        for (var i = 0; i < neighbors.length; i++) {
            out.push(presets[neighbors[i]]);
        }
        for (var j = 0; j < extras.length; j++) {
            out.push(extras[j]);
        }
        return out;
    }

    global.HVCountries = {
        DEFAULT_SOURCE: DEFAULT_SOURCE,
        presets: presets,
        neighbors: neighbors,
        extras: extras,
        getPreset: getPreset,
        listAll: listAll
    };
})(window);
