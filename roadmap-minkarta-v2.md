# Roadmap — MINKARTA v2 (BETA → stabil)

Andra iterationen av **MINKARTA**-tabben. v1 (roadmap-mineringar.md) gav
kart-skelett, symbolpalett, PNG-export, minprotokoll-panel och spelläget
SÄNKA MINOR. v2 härdar UX, läsbarhet och reglementsstöd utifrån fälttester
och en fördjupad läsning av *Mineringar på karta – sammanställning*
(Fältarbeten s. 338–342 + Handbok 11.7.1).

Arbetsnamn och filstruktur är oförändrade. Allt arbete sker inom:
`minkarta.html`, `minkarta-symbols.js`, `minkarta-export.js`,
`minkarta-game.js`, `service-worker.js`, `README.md`.

---

## 0. Ramverk och oföränderliga kontrakt

Dessa regler är ärvda från v1 och gäller alla faser nedan. De förhandlas
inte om.

**0.1 Integritet (hårt):**
- Inga `fetch`/`XMLHttpRequest`/`sendBeacon`/WebSocket/`<form action>`
  som skickar minsymbolpositioner, anteckningar, protokoll eller annan
  användardata till någon server.
- Tillåtna utgående anrop:
  1. OpenTopoMap-tiles (z 3–17).
  2. OpenStreetMap Standard-tiles (z 18–19, nytt i v2) — **endast**
     när användaren zoomar förbi 17.
  3. Nominatim/Overpass för adressökning av **vy-center** eller för en
     UP-markör (bestämbar referenspunkt i terrängen, *inte* skarp
     minposition).
  4. Lokal `ortnamn.json`.
- Export, delning och lagring är 100 % lokal. LocalStorage/IndexedDB OK
  för persistent state på enheten.
- All utgående delning är user-initiated (`navigator.share`, anchor-
  download eller kopiera-till-urklipp).

**0.2 Designkontrakt:**
- Samma `:root`-variabler och `.btn` / `.tab-nav` / `.about`-mönster som
  övriga tabbar.
- Font: self-hosted `fonts/inter.css`.
- Mobile first, tryckytor ≥ 48 px, fungerar stående i 360 × 640.
- Svenska texter, reglementsenlig terminologi.

**0.3 Teknikkontrakt:**
- Leaflet 1.9.4 via CDN + SRI (som övriga tabbar).
- Ingen ny build-step. Inga nya tunga bibliotek.
- MGRS-IIFE:n i `minkarta.html` är referens-implementation. Kopiera
  aldrig — återanvänd via `window.MGRS`.

**0.4 Arbetsflöde och commits:**
- En commit per fas. Stil: `MINKARTA: <kort imperativ sammanfattning>`.
- `service-worker.js` `CACHE`-namnet bumpas i slutet av varje fas enligt
  mönster `hv-20260424_minkartaN` där N = fasnummer.
- Ingen push förrän användaren godkänner. Efter push — skriv ut short
  commit-hash till användaren.
- CD till `c:\0-dropbox\Dropbox\1oels dokument\Antigravity\hv` innan
  git-/npm-kommandon (memory-policy).
- Testning sker manuellt i Chrome desktop + Android Chrome. Network-tab
  verifieras så att inga requests innehåller symbol-koordinater utöver
  tile-URL:er (z/x/y).

**0.5 PDF-tolkning:**
- Vid oklar reglementstecken — välj mest reglementsenliga tolkning.
  Notera beslutet i en `<!-- designbeslut: ... -->`-kommentar i HTML:en
  eller JSDoc-liknande kommentar över symbol-definitionen.

---

## Översikt av faserna

| Fas | Innehåll | Rörliga filer |
|----:|----------|---------------|
| 1 | Djupare zoom — auto-fallback OSM z 18–19 | `minkarta.html`, `service-worker.js` |
| 2 | Kontraststark färgpalett (halo-princip) | `minkarta-symbols.js`, `minkarta.html` |
| 3 | Saknade symboler (avståndslagd tramp/strv) + verifiera minruta/avspärrning | `minkarta-symbols.js`, `minkarta-export.js` |
| 4 | Namn-etiketter under markers + lager-toggle + export-paritet | `minkarta.html`, `minkarta-export.js`, `minkarta-symbols.js` |
| 5 | Versaler i Förband/Chef + autogenererad TNR | `minkarta.html` |
| 6 | UP-/SP-verktyg med reverse-geocode + bäring/avstånd | `minkarta.html`, `minkarta-symbols.js` |
| 7 | Datalista (MGRS-lista) i protokollslutet | `minkarta.html` |
| 8 | Ladda-ner/Dela-popover efter Exportera PNG | `minkarta.html`, `minkarta-export.js` |
| 9 | Bifoga karta vid delning (text + PNG-modal) | `minkarta.html`, `minkarta-export.js` |
| 10 | Polish: service-worker-bump, README, dagbok | `service-worker.js`, `README.md` |

