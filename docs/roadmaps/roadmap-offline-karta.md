# Roadmap — Offline-karta (per-användares tile-cache)

**Datum:** 2026-05-03
**Förhållande till `audit/roadmap.md`:** Sväng 3.1 där föreslår PMTiles-bundles
hostade på 7srapport.com som "Härdat läge". Den här roadmapen är komplementär:
en lättare lösning där användaren själv markerar ett område (bbox + zoom-range)
och appen laddar ner tiles via Cache API till en separat namespace
(`hv-offline-tiles-v1`). Inga nya servrar, ingen central PMTiles-bundle —
men kräver att användaren har online-uppkoppling minst en gång före fältet.

PMTiles-spåret är fortfarande rätt val för "Sverige hela landet utan
förladdning per operatör" — den här lösningen är "förladda området jag faktiskt
ska in i" och funkar för dagens MVP.

---

## Designprinciper

1. **Same-origin-cache.** Cache API är same-origin per default. Tile-svaren
   kommer från `*.tile.opentopomap.org` och `tile.openstreetmap.org` — alltså
   cross-origin — men de cachas under same-origin (vår SW) och kan inte
   läsas av tredje part. Vi använder `mode: 'cors'` (inte `no-cors`) så att
   svaren är icke-opaque och `safePut` kan filtrera på `resp.ok`.

2. **Separat cache-namespace.** `hv-offline-tiles-v1` får aldrig rensas av SW:ns
   `activate`-cleanup (som idag rensar allt utom `CACHE`-stämpeln). En explicit
   undantagslista i `activate`-handlern bevarar offline-cachen vid deploy.

3. **Tile-server-respekt.**
   - **OpenStreetMap Tile Usage Policy** (openstreetmap.org/copyright →
     "Tile usage policy"): "Heavy use (e.g. distributing an app that uses
     tiles from openstreetmap.org) is forbidden without prior permission."
     Bulk-nedladdning är uttryckligen **inte** tillåten.
   - **OpenTopoMap** (opentopomap.org/about): begränsad kapacitet, ber att
     man inte bulk-laddar.
   - **Vår mitigation:**
     - Hård cap: max **5 000 tiles per nedladdningssession**.
     - Throttling: max **2 parallella requests**, ~100 ms paus mellan.
     - Tydlig varning i UI:n: "Detta laddar ner kart-tiles från externa
       servrar. Använd sparsamt — tile-leverantörerna har begränsad
       kapacitet. För större områden, fråga om PMTiles-stöd."
     - Räknare visas innan nedladdning startar; >50 MB kräver extra
       bekräftelse, >5 000 tiles är blockerat.
     - Inga retries vid HTTP 4xx/5xx — visa fel och stoppa, så att
       leverantörens rate limit eller fel inte triggar massupprepningar.
     - Behåll befintlig `Referer`-policy (`strict-origin`) så
       OpenTopoMap inte throttlar oss.
   - Ingen automatisk förladdning utan explicit klick.

4. **OPSEC-konsekvenser av nedladdning.**
   - När användaren markerar ett område och klickar "Spara offline" så går
     hela bbox:ens tile-uppsättning till tile-leverantören i en burst.
     Det är ett **starkare** position-läckage än normal pan/zoom (motståndare
     med tile-server-loggar ser exakt området operatören kommer att verka i).
   - **Mitigation i UI:n:** samma OPSEC-banner som idag, plus en extra rad i
     modal-en: "Nedladdningen avslöjar valt område för tile-servern. Gör
     den från en annan plats än den ni ska in i, helst på annat nät."
   - Lokalt cache:t är same-origin och försvinner när användaren kör
     "Glöm allt" (sväng 1.5).

5. **Vanilla JS, inga nya beroenden.** Modulen `offline-tiles.js` skrivs i
   samma stil som befintliga `minkarta-export.js` / `opsec.js`. Använder
   bara Cache API, `fetch`, och Leaflet:s redan inkluderade `L.LatLng`/`L.Map`.

---

## Fas 1 — MVP (push idag) — ✅ LEVERERAD 2026-05-03 (`cc3aed5`)

**Mål:** Användaren kan markera nuvarande viewport, ladda ner tiles, slå på
flygplansläge, och se kartan i `minkarta.html`.

