# Roadmap — Kamuflage-nedladdning + beskär till verkansområde

**Datum:** 2026-05-03
**Förhållande till `audit/roadmap-offline-karta.md`:** Den roadmapen löser
"förladda området jag faktiskt ska in i" med en hård cap på 5 000 tiles per
nedladdning och konservativ throttling (2 parallella, 100 ms paus). Den här
roadmapen är ett **akut OPSEC-verktyg** — inte en standard-feature — som
medvetet bryter samma regler för att lösa ett annat problem: **att dölja
VAR ni ska verka**, inte att dölja ATT ni laddar ner kartor.

Funktionen är ett komplement, inte en ersättning. Den vanliga "Spara område
offline" behåller sin försiktiga 5 000-tile-cap. Den nya knappen
"Kamuflage-nedladdning" har en separat höjd cap (30 000 tiles ≈ 600 MB) och
en tydlig hot-modell-varning i UI:n.

---

## Hot-modell

**Vem motståndaren är.** Någon med tillgång till tile-leverantörens IP-loggar
(OpenTopoMap, OpenStreetMap, eller en MITM på vägen dit). Antingen genom
juridisk begäran, intrång, samarbete, eller egen drift av tile-server.

**Vad de kan se.** Vid en vanlig "Spara område offline" på 5 000 tiles ser de
en burst på exakt det område operatören tänker verka i — en mycket precis
indikator. Om burst:en kommer från operatörens vanliga IP är det ekvivalent med
"jag ska in i ruta X imorgon".

**Vad det här löser.** Operatören laddar ner ett mycket större område som
omsluter verkansområdet (t.ex. 50×50 km) plus stora "decoy"-zoner. Sedan
beskärs cachen lokalt till bara verkansområdet. Tile-leverantörens logg ser
bara den stora regionen — inte det specifika delområdet operatören slutligen
behåller.

**Vad det INTE löser.**
- **Att en download skedde alls.** Tile-leverantören ser fortfarande
  operatörens IP och att ett bulk-download gjordes från den. Om det är
  ovanligt jämfört med operatörens vanliga trafik är *själva eventet*
  redan en signal.
- **IP-läckage.** Utan VPN/Tor är operatörens IP synlig. Utan att byta
  IP/nät har funktionen begränsat värde.
- **Tidskorrelation.** En download timad nära ett verkligt event kan
  korreleras med andra signaler.
- **Tile-server-loggens fingeravtryck.** User-Agent, Accept-Language,
  TLS-handshake-mönster, request-tider — allt kan användas för att
  re-identifiera en operatör mellan downloads.

**Operativa krav.**
- Kör nedladdningen från **annat nät** än det ni brukar (publik café-WiFi,
  hotspot via brännar-SIM, gästnät hos någon orelaterad).
- Använd **VPN eller Tor** ovanpå det.
- **Inte i närheten av verkansområdet** geografiskt eller tidsmässigt.
- **Beskär lokalt** så att enheten i fält bara har det område som
  faktiskt behövs — om enheten tappas eller forensiseras avslöjar
  cachen exakt verkansområdet annars.

Funktionen rekommenderar dessa steg i UI:n. Den **kan inte upprätthålla**
dem — det är upp till operatören.

---

## Tile-server-policy — medvetet brott

OpenStreetMaps `Tile Usage Policy` är glasklar:
> Heavy use (e.g. distributing an app that uses tiles from openstreetmap.org)
> is forbidden without prior permission. (...) No more than two download
> threads.

OpenTopoMap har lägre kapacitet än OSM och ber uttryckligen att man inte
bulk-laddar.

**Att höja cap över 5 000 är ett medvetet brott** mot deras serviceavtal.
Det är försvarbart bara i akuta operativa situationer där alternativet —
att förlita sig på online-tiles i fält — är ett större OPSEC-problem.
Långsiktig lösning är **PMTiles** (`audit/roadmap.md` Sväng 3.1) eller
**egen tile-proxy** (`audit/security.md` §3) — inte att bygga ut den här
funktionen.

UI:n måste vara explicit:
- Knappen heter **"Kamuflage-nedladdning"**, inte t.ex. "Stort område".
- Modal-en har en gul OPSEC-banner högst upp som upprepar hot-modellens
  begränsningar.
- En extra checkbox "Jag förstår att detta överträder tile-leverantörens
  policy och måste användas via VPN/annat nät" krävs innan start.
