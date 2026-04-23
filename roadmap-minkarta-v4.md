# Roadmap — MINKARTA v4 (nya SVG-symboler, delning bifogar karta, större export)

Fjärde iterationen av **MINKARTA**-tabben. v3 (`roadmap-minkarta-v3.md`) landade
svarta reglementstecken med vit halo och UPK-numrering 001–999 med stabilt
slumpnummer. v4 är en visuell och interaktionsmässig finputs som bygger vidare
på v3:s fundament:

1. **Nya symbol-SVG:er** — 20 omritade reglementstecken ersätter v3:s inline-
   SVG:er. Tre symboler från v3 (UPK, SP, yttergränsmarkör) behålls oförändrade.
   Sju v3-symboler tas bort (ingen motsvarighet i det nya paketet).
2. **Dela protokoll bifogar alltid kartbild** — bifoga-karta-modalen elimineras.
   Klick på "Dela protokoll" genererar PNG automatiskt och försöker
   `navigator.share({files, text})` direkt. Fallback: clipboard + PNG-download.
3. **"Rensa allt" rensar även protokoll-panelen** — utöka existerande rensa-
   knappen till att nollställa alla protokoll-fält, inte bara `state.objects`.
4. **Lager-/pan-kontroller flyttas upp under kartan** — de mest frekventa UI-
   kontrollerna (Namn-etiketter, Pan-läge) placeras direkt under `.map-wrap`
   ovanför paletten, så man inte behöver scrolla.
5. **4× förstorade punktsymboler i PNG-exporten** — symbol + namn-bricka
   skalas 4× i den exporterade PNG:n, inklusive linje-/polygon-strokes som
   skalas proportionellt. Skärmvisningen är oförändrad.

Arbetsnamn och filstruktur är oförändrade. Allt arbete sker inom:
`minkarta.html`, `minkarta-symbols.js`, `minkarta-export.js`, `service-worker.js`,
`README.md`. `minkarta-game.js` är orörd (ingen referens till borttagna
symboler där).

---

## 0. Ramverk och oföränderliga kontrakt

Ärvs från v1/v2/v3. Ingen förhandling.

**0.1 Integritet (oförändrat):**
- Inga `fetch`/`XMLHttpRequest`/`sendBeacon`/WebSocket/`<form action>` skickar
  minsymbolpositioner, anteckningar eller protokoll till någon server.
- Tillåtna utgående anrop:
  1. OpenTopoMap-tiles (z 3–17).
  2. OpenStreetMap Standard-tiles (z 18–19).
  3. Nominatim/Overpass för vy-center eller för **UPK-markör** (bestämbar
     referenspunkt i terrängen — inte skarp minposition).
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
  mönster `hv-20260426_minkartav4_<N>` där `<N>` = fasnummer.
- Ingen push förrän användaren godkänner. Efter push — skriv ut short
  commit-hash per commit (memory-policy `feedback_push_version`).
- CD till `c:\0-dropbox\Dropbox\1oels dokument\Antigravity\hv` innan
  git-/npm-kommandon (memory-policy `feedback_cd_to_repo`).
- Testning: manuell i Chrome desktop + Android Chrome. Network-tab
  verifieras så att inga requests läcker symbol-koordinater.

**0.5 CHECKPOINT efter SVG-arbetet:**
- Efter FAS 1 (nya SVG-symboler + palett-regruppering + migration av
  borttagna typer) och dess commit — **stanna**. Be användaren öppna
  `minkarta.html`, placera några symboler ur paletten, granska de nya
  SVG:erna, och säga "kör vidare". Inga FAS 2+ startar innan dess.

**0.6 Dependens-ordning:**
SVG-arbetet kommer först eftersom det är den största och mest visuella
förändringen — om granskningen underkänner något rör det inte den resterande
UI-piken och PNG-exporten.

---

## Översikt av faserna

| Fas | Innehåll | Rörliga filer |
|----:|----------|---------------|
| A | Denna roadmap (`roadmap-minkarta-v4.md`) | ny fil |
| 1 | Namnbyte av 20 SVG-filer + ersätt `SYMBOLS` med inline-SVG:er från filerna + ny `forst_forb_sakrad`-nyckel + ta bort 7 v3-symboler + uppdatera `SYMBOL_GROUPS` + `labelMap`/`typOrder` i minkarta.html + migration i `loadPersisted()` | `stab/Ny mapp (2)/*.svg` (namnbyte), `minkarta-symbols.js`, `minkarta.html`, `service-worker.js` |
| — | **CHECKPOINT — användarens godkännande** | — |
| 2 | 4× förstoring av point/meta-symboler + proportionellt skalade namn-brickor, linje-/polygon-strokes och polygon-etiketter i PNG-exporten | `minkarta-export.js`, `service-worker.js` |
| 3 | Flytta `.palette-layers` + Pan-läge-knappen till en ny rad under `.map-wrap` (ovanför `.palette`). Behåll Ångra/Gör om/Exportera/Rensa i palett-toolbaren. | `minkarta.html`, `service-worker.js` |
| 4 | "Rensa allt" nollställer även protokoll-panelen (`#pNr`, `#pAmbition`, `#pForband`, `#pChef`, `#pTnr`, `#pRojskydd`, `#pUp`, `#pNote`, `#pOut`, `#pCopy`, `#pUpWarn`, auto-TNR-badge). Bevara dubbel-bekräftelse. | `minkarta.html`, `service-worker.js` |
| 5 | "Kopiera till urklipp" döps om till "Dela protokoll" och genererar alltid PNG automatiskt + `navigator.share({files, text})`. Ta bort `showAttachMapModal` + `.mk-modal*`-CSS (död kod). Fallback: clipboard + PNG-download + toast. | `minkarta.html`, `service-worker.js` |
| 6 | README-funktionstabell + dagboksentry 2026-04-26, slutlig cache-bump `hv-20260426_minkartav4_6`, manuell test-matris | `README.md`, `service-worker.js` |

