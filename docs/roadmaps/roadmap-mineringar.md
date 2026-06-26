# Roadmap — Tabben **MINKARTA**

Minläggnings- och minprotokoll-verktyg för 7srapport.com.
Följer samma "Modern Vanilla"-profil som resten av sviten: ren HTML/CSS/ES6,
Leaflet + OpenTopoMap, PWA, offline-först, svensk terminologi från
*Mineringar på karta – sammanställning* (stab-PDF).

Arbetsnamn: **MINKARTA** (kort, verktygsmässigt, matchar övriga tabbnamn).
Alternativ som övervägts: MINPROT, MINLÄGE, MINERING. **MINKARTA** vinner för
att det är det användaren faktiskt ritar — kartan är artefakten.

---

## 0. Ramverk och designkontrakt

Dessa regler gäller alla efterföljande faser och ska inte förhandlas om under
bygget.

**0.1 Integritetskontrakt (hårt)**
- Inga `fetch`/`XMLHttpRequest`/`navigator.sendBeacon`/WebSocket/`<form action>`
  som skickar användardata till någon server.
- Tillåtna utgående anrop:
  1. OpenTopoMap-tiles (`tile.opentopomap.org`).
  2. Nominatim/Overpass för reverse-geocoding av **kartans vy-center eller
     adressökning**, aldrig av minsymbol-koordinater.
  3. Ev. `ortnamn.json` lokalt (redan i repo).
- All ritning, lagring, export och delning sker lokalt.
- LocalStorage/IndexedDB får användas för persistent state på enheten.
- Delning är alltid user-initiated (`navigator.share` eller nedladdning).

**0.2 Designkontrakt**
- Samma `:root`-variabler och `.form-group`/`.btn`/`.tab-nav` som övriga tabbar.
- Font: self-hosted `fonts/inter.css`.
- Mobile first, tryckytor ≥ 48 px, fungerar stående i 360×640.
- Svenska texter, reglementsenlig terminologi.

**0.3 Teknikkontrakt**
- Leaflet 1.9.4 via samma CDN + SRI-hash som obslosa.html.
- MGRS-modulen kopieras från obslosa.html (inline IIFE).
- Inga nya tunga bibliotek. Ingen `html2canvas`. Ingen build-step.
- Export sker med native `OffscreenCanvas` / `<canvas>` + `Image()`.

**0.4 Filfördelning**
- `minkarta.html` — huvudfil (ram, UI-skelett, init).
- `minkarta-symbols.js` — alla minsymbols-SVG:er som data-URI eller `<symbol>`.
- `minkarta-export.js` — PNG-render (tiles → canvas → blob).
- `minkarta-game.js` — spelläget "SÄNKA MINOR" (lazy-init, togglas in).
- `service-worker.js` — uppdatera cache-lista.
- `manifest.json` — oförändrad (ingen ny ikon krävs).
- `index.html` + alla 13 HTML-filer — lägg `MINKARTA` i sub-nav.
- `README.md` — funktionstabell + dagbokspost.

---

## FAS 1 — Kart-skelett + nav-hub-integration

**Leverans:** `minkarta.html` syns i nav, öppnar en fullskärms-karta med samma
OpenTopoMap-lager som obslosa.html. MGRS-sökfält fungerar. Ingen ritning ännu.

1. Kopiera `obslosa.html` → `minkarta.html`. Behåll `<head>` exakt
   (CSP-redirect, viewport, font, leaflet CDN+SRI, manifest, ikon).
2. Ersätt `<header>`: titel `MINKARTA`, underrad `Minläggningskarta & protokoll`.
3. Byt aktiv länk i båda `<nav>`-raderna. Lägg `<a href="minkarta.html">MINKARTA</a>`
   som 9:e sub-länk i **alla 13 HTML-filer**. Ändra grid till
   `repeat(3, 1fr)` för att 9 objekt ska bli 3×3 istället för 4+4+1.
4. Rensa formulär-view och resultat-view. Behåll `<div class="container">`.
5. Lägg karta fullbredd som primärvy (inte modal — kartan ÄR verktyget här).
6. MGRS-sökfält överst med paste-extrahering (samma som obslosa.html).
   Accepterar MGRS, `lat,lon` och `lat lon`.