Ordningen är vald så att låg-risk polish kommer först (zoom, färg,
symboler) och större kompositionsändringar (UP/SP, protokolltext,
popovers, bifoga-karta) kommer efter — detta minskar refactor-kostnaden
om en tidigare fas ändrar färg- eller symbol-kontraktet.

---

## FAS 1 — Djupare zoom med OSM-fallback (z 18–19)

**Leverans:** Karten zoomar vidare förbi z 17 och byter automatiskt till
OpenStreetMap Standard-tiles för z 18–19. Status-raden visar tydligt
"z 18 — OSM Standard" eller motsv. när fallback är aktiv. Shared-tiles-
cachen bryts inte.

**Implementation:**
1. Behåll befintligt OpenTopoMap-lager men sänk dess `maxNativeZoom` till
   17. Lägg till nytt `L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png')`
   med `minZoom: 18, maxZoom: 19`.
2. Lägg båda i en `L.LayerGroup` eller växla via `map.on('zoomend')` så
   att rätt lager är aktivt.
3. `map.setMaxZoom(19)`.
4. I `updateStatus()` inkludera lager-etikett:
   ```
   z 17 — OpenTopoMap
   z 18 — OSM Standard
   ```
5. Uppdatera `<details class="about">`-integritetstexten: nämn att
   OpenStreetMap Standard används när användaren zoomar förbi 17.
6. `minkarta-export.js`: pickZoom() höjs till 19 som loopstart. När
   zoomnivån blir ≥ 18 bytt tile-URL till OSM Standard-mönstret
   (samma CORS-policy — bildexport fortsatt möjlig).
7. Shared-tiles-cachen (service-worker) påverkas inte: nya tiles går
   inte via cachen (cross-origin tile-requests nås inte av vår SW).
   Verifiera i DevTools.
8. Attribution i footer-dekor: nämn både OTM och OSM när lager växlar.

**Klar när:** Zoom till 19 fungerar, etiketten byter i status-raden, PNG-
export vid z 19 renderar OSM-tiles utan konsolfel, integritetstext visar
nya lagret, shared-tiles-cachen är intakt.

**Commit:** `MINKARTA: djupare zoom via OSM-fallback z 18–19`

---

## FAS 2 — Kontraststark färgpalett (halo-princip)

**Leverans:** Alla symboler läses tydligt mot både vita/ljusa kartblad
(vägar), gröna skogsytor och blå vattendrag. Ljusa `MK_STROKE=#e8f0e8`
och `MK_META=#8aaa8a` byts mot halo-par: mörk stroke + stark fyllfärg.

**Färgmatris (dokumenteras som `<!-- färgmatris: ... -->` i
minkarta-symbols.js):**

| Roll | Halo (stroke 3 px) | Huvudfärg | Använts i |
|------|--------------------|-----------|-----------|
| Neutral/info | `#0a0a0a` | `#ffc107` (solrosgul) | strv-minor, fordonsminor, minlinje |
| Farligt / aktivt | `#2b1500` | `#e53935` (crimson) | utförd förstöring, avspärrning, sidverkande fordonsmina |
| Styr/export | `#0a0a0a` | `#00e5ff` (neon-cyan) | yttergränsmarkör, UP, SP |
| Yta/område | `#0a0a0a` | `#ffc107` med fyllning `rgba(255,193,7,0.18)` | minruta, minerat område, skenminering |
| Skenminering (særsk) | `#0a0a0a` | `#b0bec5` (grå, streckad) | skenminering |

**Implementation:**
1. I `minkarta-symbols.js`: definiera konstanter `MK_HALO_DARK`,
   `MK_HALO_WARM`, `MK_YELLOW`, `MK_RED`, `MK_CYAN`, `MK_GRAY`.
2. Uppdatera varje symbol-SVG så att den har en bakre stroke-layer:
   `<path ... stroke="#0a0a0a" stroke-width="3" fill="none" />`
   följt av ett andra path med huvudfärg på samma geometri.