---

## FAS A — Denna roadmap

**Leverans:** `roadmap-minkarta-v4.md` i repo-roten. Speglar v2/v3-stilen
(översikt, faslista, integritetskontrakt, riskregister, uppskattad omfattning).

**Implementation:**
- Skriv filen.
- `git add roadmap-minkarta-v4.md && git commit -m "Roadmap MINKARTA v4: nya SVG-symboler, dela-med-karta, storre export-bilder"`.
- Ingen cache-bump (filen serveras inte av service-worker).

**Commit:** `Roadmap MINKARTA v4: nya SVG-symboler, dela-med-karta, storre export-bilder`

---

## FAS 1 — Nya SVG-symboler + palett-regruppering + migration

**Leverans:** 20 SVG-filer i `stab/Ny mapp (2)/` har fått snygga filnamn
(`" (N)"`-suffix borttaget, `_` ersatt med space). Alla 20 SVG:er är inline:ade
i `minkarta-symbols.js` som `svg:`-strängar. `SYMBOLS`-objektet innehåller
23 nycklar totalt: de 20 nya + `upk` + `sp` + `ytter` (de tre sistnämnda
behålls oförändrade från v3). Sju v3-nycklar är borttagna.

**Namnbyte av SVG-filer:**

| Filnamn nu                                     | Nytt filnamn                          |
|------------------------------------------------|---------------------------------------|
| `Avspärrning,_minvarning.svg`                  | `Avspärrning, minvarning.svg`         |
| `Avståndslagd_stridsvagnsminering (3).svg`     | `Avståndslagd stridsvagnsminering.svg` |
| `Avståndslagd_trampminering.svg`               | `Avståndslagd trampminering.svg`      |
| `Fordonsmina.svg`                              | `Fordonsmina.svg`                     |
| `Förberedd_förstöring (3).svg`                 | `Förberedd förstöring.svg`            |
| `Förberedd_förstöring_säkrad (1).svg`          | `Förberedd förstöring säkrad.svg`     |
| `Försvarsladdning_2 (1).svg`                   | `Försvarsladdning 2.svg`              |
| `Larmmina.svg`                                 | `Larmmina.svg`                        |
| `Minerat_område.svg`                           | `Minerat område.svg`                  |
| `Minlinje (1).svg`                             | `Minlinje.svg`                        |
| `Minruta.svg`                                  | `Minruta.svg`                         |
| `Områdesverkande_mina.svg`                     | `Områdesverkande mina.svg`            |
| `Planlagd_förstöring (4).svg`                  | `Planlagd förstöring.svg`             |
| `Provisoriskt_fordonsröjningsskydd.svg`        | `Provisoriskt fordonsröjningsskydd.svg` |
| `Röjningsskydd.svg`                            | `Röjningsskydd.svg`                   |
| `Sidverkande_fordonsmina.svg`                  | `Sidverkande fordonsmina.svg`         |
| `Stridsvagnsmina (1).svg`                      | `Stridsvagnsmina.svg`                 |
| `Truppmina.svg`                                | `Truppmina.svg`                       |
| `Utförd_förstöring.svg`                        | `Utförd förstöring.svg`               |
| `Verkansområde.svg`                            | `Verkansområde.svg`                   |

Några filer (Fordonsmina, Larmmina, Minruta, Röjningsskydd, Truppmina) har
redan "rätt" namn; övriga 15 byts.

**Mappning SVG-fil → SYMBOLS-nyckel:**