- Ny modul `offline-tiles.js` i repo-roten med:
  - `OFFLINE_CACHE = 'hv-offline-tiles-v1'`.
  - `tileUrlsForBbox(bounds, minZoom, maxZoom)` → räkna ut alla `(z,x,y)`
    och returnera URL-array (samma URL-mönster som `HybridTileLayer.getTileUrl`,
    inkl. subdomän-rotation a/b/c för OTM).
  - `estimateBytes(count)` → snittbyte/tile (start: 18 kB) × count.
  - `downloadTiles(urls, { onProgress, signal })` med max 2 parallella,
    100 ms throttle, fail-fast vid icke-2xx, ingen retry.
  - `getStoredAreas()` / `saveAreaMeta(area)` — JSON-array i `localStorage`
    med fält `{ id, label, bbox, minZoom, maxZoom, tileCount, bytes, savedAt }`.
- Ny knapp i `renderMapControls()` i `minkarta.html`: **"Spara område offline"**.
- Modal med:
  - Visuell sammanfattning av nuvarande bbox (NW/SE i lat/lon).
  - Två sliders: minZoom (default = nuvarande - 1, min 8) och maxZoom (default
    = nuvarande + 1, max 17 om OTM, 19 om OSM).
  - Live tile-räknare och MB-uppskattning.
  - Cap-varningar:
    - tiles ≤ 1 000: knapp aktiv.
    - 1 000 < tiles ≤ 5 000: knapp aktiv, varning i orange.
    - tiles > 5 000: knapp blockerad, fel-text.
    - >50 MB → extra checkbox "Jag förstår storleken".
  - Tydlig OPSEC-rad om position-läckage.
- Progress-bar med Avbryt-knapp (AbortController). Visar "X / Y tiles, Z MB,
  N fel".
- Service worker:
  - I `activate`: behåll både `CACHE` (huvudcache) **och** `OFFLINE_CACHE` —
    rensa övriga.
  - I `fetch`: om request är till `*.tile.opentopomap.org` eller
    `tile.openstreetmap.org` — kolla `OFFLINE_CACHE` först, sedan vanlig
    cache-first med `safePut` mot huvudcache.
- `offline-tiles.js` läggs till i SW `FILES`-arrayen.
- `.about`-panelen i `minkarta.html` får en tredje punkt:
  > Lokal offline-cache. När du klickar "Spara område offline" laddas
  > tile-bilderna ner till webbläsarens egna cache (Cache API). Bilderna
  > stannar på enheten, ingen tredje part kan läsa dem. Cachen tas bort av
  > "Glöm allt"-knappen.

**Klart-kriterium:**
1. I online-läge: markera bbox runt ett område, klicka "Spara offline",
   vänta på 100 % progress.
2. Slå på flygplansläge i devtools (Network → Offline).
3. Reload `minkarta.html`. Pan inom området → tiles syns; pan utanför →
   grå rutor.

## Fas 2 — Per-område-hantering (denna vecka) — ✅ LEVERERAD 2026-05-03 (`d1bf9b0` + `ebc3103` enhetlig coverage-pille i alla sju kartor)

- Samma "Spara offline"-knapp i `sensorskiss.html` (delar `offline-tiles.js`).
- Lista av sparade områden i en `<details class="about">`-panel:
  etikett (auto-genererad: ortnamn via Nominatim om online, annars
  bbox-snippets), datum, zoom-range, bytes.
- Radera-knapp per område (rensar bara dess tiles ur `OFFLINE_CACHE`).
- Visuell indikator i status-raden: "📦 100% offline" (när hela viewporten
  finns i cache) / "📦 38%". Ej emoji i finalen — använd text + ikon.
- Migrera `localStorage`-listan till IndexedDB om vi närmar oss 5 MB
  (osannolikt, men metadata växer linjärt).

## Fas 3 — Underhåll (om tid finns) — ✅ LEVERERAD 2026-05-03 (Fas 3a `ad88aa0`: uppdatera-område + bakgrundsläge med flytande progress-pill. Fas 3b `54e34bf`: export/import av `.hvoffline`-paket)

- Auto-uppdatera tiles äldre än X dagar (default 30) — bara när användaren
  manuellt klickar "Uppdatera område".
- Export/import av offline-paket: JSON-manifest + tile-blob (binärt — t.ex.
  en `.tar`-liknande egen serialisering). Möjliggör att en operatör laddar
  ner ett paket på sin hemma-WiFi och delar med trupp via lokal överföring.
- Headless förladdning: Web Worker eller `requestIdleCallback`-kö så att
  UI inte blockeras vid stora downloads.

