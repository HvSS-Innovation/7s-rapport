# CHANGELOG

Kort milstolpslogg för utvecklingscykeln **Positionering / Ramsor / In-app roadmap**.
Detaljerade beskrivningar finns i README-dagboken.

## v0.3.1 — 2026-05-15 — Fyra nya decks på flashcards-engine: RA763, APP-6, FÖRKORT, FG

- **RA763** (`ra763.html`): 35 kort + 20 provfrågor — vredinställningar (SQL/VOL/RIT/MIC/RFPWR), menyer (MENY5/MENY6), uppstart-/bryt-sekvens, swALE-konfiguration (TX TUNE 500 ms, WAIT 2000 ms, ALE DETECTION etc.).
- **APP-6** (`app6.html`): 62 kort + 20 provfrågor — symbolens delar, affiliation/färg, ramformer per battle dimension, status (heldragen/streckad), förbandsstorlek (Ø/●●●/X/XX…), transportsätt, vanliga ikoner (luft/mark), text-placering. Komplement till befintliga MINKARTA.
- **FÖRKORT** (`forkort.html`): 147 kort + 25 provfrågor — Handbok Armé Begrepp 2016 i 8 kategorier (Befäl & rang, Förband & truppslag, Vapen & ammunition, Fordon & transport, Ledning & rapportering, Sjukvård & skydd, Samband & signalskydd, Stridsmiljö & taktik, Internationella & engelska). Urval av ~120 vanliga + tilläggsförkortningar.
- **FG** (`fg.html`): 41 kort + 25 provfrågor — farligt gods enligt ADR-S: klasser 1–9 + 2.1/2.2/2.3/4.1/4.2/4.3/5.1/5.2/6.1/6.2/7, åtgärder vid olycka, utrustningskrav på transportenheten, drivmedelsdunk (60 L-gränsen, A/B/C-krav, UN 1202/1203, Etikett nr 3), ansvarskoder A–F, godsdeklaration.
- **HTML-mall:** alla fyra sidor genererade från `sigskydd.html` via sed — identiska Kort-/Prov-/Referens-flikar, samma engine.
- **Tab-nav:** ny 5-länks-grupp (SIGSKYDD → RA763 → APP-6 → FÖRKORT → FG) tillagd på 27 sidor.
- Service worker auto-bumpas.

## v0.3.0 — 2026-05-15 — SIGSKYDD: minneskort + repetitionsprov (FRO Signalskydd v1.0)

- **Ny sida:** `sigskydd.html` med tre lägen — **Kort** (bläddra/vänd/markera kunde/kunde inte; missade kort köas in igen i samma session), **Prov** (20 slumpade flervalsfrågor, godkänt ≥ 16, slumpad svarsordning, resultat med fellista), **Referens** (alla kort listade per kategori för uppslag).
- **Återanvändbar engine:** `flashcards-engine.js` (mountBrowse + mountExam, ren vanilla, ingen build) — nästa deck (Förkortningar, RA-rattvärden, FG-prov) använder samma engine via egen data-fil.
- **Datakälla:** `sigskydd-data.js` — 30 kort + 20 provfrågor täcker skyddsnivåer (TS/S/C/R/TRF), förvaring, hantering, kortfärger (TAK/TEID/NBK/CEK/DBK), incidenter, förstöring (papper/eldning/CD), delgivning, publikationer (FFS 2021:1, SMK Nycklar, H TST Grunder).
- **UX-defaults:** ingen fanfar, ingen konfetti, "bästa"-not osynligt i localStorage, tangentbordsstöd (Space=vänd, J/F=kunde/kunde inte) — passar 7S-Rapport-stilen.
- **Navigation:** SIGSKYDD-flik tillagd i tab-nav-sub på 21 sidor.
- Service worker auto-bumpas.

