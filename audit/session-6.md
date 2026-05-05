# Session 6 — 2026-05-05

Pass dedikerat till bakgrundsnedladdning över sid-navigering. Plan i
`audit/roadmap-bakgrundsnedladdning.md`. Roten till problemet: nedladdning
levde i page-scope; navigering bröt fetch-loopen. Lösning: flytta
fetch-arbetet till Service Worker.

## Pushat live

| Commit | Beskrivning |
|---|---|
| `2ddbba9` | docs(roadmap): bakgrundsnedladdning över sid-navigering (plan) |
| `b98b9b2` | feat(offline): SW-driven tile-download (Fas 1, bakgrundsnedladdning) |
| `b1738fc` | feat(offline): pille hydrerad från SW på alla sidor (Fas 2) |
| `44751b5` | feat(pmtiles): SW-driven prefetch (Fas 3, bakgrundsnedladdning) |
| `bd78777` | feat(offline): resume-toast vid avbrutna jobb (Fas 4) |
| `<denna>` | docs(audit): session-6 + README + roadmap (Fas 5) |

## Vad som gjordes

**Fas 1 — SW-driven tile-download.** `service-worker.js` fick `_otJobs`-tabell,
`runTileJob()` och en `'message'`-handler för `OT_START_JOB` / `OT_CANCEL` /
`OT_PAUSE` / `OT_LIST_JOBS`. Sida → SW: postMessage med items + spec.
SW → sidor: broadcast `OT_PROGRESS` via `clients.matchAll`. Cache-namespacet
`hv-offline-tiles-v1` är oförändrat. `offline-tiles.js` `startJob()` kollar
nu `navigator.serviceWorker.controller`: finns det → delegera till SW och
markera `job.delegated=true`; saknas det (Firefox incognito) → kör
in-page-loopen oförändrat. `cancelJob` / `setJobPause` / `clearJobPause`
forwardar nu pause/cancel till SW när jobbet är delegerat. Lokal `_jobs`
hydreras från `applyJobSnapshot()` när SW sänder `OT_PROGRESS` —
saveAreaMeta körs i sida-scope (SW saknar localStorage).

**Fas 2 — Pille hydrerad från SW på alla sidor.** `ensureSwListener()`
installerar message-handler vid IIFE-init (alltså på alla sidor som
inkluderar `offline-tiles.js`). Nytt: `controllerchange`-listener för
första-besök-edge-caset, plus `visibilitychange` så fliken som kommer
tillbaka från bakgrund frågar om nuläget. Pille:n (singleton i
`renderJobsBar`) skapas automatiskt av `applyJobSnapshot` när SW broadcastar
ett job från en annan flik.

**Fas 3 — PMTiles-prefetch i SW.** Samma mönster för 4 GB Sverige-filen.
SW håller `_pmJobs` keyed by URL — om en flik startat en prefetch attaches
nästa flik till samma stream istället för att dubbelfetcha. `pmtiles-layer.js`
fick `swPrefetchPMTiles()` som returnerar samma `{ok, bytes, error}`-form
som in-page-versionen, så caller-koden i `minkarta.html` /
`sensorskiss.html` är oförändrad. SHA-256-verifiering hoppas över i
SW-läget oavsett filstorlek (kräver hela filen i RAM via
`crypto.subtle.digest`) — samma trade-off som existerande in-page-koden
gör för >256 MB.

**Fas 4 — Resume-toast.** Om alla flikar stängs mid-download dör SW
eventuellt också. När användaren öppnar en sida med `offline-tiles.js`
nästa gång: kolla `localStorage["offlineTiles.areas"]` efter
`complete:false`-områden utan aktivt SW-job → visa toast "Du har N
avbruten(a) nedladdning(ar). Öppna offline-listan i kartan för att
återuppta." En gång per session via `sessionStorage`-flagga.
Befintliga "Återuppta"-knappen i `renderAreasPanel` hanterar själva
återupptagningen sedan sväng 1 av offline-karta — den löper nu också
genom SW.

## Manuell test (verifierat)

- ✅ Starta nedladdning i `minkarta.html`, klicka "Kör i bakgrunden",
  navigera till `sensorskiss.html`. Pille:n syns kvar med fortsatt
  växande progress.
- ✅ Navigera vidare till `index.html` (7S). Pille:n följer med, status
  uppdateras live.
- ✅ Klicka X i pille:n från en sida som inte startat jobbet. SW avbryter.
- ✅ Stäng alla flikar mid-download. Öppna minkarta.html igen efter ~30s.
  Resume-toast visas. "Återuppta" i listan plockar upp där det slutade.
- ✅ Härdat läge i `minkarta.html`, klicka "Pre-download Sverige".
  Navigera till `sensorskiss.html` mid-progress. Bytes laddas vidare i
  bakgrunden (SW Network-tab). När 100 % → cachad lokalt på båda sidor.

## Återstår att verifiera

- ⏳ SW-uppgradering mid-fetch: ny deploy → ny SW activate via
  skipWaiting. Befintliga jobb i gamla SW:n bör markeras avbrutna
  via sista flush. Kräver två deploys i rad mid-download.
- ⏳ Battery-pause: `installAutoPause` lever fortfarande i sida. Om alla
  flikar stängs medan batteri-pause är aktiv förblir SW-jobbet pausat
  utan klient som kan släppa pausen. Acceptabelt: jobbet återupptas
  manuellt via "Återuppta".
- ⏳ Wake Lock släpps vid pageunload — schemalagd nattlig nedladdning
  utan öppen flik kan throttlas av OS:et. Inte värre än innan Fas 1.

## Kända edge cases

1. **Dubblerad PMTiles-prefetch i två flikar:** SW dedupar på URL, så
   andra flikens `prefetch()` attaches till första flikens stream.
2. **Tile-job i två flikar samtidigt:** varje flik genererar egen jobId
   så två jobb körs parallellt mot samma area. Båda skriver till samma
   cache-entries (idempotent). Ingen skada men dubbla tile-requests.
3. **postMessage-clone av items[]:** ~5000 entries × ~100 byte JSON
   ≈ 500 KB structured-clone vid jobstart. Acceptabelt.
4. **Klient-bara fält (controller, wakeLock, cleanup) bevaras lokalt:**
   `applyJobSnapshot` mergar SW-snapshot med befintligt local-state så
   page-bound resurser kan rensas vid status != running.
