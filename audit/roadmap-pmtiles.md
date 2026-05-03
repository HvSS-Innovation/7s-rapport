# Roadmap — PMTiles offline-kartor (Härdat läge)

**Datum:** 2026-05-03
**Förhållande till andra roadmaps:**
- `audit/roadmap.md` Sväng 3.1 — den ursprungliga PMTiles-idén.
- `audit/roadmap-offline-karta.md` — per-områdes-cache via Cache API
  (befintlig "Spara område offline"). Fortsätter fungera parallellt med
  PMTiles; PMTiles är en mer drastisk lösning för "hela Sverige offline,
  noll utgående anrop".
- `audit/roadmap-kamuflage-nedladdning.md` — kamuflage-funktionen som
  byggdes och kopplades bort efter beslut att inte stöta sig med OSM.
  PMTiles löser samma OPSEC-problem (dölj position från tile-server)
  utan att bryta mot någon ToS — det är "rätt" sättet.

---

## Vad löser PMTiles?

**Problem.** Varje gång kartan visas i fält skickas tile-requests till
`*.tile.opentopomap.org` eller `tile.openstreetmap.org`. Det avslöjar
operatörens position till tile-leverantörens IP-logg, ungefär ±1 km
precision. Existerande "Spara område offline" minskar problemet — efter
nedladdning används cachen — men nedladdningen själv är synlig, och man
måste förbereda *innan* fält. För "akut" eller "förflytta sig okänd
sträcka" är det otillräckligt.

**Lösning.** Pre-bygda `.pmtiles`-arkiv som hostas som statiska filer. En
`.pmtiles` är ett självständigt arkiv med alla tiles för ett område,
indexerade så att HTTP Range-requests kan plocka ut enstaka tiles vid
behov. Klienten cachar dem lokalt vid första visning. Efter förladdning är
**utgående anrop = 0** för all kart-visning inom området — inga
tile-server-loggar, ingen IP-läckage.

Format-spec: <https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md>

---

## Designprinciper

1. **Same-origin eller känd statisk host.** PMTiles-filerna ska hostas på
   en host vi kontrollerar — samma origin som sajten (7srapport.com via
   GitHub Pages) eller GitHub Releases. Ingen tredjepart-CDN som kan se
   vilka tiles som hämtas.

2. **Vanilla JS + samma build-stil som resten.** Inga build-steg på
   sajten. PMTiles-klienten är en enda self-hostad JS-fil i `vendor/`.

3. **Samma look som existerande karta.** OSM-data renderad till raster-
   tiles med samma skala/zoom som befintliga `tile.openstreetmap.org`. På
   sikt kan vi byta till vector-tiles (MapLibre GL) men det är en stor
   refactor. För Fas 1 är det raster-tiles via `L.GridLayer`, drop-in.

4. **Opt-in.** PMTiles är inte default — vanlig OTM/OSM via nät körs som
   tidigare. Användaren slår på "Härdat läge" via en toggle. När det är
   på används bara PMTiles, inga utgående tile-requests alls.

5. **Inget licens-problem.** OSM-data har ODbL — fri att använda så länge
   attribution finns kvar. Vår karta visar redan "© OpenStreetMap" — det
   räcker. Lantmäteriet TerrängGData är CC0 (sedan 2021) men kräver
   konvertering från GeoTIFF → tiles, vilket är en separat pipeline.
   Default för Fas 1: **OSM via Geofabrik**.

---

## Öppna design-frågor (kräver beslut innan Fas 2)

### Q1. Hosting av PMTiles-filerna?

Filstorlek: ~50 MB Sverige-low (z 5–10), ~150 MB per hi-zoom-region
(z 11–14). Kanske ~50 MB Stockholm-detalj (z 11–15) som första region.

Alternativ:

| Alternativ | Pros | Cons |
|---|---|---|
| **GitHub Pages (samma repo)** | Inget extra konto, samma origin | Hård 100 MB filgräns, 1 GB repo mjuk, bandbredd-cap (oklar). Sverige-low + en region funkar; flera regioner sprängar. |
| **GitHub Releases** | 2 GB per fil, samma kontoinfra, range-requests fungerar | Annan domän (`github.com/.../releases/download/...`) — CORS måste verifieras. |
| **Cloudflare R2** | 10 GB gratis storage, generös bandbredd, snabb | Nytt konto, kräver setup, monetärt risk om trafik exploderar. |
| **Bunny CDN / Backblaze B2** | Billigt | Nytt konto. |
| **Egen server** | Full kontroll | Drift-overhead, ny attackyta. |

