# CHANGELOG

Kort milstolpslogg för utvecklingscykeln **Positionering / Ramsor / In-app roadmap**.
Detaljerade beskrivningar finns i README-dagboken.

## v0.3.28 — 2026-07-30 — Härdat-svep över alla 38 sidor i CI

- **Nytt regressionsskydd** (`test/opsec/sweep.js`): laddar varje app-sida i härdat läge bakom deny-proxyn, i **båda** lägena — med kontrollerande service worker och utan. Byggt på insikten att de tre senaste läckorna alla hittades efter att invariant-testet redan var grönt; de låg i sid-lägen testet aldrig besökte. Sidan får koordinat i STÄLLE, cachad kartposition och ett paket i PMTiles-cachen så kartkod faktiskt triggas. Kör lokalt: `node test/opsec/run-sweep.js`.
- **Resultat: 76 sidladdningar, 0 extern egress i båda lägena.** Inga nya läckor.
- Eget jobb i OPSEC-gaten, så det körs på varje push.
- **Mätlärdom inbyggd i koden:** ett första utkast rapporterade 8 läckande sidor — men mätte `page.on('request')`, som fyrar även för anrop service workern besvarar ur cache. Deny-proxyn visade 0. Endast proxyloggen är bevis på egress; sid-signalen visar bara vad SW:n absorberade.

## v0.3.27 — 2026-07-30 — Falsk bekräftelse av härdat + kartlagren i MINKARTA/SENSORSKISS

- **`confirm()` kunde bekräfta fel tillstånd.** Den läste tillbaka vad som råkade ligga i localStorage i stället för det begärda läget. Misslyckades skrivningen (full lagring) speglades `false` överallt, ack:ades — och `confirm()` svarade **true**, så aktiveringen lämnade grönt UI med öppet nät. Nu tar `confirm(förväntat)` emot det begärda läget och aktiveringen anropar `confirm(true)`. Reproducerat före och efter.
- **Aktiveringen kräver nu en kontrollerande service worker.** `detectKind()` Range-fetchade PMTiles-headern mot original-URL:en innan spärren var verifierad — och `.pmtiles` är medvetet tillåtet i sid-guarden eftersom SW:n ska servera den ur cache. Utan controller gick anropet rakt ut (uppmätt: 2 externa `.pmtiles`-anrop). Kontrollen sker nu före allt nätverkskapabelt, med kort väntan på `controllerchange`.
- **Baslagren i MINKARTA och SENSORSKISS.** Egen uppföljning: mitt förra svep matchade bara `L.tileLayer` och missade därför de två viktigaste sidorna, som använder `new HybridTileLayer`. Uppmätt 15–30 externa tile-requests i härdat utan controller; 0 efter fixen.
- **Footer- och versionslänkar frös i sidladdningens läge** — slogs härdat på efteråt förblev de klickbara. `version.js` (på 22 sidor) var aldrig gate:ad alls. Kontrollen sker nu vid klicket i båda filerna.

## v0.3.26 — 2026-07-30 — Samma tile-läcka fanns i kartmodalen på sex sidor

- **Uppföljning på minikart-fyndet, hittad genom att söka buggklassen i syskonfilerna.** Kartmodalens baslager lades på kartan direkt, medan `MapHardatModal.attach()` är asynkron och `setView()` körs synkront strax efter — i det fönstret hann Leaflet begära OTM-tiles kring **senaste kartposition** innan härdat tog över. Fanns i index, ah, what, scrim, weft och obslosa. **Mätt före fixen: 18 externa tile-requests per sida** i härdat utan SW-controller; efter fixen 0 på alla sex.
- Lagret läggs nu på först när härdat inte är lagrat. Controllern lägger tillbaka det när härdat stängs av, så normalläget är oförändrat.
- Nytt permanent testfall: modalen öppnas i kontextet utan SW-controller och måste ge 0 tiles. 21/21 gröna.

## v0.3.25 — 2026-07-30 — Minikartan läckte förbi spärren (andra externa granskningen)