| SVG-fil                               | SYMBOLS-nyckel      | Kategori |
|---------------------------------------|---------------------|----------|
| Stridsvagnsmina.svg                   | `strv_tryck`        | point    |
| Truppmina.svg                         | `tramp`             | point    |
| Larmmina.svg                          | `larm`              | point    |
| Fordonsmina.svg                       | `fordonsmina`       | point    |
| Sidverkande fordonsmina.svg           | `fordon_sid`        | point    |
| Försvarsladdning 2.svg                | `forsvar`           | point    |
| Provisoriskt fordonsröjningsskydd.svg | `prov_rojskydd`     | point    |
| Röjningsskydd.svg                     | `rojskydd`          | point    |
| Förberedd förstöring.svg              | `forst_forb`        | point    |
| Förberedd förstöring säkrad.svg       | `forst_forb_sakrad` | point ← **NY** |
| Utförd förstöring.svg                 | `forst_utf`         | point    |
| Planlagd förstöring.svg               | `forst_plan`        | point    |
| Minlinje.svg                          | `minlinje`          | line     |
| Avspärrning, minvarning.svg           | `avsparrning`       | line     |
| Minruta.svg                           | `minruta`           | polygon  |
| Minerat område.svg                    | `minomrade`         | polygon  |
| Avståndslagd trampminering.svg        | `avstand_tramp`     | polygon  |
| Avståndslagd stridsvagnsminering.svg  | `avstand_strv`      | polygon  |
| Verkansområde.svg                     | `verkansomrade`     | point    |
| Områdesverkande mina.svg              | `omr_verkan`        | point    |

Plus behållna v3-nycklar (svartmålad v3, oförändrade):

| SYMBOLS-nyckel | Kategori |
|----------------|----------|
| `upk`          | meta     |
| `sp`           | meta     |
| `ytter`        | meta     |

**Borttagna nycklar (från v3 SYMBOLS + SYMBOL_GROUPS):**

| Nyckel            | Varför tas bort |
|-------------------|-----------------|
| `strv_full`       | Ingen motsvarighet i nya SVG-paketet |
| `strv_rojskydd`   | Ingen motsvarighet (strvmina m. röjskydd saknas separat; användare får notera i Anteckning) |
| `trad`            | Ingen motsvarighet (utlösningstråd saknas som egen symbol) |
| `avstand`         | Ingen motsvarighet (R-spindel saknas separat — avståndslagd uttrycks via `avstand_tramp`/`avstand_strv`) |
| `skenminering`    | Ingen motsvarighet |
| `landmina_okand`  | Ingen motsvarighet |
| `riktad_verkan`   | Ingen motsvarighet (ersätts i praktiken av `fordon_sid` eller `omr_verkan`) |

Dokumentera borttagningen i kodkommentar i `minkarta-symbols.js` med
motiveringen *"ingen motsvarighet i nya SVG-paketet från 2026-04-26"*.

**SYMBOL_GROUPS (v4):**

```js
const SYMBOL_GROUPS = [
    { title: 'Strv-minor',         ids: ['strv_tryck'] },
    { title: 'Truppminor',         ids: ['tramp', 'larm'] },
    { title: 'Fordon & skydd',     ids: ['fordonsmina', 'fordon_sid', 'forsvar', 'prov_rojskydd', 'rojskydd'] },
    { title: 'Förstöring',         ids: ['forst_forb', 'forst_forb_sakrad', 'forst_utf', 'forst_plan'] },
    { title: 'Områdesverkan',      ids: ['omr_verkan', 'verkansomrade'] },
    { title: 'Linjer',             ids: ['minlinje', 'avsparrning'] },
    { title: 'Områden',            ids: ['minruta', 'minomrade'] },
    { title: 'Avståndslagda',      ids: ['avstand_tramp', 'avstand_strv'] },
    { title: 'Referenspunkter',    ids: ['upk', 'sp'] },
    { title: 'Export',             ids: ['ytter'] }
];
```

Totalt 10 grupper, 23 symboler.

**Implementation i minkarta-symbols.js:**

1. Läs varje ny SVG-fil och klistra in innehållet som `svg:`-sträng i rätt
   `SYMBOLS`-entry. Behåll samma pattern som v3 — varje entry har:
   ```js
   strv_tryck: {
       label: 'Stridsvagnsmina',
       category: 'point',
       svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="…">…</svg>'
   }
   ```
   Anledningen att inte hämta via `fetch`: offline-cachen i service-worker
   skulle behöva lägga till varje `.svg` i `FILES`-listan, vilket är onödig
   komplexitet. SVG:erna som inline-strängar bakas med HTML:en direkt.
2. Behåll metadata som linje-/polygon-Leaflet-renderingen behöver
   (`stroke`, `fill`, `fillOpacity`, `weight`, `dashArray`,
   `ambitionChoices` på `minomrade`). Leaflet ritar själv polylinjen/
   polygonen — `svg:` används bara i paletten och i PNG-exporten.
3. Uppdatera toppkommentaren (färgmatris) om de nya SVG:erna avviker från
   v3-paletten. Preliminär observation: de nya filerna är rent svart-vita
   (inga röda/gula accenter) — vilket förenklar kommentaren. Utförd
   förstöring har inte längre röd fyllning (den nya SVG:n visar svart X
   i vit cirkel istället). Uppdatera `MK_RED`-kommentaren till "används ej
   i v4 — behålls för framtida bruk".
4. Lägg till `const MK_COLORS = { MK_INK, MK_HALO, MK_WHITE, MK_GRAY, MK_RED };`
   kvar för bakåtkompat (används inte av v4-SVG:erna, men export/Leaflet-
   metadata refererar `MK_INK`/`MK_HALO` fortfarande).

**Implementation i minkarta.html:**

