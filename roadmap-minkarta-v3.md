# Roadmap — MINKARTA v3 (svarta symboler + UPK-numrering)

Tredje iterationen av **MINKARTA**-tabben. v2 (`roadmap-minkarta-v2.md`)
landade en stabil bas: halo-kontrast, UP/SP-verktyg, datalista,
ladda-ner/dela-popover, bifoga-karta-modal och namn-etiketter. v3 härdar
reglementstroheten i två riktningar:

1. **Symbolerna svartmålas** enligt PDF:en *"Mineringar på karta —
   sammanställning"* (Fältarbeten s. 339, Handbok 9.5 s. 86). Den gula/
   cyan-paletten från v2 var valde att sticka ut mot OpenTopoMap, men
   avviker från reglementsboken som ritar linjearbetet i svart mot vit
   bakgrund. v3 följer boken: svart linjearbete, vit halo (korona) för
   kontrast, enskilda röda accenter där PDF:en själv markerar utförd
   förstöring.
2. **UP byter namn till UPK** och får slumpade, stabila, redigerbara
   nummer (001–999). Sekventiella `UP1..UP4` ersätts av terräng-
   individuella identifierare (t.ex. `UPK 594`) som inte renumreras när
   en punkt tas bort — mer likt hur fältenheter själva numrerar sina
   utgångs­punkts­koordinater i skarp verksamhet.

Arbetsnamn och filstruktur är oförändrade. Allt arbete sker inom:
`minkarta.html`, `minkarta-symbols.js`, `minkarta-export.js`,
`service-worker.js`, `README.md`. `minkarta-game.js` är orörd.

---

## 0. Ramverk och oföränderliga kontrakt

Ärvs från v1/v2. Ingen förhandling.

**0.1 Integritet (oförändrat):**
- Inga `fetch`/`XMLHttpRequest`/`sendBeacon`/WebSocket/`<form action>`
  skickar minsymbolpositioner, anteckningar eller protokoll till någon
  server.
- Tillåtna utgående anrop:
  1. OpenTopoMap-tiles (z 3–17).
  2. OpenStreetMap Standard-tiles (z 18–19).
  3. Nominatim/Overpass för vy-center eller för **UPK-markör**
     (bestämbar referenspunkt i terrängen — inte skarp minposition).
  4. Lokal `ortnamn.json`.
- LocalStorage/IndexedDB OK för persistens.
- All delning är user-initiated.

**0.2 Designkontrakt:**
- Samma `:root`-variabler, `.btn`, `.tab-nav`, `.about`-mönster.
- Self-hosted Inter-font.
- Mobile first, ≥ 48 px tryckytor, 360 × 640 stående.
- Svenska texter, reglementsenlig terminologi.

**0.3 Teknikkontrakt:**
- Leaflet 1.9.4 via CDN + SRI.
- Ingen ny build-step, inga nya tunga bibliotek.
- MGRS-IIFE:n är referens-implementation — återanvänd via `window.MGRS`.

**0.4 Arbetsflöde och commits:**
- En commit per fas. Stil: `MINKARTA: <kort imperativ sammanfattning>`.
- `service-worker.js` `CACHE`-namnet bumpas efter varje fas enligt
  mönster `hv-20260425_minkartav3_<N>` där `<N>` = fasnummer.
- Ingen push förrän användaren godkänner. Efter push — skriv ut short
  commit-hash per commit (memory-policy `feedback_push_version`).
- CD till `c:\0-dropbox\Dropbox\1oels dokument\Antigravity\hv` innan
  git-/npm-kommandon (memory-policy `feedback_cd_to_repo`).
- Testning: manuell i Chrome desktop + Android Chrome. Network-tab
  verifieras så att inga requests läcker symbol-koordinater.

**0.5 CHECKPOINT efter symbol-arbetet:**
- Efter FAS 1 + FAS 2 (svartmålning + saknade beteckningar) och deras
  commits — **stanna**. Be användaren öppna `minkarta.html`, placera
  några symboler ur paletten, granska linjearbetet + halon + de nya
  beteckningarna, och säga "kör vidare". Inga FAS 3+ (UPK-arbete) startar
  innan dess.

**0.6 PDF-tolkning:**
- Vid oklar reglementstecken — välj mest reglementsenliga tolkning.
  Notera beslutet som `// PDF s.X: …, jag tolkar …`-kommentar ovanför
  symbol-definitionen.

---

## Översikt av faserna