- **Minikartan i STÄLLE-fältet skapade ett OpenTopoMap-lager automatiskt vid sidladdning, utan härdat-kontroll.** Tile-bilder laddas som `<img>` och syns varken för sid-guarden (`fetch`/`XHR`) eller — utan SW-controller — för service workern. Eftersom kartan pannas till koordinaten i STÄLLE ringade tile-rutorna in operatörens position. Lagret skapas nu aldrig i härdat läge och rivs om härdat slås på i efterhand. **Reproducerat:** utan fixen 6 tiles + `CONNECT` mot OpenTopoMap i deny-proxyns logg; med fixen 0 och 0.
- **Aktiveringen gör äkta rollback.** Tidigare varnade den bara när SW-kvittensen uteblev och slog ändå på läget — trots att dokumentationen påstod motsatsen. Nu rivs lagret, normalläget återställs och skyddet blir AV, med tydligt besked.
- **Footer-länkarna gate:ade.** Feedback-länken (som bär formulärnamnet i URL:en) blir ett dött span, och källänkarna i Om-panelen ersätts med text i härdat läge — samma princip som redan gällde i `pwa.js`.
- **Delningsmetadata neutraliserad:** `bilaga_<tid>.png` och `title: 'Bilaga'` i stället för "Minkarta"/"Sensorskiss"/"Minläggningskarta", som annars berättade för delningsmålet vad bilden föreställde.
- **`clients.claim()` flyttad in i `waitUntil()`** så workern inte kan termineras innan klienterna tagits över.
- **Testluckan täppt:** invariant-testet garanterade bort det farliga tillståndet genom att alltid vänta in en SW-controller. Nytt fall kör `index.html` med `serviceWorkers: 'block'`, härdat lagrat och koordinat i fältet — verifierat att det går rött utan fixen. 20/20 gröna.

## v0.3.24 — 2026-07-30 — Fynd ur extern granskning: DOM-XSS och fail-open stängda

- **DOM-XSS i publiceringsdialogen (kritisk).** `publishInfo.innerHTML` interpolerade STÄLLE-fältet — som autofylls från geokodningssvar — och Signal-gruppnamnet. Fanns på fem rapportsidor (index, ah, what, scrim, weft). Raderna byggs nu som DOM-noder med `textContent`. Kombinerat med att härdat läge är ett vanligt JS-tillstånd gav hålet en väg att stänga av hela nätverksspärren.
- **Fail-open i service workern.** Varje IndexedDB-felväg returnerade "inte härdat" = nätet öppet. Nu skiljs "inget läge lagrat" (aldrig aktiverat → öppet) från "kunde inte läsa" (okänt → **härdat**, och cachas inte så ett övergående fel inte låser workern).
- **Bekräftad aktivering.** Nytt `HARDENED_ACK` från service workern: `activate()` väntar in committad IDB-transaktion och kvittens innan UI:t säger PÅ, och varnar om spärren inte kan verifieras. Stänger fönstret där operatören fick grönt läge medan workern ännu släppte igenom nät.
- **Koordinaten borta ur delade filnamn.** Exporten strippade EXIF men skrev MGRS i filnamnet, som följer med ut i Signal/mail/backuper. Nu bara tidsstämpel.
- **Externa länkar gate:ade** i installationspanelen — renderas som text i härdat läge i stället för klickbara utgångar.
- **Ärligare löfte i footern.** Webbläsarens egen uppdateringskoll av service workern kan per spec inte fångas av appen. Löftet säger nu "appens egna anrop", med en egen rad om vad Härdat läge inte kan garantera och att flygplansläge är det enda som ger radiotystnad.
- **Regressionsskydd:** egress-gaten fick hård spärr mot `publishInfo`-innerHTML plus en mätt budget för interpolerande `innerHTML`-satser per fil (självtestet täcker nu 5 felklasser), och invariant-testet matar in fientlig markup och kräver 0 skapade element. 17/17 gröna.

## v0.3.23 — 2026-07-30 — Historik- och infra-hygien (Fas 4)

- **Git-historiken omskriven:** det geotaggade fotot (enda jpg som någonsin committats, bar GPS + kameramodell + tidsstämpel i EXIF) är purgat ur all historik med `git filter-repo` och force-pushat. HEAD-trädet är byte-identiskt före/efter — noll innehållsändring, bara historik; alla 915 commits och alla branches/taggar kvar. **Alla commit-ID:n före detta är nya** → gamla lokala kloner måste klonas om.
- **Rättat antagande:** `faltrapport`, `faltrapport-HV-UND` och `7s` bär inte fotot (frusna i mars, före foto-committen) och `faltrapport-HV-UND` är en egen variant, inte en spegel — de lämnades därför orörda.
- **Workflow-hygien:** alla tre workflows har nu least-privilege `permissions:` och samtliga actions är SHA-pinnade (mutable tags borta).
- **Planeringsfiler avspårade:** `roadmap-*.md` (fullskarm-area-sliders, mineringar, minkarta-v5/v6) borta ur indexet och fångas av `.gitignore` som avsett. Innehållsgranskade — inga skarpa koordinater.
- **FORM_SECRET verifierat dött:** worker-endpointen svarar 404.

