# SENSORSKISS v1 — Roadmap

Bakgrund: HV-appen (statisk HTML/JS, deploy via GitHub Pages, CNAME
`7srapport.com`) har idag tabben MINKARTA — Leaflet-karta för minläggning
med symbolpalett, minprotokoll-export och interaktiv mini-skola. Vi ska
nu lägga till en parallell tab SENSORSKISS för **sensoruppsättning**
enligt Hemvärnets utbildning. Källor:

- `stab/Utbildningsanvisning sensorer Hemvärn 2025.pdf` (FM2025-8701:1,
  74 sidor). Sensorerna beskrivs i kap 2 (s. 7–58), bedömande i kap 3
  (s. 59–71) och sensor-symbolerna i sammanställningen s. 72.
- `stab/JL.pdf` (2 sidor) — användarens önskemål om typ-numrering
  (`C1, C2…`, `P1, P2…`, `K1, K2…`, `U1, U2…`, `L1, L2…`),
  in/utfartspost, samt en explicit önskan att "lägga in beslutsstödsplan
  under Sensorfliken".

Symboler som ska implementeras (s. 72 + JL.pdf):

| Symbol               | Källa     | Typ-prefix | Anmärkning |
|----------------------|-----------|------------|------------|
| CIM (sensor)         | s. 72     | C          | Riktning kan anges med streckad linje. |
| PIR (sensor)         | s. 72     | P          | Riktning + sektor (40/80 m, 8 m diameter). |
| KAMERA (sensor)      | s. 72     | K          | Riktning + synfält (FOV ~69°/16°). |
| UMRA (sensor)        | s. 72     | U          | Verkanradie (50 m person, 100–200 m fordon). |
| Larmmina             | s. 72     | L          | Snubbeltråd-radie ~25–50 m. |
| RPAS (propellerdriv.)| s. 72     | (egen)     | UAV-symbol med roterande vingar. |
| Sensorområde         | s. 72     | —          | Frihandsritad polygon med antal/typ. |
| Enkelpost            | s. 72     | —          | Egen symbol. |
| Dubbelpost / patrull | s. 72     | —          | Egen symbol. |
| In/Utfartspost       | JL.pdf    | —          | Egen symbol. |

Sensorprotokoll-blankett: PDF:en visar **detaljskiss sensor**
(s. 66, fig 43) — i princip en handritad skiss med MGRS, riktning,
anteckning per sensor — och **beslutsstödsplan** (s. 71, fig 48) som
tabell med BT, Händelse, Handlingsalternativ, Beslutstidpunkt,
Infobehov/indikator, Inhämtning av. Ingen formell tryckt blankett finns
för "sensorprotokoll" på samma sätt som för minprotokoll. Vi bygger
istället **två** export-vägar:

1. **Sensorprotokoll** (textrapport + PNG-karta) — auto-genererad lista
   över alla utlagda sensorer med MGRS, typnummer, riktning och
   anteckning. Speglar minprotokoll-flödet i `minkarta-export.js`.
2. **Beslutsstödsplan** — tabell-panel under kartan (samma `<details>`-
   mönster som minprotokoll) som användaren själv fyller i. Inkluderas
   i textrapporten om panelen är ifylld.

Arkitektur: alla nya filer speglar `minkarta-*`-stacken (HTML inline-CSS,
fristående JS-moduler, inline-SVG-symboler, IndexedDB-persistens, PNG-
export via canvas + tiles, mini-skola via overlay-divs). MGRS-IIFE:n och
sökrutans `extractCoord` återanvänds genom **kopiering** — inte
delad fil — för att hålla MINKARTA-tabben frikopplad från SENSORSKISS-
tabben (samma princip som v3/v4 av MINKARTA tillämpat).

Filstruktur efter v1:

```
sensorskiss.html             ← ny
sensorskiss-symbols.js       ← ny
sensorskiss-export.js        ← ny
sensorskiss-tutorial.js      ← ny
sensorskiss-tutorial.css     ← ny
service-worker.js            ← uppdaterad FILES + CACHE
index.html                   ← +1 rad i tab-nav-sub
what.html, scrim.html, weft.html, ah.html,
obslosa.html, fors.html, pedars.html, postschema.html,
eobusare.html, obo.html, rassoika.html, vader.html,
minkarta.html                ← +1 rad i tab-nav-sub
roadmap-sensorskiss-v1.md    ← denna fil
```

---

## 0. Ramverk och oföränderliga kontrakt

Ärvs från MINKARTA v4 (`roadmap-minkarta-v4.md` § 0).

**0.1 Integritet:**
- Inga sensorpositioner, beslutsstödsplan-data eller anteckningar
  skickas till någon server.
- Tillåtna utgående anrop (samma som MINKARTA):
  1. OpenTopoMap-tiles (z 3–17).
  2. OpenStreetMap Standard-tiles (z 18–19).
  3. Nominatim/Overpass för vy-center vid sökning.
- LocalStorage/IndexedDB OK för persistens.
- All export och delning är user-initiated.

**0.2 Designkontrakt:**
- Samma `:root`-variabler, `.btn`, `.tab-nav`, `.about`-mönster, samma
  Inter-typografi som MINKARTA. Kopiera CSS-blocket från `minkarta.html`
  istället för att refaktorera ut till delad fil.
- Mobile first, ≥ 48 px tryckytor, 360 × 640 stående.
- Svenska texter, reglementsenlig terminologi (sensor, sensorlinje,
  sensorområde, post, beslutstillfälle).

**0.3 Teknikkontrakt:**
- Leaflet 1.9.4 via CDN + SRI (samma `integrity`-hashar som MINKARTA).
- Ingen ny build-step, inga nya tunga bibliotek.
- MGRS-IIFE:n kopieras in i `sensorskiss.html` — exponeras på
  `window.SK_MGRS` så att tabben kan debuggas oberoende av MINKARTA.