7. Kopiera in MGRS IIFE oförändrad. Kopiera `extractCoord()`.
8. Initiera karta med samma tile-URL och `maxZoom: 17`.
9. Cache senaste vy-center i `localStorage['minkarta.lastView']` (frikopplad
   från obslosas nyckel för att inte störa befintligt beteende).
10. Lägg till `<details>` längst ner med integritetstext (samma mönster som
    övriga "Om"-sektioner).
11. Uppdatera `service-worker.js`: lägg `./minkarta.html`, `./minkarta-symbols.js`,
    `./minkarta-export.js`, `./minkarta-game.js` i `FILES`. Bumpa `CACHE`-namn.

**Klar när:** `minkarta.html` öppnas offline efter första laddning, MGRS-sökfält
zoomar till inklistrad koordinat, kartan visar OpenTopoMap, inga konsolfel.

**Commit:** `MINKARTA: kart-skelett och nav-integration`

---

## FAS 2 — Symbolpalett

**Leverans:** `minkarta-symbols.js` exporterar SVG-definitioner för alla tecken
från PDF-sidan *Beteckningar på minprotokoll*. Palett-panel till höger/botten
visar dem som klickbara kakel.

1. Skapa `minkarta-symbols.js` med exporterat objekt `SYMBOLS = { id: { label,
   category, svg, size, anchor } }`.
2. Implementera följande ID:n (PDF sidorna 339, 86, 167):

   Punktsymboler (engångsklick placerar):
   - `strv_tryck` — Stridsvagnsmina, tryckutlöst
   - `strv_full` — Stridsvagnsmina, fullbreddsverkande
   - `strv_rojskydd` — Stridsvagnsmina med röjskydd
   - `tramp` — Trampmina
   - `trad` — Trådmina
   - `larm` — Larmmina
   - `fordonsmina` — Fordonsmina
   - `fordon_sid` — Sidverkande fordonsmina
   - `forsvar` — Försvarsladdning (med siffra)
   - `avstand` — Avståndslagd (`R`-spindel / talet)
   - `forst_forb` — Förstöring, förberedd (säkrad/osäkrad)
   - `forst_utf` — Förstöring, utförd
   - `forst_plan` — Förstöring, planlagd (`PL`)
   - `ytter` — **Yttergränsmarkör** (egen piktogram, fyrkant med hörnmärke)

   Linjesymboler (två-klick / poly):
   - `minlinje` — Minlinje (polyline, pärlor längs med)
   - `avsparrning` — Avspärrning/minvarning (zigzag-tagg)

   Ytsymboler (polygon):
   - `minruta` — Minruta (rektangel)
   - `minomrade` — Minerat område (polygon, etikett `HIND|FÖRDR|STÖR|AVST` + antal)
   - `skenminering` — Skenminering (polygon, streckad kant)

3. Varje symbol är ren inline-SVG (24×24 viewBox för punkter), ingen extern
   URL, ingen bild-fil.
4. Paletten renderas i en draw­er som glider upp från botten på mobil
   (`position:fixed; bottom:0`) och kollapsar med `<details>` för att spara
   skärmyta.
5. Varje knapp har `title=` tooltip med det officiella reglementsnamnet.
6. Valt verktyg blir visuellt aktivt (`.chip.is-active`). Kart-klick i detta
   läge placerar symbolen och byter tillbaka till pan-läge.
7. Färgprofil: mörkgrön bas (`var(--accent)`) på svagt ljus halo så
   symbolerna läses både mot topografiska grönytor och vattendrag.

**Designbeslut (motiveras i kodkommentar):**
- Svenska tecken prioriteras (vänster kolumn i PDF-tabell 339). Internationella
  tecken skippas i v1 — kan läggas till senare via toggle.
- Stridsvagnsmina fullbredd renderas med vågrät balk under cirkeln (enligt PDF
  sida 339). Röjskyddsvariant = samma + `R` ovanför.