## v0.3.22 — 2026-07-30 — OPSEC-gate i CI: härdat-invarianten bevakas automatiskt (Fas 3)

- **Statisk egress-gate** (`verktyg/egress-gate.js`, körs i CI på varje push): failar bygget vid ny extern host utanför allowlisten, vid fetch-host (tiles/geokod/väder/R2) i en oregistrerad fil — exakt felklassen som gav PNG-export-läckan — och när en härdat-spärr (gate-markör) raderas ur en fil. Självtest bevisar att alla tre felklasserna larmar.
- **Invariant-testet flyttat in i repot** (`test/opsec/`): Playwright + lokal deny-all-proxy kör hela kedjan — prefetch, härdat på, guard-/SW-blockering, appskal ur cache vid reload (beslut A), PNG-export i både sensorskiss och minkarta, vädersidans knapp-disable, av-slag, Fas 1.4-vägran. 16/16 kontroller; proxyloggen bevisar 0 extern egress. Lokalt: `node test/opsec/run.js`. Fixturen (Florens-demon) hämtas vid behov, gitignorerad.
- **Ny workflow `.github/workflows/opsec-gate.yml`** med SHA-pinnade actions och `permissions: contents: read`. Auto-bump-commits ([skip ci]) triggar inte.

## v0.3.21 — 2026-07-30 — Härdat läge är nu en äkta spärr (Fas 1+2)

- **Service workern upprätthåller härdat läge** (Fas 2): sidan speglar läget till IndexedDB + `HARDENED_SET`-message; i härdat gör SW:n aldrig `fetch()` — cacheträff serveras, cachemiss får `503 HARDENED_CACHE_MISS`. Gäller pmtiles, tiles och same-origin-revalidering av HTML/JS (**beslut A:** ingen auto-uppdatering i härdat — en nätobservatör ska inte se periodiska anrop; uppdateringar kommer när härdat stängs av).
- **Egress-guard i sid-scope** (Fas 1.2, `shared/hardened-guard.js` på rapport-/kart-/upk-/vädersidorna): `fetch`/`XHR`/`sendBeacon` mot cross-origin kastar kontrollerat fel i härdat. `navigator.share` lämnas orörd (**beslut C:** lokal IPC på användarens initiativ — dela-till-Signal är kärnflödet, foton redan EXIF-strippade).
- **"Slå på ändå" borttagen** (Fas 1.4): härdat kräver komplett nedladdat paket — `activate()` vägrar annars (tyst vid boot, alert vid klick). Nedladdningsjobb i SW:n vägras i härdat och abortas när härdat slås på; `OT_START_JOB`/`PM_START_JOB` fick origin-check + URL-allowlist (egna origin/R2/tile-hosts).
- **Verifierat med Playwright + lokal deny-proxy** (all trafik inkl. SW-fetches genom proxyn): 11/11 gröna — 0 extern egress under härdat, cachemiss 503:ar utan att nå nätet, PNG-exporten renderar, av-slag öppnar nätet, aktivering utan paket vägras.
- Städat: död `renderExport` (ersatt av `renderExportAsync`) borttagen ur minkarta-export.js.

## v0.3.20 — 2026-07-30 — PNG-export fungerar i härdat läge (lokal PMTiles-render)

- **Exporten ritar nu kartbakgrunden från den lokala PMTiles-filen i härdat läge** i stället för att blockeras (uppföljning på v0.3.19/E1). Ny `PMTilesHardening.renderHardenedStatic` (protomaps `Static`-frontend, redan i vendor-bygget) renderar vektorkartan med kartans aktiva flavor rakt in i exportens canvas — pixelexakt mot overlay-projektionen (center räknas som invers mercator av tile-gridets mitt; aritmetiskt lat-mitt hade gett vertikal felpassning). Fail-closed kvarstår: utan nedladdat paket, vid rasterkarta eller om kartmodulen saknas blockeras exporten med tydligt meddelande — on-demand-R2 i härdat accepteras inte.
- **Ärlig attributionsrad:** exportens fotnot säger "Härdad karta — lokal PMTiles (© OpenStreetMap)" i stället för OpenTopoMap när härdat är på.
- **Playwright-verifierat:** lokal server + Florens-demofilen → prefetch → härdat på → export: karta + symboler + MGRS/norrpil/skalstock renderade, 0 externa requests under render; negativtest (paketet raderat ur cachen) → blockerad med rätt meddelande.