- Default-throttling är **lägre** än vanliga "Spara område offline" — 1
  parallell, 500 ms paus — för att burst-signaturen inte ska vara lika
  igenkännlig som en typisk app-download.

---

## Faserad plan

Varje fas är en **shippbar skiva**. En push i slutet ger något konkret
användbart även om senare faser uteblir.

### Fas 1 — MVP *(LEVERERAD 2026-05-03)*

**Mål.** Användaren kan trigga en kamuflage-nedladdning av ett område
flera mil i diameter, se progress, vänta på 100 %, slå på flygplansläge
och pan:a fritt över hela det stora området.

**Konkret.**
- Ny knapp **"Kamuflage-nedladdning"** i `renderMapControls()` i
  `minkarta.html`, direkt efter "Spara område offline".
- Ny entry-point `OfflineTiles.openKamuflageModal(map)` i
  `offline-tiles.js`. Återanvänder all infrastruktur.
- Modal:
  - **Gul OPSEC-banner högst upp:**
    > Bulk-download. Tile-leverantörens IP-logg ser exakt vilken region
    > som laddades ner. Funktionen döljer var ni ska verka, inte att
    > nedladdningen sker. **Kör via VPN/Tor från ett annat nät, helst
    > från en annan plats än verkansområdet.**
  - Bbox-val: nuvarande vy-centrum + en **skala-slider 1×–20×**
    (1× = nuvarande viewport, 20× ≈ 200×200 km). Pragmatiskt val
    framför drag-tooling i Fas 1 — drag/koordinat-input övervägs i Fas 2.
  - Zoom-spann: min 6, max 17 (default 9–13). Vid hög max-zoom sprängs
    30 000-cap:en snabbt — användaren får då minska skala. Cap:en sköter
    säkerheten; default är konservativ men taket är samma som vanliga
    "Spara område offline".
  - Live tile-räkning + storleksuppskattning.
  - Storage-check via `navigator.storage.estimate()` — varna om
    `quota - usage < 1.5 × beräknad storlek`.
  - Hård cap **`BULK_MAX_TILES = 30000`** (~600 MB vid 20 kB/tile). Vid
    över: knapp blockerad.
  - Två obligatoriska checkboxes:
    1. *"Jag förstår att tile-leverantören ser denna nedladdning"*
    2. *"Jag använder VPN/Tor och annat nät än verkansområdet"*
- Konstanter:
  ```
  BULK_MAX_TILES   = 30000;
  BULK_PARALLEL    = 1;
  BULK_THROTTLE_MS = 500;
  ```
  Befintliga `MAX_TILES = 5000`, `PARALLEL = 2`, `THROTTLE_MS = 100` rörs
  inte — separata namespaces.
- `downloadTiles(items, opts)` parametriseras: `opts.parallel`,
  `opts.throttleMs` (default = nuvarande hårdkodade värden, så
  bakåtkompat bevaras).
- `startJob(spec)` får ett `spec.kind` (default `"area"`, kamuflage =
  `"kamuflage"`). Kind:en sparas i area-metadata (`kind: "kamuflage"`)
  och visas i `renderAreasPanel` med en distinkt etikett ("Kamuflage").
- Bakgrundspille:n återanvänds — kamuflage-jobb läggs i samma `_jobs`-
  singleton som vanliga.
- Quota-handling: `safePut`-mönstret förhindrar redan korrupta cache-
  entries; `QuotaExceededError` rethrowas i `downloadTiles` och fångas
  av `startJob` som markerar jobbet `status: 'quota'`. Inget extra
  arbete behövs här utöver storage-estimate-pre-checken.

**Klart-kriterium.**
1. I online-läge: klicka "Kamuflage-nedladdning" → välj 5× skala →
   accept:a båda checkboxes → starta.
2. Vänta på 100 % progress. Total-tid med 1 par. + 500 ms paus och
   ~5 000 tiles ≈ 50 min — det är OK; detta är inte en snabb feature.
3. Slå på flygplansläge i devtools. Reload `minkarta.html`. Pan över
   hela det stora området → tiles syns. Pan utanför → grå rutor.
4. Området visas i `offlineAreasPanel` med "Kamuflage"-etikett.
5. Befintliga "Spara område offline" funkar oförändrat och har kvar
   sin 5 000-cap.