**Klar när:** Paletten visar alla 17 symboler. Klick på en symbol + klick på
karta placerar en Leaflet-marker med rätt ikon. Tooltip visar reglementsnamn.

**Commit:** `MINKARTA: symbolpalett med svenska minprotokoll-tecken`

---

## FAS 3 — Placering, drag, redigering, persist

**Leverans:** Full interaktiv ritning. Objekt kan placeras, flyttas, raderas.
Autospar till IndexedDB. Undo/redo. Alla objekt rekonstrueras vid sidladd.

1. Intern datamodell `state.objects[]`:
   ```js
   { id, typ, lat, lng, rotation?, antal?, etikett?, anteckning?,
     created, path? /* för linje/polygon */ }
   ```
2. Handlers:
   - `vänsterklick`: om verktyg aktivt → placera; annars pan.
   - `shift-klick` / `long-press` på tomt område: placera även i pan-läge
     (snabbalternativ för fältbruk).
   - `klick på symbol`: öppna edit-popup (antal, rotation, anteckning, ta bort).
   - `drag`: Leaflet `marker.dragging.enable()`.
   - `long-press` på symbol: ta bort med bekräftelse.
3. Linjeverktyg (minlinje, avspärrning): klicka punkt-för-punkt, dubbel­klick =
   avsluta. Esc avbryter.
4. Polygonverktyg (minruta/område/skenminering): samma men stäng med
   dubbelklick; första och sista punkten sammanfogas automatiskt.
5. Undo/redo-stack (max 50 steg). Ctrl+Z/Ctrl+Y. Mobil: pil-knapp i toolbar.
6. IndexedDB-store `minkarta` med nycklarna `current` och `autosave-<ts>`.
   Autospar `current` var 5:e sekund om ändrat.
7. `beforeunload`-varning om det finns ändringar sedan senaste manuella
   "spara"-knapp.