**0.4 Arbetsflöde och commits:**
- En commit per fas. Stil: `SENSORSKISS: <kort imperativ sammanfattning>`.
- `service-worker.js` `CACHE`-namnet bumpas i fas 7 (slutfasen) till
  `hv-20260429_sensorskissv1`. Mellanbumps ej nödvändiga eftersom
  service-worker fetch-strategy är network-first för HTML/JS — nya
  filer hämtas online direkt vid första laddning.
- Ingen push förrän användaren godkänner. Efter push — skriv ut short
  commit-hash per commit (memory-policy `feedback_push_version`).
- CD till `c:\0-dropbox\Dropbox\1oels dokument\Antigravity\hv` innan
  git-/npm-kommandon (memory-policy `feedback_cd_to_repo`).
- Testning: manuell i Chrome desktop. Network-tab verifieras så att
  inga requests läcker sensorpositioner.

**0.5 Dependens-ordning:**
Skelettet (FAS 2) kommer först. Symbolbiblioteket (FAS 3) bygger på
skelettet. Ritning/edit (FAS 4) bygger på symbolerna. Protokoll/
beslutsstödsplan (FAS 5) bygger på datamodellen från FAS 4. Tutorial
(FAS 6) bygger på alla föregående. Cache + polish (FAS 7) sist.

---

## Översikt av faserna

| Fas | Innehåll | Rörliga filer |
|----:|----------|---------------|
| 1 | Denna roadmap (`roadmap-sensorskiss-v1.md`) | ny fil |
| 2 | Skelett `sensorskiss.html` (header, tab-nav, sökruta, karta, statusrad, palett-stub, om-panel) + tab-nav-länk SENSORSKISS i alla 14 sidor med samma sub-nav | ny `sensorskiss.html`, alla 14 HTML-sidor |
| 3 | `sensorskiss-symbols.js` med 10 SVG-baserade symboler (CIM, PIR, KAMERA, UMRA, Larmmina, RPAS, Enkelpost, Dubbelpost/patrull, In/Utfartspost, Sensorområde) + paletten renderas | `sensorskiss-symbols.js` (ny), `sensorskiss.html` (script-tag, palettrendering) |
| 4 | Karta + ritning + edit-flow: klick placerar symbol med auto-numrering (C1/P1/…), drag, edit-popup med riktning/sektor/anteckning, polygon-ritning för Sensorområde, IndexedDB-persistens, undo/redo | `sensorskiss.html` |
| 5 | Beslutsstödsplan-panel + sensorprotokoll-export (`sensorskiss-export.js` — PNG-render + Dela protokoll, samma teknik som `minkarta-export.js`) | `sensorskiss.html`, `sensorskiss-export.js` (ny) |
| 6 | Mini-skola: `sensorskiss-tutorial.js`/`.css` med 3 steg (Välkommen, Sensortyper, Lökprincipen + Beslutsstödsplan) | `sensorskiss-tutorial.js` (ny), `sensorskiss-tutorial.css` (ny), `sensorskiss.html` (link/script) |
| 7 | Service-worker `CACHE`-bump + lägg till nya filerna i `FILES`, README-dagboksentry 2026-04-29, manuell test-matris | `service-worker.js`, `README.md` |

Totalt 7 commits.

---

## FAS 1 — Roadmap (denna fil)

### Mål
`roadmap-sensorskiss-v1.md` finns i repo-roten med översikt, faslista,
integritetskontrakt och commit-policy.

### Filer
- `roadmap-sensorskiss-v1.md` (ny)

### Steg
1. Skriv denna fil.
2. `git add roadmap-sensorskiss-v1.md` + commit.

### Acceptanskriterier
- Filen finns och innehåller alla 7 faser.
- Stilen speglar `roadmap-minkarta-v4.md`: numrerade faser, Mål/Filer/
  Steg/Acceptanskriterier/Commit-msg per fas, ingen emoji.

### Commit-msg
`SENSORSKISS: roadmap v1`

---

## FAS 2 — Skelett `sensorskiss.html` + tab-nav-länkar

### Mål
Öppna `sensorskiss.html` → samma look-and-feel som `minkarta.html`:
header med "SENSORSKISS (BETA)" + undertitel "Sensoruppsättning &
beslutsstödsplan", tab-nav (samma 5 + sub-nav men med SENSORSKISS som
`active`), sökruta som tar MGRS / lat,lon, kartcontainer med Leaflet
+ OTM/OSM hybrid-tile-stack, statusrad med MGRS + zoom, tom palett-stub.
SENSORSKISS-länken finns i `tab-nav-sub` på samtliga 14 sidor som har
denna sub-nav.

### Filer
- `sensorskiss.html` (ny — ca 600 rader, mestadels kopierad CSS + MGRS-
  IIFE från `minkarta.html`)
- `index.html`, `what.html`, `scrim.html`, `weft.html`, `ah.html`,
  `obslosa.html`, `fors.html`, `pedars.html`, `postschema.html`,
  `eobusare.html`, `obo.html`, `rassoika.html`, `vader.html`,
  `minkarta.html` — en rad till i `<nav class="tab-nav-sub">`.