1. `generateProtocolText()` — uppdatera `labelMap` och `typOrder`:
   ```js
   const labelMap = {
       strv_tryck: 'Stridsvagnsmina',
       tramp: 'Trampmina',
       larm:  'Larmmina',
       fordonsmina: 'Fordonsmina',
       fordon_sid:  'Sidverkande fordonsmina',
       forsvar: 'Försvarsladdning',
       prov_rojskydd:  'Prov. fordonsröjskydd',
       rojskydd:       'Röjningsskydd',
       omr_verkan:     'Områdesverkande mina',
       verkansomrade:  'Verkansområde'
   };
   const typOrder = [
       'strv_tryck', 'tramp', 'larm',
       'omr_verkan', 'verkansomrade',
       'fordonsmina', 'fordon_sid', 'forsvar',
       'rojskydd', 'prov_rojskydd'
   ];
   ```
   Ta bort alla referenser till `strv_full`, `strv_rojskydd`, `trad`,
   `avstand`, `skenminering`, `landmina_okand`, `riktad_verkan`.
   Förstöring-nycklar (`forst_forb`, `forst_forb_sakrad`, `forst_utf`,
   `forst_plan`) räknas inte som punktminor — de filtreras redan bort i
   `countMinesByType()` via `if (o.typ === 'forst_forb' || ...)`-grenen.
   Lägg till `forst_forb_sakrad` i samma filter.
2. `labelMapFull` i datalista-sektionen: uppdatera `Object.assign({}, labelMap, {...})`
   så att polygoner/meta har sina egna labels:
   ```js
   const labelMapFull = Object.assign({}, labelMap, {
       forst_forb: 'Förberedd förstöring',
       forst_forb_sakrad: 'Förberedd förstöring, säkrad',
       forst_utf:  'Utförd förstöring',
       forst_plan: 'Planlagd förstöring',
       minruta: 'Minruta',
       minomrade: 'Minerat område',
       avstand_tramp: 'Avståndslagd trampmin.',
       avstand_strv: 'Avståndslagd strvmin.',
       minlinje: 'Minlinje',
       avsparrning: 'Avspärrning',
       ytter: 'Yttergränsmarkör',
       upk: 'UPK-markör',
       sp:  'SP-markör'
   });
   ```
3. `countMinesByType()` — utöka filter:
   ```js
   if (['forst_forb','forst_forb_sakrad','forst_utf','forst_plan'].includes(o.typ)) continue;
   ```
4. Områdes-filter i datalista/protokoll:
   ```js
   const areas = state.objects.filter(o =>
       ['minruta','minomrade','avstand_tramp','avstand_strv'].includes(o.typ)
   );
   ```
   (skenminering borttagen ur listan).
5. **Migration i `loadPersisted()`:** om en gammal v3-session i IndexedDB
   innehåller borttagna `typ`-värden, filtrera bort dem. Räkna hur många
   som togs bort och visa en toast. Kör `scheduleAutosave()` efter
   migrationen så det sparas.
   ```js
   const REMOVED_TYPS = new Set([
       'strv_full','strv_rojskydd','trad','avstand',
       'skenminering','landmina_okand','riktad_verkan'
   ]);
   const before = state.objects.length;
   state.objects = state.objects.filter(o => !REMOVED_TYPS.has(o.typ));
   const removed = before - state.objects.length;
   if (removed > 0) {
       console.log('MINKARTA v4: ' + removed + ' objekt av borttagna symboltyper togs bort vid uppgradering.');
       toast(removed + ' objekt av borttagna symboltyper togs bort vid uppgradering till v4.', 3600);
       scheduleAutosave();
   }
   ```
   Placera migrationen före v3→v4-kedjans andra migrationsblock
   (up→upk-migrationen från v3 ligger kvar — kör dem båda i samma
   loadPersisted-cykel).

**Klar när:** Paletten visar 10 grupper med 23 symboler. Klick på varje
symbol placerar markör på kartan. SVG:erna i paletten och tooltip-förhands-
visningen ser rena ut (ingen clipping, korrekt viewBox). Gammalt state
med borttagna typer migreras transparent med toast. Ingen konsol-error.
`service-worker.js` CACHE bumpad till `hv-20260426_minkartav4_1`.

**Commit:** `MINKARTA: nya SVG-symboler + palett-regruppering (20 st + UPK/SP/ytter)`

---

## ▍ CHECKPOINT — användarens godkännande

Efter FAS 1 committats **stannar arbetet**. Skriv till användaren, ordagrant:

> FAS 1 klar. Öppna minkarta.html och placera några symboler ur paletten
> för att granska de nya SVG-symbolerna. Säg "kör vidare" när du vill att
> jag går vidare.

Inga FAS 2–6 startas förrän användaren säger "kör vidare" (eller motsvarande).
Ingen push heller.

---

## FAS 2 — 4× förstorade punktsymboler i PNG-exporten