| Fas | Innehåll | Rörliga filer |
|----:|----------|---------------|
| A | Denna roadmap (`roadmap-minkarta-v3.md`) | ny fil |
| 1 | Svartmåla alla MK_SYMBOLS + ny färgmatris + vit-halo-teknik | `minkarta-symbols.js`, `minkarta.html` |
| 2 | Saknade beteckningar från PDF (landmina okänd, prov. fordonsröjskydd, röjningsskydd R, verkansområde, områdesverkande, riktad verkan) | `minkarta-symbols.js` |
| — | **CHECKPOINT — användarens godkännande** | — |
| 3 | `up` byter typ till `upk` + slump 001–999-nummer vid placering, labelformat `UPK 594` | `minkarta-symbols.js`, `minkarta.html` |
| 4 | Redigeringspopup med UPK-nummer-input + validering + kollisionscheck | `minkarta.html` |
| 5 | SP-referenser → `från UPK 594`, `pUp`-textarea → `UPK 594: <MGRS> — adress`, borttagen omnumrering, uppdaterad reglementsvarning + datalista | `minkarta.html` |
| 6 | README-funktionstabell + dagboksentry 2026-04-25, slutlig cache-bump, manuell test-matris | `README.md`, `service-worker.js` |

Ordningen: paletten (1+2) kommer först så CHECKPOINT-pausen kan ske innan
något UPK-flöde rörts — om användaren vill backa svart-paletten rör det
inte UPK-koden.

---

## FAS A — Denna roadmap

**Leverans:** `roadmap-minkarta-v3.md` i repo-roten. Speglar v2-stilen
(översikt, faslista, integritetskontrakt, riskregister, uppskattad
omfattning).

**Implementation:**
- Skriv filen.
- `git add roadmap-minkarta-v3.md && git commit -m "Roadmap MINKARTA v3: svarta symboler, UPK-numrering, saknade tecken"`.
- Ingen cache-bump (filen serveras inte av service-worker).

**Commit:** `Roadmap MINKARTA v3: svarta symboler, UPK-numrering, saknade tecken`

---

## FAS 1 — Svartmåla MK_SYMBOLS enligt PDF

**Leverans:** Alla MK_SYMBOLS-definitioner är omritade så att linje-
arbete och fyllningar är svarta (`#000000` / nära svart) mot vit eller
mycket ljus fill — precis som PDF:en. Halo-principen från v2 behålls
men inverterad: **vit korona 3 px utanför** det svarta linjearbetet så
symbolerna syns mot både topografisk grönska och blå vattendrag.

**Teknikval (halo-invertering):**

v2 använde `paint-order="stroke"` + bred `stroke="#0a0a0a"` + färgad
fyllning ovanpå. För v3 inverteras det:

```
paint-order="stroke"
stroke="#ffffff"  stroke-width="3"   — vit halo (korona)
fill/stroke i svart kör ovanpå
```

Den yttre `filter: drop-shadow(...)` på `.mk-icon svg` i `minkarta.html`
bytes från svart dropshadow till en mjuk vit-aura:
```css
filter: drop-shadow(0 0 1.5px #fff) drop-shadow(0 0 1.5px #fff) drop-shadow(0 1px 2px rgba(0,0,0,0.4));
```
vilket förstärker halon mot gröna kartytor.

**Färgmatris v3 (dokumenteras som `<!-- färgmatris: v3 ... -->` överst i
`minkarta-symbols.js`, ersätter v2-matrisen):**

| Roll | Halo (stroke 3 px) | Huvudfärg | Använts i |
|------|--------------------|-----------|-----------|
| Standard linjearbete | `#ffffff` | `#000000` (svart) | alla minor, polygoner, linjer, UP/SP, yttergräns |
| Fyllning (ljus mask) | `#ffffff` | `#ffffff` eller `#f7f7f7` | fyllda punktsymboler |
| Röd accent (undantag) | `#ffffff` | `#c62828` | **endast** `forst_utf` (utförd förstöring — PDF visar denna med röd markering för att betona borttagen passage) |
| Polygon-fyllnad | — | `rgba(0,0,0,0.08)` | minruta, minomrade, avstand_*  (ljus grå dim, svart kantlinje) |
| Skenminering | `#ffffff` | `#666666` (medium-grå, streckad) | skenminering (PDF visar ingen skenminering i denna version men vi behåller — dokumenteras i kodkommentar) |
| Inverterad "mask" | `#000000` fyllning + vit inner-prick | svart fill | `tramp`/`strv_tryck` (PDF visar dessa som fylld svart cirkel/triangel) |

**Implementation:**
1. I `minkarta-symbols.js`:
   - Definiera nya konstanter:
     ```js
     const MK_BLACK = '#000000';
     const MK_HALO  = '#ffffff';        // tidigare svart halo — nu vit
     const MK_INK   = '#000000';        // standardlinjearbete
     const MK_RED   = '#c62828';        // PDF-röd för utförd förstöring
     const MK_WHITE = '#ffffff';        // fyllning under linjearbete
     const MK_GRAY  = '#666666';        // sken + dim
     ```
   - Behåll bakåtkompatibla alias (`MK_STROKE`, `MK_FILL`, `MK_ACCENT`,
     `MK_DANGER`, `MK_META`) peka mot nya paletten så att
     `renderObject()` i `minkarta.html` inte behöver refactoreras.
   - Uppdatera `haloStroke()` till att returnera vit stroke:
     ```js
     function haloStroke(w) { return 'stroke="' + MK_HALO + '" stroke-width="' + (w||3) + '" paint-order="stroke"'; }
     ```
