# Roadmap — Bakgrundsnedladdning över sid-navigering

**Datum:** 2026-05-05
**Status:** Pågår.
**Förhållande till andra dokument:**
- `audit/roadmap-offline-karta.md` definierar Cache API-tile-cachen
  (`hv-offline-tiles-v1`) och dess in-page job-singleton.
- `audit/roadmap-pmtiles.md` definierar PMTiles-cachen (`hv-pmtiles-v1`)
  och pre-download via `prefetchPMTiles` i `pmtiles-layer.js`.

---

## Bakgrund — varför

Idag lever båda nedladdnings-loopar i **page-scope**:

- `offline-tiles.js` har en `_jobs`-singleton + `downloadTiles()`-loop
  som lever på `window`. När användaren navigerar bort (minkarta →
  sensorskiss → 7S), unloadas sidan, JS-runtimen rensas, fetch-loopen
  dör, och tiles slutar laddas.
- `pmtiles-layer.js` `prefetchPMTiles()` har samma problem:
  `fetch(...).body.getReader()` i `controller`-scope, dör vid unload.

Konsekvens: en operatör som startar en lång nedladdning på `minkarta.html`
(t.ex. ett kamuflage-område på 4 000 tiles ~ 5 min) kan inte titta in
i `sensorskiss.html` eller index.html (7S) under tiden — då måste de
börja om. Det är direkt incident-relaterat när tid är knapp.

## Lösning — flytta arbete till Service Worker

SW lever oberoende av page-livscykel. Den finns redan
(`service-worker.js`), hanterar både `hv-offline-tiles-v1` och
`hv-pmtiles-v1`, och alla berörda sidor (`index.html`, `minkarta.html`,
`sensorskiss.html`, `ah.html`, `scrim.html`, `what.html`, `weft.html`,
`obslosa.html`, `skyttebok.html`, `opsec.html`) registrerar samma SW
via `pwa.js`. Vi flyttar fetch-arbetet dit, behåller `Cache API`-namespacen
(`hv-offline-tiles-v1`, `hv-pmtiles-v1`) oförändrade, och låter sidor
**bara visa progress** snarare än **driva** den.

**Kanal:**
- Sida → SW: `postMessage` via `navigator.serviceWorker.controller`.
- SW → sidor: `clients.matchAll({type:'window'}) → client.postMessage()`,
  så ALLA öppna flikar ser progress, inte bara den som startade jobbet.

**State:**
- SW håller `_jobs`-tabell i sin egen scope (lever så länge SW-processen
  lever — Chrome håller den ~30 s efter sista message men page-bound
  fetch håller den vid liv så länge en fetch löper).
- Persisten metadata fortsätter ligga i `localStorage` under
  `offlineTiles.areas` (sidan skriver bara, läser via SW-events).

**Fallback:**
- Om SW saknas / är `null` (incognito Firefox, första load innan SW
  aktiverat) — använd nuvarande in-page-loop oförändrat.

---

## Faser

Varje fas är **minimal-fungerande** vid push. Senare faser polerar.

### Fas 1 — SW-driven tile-download (MVP) ✅ LEVERERAD `b98b9b2`

**Mål:** En tile-nedladdning startad i `minkarta.html` överlever navigering
till `sensorskiss.html` eller index.html (7S) och fortsätter köras tills
den blir klar — utan att operatören behöver vara kvar på minkarta-sidan.

**Filer:**
- `service-worker.js` — lägg till `'message'`-handler. Implementera
  `runTileJob({jobId, items, areaMeta})`: fetch-loop med samma throttling
  (`PARALLEL=2`, `THROTTLE_MS=100`), `cache.put` mot
  `hv-offline-tiles-v1`, broadcast `OT_PROGRESS` via `clients.matchAll`.
- `offline-tiles.js` — i `startJob()`: om
  `navigator.serviceWorker.controller` finns, skicka
  `{type:'OT_START_JOB', ...}` till SW istället för att köra
  `downloadTiles()` lokalt. Lyssna på `OT_PROGRESS`/`OT_DONE`-events
  från SW och uppdatera `_jobs[jobId]` så befintlig pille + modal
  fungerar oförändrat.
- `offline-tiles.js` — vid pageload (init): fråga SW
  `{type:'OT_LIST_JOBS'}` → om aktiva jobb finns, hydrera lokala
  `_jobs`-tabellen och visa pille:n.

**Acceptanskriterium (browser):**
1. Öppna `minkarta.html`, panorera in i ett område, "Spara område offline".
2. Starta nedladdning på ~500 tiles (vänta tills första 50 är klara).
3. Klicka "Kör i bakgrunden" → navigera till `sensorskiss.html`.
4. Pille:n längst ner-höger ska finnas kvar med fortsatt växande progress.
5. Navigera till index.html (7S) → pille:n syns även där.
6. Vänta tills "Klart"-statusen visas på vilken sida som helst.
7. Återgå till minkarta.html → området finns i listan, alla tiles cachade.

**Commit:** `feat(offline): SW-driven tile-download (Fas 1, bakgrundsnedladdning)`

---

### Fas 2 — Pille hydrerad från SW på alla sidor ✅ LEVERERAD (Fas 1 + controllerchange/visibility)

**Mål:** Pille:n (singleton i `offline-tiles.js`) syns korrekt på vilken
sida som helst som inkluderar `offline-tiles.js`, även om jobbet startades
på en annan sida. Statusen är levande, inte fryst.

