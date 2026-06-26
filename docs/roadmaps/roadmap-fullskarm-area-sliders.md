# Roadmap — Fullskärm + Areal + Verkansområde-sliders

Tre funktioner i `minkarta.html` / `sensorskiss.html`:

1. **Fullskärmskarta** (båda filerna)
2. **Areal för "Minerat område"** (bara `minkarta.html` — `minomrade` är polygon)
3. **Sliders för Räckvidd & Öppningsvinkel i verkansområde** (bara `minkarta.html` — `verkansomrade` finns inte i sensorskiss)

> **STATUS: ✅ KLAR — alla 4 faser levererade 2026-04-29.**
>
> - Fas 1 (`caf180b`): MINKARTA fullskärmsläge (knapp + tangent F)
> - Fas 2 (`08c87a0`): SENSORSKISS fullskärmsläge
> - Fas 3 (`4c8e4a6`): areal (m²/ha/km²) i edit-popup för minerat område
> - Fas 4 (`c43fa1f`): sliders för Räckvidd + Öppningsvinkel + rename `is-rotating` → `is-editing-live`

---

## Beslut som kräver ditt godkännande

Följande val styr implementationen. Markera alternativ eller säg "kör med rekommendationen".

### B1. Fullskärm — teknik & snabbtangent

| | Alt A: CSS-toggle (egen klass) | Alt B: Fullscreen API | Alt C: Hybrid (rekommenderas) |
|---|---|---|---|
| Hur | `body.is-fullmap` döljer header/tabs/palett, `#mapContainer` blir `position:fixed; inset:0; z-index:9999` | `document.fullscreenElement = mapWrap; mapWrap.requestFullscreen()` | Knappen kör CSS-toggle. **Långt tryck / Shift+klick** → äkta fullscreen via API. |
| Funkar offline / utan webbläsar-tillstånd | Ja | Ja men kräver user-gest | Ja |
| Döljer webbläsarens flikrad | Nej | Ja | Default nej, opt-in ja |
| Funkar i iframe / inbäddad i .se-domän | Ja | Ofta blockerat | Default ja |
| ESC stänger | Vi binder själva | Webbläsaren själv | Båda |
| Risk att glömma att man är i fullskärm | Mellan (vi visar liten "Avsluta"-knapp uppe till höger) | Låg (ESC-toast från webbläsaren) | Lågt |

**Rekommendation: Alt C (hybrid).** Knapp `⛶ Maximera` i `.map-controls`-raden. Default = CSS-toggle. Shift+klick = även äkta `requestFullscreen()`. Snabbtangent: **`F`** (bara när fokus inte är i input/textarea/contenteditable) — kollat: ingen kollision med befintliga shortcuts (befintliga handlers letar bara efter `Escape`, `Ctrl+Z`, `Delete` enligt grep i `minkarta.html`/`sensorskiss.html`). **F11 undviks** — kan inte fångas tillförlitligt och webbläsaren tar den ändå för sin egen fullscreen.

ESC stänger CSS-toggle. ESC stänger även äkta fullscreen automatiskt → vi lyssnar på `fullscreenchange` och rensar klassen om båda var aktiva.

### B2. Areal-tröskel & format

Förslag (svenskt sifferformat, mellanslag som tusentalsavskiljare, komma som decimal):

| Areal | Visas som |
|---|---|
| `< 10 000 m²` | `1 234 m²` (heltal) |
| `10 000 – 999 999 m²` | `1,23 ha` (2 dec) |
| `≥ 1 000 000 m²` | `1,23 km²` (2 dec) |

**Rekommendation: kör med ovan.** Tröskeln 10 000 m² (1 ha) är den naturliga brytpunkten — under det är m² mer läsbart, över det blir det jobbiga femsiffriga tal.

### B3. Visa arealen på kartan eller bara i popup?

Rekommendation: **bara i popup** för v1 (säg "kör"). Som v2 kan vi diskutera en liten centrumetikett (ev. togglas via `.map-controls`).

Skäl: minomrade har redan upp till 4 kant-brickor med antal — en till etikett i centrum riskerar visuellt brus. Popup räcker för planering och kvalitetskontroll, vilket är primäranvändningen.

### B4. `is-rotating` vs ny generisk klass

Rotation-popupen fadear till 25 % opacitet via klassen `mk-popup.is-rotating` (CSS rad 296–297). Samma fade vill vi ha för Räckvidd och Öppningsvinkel.

| Alt A: Återanvänd `is-rotating` | Alt B: Byt till `is-editing-live` |
|---|---|
| Lägg bara på samma klass i nya handlers | Mer korrekt namn, men kräver ändring i CSS + befintlig rotation-handler |
| 0 risk för regressionsfel | Låg risk (samma kod, bara klassnamn-byte) |
| Lite missvisande namn | Tydligt namn |