### Steg
1. Skapa `sensorskiss.html` baserad på `minkarta.html`-skelettet:
   - Kopiera hela `<head>` (CSP, viewport, theme-color, manifest, fonts).
     Justera `<title>` → "SENSORSKISS — Sensoruppsättning". Drop
     `minkarta-tutorial.css` link och alla `minkarta-*`-script — de
     ersätts av `sensorskiss-*` i senare faser. I FAS 2 läggs ingen
     `<script>` till för symbolbibliotek/export/tutorial ännu.
   - Kopiera in samma `:root`-variabler och `*`-CSS, `body`-CSS,
     `.tab-nav` / `.tab-nav-sub` / `.tab-link`, `.btn`-varianter,
     `.search-row`, `.map-wrap` / `#mapContainer` / `.map-spinner`,
     `.status-row` / `.status-mgrs`, `details.about`, `.palette*`,
     `.mk-tool` (men ändra prefixet till `.sk-tool` för isolering),
     `.mk-icon` → `.sk-icon`, `.leaflet-tooltip.mk-label` →
     `.leaflet-tooltip.sk-label`, `.mk-toast` → `.sk-toast`,
     `.map-controls`, `@media`-regler.
   - `<header>` med "SENSORSKISS (BETA)" och undertitel
     "Sensoruppsättning & beslutsstödsplan".
   - `<nav class="tab-nav">` med 7S/WHAT/SCRIM/WEFT/A–H (samma
     ordning som i `minkarta.html`), inget `active`.
   - `<nav class="tab-nav-sub">` med alla nio sub-tabbar +
     MINKARTA + SENSORSKISS — totalt 11 länkar. SENSORSKISS får
     `class="tab-link active"`.
   - `<main>` med sökruta (`#mgrsSearch`, `#goBtn`), `.map-wrap`
     (`#mapContainer` + `.map-spinner` + `.status-row` med
     `#statusMgrs` och `#statusZoom`), `<div class="map-controls"
     id="mapControls">` (tom i FAS 2), `<section class="palette"
     id="paletteRoot">` med palette-head + palette-body (tom),
     och `<details class="about">` "Om SENSORSKISS & integritet"
     med samma integritetstext som MINKARTA.
   - `<script>`-block: kopiera MGRS-IIFE från `minkarta.html`
     (`MGRS = (() => { ... })()`), exponera som `window.SK_MGRS`.
     Kopiera `extractCoord(text)`, `HybridTileLayer`,
     `initMap`, `updateStatus`, `safeMgrs`, `jumpTo`, `handleSearch`
     — identiska men med renamed `STORAGE_KEY = 'sensorskiss.lastView'`.
     Lyssna på `goBtn.click` och `mgrsSearch.keydown` Enter →
     `handleSearch`.
   - Vid bottom: `window.addEventListener('DOMContentLoaded', () => {
     initMap(); });`. **Ingen** palett-rendering ännu (väntar på
     `window.SK_SYMBOLS` i FAS 3).
2. För varje av de 14 HTML-sidorna: lägg till
   `<a href="sensorskiss.html" class="tab-link">SENSORSKISS</a>`
   som **sista** länk inuti `<nav class="tab-nav-sub">`. På
   `sensorskiss.html` själv är det redan med `active`-klass.
   Notera: sub-grid är `repeat(3, 1fr)` så 11 länkar wrappar till 4
   rader (3+3+3+2). Ingen CSS-justering nödvändig.

### Acceptanskriterier
- `python3 -m http.server` i repo-roten → öppna `sensorskiss.html`:
  - Header visar SENSORSKISS (BETA), undertitel sensoruppsättning &
    beslutsstödsplan.
  - Tab-nav-sub visar alla 11 sub-tabbar med SENSORSKISS markerad
    grön (`active`).
  - Kartan laddar OTM-tiles, default vy = Stockholm (z 5).
  - Sökruta accepterar "33VXF 69104 80045" → kartan hoppar till
    Uppland/Gästrikland (samma round-trip som MINKARTA).
  - Sökruta accepterar "59.33, 18.07" → Stockholm.
  - Statusrad uppdateras vid pan/zoom.
- Klicka SENSORSKISS-länken på `index.html` → laddar
  `sensorskiss.html`, länken är aktiv.
- Klicka MINKARTA-länken på `sensorskiss.html` → tillbaka till
  MINKARTA, ingen regression i MINKARTA-funktionalitet.
- DevTools Console: inga fel.
- DevTools Network: inga nya endpoints utöver OTM/OSM-tiles.

### Commit-msg
`SENSORSKISS: skelett + tab-nav-lankar pa alla sidor`

---

## FAS 3 — Symbolbibliotek `sensorskiss-symbols.js`

### Mål
`sensorskiss-symbols.js` exponerar `window.SK_SYMBOLS`,
`window.SK_SYMBOL_GROUPS`, `window.skMakeIcon` enligt samma kontrakt
som `minkarta-symbols.js`. Tio symboler från PDF:erna är inline-SVG:er
med vit halo via CSS-filter. Paletten renderas i `sensorskiss.html`.

### Filer
- `sensorskiss-symbols.js` (ny, ca 250 rader)
- `sensorskiss.html` — `<script src="sensorskiss-symbols.js" defer>` +
  ny funktion `renderPalette()` som läser `SK_SYMBOL_GROUPS` och
  bygger palette-body.

### Steg
1. Skapa `sensorskiss-symbols.js`. Konstantblock:
   ```js
   const SK_INK = '#000000';
   const SK_HALO = '#ffffff';
   const SK_DASH = '6 4';   // streckad riktningslinje (PDF s. 72)
   ```