3. Leaflet-marker-ikon: lägg `filter: drop-shadow(0 0 2px #000)` på
   `.mk-icon svg` för att ytterligare förstärka mot fotokarta.
4. Polygon/linje-objekt: sätt `sym.stroke` och `sym.fill` till nya
   paletten. I `minkarta.html` `renderObject()` — ingen ändring krävs,
   läser från sym.stroke/sym.fill.
5. `minkarta-export.js`: hexToRgba och halo-streckning byggs ut så att
   polygoner och linjer också får mörk halo i exporten (rita stroke två
   gånger: först `#0a0a0a` bred, sedan huvudfärg tunn).
6. Tooltip-klassen `.mk-label` (läggs till i fas 4): håll
   bakgrundsfärg `#0d1f0d`, vit text, 1 px border i var(--accent).
7. Dokumentera valen i både kod-kommentar och i README-dagboken under
   fas 10.

**Klar när:** Alla befintliga symboler har mörk halo + stark huvudfärg,
är tydligt läsbara mot vita, gröna och blå kartytor, och exporten
matchar pixel-exakt.

**Commit:** `MINKARTA: kontraststark fargpalett med halo`

---

## FAS 3 — Saknade symboler + reglementsverifiering

**Leverans:** De avståndslagda mineringarna (tramp + strv) finns som
polygon-symboler. Minruta verifieras mot PDF. Avspärrning verifieras
mot PDF (wawa-tagg-linje).

**Implementation:**
1. I `minkarta-symbols.js`:
   - Lägg `avstand_tramp`: polygon, streckad kant, innehåller inbäddad
     trampmina-symbol (trekant med punkt) i palett-SVG-preview. Kategori
     `polygon`, `dashArray '6 4'`, stroke `MK_YELLOW`, fyllfärg
     `rgba(255,193,7,0.12)`.
   - Lägg `avstand_strv`: polygon, streckad kant, innehåller inbäddad
     strv-mine-symbol (cirkel med inner-punkt) i preview. Samma kategori
     och stil som ovan.
   - Verifiera `minruta`: rektangel med fyra hörnmarkeringar enligt PDF
     s. 339. Om nuvarande SVG saknar hörnmarkeringar — uppdatera.
   - Verifiera `avsparrning`: linjen ska rita en "wawa-tagg"-serie (spetsar
     utåt) enligt PDF. Nuvarande polyline med zigzag + grundlinje ska
     kvarstå, men tag-spacing och riktning granskas. Om behov: byt
     rendering till dynamiskt repeaterat mönster längs polyline-segmentet.
2. Registrera i `SYMBOL_GROUPS` ny grupp `"Avståndslagda"` med
   `['avstand_tramp', 'avstand_strv']`. Alternativt flytta `avstand`
   (R-symbol punkt) till samma grupp så allt "avstånd" hänger ihop.
3. `minkarta-export.js`: inga ändringar krävs — polygoner ritas redan
   generiskt från sym.stroke/sym.fill/sym.dashArray.
4. Sökreferens: PDF `stab/Mineringar på karta - sammanställning.pdf`
   s. 339. Tolkningsbeslut dokumenteras som kommentar ovan varje
   symbol-definition, t.ex. `// PDF s.339: avstand_tramp ritas med ...`.
5. Räkneregler (pOut-generator): inkludera de nya symbolerna som
   polygonentries i "Områden"-sektionen, inte i minantals-tabellen.

**Klar när:** Paletten visar två nya avståndslagda polygonverktyg under
egen rubrik. Ritning, edit-popup, IndexedDB-persistens, export och
protokoll-datalista (fas 7) hanterar dem korrekt.

**Commit:** `MINKARTA: avstandslagda symboler + reglementsverifiering`

---

## FAS 4 — Namn-etiketter under markers + lager-toggle

**Leverans:** Varje placerad punktsymbol har en kompakt textbricka med
reglementsnamnet under sig. Lager-toggle `[✓] Namn-etiketter` i
paletten styr synligheten. PNG-exporten renderar etiketten pixel-exakt.

**Implementation:**
1. HTML/CSS i `minkarta.html`: lägg `.mk-label` (och mk-label-hidden)
   ```css
   .mk-label {
       font: 600 11px Inter, sans-serif;
       background: rgba(13, 31, 13, 0.88);
       color: #fff;
       border: 1px solid var(--accent);
       padding: 2px 5px;
       border-radius: 3px;
       white-space: nowrap;
       box-shadow: 0 1px 2px rgba(0,0,0,0.7);
   }
   ```
