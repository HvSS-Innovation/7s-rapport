# CHANGELOG

Kort milstolpslogg för utvecklingscykeln **Positionering / Ramsor / In-app roadmap**.
Detaljerade beskrivningar finns i README-dagboken.

## v0.3.15 — 2026-07-05 — Övningspass v0.1 tillbakarullad (för hög tröskel), arkiverad för återbruk

- **Beslut (Joel):** v0.1-formuläret blev för mycket på en gång — för många fält och krav direkt. Verktyget ska ha så låg tröskel som möjligt; nästa design blir troligen stegvis inmatning (några fält i taget) eller dokument-först-flöde (ladda in mall/manual → tweaka variabler). Sidan är återställd till "innehåll kommer snart"-placeholdern (badge BETA → SNART).
- **Arbetet är bevarat för återbruk:** hela v0.1 (verktyg + logikmodul + 40 testchecks + adversarial-review-fixar) ligger i branchen **`arkiv/ovningspass-v01`** (commit `4c6f9da`). Logiken i `ovningspass.js` (målformel, tidsberäkning, DTG, disposition, print-rendering, validering) är UI-oberoende och återanvänds rakt av i nästa UI-tappning.
- `ovningspass.js` + `verktyg/test-ovningspass.js` borttagna från main; SW FILES justerad. SECURITY_BACKLOG-posten (meta-CSP) behålls — den gäller sajten i stort.

## v0.3.14 — 2026-07-05 — Övningspass v0.1: användbar beta (grunddata + mål + moment + utskrift)

- **Placeholder → fungerande verktyg** samma dag: `ovningspass.html` är nu en tidig beta där instruktören fyller i grunddata (förlagans 15-fältsfaktaruta), bygger mål med H UtbM-formeln ([Vem] ska [förhållanden] [nivå] [prestation] [kriterium] för att [tillämpning]) och redigerar en momenttabell med förifylld truppföringsram — och skriver ut en komplett övningsplan (sidhuvud, faktaruta, MÅL/SYFTE/KRAV, autogenererad disposition, momenttabell med ackumulerad tid).
- **Single-source:** mål+syfte skrivs en gång och injiceras via `{{MÅL+SYFTE}}`-token i Övningsgenomgång + Utvärdera-momenten (förlagan upprepar dem ordagrant på tre ställen). Ack-tid räknas från moment 1 (Förberedelser ingår ej, som i förlagan). Live-valideringar: momentsumma vs passlängd, DTG-intervall (DDHHMM), tom säkerhetsgenomgång (SÄkR-delgivningskrav), saknat mål (H UtbM-minimikrav).
- **Logik i `ovningspass.js`** (testbar, ingen DOM) + vm-smoketest `verktyg/test-ovningspass.js` (36 checks, gröna). Adversarial 3-lins-review (korrekthet/UX+print/OPSEC) före push.
- **Hjälp till-ruta:** feedback- och underlagsbidrags-länkar som prefyllda GitHub-issues, med OPSEC-varning (publika ärenden — beskriv, klistra aldrig in dokument/namn/platser). Kunskapstrappan märkt som kurspraxis (ej H UtbM). Ingen FM-heraldik i utskriften. opsec.js-härdning på alla fält; "Glöm enheten" rensar även `ovnpass_state` (localStorage.clear). Badge SNART → BETA.
- Riskhanteringsmodul (S×K→R→sjukvårdsberedskap), bilagor 1–4, MÅL-anslag och momentunderlag ligger näst på tur (spec i lokalt workspace).

## v0.3.13 — 2026-07-05 — Ny Admin-flik: Övningspass (placeholder)

- **Ny flik `ovningspass.html`** under Admin-gruppen: övningsplaneringsverktyg för instruktörer som ska mynna ut i bl.a. en färdig övningsplan. Just nu en placeholder med "innehåll kommer snart"-ruta som beskriver planerat innehåll (syfte & mål, moment/stationer, materiel, säkerhet, utvärdering). Badge "SNART" i menyn.
- Feedback-issues fungerar som på övriga flikar (`FORM_ID` → footer.js → prefylld GitHub-issue).
- `lib/nav.js`: nytt ADMIN-item + blurb-justering (drawer/hubb/sitemap följer med automatiskt). Sidan tillagd i SW FILES.
- Underlag/prompter kommer att ligga i separat lokalt workspace (`Antigravity/ovningspass/`) — inte i detta publika repo.

## v0.3.12 — 2026-06-29 — Fix: härdat läge fastnar i spinner efter omladdning

