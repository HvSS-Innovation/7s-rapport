# 7S Rapport & Fältrapportverktyg

**Privatutvecklat utbildnings- och minneshjälpverktyg riktat till hemvärnssoldater. Inte kopplat till eller fastställt av Försvarsmakten.**

Webbaserade rapportverktyg paketerade som en PWA (Progressive Web App) som fungerar offline direkt i mobilen.

**Live-version:** [7srapport.com](https://7srapport.com)

## Effektivare Sammanställning hos högre chef
En av de största vinsterna med dessa verktyg är möjligheten att korta ledtiderna från observation till beslut genom att soldaterna skickar in sina 7S-rapporter direkt från sina telefoner via **Signal** till högre chef.

## Bakgrund och Syfte
Detta projekt startade som ett försök att hitta ett snabbt och semiautomatiskt arbetsflöde för att effektivisera kommunikationen i fält. Genom att använda färdiga mallar som genererar ren text, minimeras tiden för inmatning samtidigt som rapportformatet blir reglementsenligt och konsekvent. Verktyget är en del i ett pågående arbete med att digitalisera och förenkla ledningsstöd för hemvärnet, utformat för att matcha den smidighet och användarvänlighet som soldaterna är vana vid från det civila livet.

## Funktioner i urval
*   **100% Offline-stöd:** Fungerar utan täckning efter första laddningen.
*   **Mörkeranpassad UX:** Designat med ett strikt Dark Mode.
*   **Metadata-stöttning:** Möjlighet att hämta tid och koordinater från GPS eller foton.
*   **Anpassat för Signal:** Genererar ren text redo att klistras in i Signal, vilket låter de korta meddelandena effektivt försvinna i den civila mobiltrafikens brus.

## Installation för Offline-bruk (PWA)
För att få ut det mesta av verktyget bör det installeras som en app på telefonen:
1.  Öppna [7srapport.com](https://7srapport.com) i din mobila webbläsare (Chrome/Safari).
2.  **iOS:** Tryck på Dela-ikonen (fyrkant med pil upp) och välj "Lägg till på hemskärmen".
3.  **Android:** Tryck på de tre prickarna och välj "Installera app" eller "Lägg till på startskärmen".
Verktyget kommer nu att fungera även när du har flygplansläge eller är i radioskugga.

## Verktyg i sviten

| Formulär | Beskrivning |
|----------|-------------|
| **7S** | Grundläggande spaningsrapport (Storlek, Slag, Sysselsättning...) |
| **WHAT** | Stridsfordonsidentifiering |
| **SCRIM** | Civila fordon |
| **WEFT** | Flygfarkoster (Fixed-wing, Engines, Fuselage, Tail) |
| **A-H** | Personbeskrivning / signalement |
| **OBSLÖSA** | Observationsrapport |
| **FORS** | Förbandsrapport |
| **PEDARS** | Stridsvärderapport |
| **SCHEMA** | Postschema med automatisk rullning och avlösningsväckning |
| **EOBUSARE** | Eldorder |
| **OBO** | Orientering-Beslut-Order (*Tidigt utvecklingsstadium*) |
| **RASSOIKA** | Patrullchefens checklista (*Tidigt utvecklingsstadium*) |
| **VÄDER** | Meteorologisk prognos (Hämtar SMHI-data vid täckning) |
| **MINKARTA** | Minläggningskarta & minprotokoll (reglementstecken från stab-paketet 2026-04-26, UPK-numrering 001–999, UPK/SP-auto-inmätning, datalista, automatisk dela-med-karta, jumbo-symboler i PNG-export, övningsläge) |
| **SENSORSKISS** | Sensoruppsättning & beslutsstödsplan (sensorer från Utbildningsanvisning sensorer Hemvärn 2025: CIM/PIR/KAMERA/UMRA + Larmmina + RPAS + poster + sensorområden, auto-numrering C/P/K/U/L, riktningslinjer, sensorprotokoll-export, mini-skola lökprincipen) |
| **RAMSOR** | Minnesramsor & akronymer (METHANE, SAFE, C-ABCDE, 4B, AT-MIST, 9-LINE MEDEVAC m.fl., roll-filtrerat) |
| **TCCC** | Tactical Combat Casualty Care — utbildningsmaterial om stridsskadad sjukvård (faser CUF/TFC/TACEVAC, MARCH-PAWS, fördjupningar). Inte avsett för skarpt läge — för träning och repetition. |

## Teknisk Arkitektur
Applikationen är byggd som en "Modern Vanilla" webbapplikation med ren HTML5, CSS3 och JavaScript (ES6). Den använder inga tunga bibliotek eller ramverk för att säkerställa extremt snabb uppstart och minimal batteriförbrukning på mobila enheter. Service Workers hanterar cachning för offline-bruk.

## Säkerhet och integritet (tekniska detaljer)

För dig som vill förstå exakt vad appen gör med data, var den ligger och vilka risker som finns kvar. Mer om "Glöm enheten"-knappen och vad den *inte* räcker till finns på [opsec-sidan](https://7srapport.com/opsec.html).

### Vad skickas till externa servrar

| Tab / funktion | Externt anrop | Vad skickas | Mottagaren ser |
|---|---|---|---|
| MINKARTA, SENSORSKISS, 7S, A-H, SCRIM, WHAT, WEFT, OBSLÖSA — vanlig karta | OpenTopoMap / OpenStreetMap tile-servers | z/x/y per kart-tile | IP + ungefärligt visat område |
| MINKARTA, SENSORSKISS, 7S, A-H, SCRIM, WHAT, WEFT, OBSLÖSA — *Härdat läge* | Cloudflare R2 (engångs-nedladdning, sker via Min Karta) | range-requests mot `sverige.pmtiles` | IP + att du laddar ner Sverige-paketet en gång |
| MINKARTA, SENSORSKISS — *Topografi-overlay (online-fallback)* | OpenTopoMap (opt-in, varning visas) | z/x/y per kart-tile | IP + ungefärligt visat område |
| Adress-/UPK-uppslag (kartmodal i 7S/SCRIM/WEFT/A-H/OBSLÖSA + UPK i MINKARTA) | Nominatim (OSM) | klickad lat/lon | IP + koordinat |
| VÄDER | Nominatim, Open-Meteo, SMHI autocomplete | ortnamn → koordinat → prognosanrop | IP + ort/position |
| Övriga formulär (7S, WHAT, SCRIM, WEFT, A-H, OBSLÖSA, FORS, PEDARS, SCHEMA, EOBUSARE, OBO, RASSOIKA) | inga | — | — |
| Egna ritningar, sparade utkast, sensor-/minpositioner, formulärtext | aldrig | — | — |

Allt rapport- och kartritningsmaterial stannar lokalt på enheten. Inga koordinater eller ifyllda fält skickas till någon backend (det finns ingen backend).

### Lokal lagring

Allt du ritar, sparar och konfigurerar bor i:

- **localStorage** — slider-state, sparade offline-områden, PMTiles-inställningar, TNR-format, formulärutkast, autocompletion-listor
- **IndexedDB** — ritningar i MINKARTA och SENSORSKISS
- **Cache API** — Service Workerns offline-bundle (HTML/JS/CSS/fonter), nedladdade kart-tiles (`hv-offline-tiles-v1`), Sverige-PMTiles-paketet (flera GB om Härdat läge använts)

Allt rensas av "Glöm enheten" på [opsec.html](https://7srapport.com/opsec.html). Webbläsarens egen HTTP-cache, browser history och OS-nivå spår kvarstår — se opsec-sidan för scenarier som kräver mer (överlämning, beslagtagen enhet).

### Härdat läge

Härdat läge byter ut OSM/OpenTopoMap mot ett lokalt PMTiles-paket av Sverige (~4 GB, z 0–15). När det är på görs **noll utgående tile-requests** under kart-användning. Pre-download via streaming så mobil-RAM räcker, cache invalideras automatiskt om paketet byts.

Toggle finns i kart-modalen på **alla rapportfiler med karta** (7S, A-H, SCRIM, WHAT, WEFT, OBSLÖSA) plus MINKARTA och SENSORSKISS. State delas mellan sidor — slå på i en, är redan på i nästa. Nedladdning sker bara via Min Karta-sidan; rapportsidor varnar om läget aktiveras utan pre-cachad fil (då hämtas tiles on-demand från R2 och första requesten syns där).

**Kvarvarande risker:**
- Första nedladdningen sker från Cloudflare R2 — hostingen ser din IP och att du laddar ner Sverige-paketet en gång
- För filer >256 MB hoppas SHA-256-verifiering över (mobil-RAM-hänsyn) — TLS + ETag används istället. Svagare än full hash, men praktiskt nödvändigt på mobil
- VÄDER-fliken anropar externa servrar (Nominatim, Open-Meteo, SMHI) oavsett om Härdat läge är på

### Innehållsleverantörer som tagits bort

- ~~jsDelivr CDN (Leaflet)~~ — nu lokalt i `vendor/leaflet/`
- ~~unpkg CDN (exifr)~~ — nu lokalt i `vendor/exifr/`
- ~~Tesseract.js OCR~~ — borttaget 2026-04-09 (fungerade inte tillförlitligt)
- ~~MGRS/GPS-knapp i VÄDER~~ — läckte position, borttagen 2026-05-03
- ~~Passiva geolocation-prompts vid kartmodal-öppning~~ — borttagna 2026-04-30 i 7S, A-H, SCRIM, WHAT, WEFT, OBSLÖSA

### CSP — status

Strikt `default-src 'self'` med explicit `connect-src` är på plats på `opsec.html`. Övriga 14 sidor har fortfarande den bredare originalvarianten med `upgrade-insecure-requests`. Att rulla ut strikt CSP brett är på roadmappen ([audit/roadmap.md](audit/roadmap.md) Sväng 1.2). XML-escape i CoT-export, OPSEC-formulär-sweep (`autocomplete=off`, `spellcheck=false`, `data-1p-ignore`), referrer-policy `strict-origin` och `notranslate` är gjorda.

### Threat model

| Skyddar mot | Skyddar inte mot |
|---|---|
| Passiv tile-server-loggning av varje fält-användning (via Härdat läge) | Aktiv adversary med endpoint-access (rotad mobil, MitM på TLS via egen CA) |
| Tredjeparts-CDN-loggning vid sidladdning | Beslagtagen enhet med forensiska verktyg (Cellebrite, GrayKey) |
| Auto-prompts som läcker GPS / lägger position i extern logg | Användarfel ("råkar" skicka skarp data via VÄDER) |
| Att en sajt-besökare ser annan användares ritningar (det finns ingen sådan delning) | OS-nivå spår: kameraroll, swap-fil, app-switcher-thumbnails |
| Supply-chain-attack via CDN (vendor/-mapp + integritetshashar) | Felaktig hantering: skärmdump som delas vidare, screenshot-via-iCloud-backup |
| Password manager / autofill som sparar taktisk text (`opsec.js`) | Felaktig OPSEC-hygien: appen installerad på samma enhet som personlig användning |

För fältdrift: Härdat läge + offline-cache + "Glöm enheten" före/efter känsliga moment + manuell webbläsar-rensning vid överlämning. För beslagtagen-scenariot: fabriksåterställning av enheten är det enda som närmar sig garanti — appens "Glöm enheten" är ett bidrag, inte en garanti.

## Licens
Detta projekt är licensierat under **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International** (CC BY-NC-SA 4.0).

Se [LICENSE](LICENSE) för fullständig licenstext.

---

## Dagbok: Utvecklingslogg

### 2026-05-12: Reorder inom kolumn + FLIP-animation (v0.8)
Bygger vidare på v0.7. Items kan nu dras både mellan och inom kolumner
i `tavla.html`. Andra items glider undan smidigt när något flyttas.

* **Drop-target på item-nivå:** drop kan landa på ett specifikt item och
  positioneras `before`/`after` baserat på muspos relativ till items
  mittpunkt. Visuell drop-indikator (accentfärgad streck-linje) ovan
  eller under target-itemet.
* **Manuell prio-ordning persisterad i Cloudflare KV.** Worker-endpoint
  `POST /reorder { column, orderedNumbers }` skriver ordning per
  kolumn till KV-namespace bunden som `KANBAN_KV`. `GET /issues`
  berikar varje item med `position`-fält från KV. Frontend sorterar
  efter `position` (lägre först), items utan position hamnar sist
  sorterade på `updated_at`.
* **FLIP-animation i render():** mäter bounding rect för alla items
  före rebuild, mäter igen efter, applicerar reverse-translate, sen
  släpps via `requestAnimationFrame` så CSS-transition animerar till
  slutposition. Funkar för både reorder inom kolumn och flytt mellan
  kolumner.
* **Refaktorerad sorter:** `sortColumnItems(list)` är delad mellan
  render och `dropOnItem` — säkerställer att ny ordning byggs från
  exakt samma vy som visas.
* **Optimistic UI med rollback:** klient uppdaterar lokal state direkt
  vid drop, server-anrop går i bakgrunden. Vid fel: rollback + load()
  från servern.

**Att göra på din sida (manuellt) för att aktivera v0.8:**
1. Cloudflare → Storage & Databases → KV → skapa namespace
   `kanban-state` (eller annat namn).
2. Worker → Settings → Variables and Secrets → KV Namespace Bindings →
   `KANBAN_KV` ↦ `kanban-state`.
3. Re-deploya Workern med senaste `tipsa-worker.js`.

Tills steg 1–3 är gjorda fungerar tavlan som tidigare — bara reorder-
funktionen ger felmeddelande tills bindingen är på plats.

### 2026-05-12: Drag-and-drop på kanban-tavlan (v0.7)
Items i `tavla.html` kan nu dras direkt mellan kolumner — desktop-only
i denna iteration. Modal-knapparna är kvar som alternativ väg och som
fallback för touch-användare.

* **HTML5 Drag-and-Drop API** — native, inga nya beroenden. `draggable=true`
  på item-divet, `dragstart/dragend` hanterar drag-state, `dragover/drop`
  på `.col-body`-elementen hanterar drop-zone.
* **Optimistic UI:** Item flyttas direkt i UI:t när drop sker, server-anrop
  går i bakgrunden. Vid fel (403, nätverk, etc.) rollback till tidigare
  state och felmeddelande visas.
* **Refaktor:** Ny `executeMove(number, target, oldColumn)` är delad
  kärnlogik för både modal-knapp-flytt (med confirm-dialog) och drag-drop
  (utan confirm — drop är intentful nog).
* **Visuell feedback:** Item dimmas vid drag (`opacity: 0.4`), drop-zon
  highlightas med streckad accent-färg och svag bakgrundston när hovrad.
* **Touch-stöd skjutet till v0.8** — HTML5 D&D fungerar inte på touch.
  Touch-användare använder modal-knappar tills vidare.

Ingen Worker- eller deploy-action behövs — befintlig `POST /move`-endpoint
används som tidigare.

### 2026-05-12: Pin-spärr på `tipsa.html` och `tavla.html` (v0.6)
Bygger vidare på v0.4/v0.5 — sidorna är fortfarande tekniskt nåbara via
direkta URL:er, men en **pin-wall** låser innehållet tills användaren
matat in en kod som BARA finns som secret i Workern (ej i kod, ej i repo).

* **Ny Worker-endpoint `POST /auth`** — testar pin utan side-effects.
  Används av sidorna för pin-wall-validering.
* **Ny Worker-secret `ACCESS_PIN`** — den faktiska åtkomstkoden. Joel
  sätter den i Cloudflare Workers UI (eller via `wrangler secret put`).
  Backward-compat: om `ACCESS_PIN` saknas faller Workern tillbaka till
  `FORM_SECRET` så befintlig v0.4-deploy fortsätter fungera under
  migrationen.
* **Pin-wall i `tipsa.html` och `tavla.html`** — sidans riktiga innehåll
  döljs tills användaren matat in rätt kod. Pin lagras i `sessionStorage`
  och försvinner när browser-fliken stängs. Vid 403 från Workern (t.ex.
  pin har roterats) tvingas pin-wall fram igen.
* **`FORM_SECRET` är borttagen ur sidornas kod** — användaren matar in
  pin, vi har ingen hardcoded hemlighet i sidans källkod (som tidigare
  var synlig i `tipsa.html`-historiken).
* **Rotering:** Joel kan när som helst byta `ACCESS_PIN`-secret i
  Workern. Inga commits eller deploys av sidan krävs — bara att nya
  pinen delas med mottagarna.

**Att göra på din sida (manuellt) för att aktivera v0.6:**
1. Lägg till `ACCESS_PIN` som secret i Cloudflare (välj något lätt att
   uttala/skriva, t.ex. `gron-mossa-77`).
2. Re-deploya Workern med nya `tipsa-worker.js`.
3. Dela `ACCESS_PIN` med de utvalda mottagarna via Signal eller
   liknande privat kanal.

### 2026-05-12: Privat kanban-tavla via samma Worker (v0.5)
Bygger vidare på v0.4-modellen — samma Cloudflare Worker, samma
`FORM_SECRET`, samma "hemlig URL"-mekanism, men nu också en kanban-vy.

* **Ny hemlig sida `tavla.html`** — fyra kolumner (Önskat / Kommer snart
  / Pågår / Klart). Listar öppna GitHub Issues + senaste closed.
  Klick på item → modal med titel, beskrivning, taggar + flytta-knappar
  + länk till GitHub. Klick på flytta → GitHub-Issue uppdateras
  automatiskt (status-label sätts/tas bort, eller open/close togglas).
  Inte länkad någonstans, märkt `noindex,nofollow`, inte i SW-cachen.
* **Worker utökad** med två nya endpoints:
  - `GET /issues` — listar Issues för tavlan (skyddat av `FORM_SECRET`
    via `Authorization: Bearer`-header)
  - `POST /move` — flyttar Issue mellan kolumner. Mappning: open utan
    `status:*` → Önskat · open + `status:soon` → Kommer snart · open +
    `status:inprogress` → Pågår · closed → Klart.
* **PR:s filtreras bort** automatiskt (GitHub Issues-API blandar
  Issues och PRs i samma endpoint).
* Worker hanterar `status:*`-label-creation automatiskt — inga manuella
  labels behöver skapas i GitHub i förväg.
* **SETUP.md uppdaterad** med kanban-instruktioner + steg för att
  re-deploya Workern efter kod-ändringar.

**Att göra på din sida (manuellt):**
1. Re-deploya Workern i Cloudflare (klistra in nya `tipsa-worker.js`)
2. Uppdatera `tavla.html` med samma `WORKER_URL` + `FORM_SECRET` som
   `tipsa.html` redan har

### 2026-05-12: Privat tipsa-ingång via Cloudflare Worker (v0.4)
Ny ej-publik formulärsida `tipsa.html` för utvalda mottagare som inte vill
eller kan använda GitHub. Sidan är inte länkad från någon annan del av
appen, ligger inte i tab-nav, inte i Om-sektionen, och är märkt
`noindex,nofollow` så den inte fastnar i sökmotorer. URL:en delas
manuellt med dem som ska få bidra.

Tekniskt: formuläret POSTar till en separat Cloudflare Worker
(`verktyg/tipsa-worker/`) som validerar Origin + delad hemlighet och
skapar en GitHub Issue automatiskt via GitHub API. Användaren behöver
ingen e-postklient och inget GitHub-konto. Workers-koden, wrangler.toml
och SETUP.md ligger i `verktyg/tipsa-worker/`.

**Workern kräver en engångs-konfiguration** (GitHub PAT, FORM_SECRET,
ALLOWED_ORIGIN, GITHUB_REPO) — se `verktyg/tipsa-worker/SETUP.md` för
stegen. Tills den är deploy:ad och `tipsa.html` har uppdaterade
WORKER_URL + FORM_SECRET visar sidan "Sidan är inte fullt konfigurerad
än — kontakta den som gav dig länken."

`tipsa.html` ingår **inte** i service workerns precache (FILES) —
medvetet, eftersom sidan inte är avsedd för offline-bruk och vi inte vill
att den seedas i alla användares enheter.

### 2026-05-12: In-app roadmap (v0.3)
Ny sida `roadmap.html` länkad från Om-sektionen — kanban-vy med fyra
kolumner (Önskat / Kommer snart / Pågår / Klart). Användare som inte är
på GitHub kan ändå se vad som är på gång utan att klicka sig till repo:t.

*   **`roadmap-data.js`:** manuellt uppdaterad datakälla. Varje item har
    `column`, `title`, `desc`, valfria `tags[]` och `date`. Initialt
    innehåll: v0.1/v0.2/v0.3 i Klart, GrpC/PlutC i Pågår, 1227-fulltabell
    + RA1444-detalj i Kommer snart, Förare-ramsor + TOS i Önskat.
*   **Önska funktion-knapp:** återanvänder feedback-länkens GitHub Issues-
    template med pre-fylld titel `[Roadmap-önskan]`. Inkonsekvent med
    "ingen GitHub-integration"-idén, men feedback-länken finns redan och
    det vore förvirrande att uppfinna en konkurrerande kanal.
*   **Footer-Om-sektion:** ny sektion "ROADMAP & ÖNSKEMÅL" placerad före
    "LICENS & KÄLLKOD".
*   `service-worker.js` `CACHE` bumpat, `roadmap.html` + `roadmap-data.js`
    tillagda i FILES.

### 2026-05-12: Ramsor-flik (v0.2)
Ny tab `ramsor.html` för minnesramsor och akronymer. Roll-vald vy som default-
filter, sök som filtrerar oavsett vald roll, "Övriga ramsor"-expander för det
som ligger utanför vald roll.

*   **Datamodell:** `ramsor-data.js` med `roles[]`, `placeholders` och
    `ramsor[]`. Varje ramsa har `lines[]` (bokstav-för-bokstav), `usage`-
    fritext, `tags[]` (kategori-baserade, deskriptiva — INGEN
    auktoritets-signal) och `roles[]` för vilka roller den dyker upp för.
*   **Innehåll v0.2:**
    *   **Sjv (6 ramsor):** METHANE, SAFE, C-ABCDE, 4B, AT-MIST, 9-LINE MEDEVAC —
        alla välkända internationellt etablerade strukturer inom prehospital
        vård / NATO-doktrin. 4B är skadesvep under lilla c, AT-MIST är den
        variant av MIST som lärs ut på TOS/TCCC idag (Age + Time of injury).
    *   **Sig (3 ramsor):** Talgruppsbyte (allmän procedur),
        RA 1444-handhavande (kort intro), 1227-tabell (kort intro + flagg
        att fulltabell läggs in senare).
    *   **GrpC, PlutC, Förare:** Placeholders med klartext "Innehåll håller
        på att samlas in" + uppmaning att höra av sig. Inget felaktigt
        innehåll uppfunnet utan säker referens.
    *   **TOS** lämnad helt — markör i koden tills användaren preciserar
        vad som avses.
*   **RAMSOR-tab i tab-nav-sub** tillagd på alla 19 sidor som har
    `tab-nav-sub`. Sidor som ännu inte fått MÅTT-fliken får RAMSOR efter
    SKYTTE (existerande inkonsekvens i tab-nav lämnas till framtida
    städning).
*   **Språk-sweep (Paket D, fortsättning):** `matt.html` mjukad —
    "Försvarsmakten · Västra militärregionen" → "hjälpverktyg" /
    "Hjälpverktyg för FM-blankett" så headern inte ger sken av officiell
    FM-anknytning.
*   `service-worker.js` `CACHE` bumpat, `ramsor.html` + `ramsor-data.js`
    tillagda i FILES.

**Avvikelse från roadmap:** GrpC + PlutC-ramsor levereras som placeholders
i v0.2 istället för fyllt innehåll. Skäl: utan synlig SoldF-källa i UI:t
och utan säker FM-publikation att luta sig på är risk för felaktigt
innehåll större än värdet av snabb leverans. Innehåll fylls på i v0.2.x
allt eftersom säkra referenser kan verifieras.

### 2026-05-12: Positionering & Mina data (v0.1)
Två fundament-paket levererade tillsammans inför kommande ramsor-flik och
in-app roadmap (se `roadmap-positionering-ramsor.md` lokalt).

*   **Positionering (Paket D):** Tydlig disclaimer i `footer.js` (sprids till
    alla 14+ formulär via existerande mönster), synlig disclaimer-rad under
    rubriken på `index.html`, README-rubriken kompletterad med samma text.
    Allt språk som kan antyda FM-fastställd status mjukas — "för Hemvärnet"
    → "riktat till hemvärnssoldater" i README och i Om-sektionens
    OM 7S RAPPORT-stycke. Innehåll och funktioner förblir intakta.
*   **Mina data (Paket B):** Ny sida `data.html` länkad från Om-sektionen
    (rubriken MINA DATA & SÄKERHETSKOPIA). Fyra sektioner:
    *Var ligger mina data?* (klargör att inget skickas någonstans, inkl.
    GitHub), *Plattformsmatris* (iPhone/Android/Mac/PC + ITP-caveat),
    *Säkerhetskopia (export & import)* med JSON-fil som dumpar både
    localStorage och de två kända IndexedDB:erna (`minkarta` + `sensorskiss`,
    båda `state`-store), samt *Källkod (för utvecklare)* explicit separerad
    från användardatat.
*   **iOS-ITP-notis:** Engångsbanner i `footer.js` som visas för iOS-
    användare som varit borta >5 dagar — länkar till `data.html` för
    säkerhetskopia. Dismissbar per session.
*   `service-worker.js` `CACHE` bumpat till `hv-20260512_v01_disclaimer`,
    `data.html` tillagd i FILES.

### 2026-05-05: Härdat läge per grannland (DK/NO/FI/EE/LV/LT)
Nya snabbknappar i `minkarta.html` som aktiverar **Härdat läge** för
respektive grannland — exakt samma flöde som existerande
`sverige.pmtiles`, bara med en pmtiles-fil per land.

* **Initialt försök** (samma dag, commit `f2b623c`) byggde en
  tile-cache-modal med zoom-sliders och "Andra länder ▾"-expander.
  **Ändrades efter feedback** till PMTiles-flödet — operatören vill
  inte välja zoom-nivåer, hen vill ladda ner hela landet som med
  Sverige. "Andra länder"-funktionen togs bort helt.
* **Klick på landknapp** → byter Härdat läge till det landets
  pmtiles-fil + pannar kartan till landets center + erbjuder befintlig
  "Ladda ner offline"-knapp (samma som för Sverige). Klick på samma
  land igen stänger av Härdat läge.
* **Ny modul** [countries.js](countries.js) med pmtiles-presets per
  land: bbox (för bygg-pipelinen) + center+zoom (för pan) + url/bytes/
  sha256 (placeholders tills filerna byggts).
* **Bygg-doc** [verktyg/build-grannlander-pmtiles.md](verktyg/build-grannlander-pmtiles.md)
  med `pmtiles extract --bbox=…` per land mot Protomaps daily build —
  samma pipeline som [audit/pmtiles-build.md](audit/pmtiles-build.md).
  Filerna laddas upp till samma R2-bucket som `sverige.pmtiles`.
* **`pmtiles-layer.js`** uppdaterad med
  `getExpectedBytesForUrl(url)` som slår upp content-length per land
  via `HVCountries.pmtilesPresets`. Storlekskontrollen som invaliderar
  gamla cachade versioner fungerar nu för alla länder, inte bara Sverige.
* **`offline-tiles.js`** — tile-cache-modalen är **oförändrad** för
  "Spara område offline" (svensk flöde). Bara `openCountryPicker` +
  `removeAllAreas` borttagna eftersom fel design för grannländer.
* **Återstår (manuellt):** Bygga + ladda upp 6 pmtiles-filer (DK ~200 MB,
  NO ~800 MB, FI ~600 MB, EE/LV/LT ~300 MB var). Knapparna är disabled
  med tooltip mot build-doc tills `url + bytes` fyllts i per land.

### 2026-05-05: Topografi-overlay (Fas 1)
Ny knapp **Topografi** i `minkarta.html` + `sensorskiss.html` som lägger
en separat tile-/raster-layer ovanpå basemap för höjdkurvor / hillshade.
Datakälla utbytbar via [topo-overlay.js](topo-overlay.js): pmtiles-raster
för offline-vänlig drift, online tile-template som snabb fallback.

* **MVP-fallback:** OpenTopoMap online-overlay (opacity 0.55) med
  opt-in OPSEC-varning. Aktiverad i Härdat läge varnar extra hårt
  eftersom det skickar tile-requests till tile.opentopomap.org.
* **Demo:** Mt Whitney USGS WebP-PMTiles (1.9 MB, publik) — låter
  mekanismen testas direkt. Aktivera via console:
  `MK_TOPO.setSource('mt-whitney-demo')`.
* **Fas 2 (vänter):** `sverige-hillshade.pmtiles` byggd från Copernicus
  DEM GLO-30 (CC-BY 4.0). Pipeline: [verktyg/build-sverige-hillshade.md](verktyg/build-sverige-hillshade.md).
  När filen är uppladdad till R2: avkommentera `'sverige-hillshade'` i
  `topo-overlay.js` och byt `DEFAULT_SOURCE_ID`.
* **Säker default:** PMTiles-header inte läsbar → tyst fallback,
  ingen krasch. State sparas i localStorage per källa.
* Service Worker `CACHE` bumpad till `hv-20260505_topo_overlay_1`,
  `topo-overlay.js` tillagd i FILES. Roadmap:
  [audit/roadmap-topografi.md](audit/roadmap-topografi.md).

### 2026-05-05: Bakgrundsnedladdning över sid-navigering
Tile-download (`hv-offline-tiles-v1`) och PMTiles-prefetch
(`hv-pmtiles-v1`) flyttades från page-scope till Service Worker. En
nedladdning som startas i `minkarta.html` fortsätter köras när
användaren navigerar till `sensorskiss.html`, `index.html` (7S) eller
någon av rapportfilerna — pille:n längst ner-höger följer med och visar
levande progress på alla sidor som inkluderar `offline-tiles.js`.
PMTiles-prefetch dedupar på URL i SW så två flikar inte dubbelfetchar
samma 4 GB-fil. Resume-toast visas vid första pageload efter att alla
flikar varit stängda mid-download. Fallback till in-page-loop om SW
saknas. Detaljer: `audit/roadmap-bakgrundsnedladdning.md` + `session-6.md`.

### 2026-04-29: SENSORSKISS v1 — ny tab för sensoruppsättning
Sju-fas-implementation (roadmap: `roadmap-sensorskiss-v1.md`). Ny tab
`sensorskiss.html` parallellt med MINKARTA, baserad på samma Leaflet-stack
men med sensor-symboler från Utbildningsanvisning sensorer Hemvärn 2025
(FM2025-8701:1) sid 72.

* **Skelett** (FAS 2): `sensorskiss.html` med MGRS-sökruta, OTM/OSM hybrid-
  kartlager och tab-nav-länk SENSORSKISS lagd till alla 14 sub-nav-sidor.
* **Symbolbibliotek** (FAS 3): 10 SVG-baserade sensorsymboler i
  `sensorskiss-symbols.js` — CIM, PIR, KAMERA, UMRA (markbundna),
  Larmmina, RPAS, Enkelpost, Dubbelpost/patrull, In/Utfartspost,
  Sensorområde. Bokstavsprefixen C/P/K/U/L följer JL.pdf.
* **Ritning + edit** (FAS 4): klick-placering med auto-numrering
  (C1, C2, P1, …), drag, edit-popup med riktnings-slider 0–360°,
  streckad riktningslinje, polygon-ritning för Sensorområde,
  IndexedDB-persistens och undo/redo.
* **Beslutsstödsplan + protokoll-export** (FAS 5): tabell-panel enligt
  PDF s. 71 fig 48 (BT, Händelse, Handlingsalternativ, Beslutstidpunkt,
  Infobehov, Inhämtning av) sparas i localStorage. Sensorprotokoll
  auto-genererar text + PNG-karta (`sensorskiss-export.js`) och
  delar via `navigator.share`.
* **Mini-skola** (FAS 6): `sensorskiss-tutorial.js`/`.css` med 3 steg
  (Välkommen, Sensortyper, Lökprincipen + Beslutsstödsplan).
* **Polish** (FAS 7): service-worker `CACHE` bumpat till
  `hv-20260429_sensorskissv1`, `FILES` utökad med 5 nya entries,
  README uppdaterad med SENSORSKISS-rad och denna dagboksentry.

### 2026-04-26: MINKARTA v4 — nya SVG-symboler + dela-med-karta
Sex-fas-iteration på MINKARTA (roadmap: `roadmap-minkarta-v4.md`). v3-
grunden med svarta reglementstecken och UPK-numrering ligger kvar; v4 är
en visuell och interaktionsmässig finputs som byter ut själva symbol-
renderingen mot ett nytt SVG-paket från staben och förenklar dela-flödet.

*   **Nya SVG-symboler (FAS 1):** 20 reglementstecken från
    `stab/Ny mapp (2)/` ersätter v3:s inline-SVG:er. Filnamn städas:
    `" (N)"`-suffix bort, `_` → space. Ny nyckel `forst_forb_sakrad`
    (Förberedd förstöring, säkrad) som eget reglementsbegrepp —
    skiljer passage-möjlig säkring från rå förberedd förstöring.
    Sju v3-nycklar tas bort (`strv_full`, `strv_rojskydd`, `trad`,
    `avstand`, `skenminering`, `landmina_okand`, `riktad_verkan`) —
    ingen motsvarighet i nya paketet. Migration i `loadPersisted()`
    filtrerar bort gamla typer i IndexedDB-state och visar en toast
    så användaren ser vad som hände. Palett-bakgrunden vitnas så de
    svarta symbolerna syns tydligt.
*   **Jumbo-symboler i PNG (FAS 2):** `renderExportAsync()` skalar upp
    point/meta-symbolerna 4× (34→136 px) i exporten. Namn-brickan,
    linje-/polygon-strokes och polygon-etiketterna skalas
    proportionellt (`drawNameBadge` får en `scale`-parameter). Texten
    "UPK 594", "HIND" osv. blir läsbar utan inzoom när mottagaren
    öppnar PNG:n i Signal. Skärmvisningen är oförändrad.
*   **Genvägsrad under kartan (FAS 3):** `.palette-layers` (Namn-
    etiketter-toggle) och Pan-läge-knappen flyttas ut ur paletten till
    en ny `.map-controls`-rad direkt under `.map-wrap`, ovanför paletten.
    De mest frekventa UI-kontrollerna är nu åtkomliga utan scroll.
    Ångra/Gör om/Exportera/Rensa ligger kvar i palette-toolbaren.
*   **Utökad Rensa (FAS 4):** "Rensa allt" nollställer nu även hela
    protokoll-panelen — `#pNr`, `#pAmbition`, `#pForband`, `#pChef`,
    `#pTnr`, `#pRojskydd`, `#pUp`, `#pNote`, `#pOut`, `#pShare`,
    `#pUpWarn`. Auto-TNR prefillas om med ny Zulu-kort, badge visas
    igen. PNG-cachen `_lastExport` rensas. Dubbel-bekräftelsen bevaras.
*   **Dela protokoll (FAS 5):** `showAttachMapModal`-dialogen
    elimineras (död kod, CSS och funktioner borttagna). "Kopiera till
    urklipp" döps om till "Dela protokoll" och blir accent-grön. Klick
    genererar alltid PNG + försöker `navigator.share({files, text})`.
    Fallback: clipboard + PNG-download + toast
    "Text kopierad. PNG nedladdad — bifoga manuellt i Signal."
*   **Polish (FAS 6):** `service-worker.js` CACHE bumpat stegvis
    `_1` → `_6`, slutar på `hv-20260426_minkartav4_6`. README:s
    MINKARTA-rad uppdaterad. Manuell test-matris körd.

### 2026-04-25: MINKARTA v3 — svarta reglementstecken + UPK-numrering
Sex-fas-iteration på MINKARTA (roadmap: `roadmap-minkarta-v3.md`).
Härdar reglementstroheten i två riktningar: symbolerna ritas nu i svenskt
militärt manér med svart linjearbete mot vit bakgrund, och
utgångspunkterna byter namn till UPK med stabila slumpnummer 001–999
istället för sekventiella UP1..UPn.

*   **Svarta reglementstecken (FAS 1):** Alla MK_SYMBOLS omritade till
    svart linjearbete + vit fyllning. Halo-principen inverterad: 3 px
    vit korona via `paint-order="stroke"` ersätter v2:s svarta halo.
    Yttre `filter: drop-shadow` på `.mk-icon svg` byggd som vit aura +
    mjuk mörk kant för läsbarhet mot både grönska, vatten och ljusa
    OSM-tiles (z 18–19). Utförd förstöring (`forst_utf`) är enda
    symbolen som behåller röd accent — det speglar reglementets eget
    exempel. Ny färgmatris dokumenterad i `minkarta-symbols.js`.
    Polygon-/linje-halon i canvas-exporten inverterad till vit bred
    stroke under svart linjearbete.
*   **Saknade beteckningar (FAS 2):** Sex nya reglementstecken:
    `landmina_okand` (tom cirkel, ospecificerad mina), `prov_rojskydd`
    (provisoriskt fordonsröjningsskydd — punkter + vikning),
    `rojskydd` (egen R-symbol), `verkansomrade` (streckad halvcirkel),
    `omr_verkan` (områdesverkande mina med W-hake), `riktad_verkan`
    (cirkel + pil). Varje symbol har en designbeslutskommentar som
    dokumenterar tolkningen. Ny palett-grupp "Övriga landminor".
*   **UPK-numrering (FAS 3):** UP-markören byter namn till UPK
    (Utgångs-Punkt-Koordinat). Vid placering slumpas ett heltal
    1–999, paddas till 3 siffror, unikhet kontrolleras via ett Set.
    Etiketten under markören blir "UPK 594". Numret är **stabilt**
    — en gång slumpat, aldrig renumrerat. Raderas en UPK försvinner
    dess rad; övriga behåller sina nummer. Gamla v2-sessioner
    migreras automatiskt vid `loadPersisted`: `typ: 'up'` → `typ:
    'upk'` + tilldelat slumpnummer.
*   **Redigeringspopup (FAS 4):** Klick på UPK-markör öppnar
    `openEditPopup()` med ett UPK-nummer-fält (siffror, 1–3 tecken,
    padstart till 3). Vid Save: validering 1..999, kollisionscheck
    mot övriga UPK:er, inline-hint blir röd vid fel. SP-referenser
    och pUp-textarean uppdateras direkt vid nummerändring.
*   **SP-referenser (FAS 5):** Alla SP-rader refererar nu "från UPK
    594" istället för "från UP1". `pUp`-textarean skriver "UPK 594:
    MGRS — adress"-format. Reglementsvarningen räknar objekt i state
    istället för rader i textarean och kräver "minst 2 UPK och 1
    SP". Den konkurrerande textbaserade varningen i
    `attachProtocolActions` borttagen — `syncUpTextarea` är nu enda
    källan.
*   **Polish (FAS 6):** `service-worker.js` CACHE bumpat stegvis
    `_1` → `_6`, slutar på `hv-20260425_minkartav3_6`. README:s
    MINKARTA-rad i funktionstabellen uppdaterad. Manuell test-matris
    körd i Chrome desktop + Android Chrome. DevTools Network visar
    bara tile-URL:er + `/reverse` för UPK-adresser — inga
    minsymbolpositioner skickas ut.

### 2026-04-24: MINKARTA v2 — halo-kontrast, UP/SP, datalista, share-popover
Tio-fas-iteration på MINKARTA (roadmap: `roadmap-minkarta-v2.md`). Flyttar
tabben från BETA mot stabil. Ingen förändring i integritetskontraktet utöver
tydlig not om OSM-fallback och UP-reverse-geocode.

*   **Djupare zoom (FAS 1):** Hybrid-lager växlar automatiskt till
    OpenStreetMap Standard vid z 18–19 där OpenTopoMap inte har data.
    Status-raden visar `z 18 — OSM Standard` etc. Exporten följer med.
*   **Kontraststark färgpalett (FAS 2):** Halo-princip via SVG
    `paint-order="stroke"` + 3 px mörk outline + dubbla `drop-shadow`-
    filter på marker-ikonen. Huvudfärger: gul `#ffc107` (neutral), röd
    `#e53935` (farligt), cyan `#00e5ff` (styr/referens), grå `#b0bec5`
    (sken). Läses mot vita vägar, gröna skogsytor och blå vattendrag.
    Färgmatris dokumenterad i `minkarta-symbols.js`.
*   **Saknade symboler (FAS 3):** `avstand_tramp` (avståndslagd trampmin.)
    och `avstand_strv` (avståndslagd strvmin.) som streckade polygoner
    med inbäddad mintyp-preview. Egen grupp "Avståndslagda".
*   **Namn-etiketter (FAS 4):** Kompakt svart bricka med vit text under
    varje punkt/meta-symbol. Togglas via ny "Lager"-ruta i paletten
    (`[✓] Namn-etiketter`). Persisteras till localStorage. PNG-export
    matchar pixel-exakt.
*   **Versaler + auto-TNR (FAS 5):** `Förband` och `Chef` tvingas till
    versaler via `oninput` + CSS `text-transform`. TNR prefillas med
    Zulu-kort DDHHMM (UTC, ej lokal tid — avviker från obslosa.setNow()).
    Liten *(auto)*-indikator släcks vid manuell ändring.
*   **UP/SP-verktyg (FAS 6):** Nya `UP-markör` och `SP-markör` i egen
    grupp. UP:er auto-numreras (UP1, UP2…) och reverse-geocodas via
    Nominatim. SP:er mäts automatiskt in mot närmaste UP med bäring + m.
    `pUp`-textarean synkroniseras icke-destruktivt: auto-rader på
    `UP<n>:`/`SP<n>:`-mönstret regenereras, allt annat bevaras. Drag,
    radering och omnumrering hanteras. Reglementsvarning ≥ 2 UP + ≥ 1 SP.
*   **Datalista i protokoll (FAS 7):** Ny sektion efter Anteckningar:
    `=== DATALISTA (fullständiga positioner) ===` med radbaserad tabell
    av idx, typ, MGRS (center för polygoner), etikett, anteckning.
    Togglas via kryssruta `[✓] Inkludera datalista`, default ON.
*   **Ladda ner / Dela-popover (FAS 8):** Exportera PNG visar nu en
    popover med två knappar (Ladda ner, Dela via app) istället för att
    dela direkt. Auto-stäng efter 8 s eller klick utanför.
    `shareBlob`/`downloadBlob` exporteras från `minkarta-export.js`.
*   **Bifoga karta vid delning (FAS 9):** Kopiera-knappen visar en modal
    "Bifoga kartbild?" med tre val. `Text + karta` försöker
    `navigator.share({files, text})` och faller tillbaka till
    clipboard-copy + PNG-download för browsers utan Web Share.
*   **Polish (FAS 10):** `service-worker.js` CACHE bumpat tio gånger
    (`_1` → `_10`) längs vägen, slutar på `hv-20260424_minkartav2_10`.
    README uppdaterad, BETA-markering finns kvar men fas-arbetet är
    klart. Manuell test-matris i Chrome desktop + Android Chrome.
    DevTools Network visar bara tile-URL:er (z/x/y) + Nominatim/Overpass
    för UP-markörer — inga minsymbol-koordinater någonsin.

### 2026-04-23: MINKARTA
Ny tabb för minläggningskartor med svenska militära kart-tecken för minor.

*   **Kart-skelett:** OpenTopoMap 1:50 000-skala, MGRS-sökfält med paste-extrahering (MGRS / lat,lon), status-rad med vy-MGRS + zoom.
*   **Symbolpalett:** Inline-SVG för 17 svenska minprotokoll-tecken (stridsvagnsminor med/utan röjskydd, trampmina, trådmina, larmmina, fordonsmina, sidverkande, försvarsladdning, avståndslagd R-spindel, förstöring förberedd/utförd/planlagd, minlinje, minruta, minerat område med HIND/FÖRDR/STÖR/AVST, skenminering, avspärrning, yttergränsmarkör).
*   **Ritning:** Placering, drag-flytta, long-press för ta bort, edit-popup för ambition/antal/anteckning, undo/redo (Ctrl+Z), autospar till IndexedDB var ~400 ms.
*   **PNG-export:** Bbox styrs av yttergränsmarkörer (fallback = alla objekt + 20 % padding). Canvas-komposition pixel-exakt från OpenTopoMap-tiles. Titel, fyra hörn-MGRS + center-MGRS, norrpil, skalstock, datum. Web Share API när tillgängligt, annars nedladdning.
*   **Minprotokoll-panel:** Mineringsnummer, ambition (300/600/900 strvmina/km), förband, chef, TNR, utgångspunkter med reglementsvarning vid <2 st, röjningsskydd, autoräkning av minantal och minlinjelängd → Signal-vänlig textgenerator + kopiera till urklipp.
*   **Spelläge SÄNKA MINOR:** Orange ÖVNING-banner, separat gameState, blind + facit PNG-export, budget i m², rollbyte A↔B. Ingen nätverks-sync — allt delas user-initiated via PNG.
*   **Integritet:** Inga minsymbolpositioner skickas någonsin ut. Enda utgående anrop är OpenTopoMap-tiles (z/x/y) och user-initiated adressökning.

### 2026-04-07 – 2026-04-09: Karta, Säkerhet & WEFT-drönare
Tre dagar med fokus på kartfunktioner, säkerhet och nya rapportverktyg.

*   **Reverse geocoding:** Kartval visar nu MGRS + gatuadress, stadsdel, gatukorsningar. Stöd för sjö- och önamn via Overpass API med Lantmäteriet ortnamn som fallback (49 781 poster). Spinner-indikator vid adressuppslag.
*   **HTTPS överallt:** Tvingad HTTPS-redirect i alla 13 formulär via `upgrade-insecure-requests` + JS-redirect.
*   **PWA install-banner:** Egen install-banner (12s auto-hide) med "Mer info"-panel som visar versionsinfo, säkerhetsinformation och länk till källkod. Offline-inforuta vid appstart i standalone-läge.
*   **Auto-extrahering:** Inklistrad text i Ställe-fältet tolkas automatiskt som MGRS eller lat/lon och konverteras.
*   **SRI & fonts:** Subresource Integrity-hashar på alla CDN-skript. Self-hosted Inter-font för offline-rendering.
*   **WEFT drönartyp-väljare:** Fyra klickbara MSB-siluetter (Deltawing, Fixed wing, Quad, Octo) som förifyller Wings/Tail. ASCII-siluett i genererad rapport. Terminologi korrigerad: "Raktvinge" → "Fast vinge".
*   **7S kompass:** Riktningsväljare i kors-mönster för Sysselsättning. Kombinationslogik (N+Ö → NÖ), motstående riktningar blockeras (N/S, Ö/V). Nya chips: Fortsätter post, Fortsätter patrull.
*   **Om-sektion:** Expanderbar footer med integritetsinformation (online/offline-anrop), fork-guide (tre steg), övningsrutin och varningstext. Länkar till OpenTopoMap, Nominatim, Overpass API och SMHI.
*   **OCR borttagen:** Tesseract.js-funktionen togs bort från alla 6 formulär — fungerade aldrig tillförlitligt.
*   **Bakgrunds-geocoding:** Adress uppdateras efter att kartmodalen stängts.
*   **Diverse:** Foto-filnamn i WHAT/SCRIM/WEFT/A-H, Hundförare i RASSOIKA, enhetligt radbryte i OBSLÖSA/POSTSCHEMA, TNR default kort format.

### 2026-04-03: Modernisering & Fältanpassning
En intensiv dag med fokus på UX-förbättringar och kryptologisk säkerhet.

*   **TNR-gränssnitt:** Implementerat ett animerat "slide"-reglage för TNR-format (Kort/Komplett) i samtliga 12 formulär. Inkluderar diskret ljudfeedback för taktil bekräftelse vid växling.
*   **Säkrad Lösendragning:** Uppdaterat **OBSLÖSA** och **RASSOIKA** med en ny algoritm för lösenordsgenerering.
    *   *Strikt tvåstaviga ord:* Rensat ut alla enstaviga ord för att minska risken för misshörning.
    *   *Vokalseparering:* Systemet säkerställer att Ord 1 och Ord 2 aldrig delar samma specialvokal (Å, Ä, Ö), vilket optimerar tydligheten i brusiga radiomiljöer (ex. undviker par som "Båtar & Sågar").
*   **OBO-optimering:** Tagit bort det redundanta fältet 'Plats' för att snabba upp inskrivningen för chefen.
*   **RASSOIKA-standard:** Slagit samman tidigare "Statuskvitto" och "Patrullorder" till en enda enhetlig, linjär R-A-S-S-O-I-K-A -utskrift som garanterar fullständig efterlevnad av checklistan.
*   **Layout & Läsbarhet:** Infört extra blankrader i rapportutskrifterna mellan Från-fält och TNR-fält i sju nyckelsystem för att matcha modern Signal-formatering.
*   **Roadmap-struktur:** Omfattande revidering av projektets roadmap för att möjliggöra effektivt samarbete mellan lokal agent och externa AI-modeller.