2. Definiera 10 symboler i `SYMBOLS`-objektet. Varje entry har
   `label`, `category` (`'point'` | `'polygon'`), `svg`, samt
   eventuellt `prefix` (auto-numreringens bokstav) och `directional`
   (boolean — symbolen kan ha riktning).

   Konkreta SVG-skisser (rena, svart-vita, viewBox 0 0 24 24 där inte
   annat anges):

   - **`cim`** (CIM) — kvadrat med "C"-text inuti.
     `<rect x="3" y="3" width="18" height="18" fill="#000"/>` +
     `<text x="12" y="17" text-anchor="middle" fill="#fff"
     font="bold 12px Inter">C</text>`. `prefix: 'C'`, `directional: true`.
   - **`pir`** (PIR) — triangel med "P".
     `<polygon points="12,3 22,21 2,21" fill="#000"/>` +
     vit P-text. `prefix: 'P'`, `directional: true`.
   - **`kamera`** (KAMERA) — cirkel med "K".
     `<circle cx="12" cy="12" r="10" fill="#000"/>` + vit K-text.
     `prefix: 'K'`, `directional: true`.
   - **`umra`** (UMRA) — romb med "U".
     `<polygon points="12,2 22,12 12,22 2,12" fill="#000"/>` +
     vit U-text. `prefix: 'U'`, `directional: true`.
   - **`larmmina`** (Larmmina) — fylld svart cirkel + ljud-streck
     (samma figur som `larm` i `minkarta-symbols.js` men utan
     numrering — Larmmina i sensorkontext är ren detekterings-
     symbol). `prefix: 'L'`, `directional: false`.
   - **`rpas`** (RPAS, propellerdriven) — quadkopter-X med fyra
     små cirklar i hörnen (motsvarande `multicopter_quad.svg` som
     redan finns i repo-roten). Använd som referens men inline:a
     en förenklad SVG. `directional: false` (drönare flyger
     dynamiskt — riktning ritas inte på skiss).
   - **`enkelpost`** (Enkelpost) — liten triangel med svart fyll
     riktad uppåt + cirkel inuti.
     `<polygon points="12,4 21,20 3,20" fill="#000" stroke="#000"
     stroke-width="1"/>` + `<circle cx="12" cy="15" r="3"
     fill="#fff"/>`. `directional: false`.
   - **`dubbelpost`** (Dubbelpost / patrull) — två trianglar bredvid
     varandra. `directional: false`.
   - **`infart`** (In/Utfartspost) — cirkel med pil tvärsigenom
     (visar "passage"). `<circle cx="12" cy="12" r="9" fill="none"
     stroke="#000" stroke-width="2.5"/>` +
     `<path d="M3 12 L21 12" stroke="#000" stroke-width="2.5"/>` +
     `<polygon points="21,12 17,9 17,15" fill="#000"/>`.
     `directional: true` (passageriktning).
   - **`sensorområde`** (`'polygon'`) — frihandsritad polygon med
     streckad svart kant + ljus fyllning. Sym har också ett
     `editableFields` som inkluderar `text` (typ + antal) som
     visas i tooltip.

3. `SYMBOL_GROUPS` (UI-layout):
   ```js
   const SYMBOL_GROUPS = [
       { title: 'Markbundna sensorer', ids: ['cim', 'pir', 'kamera', 'umra'] },
       { title: 'Larmmina',            ids: ['larmmina'] },
       { title: 'Luftburna sensorer',  ids: ['rpas'] },
       { title: 'Poster',              ids: ['enkelpost', 'dubbelpost', 'infart'] },
       { title: 'Områden',             ids: ['sensorområde'] }
   ];
   ```

4. `makeIcon(id, obj)` — bygger Leaflet `L.divIcon` enligt samma
   kontrakt som `minkarta-symbols.js`: `iconSize: [34,34]`,
   `iconAnchor: [17,17]`, `className: 'sk-icon sk-icon-' + id`. Om
   symbolen är `directional` och `obj.rotation` är satt, slå in SVG:n
   i `<div style="transform: rotate(Xdeg)">…</div>`. Om symbolen har
   en `obj.numLabel` (t.ex. "C1"), rendera siffran inuti SVG:n via
   en hjälp-funktion `numberedSvg(baseSvg, label)` som ersätter den
   default-text-bokstaven (C/P/K/U) med "C1", "C2" osv.

5. `window.SK_SYMBOLS = SYMBOLS;
   window.SK_SYMBOL_GROUPS = SYMBOL_GROUPS;
   window.skMakeIcon = makeIcon;`.

6. I `sensorskiss.html`:
   - Lägg till `<script src="sensorskiss-symbols.js" defer></script>`
     i `<head>`.
   - Lägg till `renderPalette()`-funktion (kopiera mönstret från
     `minkarta.html`:s `renderPalette` men med `.sk-tool` istället
     för `.mk-tool` och `SK_SYMBOL_GROUPS` istället för
     `MK_SYMBOL_GROUPS`).
   - Vid `DOMContentLoaded`: `initMap(); renderPalette();`.
   - Implementera `setActiveTool(id)` (kopiera från
     `minkarta.html`) — för FAS 3 är klick på en knapp bara visuellt
     "aktiv" (gul/grön border). Kart-klick ignoreras till FAS 4.

### Acceptanskriterier
- Öppna `sensorskiss.html`: paletten visar 5 grupper med 10 symboler
  totalt. Varje knapp har en SVG (28×28 i palett) + textetikett.
- Klicka en knapp → den får `.is-active`-klass (grön border).
- Klicka samma knapp igen → avaktivera.
- DevTools Console: inga fel.
- Inget kart-klick-beteende ännu (FAS 4).

### Commit-msg
`SENSORSKISS: symbolbibliotek + palett (10 symboler fran s. 72)`

---

## FAS 4 — Karta + ritning + edit-flow

### Mål
Klick på kart-yta med aktivt verktyg placerar en sensor-symbol med
auto-numrering (`C1`, `C2`, `P1`, …, `L1`, …). Symbolen kan dras med
muspekaren. Klick på utlagd symbol i pan-läge öppnar edit-popup med
fält för riktning (slider 0–360°), typnummer (override), anteckning, och
för polygon-symboler antal sensorer + typ-text. Sensorområde-polygonen
ritas via klick-klick-dubbelklick (samma flöde som MINKARTA-polygoner).
State persisteras i IndexedDB. Undo/redo via toolbar-knappar.