## v0.3.19 — 2026-07-30 — OPSEC: PNG-exporten gate:ad i härdat läge

- **PNG-export blockeras fail-closed i härdat läge (E1).** Exporten i minkarta + sensorskiss hämtade OTM/OSM-tiles vars z/x/y ringar in objektens område — ogate:at även i härdat. `renderExportAsync` i båda export-modulerna kastar nu i härdat läge (gate på modulnivå täcker Exportera PNG, Dela protokoll och framtida anropare); felet visas som toast med förklaring. Fynd ur härdat-verifieringen 2026-07-29, se SECURITY_BACKLOG.
- **Topo-knappens härdat-dialog ärlig (E2):** "Aktivera ändå?"-confirmen (som ändå tyst blockerades av `topo-overlay.js`) ersatt med direkt "blockerad i härdat läge"-toast; ingen opsec-accept sparas längre av misstag.
- **Footerns transparenslista rättad (E3):** VÄDER-raden namnger nu Open-Meteo (prognos) + Nominatim (ortens koordinat); SMHI är bara en frivillig länk.

## v0.3.18 — 2026-07-29 — Sex förbättringar ur grannlands-granskningen

- **Fix: blå kilar (falska sjöar) i härdat läge.** Custom topo-flavorns `PolygonSymbolizer` saknade geometrifilter och canvas-fyllde även vattendrags-LineStrings i Protomaps `water`-lager → långsmala blå kilar över land (rapporterad i Estland, fanns latent även i Sverige). Nu polygonfyll enbart för geomType 3 + vattendrag som tunna blå linjer.
- **Varningsraden leder in i Härdat läge.** "Kartbakgrunden laddas från extern server…" har nu en "Slå på Härdat läge"-knapp (öppnar väljaren) och byts mot grön bekräftelse när härdat är på. Central `decorateWarning` i `shared/map-hardat-modal.js` — rapportmodalerna får det via `attach()`, minkarta/sensorskiss via nya id:n. Sensorskiss laddar nu även landskaps-väljaren.
- **Ärlig statusrad:** `hardenedSourceLabel()` — minkarta/sensorskiss säger "z 9 — Härdat: Estland" i stället för att påstå OpenTopoMap i härdat läge (SECURITY_BACKLOG-post åtgärdad).
- **Kartstil-valet synliggjort:** "Kartstil"-rad i offline-väljarens footer (fungerar även innan aktivering, alla sidor med väljaren) + synlig etikett vid minkarta/sensorskiss-dropdownen. Kanonisk stil-lista i `PMTilesHardening.FLAVORS`.
- **Grannlands-panel i väljarkartan:** FI/EE/LV/LT ritas nedskalade i egen panel bredvid Sverige (mockup) med samma hover/klick/status som landskapen. Geometri: `countries-geo.js` ur Natural Earth 50m (public domain, 809 punkter), generator `verktyg/gen-countries-geo.js`. DK/NO dyker upp när geometri + filer finns.
- **Ljust läge AA-rent:** Playwright-kontrastaudit över alla 26 tema-sidor — 0 brott efter fix (värst före: Lager-panelen 1.17:1, vars `--surface-*`-tokens aldrig definierats). Systemfixar i `shared/theme-toggle.css` (surface-tokens, accent-dim/muted-justering, vit-text-lista, per-komponent-overrides), footer-separator, död `ui/theme.css`-länk borttagen.
- **Sensorskiss: riktiga symboler.** CIM/PIR/KAMERA/UMRA enligt de roterbara prototyperna i `stab/Ny mapp/` (4-uddig stjärna; PIR en streckad arm 17,5°, KAMERA V ±17,5°, CIM pärlslingor som streckade ellipser, UMRA bara stjärnan) — text-placeholders borta. CCTV/DSLR/HUND utan prototyp fick egna former i samma språk: brett V ±30° (60°-sektor), smalt V ±7,5° (15°-sektor), tassavtryck. CIM/PIR/KAMERA nu riktbara (rotations-slider) som prototyperna avsåg.