**Rekommendation: Alt B (byt till `is-editing-live`).** Det är ~6 rader CSS + 6 ställen i JS (3 i `minkarta.html`, 3 i `sensorskiss.html`). Vinst: framtida sliders för andra fält kan återanvända samma klass utan dubbel-namngivning. Görs i samma commit som Fas 4.

---

## Fasordning & motivering

Föreslagen ordning:

1. **Fas 1 — Fullskärm i minkarta** (mest värde / lägst risk; UI-only)
2. **Fas 2 — Fullskärm i sensorskiss** (samma mönster, copy/adapt)
3. **Fas 3 — Areal för minomrade** (kräver geometri, helt isolerat från resten)
4. **Fas 4 — Sliders för Räckvidd + Öppningsvinkel** (refaktor av popup + ev. CSS-rename)

**Varför denna ordning?** Fas 1 + 2 är största omedelbara nyttan ("få överblick efter att ha satt ut symboler"). Fas 3 är strikt additiv (read-only fält). Fas 4 rör live-redigering — mest känslig för regressioner i en kritisk dialog, så sparas till sist när vi har en stabil bas. Commit efter varje fas (krav enligt CLAUDE.md).

---

## Fas 1 — Fullskärm i minkarta.html

### Filer som ändras
- `minkarta.html` — CSS (i `<style>`-blocket), HTML (knapp i `.map-controls`), JS (toggle-handler).
- Inga andra filer berörs. Inga nya beroenden.

### Vad som görs
1. **CSS:** ny klass `body.is-fullmap` som:
   - `padding: 0` på body, döljer `header`, `.tab-nav`, `.tab-nav-sub`, `.search-row`, `.palette`, `details.about`.
   - Gör `.map-wrap` `position: fixed; inset: 0; z-index: 9999; border-radius: 0`.
   - `#mapContainer` → `height: 100vh`.
   - `.map-controls` flyter ovanpå kartan (transparent bg, `position: absolute; top: 8px; right: 8px`).
   - `.status-row` flyter nere (samma princip).
2. **HTML:** lägg till knappen `<button id="mkFullBtn" class="btn btn-sm btn-ghost">⛶</button>` i `.map-controls` (paletten skapar `.map-controls`-raden i JS — vi kollar var och hänger på).
3. **JS:** `toggleFullmap()` togglar `body.classList.toggle('is-fullmap')`, kallar `map.invalidateSize()` efter klassbyte (Leaflet behöver weta att containern bytt storlek). Shift+klick → även `mapWrap.requestFullscreen()`.
4. **Snabbtangent:** `keydown` på document → om `e.key === 'f'` och `e.target` inte är input/textarea/contenteditable → toggle. ESC → om `is-fullmap` är på, stäng den.
5. **`fullscreenchange`-listener** rensar `is-fullmap` om webbläsarens fullscreen avslutas och vi var i hybrid-läge.

### Risker
| Risk | Mitigation |
|---|---|
| `map.invalidateSize()` glöms → grå halvkarta | Triggas i toggle-handlern + i `transitionend` på `.map-wrap` |
| Edit-popup fastnar i fel position när container flyttar | `map.closePopup()` om en popup är öppen vid toggle (sällan ett problem om man maximerar för att få överblick — då har man redan stängt popupen) |
| Tangent `F` skriver bokstav i input | Vägg-koll mot `e.target.tagName` + `isContentEditable` (standard) |
| Mobil: `100vh` ≠ visible viewport (Safari address bar) | Använd `100dvh` med `100vh`-fallback |
| `.map-controls` skapas dynamiskt via JS — knappen kanske skapas innan eller efter | Append efter `paletteRoot`-init är klart, eller injectera den i samma DOM-skapande funktion |

### Testplan
- **Desktop, Chrome:** klicka knapp → karta fyller fönstret, palett & tabs gömda, status-rad syns ovanpå kartan. Klicka igen → tillbaka.
- **Tangent F:** desktop, fokus utanför input → toggle. Fokus i sökrutan → ska INTE toggle (typar `f`).
- **ESC:** stänger fullmap.
- **Shift+klick på knappen:** äkta `requestFullscreen()` → flikrad gömd; ESC stänger båda lager.
- **Mobil (Chrome Android):** verifiera att vyn inte går sönder; knappen ska vara klickbar; om det är jobbigt → toleransabel (krav: "får inte gå sönder", inte "perfekt på mobil").
- **Symboler på kartan:** sätt ut några symboler, växla till fullmap, bekräfta att symboler ligger kvar och att klick/edit funkar.

### Commit
`MINKARTA: fullskärmsläge för kartan (knapp + tangent F)`

---

## Fas 2 — Fullskärm i sensorskiss.html

### Filer som ändras
- `sensorskiss.html` — samma mönster som Fas 1.