2. För Leaflet-markers: när `renderObject()` skapar en point/meta marker,
   kör `layer.bindTooltip(sym.label, { permanent: true, direction: 'bottom',
   offset: [0, 4], className: 'mk-label' })` om toggle är på.
3. Lager-toggle: lägg ruta i palette-head eller ny `.palette-layers`-
   sektion. Checkbox + label. Lagrar state i
   `localStorage['minkarta.layers']` som JSON `{ labels: true, ... }`.
4. När toggle ändras: iterera `state.layers`, `openTooltip()` eller
   `closeTooltip()` per layer.
5. För labels-paritet i export — i `minkarta-export.js`
   `renderExportAsync()`:
   - Efter varje drawImage av punktsymbol, om
     `opts.drawLabels !== false`, rita textbrickan med canvas:
     - Mät text: `ctx.font = '600 11px Inter'; const tw = ctx.measureText(label).width;`
     - Rita bakgrund: `ctx.fillStyle = 'rgba(13,31,13,0.88)'; ctx.fillRect(p.x - tw/2 - 4, p.y + 18, tw + 8, 16);`
     - Rita border: stroke med var(--accent) eq.
     - Rita text vit, center-aligned.
   - `exportPng()` i minkarta.html skickar med `drawLabels:
     document.getElementById('toggleLabels').checked`.
6. För polygoner/linjer: behåll befintlig tooltip-logik (etikett i
   center) — inget dubbelarbete.
7. Läs ur lager-state också vid `loadPersisted()`-flödet.

**Klar när:** Namn-etiketter kan togglas av/på via kryssruta, överlever
reload, och PNG-exporten matchar skärmbilden pixel-exakt.

**Commit:** `MINKARTA: namn-etiketter under symboler med lager-toggle`

---

## FAS 5 — Versaler i Förband/Chef + autogenererad TNR

**Leverans:** Fälten `pForband` och `pChef` skriver/visar versaler live.
TNR-fältet prefillas med UTC Zulu-kort-format DDHHMM vid rendering.
Live-autouppdatering var 60 s fram tills användaren ändrar manuellt.
Indikator "(auto)" bredvid TNR-labeln när auto-läget är på.

**Implementation:**
1. I `minkarta.html`, sektion minprotokoll-panel:
   - `#pForband` och `#pChef`: lägg `oninput="this.value=this.value.toUpperCase()"`
     (exakt samma mönster som `obslosa.html:till/fran` på rad 274 och 278).
   - CSS: `#pForband, #pChef { text-transform: uppercase; }` för visuell
     feedback även innan input-händelsen.
2. TNR (`#pTnr`):
   - Vid `DOMContentLoaded`, anropa `setMkTnrAuto()` som använder samma
     Zulu-kort-logik som obslosa `setNow()`:
     ```js
     function zuluShortNow() {
         const now = new Date();
         const p = n => String(n).padStart(2, '0');
         // UTC — lägg till padding av getUTC* för Zulu
         return p(now.getUTCDate()) + p(now.getUTCHours()) + p(now.getUTCMinutes());
     }
     ```
     (Obs: obslosa-setNow() använder lokal tid. Kravet säger UTC/Zulu.
     MINKARTA-protokoll ska använda getUTC* — vi dokumenterar avvikelsen.)
   - Sätt `#pTnr.value = zuluShortNow()` om fältet är tomt.
   - Spara en flagg `tnrAuto = true` och en referens-sträng
     `tnrAutoLast = value`.
   - `setInterval(() => { if (tnrAuto) pTnr.value = zuluShortNow(); tnrAutoLast = pTnr.value; }, 60_000)`.
   - `pTnr.addEventListener('input', () => { if (pTnr.value !== tnrAutoLast) { tnrAuto = false; updateTnrIndicator(); } })`.
3. Indikator: lägg en liten `<span id="pTnrAutoBadge">(auto)</span>`
   bredvid TNR-labeln. Visa när `tnrAuto === true`, dölj annars.
   Styling: liten dim text, `color: var(--text-muted)`, italic.
4. I textgeneratorn `generateProtocolText()` — se till att `tnr` och
   `forband`/`chef` läses via `.toUpperCase()` och trimmas (dubbel-säkring).