**Leverans:** `renderExportAsync()` i `minkarta-export.js` ritar point- och
meta-symbolerna 4× större i PNG:n. Namn-brickan skalas proportionellt så
texten under symbolen är stor och läsbar när mottagaren öppnar PNG:n i
Signal. Linje- och polygon-strokes skalas proportionellt så att halo-
kontrasten inte ser tunn ut bredvid de jumbo-förstorade punktsymbolerna.
Skärmvisningen (Leaflet-ikonen) är oförändrad.

**Konkreta ändringar i renderExportAsync():**

1. Punktsymbol-ritningen byter från 34×34 → 136×136 px:
   ```js
   if (img) ctx.drawImage(img, p.x - 68, p.y - 68, 136, 136);
   ```
2. Namn-brickan skalas proportionellt — egen `drawNameBadgeLarge()` (eller
   parametriserad `drawNameBadge(ctx, cx, cy, text, scale)`). Font
   `600 28px Inter, sans-serif`, padding 12×6, `bh = 40`. Offset från
   symbol-center ska vara + 84 så brickan ligger tydligt under den
   förstorade symbolen:
   ```js
   if (drawLabels && o.typ !== 'ytter') {
       drawNameBadge(ctx, p.x, p.y + 84, o.label || sym.label, 4);
   }
   ```
   Parametrisera `drawNameBadge` så att skärm-liknande användning med
   scale 1 fortfarande fungerar (om den skulle återanvändas).
3. Linje-halo: `ctx.lineWidth = (sym.weight || 4) * 2 + 2;` under vit
   stroke + `ctx.lineWidth = (sym.weight || 4) * 2;` svart stroke ovanpå.
4. Polygon-halo: `ctx.lineWidth = 10` (vit) + `ctx.lineWidth = 4` (svart).
5. Polygon-etikettfont: `700 24px Inter, sans-serif` (upp från 12 px).
6. `drawLabels`-flaggan från `state.showLabels` respekteras precis som
   i v3 — användaren kan fortfarande välja bort brickorna.

**Oförändrat:**
- Titellist (60 px), footer (60 px), tile-storlek 256 px, bounding box-
  beräkning, z-picker, MGRS-hörn, center-MGRS, norrpil, skalstock.
- `renderExport()` (synkrona stub-versionen) — rörs inte (används ej).
- Leaflet-ikonen på skärmen — `iconSize: [34,34]` i `mkMakeIcon()` förblir.

**Klar när:** Export av en karta med två UPK + tre minor ger en PNG där
varje symbol är ~136 px stor och "UPK 594"-etiketten går att läsa utan
inzoom i Signal. Linje-/polygon-strokes ser proportionerliga ut mot
symbolerna. `service-worker.js` CACHE bumpad till
`hv-20260426_minkartav4_2`.

**Commit:** `MINKARTA: 4x storre symboler och text i PNG-exporten`

---

## FAS 3 — Flytta lager-/pan-kontroller upp under kartan

**Leverans:** `.palette-layers` (Namn-etiketter-toggle) och Pan-läge-knappen
flyttas ut ur palette-body till en ny rad placerad direkt under `.map-wrap`
men ovanför `.palette`. Ångra / Gör om / Exportera PNG / Rensa allt blir
kvar i `.palette-toolbar` (de hör samman med placeringsarbetet och är
mindre frekventa).

**DOM-struktur (ändrad del):**

```html
<div class="map-wrap">…</div>

<!-- NYTT v4: genvägsrad för de mest frekventa kontrollerna -->
<div class="map-controls" id="mapControls"></div>

<section class="palette" id="paletteRoot">
    <div class="palette-head">…</div>
    <div class="palette-body" id="paletteBody">
        <!-- symbol-grupper renderas här -->
        <!-- INGEN mer .palette-layers här -->
        <!-- palette-toolbar: Ångra/Gör om/Exportera/Rensa -->
    </div>
</section>
```

**CSS:**

```css
.map-controls {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    align-items: center;
    flex-wrap: wrap;
    padding: 8px 10px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
}
.map-controls label { display: flex; align-items: center; gap: 6px;
    font-size: 0.78rem; color: var(--text-secondary); cursor: pointer;
    letter-spacing: 0.02em; text-transform: none; font-weight: 500; }
.map-controls input[type="checkbox"] { accent-color: var(--accent);
    width: 16px; height: 16px; }
```

**JS-ändringar:**

1. `renderPalette()` — ta bort blocket som skapar `.palette-layers` och
   Pan-läge-knappen i `.palette-toolbar`. Flytta båda till en ny funktion
   `renderMapControls()` som skriver till `#mapControls`.
2. `attachToolbarActions()` — skapar Ångra/Gör om/Exportera/Rensa. Pan-
   läge-knappen tas bort (den ligger nu i `renderMapControls`).
3. Lager-kryssrutan: behåll samma id (`mkToggleLabels`), samma
   localStorage-persistens (`LAYERS_KEY`), samma trigger (`saveLayerState()`
   + `rebuildLayers()`).
4. Pan-läge-knappen: samma styrlogik (`setActiveTool(null)`), samma
   textetikett "Pan-läge".