### Vad som görs
Identiskt med Fas 1 men med `id="skFullBtn"` (eller delar samma ID `mkFullBtn` om det är OK — sannolikt skiljer vi för konsekvens med övriga `sk*`/`mk*`-namn). CSS-klassen `body.is-fullmap` är generisk → fungerar i båda filerna.

### Risker
- Sensorskiss har egen `.map-controls`-struktur — kontrollera att samma absolute-positioning fungerar.
- Sensorskiss har en dirLine + popup — samma `invalidateSize` + `closePopup`-mönster gäller.

### Testplan
Samma som Fas 1, fast i sensorskiss.

### Commit
`SENSORSKISS: fullskärmsläge för kartan (knapp + tangent F)`

---

## Fas 3 — Areal för "Minerat område"

### Filer som ändras
- `minkarta.html` — popup-builder (rad 1281-ish, blocket för `if (!isUpk && !isText)`), liten geometri-helper, format-helper.

### Vad som görs

1. **Geometri (geodesisk area).** Eftersom vi inte har Leaflet.draw eller `L.GeometryUtil`, implementerar vi en sfärisk shoelace-formel direkt (~15 rader, inga deps):
   - Indata: `obj.path` = `[{lat, lng}, ...]` i grader.
   - Använd standardformel: area = abs(0.5 · R² · Σ ((λ_{i+1} − λ_i) · (sin φ_i + sin φ_{i+1})))
   - R = 6 378 137 m (WGS84 ekvator-radie). Felmarginal i HV-användningsområdet (Sverige, polygoner < 1 km²): < 0.3 % → fullt OK för planering.
   - Returnerar m².
2. **Format-helper** (per beslut B2):
   - `< 10 000 m²` → heltal m² med svenska tusentalsavskiljare.
   - `10 000 – 999 999 m²` → ha med 2 decimaler, komma.
   - `≥ 1 000 000 m²` → km² med 2 decimaler, komma.
3. **Visning i popup:** lägg in en read-only rad i edit-popupen för minomrade — bara när `obj.typ === 'minomrade'`. Placering: efter Antal/Modell/Plats, före Anteckning. Disabled-input-stil (samma som de andra fälten men `readonly` och dimmad).
4. **Uppdatering:** arealen räknas om varje gång popupen öppnas (det räcker — polygonen kan inte ändra form medan popupen är öppen i nuvarande UI; bara hela formen flyttas via drag-handle, vilket bevarar arealen).

### Risker
| Risk | Mitigation |
|---|---|
| Polygoner som korsar sig själva ger missvisande area | Acceptabelt — minomrade ritas som enkla konvexa polygoner i praktiken. Skulle kunna validera, men onödig komplexitet. |
| Formel ger 0 för polygoner med < 3 noder | Kontroll: returnera `null` och göm fältet om < 3 noder. |
| Numeriska fel vid mycket små polygoner | Använd `Math.abs()`. Visa "0 m²" om area < 1 m². |

### Testplan
- Rita en kvadratisk minomrade, ungefär 100×100 m. Förvänta: ~10 000 m² → visas som "1,00 ha" (gränsen).
- Rita 50×50 m → ~2 500 m² → "2 500 m²".
- Rita 2×2 km → ~4 000 000 m² → "4,00 km²".
- Jämför med en känd polygon i Google Earth eller Lantmäteriets minkarta för att verifiera ±1 %.
- Drag-handla polygonen → öppna popup igen → arealen ska vara densamma (translation bevarar area; säkerhetscheck).
- Verifiera att ingen annan symbol-typ visar areal-fältet.

### Commit
`MINKARTA: visa areal (m²/ha/km²) i edit-popup för minerat område`

---

## Fas 4 — Sliders för Räckvidd & Öppningsvinkel

### Filer som ändras
- `minkarta.html` — popup-builder rad 1294–1298 (Räckvidd / Öppningsvinkel), live-handler-blocket runt rad 1351–1392, save-handlern rad 1437–1440, samt CSS-renamen för `is-rotating` → `is-editing-live` (rad 296–297).
- `sensorskiss.html` — bara CSS- och JS-rename av `is-rotating` → `is-editing-live` (rad 170–171, 812, 819) för konsekvens. Funktionellt oförändrat.

### Vad som görs

1. **CSS-rename** (per beslut B4): `mk-popup.is-rotating` → `mk-popup.is-editing-live` i `minkarta.html`, `sk-popup.is-rotating` → `sk-popup.is-editing-live` i `sensorskiss.html`. Uppdatera handlers samtidigt.
2. **HTML i edit-popup för verkansområde:** byt ut nuvarande `<input type="number">` för `edRange` och `edSpread` mot **slider + synkad number** i samma layout som rotation (rad 1303–1306):
   - Räckvidd: `min=10 max=5000 step=10`.
   - Öppningsvinkel: `min=5 max=360 step=1`.