**Min rekommendation:** GitHub Releases. Kostnadsfritt, samma kontoinfra
som sajten, väl beprövad för PMTiles av andra projekt (protomaps.com,
Felt, m.fl.). Filerna lagras under
`github.com/gitjoda71/7s-rapport/releases/download/pmtiles-v1/...` —
versionerade via release-taggar.

**ÖPPEN FRÅGA till användaren.** Vilket alternativ?

### Q2. Vilka regioner?

Sverige uppdelat i något av:

a) **Hela landet i en fil, z 5–13.** Typ ~250 MB. Inom GitHub Releases
   2 GB-cap. Enklare UX (ingen region-väljare).
b) **Sverige-low (z 5–10) + 4–5 hi-zoom-regioner (z 11–15).** Operatören
   väljer region efter behov. Sammanlagt ~600 MB om alla laddas, ~200 MB
   för low + en region.
c) **Bara hela Sverige z 5–14 i en fil.** ~400 MB, kompromiss.

**Min rekommendation:** börja med (a) eller (c) — en fil, en download,
enklast. Splittra senare om filen blir besvärlig.

**ÖPPEN FRÅGA till användaren.** Vilken granularitet?

### Q3. Hur initieras nedladdningen?

PMTiles-formatet behöver INTE ladda ner hela filen — Range-requests
plockar ut enstaka tiles vid behov. Men för **äkta offline-läge** måste
filen vara helt cachad i webbläsaren. Två modeller:

a) **On-demand range-requests.** Klienten hämtar bara de tiles
   användaren faktiskt tittar på. Cachas i Cache API. Efter använd-en-gång
   syns området offline. Men första gången kräver nät → samma OPSEC-läckage
   som idag.
b) **Pre-download hela filen.** Knapp "Ladda ner Sverige (250 MB)" som
   hämtar hela `.pmtiles` till Cache API. Efter det är allt offline,
   inkl. områden användaren aldrig sett. Stor men engångskostnad.
c) **Hybrid.** Pre-download Sverige-low (50 MB), hi-zoom on-demand.
   Användaren ser översikt utan nät, detaljer kommer när de besöks
   (med online).

**Min rekommendation:** (b) — det är hela poängen med "Härdat läge". On-
demand försvagar OPSEC-egenskaperna. Pre-download gör att operatören kan
slå på flygplansläge och pan:a fritt.

**ÖPPEN FRÅGA.** Pre-download default eller ska användaren välja?

---

## Faserad plan

### Fas 1 — Klient-stöd (kan byggas direkt, oberoende av hosting)

**Mål.** PMTiles-klient i sajten + UI-toggle "Härdat läge" som
fungerar mot vilken som helst PMTiles-URL. Testbart mot publika
demonstrations-PMTiles (protomaps.com erbjuder gratis OSM-globala filer
för testing).

**Konkret.**
- `vendor/pmtiles/pmtiles.js` — self-hostad pmtiles@3 klient (~30 KB).
  Källa: <https://github.com/protomaps/PMTiles> npm-paket
  `pmtiles@3.x.x`, build:ad UMD-version.
- `pmtiles-layer.js` — Leaflet-adapter:
  - `PMTiles.Layer(url, opts)` — extends `L.GridLayer`.
  - `getTile(coords, done)` — kallar `pmtiles.getZxy(z, x, y)` och
    konverterar binär tile-data till `<img>`.
  - In-memory cache av Range-request-headers så vi inte hämtar samma
    block flera gånger.
- UI-toggle:
  - I `renderMapControls()` i `minkarta.html` och `sensorskiss.html`
    lägg en **"🛡 Härdat läge"**-knapp.
  - När på: byt aktiv tile-layer från OTM till PMTiles. Visa banner i
    kart-headern: "Härdat läge — inga utgående tile-requests".
  - När av: vanlig HybridTileLayer (som idag).
  - Persistera state i localStorage (`pmtiles.hardened`).
- Pre-download-knapp i `<details class="about" id="offlineAreasPanel">`:
  - "Ladda ner Sverige offline (~250 MB)" — hämtar hela PMTiles-filen
    i bakgrunden via befintliga `startJob`-systemet (om det går att
    återanvändas) eller via en ny dedikerad funktion.
  - Storage-headroom-check (samma som offline-tiles.js).
  - Progress-pille via samma jobs-bar som offline-tiles.

**Klart-kriterium Fas 1.**
1. Lägg en demo-PMTiles-URL i konfig (kan vara `https://demo-bucket.protomaps.com/v3.pmtiles`).
2. Slå på "Härdat läge" → kartan visas via PMTiles. Inga requests till
   `tile.opentopomap.org`/`tile.openstreetmap.org`.