5. Vid export-title: använd samma versaliserade värden.

**Klar när:** Versaler visas live i båda fält. TNR prefillas med 6-siffrig
Zulu-kort, auto-ticken fungerar, och indikatorn släcks vid manuell
ändring.

**Commit:** `MINKARTA: versaler i forband-chef och auto-TNR Zulu-kort`

---

## FAS 6 — UP-verktyg och SP-verktyg (reverse-geocode + bäring/avstånd)

**Leverans:** Nya paletverktyg `UP-markör` och `SP-markör`. Placering auto-
numrerar och skriver till textarean `pUp`. UP-markören reverse-geocodar
(Nominatim → Overpass → ortnamn.json). SP-markören mäts in mot närmaste
UP i bäring + avstånd.

**Designbeslut:**
- UP och SP är beständiga referenspunkter i terrängen (PDF s. 338:
  "l´ätt att hitta i terrängen och på karta"), inte skarpa minpositioner.
  Därför är det integritetsmässigt acceptabelt att reverse-geocoda dem
  via Nominatim. Detta dokumenteras i integritetstexten.
- Auto-skrivning till `pUp`-textarean är *icke-destruktiv*: användaren
  kan fortfarande skriva över. Men om användaren raderar en UP-markör
  från kartan tas motsvarande rad bort ur textarean.
- Reglementsvarning vid färre än 2 UP eller 0 SP (varning, inte blockering).

**Implementation:**
1. `minkarta-symbols.js`:
   - Nytt `up`: kategori `meta` (eller egen `point-ref`), SVG = fylld
     cirkel Ø 20 px, färg `MK_CYAN`, vit "UP"-text i mitten, halo svart.
   - Nytt `sp`: kategori `meta`, SVG = fylld kvadrat Ø 18 px, färg
     `MK_CYAN`, vit "SP"-text i mitten, halo svart.
   - Egen grupp `"Referenspunkter"` med `['up', 'sp']`.
2. `minkarta.html`:
   - När `handleMapClick()` placerar en UP-markör: räkna `upSeq =
     state.objects.filter(o => o.typ === 'up').length + 1`. Sätt
     `obj.seq = upSeq`, `obj.label = 'UP' + upSeq`.
   - Starta `reverseGeocodeUp(obj)` som speglar obslosa-mönstret
     (Nominatim, Overpass fallback, lokal ortnamn.json). Resultat:
     `obj.adress = <string>`.
   - När reverse-geocode är klar, anropa `syncUpTextarea()` som skriver
     om `pUp` till
     ```
     UP1: <MGRS> — <adress>
     UP2: <MGRS> — <adress>
     ...
     SP1: <MGRS> (från UP1, 170° 140 m)
     ```
     Sortera UP före SP, numrera 1..n.
   - UP-markörens `dragend`: återberäkna MGRS, uppdatera adress
     (reverse-geocode igen), kör `syncUpTextarea()`.
   - Om UP raderas: `syncUpTextarea()` kör om och omnumrerar.
3. SP-markör:
   - Nytt verktyg `sp`.
   - När SP placeras: hitta närmaste `up`-objekt i state.
   - Räkna bäring + avstånd med haversine + initialBearing:
     ```js
     function initialBearing(a, b) {
         const φ1 = a.lat*π/180, φ2 = b.lat*π/180;
         const λ1 = a.lng*π/180, λ2 = b.lng*π/180;
         const y = Math.sin(λ2-λ1)*Math.cos(φ2);
         const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
         return (Math.atan2(y,x)*180/Math.PI + 360) % 360;
     }
     ```
   - Sätt `obj.refUp = closestUp.id`, `obj.bearing = Math.round(bearing)`,
     `obj.distanceM = Math.round(haversine(...))`.
   - `syncUpTextarea()` bygger raderna.
4. Reglementsvarning:
   - Beräkna `nUp = count('up')`, `nSp = count('sp')`.
   - `#pUpWarn` byggs ut: visas om `nUp < 2` eller `nSp < 1`. Meddelande:
     `"Obs: reglementet kräver minst 2 utgångspunkter och 1 startpunkt."`
5. Textarean är fortfarande fritt redigerbar. `syncUpTextarea()` skriver
   bara över när markörer placeras/flyttas/raderas. Om användaren skriver
   in manuella rader manuellt, lägg dem efter genererade rader med
   seperator-kommentar `"# manuell text nedan"`.