## Fas 4 — Vector tiles (overstretch)

- Stöd för MBTiles eller PMTiles-format (det `audit/roadmap.md` Sväng 3.1
  också föreslår). Kräver ny renderer (vektor-bas, t.ex. MapLibre GL).
  Hög arkitektur-kostnad — utvärderas separat.

---

## Risker

| Risk | Påverkan | Mitigation |
|---|---|---|
| Webbläsarens cache-quota slår till | Nedladdning misslyckas tyst i mitten | Kolla `navigator.storage.estimate()` före start, varna om < 2× beräknad storlek; visa fel om `caches.put` kastar `QuotaExceededError`. |
| Tile-server rate-limitar (HTTP 429) | Massiv burst, ev. ban | Fail-fast vid 4xx, ingen retry; max 2 parallella; 100 ms paus. |
| Användaren stänger fliken mid-download | Cache delvis fylld; metadata aldrig sparad | Spara metadata efter varje 50:e tile, inte bara vid slut. Lista även "halvfärdiga" områden. |
| Korrupta tiles (avbruten transfer som ändå cache:as) | Skadade kart-bilder syns offline | `safePut` cachar bara `resp.ok`; reuse:a samma kontroll i `offline-tiles.js`. |
| OPSEC: bulk-download avslöjar område | Tile-server-logg ser hela operationsområdet | UI-banner; rekommendera annan plats/nät för nedladdning. |
| Om `OFFLINE_CACHE`-namnet ändras: tiles försvinner | Fältet utan kartor | Versionera explicit; bumpa bara om format ändras. |

---

## Test-plan

1. **DevTools → Network → Offline:** efter download, reload sida, verifiera
   att tile-requests serveras från SW (Size = "(ServiceWorker)"), Status 200.
2. **Throttling 3G:** download fortfarande slutförs på rimlig tid (5–10 min
   för 1 000 tiles).
3. **Reload mid-download:** progress avbryts, metadata för vad som faktiskt
   hann cache:as är konsistent.
4. **Avbryt-knapp:** AbortController stoppar pågående requests inom 1 sek.
5. **Cap-block:** välj område som ger > 5 000 tiles → spara-knapp blockerad.
6. **PWA-installation:** efter installation som hemskärms-app, samma flöde.
7. **Glöm-allt:** efter knapptryck → `caches.has('hv-offline-tiles-v1')` är
   `false`, alla områden borta.
8. **Cross-page:** efter Fas 2, tiles sparade från `minkarta.html` är
   tillgängliga i `sensorskiss.html`.
9. **Regressioner:** kartmodalerna i `index/ah/scrim/what/weft/obslosa` och
   väder-kartan öppnas och visar kartor som vanligt.
10. **Cap "Sväng 1.5 — Glöm allt":** när den knappen byggs (separat
    feature) måste den explicit rensa även `OFFLINE_CACHE` — lägg
    test-stickprov.

---

## Konventioner som följs

- Inga nya beroenden. Vanilla JS, samma stil som `minkarta-export.js`.
- Kommentar-WHY, inte WHAT. Inga emojis i kod.
- Commit-meddelanden på svenska: `feat(offline): ...`.
- Aldrig `--no-verify`/`--amend` på publicerade commits.
- CI bumpar `service-worker.js` `CACHE`-stämpeln — vi rör den inte.
- Alla nya filer läggs till i SW `FILES`-arrayen.

---

## Beslutsloggar

- **Cache API vs IndexedDB för tile-data:** Cache API valt. Tile-svar är
  Response-objekt, vilket Cache API är designat för. SW kan svara direkt
  från Cache API (inga extra deserialiserings-steg). IndexedDB bättre om
  vi ville lagra binärt i form av Blobs med extra metadata, men det är
  överarbete för MVP.
- **Egen cache-namespace vs huvud-CACHE:** egen krävs eftersom huvudcachen
  rensas vid varje deploy via `activate`-cleanup.
- **Throttling-värden 2 parallella / 100 ms:** konservativt val baserat på
  OSM:s tile usage policy ("no more than two download threads"). Bevarar
  marginal mot OpenTopoMap som har lägre kapacitet än OSM.
- **5 000 tile-cap:** ungefär 100 MB vid 20 kB/tile. Större områden bör
  hanteras via PMTiles (Sväng 3.1) eller dela upp i flera nedladdningar.