## v0.2.5 — 2026-05-15 — Ramsor: kategorier (subrubriker) + 16 nya ramsor (issue #39–49, #55–59)
- **Struktur:** ramsor grupperas nu under kategori-rubriker (subrubriker) i listan. 11 kategorier definieras i `categories[]` i `ramsor-data.js`; ordningen där styr renderingsordningen. Rendering grupperar både i roll-vy och i "Övriga ramsor"-expander. Sökresultat behåller samma gruppering — kategorier vars sektion blir tom döljs automatiskt.
- **Ny roll:** "Soldat" tillagd som basroll (sex roller totalt: Soldat, Sjv, Sig, GrpC, PlutC, Förare). Stridsteknik-ramsor riktade till soldatnivå har nu naturlig hemvist.
- **Sjv** (kategorier: Bedömning · Överlämning · Evakuering): nya ramsor **Triagering — T0–T4** (färg/brådska/åtgärdsfönster + MASCAL-anmärkning, #58) och **CASEVAC vs MEDEVAC** (icke-medicinsk vs medicinsk evakuering, #59). ACVPU-usage utökad med Casualty Card-referens (#50, #51).
- **Sig** (Sambandsprocedur · Sambandsmateriel): befintliga 5 ramsor flyttade in i nya kategorier, inget nytt innehåll.
- **Stridsteknik** (Planering & order · Stridsställning · Strid & skytte · Patrull & säkring · Materielvård): 12 nya ramsor — **UFETÅSS** (#39), **UFETÅSSSO** (#48), **OBK** (#42), **8F** (#46), **EKER** (#41), **NUHKK** (#43), **4S3V** (#49), **Vapenkontroll** (10-punkts, #47), **SMUVS** (#40), **SOLO** (#45), **STOP** (#44), **Felrapport — fält** (#55).
- **Försvarsmakten — allmänt** (synlig för alla roller): **Befälsordning — NATO-koder** (OF-1…OF-9, OR-1…OR-9, armén · flottan i tvåkolumns-vy, #57) och **Gradbeteckningar — kategorier** (textöversikt utan bilder, #56).
- **Skippas i denna iteration:** handtecken (#52, #53, #54) — kräver bildmaterial som inte kan hotlinkas från rustadsoldat.se. Markerat för v0.2.x när egna SVG/textbeskrivningar finns.
- Service worker auto-bumpas.

## v0.2.2 — 2026-05-15 — Ljust/mörkt tema på 14 tab-sidor
- Theme-toggle (sun/moon FAB, top-right) på FORS, PEDARS, POSTSCHEMA, EOBUSARE, OBO, RASSOIKA, VÄDER, MINKARTA, SENSORSKISS, MÅTT, RAMSOR, TCCC, OBSLÖSA, HJÄLM 24.
- Delade `shared/theme-toggle.css` (light-mode-overrides + FAB-styling) och `shared/theme-toggle.js` (auto-mount + click-handler).
- Inline FOUC-init i `<head>` på alla 14 sidor; samma `skyttebok_settings_lightmode` localStorage-nyckel → val följer mellan tabs.
- Exkluderade per begäran: 7S (index), WHAT, SCRIM, WEFT, A–H. SKYTTEBOK + SKYTTEBOK-INFO hade redan toggle.
- Service worker auto-bumpas; nya `shared/theme-toggle.css` + `shared/theme-toggle.js` tillagda i FILES.

## v0.2.4 — 2026-05-15 — Ramsor: ACVPU, GCS, Bokstavering, Passningsalt, RA180 1-2-4-7-Eff (issue #33, #35, #36, #37, #38) + MARCH-PAWS komplement-text (#34)
- **Sjv:** ny ramsa **ACVPU** (Alert/Confusion/Verbal/Pain/Unresponsive — del av D i (C)ABCDE, ersätter ofta AVPU). Ny ramsa **GCS — Glasgow Coma Scale** (E/V/M, 3–15 p).
- **Sig:** ny ramsa **RA 180 — 1-2-4-7-Effekt** (felsökning vid sambandsavbrott — tid/nätdata/nycklar/aktiv nyckel/Effekt-läge, varning för låg-läge). Ny ramsa **Passningsalternativ** (1: alltid; 2: 5/15; 3: 5/30; 4: 10/60 — starta på udda minut). Ny ramsa **Bokstavering — svensk + internationell** (Adam/Alpha … Östen/(OE) + siffror 0–9 + komma/punkt).
- **TCCC:** MARCH-PAWS-sektionen har ny intro-text: "Används som komplement eller ersättning för (C)ABCDE — samma syfte, struktur efter de interventioner som räddar liv mest frekvent i strid."
- Service worker auto-bumpas.

## v0.2.3 — 2026-05-15 — AT-MIST: kön i Age-raden
- AT-MIST Age-raden utvidgad: "patientens ålder och kön (eller bedömd ålder och kön om okänd, ange då bedömt läge)".
- Service worker auto-bumpas.

## v0.2.1 — 2026-05-15 — Ramsor: AT-MIST + 4B (issue #31, #32)
- MIST → AT-MIST: Age och Time of injury tillagt framför MIST-bokstäverna (det är AT-MIST som lärs ut på TOS/TCCC idag). `id` ändrat `mist` → `at-mist`, usage uppdaterad.
- Ny ramsa **4B** under Sjv: Bröstkorg / Buk / Bäcken / Ben — skadesvep efter inre blödning som del av lilla c i C-ABCDE (TCCC-praxis).
- README + tccc-data.js uppdaterade med nya namn och 4B-referens.
- Service worker auto-bumpas.

## v0.1 — 2026-05-13 — TCCC-flik (Tactical Combat Casualty Care)
- Ny tab `tccc.html` med utbildningsmaterial för stridsskadad sjukvård
- `tccc-data.js` med 3 faser (CUF/TFC/TACEVAC), 9 MARCH-PAWS-bokstäver med interventioner + pitfalls, 5 fördjupningsämnen (TQ-konvertering, krikotyrotomi, TBI, hypotermi, Casualty Card)
- TCCC Guidelines 2026-PDF committad till `tccc/tccc-guidelines-2026.pdf` (304 KB)
- Tydlig varning överst: "Inte för skarpt läge — använd för utbildning, träning, repetition"
- Sök som auto-öppnar matchande sektioner
- TCCC-tab tillagd i tab-nav-sub på 20 sidor
- Service worker `CACHE` bump → `hv-20260513_tccc_v01`, `tccc.html` + `tccc-data.js` i FILES

## v0.1 — 2026-05-12 — Positionering & Mina data
- Disclaimer i `footer.js` (sprids till alla 14+ formulär) + synlig på `index.html` + i README
- README-sweep: "för Hemvärnet" → "riktat till hemvärnssoldater" där det kan antyda officiell anknytning
- Ny sida `data.html` med "Var ligger mina data?", plattformsmatris, JSON-export/import (localStorage + IndexedDB), källkod-vs-data-separation
- iOS-ITP-engångsnotis efter >5 dagars inaktivitet (länk till `data.html` för säkerhetskopia)
- Service worker `CACHE` bump → `hv-20260512_v01_disclaimer`, `data.html` i FILES

## v0.2 — 2026-05-12 — Ramsor-flik (Paket A)
- Ny tab `ramsor.html` med roll-vald vy (Sjv / Sig / GrpC / PlutC / Förare), sök, "Övriga ramsor"-expander
- `ramsor-data.js` med 8 ramsor: Sjv (METHANE, SAFE, C-ABCDE, MIST, 9-LINE MEDEVAC) + Sig (Talgruppsbyte, RA 1444-handhavande, 1227-tabell)
- Deskriptiva grå kategoritaggar (Sjukvård, Signalist, Internationellt, Generellt, Materiel, Referens) — ingen auktoritets-signal
- RAMSOR-tab tillagd i tab-nav-sub på 19 sidor
- Språk-sweep matt.html: "Försvarsmakten · Västra militärregionen" → "hjälpverktyg"
- Service worker `CACHE` bump + `ramsor.html` & `ramsor-data.js` i FILES

**Avvikelse från roadmap:** GrpC + PlutC levereras som placeholders i v0.2 istället för fyllt innehåll. Skäl: utan synlig SoldF-källa i UI och utan säker FM-publikation att luta sig på är felaktighetsrisken större än värdet av snabb leverans. Innehåll fylls på i v0.2.x när säkra referenser verifierats. TOS lämnad helt tills användaren preciserar.

## v0.8.2 — 2026-05-12 — Fix: drop på tom yta misslyckades ibland
- Bug: drop-handlern returnerade tidigt om `dragend` råkade köras före `drop` och nollade `draggedItem`. Symptom: drop på tom yta gjorde ingenting (kortet gled tillbaka).
- Fix: ny `resolveDragSource()` använder global `draggedItem` med fallback till `dataTransfer.getData('text/plain')` som sätts robust i dragstart. Drop-handler hittar nu source-itemet oavsett event-ordning.
- Påverkar både item-drop (reorder mellan items) och col-body-drop (placera sist).

## v0.8.1 — 2026-05-12 — Drop var som helst i kolumnen
- Drop på tom yta i en kolumn (under sista item) placerar nu kortet sist
- Refaktor: ny `commitReorder()` delas mellan `dropOnItem` och `dropAtEnd`
- Drop fungerar både för reorder inom kolumn och flytt mellan kolumner via tom yta
- Ingen Worker- eller Cloudflare-action behövs

## v0.8 — 2026-05-12 — Reorder inom kolumn + FLIP-animation
- Drop på item-nivå: drag kan landa `before` eller `after` ett specifikt item baserat på muspos
- Visuell drop-indikator (accentfärgad streck) ovanför/under target-itemet
- Manuell prio-ordning persisterad i Cloudflare KV (namespace bunden som `KANBAN_KV`)
- Ny Worker-endpoint `POST /reorder { column, orderedNumbers }`
- `GET /issues` berikar items med `position`-fält från KV — frontend sorterar efter den
- FLIP-animation i render(): items mäts före/efter rebuild, glider på plats med CSS-transition
- Optimistic UI med rollback vid fel + load()-fallback

**Kräver manuell action av Joel:** skapa Cloudflare KV-namespace + binda som `KANBAN_KV` till Workern + re-deploya Worker. Detaljerade steg i `verktyg/tipsa-worker/SETUP.md` (Steg 8).

## v0.7 — 2026-05-12 — Drag-and-drop på kanban-tavlan
- HTML5 Drag-and-Drop på items i tavla.html (desktop)
- Optimistic UI: item flyttas direkt vid drop, server-anrop i bakgrunden, rollback vid fel
- Visuell feedback: dragging-state (opacity 0.4) + drop-zone highlight (streckad accent)
- Refaktor: ny `executeMove()` är delad kärnlogik för modal-knapp-flytt och drag-drop
- Modal/knapp-flytt kvar som alternativ + fallback för touch (touch-stöd kommer i v0.8)
- Ingen Worker-ändring, ingen deploy-action — befintlig `POST /move` används

## v0.6 — 2026-05-12 — Pin-spärr (ACCESS_PIN) på tipsa.html och tavla.html
- Ny Worker-endpoint `POST /auth` — testar pin utan side-effects
- Ny secret `ACCESS_PIN` i Workern — primär kod, ersätter `FORM_SECRET` (som blir bakåtkompat-fallback)
- Pin-wall i tipsa.html + tavla.html — sidans innehåll döljs tills pin matas in. Pin lagras i sessionStorage (försvinner vid stängd flik).
- FORM_SECRET borttagen ur sidornas hardcoded kod — användaren matar in pin, ingen hemlighet i källkoden
- Rotering: byt `ACCESS_PIN`-secret i Cloudflare när som helst utan deploy av sidan

**Kräver manuell action av Joel:** sätt `ACCESS_PIN`-secret i Cloudflare + re-deploya Workern + dela koden med utvalda mottagare via privat kanal.

## v0.5 — 2026-05-12 — Privat kanban-tavla via samma Worker
- Ny hemlig sida `tavla.html` — kanban med 4 kolumner (Önskat / Kommer snart / Pågår / Klart), klickbara items med flytta-knappar
- Worker utökad med `GET /issues` (lista) och `POST /move` (flytta mellan kolumner). Mappning via `status:*`-labels + open/closed-state.
- Worker skapar labels automatiskt — inga manuella labels behövs i GitHub
- PR:s filtreras bort, bara Issues visas
- SETUP.md uppdaterad med kanban-instruktioner + re-deploy-guide

**Kräver manuell action av Joel:** re-deploya Workern i Cloudflare med nya `tipsa-worker.js` + uppdatera `tavla.html` med samma WORKER_URL + FORM_SECRET som tipsa.html.

## v0.4 — 2026-05-12 — Privat tipsa-ingång via Cloudflare Worker
- Ny hemlig sida `tipsa.html` — ej länkad från någon annan del av appen, märkt `noindex,nofollow`
- Formuläret POSTar till en Cloudflare Worker som skapar GitHub Issue automatiskt (användaren behöver inget GitHub-konto, ingen e-postklient)
- Worker-kod, wrangler.toml och SETUP.md i `verktyg/tipsa-worker/`
- Workern kräver engångs-config (GitHub PAT, FORM_SECRET, ALLOWED_ORIGIN, GITHUB_REPO) — full guide i SETUP.md
- `tipsa.html` ingår inte i service workerns FILES — sidan ska inte seedas i alla användares enheter

## v0.3.1 — 2026-05-12 — Mindre städning
- Tagit bort 1227-tabell-rutan i RAMSOR-fliken. Den var bara en intro-platshållare utan riktigt innehåll. Full 1227-tabell ligger kvar i roadmap-data.js under "Kommer snart" och läggs in när tabellen är komplett.

## v0.3 — 2026-05-12 — In-app roadmap (Paket C)
- Ny sida `roadmap.html` länkad från footer-Om ("ROADMAP & ÖNSKEMÅL")
- 4 kolumner (Önskat / Kommer snart / Pågår / Klart), responsiv 4→2→1 kolumns
- `roadmap-data.js` manuellt uppdaterad datakälla, 8 startitems (3 Klart inkl. v0.1/v0.2/v0.3, 1 Pågår, 2 Kommer snart, 2 Önskat)
- "Önska en funktion"-knapp återanvänder feedback-länkens GitHub-template med `[Roadmap-önskan]`-prefix
- Service worker `CACHE` bump + `roadmap.html` & `roadmap-data.js` i FILES

**Mindre avvikelse:** "Önska funktion"-knappen länkar till samma GitHub Issues-flöde som befintliga feedback-knappen istället för en helt separat kanal. Konsekvent med existerande mönster, undviker duplicering. Användare som vill nå utvecklaren utan GitHub kan göra det via samma kanaler som tidigare.