- **Bugg:** efter att kartan laddats ner offline + härdat läge slagits på, en stängning och återöppning av sidan visade evig spinner ("härdat: på" men kartan syntes inte). Orsak: rapportfilernas `#mapSpinner` doldes ENBART av OpenTopoMap-baslagrets `'load'`-event — men när härdat läge auto-aktiverar vid omladdning rivs OTM-lagret innan det hinner `'load':a`, så eventet fyrade aldrig och den opaka spinnern täckte den färdigrenderade PMTiles-kartan.
- **Fix (en plats, täcker alla 6 rapportfiler):** `shared/map-hardat-modal.js` döljer nu spinnern även när härdat blir aktivt (via controllerns `onChange`/`refresh`). Ingen ändring i HTML-filerna behövdes — spinnern slås upp via `#mapSpinner`-id:t som alla rapportmodaler delar.

## v0.3.11 — 2026-06-29 — FG + UN sammanslagna (Farligt gods)

- **Mergead sida `fg.html` ("Farligt gods"):** UN (uppslag + godsdeklaration) absorberad i FG-decket. Fyra lägen i lär→gör-båge: **Kort** (flashcards) · **Prov** · **Uppslag** (UN-nummer-sök i UN_DB + ADR-kort-referens hopslagna) · **Godsdek** (ADR-S 5.4.1-deklaration, kopiera/skriv ut). Djuplänkar `#kort/#prov/#uppslag/#godsdek`.
- **Synergi (hela poängen):** "Använd i godsdeklaration"-knapp på varje uppslagsträff förfyller deklarationen (un/namn/klass/PG/etikett) — eliminerar manuell avskrift, en felkälla i ett korrekthetsverktyg. UN_DB och FG_DATA hålls separata (olika livscykel; delar bara fältnamn).
- **`un.html` → redirect-stub** till `fg.html#godsdek` (skyddar bokmärken/PWA; gammal genväg landar direkt i Godsdek — panik-vänligt). Behålls i SW FILES.
- **`lib/nav.js`:** UN-item borttaget ur Admin → drawer/hubb/sitemap uppdateras automatiskt; FG-label → "Farligt gods"; ADMIN-blurb justerad. Godsdek-läget har egen "slå alltid upp gällande ADR-S"-disclaimer.
- Beslut taget via multi-agent-workflow (4 perspektiv inkl. kontrariskt) → MERGE. Verifierat: jsdom-integrationstest (15 checks, inkl. förfyllnings-synergin) + adversariell granskning.

## v0.3.10 — 2026-06-28 — Navigering omgrupperad (8 grupper, klarare etiketter)

- **Ny grupp-indelning i `lib/nav.js`** (driver meny + hubb + sitemap från en källa): 8 grupper — 👀 Observation (7S), 📡 Rapportera (FORS/PEDARS), 🔎 Signalement, 🗺️ Karta & terräng (+VÄDER), ✅ Förbered gruppen (+OBSLÖSA/EOBUSARE/OBO), 📚 Plugga & slå upp (+SÄKR/LINJE), 📋 Admin (MÅTT/Hjälm 24/UN/PATL/SKYTTE), 🔧 Appen & data (system-sidor). Flyttar: 7S → egen Observation-grupp; VÄDER → Karta; OBSLÖSA/EOBUSARE/OBO → Förbered; SÄKR/LINJE → Plugga; MÅTT/Hjälm 24/UN/PATL/SKYTTE → Admin.
- **Klarare etiketter:** FG → "FG – Farligt gods", FÖRKORT → "FÖRKORT – Förkortningar", SIGSKYDD → "SIGSKYDD – Signalskydd". Hub-knappar fick `title` så fullnamnet syns vid hover.
- Verifierat: 36 items, alla → giltig grupp, inga döda länkar, hubb renderar 8 kort, sitemap ok.

## v0.3.9 — 2026-06-28 — APP-6 + SYMBOL sammanslagna (pedagogiskt)

