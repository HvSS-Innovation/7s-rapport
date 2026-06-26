# Topografi / höjddata för MINKARTA + SENSORSKISS

**Datum:** 2026-05-05
**Status:** Fas 1 KLAR (kod + UI + online-fallback). Fas 2 vänter på data-pipeline.

## Bakgrund

I online-läget visar `HybridTileLayer` automatiskt OpenTopoMap för z ≤ 17,
vilket innefattar höjdkurvor + hillshade. Det räcker för de flesta operativa
behov.

**Problemet:** I Härdat läge byts basemap mot `sverige.pmtiles` (Protomaps
Basemap-schema, ~4 GB). Det paketet innehåller bara vägar, byggnader, vatten
och landuse — **ingen topografi**. Operatören som litar på Härdat läge
tappar samtidigt höjdkurvorna, vilket är en kart-läsningsdefekt i fält.

Dessutom finns ingen **separat topografi-toggle** för online-läget — den
som vill ha topografi tydligare än OTM:s default kan inte få det.

---

## Designprinciper

1. **Utbytbar datakälla.** Adapter-mönster gör att Lantmäteriet/Copernicus/
   SRTM/NASA kan kopplas in utan UI-ändringar. Konfig i `SOURCES`-objektet
   i [topo-overlay.js](../topo-overlay.js).

2. **Lager ovanpå basemap, inte ersättning.** Topografin renderas som
   transparent overlay ovanpå nuvarande baskarta — fungerar både ovanpå
   OTM och ovanpå PMTiles-basemap.

3. **Opt-in.** Default AV. Knapp "Topografi" i samma rad som Härdat läge
   och Spara område offline.

4. **Säker default vid fel.** Om datafilen saknas eller laddningen
   misslyckas så återgår appen tyst till basemap-only utan att krascha.
   Tydlig konsol-logg.

5. **OPSEC-medveten.** Online-källor kräver opt-in-bekräftelse och varnar
   extra hårt om Härdat läge är på (eftersom toggle:n då bryter
   härdat-läge OPSEC).

6. **Inga API-nycklar i klientkoden.** Lantmäteriets WMS kräver konto;
   det fixas via en proxy-tjänst eller pre-baked PMTiles, inte via
   klient-side API-nyckel.

---

## Datakälla — bedömning

| Källa | Licens | Sverige | API-nyckel | Praktiskt | Beslut |
|---|---|---|---|---|---|
| Lantmäteriet TerrängGData | CC0 sedan 2021 | Full | Konto krävs | GeoTIFF→tiles-pipeline | **Fas 4** |
| **Copernicus DEM GLO-30** | **CC-BY 4.0** | **Full (även Treriksröset)** | **Nej** | 30m global | **Fas 2** |
| NASA SRTM-30 | Public Domain | **Bara till 60° N — saknar norra Sverige** | Nej | Beprövad | Avslås |
| OpenTopography API | Varierar | Global | Ja | Tile-API enkelt | Avslås |
| OTM-online overlay | CC-BY-SA | Global | Nej | Direkt klart, men bryter Härdat-OPSEC | **Fas 1 fallback** |
| EU-DEM | Free | Bra för EU | Konto krävs | Endast Europa | Avslås |
| Esri World Hillshade | Begränsad ToS | Global | Ja (sedan 2024) | Tidigare gratis, nu inte | Avslås |

**MVP-källa: OTM-online-overlay.** Det fungerar omedelbart utan ny datafil
och ger användaren topografi när de vill ha det. I Härdat läge varnas
de att overlay:n bryter OPSEC.

**Fas 2-källa: Copernicus DEM GLO-30** byggd till `sverige-hillshade.pmtiles`
via [verktyg/build-sverige-hillshade.md](../verktyg/build-sverige-hillshade.md).

---

## Roadmap

### ✅ Fas 1 — MVP (kod + UI + online-fallback)

**Mål:** Användare kan toggla på topografi-overlay. Default-källa är
online-OTM (tile.opentopomap.org) med opt-in OPSEC-varning.

**Levererat:**
- `topo-overlay.js` — controller med utbytbar datakälla (PMTiles raster
  eller online tile-template)
- Knapp "Topografi" i `minkarta.html` row2 + `sensorskiss.html` row2
- localStorage-state: aktiv/inaktiv + accepterade OPSEC-bekräftelser
  per källa
- Idempotens: dubbel-aktivering är no-op
- Säker fail: PMTiles-header inte läsbar → tyst fallback, inget krascher
- `service-worker.js` CACHE bumpad + `topo-overlay.js` i FILES
- Roadmap-dokument (denna fil)

**Filer ändrade:**
- `topo-overlay.js` (NY)
- `minkarta.html` (script-tag + setupTopoOverlay + topoBtn)
- `sensorskiss.html` (script-tag + setupTopoOverlay + topoBtn)
- `service-worker.js` (CACHE + FILES)
- `verktyg/build-sverige-hillshade.md` (NY — pipeline-doc för Fas 2)
- `audit/roadmap-topografi.md` (denna)

**Risker:**
- Online-OTM överlagrad ovanpå redan-OTM (i normalt läge) blir grötigt
  pga dubbla labels. Mitigation: opacity 0.55 → tunnt. Användaren får
  välja om de vill köra det dubbelt.
- Bryter Härdat läge om aktiverat där. Mitigation: extra varning i
  modal-confirm.