**Filer:**
- `offline-tiles.js` — `ensureJobsBar()` triggar `OT_LIST_JOBS` vid mount
  (även om inga lokala jobb finns) och installerar SW-message-listener
  som auto-skapar pille:n när `OT_PROGRESS` kommer in. Idag bygger den
  bara på `offline-tiles:job-update`-eventet — i Fas 1 räcker det, men i
  Fas 2 ska pille:n dyka upp **utan** att sidan själv har triggat något.
- `index.html` (7S) inkluderar redan `offline-tiles.js` via Fas 1 av
  `roadmap-hardat-i-rapporter.md`. Inget HTML behöver ändras.

**Acceptanskriterium:**
1. Starta nedladdning i `minkarta.html`, navigera direkt till `index.html`
   (7S) som inte har egen "Spara område offline"-knapp.
2. Pille:n ska dyka upp där också, levande progress, korrekt etikett.
3. Klick på X i pille avbryter jobbet (postMessage `OT_CANCEL`).

**Commit:** `feat(offline): pille hydrerad från SW på alla sidor (Fas 2)`

---

### Fas 3 — PMTiles-prefetch i SW ✅ LEVERERAD

**Mål:** PMTiles-pre-download (4,1 GB Sverige-fil) överlever sid-navigering
på samma sätt som tile-jobb.

**Filer:**
- `service-worker.js` — `runPmtilesJob({url, expectedBytes, expectedSha256})`:
  läser response-streamen i SW-scope, bygger Blob-of-blobs, skriver till
  `hv-pmtiles-v1`. Broadcast `PM_PROGRESS`/`PM_DONE`.
- `pmtiles-layer.js` — `prefetch()` i controllern: om SW finns, delegera
  till SW. Behåll lokal fallback för Firefox-incognito.
- `pmtiles-layer.js` — `prefetchPMTiles` (global helper) får ny
  `useServiceWorker:true`-flagga.

**Acceptanskriterium:**
1. Öppna `minkarta.html`, slå på Härdat läge, klicka "Pre-download Sverige".
2. När progress står på t.ex. 12 % → navigera till `sensorskiss.html`.
3. Bytes laddas vidare i bakgrunden (synligt i Network-tab).
4. När 100 % → Härdat läge i sensorskiss visar "cachad lokalt" badge.

**Commit:** `feat(pmtiles): SW-driven prefetch (Fas 3, bakgrundsnedladdning)`

---

### Fas 4 — Resume + state-sync över SW-omstart ✅ LEVERERAD

**Mål:** Om alla flikar stängs medan ett jobb pågår: SW kan fortsätta
tills sista chunk eller pausa+spara state. Vid nästa pageload visas
"Återuppta?"-prompt.

**Filer:**
- `service-worker.js` — när sista klient stängs (`clients.matchAll` returnerar
  []): fortsätt köra jobbet (SW är vid liv tills fetch tar slut). Om SW dör
  mid-fetch (browser-restart eller minne) → `localStorage` har redan
  delvis-progress sparad via `saveAreaMeta(complete:false)` (befintligt
  beteende, intakt).
- `offline-tiles.js` — `init()` kollar om förra session lämnade
  `complete:false`-områden → `OT_LIST_JOBS` säger "inga aktiva" → visa
  toast "Du har avbrutna nedladdningar (N st), öppna offline-listan för
  att återuppta".

**Acceptanskriterium:**
1. Starta stort jobb (~3 000 tiles), stäng ALLA flikar mid-progress.
2. Vänta 30 s. Öppna `minkarta.html` igen.
3. Toast visas: "Du har 1 avbrutet område — öppna listan för att återuppta".
4. Återuppta-knappen i listan tar oss tillbaka till 100 %.

**Commit:** `feat(offline): resume-toast vid avbrutna jobb (Fas 4)`

---

### Fas 5 — Audit + README + self-test ✅ LEVERERAD

**Mål:** Dokumentera ändringen i `audit/`, README-rad, och en
manuell-test-checklista i `audit/roadmap-bakgrundsnedladdning.md` (denna
fil) som "verifierat".

**Filer:**
- `audit/session-6.md` (ny) — sammanfattning av Fas 1–5 med commit-hashar.
- `audit/index.md` — ny rad i tabellen.
- `audit/roadmap-bakgrundsnedladdning.md` — bocka av faser, lägg till
  manuell-test-rad och kända edge cases.
- `README.md` — kort rad i changelog/feature-listan om att downloads nu
  fortsätter mellan sidor.

**Commit:** `docs(audit): session-6 + roadmap bockad — bakgrundsnedladdning klar (Fas 5)`

---

## Hårda regler

- Cache-namespacen `hv-offline-tiles-v1` och `hv-pmtiles-v1` ändras INTE.
- Inga nya beroenden / npm-paket. Vanilla JS.
- CSP: `connect-src` behöver inte ändras — fetch-mål är samma som idag.
- Inga destruktiva git-kommandon.
- Push utan `--no-verify`.

## Kända edge cases att testa i Fas 5

1. **SW-uppgradering mid-fetch:** ny deploy → ny SW activate → klassisk
   skipWaiting. Befintliga jobb i gamla SW:n förlorade — markeras som
   `complete:false` via sista flush.
2. **Incognito Firefox:** ingen SW, fallback till in-page-loop. Pille
   ska fortfarande funka inom samma sida.
3. **Battery / offline-pause:** auto-pause-logiken (`installAutoPause`)
   måste flyttas till SW eller behållas i sida. Förslag: behåll i sida
   och kommunicera "pause request" till SW.
4. **Dubblerad start:** om två flikar båda triggar samma `OT_START_JOB`
   med samma areaId — SW dedupar via jobId-check.