**Filer som ändras (Fas 1).**
- `offline-tiles.js` — ny `openKamuflageModal`, parametriserad
  `downloadTiles`/`startJob`, `kind`-fält i area-metadata,
  area-rad-render visar etikett.
- `minkarta.html` — knapp i `renderMapControls()`, ny rad i `.about`-
  panelen.
- `sensorskiss.html` — samma två ändringar.

CSS rör jag inte — modal-en återanvänder `.ot-overlay`/`.ot-modal`-
stilarna som redan finns i `injectModalStyles()`.

### Fas 2 — Beskär till verkansområde *(LEVERERAD 2026-05-03)*

**Mål.** Efter en kamuflage-nedladdning kan operatören välja ett delområde
att behålla; resten raderas ur cachen lokalt så att en forensisk analys av
enheten i fält bara visar verkansområdet.

**Konkret.**
- Knapp **"Beskär"** på area-rad i `renderAreasPanel` — bara synlig om
  `area.kind === 'kamuflage'`.
- Beskär-modal:
  - Visar nuvarande bbox och zoom-range som referens.
  - Ger två val för delområde:
    a) **Använd nuvarande vy** (operatören har pan:at till verkansområdet
       i bakgrunden — modalen läser `map.getBounds()`).
    b) **Koordinat-input** för fyra hörn (lat/lon för N, S, V, Ö) som
       fallback för operatörer som vet exakta koordinater.
  - Live preview: en `L.rectangle` overlay på kartan som visar
    delområdet.
  - Statistik: "Behåller X tiles, raderar Y tiles, frigör Z MB".
  - Två val efter beskärning:
    - **Spara som nytt område** (`kind: 'area'`, behåller delområdets
      tiles); det stora kamuflage-området raderas helt.
    - **Markera som beskuret** (`kind: 'kamuflage-pruned'`); behåller
      kamuflage-id för spårbarhet i UI:n men cache:n är beskuren.
- Bekräftelsedialog: *"Behåll N tiles, radera M tiles. Detta går inte
  att ångra."* — eftersom åtgärden är destruktiv.
- Rensning sker via existerande `cache.delete(url)` på alla tiles utanför
  delområdet. Implementeras analogt med `removeArea` men med en
  `keepBbox`-filter.
- Visualisering kvar efter beskärning: `L.rectangle` ritar bara
  delområdet på kartan när användaren klickar area-raden (Fas 2.1).

**Klart-kriterium.**
1. Efter Fas 1-download: klicka "Beskär" på kamuflage-området.
2. Pan:a kartan till verkansområdet i bakgrunden, klicka "Använd
   nuvarande vy".
3. Bekräfta. Cache:n krymper → "Frigjorde 540 MB".
4. Slå på flygplansläge. Pan inom delområdet → tiles syns. Pan utanför
   delområdet (men fortfarande inom det gamla kamuflage-bbox:et) →
   grå rutor. **Detta är beviset på att beskärningen funkade.**

### Fas 3 — Schemalägg-läge (om tid finns)

**Mål.** Köra en kamuflage-download över natten på extremt låg
throttling så att burst-signaturen blir nära oigenkännlig från vanlig
trafik.

**Konkret.**
- I kamuflage-modal-en: knapp "Schemalägg" → throttla ner till
  1 req / 3 sek.
- **Wake Lock API** om tillgänglig (`navigator.wakeLock.request('screen')`)
  så att skärmen kan vara mörk men appen lever vidare.
- **Fortskridning sparas per 50:e tile** (existerande mönster i
  `startJob` används redan) — ett avbrutet jobb ska kunna
  resumeras: ny knapp "Återuppta" på area-rader vars `complete: false`.
- Auto-paus när enheten kommer på batteri < 20 % (Battery Status API).
- Auto-paus när nätverket går ner; resume när det kommer tillbaka.

**Risker att hantera:**
- Wake Lock kan släppas av OS:et oväntat — implementera re-acquire
  on `visibilitychange`.
- Battery API är borttaget i Firefox; pause-checken måste tåla
  `undefined` graciöst.

### Fas 4 — Decoy-områden (overstretch)

**Mål.** Auto-skapa N decoy-zoner runt verkansområdet — mindre
nedladdningar i geografiskt orelaterade områden — för att lägga till
brus i tile-server-loggen.

**Konkret.**
- I kamuflage-modal-en: slider "Decoy-zoner: 0–5".
- Vid > 0: efter huvud-downloaden körs N extra nedladdningar i
  randomiserade bbox runt huvud-bbox (avstånd 50–200 km), varje 1/10:e
  storleken.