## v0.3.17 — 2026-07-28 — Härdat läge i Finland + Baltikum (offline-kartor)

- **Fyra nya pmtiles-filer på R2:** Finland (2,6 GiB), Estland (284 MiB), Lettland (524 MiB), Litauen (714 MiB) — extraherade ur Protomaps daily build `20260727` med `--maxzoom=15`, samma schema (Protomaps Basemap v4) och stil-flavors som `sverige.pmtiles`. `countries.js` har url + bytes + sha256 ifyllt, så knapparna `[🇫🇮 FI] [🇪🇪 EE] [🇱🇻 LV] [🇱🇹 LT]` i minkartans kontroll-rad är aktiva. Danmark + Norge återstår ("Kommer snart").
- **Offline-väljaren listar grannländerna:** `shared/landskap-offline.js` har en ny grupp **Grannländer** med samma kö-, nedladdnings-, visa- och radera-flöde som landskapen. Det var nödvändigt — både "Härdat läge" och "Ladda ner offline" öppnar väljaren, så utan gruppen fanns ingen väg att faktiskt hämta ett grannland (bara att växla till dess URL). Länderna har ingen geometri i SVG-kartan, bara listrader. `countries.js` lagd i `index.html` så väljaren ser länderna även när den öppnas från rapportsidorna.
- **Avvikelse från receptet:** `pmtiles.exe` går inte längre att köra på laptopen — Smart App Control blockerar osignerade binärer (`VerifiedAndReputablePolicyState = 1`) och det går inte att stänga av reversibelt. Extracten kördes i stället med Linux-binären i WSL (~12 MB/s, 9 min för alla fyra). Dokumenterat i `verktyg/build-grannlander-pmtiles.md`.
- **Uppladdning kräver S3-multipart:** `wrangler r2 object put` vägrar filer > 300 MiB, så bara Estland skulle ha gått den vägen. Receptets Steg 3 är omskrivet till `upload-r2.js` (aws-sdk lib-storage, 100 MiB-delar) med R2 API-token.
- **Kostnadsnot:** bucketen låg på ~8,1 GB (sverige + 25 landskap); +4,4 GB tar den över R2:s 10 GB-gräns → ca 0,04 USD/mån. Egress är fortsatt gratis.

## v0.3.16 — 2026-07-05 — Övningspass v2: dokument-först med låg tröskel (Joels omdesign)

- **Mallen ligger färdig från start** — 45 min, standardinslag (truppföringsram + två flexibla innehållsmoment) — och syns hela tiden som **redigerbar HTML-tabell** (klicka i cellen och skriv). Ingen formulärvägg.
- **Instruktionsbok → förslag:** läs in PDF/textfil (vendorerad pdf.js 3.11.174, allt lokalt) och tryck Generera — övningsnamn, momentförslag, **utrustnings- och dukningslistor (separata)** föreslås regelstyrt ur bokens text (rubrik-heuristik + materiel-lexikon, **ingen AI, inga nätverksanrop**). Sidor väljs till/från med chips — förslagen räknas om direkt och omgenerering dubblerar aldrig (gen-flagga; egna rader rörs ej). Boktexten sparas ALDRIG i localStorage — bara förslagen.
- **Slides mot informationsöverflöd:** 5 steg (Boken · Listor · Tid · Risk · Sjukvård) visar en sak i taget. Tid-sliden skalar flex-momenten till vald passlängd (ramen fast) + tidslinje + "min per deltagare"-check. Risk-sliden: nivåval per risk (SÄkR-åtgärdskrav visas) → högsta → riskfaktor R. Sjukvårds-sliden: närmaste vårdcentral/sjukhus + restid → tidsfaktor T (T fastställs formellt av CMA/C OrgE — märkt planeringshjälp) → **R×T → sjukvårdsberedskap in i planen**.
- **Export:** Skriv ut/PDF (ren print-vy) + Ladda ner Word (.doc som HTML-blob, filnamn utan personnamn). Fler format senare.
- Logik i `ovningspass.js` + 49 vm-testchecks (`verktyg/test-ovningspass.js`), adversarial 3-lins-review före push. Badge SNART → BETA.

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