2. Skriv om varje symbol-SVG så att alla fyllningar är svart/vit och
   alla strokes är svart (med vit halo via paint-order). Gå en-och-en:
   - **`strv_tryck`** (PDF: fylld svart cirkel med vit eller osynlig
     inner-prick) → svart cirkel, vit halo, mörk inner-prick.
   - **`strv_full`** (PDF: fylld cirkel + linje under för
     "fullbredd") → svart cirkel + svart linje, vit halo.
   - **`strv_rojskydd`** (PDF: cirkel + "R" ovanför) → svart, vit halo,
     svart "R"-text.
   - **`tramp`** (PDF: fylld svart cirkel med "mustasch"-bågar ovan —
     s. 86 handbok. PDF s. 339 visar bara fylld svart cirkel) → svart
     trekant med inner-punkt, vit halo.
   - **`trad`** (utlösningstråd, PDF: T-symbol) → svart linje-T + vit
     halo.
   - **`larm`** (PDF: fylld cirkel + T-utlösningstråd) → svart trekant
     + "L"-text, vit halo.
   - **`fordonsmina`** (PDF: diagonal-fylld cirkel) → svart rektangel
     med diagonal skraffering + vit halo.
   - **`fordon_sid`** (PDF: fylld cirkel med pil åt höger) → svart
     rektangel + svart pil + svart linje, vit halo. Behåll röd om PDF-
     exemplet visar röd — här tolkar vi: PDF s. 339 visar svart + pil,
     alltså **allt svart**.
   - **`forsvar`** (PDF: "2"-ikon med bokstav Q) → svart cirkel + "F",
     vit halo.
   - **`avstand`** (R-spindel / R-form med hakar, PDF s. 339) → svart
     linjearbete, vit halo. Krönet kan förenklas till en cirkel med R
     + hakar.
   - **`forst_forb`** (PDF: tunn diagonal över cirkel — säkrad + en
     dubbeldiagonal för osäkrad) → svart cirkel + svart diagonal, vit
     halo. Vi får parkera säkrad/osäkrad som en tolkningsdetalj.
   - **`forst_utf`** (PDF: cirkel med X-kors OCH/ELLER ibland röd
     markering) → **behåller röd accent** (PDF-exemplet visar röd
     linje för utförd förstöring). Röd X-kors över vit cirkel, svart
     stroke, vit halo. Markera i kodkommentar: "PDF s. 339: utförd
     förstöring är röd — behåller accent".
   - **`forst_plan`** (PDF: bågsymbol "~~") → svart streckad, vit halo.
   - **`ytter`** (yttergränsmarkör — vår meta-symbol, inte i PDF) →
     svart streckad kvadrat, vit halo. Markera i kodkommentar att detta
     är en egen tilläggs­symbol (designbeslut).
   - **`minlinje`** (PDF: liten fylld cirkel + krokig linje) → svart
     linje + svarta nodpunkter, vit halo.
   - **`avsparrning`** (PDF: VVVVVV-wawa-tagg) → svart sågtand, vit
     halo.
   - **`minruta`** (PDF: rektangel med pil inuti) → svart rektangel +
     svart pil, vit halo. Eventuellt höjs det senare till att rendera
     själva pilen i Leaflet-polygonen också (nu: bara i palett-
     previewn).
   - **`minomrade`** (PDF: avlång oval med M-markeringar i kanterna) →
     svart oval + svarta M-bokstäver, vit halo. Etikett "HIND"/"FÖRDR"/
     "STÖR"/"AVST" fortsatt stor och tydlig.
   - **`skenminering`** → svart-streckad polygon + "SKEN"-text.
     Medium-grå tillåts för att visuellt skilja sken från skarp.
   - **`up` (blir `upk` i FAS 3)** → svart fylld cirkel med vit "UPK"-
     text, vit halo. (I FAS 3 byts nyckeln `up` → `upk`.)
   - **`sp`** → svart fylld kvadrat med vit "SP"-text, vit halo.
   - **`avstand_tramp`** / **`avstand_strv`** (PDF: streckad oval/
     triangel med inbäddad mintyp) → svart streckad polygon + svart
     inner-symbol, vit halo.
3. `minkarta.html`:
   - Uppdatera `.mk-icon svg`-filtret enligt ovan.
   - Uppdatera `.leaflet-tooltip.mk-label` vid behov — brickan ska
     vara oförändrad (mörk bakgrund, vit text, grön accent-border) —
     det kontrakterat i uppgiften.
4. `minkarta-export.js`:
   - I `renderExportAsync()` — polygon/linje-halo ritas idag med svart
     bred stroke under färgad smal. Byt till **vit bred stroke under
     svart smal** för att matcha den nya inverterade halo-principen:
     ```js
     ctx.strokeStyle = '#ffffff'; ctx.lineWidth = (sym.weight||4) + 2;
     ctx.stroke();
     // sen svart smal ovanpå via sym.stroke
     ```
     Punktsymbolerna är redan SVG:n — deras halo följer med.
   - `drawNameBadge()` är oförändrad (brickan är mörk/grön — ska vara
     så per uppgiften).