3. **Live-handler:** klona rotationsmönstret (rad 1351–1392):
   - `origRange`, `origSpread`, `rangeCommitted`, `spreadCommitted` flaggor.
   - `liveUpdateRange(raw)` / `liveUpdateSpread(raw)` clamp + `obj.range`/`obj.spread` + `rebuildLayers()`.
   - `beginFade()` / `endFade()` — **återanvänd samma fadetimer som rotation** (delas mellan alla tre live-fält så att flera ändringar inte trampar varandras timer). Konkret: lyft `fadeTimer`, `beginFade`, `endFade` ur rotation-blocket till funktions-toppen i `openEditPopup`, så alla tre handlers använder samma instans.
   - `onPopupClose`: återställ `obj.range = origRange` om `!rangeCommitted` och samma för spread; `rebuildLayers()` om något återställdes.
4. **Save-handler:** befintlig logik (rad 1437–1440) sätter redan `obj.range` / `obj.spread` från number-inputten — den fortsätter funka eftersom vi behåller `id="edRange"` / `id="edSpread"` på number-rutan. Lägg till `rangeCommitted = true; origRange = obj.range;` och samma för spread (parallellt med rotation rad 1443–1444).

### Risker
| Risk | Mitigation |
|---|---|
| `rebuildLayers()` på varje `input`-event → laggar vid drag av slider | Acceptabelt — rotation gör samma sak och fungerar bra. Polygonen är liten. |
| Återställ-logiken trampar på "Spara"-vägen om Spara-knappen inte sätter committed-flaggorna | Var noga med ordningen: sätt flaggorna FÖRST i save-handlern, sen `closePopup()`. |
| `edRange`/`edSpread` finns inte längre när popupen ritar någon annan symbol-typ | Befintlig kod gör redan `if (rangeInput) ...` — fortsätter funka. |
| `is-rotating` → `is-editing-live`-rename missar någon förekomst | Grepp efter "is-rotating" i båda filerna före commit. |
| Inputs blockerar eller läcker focus-ring | Ta över samma CSS som rotation-raden (`flex:1` slider, `width:64px` number) |

### Testplan
- Öppna verkansområde-popup → bekräfta tre rader (Räckvidd, Öppningsvinkel, Rotation), alla med slider+number.
- Dra Räckvidds-slidern → sektorn växer/krymper live på kartan, popupen fadear till 25 %, släpp → fade tillbaka.
- Dra Öppningsvinkel — samma beteende.
- Skriv siffra i number-rutan → slidern följer med, sektorn uppdateras.
- Stäng popup utan Spara (klicka på kartan utanför, ESC, eller X) → sektorn återgår till ursprungsvärden.
- Klicka Spara → värdena sparas, popup stänger, sektor stannar.
- Klicka Ta bort → symbolen tas bort, ingen återställnings-logik triggas.
- Verifiera rotation fortfarande funkar efter rename av CSS-klass.
- Sensorskiss: öppna en directional-symbol → rotation-fade fungerar fortfarande efter rename.

### Commit
`MINKARTA: sliders för Räckvidd och Öppningsvinkel (live-uppdatering + rebuild)` plus `+ rename is-rotating → is-editing-live (minkarta + sensorskiss)` om vi gör båda i samma commit. Kan splittras i två om det blir tydligare.

---

## Open questions inför "kör"

1. **B1:** OK med hybrid-knapp + `F`-tangent? Eller vill du ha endast en av dem?
2. **B2:** OK med `< 10 000 m²` → m², `< 1 km²` → ha, annars km²? Samma trösklar som föreslaget?
3. **B3:** Bara popup för v1, eller vill du ha centrumetikett från början?
4. **B4:** OK att byta `is-rotating` → `is-editing-live` (samma commit som Fas 4) för att hålla namnet generiskt?
5. **Fas 4 i sensorskiss:** sensorskiss saknar `verkansomrade` med range/spread — är det rätt uppfattat? Eller finns det ett liknande fält jag har missat? (Snabbgrep visar `skfRot` men inte `skfRange`/`skfSpread`.)

Säg "kör" + svar på frågorna ovan, så börjar jag med Fas 1.

---

## Återstår (efter alla faser)

- **Göm mapping-dialogen på touch-enheter.** Badgarna döljs redan via
  `@media (hover: none) and (pointer: coarse)`, men `dblclick` på palett-
  knappen öppnar fortfarande mapping-dialogen även på mobil — vilket är
  meningslöst utan tangentbord. Lägg till samma media-query-villkor i
  `openShortcutDialog()` så funktionen blir no-op på touch-only-enheter
  (eller åtminstone visar en toast: "Genvägar kräver tangentbord"). Gäller
  både `minkarta.html` och `sensorskiss.html`.