3. Slå av → tillbaka till OTM/OSM som vanligt.
4. Inga regressioner i existerande "Spara område offline" eller
   coverage-pille:n.

**Ej klart i Fas 1:** ingen pre-download (kommer i Fas 2 när hosting är
löst). Bara on-demand range-requests mot demo-URL.

### Fas 2 — Hosting + pre-download (kräver Q1+Q2+Q3 besvarade)

**Mål.** Riktig PMTiles-fil med svensk täckning hostad på vald plats,
plus pre-download-knapp som fyller Cache API.

**Konkret.**
- Skapa pipeline-dokumentation `audit/pmtiles-build.md` med exakta
  tippecanoe + pmtiles-CLI-kommandon.
- Bygg `sverige.pmtiles` (eller motsvarande granularitet enligt Q2).
- Hosta på vald plats (Q1).
- I `pmtiles-layer.js`: byt `DEMO_URL` → riktig URL.
- Pre-download-knappen aktiveras (Q3) — antingen som default-flow när
  härdat läge slås på, eller som separat opt-in.
- CORS-headers på hosting-platsen verifieras (om det inte är same-origin).

### Fas 3 — Vector tiles (overstretch, kanske aldrig)

**Mål.** Använd `MapLibre GL` istället för Leaflet raster-tiles för:
- Mindre filer (~10× mindre vid samma zoom-range).
- Crisper rendering vid alla zoom-nivåer.
- Möjlighet att stylea om kartan (t.ex. mörkningsläge för natt).

**Cons.** Stor refactor — Leaflet är djupt integrerat i alla sju kart-
sidor. Symboler, koordinater, kart-modal-händelser — allt behöver portas.

**Status.** Bara nämnd som möjlig. Inte planerad.

---

## Risk-lista

| Risk | Påverkan | Mitigation |
|---|---|---|
| Range-requests blockas av host | Klient kan inte hämta tiles | Verifiera Range-stöd hos vald host innan Fas 2 commit. GitHub Releases och Pages stöder båda. |
| CORS-blocked vid cross-origin host | Tiles laddas inte | Same-origin (Pages) är säkrast. För Releases: verifiera CORS-headers. |
| 100 MB GitHub Pages-gräns | Kan inte hosta filen där | Använd Releases istället. Eller dela upp filen. |
| Repo-storlek växer för mycket | Git clone blir tungt | PMTiles-filer ska INTE committas i Git — bara i Releases/extern host. Lägg `*.pmtiles` i `.gitignore`. |
| pmtiles-CLI funkar inte på Windows | Build-pipeline blockerad | `pmtiles convert` har Windows-binär; tippecanoe via Docker eller WSL. |
| Användarens enhet har < 250 MB ledigt | Pre-download misslyckas | Storage-estimate-check (samma mönster som offline-tiles.js). |
| OSM-data är inaktuell | Kart-fel | Bumpa PMTiles-fil periodiskt (kvartal?). Versionera filnamnet (`sverige-2026-Q2.pmtiles`). |
| pmtiles@3 har breaking change i framtiden | Klient slutar funka | Self-hostad version, vi bumpar manuellt. SRI eller integritets-check vid uppgradering. |

---

## Konventioner som följs

- Inga nya beroenden i `package.json` (vi har ingen). pmtiles@3 hostas
  som static vendor-fil.
- Vanilla JS, samma stil som `offline-tiles.js`.
- Kommentar-WHY, inte WHAT. Inga emojis i kod.
- Commit-meddelanden på svenska: `feat(pmtiles): ...`.
- Aldrig `--no-verify`/`--amend` på publicerade commits.
- CI bumpar `service-worker.js` `CACHE`-stämpeln.
- Lägg `pmtiles-layer.js` och `vendor/pmtiles/pmtiles.js` i SW
  `FILES`-arrayen så de precachas vid install.
- `*.pmtiles` läggs i `.gitignore` — filerna ska aldrig in i Git.

---

## Vad denna roadmap INTE löser

- **Symbol/anteckning-data** kommer fortfarande att speglas i nät-
  beroende API:er (Nominatim/Overpass för adress-uppslag) — orelaterat
  problem.
- **Lantmäteriet-data** är inte med i Fas 1 — bara OSM. Lantmäteriet
  TerrängGData kan komma som Fas 4 om det blir efterfrågat.
- **Bandbredd-kostnad** för hosting — om appen får hundratals användare
  som varje laddar ner 250 MB blir det signifikant trafik. GitHub Pages
  har "fair use", Releases mer generöst, R2 räknar exakt. Q1-beslutet
  påverkar detta.