6. Uppdatera integritetstexten i `<details class="about">`:
   ```
   UP-markörer reverse-geocodas via Nominatim → Overpass → lokal
   ortnamn.json. UP är bestämbara referenspunkter i terrängen, inte
   skarpa minpositioner — anropet är därför inom integritetskontraktet.
   SP-markörens position skickas aldrig ut; bäring/avstånd räknas lokalt.
   ```

**Klar när:** Placering av UP1/UP2 + SP1 fyller textarean korrekt med
MGRS + adress + bäring. Drag flyttar både markör och text. Radering
städar. Reglementsvarning aktiveras rätt.

**Commit:** `MINKARTA: UP-SP-verktyg med reverse-geocode och baring`

---

## FAS 7 — Datalista (exakt MGRS-lista) i protokollslutet

**Leverans:** Efter `Anteckningar` i textgeneratorn, en sektion
`=== DATALISTA (fullständiga positioner) ===` med alla objekt på rad-
baserat format. Toggle-kryssruta `[✓] Inkludera datalista` i panelen.
Default ON.

**Format (monospace, Signal-kompatibelt):**
```
=== DATALISTA (fullständiga positioner) ===
 #  TYP                         MGRS               ETIKETT  ANTECKNING
 1  Strv-mina tryckutlöst      33VUH 23567 45678
 2  Trådmina                   33VUH 23571 45684            Vid stig
 3  Minruta (4 noder, center)  33VUH 23600 45700  HIND 12
 4  Minlinje (6 noder, start)  33VUH 23500 45650
 5  UP-markör                  33VUH 23400 45600  UP1      Rött hus
 ...
```

**Implementation:**
1. Lägg kryssrutan i protokoll-panelen (under TNR-raden eller bredvid
   ambition):
   ```html
   <label><input type="checkbox" id="pIncludeData" checked> Inkludera datalista</label>
   ```
   Persisteras i `localStorage['minkarta.includeData']`.
2. I `generateProtocolText()`:
   - Om `#pIncludeData.checked === true` (eller cache säger så), bygg en
     ny sektion efter anteckningsblocket.
   - Iterera `state.objects` i insertionsordning.
   - Rad-layout via monospace-padding:
     - `idx.padStart(2)` + ` ` + `typLabel.padEnd(26)` + ` ` + `mgrs.padEnd(18)` + ` ` + `(etikett||'').padEnd(8)` + ` ` + `(anteckning||'')`
   - Polygon/linje: MGRS = centerposition (aritmetiskt center av
     `obj.path`); i typLabel append " (<n> noder, center)" eller
     " (<n> noder, start)" för linje.
   - UP-markörer: visa seq + adress; SP-markörer: visa seq + bäring/avstånd.
3. Inga ändringar i PNG-export (datalista tillhör textprotokollet).
4. Uppdatera README-dagboken i fas 10 med en exempel-output.

**Klar när:** Generera sammanställning producerar samma text som tidigare
plus datalista-sektionen när kryssrutan är på, sorterat i insertions-
ordning, pixel-radad tabellformat.

**Commit:** `MINKARTA: datalista med fullstandiga MGRS-positioner i protokoll`

---

## FAS 8 — Ladda ner / Dela-popover efter Exportera PNG

**Leverans:** Trycket på "Exportera PNG" triggar en liten fix pop-over
med två knappar: `[ Ladda ner PNG ]` och `[ Dela via app ]`. "Ladda ner"
triggar alltid download-flödet. "Dela" använder `navigator.share` med
fallback. Popover stängs automatiskt efter 8 s eller klick utanför.

**Implementation:**
1. `minkarta.html`:
   - Flytta render-flödet (`renderExportAsync` + blob) till en separat
     `prepareExportBlob()`-funktion. Cacha resultatet i en variabel
     `lastExportBlob` + `lastExportFilename`.
   - `exportPng()` blir: kör `prepareExportBlob()`, sen visa popover.
2. Popover-DOM (dynamisk, inline):
   ```html
   <div class="mk-share-popover" id="mkSharePopover">
     <div>Karta renderad</div>
     <div class="mk-popover-actions">
       <button class="btn btn-sm btn-accent" id="mkDownloadBtn">Ladda ner PNG</button>
       <button class="btn btn-sm btn-ghost" id="mkShareBtn">Dela via app</button>
     </div>
   </div>
   ```
   CSS: `position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: var(--bg-secondary); border: 1px solid var(--accent); border-radius: 8px; padding: 12px; box-shadow: 0 6px 16px rgba(0,0,0,0.6); z-index: 10000;`