- Tidsfördröjning mellan dem: 30–120 min (randomiserad), så att
  burst-spåret inte ser ut som ett enda jobb.
- Decoys raderas inte av "Beskär" automatiskt — de kan finnas kvar
  som verkligen användbar offline-cache i andra områden, eller raderas
  manuellt via existerande "Radera" på area-raden.

**Allvarlig OPSEC-kritik som måste lösas innan Fas 4:**
- Decoy-tider och -platser måste vara *trovärdiga*. Random N(50, 200) km
  i alla riktningar avslöjar lika mycket som huvuddownload om motståndaren
  ser mönstret. Riktig anti-fingerprinting kräver matematisk modell över
  vad "vanlig användning" ser ut som — inte naive randomisering.
- **Min rekommendation:** bygg INTE Fas 4 utan dedicerad OPSEC-konsultation
  först. Den kan göra mer skada än nytta. Faser 1–2 räcker långt och
  håller hela funktionen begriplig.

---

## Risk-lista

| Risk | Påverkan | Mitigation |
|---|---|---|
| Quota-exception mid-download | Cache delvis fylld, oklart läge | Pre-check `navigator.storage.estimate()`. `safePut` cachar bara `resp.ok`. `QuotaExceededError` rethrowas → jobbets status sätts till `'quota'`. Metadata sparas per 50 tiles så inget område blir helt osynligt. |
| IP-detekterad-burst | Tile-server-ban för operatörens IP | Lägre throttling-default (1/500 ms). Användaren rekommenderas via VPN. Inga retries vid 4xx/5xx. |
| Tile-server-ban | Hela appen tappar tiles online | Existerande `safePut`/`isTileHost`-route i SW serverar offline-cachen först — befintlig vanlig nedladdning påverkas inte. Vid permanent ban: byt till PMTiles eller egen proxy (Sväng 3 i `roadmap.md`). |
| Korrupta tiles | Skadade kart-bilder offline | `safePut`-mönstret kasserar icke-2xx svar. Fail-fast i loop:en räknar fel utan att cachea dem. |
| Beskär-misstag (radera för mycket) | Förlorad cache | Bekräftelsedialog visar exakt antal tiles som ska raderas. Operatören kan ladda ner igen — det är värsta utfallet. |
| Användaren tror funktionen är osynlig | Falskt OPSEC-förtroende | Tre lager: gul banner i modal, två obligatoriska checkbox-bekräftelser, `.about`-panel-text. |
| Bulk-download över WiFi-quota | Slut på data | Storage-estimate-check + tydlig MB-summa innan start. |
| Avbruten nedladdning halvfärdig | Spöke-områden i lista | Existerande `complete: false`-flagga. Fas 3 lägger till "Återuppta". |

---

## Test-plan

1. **DevTools → Application → Storage:** efter download, verifiera att
   `hv-offline-tiles-v1` har vuxit med ~600 MB. Verifiera också att
   `quota` rapporteras tillräcklig.
2. **DevTools → Network → Offline:** reload sida, pan över hela det
   stora området → alla tiles serveras från SW (Size = "(ServiceWorker)").
3. **AbortController under bulk:** klicka avbryt mid-download, verifiera
   att inga nya requests skickas inom 1 sek. Status `aborted`. Tiles
   som hann sparas finns kvar.
4. **Quota-rejection:** simulera via DevTools → Application →
   Storage → "Clear" → simulera låg kvot — kör download → status
   `'quota'`, fel-banner i modal.
5. **Storage-estimate-varning:** sätt en kvot via DevTools eller bygg
   ett medvetet stort område → varning visas innan start.
6. **Beskär-flöde (Fas 2):** efter download, beskär till liten bbox,
   verifiera att tiles utanför delområdet returnerar grå rutor offline,
   och att bytes-summan i area-metadata uppdaterats.
7. **Cap-block:** välj 20× skala + max zoom 14 → kan vara > 30 000
   tiles → knapp blockerad.
8. **Checkbox-block:** ingen av de två checkboxes ikryssad → start-
   knappen disabled.
9. **Regression "Spara område offline":** vanliga modal-en har kvar
   sin 5 000-cap, sin 2-parallella throttling, sina varningstexter.
