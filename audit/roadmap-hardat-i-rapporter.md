# Roadmap — Härdat läge i rapportfilerna

**Datum:** 2026-05-05
**Förhållande till andra roadmaps:**
- `audit/roadmap.md` Sväng 3.1 — den ursprungliga PMTiles-idén.
- `audit/roadmap-pmtiles.md` — Fas 1+2 levererad i `minkarta.html` (klient,
  hosting på R2, pre-download). Detta dokument tar nästa steg: porta
  toggle:n till de 6 rapportfilerna.

---

## Mål

I rapportfilerna `index.html` (7S), `what.html` (WHAT), `scrim.html`
(SCRIM), `weft.html` (WEFT), `ah.html` (A-H) och `obslosa.html` (OBSLÖSA)
ska användaren kunna växla kartmodalen till "Härdat läge" — samma
offline-PMTiles-lösning som idag finns i `minkarta.html`.

När läget är på serveras kart-bakgrunden från lokalt cachade PMTiles
istället för OpenTopoMap. MGRS-hämtning vid klick fortsätter fungera
identiskt — endast tile-källan byts.

---

## Genomgång — vad finns i `minkarta.html` idag

`minkarta.html` har Härdat läge sedan 2026-05-03 (`7f30a13`) och
pre-download sedan 2026-05-04 (Fas 2). Implementationen är uppdelad på:

1. **Klient-modulen `pmtiles-layer.js`** (importeras som ESM-modul via
   `<script type="module" src="pmtiles-layer.js">` i HEAD):
   - Exponerar `window.PMTilesHardening.createController(map, baseLayer)`
     som returnerar en controller med `toggle()`, `isActive()`,
     `onChange()`, `prefetch()`, `checkPrefetched()` etc.
   - Persisterar state i `localStorage["pmtiles.hardening"]`. Vid load
     auto-aktiveras härdat läge om föregående session lämnade det på.
   - Har default-URL `SVERIGE_PMTILES_URL` (Cloudflare R2,
     `pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/sverige.pmtiles`).
     Hash + bytes finns som konstanter; används av prefetch-flödet.
   - Exponerar `window.PMTilesPrefetch.SVERIGE_URL` /
     `SVERIGE_SHA256` / `SVERIGE_BYTES` som globalt namespace.

2. **Init i `initMap()`** (cirka rad 952–972 i `minkarta.html`):
   - Skapar `tiles = new HybridTileLayer(...)`.
   - Lazy-binder controller till `window.MK_HARDENING` så fort
     `PMTilesHardening:ready`-eventet kommit eller direkt om modulen
     redan är laddad.

3. **UI-knappar i `renderMapControls()`** (rad 1442–1586):
   - Toggle "Härdat läge" / "Härdat läge: PÅ".
   - Stil-dropdown (light/dark/topo/grayscale/...).
   - Pre-download-knapp ("Ladda ner offline" → progress → "Lokalt cachad").

4. **OBS-banner i kartmodalen** (rad 651): orange varning
   *"Kartbakgrunden laddas från extern server..."* — gäller bara när
   härdat läge är AV. Idag står den alltid synlig i `minkarta.html`.

---

## Vad behöver portas till varje rapportfil

Rapportfilerna har en mycket enklare kart-modal än `minkarta.html`. De
har bara en knapp ("Karta") som öppnar en `#mapModal` med en `L.map`
och en vanlig `L.tileLayer` mot OpenTopoMap. Ingen palette, inga
verktyg, ingen offline-area-cachehantering utöver
`OfflineTiles.attachCoverageControl`.

Vad som behöver göras per fil:

1. **HEAD**: lägg till `<script type="module" src="pmtiles-layer.js">`
   och `<script src="shared/map-hardat-modal.js" defer></script>`
   (ny helper, se Fas 2).

2. **HEAD-CSP-TODO**: bredvid existerande
   `<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`,
   lägg en HTML-kommentar som påminner framtida CSP-utrullning (audit
   §1.2) att lägga in R2-domänen i `connect-src`:

   ```html
   <!-- CSP TODO §1.2: lägg till pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev
        i connect-src om/när strikt CSP rullas ut hit (PMTiles för Härdat läge) -->
   ```

3. **Modal-header**: lägg en toggle-knapp `Härdat läge` som
   visar/hider PMTiles-state. Visuell stil enligt befintlig
   `.map-modal-close` / footer-knappar.