**Klar när:** Alla punktsymboler + linjer + polygoner har svart linje­
arbete och vit korona. Utförd förstöring (`forst_utf`) är enda punkt­
symbolen med röd accent. Kommentaren högst upp i `minkarta-symbols.js`
är uppdaterad färgmatris. PNG-exporten renderar pixel-konsekvent.

**Commit:** `MINKARTA: svarta reglementstecken med vit halo enligt PDF`

---

## FAS 2 — Saknade beteckningar från PDF

**Leverans:** Alla beteckningar i PDF s. 339 (och komplement i Handbok
s. 86) som saknas i SYMBOLS-registret är tillagda med svart-linje + vit-
halo-designen. Registrerade i rätt `SYMBOL_GROUPS`-grupp. Varje ny
symbol har ett `// PDF s.X: …, jag tolkar …`-kodkommentar­block.

**Nya symboler (efter inventering mot v2-SYMBOLS):**

| ID | Label | PDF-ref | Preview-form |
|----|-------|---------|--------------|
| `landmina_okand` | Landmina, okänd typ | PDF s. 339 ("okänd/ospecificerad") + Handbok s. 86 ("Ospecificerad mina") | Tom svart cirkel-outline + vit halo |
| `prov_rojskydd` | Provisoriskt fordonsröjningsskydd | PDF s. 339 | Svart linje med punkt i varje ände (< • — • >) |
| `rojskydd` | Röjningsskydd | PDF s. 339 | Stor svart "R"-text, vit halo, centrerat |
| `verkansomrade` | Verkansområde | PDF s. 339 | Streckad halvcirkel-båge, svart, vit halo |
| `omr_verkan` | Områdesverkande mina | Handbok s. 86 | Svart fylld cirkel + svart "W"-hake under |
| `riktad_verkan` | Riktad verkan (mina med riktning) | Handbok s. 86 | Svart fylld cirkel + svart pil åt höger |

**Implementation:**
1. Lägg till definitionerna i `SYMBOLS`-objektet, alla kategori `point`
   utom `verkansomrade` som blir `polygon`-ish — men halvcirkel är en
   egendom­lig geometri. Vi ritar den som `point` med fix SVG (liksom
   övriga PDF-symboler som representerar en typ snarare än en yta);
   `minkarta.html` `renderObject()` hanterar `point`-kategori utan att
   kräva väg/polygon.
2. Registrera i grupper (`SYMBOL_GROUPS`):
   ```js
   { title: 'Truppminor',      ids: ['tramp', 'trad', 'larm'] },
   { title: 'Övriga landminor', ids: ['landmina_okand', 'omr_verkan', 'riktad_verkan', 'verkansomrade'] },
   { title: 'Fordon & verkan',  ids: ['fordonsmina', 'fordon_sid', 'forsvar', 'prov_rojskydd', 'rojskydd'] },
   ```
   (Exakta gruppnamn fastställs vid implementation — håll det kompakt,
   max 3 knappar per rad i 360 px-vy.)
3. Lägg till nya typer i `labelMap`/`labelMapFull` i
   `generateProtocolText()` så datalista-sektionen renderar dem
   korrekt. Lägg även till dem i `typOrder`-mönstret för minräkningen
   där det är meningsfullt (landmina_okand, omr_verkan, riktad_verkan
   räknas som punktminor).
4. PNG-export behöver ingen kodändring — den läser ur `SYMBOLS` och
   ritar SVG:n direkt.
5. Varje ny symbol får ett designbeslutskommentar i koden, t.ex.:
   ```
   // PDF s.339: "Provisoriskt fordonsröjningsskydd" ritas som en liten
   // linje med punkter i båda ändarna. Jag tolkar den som ett kort
   // segment 3→21 px med svarta cirklar Ø 2 px i ändpunkterna, vit halo.
   ```

**Klar när:** Sex nya symboler finns i paletten under rätt grupp.
Placera dem via klick, tooltip visar label, PNG-export ritar dem,
datalista-sektionen i protokollet listar dem.

**Commit:** `MINKARTA: saknade beteckningar fran PDF (landmina okand, rojskydd, verkansomrade, omr_verkan, riktad_verkan, prov_rojskydd)`

---

## ▍ CHECKPOINT — användarens godkännande

Efter FAS 1 + FAS 2 är committade **stannar arbetet**. Skriv till
användaren, ordagrant:

> FAS 1 och 2 klara. Öppna minkarta.html och placera några symboler ur
> paletten (både v2-symbolerna som nu är svartmålade och de nya
> beteckningarna från PDF:en) för att granska svartmålningen + vit halo
> + saknade tecken. Säg "kör vidare" när du vill att jag går på
> UPK-numreringen.

Inga FAS 3–6 startas förrän användaren säger "kör vidare" (eller
motsvarande). Ingen push heller.