### Filer
- `sensorskiss.html`

### Steg
1. **Datamodell:**
   ```js
   const state = {
       objects: [],   // { id, typ, lat, lng, rotation, numLabel, anteckning }
                      // för polygon: { id, typ, path: [{lat,lng}…], antalText, anteckning }
       layers: {},
       counters: { C: 0, P: 0, K: 0, U: 0, L: 0 }  // auto-numrering
   };
   ```
2. **`addObject(obj)`:** för directional point-symboler där
   `SK_SYMBOLS[obj.typ].prefix` finns: bumpa
   `state.counters[prefix]` och sätt `obj.numLabel = prefix +
   counter`. Annars lämna numLabel ostå.
3. **Kart-klick:** om `activeTool` är en point-symbol → skapa obj
   på klickposition + auto-öppna edit-popup. Om `activeTool` är
   `'sensorområde'` → bygg path-array via klick (en marker per nod);
   dubbelklick stänger polygonen.
4. **Drag av symboler:** Leaflet `L.marker({ draggable: true })`.
   `dragend` → uppdatera `obj.lat/lng` + `pushUndo`.
5. **Edit-popup:** Leaflet popup med
   - rotation-slider 0–360° (om `directional`),
   - text-input för numLabel (override),
   - textarea för anteckning,
   - för `'sensorområde'`: fält för antal sensorer + typ-text (visas
     som tooltip, t.ex. "3 PIR + 1 KAMERA"),
   - "Spara" + "Ta bort"-knappar.
6. **Riktnings-rendering:** om `obj.rotation` är satt på en
   directional symbol, applicera `transform: rotate(Xdeg)` på
   icon-wrapper (som FAS 3 redan stödjer i `skMakeIcon`). Rita
   dessutom en streckad svart linje från symbol-center 30 px ut i
   riktningens bäring (Leaflet `L.polyline` med dashArray
   `'6 4'`). Linjen är ett separat sub-layer (`state.layers[id +
   '_dir']`) som följer med vid drag och rensas vid radering.