10. **Regression kart-modal i `index/ah/scrim/what/weft/obslosa/vader`:**
    öppna kartmodal — fortfarande funktionellt (de använder inte
    `OfflineTiles` direkt och påverkas bara om vi råkar krascha den
    delade `service-worker.js`).
11. **Pille:n:** kamuflage-jobb visas i bakgrundspille, kan stängas/
    återöppnas, avbryts på X-knapp.
12. **Glöm allt-knappen** (när den finns — `roadmap.md` Sväng 1.5):
    måste rensa även `hv-offline-tiles-v1`. Stickprov: efter rensning
    är `caches.has('hv-offline-tiles-v1')` `false`.

---

## Konventioner som följs

- Inga nya beroenden. Vanilla JS, samma stil som `offline-tiles.js`.
- Kommentar-WHY, inte WHAT. Inga emojis i kod.
- Commit-meddelanden på svenska: `feat(kamuflage): ...`,
  `feat(beskar): ...`. Aldrig `--no-verify`/`--amend`.
- CI bumpar `service-worker.js` `CACHE`-stämpeln — vi rör den inte.
- Befintlig `MAX_TILES = 5000` är oförändrad. `BULK_MAX_TILES = 30000`
  introduceras separat.
- Allt nytt JS hamnar i `offline-tiles.js` så länge filen håller sig
  under 1500 rader. Vid överstigning: bryt ut till
  `offline-tiles-kamuflage.js`. **Status efter Fas 2:** filen är ~1950
  rader. Splittring är ett TODO innan Fas 3 (Schemalägg-läge) — den fasen
  kommer lägga ytterligare ~150 rader.
- `.about`-panelen i `minkarta.html` och `sensorskiss.html` uppdateras
  med en explicit kamuflage-rad som beskriver hot-modellen.

---

## Beslutsloggar

- **Skala-slider (1×–20×) framför drag-rektangel för bbox-val (Fas 1):**
  Drag-rektangel kräver att man pausar Leaflets normala interaktion och
  bygger en egen ritning-state-maskin. Det är 200+ rader kod för Fas 1.
  Skala-slider runt vy-centrum är en rad input + en formel —
  funktionellt ekvivalent för det här use case:t (man vill täcka
  "verkansområdet plus en stor omgivning"), och låter Fas 2 fokusera
  på beskär-flödet där rektangel-overlay ändå behövs.
- **30 000 tiles som hård cap:** ~600 MB vid 20 kB/tile är gränsen för
  vad en typisk smartphone-storage tål utan att svälla. Vid behov för
  större områden måste operatören dela upp i flera kamuflage-jobb,
  vilket är önskvärt — parallellt nedladdade jobb från olika
  geografier är *bättre* OPSEC än ett enda gigantiskt jobb.
- **1 parallell + 500 ms paus som default:** ger ~2 req/sek burst.
  Vanlig pan/zoom-aktivitet ger 5–15 req/sek vid varje rörelse.
  Kamuflage-throttlingen är alltså *under* normal användning, vilket
  gör burst-signaturen mindre igenkännlig än standard "Spara område
  offline" (2 par. + 100 ms ≈ 15 req/sek).
- **Återanvänd `_jobs`-singleton, ingen separat kamuflage-pille:**
  Att duplicera UI-koden för progress-pille bara för att göra
  kamuflage-jobb visuellt distinkta tjänar inget syfte. Kind:en visas
  i area-listan och i jobb-pille:n via etikett, men koden är samma.
- **Lägg `kind`-fältet i `saveAreaMeta` istället för en separat
  metadata-tabell:** existerande area-metadata har redan plats för
  framtida fält (`complete`, `savedAt`). Lägga till `kind` är minimalt
  invasivt och bryter inte bakåtkompat (default `"area"` om saknas).

---

## Vad denna roadmap INTE löser

- **Anonymiserad nedladdning.** Funktionen kan inte ersätta VPN/Tor;
  den hjälper bara med *vilket område* som är synligt, inte *vem som
  laddar ner*.
- **Säker delning.** Operatör A kan inte dela ett beskuret cache till
  operatör B utan att exponera B:s IP — utom via det redan existerande
  `.hvoffline`-paket-formatet (`offline-tiles.js`s `exportArea`/
  `importPackage`), som funkar utmärkt för det.
- **Tile-server-policy-respekt.** Funktionen är ett medvetet brott; en
  riktig långsiktig lösning kräver PMTiles eller egen proxy.