---

## FAS 3 — UP byter namn till UPK + slumpnummer 001–999

**Leverans:** `up`-markören heter nu **UPK** (Utgångs-Punkt-Koordinat).
Vid placering: slumpa heltal 001–999 (inklusive gränserna), padda till 3
siffror, säkerställ unikhet mot existerande UPK-nummer i kartan. Label
under marker och i `pUp`-textarean blir `UPK 594` (space mellan UPK och
talet, tre siffror).

**Designbeslut: stabil identitet**

I v2 var `obj.seq` ett derivat — det räknades om via
`recomputeRefSeqAndDerived()` varje gång en UP/SP lades till eller togs
bort. `UP1 → UP2` renumrering skedde per definition. I v3 är
**UPK-numret stabilt**: en gång slumpat, aldrig renumrerat. Fältet
`obj.nr` (heltal 1–999) hålls i state. Raderas en UPK försvinner dess
rad; övriga behåller sina nummer.

SP-markören behåller sin sekventiella `SP1, SP2, …`-numrering (uppgiften
kräver inte stabilt SP-nummer), men den som tidigare refererade "UP1"
ska nu referera "UPK 594".

**Implementation:**
1. `minkarta-symbols.js`:
   - Byt nyckeln `up` → `upk`. Label: `'UPK'` (palett-preview),
     `'Utgångspunktskoordinat'` (full). SVG:n är redan svart/vit efter
     FAS 1; text byts till "UPK".
   - `SYMBOL_GROUPS` → ersätt `'up'` med `'upk'` i gruppen
     "Referenspunkter".
2. `minkarta.html`:
   - Ny modul för UPK-nummer:
     ```js
     function randomUpkNr(existing) {
         const taken = new Set(existing);
         let guard = 0;
         while (guard++ < 2000) {
             const n = Math.floor(Math.random() * 999) + 1;  // 1..999
             if (!taken.has(n)) return n;
         }
         return null;   // alla 999 tagna — extremfall
     }
     function padUpk(n) { return String(n).padStart(3, '0'); }
     function upkLabel(o) { return 'UPK ' + padUpk(o.nr); }
     ```
   - `handleMapClick()`-grenen för meta-symboler: när `activeTool ===
     'upk'` → slumpa nummer, sätt `obj.nr`, `obj.label = upkLabel(obj)`.
     Om `randomUpkNr()` returnerar `null`, toast: "Alla 999 UPK-nummer
     upptagna — ta bort en UPK först." och avbryt placeringen.
   - `obj.typ` blir `'upk'` (byt från `'up'`). Allt state som refererar
     `'up'` bytes till `'upk'`: `findClosestUp`, `recomputeRef…`,
     `countMinesByType`, `formatUpLine`, `formatSpLine`, `labelMapFull`,
     DB-load (gammalt state kan ha `typ: 'up'` — se migration nedan).
   - `findClosestUpk(sp)` (omdöpt): hitta närmaste UPK för SP-
     inmätning. Beteende oförändrat.
   - `recomputeRefSeqAndDerived()` → `recomputeSpDerived()`: **inga UPK
     renumreras**. Den enda loopen är SP: räkna bäring/avstånd mot
     närmaste UPK och sätt `obj.refUpkNr = closestUpk.nr` (spara
     numret, inte seq). SP-sekvens räknas fortsatt i insertionsordning
     om vi behåller `seq` för SP — men inget UP-seq längre.
   - Migration vid `loadPersisted()`: om någon `obj.typ === 'up'` finns
     i IndexedDB (från v2), skriv om till `obj.typ = 'upk'` och
     tilldela ett unikt `obj.nr` via `randomUpkNr()`. Spara tillbaka
     (scheduleAutosave). Logga i console: "Migrerade N UP → UPK".
   - `reverseGeocodeUp` → `reverseGeocodeUpk` (omdöpning; beteendet
     oförändrat, men anropas nu för `typ === 'upk'`).
3. PNG-export i `minkarta-export.js`:
   - `drawNameBadge(..., o.label || sym.label)` — eftersom `o.label` nu
     är `'UPK 594'`, hanteras brickan automatiskt. Ingen kodändring
     krävs. Validera vid manuell test.

**Klar när:** Placera två UPK:er ger t.ex. `UPK 042` och `UPK 781` med
stabila nummer. Radera `UPK 042` → `UPK 781` behåller sitt nummer. Två
UPK kan aldrig få samma nummer. Gammalt `typ: 'up'`-state migreras
transparent.

**Commit:** `MINKARTA: UP blir UPK med stabilt slumpnummer 001-999`

---

## FAS 4 — Redigeringspopup för UPK-nummer

**Leverans:** Klick på en UPK-markör (i pan-läge) öppnar
`openEditPopup()`. Popupen visar:
- Symbolens label (`'Utgångspunktskoordinat'`)
- **UPK-nummer** — inputfält, siffror, 1–3 tecken. Initialvärde =
  `o.nr` (ej padd-ad — padd sker vid Save).