**Testning:**
- Smoke: `python -m http.server 8000` → öppna minkarta.html →
  klicka Topografi → modal visas → accept → OTM-overlay synlig
- Härdat-test: aktivera Härdat läge → klicka Topografi → varning visar
  "bryter Härdat OPSEC" → acceptera → overlay syns ovanpå PMTiles
- Persist-test: refresh page → overlay-state återställs

**Klart-kriterier:**
- ✅ Knapp syns i båda kart-sidorna
- ✅ Klick togglar overlay
- ✅ State sparas mellan sessions
- ✅ Härdat-varning visas vid behov
- ✅ Inga JS-fel i konsolen
- ✅ Service Worker accepterar nya filen

---

### Fas 2 — sverige-hillshade.pmtiles (offline-vänlig)

**Mål:** Topografi-overlay fungerar offline i Härdat läge — noll utgående
requests.

**Vad som krävs av användaren:**
1. Köra pipeline-skriptet i [verktyg/build-sverige-hillshade.md](../verktyg/build-sverige-hillshade.md)
2. Ladda upp `sverige-hillshade.pmtiles` till befintlig R2-bucket
3. Avkommentera `'sverige-hillshade'` i `topo-overlay.js` med rätt
   bytes/SHA-256
4. Byta `DEFAULT_SOURCE_ID` till `'sverige-hillshade'`
5. Commit + push

**Storleksuppskattning:** 150–400 MB beroende på maxzoom (z 5–13 räcker
för 30m DEM).

**Risker:**
- Stor fil → operatören måste pre-downloada den separat innan första
  fält-användning. UX: lägg in samma "Ladda ner offline"-mönster som
  Sverige-basemap har.
- R2-bandbredd om många laddar ner: minimal då bandbredd-cap är generös
  och filen cachas i SW efter första visit.

**Klart-kriterier:**
- DevTools → Network → Offline → topo-overlay fungerar för Sverige
- SHA-256 verifieras vid pre-download
- Cache-invalidering vid filstorleks-mismatch
- Inga utgående anrop när Härdat läge + topo-overlay är på

---

### Fas 3 — Per-område offline-cache av topo-tiles

**Mål:** "Spara område offline" cachar både basemap- och topo-tiles
för markerat område. Användbart om Fas 2-pmtiles är för stor för
operatörens enhet.

**Filer att ändra:**
- `offline-tiles.js`: utöka `enumerateTiles` att inkludera topo-tile-URL
  per zoomnivå
- `service-worker.js`: extra cache-namespace `hv-topo-tiles-v1` eller
  återanvänd `hv-offline-tiles-v1`

**Klart-kriterier:**
- Användare markerar område → laddar ner basemap + topo i ett svep
- Storleks-uppskattning visas korrekt
- Pause/resume fungerar för båda lagertyperna

---

### Fas 4 — Lantmäteriets höjdkurvor

**Mål:** Bytta MVP-källan mot Lantmäteriet TerrängGData för svenska
operatörer som vill ha högsta upplösningen.

**Vad som krävs:**
1. Konto hos Lantmäteriet (gratis för CC0-lager)
2. WMS-endpoint eller hämtning av råa höjdkurv-shapefiler
3. Pipeline: shapefile → MVT → PMTiles vector
4. Adapter i `topo-overlay.js`: ny `kind: 'pmtiles-vector'` med
   `LineSymbolizer` för höjdkurvor

**Risker:**
- Lantmäteriet kan kräva attribution-överlay som tar plats
- Shapefile-pipelines är knepigare än raster

---

## Q&A för framtida iteration

**F: Varför inte bara byta basemap till OTM i Härdat läge?**
S: Det skulle bryta hela poängen med Härdat läge — ingen utgående trafik.
Topo-overlay tillåter användaren att medvetet välja: bara basemap (full
OPSEC) eller basemap + topo (kompromis OPSEC).

**F: Varför opacity 0.55 för online-källor?**
S: Online OTM-tiles innehåller redan vägar, byggnader och labels — när
de läggs ovanpå PMTiles-basemap blir det dubbelvisning. 0.55 låter
PMTiles synas igenom så bara topografin förstärks. Värdet kan justeras
per källa i `SOURCES`.

**F: Varför är Mt Whitney med som demo?**
S: Att kunna testa mekanismen omedelbart utan att Joel måste bygga
sverige-hillshade.pmtiles först. Pan:a till lat 36.58, lng -118.29,
z 12 → klicka Topografi (efter att ha bytt SOURCE_ID via konsol:
`MK_TOPO.setSource('mt-whitney-demo')`) → overlay syns.

**F: Räcker 30 m DEM-upplösning?**
S: För kart-läsning på operativ nivå (z 5–13): ja. Operatören jobbar
oftast med 1:50 000-skala, där 30 m motsvarar 0,6 mm på papper. För
finare nivå (z 14–15) krävs Lantmäteriets 2 m eller LiDAR-data —
det är Fas 4.

---

## Referenser

- Copernicus DEM: https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model
- OpenTopoMap (CC-BY-SA): https://opentopomap.org/about
- Lantmäteriet öppen data: https://www.lantmateriet.se/sv/geodata/vara-produkter/oppna-data/
- PMTiles raster spec: https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md
- protomaps-leaflet rasterLayer: https://github.com/protomaps/protomaps-leaflet