3. Ladda ner-knappen:
   - Skapar anchor, triggar click, revokeObjectURL efter 5 s (befintlig
     `shareOrDownload`-fallback används, men man skickar en `forceDownload`-
     flagg).
4. Dela-knappen:
   - `if (navigator.canShare && navigator.canShare({files:[file]}))` →
     `await navigator.share({files:[file], title, text})`.
   - Om ej tillgänglig: `toast('Delning stöds inte — filen laddades ner.')`
     och kör download-flödet.
5. Auto-stäng: `setTimeout(() => popover.remove(), 8000)`. Samt lyssnare
   `document.addEventListener('click', outsideClickHandler, { once: true })`.
6. Blobben revokeras när popover stängs.

**Klar när:** Tryck på Exportera PNG visar popover. Ladda ner sparar
filen direkt (utan share-sheet). Dela triggar share-sheet på Android
Chrome. Popover stängs efter 8 s eller vid klick utanför. Testad på
desktop och mobil.

**Commit:** `MINKARTA: popover for ladda-ner eller dela efter export`

---

## FAS 9 — Bifoga karta vid delning (text + PNG-modal)

**Leverans:** När användaren trycker `Generera sammanställning` och
sedan `Kopiera`, visas modal "Bifoga kartbild?" med tre val:
`[ Bara text ]` / `[ Text + karta (separat) ]` / `[ Avbryt ]`.
Vid text+karta: samma share-anrop om `navigator.canShare({files,text})`
stöds, annars två-steg (copy + download).

**Implementation:**
1. Wrap `pCopy.onclick` i en modal-fråga innan clipboard.write-anropet.
2. Modal-komponent (återanvänd `.mk-toast`-mönstret men större, med
   knappar):
   ```
   Bifoga kartbild?
   [ Bara text ]  [ Text + karta (separat) ]  [ Avbryt ]
   ```
   Ackn.-stil: samma som confirm/prompt-dialogen i `simplify`-skill
   (fast native-ish, men vi har inget ramverk — dynamisk DOM + absolute
   positioning med backdrop).
3. Flödesval:
   - **Bara text:** `navigator.clipboard.writeText(text); toast('Kopierat.')`
     + ev. `navigator.share({text})` som nu.
   - **Text + karta:**
     a) Kör `prepareExportBlob()` (fas 8) om inte redan cacheat.
     b) `const file = new File([blob], filename, {type:'image/png'})`.
     c) `if (navigator.canShare && navigator.canShare({files:[file], text}))`
        → `await navigator.share({files:[file], text, title: 'Minkarta'})`.
     d) Annars: skriv text till clipboard + trigga download av PNG +
        toast: `"Kopiera text inklistrad. PNG nedladdad — bifoga manuellt
        i Signal."`
   - **Avbryt:** stäng modalen, inget händer.
4. Modalen stängs via backdrop-klick eller Avbryt-knapp.

**Klar när:** På Android Chrome (Signal-integrering) delas text + PNG i
samma share-sheet. På desktop och iOS utan Web Share API gör appen
två-stegsflöde. Modalen är tangentbords-tillgänglig (Esc = Avbryt).

**Commit:** `MINKARTA: bifoga karta vid delning av protokoll`

---

## FAS 10 — Polish: service-worker, README, dagbok, versionsverifiering

**Leverans:** Repo är redo för push. Alla tidigare fasers cache-bumps
är slutgiltigt verifierade. README speglar v2. Dagboksentry beskriver
hela puckeln.

**Implementation:**
1. `service-worker.js`: bekräfta slutgiltig `CACHE = 'hv-20260424_minkartav2'`
   (eller `_minkartav2_final` om fas-bumps inte gav ett stabilt slutnamn).
   Gå igenom FILES-listan och säkerställ att alla nya filer är med (om
   vi under arbetet brutit ut t.ex. `minkarta-colors.js` eller `minkarta-ui.js`).
2. `README.md`:
   - Uppdatera funktionstabellen:
     ```
     | **MINKARTA** | Minläggningskarta & minprotokoll (djup zoom, UP/SP
     | auto-geocode, datalista, PNG + share-popover, övningsläge) |
     ```
     Ta bort "BETA" om v2 bedöms stabil nog. Alternativt: byt till
     "(BETA→stable)".
   - Dagboksentry under `### 2026-04-23: MINKARTA` eller ny
     `### 2026-04-24: MINKARTA v2` med punktlista över faserna.