- Anteckning — fri text (befintligt fält)
- Spara / Ta bort

**Validering:**
- Tillåt endast `/^\d{1,3}$/` i realtid (`input`-listener,
  `value = value.replace(/\D/g, '').slice(0, 3)`).
- Vid Save: parse till heltal, validera 1 ≤ n ≤ 999.
- Kollisionscheck: om `n` redan används av en annan UPK — visa toast:
  "UPK <NNN> är upptaget. Välj ett annat nummer." och stanna kvar i
  popupen.
- Vid lyckad ändring:
  - `obj.nr = n; obj.label = 'UPK ' + padUpk(n);`
  - `syncUpTextarea()` (uppdatera `pUp`-raden + alla SP-rader som
    refererade gammalt nummer).
  - `rebuildLayers()` (tooltip-brickan bygger om med nya labeln).

**Implementation:**
1. Bygg ut `openEditPopup()` i `minkarta.html`:
   - Efter `if (sym.ambitionChoices)`-blocket (som är polygon-specifikt),
     lägg ett `if (obj.typ === 'upk')`-block:
     ```js
     if (obj.typ === 'upk') {
         html += '<label style="…">UPK-nummer</label>';
         html += '<input id="edUpkNr" type="text" inputmode="numeric" ' +
                 'pattern="\\d{1,3}" maxlength="3" ' +
                 'value="' + padUpk(obj.nr) + '" ' +
                 'style="width:100%;padding:4px;background:#0f240f;color:#e8f0e8;border:1px solid #2d4a2d">';
         html += '<div style="font-size:0.68rem;color:#8aaa8a;margin-top:2px">001–999, unikt</div>';
     }
     ```
   - I Save-listenern: hämta input, validera, kolla kollision, uppdatera
     `obj.nr` + `obj.label`, kör `syncUpTextarea()` och `rebuildLayers()`.
2. Bevara existerande popup-funktioner för polygoner (ambitionChoices,
   antal, anteckning) — `upk`-grenen är ett tillägg, inte en
   ersättning. Antal-fältet är onödigt för UPK; dölj det för `typ ===
   'upk'`:
   ```js
   if (obj.typ !== 'upk') {
       html += '<label>Antal</label>';
       html += '<input id="edAntal" …>';
   }
   ```
   Motsvarande check i Save (`const an = wrap.querySelector('#edAntal');
   if (an) obj.antal = an.value ? Number(an.value) : null;`).

**Klar när:** Klick på UPK-markör öppnar popup med nummer-input. Byte
till ledigt nummer fungerar; byte till upptaget nummer avvisas med toast;
byte till "0" eller "1000" avvisas. Tooltip-brickan, textarean och alla
SP-referenser uppdateras direkt.

**Commit:** `MINKARTA: redigeringspopup for UPK-nummer med kollisionscheck`

---

## FAS 5 — SP-referenser + pUp-textarea + reglementsvarning

**Leverans:** Alla SP-referenser byter format från `"från UP<seq>"` till
`"från UPK <nnn>"`. `pUp`-textarean skriver `UPK 594: <MGRS> — adress`
istället för `UP1: <MGRS> — adress`. Omnumrerings-logiken för UP bort
(UPK är stabila). Reglementsvarningen håller kvar `≥ 2 UPK + ≥ 1 SP`.
Datalista-sektionen använder UPK-format.

**Format efter v3:**
```
UPK 594: 33VUH 23400 45600 — Rött hus
UPK 142: 33VUH 24012 45902 — Träddunge
SP1: 33VUH 23471 45684 (från UPK 594, 170° 140 m)
```