7. **Toolbar-knappar:** Ångra / Gör om / Rensa allt (samma teknik
   som `minkarta.html`'s `palette-toolbar` + `attachToolbarActions`).
   Lägg dem i `palette-toolbar`-div under symbolerna.
8. **`map-controls`-rad** (under kartan, ovanför paletten):
   "Namn-etiketter" toggle (visa/dölj typnummer-tooltips) +
   "Panorera / välj"-knapp som sätter `activeTool = null`.
9. **IndexedDB-persistens:** kopiera `loadPersisted()` /
   `saveAutosave()` / `scheduleAutosave()` från `minkarta.html`
   med `DB_NAME = 'sensorskiss'`, `STORE = 'state'`. Auto-spara
   200 ms efter varje `pushUndo`. Vid `DOMContentLoaded`: ladda
   state innan `renderPalette()` så symbolerna ritas direkt.
10. **Tooltips:** namn-etikett `obj.numLabel` (eller `sym.label`
    om numLabel saknas) under symbolen, samma `.sk-label`-CSS som
    `.mk-label`.

### Acceptanskriterier
- Klicka CIM-knappen → klicka kartan → en CIM-symbol "C1" placeras.
  Klicka igen → "C2" placeras. Reload sidan → båda finns kvar.
- Drag en CIM-symbol → den följer pekaren. Släpp → ny position
  sparas.
- Klicka en utlagd CIM-symbol i pan-läge → edit-popup öppnas. Sätt
  rotation = 90° → en streckad linje pekar österut från symbolen.
  Spara → linjen behålls.
- Aktivera Sensorområde → klicka 4 punkter + dubbelklicka → en
  polygon ritas. Edit → "3 PIR + 1 KAMERA" → tooltip visar texten
  i polygonens center.
- Ångra raderar senaste objekt; Gör om återställer det.
- Rensa allt nollställer även `state.counters` (nästa CIM blir
  C1 igen).
- Toggla Namn-etiketter → tooltips försvinner/återkommer.
- Inga konsolfel. IndexedDB innehåller efter en session med 5
  symboler ett `objects`-fält med 5 entries.

### Commit-msg
`SENSORSKISS: ritning, auto-numrering och edit-popup`

---

## FAS 5 — Beslutsstödsplan + sensorprotokoll-export

### Mål
Två panel-tillägg under kartan:

1. **Beslutsstödsplan** (`<details>`-panel med id `bspPanel`) som
   speglar PDF s. 71 fig 48: en tabell med kolumner BT, Händelse,
   Handlingsalternativ, Beslutstidpunkt, Infobehov/indikator,
   Inhämtning av. Användaren kan lägga till nya rader och redigera
   befintliga. Tabellen sparas i localStorage (`sensorskiss.bsp`).
2. **Sensorprotokoll** (`<details>`-panel med id `protoPanel`) som
   auto-genererar en lista över alla utlagda sensorer:
   ```
   SENSORSKISS — 2026-04-29 13:42Z
   Förband: 2. HVPLUT
   Chef:    FK SVENSSON

   Markbundna sensorer:
     C1  33VXF 69100 80050  riktn 045°  "längs stigen"
     C2  33VXF 69105 80048  riktn 090°  "korsväg"
     P1  33VXF 69103 80052  riktn 030°  "väcker K1"
     U1  33VXF 69108 80044  —           "linjebevakning"

   Larmminor:
     L1  33VXF 69112 80040  "max 150 m till post"
     L2  33VXF 69115 80038

   Poster:
     2 enkelposter, 1 dubbelpost, 1 in/utfartspost.

   Sensorområden:
     1 område: "3 PIR + 1 KAMERA — västra inflyget"

   Beslutsstödsplan: 4 beslutstillfällen. (Se separat panel.)
   ```
   Knapp "Generera sammanställning" producerar texten i en
   `<pre>`-block. Knapp "Dela protokoll" gör `navigator.share` med
   text + PNG-karta (samma teknik som `minkarta-export.js`).
   PNG-rendering av kartan via canvas + tiles + symbol-overlay.

### Filer
- `sensorskiss.html` — HTML för båda panelerna + JS-logik för
  sensorprotokoll-text-generering, beslutsstödsplan-CRUD, share-
  flöde.
- `sensorskiss-export.js` (ny, ca 600 rader) — PNG-render-pipelinen.
  Kopiera bulken av `minkarta-export.js`:s `prepareExportBlob()`,
  `renderExportAsync()`, `shareBlob()`, `downloadBlob()`. Ändra
  point-symbol-ritningen så den hanterar SK-symbolernas auto-
  numrering: `numLabel` ritas inne i symbolen (för C/P/K/U/L) eller
  som tooltip-bricka under symbolen (för poster/RPAS).
  Riktningslinjen (streckad, 30 px ut) ritas också i PNG:n.

### Steg
1. **Beslutsstödsplan-panel:**
   - HTML: `<details class="about" id="bspPanel">` med `<table>`-
     wrapper + en knapp "+ Ny rad". Tabellen har 6 kolumner enligt
     ovan. Varje rad har en "Ta bort"-knapp.
   - JS: `state.bsp = []` (array av rad-objekt). `renderBsp()`
     ritar om tabellen från `state.bsp`. `addBspRow()` pushar
     en tom rad. `removeBspRow(i)` splice. Spara till
     `localStorage['sensorskiss.bsp']` vid varje ändring.
   - Default: vid första laddning, om panelen är tom, fyll på
     en exempel-rad (BT 1, "Vy från P1 indikerar rörelse",
     "1. Skicka patrull / 2. Larma plut", "T+5 min", "PIR-
     larm + bekräftelse RPAS", "Stridsledare").
2. **Sensorprotokoll-panel:**
   - HTML: `<details class="about" id="protoPanel">` med
     fält Förband (`#pForband`), Chef (`#pChef`),
     Anteckningar (`#pNote`), knappar "Generera sammanställning"
     (`#pGen`) + "Dela protokoll" (`#pShare`), `<pre id="pOut">`.
   - JS: `generateProtocolText()`:
     - Iterera `state.objects`, gruppera per kategori (markbundna
       sensorer / Larmminor / poster / sensorområden).
     - För varje markbunden sensor: skriv numLabel + MGRS (via
       `MGRS.forward(obj.lat, obj.lng)`) + riktning (om
       `obj.rotation`) + anteckning.
     - Posters räknas per typ (enkelpost/dubbelpost/infart).
     - Sensorområden listas med antalText.
     - Beslutsstödsplan-rader räknas och listas i en sammanfattning
       med fotnot "Se separat panel.".
   - `pGen.click` → fyll `pOut.textContent` + visa `pShare`-knappen.
3. **PNG-export `sensorskiss-export.js`:**
   - Kopiera in `minkarta-export.js`-filen och ersätt namespace
     `MK_EXPORT` → `SK_EXPORT`, läsning av `state.objects` /
     `MK_SYMBOLS` → `SK_SYMBOLS`. Behåll bbox-fallback (alla
     objekt + 20% padding) — eftersom SENSORSKISS inte har
     yttergränsmarkör.
   - Punktsymbolritning: ritar SVG-bilden + om `obj.numLabel` finns
     ritas en text-bricka under symbolen (3.5 px font) eller — för
     C/P/K/U/L där numret är inne i SVG:n — låt SVG:ens egen text
     vara.
   - Riktningslinje: om `obj.rotation` är satt, rita en streckad
     svart linje från symbol-center 30 px ut i bäringen (samma
     transform som Leaflet-renderingen).
   - Polygon-symboler (`sensorområde`): ritas med vit fyllning
     (8 % opacity) + svart streckad kant + tooltip-text i
     polygonens centroid.
4. **Dela-flödet:** `pShare.click` → `prepareExportBlob()` →
   `SK_EXPORT.shareBlob(blob, filename, txt)`. Fallback:
   clipboard + download (samma som minkarta v4).

### Acceptanskriterier
- Lägg ut 2 CIM, 1 PIR, 1 UMRA, 1 Larmmina, 1 Sensorområde.
  Tryck "Generera sammanställning" → texten visas med:
  - "Markbundna sensorer:" rubrik.
  - "C1 33VXF…", "C2 33VXF…" rader med MGRS + ev. riktning.
  - "Larmminor: L1 33VXF…".
  - "Sensorområden: 1 område".
- Tryck "+ Ny rad" i Beslutsstödsplan → tom rad. Fyll i text →
  reload sidan → texten finns kvar (localStorage).
- Tryck "Dela protokoll" → desktop Chrome utan Web Share visar
  toast "Text kopierad. PNG nedladdad". PNG:n visar kartan med
  symbolerna ritade, numLabel synliga inne i C/P/K/U-symbolerna,
  och riktningslinje från PIR-symbolen.
- DevTools Network: inga endpoints utöver OTM/OSM-tiles.
- Ingen läcka av sensorpositioner i några requests.

### Commit-msg
`SENSORSKISS: beslutsstodsplan-panel + sensorprotokoll-export`

---

## FAS 6 — Mini-skola / tutorial

### Mål
Steg-för-steg overlay-tutorial som lär ut sensorerna och sensoruppsätt-
ningens grundprincip (lökprincipen från PDF s. 67–68 fig 46). Tre
huvudsteg:

1. **Välkommen** — kort intro: "Sensorerna är ett komplement till
   trupp och hund. De tre huvudkapaciteterna är upptäcka, klassificera
   och identifiera. Tabben SENSORSKISS hjälper dig planera ditt
   bevakningsobjekt."
2. **Sensortyper** — visa SVG-symbolerna en i taget med kort text om
   varje (sammandrag från PDF kap 2):
   - CIM: snubbeltråd, max 4000 m DL/MGE, ingen klassificering, kan
     ge falsklarm på djur.
   - PIR: passiv IR, 8 m diameter detektion @ 40m/80m, väcker
     kamera optimalt.
   - KAMERA: aktiveras av annan sensor (3–5 s uppstart), termisk +
     dag, klassificerar/identifierar.
   - UMRA: seismisk + akustisk, 50 m radie person, 100–200 m
     fordon, 5–8 km hkp, klassificerar.
   - Larmmina 2B: snubbeltråd, ljud + ljus, max 150 m från observatör.
   - RPAS (UAV06 A/T Anafi USA GOV SE): 32 min flygtid, 4 km
     räckvidd, EO/IR-kamera, BVLOS-flyg möjligt.
   - Poster (enkel/dubbel/in-ut): mänsklig sensor, hög uthållighet
     men begränsad räckvidd.
3. **Lökprincipen + beslutsstödsplan** — mini-demo: programmet ritar
   automatiskt 4 sensorer i en lök runt en mock-position och
   förklarar djupet (fig 46): UMRA på djup → CIM på medelavstånd →
   PIR + Kamera närmare → Larmmina på stridsavstånd. Avsluta med
   uppmaningen att fylla i Beslutsstödsplan-panelen.

### Filer
- `sensorskiss-tutorial.js` (ny, ca 400 rader)
- `sensorskiss-tutorial.css` (ny, ca 200 rader — kopiera CSS från
  `minkarta-tutorial.css`, byt prefix `mk-tut-*` → `sk-tut-*`)
- `sensorskiss.html` — `<link>`-tag för CSS, `<script>`-tag för JS,
  knapp "Mini-skola" i `map-controls`-raden som anropar
  `SK_TUTORIAL.start()`.

### Steg
1. Kopiera `minkarta-tutorial.js` skelett (state, loadState,
   saveState, el-hjälpare, overlay-DOM) och döp om STORAGE_KEY till
   `'sensorskiss_tutorial_v1'`. Behåll same-shape state.
2. Implementera 3 steg via en `STEPS`-array med `{ key, title,
   render(host) }`. Render-funktionerna bygger overlay-content med
   text + ev. SVG-thumbnails (återanvänd `SK_SYMBOLS[id].svg`).
3. Lökprincipen-steget: vid render, anropa en demo-funktion
   `placeOnionDemo()` som lägger 4 mock-sensorer på kartan
   (lat/lng + 100/300/500/700 m offset i östlig riktning från
   kart-center) i en `state.demoLayer = L.layerGroup()`. Vid
   `stop()`/nästa steg: `demoLayer.removeFrom(map)`.
4. `SK_TUTORIAL.start()` är public + auto-trigger: vid
   `DOMContentLoaded` i `sensorskiss.html`, om
   `SK_TUTORIAL.isCompleted()` är false OCH inga sensorer i state,
   trigga `start('welcome')` automatiskt (samma mönster som MINKARTA
   v3+).
5. "Mini-skola"-knapp i `map-controls` (efter Pan-läge): `<button
   class="btn btn-sm btn-ghost">Mini-skola</button>`,
   `onclick = () => SK_TUTORIAL.start('welcome')`.

### Acceptanskriterier
- Öppna `sensorskiss.html` första gången (rensad localStorage):
  Välkommen-overlay visas. Klicka "Nästa" → Sensortyper. Bläddra
  igenom alla 7 typer. "Nästa" → Lökprincipen + auto-ritar 4
  demo-sensorer på kartan. "Slutför" → overlay stängs, demo-
  sensorer rensas.
- Klicka "Mini-skola" igen → tutorial startar om från Välkommen.
- Reload efter completion → tutorial startar **inte** automatiskt.
- DevTools Console: inga fel.

### Commit-msg
`SENSORSKISS: mini-skola tutorial (3 steg, lokprincipen-demo)`

---

## FAS 7 — Service-worker + README + slutlig polish

### Mål
Service-worker cachar de nya filerna och `CACHE`-namnet bumpas så att
existerande PWA-installationer hämtar dem. README-funktionstabellen
uppdateras med en SENSORSKISS-rad. Manuell test-matris bockas av.

### Filer
- `service-worker.js` — `CACHE` → `'hv-20260429_sensorskissv1'`,
  `FILES` får 5 nya entries.
- `README.md` — funktionstabell + dagboksentry 2026-04-29.

### Steg
1. `service-worker.js`:
   ```js
   const CACHE = 'hv-20260429_sensorskissv1';
   const FILES = [
     // ... befintliga ...
     './sensorskiss.html',
     './sensorskiss-symbols.js',
     './sensorskiss-export.js',
     './sensorskiss-tutorial.js',
     './sensorskiss-tutorial.css'
   ];
   ```
2. `README.md` funktionstabell — ny rad:
   ```
   | **SENSORSKISS** | Sensoruppsättning & beslutsstödsplan
   (sensorer från Utbildningsanvisning sensorer Hemvärn 2025,
   auto-numrering C/P/K/U/L, riktningslinjer, sensorprotokoll-
   export, mini-skola lökprincipen) |
   ```
3. `README.md` dagboksentry (ovanför 2026-04-26-entryt):
   ```markdown
   ### 2026-04-29: SENSORSKISS v1 — ny tab för sensoruppsättning
   Sju-fas-implementation (roadmap: `roadmap-sensorskiss-v1.md`).
   * Skelett (FAS 2)
   * Symbolbibliotek (FAS 3)
   * Ritning + edit (FAS 4)
   * Beslutsstödsplan + protokoll-export (FAS 5)
   * Mini-skola (FAS 6)
   * Cache + README (FAS 7)
   ```
4. Manuell test-matris (kör i Chrome desktop):
   - [ ] Öppna `sensorskiss.html` direkt — alla 11 sub-tab-länkar
     fungerar och pekar rätt.
   - [ ] Lägg ut C1, C2, P1, U1, L1, L2, en enkelpost, ett
     sensorområde.
   - [ ] MGRS-sök "33VXF 69104 80045" → kartan hoppar till
     mellan-Sverige.
   - [ ] Generera sammanställning → text visas.
   - [ ] Dela protokoll → PNG genereras + nedladdas (desktop utan
     Web Share). PNG:n visar alla symboler korrekt med riktnings-
     linjer.
   - [ ] Beslutsstödsplan → lägg till 2 rader → reload → rader
     finns kvar.
   - [ ] Mini-skola startar automatiskt vid första load. Klicka
     igenom alla 3 steg.
   - [ ] Toggla service-worker uppdatering (DevTools Application →
     Update on reload). Verifiera att `FILES` innehåller alla 5
     nya entries.
   - [ ] Network-tab: inga endpoints utanför kontraktet (OTM/OSM/
     fonts).
   - [ ] MINKARTA-tabben fungerar fortfarande utan regression.
5. Push först när användaren godkänner. Efter push: skriv ut alla
   short commit-hashar (memory-policy `feedback_push_version`).

### Acceptanskriterier
- `service-worker.js` listas med 5 nya filer + nytt cache-namn.
- README har SENSORSKISS-rad i funktionstabellen + dagboksentry.
- Alla rutor i test-matrisen ovan är gröna.
- Inga konsolfel i Chrome desktop.

### Commit-msg
`SENSORSKISS: serviceworker-cache + README v1`

---

## Efterkontroll

Efter att alla 7 commits är committade:

- Öppna `sensorskiss.html`. Lägg ut 3 CIM, 1 PIR, 1 Larmmina, 1
  sensorområde. Generera sammanställning + Dela protokoll. PNG och
  text ska se städade ut.
- Reload — state återställs från IndexedDB.
- Klicka MINKARTA — minprotokoll, palett, export-knapp och tutorial
  ska fungera identiskt med före SENSORSKISS-puckeln (ingen
  regression).
- Skriv ut de 7 commit-hasharna i kort form (7 tecken) i ordning.

## Riskregister (v1-specifikt)

| Risk | Mitigation |
|------|------------|
| Sensor-symbolerna på PDF s. 72 är skissartade och saknar exakta proportioner — våra SVG:er kan avvika från reglementet | Vi följer principen "kvadrat för CIM, triangel för PIR, cirkel för KAMERA, romb för UMRA" som är konsistent med PDF:ens illustrationer. Bokstavsprefix (C/P/K/U/L) är explicit i JL.pdf och s. 72-texten. Avvikelser från eventuella interna mallar löses i v2 efter användarfeedback. |
| Auto-numrering kan kollidera om användaren sätter `numLabel` manuellt och sedan placerar en till | Counters bumps endast vid auto-tilldelning. Manuell override sparas i obj, men nästa auto-symbol använder `state.counters[prefix] + 1`, oberoende av manuella overrides. Dubbletter är användarens ansvar; en varning vid `generateProtocolText()` flaggar identiska numLabels. |
| Polygon-ritning för Sensorområde kan strula på touch (samma problem som MINKARTA hade i v2) | Återanvänd MINKARTA:s touch-handling-mönster oförändrat. Tester i Android Chrome görs i FAS 7. |
| Service-worker network-first för HTML/JS gör att existerande PWA-installationer kan se gammal cache i några sekunder vid första load efter v1 | Acceptabelt — samma trade-off som MINKARTA-faserna. Cache-bumpen i FAS 7 forcerar uppdatering vid nästa SW-install. |
| Beslutsstödsplan-tabellen växer obegränsat → localStorage-quota | Cap på 50 rader med toast-varning. Användarens enskilda fält är textinputs (max ~500 tecken vardera) — i praktiken inget kvoteringsproblem. |
| Tutorial demo-sensorer ligger kvar om användaren stänger browsern under demo-steget | `placeOnionDemo` lagrar lager i `state.demoLayer` som **inte** persisteras (ingen IndexedDB-write). Vid reload finns de inte. State-objekten är separata från demo-lagret. |

## Uppskattad omfattning

- FAS 1 (denna fil): ~430 rader roadmap.
- FAS 2: ~600 rader (sensorskiss.html-skelett) + 14 × 1 rad
  (tab-nav-länken).
- FAS 3: ~250 rader (sensorskiss-symbols.js) + ~30 rader
  (renderPalette i sensorskiss.html).
- FAS 4: ~600 rader i sensorskiss.html (datamodell, ritning, edit-
  popup, persistens, undo/redo, drag, riktningslinje).
- FAS 5: ~200 rader sensorskiss.html (BSP-panel + protokoll-panel)
  + ~600 rader sensorskiss-export.js.
- FAS 6: ~400 rader sensorskiss-tutorial.js + ~200 rader
  sensorskiss-tutorial.css + ~10 rader sensorskiss.html.
- FAS 7: ~10 rader service-worker.js + ~30 rader README.md.

Totalt ~3000 nya rader fördelat på 5 nya filer + 14 modifierade
existerande HTML-sidor + service-worker + README + roadmap.