4. **OBS-banner**: ge bannern en `id="mapExtTileWarning"` så helpern
   kan dimma den (CSS `opacity:0.4` + bakgrund nedtonad) när härdat
   läge är på. Bannerns text gäller bara extern tile-source — den
   är felaktig i härdat läge och ska inte stå i full styrka då.

5. **Init i `openMapModal`**: efter `tileLayer.addTo(mapInstance)`,
   anropa `window.MapHardatModal.attach({ map, baseLayer, headerEl,
   warningEl })`. Helpern hanterar resten.

6. **Klick-handler** rörs INTE. MGRS-hämtning är `MGRS.forward(lat, lng)`
   och oberoende av tile-källan. Verifieras med manuellt test per fil.

---

## Helpers att bryta ut — `shared/map-hardat-modal.js`

Skapa ny fil `shared/map-hardat-modal.js` (vanilla JS IIFE, INTE ESM —
HEAD-script utan `defer` är default `defer` när placerade efter Leaflet,
men för säkerhets skull deklarera `defer`).

API:

```js
// Sätter upp Härdat läge-toggle på en rapportfil-kartmodal.
// Idempotent — kan kallas flera gånger utan att ändra något om redan attachad.
window.MapHardatModal.attach({
    map,           // Leaflet L.Map-instans
    baseLayer,     // L.TileLayer (OTM) som är default-bakgrund
    headerEl,      // .map-modal-header DOM-element där knappen läggs
    warningEl      // (valfritt) OBS-banner-element som dimmas vid PÅ
});
```

Helpern:
1. Väntar in `PMTilesHardening:ready`-eventet (eller skapar direkt om
   `window.PMTilesHardening` redan finns).
2. Skapar en controller via
   `window.PMTilesHardening.createController(map, baseLayer)` och
   lagrar i `map.__hardenCtrl` (idempotens-check).
3. Lägger en toggle-knapp i `headerEl` (mellan titeln och close-knappen).
4. Lyssnar på `controller.onChange()` → uppdaterar knapp-text +
   `aria-pressed` + dimmar `warningEl` när aktiv.
5. Vid toggle-klick: om `await controller.checkPrefetched()` är `false`,
   visa `window.confirm("Härdat läge kräver att kartan laddats ner via
   Min Karta-sidan...")`. Om användaren bekräftar — aktivera ändå
   (on-demand range-requests fungerar, men varnar att första requesten
   syns hos R2). Om `false` — avbryt.

State delas automatiskt mellan minkarta och rapportsidor eftersom
`createController` läser samma `localStorage["pmtiles.hardening"]`-key
över alla sidor. Om operatören slår på i 7S och öppnar minkarta är det
redan på där.

### PMTILES_URL — single source of truth