**Implementation:**
1. I `minkarta.html`:
   - `formatUpLine(o)` → `formatUpkLine(o)`:
     ```js
     function formatUpkLine(o) {
         const mgrs = safeMgrs(o.lat, o.lng) || '—';
         const adress = o.adress || (o.reverseLoading ? '(hämtar adress…)' : '');
         return 'UPK ' + padUpk(o.nr) + ': ' + mgrs + (adress ? ' — ' + adress : '');
     }
     ```
   - `formatSpLine(o)`:
     ```js
     function formatSpLine(o) {
         const mgrs = safeMgrs(o.lat, o.lng) || '—';
         if (o.refUpkNr != null && o.bearing != null && o.distanceM != null) {
             return 'SP' + o.seq + ': ' + mgrs + ' (från UPK ' + padUpk(o.refUpkNr) + ', ' + o.bearing + '° ' + o.distanceM + ' m)';
         }
         return 'SP' + o.seq + ': ' + mgrs;
     }
     ```
   - `syncUpTextarea()` (behåll namnet — textarean heter pUp av historiska
     skäl): byt iterationen till `if (o.typ === 'upk')` och använd
     `formatUpkLine`. Byt regex för manuellt bevarade rader:
     ```js
     const keptManual = (ta.value || '').split(/\r?\n/).filter(line =>
         line.trim() !== '' && !/^\s*(UPK\s*\d+|SP\d+)\s*:/i.test(line)
     );
     ```
     (matchar både gamla `UP1:` och nya `UPK 594:` för
     bakåtkompatibilitet — gamla sessioner som har lekt sig fria sliter
     ändå bort alla auto-rader och regenererar).
   - `recomputeSpDerived()` (ersätter `recomputeRefSeqAndDerived`):
     ```js
     function recomputeSpDerived() {
         let spSeq = 0;
         for (const o of state.objects) {
             if (o.typ === 'sp') {
                 spSeq++;
                 o.seq = spSeq;
                 o.label = 'SP' + spSeq;
                 const ref = findClosestUpk(o);
                 if (ref) {
                     o.refUpk = ref.upk.id;
                     o.refUpkNr = ref.upk.nr;
                     o.bearing = Math.round(initialBearing(ref.upk, o));
                     o.distanceM = Math.round(ref.distanceM);
                 } else {
                     o.refUpk = null; o.refUpkNr = null; o.bearing = null; o.distanceM = null;
                 }
             }
         }
     }
     ```
     UPK:er renumreras inte — bara SP:er får sekventiell seq baserad på
     insertionsordning.
   - Reglementsvarning:
     ```js
     const nUpk = state.objects.filter(o => o.typ === 'upk').length;
     const nSp  = state.objects.filter(o => o.typ === 'sp').length;
     // Meddelande: "Obs: reglementet kräver minst 2 UPK och 1 SP."
     ```
   - `removeObject()`: när `typ === 'upk'` eller `typ === 'sp'` →
     `syncUpTextarea()` + `rebuildLayers()` (oförändrat i semantik).
2. Datalista i `generateProtocolText()`:
   - `labelMapFull.upk = 'UPK'`. Ta bort gammalt `labelMapFull.up`.
   - I datalista-rad för `typ === 'upk'`: etikett = `'UPK ' +
     padUpk(o.nr)` + ev. adress i anteckningskolumn.
   - För `typ === 'sp'` + `o.refUpkNr`: etikett = `'SP' + o.seq + ' fr
     UPK ' + padUpk(o.refUpkNr)`.
3. `labelMap`/`typOrder` för minräkning: oförändrat (UPK/SP är inte
   punktminor och räknas inte).
4. Integritetstext i `<details class="about">`:
   - Byt alla `UP`/`UP-markör` → `UPK`/`UPK-markör` där syftet är
     reverse-geocode-not­en. Bevara "UP" i fri text om det syftar på en
     historisk session.

**Klar när:** Placera 2 UPK + 1 SP, generera sammanställning — textarean
visar `UPK xxx: … — adress`, SP-raden visar `från UPK xxx`, datalistan
visar samma. Redigera en UPK:s nummer → SP-raden uppdateras. Radera en
UPK → övriga UPK:er behåller sina nummer, SP refererar ny närmaste UPK.

**Commit:** `MINKARTA: SP-referenser och pUp-textarea till UPK-format`

---

## FAS 6 — README-dagboksentry + cache-bump + polish

**Leverans:** README uppdaterad med v3-entry i dagboken
(2026-04-25). Funktionstabellens MINKARTA-rad uppdaterad. Service-
worker `CACHE` bumpad till `hv-20260425_minkartav3_6` (slutlig). Manuell
test-matris körd och bockad. Inga konsolfel, inga nya integritetsläckor.

**Implementation:**
1. `README.md`:
   - Uppdatera MINKARTA-raden i funktionstabellen:
     ```
     | **MINKARTA** | Minläggningskarta & minprotokoll (svart
     | reglementstecken enligt PDF, UPK-numrering 001–999, datalista,
     | PNG + share-popover, övningsläge) |
     ```
   - Ny dagboksentry (ovanför 2026-04-24-entryt):
     ```
     ### 2026-04-25: MINKARTA v3 — svarta symboler + UPK-numrering
     Sjätte iteration på MINKARTA (roadmap: roadmap-minkarta-v3.md).
     * Svarta reglementstecken (FAS 1): …
     * Saknade beteckningar (FAS 2): …
     * UPK (FAS 3): …
     * Redigeringspopup (FAS 4): …
     * SP-format (FAS 5): …
     * Polish (FAS 6): …
     ```
2. `service-worker.js`:
   - Slutlig `CACHE = 'hv-20260425_minkartav3_6'`. Mellanbumps
     `_1` … `_5` längs vägen per fas.
   - FILES-listan oförändrad (inga nya filer).