8. "Rensa allt" — dubbelbekräftelse (knapp → popup "Säker? All ritning
   raderas. [Avbryt] [Ja, rensa]").
9. Lager-toggle: paletten har kryssrutor för minsymboler / måttsatser /
   anteckningar / yttergränser → lager syns/dölj i kartan.

**Klar när:** Jag kan placera 10+ symboler, flytta dem, ladda om sidan, och
alla är kvar. Undo/redo fungerar. Long-press raderar. Inga konsolfel.

**Commit:** `MINKARTA: placering, drag, undo och autospar`

---

## FAS 4 — PNG-export (kärnfeature)

**Leverans:** `minkarta-export.js` producerar en hög­upplöst PNG som beskärs
av yttergränssymbolerna. Dela-knapp använder Web Share API när möjligt,
annars nedladdning.

1. Användaren placerar ≥ 2 `ytter`-markörer. Bounding box = xmin/xmax/ymin/ymax
   av dessa punkter i lat/lng-rymden.
2. Fallback om 0–1 yttergränsmarkörer: bbox av **alla** objekt + 20 % padding,
   och toast: *"Tips: placera yttergränsmarkörer för att styra exporten"*.
3. Algoritm för export:
   1. Bestäm zoom-nivå så bbox får plats i mål­bredd (default 2048 px,
      användarvalbar Låg/Mellan/Hög).
   2. Räkna fram vilka OpenTopoMap-tiles (z/x/y) som täcker bbox.
   3. Ladda alla tiles via `new Image()` med `crossOrigin='anonymous'`
      parallellt.
   4. Rita dem i en `<canvas>` (`devicePixelRatio` × 2).
   5. Vektor-rita alla objekt ovanpå (samma SVG-path som i kartan, men via
      `Path2D` på canvas för pixel-exakthet).
   6. Lägg overlays:
      - Titel-banner (top-center): "MINERING 20X — TNR — datum"
      - MGRS för fyra hörn + center (nedre vänstra hörn)
      - Norrpil (nedre höger)
      - Skalstock, auto-beräknad från zoom + latitud
      - Liten dekorruta med förband/chef om ifyllt
   7. `canvas.toBlob('image/png')` → `URL.createObjectURL` → download-länk
      alt. `navigator.share({files:[...]})`.
4. Filnamn: `minkarta_<MGRS-center-utan-space>_<YYYYMMDD-HHMM>.png`.
5. Font i overlay: Inter via `document.fonts.load()` + `ctx.font`.
6. **Kritiskt:** ingen export-kod skickar minsymbolernas positioner över
   nätet. Tile-requests skickar bara z/x/y för vy-bbox. Verifieras via
   Network-tab.

**Klar när:** En bild med karta, symboler, titel, norrpil, skala, fyra
hörn-MGRS och center-MGRS skapas, beskuren av yttergränser, och kan laddas ner.

**Commit:** `MINKARTA: PNG-export med yttergränsbeskärning och overlay`

---

## FAS 5 — Minprotokoll-panel och textgenerator

**Leverans:** Panel där användaren matar in metadata enligt PDF-kraven.
Knapp "Generera sammanställning" producerar Signal-vänlig text.

1. Formulärfält (i en kollapsbar `<details>` under kartan):
   - Mineringsnummer (auto `201`, `202`, `203` ...)
   - Förband
   - Chef
   - Datum/tid (default "nu", redigerbar)
   - Ambitionsnivå: `Störande` (300/km) / `Fördröjande` (600/km) /
     `Hindrande` (900/km) / `Avståndslagd`
   - Utgångspunkter (minst 2, text/MGRS + ev. kompassriktning + avstånd i m)
   - Startpunkter (≥ 1)
   - Antal minor per typ (räknas automatiskt från objektlistan men kan
     överridas)
   - Röjningsskydd (ja/nej/delvis)
   - Anteckningar (fri text)
2. Auto-varning om färre än 2 utgångspunkter (reglementskrav enligt PDF s. 339).
3. Auto-beräkning: om minlinje finns → längd i meter × (300/600/900 minor
   per km) enligt ambition. Visa som hint "*beräknat behov: 42 strvmina*".
4. Textgenerator: samma stil som övriga tabbar (centrerad ram, monospace,
   tom rad efter TNR). Format:
   ```
   MINERING 201
   Till: 1a plut / Från: AQ
   TNR: 120430BAPR2026
   ==================
   Typ: Hindrande minering
   Utgångspunkt 1: 33VUH 2356 4567 — Rött hus, kompass 180°, 140 m
   Utgångspunkt 2: ...
   Startpunkt: ...
   ------------------
   Stridsvagnsmina tryckutlöst: 24 st
   Stridsvagnsmina fullbredd:    6 st
   Trampmina:                   12 st
   ...
   Röjningsskydd: Ja
   ------------------
   Anteckningar: ...
   ```
5. "Kopiera"-knapp (befintlig `.btn-copy`). Ingen auto-skickning.

**Klar när:** Ifyllning + generera producerar ren text som är kopierbar och
Signal-klar. Auto-räkning av antal minor fungerar.

**Commit:** `MINKARTA: minprotokoll-panel och textgenerator`

---

## FAS 6 — Spelläge "SÄNKA MINOR"

**Leverans:** `minkarta-game.js`. Aktiveras via knapp "ÖVNINGSLÄGE". Stor
orange banner "ÖVNING – FIKTIV DATA" visas hela tiden när läget är på.
Separat IndexedDB-store för spelstate.

1. Toggle i toolbar: `[ SKARPT | ÖVNING ]` (analogt med TNR-switchen i övriga
   tabbar). Laddar `minkarta-game.js` lazy första gången.
2. Spel-läget bytar ut titelbanner till orange, byter `state`-referens till
   en separat modell `gameState` så att skarpa minprotokoll aldrig kan
   blandas ihop.
3. Spelflöde (Spelare A):
   1. Välj MGRS-center + kvadratstorlek (default 500×500 m).
   2. Budget: konfigurerbar totalyta (default 10 000 m²) som mäts mot
      minruta-area + minlinje-längd × antagen bredd (5 m) + område-area.
   3. Statusrad visar "Använt: 4 200 / 10 000 m²". "Klar"-knapp aktiveras
      när budget är uppnådd eller mindre.
   4. "Klar" genererar **två** PNG:er:
      - `A-blind.png`: bara kvadratramen, utan minor. Centermarkering + MGRS.
      - `A-facit.png`: samma karta med minor synliga.
   5. Användaren delar "A-blind.png" + MGRS-center via Signal / clipboard.
4. Spelflöde (Spelare B):
   1. Öppnar MINKARTA, klickar "ÖVNING", klistrar in MGRS-centerkoordinaten.
   2. Sätter sina egna gissningar som minsymboler på samma snitt.
   3. "Klar" genererar `B-gissning.png` och delar tillbaka.
5. Spelare A lägger sin `A-facit.png` bredvid `B-gissning.png` i Signal för
   visuell rättning. Ingen auto-matchning — det är avsiktligt manuellt för
   att hålla nätverkskontraktet rent.
6. Integritet: ingen WebSocket, ingen state-server, ingen delning utan
   user-initiated gest. Spelet fungerar offline (utom OpenTopoMap-tiles).
7. "Avsluta övning" → gameState nollställs och karta återgår till skarpt läge.

**Klar när:** Två testare kan köra ett gissningsvarv från PNG-delning till
facit, utan att appen skickar något till nätet utöver tiles.

**Commit:** `MINKARTA: spellage SANKA MINOR med blind och facit-export`

---

## FAS 7 — Polish, README, manifest, service-worker, version

**Leverans:** Repo är redo för push.

1. `README.md`:
   - Lägg rad i funktionstabellen: `| **MINKARTA** | Minläggnings- och
     minprotokoll-verktyg (OpenTopoMap + PNG-export) |`
   - Dagboksentry under dagens datum (2026-04-23) med punktlista över faserna.
2. `service-worker.js`: verifiera att alla nya filer finns i `FILES`.
   Bumpa `CACHE`-namnet till ny tidsstämpel.
3. `manifest.json`: ingen ändring.
4. Integritetssektion i `minkarta.html` (längst ner, `<details>` som i övriga
   tabbar) — beskriver exakt vilka anrop som sker och vilka som **inte** sker.
5. `version.js` bumpas efter varje fas-push (via befintligt auto-bump-flöde).
6. Manuell test i Chrome desktop + Android Chrome:
   - Placera 20 symboler, exportera PNG.
   - Verifiera i DevTools Network att inga requests innehåller koordinater
     utom tile-URL:er (z/x/y).
   - Kör spelläget end-to-end offline.
7. Om något i PDF var otydligt: notera beslutet i en `<!-- designbeslut: ... -->`
   kommentar i HTML:en.

**Klar när:** Alla sju faser pushade, länkade i README, fungerar offline.

**Commit:** `MINKARTA: polish, README och serviceworker-cache`

---

## Riskregister

| Risk | Mitigation |
|------|------------|
| Tile-CORS blockerar canvas-export | OpenTopoMap tillåter CORS — verifiera tidigt. Fallback: renderar med degraderat tile-lager vid block. |
| Stora exporter (> 4096 px) spränger mobil-RAM | Cappa max-bredd till 2048 px default, 4096 px endast på desktop. |
| Användare förväxlar övning och skarp | Ständig orange banner + separat IndexedDB-store + dubbelbekräftelse vid växling. |
| Symbolerna blir otydliga på zoomnivå 10 | SVG skalas inte ner under 18 px i minsta dimension — klustras om för tätt. |
| Reglementstolkning fel | Commit refererar till sidnummer i PDF när en symbol är icke-uppenbar. |

---

## Uppskattad omfattning

- FAS 1: ~300 rader (mest strukturkopia från obslosa.html)
- FAS 2: ~400 rader SVG + palett-CSS
- FAS 3: ~500 rader (state + IndexedDB + undo)
- FAS 4: ~400 rader canvas-rendering
- FAS 5: ~250 rader formulär + textmall
- FAS 6: ~350 rader spellogik
- FAS 7: ~100 rader polish + README

Totalt ~2 300 nya rader fördelat på ~4 nya filer + ändringar i 13 navfiler.