URL:en till Sverige-pmtiles finns redan definierad **på en plats**:
[`pmtiles-layer.js:87`](../pmtiles-layer.js#L87) som
`SVERIGE_PMTILES_URL`. Den exponeras globalt via
`window.PMTilesPrefetch.SVERIGE_URL`.

`shared/map-hardat-modal.js` ska INTE duplicera URL:en. Om helpern
behöver veta om aktiv URL är Sverige-filen (för pre-download-check),
läs den från `window.PMTilesPrefetch.SVERIGE_URL`. Detta säkerställer
att framtida URL-byten bara behöver göras i `pmtiles-layer.js`.

---

## Acceptkriterier per fil

För varje rapportfil:

- [ ] `<script type="module" src="pmtiles-layer.js">` i HEAD.
- [ ] `<script src="shared/map-hardat-modal.js" defer>` i HEAD.
- [ ] CSP-TODO-kommentar bredvid CSP-meta i HEAD.
- [ ] OBS-banner i kartmodalen har `id="mapExtTileWarning"`.
- [ ] `openMapModal`'s `if (!mapInstance) {...}`-block kallar
  `window.MapHardatModal.attach(...)` efter `tileLayer.addTo(...)`.
- [ ] Toggle-knapp synlig i `.map-modal-header`.
- [ ] Toggle ändrar bakgrunden från OTM till PMTiles och tillbaka.
- [ ] OBS-bannern dimmas / döljs när härdat läge är på.
- [ ] Klick på kartan ger samma MGRS-sträng i båda lägen (manuell
  verifiering — välj en känd punkt och jämför).
- [ ] Aktivera läget i en fil → öppna kartan i en annan fil → läget
  är på där också.

För `minkarta.html`:

- [ ] Inga regressioner. UX identisk före/efter Fas 2-refaktor.
  Verifieras genom att öppna sidan och slå på/av Härdat läge plus
  pre-download-flow.

---

## Risker

| Risk | Påverkan | Mitigation |
|---|---|---|
| Strikt CSP rullas ut till rapportfiler utan att R2-domänen läggs till i `connect-src` | PMTiles-fetch blockas tyst, härdat läge går sönder | CSP-TODO-kommentar i alla 6 filer, plus markering i `audit/roadmap.md` §1.2 |
| Modul-script (ESM) körs efter `defer`-script — race-condition om helpern försöker skapa controller innan `pmtiles-layer.js` lagt upp `window.PMTilesHardening` | Toggle-knappen visas inte / fungerar inte vid första modal-öppning | Helpern lyssnar på `PMTilesHardening:ready`-event som modulen dispatchar i sista raden |
| Toggle-knapp kräver mer plats i header än vad som finns på smala mobila viewports (375 px) | Knapp wrappar / går av skärmen | Använd kort text "Härdat", använd `flex-wrap:wrap` på header om det blir trångt |
| Användaren slår på Härdat läge utan att ha pre-downloadat → on-demand range-requests skickas till R2 → första request syns där | OPSEC-läckage (R2-loggar) som motverkar hela poängen | Helpern blockerar aktivering med dialog "Härdat läge kräver att kartan laddats ner via Min Karta-sidan". Användaren får option att aktivera ändå (medvetet val). |
| `pmtiles-layer.js` är ESM-modul, kräver browser med ES-modul-stöd | Äldre webbläsare (IE11) får ingen härdat-knapp | IE11 stöds inte av sajten i övrigt — accept |
| Service Worker har inte de nya filerna i precache | Härdat läge fungerar inte offline | `pmtiles-layer.js`, `vendor/pmtiles/pmtiles.esm.js`, `vendor/protomaps/protomaps-leaflet.esm.js` finns redan i `service-worker.js` `FILES`-arrayen från Fas 1. Lägg till `shared/map-hardat-modal.js` också. |

---

## Implementationsordning (Fas 3)

Bygg en fil i taget. Commit + push direkt efter varje fil så ägaren kan
testa live på 7srapport.com och avbryta om något är fel.

Ordning (kortast / minst risk först):

1. `ah.html` — minst komplex modal (referens).
2. `obslosa.html` — kort fil, enkel modal.
3. `scrim.html` — likt ah.html.
4. `what.html` — likt scrim.html.
5. `weft.html` — likt what.html.
6. `index.html` (7S) — sist eftersom den är största filen och har
   mest interaktion runt kartmodalen (jumpTo via styrka-modal etc.).

---

## Filer som INTE rörs

- `service-worker.js` — CI sköter `CACHE`-stämpeln, denna körning rör
  inte filen alls. **TODO för ägaren:** lägg in
  `'./shared/map-hardat-modal.js'` i `FILES`-arrayen manuellt om/när
  precaching av helpern önskas. Filen cachas on-demand vid första visit
  via SW:s standard fetch-fallback om den utelämnas.
- `version.js` — CI sköter den.
- `audit/cot-fuzz.html`, `audit/tnr-fuzz.html` — regression-tester.
- `vader.html`, `fors.html`, `pedars.html`, `postschema.html`,
  `eobusare.html`, `obo.html`, `rassoika.html` — har ingen Karta-modal.
- `sensorskiss.html` — har Härdat läge separat (delar med minkarta).
  Inget jobb här.

---

## Slutkrav (acceptkriterier hela jobbet)

- I alla 6 filer öppnar "Karta"-knappen modal med en synlig
  "Härdat läge"-toggle.
- Toggle PÅ → PMTiles, toggle AV → OpenTopoMap (default).
- MGRS-hämtning fungerar identiskt i båda lägen.
- localStorage-state delas mellan sidor.
- `minkarta.html` oförändrad i UX (refaktor-säker).
- 0 emojis införda.
- Inga `<script src=>` eller `<link rel=stylesheet>` mot externa
  domäner som inte redan fanns.
- PMTILES_URL definieras på EN plats (`pmtiles-layer.js:87`).
- CSP-TODO-kommentar finns i alla 6 rapportfiler.