3. Manuell test-matris körs sist i denna fas (egen check-lista):
   - [ ] Desktop Chrome: placera 10 symboler, inkl. minruta + avstand_tramp,
         UP/SP, generera protokoll, exportera PNG, ladda ner, dela.
   - [ ] Android Chrome: samma flow, dessutom verifiera share-sheet.
   - [ ] DevTools Network: inga utgående requests innehåller lat/lng
         utöver tile-URL:er och `/reverse?lat=...` (som bara träffas av
         UP-markörer, vilket är inom kontrakt).
   - [ ] Offline: ladda sidan fresh, stäng nätverket, testa ritning,
         persistens, protokollgenerering. Export misslyckas acceptabelt
         (tiles går inte att hämta) — men ska falla tillbaka till tom
         bakgrund med en toast.
4. `version.js` bumpas av befintligt auto-bump-flöde vid commit.
5. Skriv ut alla commit-hashar (short) till användaren efter push.

**Klar när:** Alla 10 faser är pushade, README-länkad, manuell
test-matris klar, ingen konsolfel, inga integritets-läckor.

**Commit:** `MINKARTA: polish, README, serviceworker-bump v2`

---

## Riskregister (v2-specifika)

| Risk | Mitigation |
|------|------------|
| OSM Standard-tiles har annan CORS-policy än OpenTopoMap | Testa tidigt i fas 1 — fallback: behåll z 17 som tak om OSM blockerar canvas-export. |
| UP reverse-geocode-kedjan är långsam över mobil 4G | Spinner + optimistic UI: skriv "UP1: MGRS — …laddar" direkt, uppdatera när svar kommer. |
| `navigator.canShare({files,text})` varierar mellan browsers | Feature-detekteras per anrop, fallback till download+copy. |
| Versaler i Förband/Chef krockar med inklistrat text (t.ex. åäö med bind) | `toUpperCase()` på svenska blir korrekt i moderna browsers; dokumentera om inte. |
| Auto-TNR skriver över manuell inmatning mitt i skrivning | `input`-lyssnaren släcker auto-flaggan vid första ändring — auto-intervall checkar flaggan innan overwrite. |
| Halo-streckning gör små symboler feta på mobil | Testa vid z 12 + z 15. Fallback: `stroke-width` skalas av zoom via Leaflet-ikon-storlek (32 → 36 vid z ≥ 15). |
| Reglementsavvikelse vid symbol-tolkning | Kommentar `<!-- designbeslut: ... -->` ovanför varje tolknings-osäker definition. |

---

## Uppskattad omfattning

- FAS 1: ~60 rader (lagerbyte + status-etikett + export-zoom-höjd)
- FAS 2: ~180 rader (palettdef + halo-paths)
- FAS 3: ~120 rader (2 polygon-symboler + grupper)
- FAS 4: ~180 rader (tooltip-toggle + export-label-rendering)
- FAS 5: ~80 rader (uppercase-oninput + auto-TNR-timer)
- FAS 6: ~350 rader (UP/SP-verktyg + reverse-geocode + bäring/avstånd)
- FAS 7: ~90 rader (datalista-generator + checkbox)
- FAS 8: ~120 rader (popover-DOM + share/download)
- FAS 9: ~140 rader (modal + dual-share-flöde)
- FAS 10: ~40 rader (README + service-worker-bump)

Totalt ~1 360 nya/ändrade rader fördelat på 4 befintliga filer + README.

---

## Arbetsflöde och verifiering per fas

För varje fas körs följande mini-checklista innan commit:

1. `cd "c:\0-dropbox\Dropbox\1oels dokument\Antigravity\hv"` (memory-policy).
2. Manuell smoke-test i browser (öppna `minkarta.html` via lokal SW eller
   dev-server).
3. DevTools Console: inga nya fel.
4. DevTools Network: inga nya endpoints utöver de i integritetskontraktet.
5. `service-worker.js` `CACHE`-namnet bumpat till `hv-20260424_minkarta<N>`.
6. Commit-meddelande följer `MINKARTA: ...`-mönstret.

Push sker först när användaren bekräftar. Efter push — skriv ut samtliga
short commit-hash (memory-policy).