- **Mergead sida `app6.html`:** SYMBOL-byggaren absorberad i APP-6-decket. Fyra lägen i en inlärningsbåge (vänster→höger = novis→van): **Lär** (bläddra 62 minneskort), **Bygg** (f.d. SYMBOL — bygg en symbol live + se REGELN bakom varje val, kopiera/ladda ner SVG), **Testa** (undermeny: **Läs symbolen** [f.d. Mystery] + **Prov** [20 frågor, ≥80%]), **Uppslag** (referenslista per kategori). Landar på Lär. Djuplänkar: `#bygg`/`#lasa`/`#prov`/`#uppslag`.
- **Bygg uppgraderat till lär-läge:** varje val visar regeln det styr ("Fiende → röd ram", "Planerad → streckad ram", "Luft → öppen ram upptill" …) + disclaimer om att vissa ramformer är förenklade. Det enda nya UI-arbetet; resten är återanvänd kod.
- **`symbol.html` → redirect-stub** till `app6.html#bygg` (skyddar gamla bokmärken/PWA-genvägar; noindex, behålls i SW FILES).
- **`lib/nav.js`:** SYMBOL-item borttaget → drawer/hubb/sitemap uppdateras automatiskt (single source). localStorage (`app6_cards`/`app6_exam`) oförändrad → ingen progress nollställs.
- **Namnförtydligande:** sidnamn behålls "APP-6" men får klarspråks-underrubrik "Lär dig läsa och bygg militära kartsymboler (APP-6B/C)"; lägena döpta på klarspråk (Kort→Lär, Referens→Uppslag, Mystery→Läs symbolen). Namnvalet APP-6 dokumenterat med Wikipedia-källa (NATO Joint Military Symbology). Verifierat med jsdom-integrationstest (22 checks) + adversariell granskning.

## v0.3.8 — 2026-06-27 — Startsida-hubb + intent-baserad navigering (IA Fas 1)

- **Ny startsida `start.html`:** en hubb som visar alla verktyg grupperade efter ändamål i sex kort (📡 Rapportera, 🔎 Signalement, 🗺️ Karta & terräng, ✅ Förbered gruppen, 📚 Plugga & slå upp, 🔧 Appen & data), var och en med klartext-blurb + verktygen som stora ikon-knappar. Live-sökfilter för att hitta ett verktyg direkt. Data-driven från `window.HvNav` (samma källa som menyn) → noll drift. Mörkt/ljust tema, offline (tillagd i service-worker FILES).
- **`lib/nav.js` omgrupperad efter avsikt:** de gamla förkortnings-grupperna (OBSERVATION/RAPPORT/PLANERING/ADMIN/RAMSOR/Dolda) ersatta av sex intent-grupper med klartext-undertexter. Grupperna driver nu tre ytor från en enda källa: hamburger-menyn, hubben och webbplatskartan. Kart-verktygen (MINKARTA/SENSORSKISS/UPK + DRÖNDRIFT) samlade i en grupp; WHAT/SCRIM/WEFT/A–H fick en egen tydlig Signalement-grupp; system-sidor (Mina data/Roadmap/Glöm enheten/Skytte-info) samlade i en SYSTEM-grupp. "Dolda"-mekaniken borttagen. Slim-snabbmenyn utökad 3→5 (7S/FORS/PEDARS + WHAT + DRÖNDRIFT). "Översikt"-länk till hubben överst i menyn på alla sidor. `ICONS` exponeras i `window.HvNav`.
- **`version.js`:** webbplatskartan renderar nu system-sidorna automatiskt via SYSTEM-gruppen (hårdkodad ÖVRIGT-lista borttagen); fragment-deep-links (Handtecken) förblir klickbara på sin egen sida.
- **`lib/nav.css`:** död CSS för borttagna Dolda-gruppen/toggeln rensad; stil för `.hv-nav-hub`-länken tillagd.
- **Process:** taxonomin designad via multi-agent-workflow (kartläggning → 4 perspektiv → syntes) och granskad adversariskt (4 dimensioner) före push — granskningen fångade att hubben saknade `nav.css` (burger/drawer ostylad), nu fixat. TIPSA medvetet utelämnad ur publik nav (pin-skyddad privat ingång). `index.html` förblir 7S (PWA-ingång orörd).

## v0.3.7 — 2026-06-27 — Webbplatskarta i sidfoten

- **Ny webbplatskarta i `version.js`:** kollapsad `<details>`-sektion som alltid ligger längst ner, direkt under versionsnumret, på alla sidor som laddar `version.js`. Byggs från `window.HvNav` (lib/nav.js) så den aldrig hamnar i otakt med menyn — alla verktygsgrupper inkl. "Dolda", plus en ÖVRIGT-grupp (Mina data, Roadmap & önskemål). Nuvarande sida markeras (aria-current); länkarna ligger i DOM:en för sökmotorer/skärmläsare även när sektionen är kollapsad. Hoppas över i symbol-embed-iframes (`?mode=embed`). Inga HTML-filer rörda.

## v0.3.6 — 2026-06-26 — Landskaps-väljare för offline-karta (i bitar)