**Klar när:** Öppna minkarta.html, se två nya kontroller (Namn-etiketter-
toggle + Pan-läge-knapp) placerade i en rad under kartan, ovanför paletten.
Klicka Pan-läge → symboler avmarkeras. Toggla Namn-etiketter → brickor
visas/göms. Ångra/Gör om/Exportera/Rensa ligger kvar i palette-toolbaren.
Testa 360 px-vy: kontrollerna wrappar snyggt. `service-worker.js` CACHE
bumpad till `hv-20260426_minkartav4_3`.

**Commit:** `MINKARTA: flytta lager- och pan-kontroller upp under kartan`

---

## FAS 4 — "Rensa allt" rensar även protokollet

**Leverans:** `clearBtn`-listenern i `attachToolbarActions` utvidgas så att
den utöver `state.objects` även nollställer alla protokoll-fält:
- `#pNr.value = ''`
- `#pAmbition.value = ''`
- `#pForband.value = ''`
- `#pChef.value = ''`
- `#pTnr.value = ''` — återstarta auto-TNR med ny Zulu-kort
- `#pRojskydd.value = ''`
- `#pUp.value = ''` (textarea)
- `#pNote.value = ''` (textarea)
- `#pOut.textContent = ''` + `#pOut.style.display = 'none'`
- `#pCopy.style.display = 'none'` (kommer bytas till #pShare i FAS 5)
- `#pUpWarn.style.display = 'none'`
- `#pTnrAutoBadge.style.display = ''` (syns igen efter auto-TNR-refresh)
- `_lastExport = null` (cachen tas bort)

**Implementation:**

```js
clearBtn.addEventListener('click', () => {
    if (!state.objects.length) return toast('Kartan är redan tom.');
    if (!confirm('Radera alla ' + state.objects.length + ' objekt? (dubbel­bekräftelse följer)')) return;
    if (!confirm('Säker? Alla minsymboler, linjer och områden försvinner.')) return;
    pushUndo();
    state.objects = [];
    rebuildLayers();

    // v4: rensa även protokoll-panelen
    resetProtocolPanel();
    _lastExport = null;
});

function resetProtocolPanel() {
    const ids = ['pNr','pAmbition','pForband','pChef','pTnr','pRojskydd','pUp','pNote'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const out = document.getElementById('pOut');
    if (out) { out.textContent = ''; out.style.display = 'none'; }
    const copy = document.getElementById('pCopy') || document.getElementById('pShare');
    if (copy) copy.style.display = 'none';
    const warn = document.getElementById('pUpWarn');
    if (warn) warn.style.display = 'none';
    // Auto-TNR prefillas igen
    const tnr = document.getElementById('pTnr');
    const badge = document.getElementById('pTnrAutoBadge');
    if (tnr && badge) {
        tnr.value = zuluShortNow();
        badge.style.display = '';
    }
}
```

**Bevarat:**
- Dubbel-bekräftelsen (två `confirm()`-dialoger) — användaren har redan
  byggt upp tillit för den, inga överraskningar.
- IndexedDB-autospar körs via `pushUndo()` + `rebuildLayers()` så nästa
  load också är tomt.
- Lager-kryssrutans `state.showLabels` rörs inte — den är en UI-preferens
  som användaren sätter permanent.

**Klar när:** Fyll i protokoll-fälten och lägg några symboler. Tryck Rensa
allt → bekräfta båda dialogerna → alla fält är tomma, TNR visar ny Zulu-
kort med auto-badge, PNG-cachen är rensad. Nästa reload → inget state
kvar. `service-worker.js` CACHE bumpad till `hv-20260426_minkartav4_4`.

**Commit:** `MINKARTA: Rensa allt nollstaller aven protokoll-panelen`

---

## FAS 5 — Dela protokoll bifogar alltid kartbild

**Leverans:** Bifoga-karta-modalen (`showAttachMapModal`) elimineras.
Knappen `#pCopy` döps om till `#pShare` med texten "Dela protokoll".
Klick → PNG genereras automatiskt + `navigator.share({files, text})`.
Fallback: clipboard + PNG-download + toast "Text kopierad. PNG nedladdad —
bifoga manuellt i Signal."

**HTML-ändring:**

```html
<!-- FÖRE -->
<button type="button" class="btn btn-sm btn-ghost" id="pCopy"
    style="display:none;width:100%;margin-top:6px">Kopiera till urklipp</button>

<!-- EFTER -->
<button type="button" class="btn btn-sm btn-accent" id="pShare"
    style="display:none;width:100%;margin-top:6px">Dela protokoll</button>
```

(Byte från `btn-ghost` till `btn-accent` — knappen är nu den primära
delningsvägen och bör se tydlig ut.)

**JS-flöde i `attachProtocolActions()`:**

```js
document.getElementById('pShare').addEventListener('click', async () => {
    const txt = document.getElementById('pOut').textContent;
    if (!txt) return;

    // Generera PNG först (använd cache om den finns)
    let blobInfo = _lastExport;
    if (!blobInfo) {
        try { blobInfo = await prepareExportBlob(); }
        catch (e) { toast('Kunde inte rendera karta: ' + (e.message || 'okänt'), 3200); return; }
    }
    if (!blobInfo) {
        // Ingen karta (kartan var tom) — dela bara text
        await shareTextOnly(txt);
        return;
    }

    // Försök Web Share med filer + text
    const shareRes = await window.MK_EXPORT.shareBlob(blobInfo.blob, blobInfo.filename, txt);
    if (shareRes === 'shared') { toast('Delad (text + karta).', 2200); return; }

    // Fallback: clipboard + download
    try { await navigator.clipboard.writeText(txt); } catch (_) {}
    window.MK_EXPORT.downloadBlob(blobInfo.blob, blobInfo.filename);
    toast('Text kopierad. PNG nedladdad — bifoga manuellt i Signal.', 4000);
});

async function shareTextOnly(txt) {
    try {
        await navigator.clipboard.writeText(txt);
        toast('Text kopierad (ingen karta att bifoga).', 2400);
        if (navigator.share) { try { await navigator.share({ text: txt }); } catch (_) {} }
    } catch (_) {
        toast('Kunde inte kopiera. Markera texten manuellt.', 3200);
    }
}
```

**pGen-knappen** — visa `#pShare` istället för `#pCopy`:
```js
document.getElementById('pShare').style.display = 'block';
```

**Död kod som tas bort:**
- Hela `showAttachMapModal(text)`-funktionen.
- `closeAttachMapModal()`-funktionen.
- CSS-blocken `.mk-modal-backdrop` och `.mk-modal` (inklusive
  `.mk-modal-title`, `.mk-modal-body`, `.mk-modal-actions`).

**Sökning efter kvarvarande referenser** (`grep -n "showAttachMapModal\|mk-modal"`)
ska ge 0 träffar efter borttagningen.

**Klar när:** Generera sammanställning → "Dela protokoll"-knappen visas
(accent-grön, full bredd). Klick → PNG genereras på ett ögonblick, Web
Share-dialog öppnas med text + PNG-fil färdig att klistra in i Signal.
Desktop Chrome som inte stöder Web Share → toast "Text kopierad. PNG
nedladdad". `service-worker.js` CACHE bumpad till
`hv-20260426_minkartav4_5`.

**Commit:** `MINKARTA: Dela protokoll bifogar alltid karta automatiskt`

---

## FAS 6 — README + slutlig cache-bump

**Leverans:** README uppdaterad med v4-entry i dagboken (2026-04-26).
Funktionstabellens MINKARTA-rad uppdaterad. Service-worker `CACHE` bumpad
till `hv-20260426_minkartav4_6` (slutlig). Manuell test-matris körd och
bockad. Inga konsolfel, inga nya integritetsläckor.

**Implementation:**

1. `README.md`:
   - Uppdatera MINKARTA-raden i funktionstabellen:
     ```
     | **MINKARTA** | Minläggningskarta & minprotokoll (reglementstecken
     | från stab-pappren 2026-04-26, UPK-numrering 001–999,
     | UPK/SP-auto-inmätning, datalista, automatisk dela-med-karta,
     | jumbo-symboler i PNG-export, övningsläge) |
     ```
   - Ny dagboksentry (ovanför 2026-04-25-entryt):
     ```markdown
     ### 2026-04-26: MINKARTA v4 — nya SVG-symboler + dela-med-karta
     Sex-fas-iteration (roadmap: `roadmap-minkarta-v4.md`).
     * Nya symboler (FAS 1): …
     * Jumbo-export (FAS 2): …
     * Genvägsrad under kartan (FAS 3): …
     * Utökad Rensa (FAS 4): …
     * Dela protokoll (FAS 5): …
     * Polish (FAS 6): …
     ```
2. `service-worker.js`:
   - Slutlig `CACHE = 'hv-20260426_minkartav4_6'`. Mellanbumps `_1` … `_5`
     längs vägen per fas.
   - FILES-listan oförändrad (SVG:erna är inline i `minkarta-symbols.js`,
     inga nya runtime-filer).
3. Manuell test-matris:
   - [ ] Desktop Chrome: placera en symbol ur varje grupp (10 st), granska
         SVG-kvalitet + position.
   - [ ] Desktop Chrome: 2 UPK + 1 SP, generera protokoll, tryck "Dela
         protokoll" — verifiera Web Share + PNG-bifogning.
   - [ ] Desktop Chrome utan Web Share: verifiera fallback (clipboard +
         download + toast).
   - [ ] Desktop Chrome: Rensa allt → bekräfta båda dialoger → alla
         protokoll-fält tomma, TNR omstartad, PNG-cache rensad.
   - [ ] Desktop Chrome: toggla Namn-etiketter i den nya map-controls-
         raden — brickor försvinner/återkommer.
   - [ ] Desktop Chrome: Exportera PNG — symbolerna är tydligt större
         (~4× v3) och texten under är läsbar.
   - [ ] Android Chrome: samma grundflöde + Signal-delning via Web Share.
   - [ ] DevTools Network: inga requests innehåller symbolkoordinater.
   - [ ] Migration: öppna en v3-IndexedDB-session med minst ett objekt
         av typ `strv_full`/`trad`/`skenminering`/`avstand` — verifiera
         toast "N objekt av borttagna symboltyper togs bort" + att
         kartan ritar korrekt efter reload.
   - [ ] Offline: ladda fresh online, stäng av nätet, testa ritning +
         protokoll + "Dela protokoll" (PNG utan tiles, bara
         dark-fallback-rutor — kraschar inte).
4. Inga `version.js`-ändringar här — det bumpas av befintligt auto-flöde.
5. Push först när användaren godkänner. Efter push: skriv ut alla short
   commit-hashar (memory-policy `feedback_push_version`).

**Klar när:** Alla 6 commits är committade, README uppdaterad,
check-listan av. Ingen konsol-error, ingen integritetsläcka, ingen
regression i v3-funktionalitet.

**Commit:** `MINKARTA: polish, README och serviceworker-bump v4`

---

## Riskregister (v4-specifika)

| Risk | Mitigation |
|------|------------|
| SVG-filernas viewBox är olika (400×400, 400×390, 1050×520, 500×490, …) — palett-rutans 28×28 px preview kan klippa innehåll om vi inte normaliserar | SVG:erna inline:as som de är; Leaflet-ikonen + palett-previewen använder `width: 28px/34px`-CSS som skalar hela viewBox. Ingen normalisering krävs eftersom `preserveAspectRatio` (default) passar in innehållet. Verifiera vid CHECKPOINT att inget klipps. |
| Bortgångna nycklar (`strv_full` m.fl.) finns kvar i IndexedDB-state hos existerande v3-användare → kartan kraschar | `loadPersisted()`-migrationen filtrerar bort dem transparent + toast. Ingen stack-trace. |
| `rojskydd` var tidigare en egen symbol (stor R) men labelMap hade `rojskydd: 'Röjningsskydd'` — inga andra kollisioner förväntas efter v4 | Kontrollera att inga gamla nycklar dyker upp i `labelMap`/`typOrder` efter cleanup. |
| Borttagningen av `showAttachMapModal` kan bryta existerande användare som klickat "Bara text" sista gången | Dela-beteendet blir oftare mer bekväma (ett klick istället för två) — om någon inte vill dela PNG kan de avbryta Web Share-dialogen. Tradeoff accepterad. |
| 4× förstorade symboler i PNG kan överlappa varandra vid tät minläggning | Symbolerna har halo + drop-shadow som ändå gör dem läsbara. Om feedback negativ: tillåt användaren välja 2× i FAS 2-follow-up (inte v4-scope). |
| Ny `forst_forb_sakrad` blandas ihop med `forst_forb` av användaren | Gruppering i paletten ("Förstöring" → `forst_forb`, `forst_forb_sakrad`, `forst_utf`, `forst_plan`) gör skillnaden tydlig. Label-rutan "Förberedd förstöring, säkrad" differentierar i datalistan. |
| Protokoll-rensning inkl. `#pUp` raderar manuella rader (t.ex. handskrivna adresser) | Användaren har redan dubbelbekräftat — detta är en avsiktlig rensning. Ingen mitigering nödvändig. |
| Flyttade pan/lager-kontroller ändrar uppvald scroll-position för existerande användare | Layouten är upptäckt-bar och mer logisk. Minkarta är ännu i BETA — liten regressionsrisk. |

---

## Uppskattad omfattning

- FAS A: ~430 rader roadmap (denna fil)
- FAS 1: ~300 rader (20 inline-SVG:er + SYMBOL_GROUPS + labelMap/typOrder + migration)
- FAS 2: ~60 rader (drawImage-koefficienter, drawNameBadge-scale-param, stroke-vikter)
- FAS 3: ~80 rader (ny `.map-controls`-CSS + HTML-div + `renderMapControls()` + omflyttning)
- FAS 4: ~50 rader (`resetProtocolPanel()` + klick-listener-utökning)
- FAS 5: ~100 rader (byt `pCopy` → `pShare`, ny klick-listener, ta bort `showAttachMapModal` + CSS)
- FAS 6: ~60 rader (README-dagbok + funktionstabell + cache-bump)

Totalt ~1080 nya/ändrade rader fördelat på 4 befintliga filer + README +
ny roadmap. SVG-inlining står för den största delen (FAS 1).

---

## Arbetsflöde och verifiering per fas

För varje fas (1–6), innan commit:

1. `cd "c:\0-dropbox\Dropbox\1oels dokument\Antigravity\hv"` (memory-
   policy `feedback_cd_to_repo`).
2. Manuell smoke-test i browser (öppna `minkarta.html`).
3. DevTools Console: inga nya fel.
4. DevTools Network: inga nya endpoints utöver kontraktet.
5. `service-worker.js` `CACHE`-namn bumpat till `hv-20260426_minkartav4_<N>`.
6. Commit-meddelande följer `MINKARTA: <...>`-mönstret.

**CHECKPOINT efter FAS 1** — vänta på användarens "kör vidare".

**Push** sker först när användaren explicit bekräftar hela puckeln.
Efter push — skriv ut samtliga short commit-hashar (memory-policy
`feedback_push_version`).