3. Manuell test-matris (egen check-lista, skriv ut vid implementation):
   - [ ] Desktop Chrome: placera 8 symboler ur olika grupper, inkl. 2 av
         de nya från FAS 2, 2 UPK + 1 SP. Granska svart-linjearbete + vit
         halo mot grönt/blått kartunderlag.
   - [ ] Desktop Chrome: öppna UPK-edit-popup, ändra nummer till ledigt
         värde — verifiera att SP-raden uppdateras.
   - [ ] Desktop Chrome: försök sätta kolliderande UPK-nummer —
         verifiera toast + att inget sparas.
   - [ ] Android Chrome: samma grund-flöde + dela PNG + Signal-klistring.
   - [ ] DevTools Network: inga requests innehåller UPK-nummer, lat/lng
         utöver tile-URL:er och `/reverse?lat=…` (för UPK-geocode).
   - [ ] Migration: öppna ett repo med IndexedDB-state `typ: 'up'` (från
         v2) — verifiera att det migreras till `typ: 'upk'` + slumpnummer
         och att kartan ritar korrekt efter reload.
   - [ ] Offline: ladda appen fresh med nätverket på, stäng av
         nätverket, testa ritning + protokoll + UPK-edit. Export blir
         tom bakgrund men kraschar inte.
4. Inga `version.js`-ändringar här — det bumpas av befintligt auto-flöde.
5. Push först när användaren godkänner. Efter push: skriv ut alla short
   commit-hashar (memory-policy).

**Klar när:** Alla 6 commits är pushade, README-länkade,
check-listan av. Ingen konsol-error, ingen integritetsläcka, ingen
regression i v2-funktionalitet.

**Commit:** `MINKARTA: polish, README och serviceworker-bump v3`

---

## Riskregister (v3-specifika)

| Risk | Mitigation |
|------|------------|
| Vit halo blir otydlig mot vita vägpartier i OSM Standard (z 18–19) | Extra yttre `drop-shadow` 1 px neutral grå (`rgba(0,0,0,0.4)`) som accent utanför vit korona. Testa vid z 19 under CHECKPOINT. |
| Svart linjearbete smälter ihop med mörka skogspartier i OpenTopoMap | Vit halo är primär kontrast. Om det visuellt inte räcker — lägg ett pyttelitet `stroke="#888"` ytterkant som "dubbel halo". Håll i reserv om CHECKPOINT-feedbacken är negativ. |
| Slumpade UPK-nummer kan träffa upptagna → frustrerande loop | `randomUpkNr()` har en guard-limit 2000 försök innan `null`. Vid `null` (999 redan i kartan) visas toast. Testa med mock där vi förfyller 997 UPK. |
| Migration v2 → v3 förlorar anteckningar om `typ: 'up'` inte hittas | Migration sker i `loadPersisted()` innan `rebuildLayers()`. Behåll hela `obj` utom `obj.typ` och lägg till `obj.nr`. Skriv tillbaka via `scheduleAutosave()`. |
| Gammal text i `pUp`-textarean ("UP1: ...") bevaras som "manuell" och dupliceras | Utöka regex i `syncUpTextarea()` till `/^(UP\d+|UPK\s*\d+|SP\d+)\s*:/i` så både v2- och v3-auto-rader filtreras bort från `keptManual`. |
| PNG-export halo går från svart till vit — kan minska läsbarhet mot vita tiles | Testa i FAS 1 CHECKPOINT. Om behov finns: lägg tunn grå ytterkant 1 px `rgba(0,0,0,0.3)` under den vita — samma teknik som ovan. |
| Reglementsavvikelse vid symbol-tolkning (PDF är liten, vissa tecken är tvetydiga) | Per ny symbol → kodkommentar `// PDF s.X: …, jag tolkar …`. CHECKPOINT ger användaren chans att rätta. |

---

## Uppskattad omfattning

- FAS A: ~300 rader roadmap (denna fil)
- FAS 1: ~180 rader (SVG-omritning för ~22 symboler + nya konstanter + CSS-filter + export-halo-invertering)
- FAS 2: ~120 rader (6 nya symboler + grupp-registrering + label-maps)
- FAS 3: ~90 rader (upk-nyckel, randomUpkNr, migration, textarea/find-omdöpning)
- FAS 4: ~60 rader (popup-branch + validering + kollisionscheck)
- FAS 5: ~80 rader (formatera om SP-rader, textarean-regex, datalista, reglementsvarning)
- FAS 6: ~50 rader (README-dagbok + funktionstabell + cache-bump)

Totalt ~880 nya/ändrade rader fördelat på 4 befintliga filer + README +
ny roadmap.

---

## Arbetsflöde och verifiering per fas

För varje fas (1–6), innan commit:

1. `cd "c:\0-dropbox\Dropbox\1oels dokument\Antigravity\hv"` (memory-
   policy `feedback_cd_to_repo`).
2. Manuell smoke-test i browser (öppna `minkarta.html`).
3. DevTools Console: inga nya fel.
4. DevTools Network: inga nya endpoints utöver kontraktet.
5. `service-worker.js` `CACHE`-namn bumpat till `hv-20260425_minkartav3_<N>`.
6. Commit-meddelande följer `MINKARTA: <...>`-mönstret.

**CHECKPOINT efter FAS 2** — vänta på användarens "kör vidare".

**Push** sker först när användaren explicit bekräftar hela puckeln.
Efter push — skriv ut samtliga short commit-hashar (memory-policy
`feedback_push_version`).