- **Ny helskärms-väljare `shared/landskap-offline.js`:** öppnas från både "Ladda ner offline"- och "Härdat läge"-knapparna (minkarta + 7S/index). Interaktiv SVG-karta över Sveriges 25 landskap (hover-highlight synkad med listan) + grupperad lista (Götaland/Svealand/Norrland). Klick = lägg landskap i kö; "Ladda ner offline" hämtar varje köat landskap seriellt som en egen liten PMTiles-fil i stället för hela Sverige (~4,1 GB). "Visa på kartan" aktiverar härdat läge för ett nedladdat landskap och pannar dit; "Radera"/"Stäng av härdat" finns i samma vy. Syfte: små offline-filer i stället för en jätteklump.
- **`landskap.js` + `landskap-geo.js`:** presets (bbox/center/zoom + tom `pmtiles`-placeholder, mönster som `countries.js`) och förenklad landskaps-geometri för kartan. Geometri från `perliedman/svenska-landskap` (CC0, Lantmäteriets Distriktskarta), förenklad ~40 500→3 600 punkter (~60 KB).
- **`pmtiles-layer.js`:** ny per-URL `PMTilesPrefetch.fetchSmart()` (SW-delegerad, överlever sid-navigering) + `cancel()`/`expectedBytesForUrl()`; `getExpectedBytesForUrl` känner nu även landskaps-presets.
- **Decoupling:** klient-UI:t skeppas direkt. Inget landskap är nedladdningsbart förrän dess pmtiles-fil byggts + laddats upp (visas "Kommer snart" tills dess). "Hela Sverige" finns som val överst och funkar redan. Turnkey byggrecept: `verktyg/build-landskap-pmtiles.md` (extraherar varje landskap direkt ur `sverige.pmtiles` via `pmtiles extract --bbox=…`, ingen planet-nedladdning).
- **OPSEC:** väljarens karta är ren inline-SVG (ingen tile-bakgrund) → noll utgående anrop bara för att öppna den. Per-landskap PMTiles från egen R2 läcker inte intresseområde (till skillnad från raster-bulk mot OpenTopoMap).
- **Nya filer i FILES:** `landskap.js`, `landskap-geo.js`, `shared/landskap-offline.js`. Service worker auto-bumpas.

## v0.3.5 — 2026-06-25 — UPK korridor/karta-verktyg (Dolda)

- **Nytt verktyg `upk.html`** (nav-grupp HIDDEN/Dolda): planeringsverktyg för UPK-punkter. Korridor mellan två punkter (planär UTM-matematik, "bred pensel"), sökbar punktlista, KML-export (Google Earth/ATAK), och inmatning av punkter (hand, inklistrad lista/OCR, samt kart-väljare i härdat läge). MGRS↔UTM↔lat-lon räknas ut lokalt (verifierat mot 58 kända punkter, 0 m fel).
- **OPSEC:** skeppas helt utan koordinatdata (`upk-data.js` = tom). Operatören matar in/importerar själva punkterna; allt lagras bara i localStorage (`hv_upk_*`) och rensas av "Glöm enheten". Ingen koordinatdata i repot.
- **UX:** 2 flikar (Korridor / Punkter), state-driven landning på tom app, guidat tomt-läge, Enter-submit, forgiving sökning, XY-rimlighetskoll med dynamisk enhet (m/km/mil).
- **Nya filer i FILES:** `upk.html`, `upk-data.js`.
- Service worker auto-bumpas.

## v0.3.4 — 2026-05-22 — Lager-system + IMPEX i MINKARTA & SENSORSKISS

- **Lager-system (Photoshop-style):** ny delad modul `lib/layers.js` — max 10 baslager per app, kollapsbar panel under kartan, klick på lagerrad = aktivt lager (nya objekt hamnar där), ögon-toggle för synlighet, upp/ner-pilar för sortering (drag-and-drop kommer i v0.2). Översta lagret i listan ritas framför de undre via Leaflet-panes med dynamisk z-index.
- **Composites (Sammanfoga/Dela):** kryssa i 2+ lager → "Sammanfoga"-knapp skapar gruppläger som *refererar* källagren (objekten flyttas aldrig). "Dela"-knapp på composite återställer källagren med alla objekt på plats. Composites räknas inte mot 10-cappen — obegränsat med kompani/pluton-grupper ovanpå baslagren.
- **Tangent-bindning per lager:** integrerad i befintlig `shortcutMap` — klick på tangent-rutan i panelen öppnar samma "tryck en tangent"-dialog som dubbelklick på symbol. Användaren binder fritt, ingen hårdkodad 1-0.
- **Edit-popup:** "Lager"-dropdown om minst 2 baslager finns — flytta objekt mellan lager utan att dra på kartan.
- **IMPEX (lossy v0.1):** ny `lib/geo-import.js` — importera GPX/KMZ/KML som nytt lager med filnamnet. KMZ-unzip stödjer STORE + DEFLATE (via DecompressionStream). Items → generiska objekt; symbol-typ återanvänds där `sym`-fältet matchar en känd typ, annars fallback (`enkelpost`/`linje`/`sensoromrade` i sensorskiss, `text`/`frihand`/`minomrade` i minkarta). Roundtrip-bevarande extensions kommer i v0.2.
- **Per-lager-export:** GPX/KMZ-knapparna öppnar dialog med checkbox per lager — en separat fil per markerat lager, filnamn slugifierat från lagernamnet.
- **Sensorskiss frihand-defaults:** ändrad till `streckad` + `arrows: true` (Joel-feedback).
- **Migration:** befintliga objekt utan `layerId` tilldelas tyst till "Lager 1" första gången appen öppnas. Undo-snapshot i minkarta hanterar både gamla (array) och nya (object med layerState) format.
- **Intern history-logg** för create/rename/reorder/merge/split/delete (synlig panel kommer i v0.3-polish).
- **Antaganden:** A=4, B=4, C=4, D=4 (composites obegränsade, checkbox+knapp, intern history, strukturella ops), 1=3, 2=3, 3=3 (details-panel, aktivt lager, tyst migration), 4=default (per-app separata lager-set), E=4 (lossy först, roundtrip v0.2), F=4+förfining (nytt lager med filnamn, per-lager-export = N filer), G=4 (GPX+KMZ+KML).
- **Nya filer i FILES:** `lib/layers.js`, `lib/geo-import.js`.
- Service worker auto-bumpas.

## v0.3.3 — 2026-05-15 — Tab-nav uppdelad i Fält + Övning

- **Tab-nav-sub** tidigare 23-länkar i ett block — nu uppdelad i två logiska rader:
  - **Fält** (14): MINKARTA, SENSORSKISS, OBSLÖSA, FORS, PEDARS, EOBUSARE, OBO, RASSOIKA, VÄDER, MÅTT, SCHEMA, SÄKR, PATL, UN — operativa fältverktyg.
  - **Övning** (9): SKYTTE, RAMSOR, TCCC, SIGSKYDD, RA763, APP-6, SYMBOL, FÖRKORT, FG — utbildnings-/repetitionsverktyg.
- Genomfört via Python-script på 27 sidor (skip: roadmap, opsec, tipsa, data, skyttebok-info, tavla — sidor utan tab-nav-sub).
- Ingen synlig label per grupp (Joel-minimal stil) — bara visuell margin-separator.
- Service worker auto-bumpas.

## v0.3.2 — 2026-05-15 — Fyra interaktiva verktyg: SYMBOL, UN, SÄKR, PATL

- **SYMBOL** (`symbol.html`): APP-6-byggare — välj affiliation × battle dimension × ikon × förbandsstorlek × status, live SVG-rendering, kopiera/exportera SVG. Mystery-läge: slumpad symbol → gissa affiliation + battle dimension. Komplement till APP-6-deck.
- **UN** (`un.html`): militär ↔ UN-nummer-uppslag (20 vanliga ämnen: bensin/diesel/alkylat/sprit/syrgas/spillolja/ammunition/raketer/granater/Li-batterier/matvärmare/gasol) + godsdeklaration-generator (formulär → text-output enligt ADR-S 5.4.1, kopiera/skriv ut).
- **SÄKR** (`saekr.html`): RadioLådeSnack pre-flight-checklista — 8 punkter (uppgift/tilldela/andra verksamheter/risker/brytpunkter/olycka/spela spelet/avbryt). Progress-bar, tidstämpel vid klart, sessionStorage (inget kvar efter stängning). Inkluderar Varna–Säkra–Bedöm–Larma–Vårda-ruta.
- **PATL** (`patl.html`): Patientliggare — fyllbar tabell (TNR IN, LÖPNR, VAPEN NR, NAMN, TP ENHET, SMART TAG, SKADETYP, PRIO T0–T4 med triagefärger, AVTP ENH/TID), CSV-export, print-stilar för utskrift. Data i sessionStorage (PII rensas vid stängning).
- **Tab-nav:** 4 verktygslänkar tillagda efter FG på alla 31 sidor. Tab-nav-sub börjar bli stor — flagga för omstrukturering i v0.4 (kanske separera "Decks" och "Verktyg" i två grupper).
- Service worker auto-bumpas.

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
