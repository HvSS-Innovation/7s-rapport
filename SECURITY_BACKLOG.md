# hv — Säkerhets- och buggbacklog

Kod-specifika fynd för detta repo. Workspace-spanning sätts i
`../SECURITY_BACKLOG.md`. Nyaste posten överst. Åtgärdade poster lämnas kvar
med ✅ + datum.

---

## Öppna poster

### ✅ 2026-07-29 — Verifiering av härdat läge: PNG-exporten läckte (åtgärdat 2026-07-30)

Uppföljande kodgranskning av kärnlöftet efter Fas 0. **Fas 0-fixarna håller**
(verifierade en och en, se listan under 2026-07-05-posten). Ett flöde som
auditen missade läckte — nu stängt:

E1. ✅ **PNG-export i minkarta + sensorskiss hämtade OTM/OSM-tiles ogate:at i
    härdat läge.** `minkarta-export.js` + `sensorskiss-export.js` (`tileUrl` →
    `new Image()` mot `*.tile.opentopomap.org` / `tile.openstreetmap.org`,
    upp till 180 tiles). Anroparna (`prepareExportBlob` + share-flödena) läste
    aldrig härdat-läget; CSP:ns `img-src` tillåter tile-hosts; SW:n släpper
    igenom vid cache-miss. → "Exportera PNG"/"Dela" i härdat skickade exakt
    z/x/y-bbox över **min-/sensorpositionerna** + IP till tredjepart — precis
    det footer-löftet ("då lämnar inga koordinater enheten", `footer.js:147`)
    säger inte kan hända. **Åtgärd:** `renderExportAsync` kastar fail-closed
    i härdat läge (gate på modulnivå = täcker alla anropare); felet ytas som
    toast med förklaring + åtgärd. **Steg 2 (2026-07-30):** exporten renderar
    nu kartbakgrunden från den lokala PMTiles-filen i härdat läge
    (`PMTilesHardening.renderHardenedStatic`, protomaps `Static`-frontend) —
    blockeringen kvarstår fail-closed när paketet inte är nedladdat (on-demand
    R2 accepteras inte) eller när aktiv karta är raster. Playwright-verifierad:
    0 externa requests under render; negativtest utan paket blockeras.

E2. ✅ **Topo-knappens "Aktivera ändå?"-confirm i härdat var vilseledande** —
    `minkarta.html` + `sensorskiss.html` frågade "Aktivera ändå?", men
    `topo-overlay.js:184` blockerar ändå tyst (console.warn, return false) —
    och `markOpsecAccepted` sparades så OPSEC-frågan aldrig visades igen.
    **Åtgärd:** i härdat visas direkt en "blockerad i härdat läge"-toast,
    ingen confirm, ingen opsec-accept sparas.

E3. ✅ **`footer.js` transparenslistan felaktig om VÄDER** — sa "hämtar
    prognos från SMHI", men datakällan är `api.open-meteo.com`
    (`vader.html:323`; SMHI är bara en länk). **Åtgärd:** raden namnger nu
    Open-Meteo (prognos) + Nominatim (ortens koordinat), SMHI = frivillig länk.

**✅ 2026-07-30 — Fas 1+2 byggda och verifierade.** H2, "slå på ändå" och
egress-guarden är åtgärdade i samma svep:

- **H2 ✅** — service workern är nu härdat-medveten (`service-worker.js`).
  Sidan speglar läget till IndexedDB (`hv-hardened/kv/state`) + postMessage
  `HARDENED_SET`; SW:n gör i härdat läge ALDRIG `fetch()` — cacheträff
  serveras, cachemiss får `503 HARDENED_CACHE_MISS`. Gäller pmtiles-miss,
  tile-miss OCH same-origin-revalidering av HTML/JS (**beslut A:** ingen
  auto-uppdatering i härdat — en nätobservatör ska inte se periodiska anrop).
- **Fas 1.2 ✅** — `shared/hardened-guard.js` (laddas i `<head>` på rapport-,
  kart-, upk- och vädersidorna) wrappar `fetch`/`XHR.open`/`sendBeacon`:
  cross-origin kastar kontrollerat fel i härdat. `navigator.share` wrappas
  INTE (**beslut C:** delning är lokal IPC på användarens initiativ —
  kärnflödet dela-till-Signal behålls; foton är redan EXIF-strippade).
- **Fas 1.4 ✅** — "slå på ändå" borttagen (`map-hardat-modal.js`);
  `activate()` i `pmtiles-layer.js` kräver komplett nedladdat paket
  (fail-closed, quiet vid boot-autoaktivering).
- **Fas 2.3 ✅** — `OT_START_JOB`/`PM_START_JOB` har origin-check +
  URL-allowlist (egna origin/R2/tile-hosts) och vägras helt i härdat;
  pågående jobb abortas när härdat slås på (Fas 1.3).
- **Verifierat med Playwright + lokal deny-proxy** (all browsertrafik inkl.
  SW-fetches genom proxyn): 0 extern egress under härdat; same-origin-miss
  503:ar utan att nå servern; export renderar; av-slag öppnar nätet igen;
  aktivering utan paket vägras. 11/11 gröna.

Kvarstår: **Fas 3** (statisk CI-gate + fullt 20-stegs Playwright-scenario som
regressionsskydd — dagens smoke täcker kärnan men är inte wired i CI),
**H3** (geotaggat foto i git-historik, ej purgat).

### ✅ 2026-07-28 — Statusraden påstår "OpenTopoMap" även i härdat läge (åtgärdat 2026-07-29)

Åtgärdat: `MapHardatModal.hardenedSourceLabel(ctrl)` namnger aktiv källa
("Härdat: Estland" osv. via HVCountries/HVLandskap-presets); minkarta +
sensorskiss använder den i statusraden och uppdaterar vid toggle.

`minkarta.html:1020` härleder lager-etiketten enbart ur zoomnivån
(`z <= 17 ? 'OpenTopoMap' : 'OSM Standard'`) och läser aldrig
`MK_HARDENING.isActive()`. Kartan kan alltså rendera lokala PMTiles medan
statusraden namnger en online-tjänst — och tvärtom efter att härdat stängts av.
Upptäckt vid live-verifieringen av grannlands-kartorna (härdat FI aktivt,
raden visade `z 5 — OpenTopoMap`).

→ Konsekvensen är felaktig lägesbild, inte en läcka: inga extra anrop görs.
Men raden är det enda stället som namnger *vilken* källa som ritar, så en
operatör som kollar den för att bekräfta isolering blir vilseledd.
**Fix:** låt `updateStatus()` fråga controllern och skriva t.ex.
`z 5 — PMTiles (härdat)` med filnamn/land när härdat är på.

### 2026-07-05 — OPSEC-audit: "inget lämnar 7srapport i härdat läge" — hål funna

Multi-agent-svep (6 dimensioner + adversariell verifiering, 75 agenter) av ws +
publikt repo + live-sajt, med fokus på kärnlöftet **"inget får lämna 7srapport
när kartorna är i härdat läge"**. Slutsats: **löftet håller INTE** — härdat läge
byter bara ut *tile-lagret*, inte de övriga nätverksvägarna. Sajtens grundposture
är däremot stark (se längst ned).

#### ✅ Åtgärdat 2026-07-05 → 2026-07-25 (Fas 0 + feature-borttagning)

- **C1** (geokod-läcka) ✅ `8fbf10e` — reverse/overpass/nominatim-sök gate:as på
  `isHardened()` i index/ah/obslosa/scrim/what/weft + minkarta.
- **C2** (foto-EXIF) ✅ `8fbf10e` — foto omkodas via canvas (EXIF/GPS strippas) före
  delning i index.html; fail-closed.
- **M1** (referrer) ✅ `8fbf10e` — `no-referrer` på alla sidor.
- **VÄDER** ✅ `8fbf10e` + `7249191` — gate + koordinat-avrundning + avstängningsswitch.
- **H1** (topo-overlay) ✅ `cc2dc3c` — `activate()` + auto-återställning blockeras i härdat.
- **M4** (upk Maps/Waze-länkar) ✅ `cc2dc3c` — döljs i härdat, ersätts av "Kopiera koordinat".
- **H4** (FORM_SECRET i git-historik) ✅ — `ACCESS_PIN` styr auth (läckt värde redan dött);
  `FORM_SECRET` raderat i Cloudflare; hela workern sedan raderad.
- **M3 + PAT-scope** (tipsa-worker: fritext→publika issues, ingen rate-limit, över-scopad PAT)
  ✅ `3c59eaf` + manuell radering — **tipsa/tavla pausad, Cloudflare-workern + `GITHUB_TOKEN`
  raderade**. Attackytan borttagen istället för härdad (starkare).
- **M2** (roadmap-mineringar spårad publikt) — medvetet lämnad (design-doc, låg känslighet).

**Kvar öppet:** H2 (SW nät-fallback i härdat → Fas 2), H3 (geotaggat foto i historik — ej
purgat), M5 + L1–L6. Se `roadmap-opsec-hardat-lage.md` (lokal) för Fas 1–3.

#### KRITISKT — bryter kärnlöftet, ej gate:at av härdat läge

C1. **Reverse-geocode + Overpass skickar exakta rapport-koordinater till
    tredjepart** — `index.html:739` (`nominatim.../reverse?lat=&lon=`),
    `:764` (Overpass POST `around:1000,lat,lon`), `:820` (Nominatim-sök).
    Fyras vid kartklick/MGRS-verifiering för att auto-fylla STÄLLE. Gate:as
    **enbart** på `navigator.onLine` (`:738`) — läser aldrig `pmtiles.hardening`.
    Identisk copy-paste i `ah/obslosa/scrim/what/weft` samt `minkarta.html:3132`
    (UPK-reverse). Härdat-maskineriet (`pmtiles-layer.js createController`) byter
    bara Leaflet-baslager; det finns ingen fetch-interceptor. → Operatör som slår
    på Härdat och tappar in sin position deanonymiserar exakt grid + IP hos
    OSM/Overpass, med falsk känsla av isolering. `upk.html:470` har redan ett
    fungerande `isHardened()`-mönster att kopiera. **Fix:** behandla härdat===offline
    för geocoding → hoppa nät, använd lokal `ortnamn.json` (`lmLookup`) + synlig
    notis "adress-uppslag av i härdat läge".

C2. **Bifogat foto delas med intakt EXIF-GPS** — `index.html:1351`
    `if (lastFotoFile) files.push(renamedFoto())` → `navigator.share({files})`.
    `readFoto` (`:670`) kör `exifr.parse` **bara för att läsa tidsstämpeln**,
    strippar aldrig; `renamedFoto` (`:656`) återförpackar originalbytes med nytt
    namn. → Scenfoto delat till Signal/ATAK bär fotografens GPS-koordinat +
    kameramodell + tidpunkt. Per-rapport-läcka i normal drift, ej gate:at av
    härdat. OBS: what.html-fixen 2026-06-19 (#14) gällde *död* kod; index.htmls
    nyare foto-knapp (commit `3580db4`) återinförde en *levande* väg. ah/scrim/weft
    har kvar `typeof lastFotoFile`-guard utan setter → delar inget foto idag (städa
    ändå det döda mönstret). **Fix:** re-encoda fotot via `<canvas>`/`createImageBitmap`
    → `toBlob` innan bifogande (droppar all EXIF). *Completeness-critic: enskilt
    viktigaste fixet.*

#### HIGH

H1. **`topo-overlay.js:86` — default-källa `otm-online` kan auto-återaktiveras**
    ovanpå den härdade basen → tysta OpenTopoMap-tile-requests medan Härdat är på.

H2. **`service-worker.js` (~`:212`/`:220`) — SW respekterar inte härdat läge:**
    släpper igenom PMTiles-range-requests till R2 vid cache-miss (utan varning)
    och faller tillbaka till nät för tile-hosts/ocachade requests. Underminerar
    isoleringen om filen inte är pre-nedladdad.

H3. **Git-historik: geotaggat privat foto** — `IMG_20260306_073127772.jpg`
    (blob `4b75fa7a…`, tillagt i commit `814803b`) med EXIF-GPS ligger permanent
    i publik historik (+ speglar `faltrapport`/`hvund`/`sjus`). Enda jpg som
    någonsin committats. Detta matchar **återöppningskriteriet** i 2026-06-28-
    beslutet ("OPSEC-känsligt: namn↔förband/övning / GPS"). **Rek:** betrakta
    koordinaten som exponerad; kör den förberedda history-rewrite-planen på just
    denna blob + speglarna.

H4. **Git-historik: hårdkodat `FORM_SECRET`-värde** — `const FORM_SECRET =
    '2367845…vjgh&/&f'` fanns i `tipsa.html` (commit `02a7dab`, ersatt med
    platshållare i `7d50a97`) → ligger kvar i publik historik. **Rek:** bekräfta
    att Cloudflare-workern kör `ACCESS_PIN` och att `FORM_SECRET`-fallbacken är
    **borttagen** i Worker-secrets (inte bara utbytt i klientkoden). Är den kvar =
    live-credential; rotera. `tipsa-worker.js:352` gör ACCESS_PIN primär, så
    troligen redan död — men verifiera i dashboarden.

#### MEDIUM

M1. **Referrer self-identifierar appen** — `<meta name="referrer" content="strict-origin">`
    skickar ändå `https://7srapport.com` som `Referer` till nominatim/overpass/OTM.
    Tredjepartens logg får "denna IP kör HV-rapportverktyget" ovanpå IP+koordinat.
    **Fix:** `no-referrer` på alla kart/rapportsidor.

M2. **`roadmap-mineringar.md` + `roadmap-minkarta-v5/v6.md` +
    `roadmap-fullskarm-area-sliders.md` spårade i PUBLIKT repo** trots
    `.gitignore /roadmap-*.md` och memory-noten "medvetet lokala". `git check-ignore`
    tomt → redan tracked (ignore biter inte på trackade filer). Särskilt
    *mineringar* bör innehålls-granskas. **Fix:** `git rm --cached` om de ska vara
    lokala.

M3. **`tipsa-worker.js:106` — fritext publiceras i PUBLIKA GitHub-issues** utan
    scrubbing/rate-limit; ett tips kan innehålla koordinater/känsligt. PAT
    dokumenterad med full `repo`-scope (`SETUP.md:32`) — över-privilegierad för
    issue-skapande i ett publikt repo. `originOk` släpper igenom när `Origin`
    saknas (`:342`), `secretOk` öppet om ingen secret satt (`:354`).

M4. **`upk.html:747` — Google Maps/Waze-länkar bäddar in exakt koordinat** (öppnar
    tredjepart med positionen). Ej gate:at av härdat.

M5. **Publicerade filer utan CSP:** `stab/Ny mapp/**.html` (symbol-templates, +
    rörig "Ny mapp/Ny mapp"-nästling), `verktyg/presentation-atak-roadmap.html`,
    `audit/*-fuzz.html`. Låg risk men ligger i publikt repo/Pages.

#### LOW / info

L1. **HSTS ej preload/`includeSubDomains`** → första `http`-besök är
    trust-on-first-use (JS-redirect + 301 mildrar; GitHub Pages sätter HSTS 1 år).
L2. **`stab/index.html` (orphan)** laddar `leaflet`+`mgrs` från unpkg **utan SRI**
    + CARTO-basemaps → kod-injektion + IP/viewport-läcka. Ej länkad, men publikt.
L3. **SW postMessage (`PM_START_JOB`/`OT_START_JOB`)** saknar origin-check + URL-allowlist.
L4. **`.github/workflows/feedback-loop.yml`** pinnar action till mutable tag
    (`@v4`) och saknar `permissions:` least-privilege.
L5. **`opsec.js`** täcker ej `contenteditable`, har timing-fönster för inputs
    skapade före observer-start.
L6. **`SECURITY_BACKLOG.md` själv i publikt repo** — nu när den listar öppna
    härdat-läge-hål är den en färdig attacker-checklista. Överväg privat.

#### Redan känt / mildrat (dubbelfixa ej)

- **Informant-namn i localStorage** (`7s_lastSagesman` m.fl.): "Rensa sparade"-knapp
  + `opsec.html` panic-wipe finns (#13, 2026-06-19). Kvarstår device-capture-risk
  om användaren inte wipe:ar.
- **`vader.html` → `api.open-meteo.com`**: medveten andra väderkälla (CSP-post 5d),
  utöver de av Joel godkända SMHI + nominatim.
- **Worker-handle `nijoda`**: accepterat 2026-06-28 (låg risk, pin/noindex).

#### Bekräftat STARKT (posture som håller)

Strikt CSP (`default-src 'self'; object-src 'none'; base-uri 'self';
form-action 'self'; frame-ancestors 'none'`) konsekvent på alla kart/rapportsidor;
HSTS + `http`→301→`https` + inline JS-redirect; allt tredjeparts-JS vendored lokalt
(inga trackers/analytics/CDN); R2-bucket ej listbar (HTTP 404 på rot); genererad
CoT/XML bär **ingen** device/user-id (`uid='7S-'+Date.now().toString(36)`,
`callsign="7S Rapport"`); kamuflage-läget (`offline-tiles-kamuflage.js`) dött/
frånkopplat sedan 2026-05-03; QR-koder renderas lokalt utan nät.

### 2026-07-05 — Meta-CSP: `frame-ancestors` och `Cache-Control` i `<meta>` är verkningslösa

Sajtens sidor (patl, ovningspass m.fl.) deklarerar `frame-ancestors 'none'` i
CSP-`<meta>`-taggen och `Cache-Control: no-store` som `http-equiv`. Enligt
CSP-spec ignoreras `frame-ancestors` (liksom `sandbox`/`report-uri`) när CSP
levereras via `<meta>`, och meta-Cache-Control respekteras inte av webbläsare —
inget clickjacking-skydd trots att policyn ser ut att ge det. GitHub Pages
tillåter inga egna HTTP-headers, så riktig fix kräver antingen en proxy
(Cloudflare) framför sajten eller en JS-framebust (`if (top !== self)
top.location = location`) i inline-bootstrapen på alla sidor. Praktisk risk låg
(data i localStorage, inga sessioner) — men mönstret bör inte kopieras vidare
som om det verkade. Fynd från adversarial review av ovningspass v0.1.

### 2026-06-28 — Avnamning + PII-rensning (personnamn, e-post)

Alla personnamn borttagna/neutraliserade i den serverade sajten (commit
`c87597c`): källattribution (linje.html — "av Lukas Tonneman"), namnkod-exempel
(7S + WHAT/SCRIM/WEFT/A–H), platshållarnamn (postschema/minkarta/sensorskiss/
skyttebok), utvecklarens förnamn i JS-kommentarer, testfixturer. Toponymer i
`ortnamn.json` lämnade orörda (platsnamn, ej personnamn).

#### Åtgärdat

- **E-post ur byggskript (`fetch-ortnamn.js` + `fetch-ortnamn.sh`):**
  `nijoda@gmail.com` var hårdkodad som Geotorget-API-användarnamn. Läses nu ur
  miljövariabeln `GEOTORGET_USER` (lösenord efterfrågas fortf. interaktivt,
  hamnar aldrig i fil/env-dump).

#### Öppet — kräver beslut

- **Git-historik — ✅ BESLUT 2026-06-28: (a) lämna historiken.** Personnamnen +
  e-posten finns kvar i äldre commits (publikt repo + 4 forks på origin + 3
  spegel-repon: faltrapport/hvund/sjus). En full history-rewrite bedömdes
  oproportionerlig: ren städning, ingen formell raderingsbegäran, inget
  OPSEC-känsligt — och rewriten kan ändå inte garantera radering (forks,
  PR-refs, GitHub-cache, release på tag `pmtiles-v1`). Sajten + senaste
  versionen är avnamnad (`c87597c`), vilket räcker här. **Återöppna bara** vid
  formell raderingsbegäran (GDPR art. 17) eller om uppgiften visar sig känslig
  (namn↔förband/övning) — en komplett vetad rewrite-plan (steg 0–12 +
  riskregister) togs fram 2026-06-28 och kan återanvändas.
- **Worker-handle:** `dawn-star-7fc5.nijoda.workers.dev` (tavla/tipsa, jfr post 6)
  innehåller kontohandle "nijoda". Funktionell endpoint — byte kräver omdöpning
  av Cloudflare-workern. Låg risk; sidorna är noindex/pin-skyddade. Lämnat.
- **Nästlat repo:** `tools/m_blankett/.git` (gitignored, ej publikt via hv) har
  e-posten i sina egna commit-author-rader — separat projekt, utanför scope.

### 2026-06-19 — Adversariellt korrekthetssvep, rapportfamiljen (11 sidor)

11 template-klonade rapportsidor (ah, eobusare, index, fors, obo, obslosa,
pedars, rassoika, scrim, weft, what) svepta med en finder per sida +
adversariell verifiering: 33 kandidater → 20 verifierade. Grundorsak: rapport-,
TNR-, reset- och clipboard-logiken är inlinead per sida (copy-paste), så samma
bugg återkommer i flera sidor. Delade `lib/`-moduler skulle eliminera
buggklasserna (se arkitektur-review, `lib/tnr.js`).

#### Åtgärdat (commit `bb5529f`)

- **Reset-komplett:** eobusare/obslosa/scrim rensar nu `till`/`fran`; pedars
  rensar elverks-/lampor/ved-listor + räknare (elvId/lampId/vedId); scrim
  nollställer `lastFotoFilename`. Kvarvarande taktisk data läckte annars in i
  nästa rapport.
- **Clipboard:** obo + rassoika `copyReport` fick feature-detect + `.catch` +
  textarea-fallback (kraschade när `navigator.clipboard` saknades, tyst vid
  nekad behörighet). scrim + what `copyCoT` fick `.catch`.
- **fors:** extra blanksteg i "Från:" bröt monospace-justeringen i huvudet.

#### Öppet — kräver beslut (OPSEC / design)

13. ✅ **localStorage-chips rensas inte vid "Nollställ" (ah, weft m.fl.)**
    - `7s_sagesman`/`7s_places`/`7s_lastSagesman` (sägesman-namnkod = PII) ligger
      kvar efter Nollställ och auto-fylls vid nästa sidladdning.
    - **Detta är avsiktlig "senast använd"-chips-funktion** — opsec.html är den
      tänkta wipe-mekanismen, inte per-rapport-Nollställ. Därför EJ ändrat.
    - **Beslut:** (a) lämna chips orörda (nuläge, bekvämt), (b) Nollställ rensar
      även chips/PII, (c) separat "rensa sparade"-knapp. **Rek: (c).**
    - **Åtgärdat (val c, commit `7ce2cfa`):** "Rensa sparade"-knapp under
      sägesman-chips på alla 6 sidor (index/ah/scrim/weft/what = `7s_*`,
      postschema = `sch_*`). Rensar chips-listorna + auto-ifyllnaden
      (`*_lastSagesman` m.fl.) med confirm. Nollställ orört; opsec.html är
      fortf. full panik-wipe.

14. ✅ **what.html:690 — foto-fil delas aldrig till TAK (`lastFotoFile` odefinierad)**
    - `typeof lastFotoFile !== 'undefined'` är alltid falskt; foto-File:n hamnar
      aldrig i share-payloaden.
    - **OPSEC-känsligt:** auto-bifoga foto = skicka EXIF/GPS. EJ fixat tills
      beslut: (a) ta bort den döda referensen (foto delas aldrig) eller
      (b) bifoga MEN strippa EXIF först. **Rek: (a)** om foto-delning ej behövs.
    - **Åtgärdat (val a, commit `7ce2cfa`):** död referens borttagen helt; inget
      foto bifogas TAK-share (ingen risk för rå EXIF/GPS-läcka).

15. ✅ **rassoika.html:605 — lösen accepterar partiell ifyllnad** → "Lösen: ORDET - "
    - **Åtgärdat (commit `ab7a755`):** visar bara det ifyllda ordet utan
      häng-streck; fråga-svar-paret formateras med " - " endast när båda finns.

16. ℹ️ **scrim.html:623 — CoT-event-UID ≠ data-package-manifest-UID** (olika `Date.now()`)
    - **Verifierad — ingen åtgärd:** distinkt UID för data-package (manifest)
      resp. CoT-event är ATAK-standard, inte en bugg. Ev. framtida förbättring:
      härled package-UID från event-UID för spårbarhet — kräver refaktor av
      `buildDataPackage`-signaturen i scrim + what och är ej testbart utan
      TAK-server, så det lämnas tills det finns ett konkret behov.

17. ✅ **what.html:497 — readFoto skriver alltid långt TNR-format** oavsett `tnrLong`
    - **Åtgärdat (commit `ab7a755`):** respekterar nu toggeln (kort = DDHHMM,
      långt = full DTG) precis som `setCurrentTime`/`nowTnr`.

18. ✅ **what.html:694 — executePublish dubbelanropar `navigator.share()`** i fallback
    - **Åtgärdat (commit `ab7a755`):** `AbortError` (användaren avbröt delningen)
      respekteras — ingen andra share-dialog. Vid äkta fel laddas Data Package
      ner med tydlig feedback i stället.

19. ✅ **pedars/ah/weft — copy-feedback "Kopierat" försvann aldrig**
    - **Verifierad ÄKTA bugg (commit `ab7a755`):** ingen `@keyframes`-fade fanns
      (bara `mapspin`). `.copy-feedback` har `transition:opacity .2s` +
      `.show{opacity:1}`, och `showFeedback`/`showCopyFeedback` la till `.show`
      utan att ta bort den → "Kopierat" tonade in och låg kvar permanent. Lagt
      timad bortrensning (2 s) + `clearTimeout`-skydd mot race vid snabba
      upprepade kopieringar (matchar obo/rassoika/scrim).

---

### 2026-05-29 — Audit-sweep på `arkitektur-review`-grenen

Genomgång av OPSEC-kontrakt + logikbuggar i kalkylpages. Tre parallella
Explore-agenter + manuell verifiering av fil:rad. Föregjorda
hallucinationer (bl.a. ett påstått Safari-bug i `opsec.js` som faktiskt
ligger i `opsec.html`) har sorterats bort.

#### HIGH

1. ✅ **`drondrift.html:696` — tom höjd-input nollställer inte state**
   - `if (raw === '') return;` returnerar utan att rensa `state[field]`,
     så när användaren backar bort sin angivna höjd visas fortfarande
     gamla beräkningen i resultatkortet.
   - **Repro:** Höjd 50 → vind 8 → riktning N → zon visas → backspace ut
     hela höjd-fältet → fältet tomt, men resultatkortet ligger kvar med
     "150 m" som om höjd fortfarande vore 50.
   - **Risk i fält:** Operatören tror hen tömt formuläret men ser ändå ett
     "resultat" från förra körningen. Panik-vänligheten bryter.
   - **Fix:** `if (raw === '') { state[field] = null; saveState(); render(); return; }`
   - **Åtgärdat (commit `8f622d3`):** `wireQuickRow` (drondrift.html:696–703)
     rensar nu `state[field] = null`, tar bort snabbval-highlight, saveState +
     render vid tomt fält. Verifierad 2026-06-19.

2. ✅ **`postschema.html:373 vs :395` — två olika månadslistor (MAJ vs MAY)**
   - `toggleTnrFormat` använder svenska förkortningar (`MAJ`, `OKT`).
   - `setNow` använder engelska (`MAY`, `OCT`).
   - **Repro:** I maj eller oktober: klicka "Nu" → fält fylls med `…MAY…`
     resp `…OCT…`. Klicka format-switchen kort→lång igen så regenereras
     samma stämpel via `toggleTnrFormat` med `MAJ`/`OKT`. Slutformatet
     beror på vilken funktion som senast skrev.
   - **Risk:** Felaktig TNR vid genererat schema — TNR:en blir inte
     reglementsenlig och kan inte ens parse:as konsekvent (regex på
     rad 375 accepterar bägge varianterna utan att normalisera).
   - **Fix:** Använd `const MÅN = ['JAN','FEB','MAR','APR','MAJ','JUN','JUL','AUG','SEP','OKT','NOV','DEC'];`
     på en plats i filen, referera från båda funktionerna. Samma mönster
     bör kontrolleras i `obslosa.html`, `rassoika.html` och varje
     formulär med TNR-toggle.
   - **Åtgärdat (commit `40dcad4`, 2026-06-19):** Grep visade att samma
     copy-paste-bug fanns i **11 sidor**, inte bara de två som flaggades
     (ah, eobusare, index, fors, obo, obslosa, pedars, rassoika, scrim,
     weft, what). postschema var redan fixad i `7c62071`. Alla konvergerade
     till engelsk lista (MAY/OCT) för att matcha `setNow`/`nowTnr` och NATO
     DTG — inte svensk som fix-förslaget ovan antydde. Roten: TNR-logiken är
     inlinead per sida; en delad `lib/tnr.js` skulle eliminera buggklassen
     (se arkitektur-review).

3. **`landing-smakprov.html:7–9` — Google Fonts CDN + ingen CSP**
   - Filen `preconnect`:ar `fonts.googleapis.com` + `fonts.gstatic.com`
     och `<link href="https://fonts.googleapis.com/css2?…">`.
   - Saknar `<meta http-equiv="Content-Security-Policy">` helt — alla
     andra sidor i repot har minst `upgrade-insecure-requests`.
   - **Risk:** Varje besökare på smakprov-sidan tickar in hos Google. Det
     bryter README:s påstående om att jsDelivr/unpkg är ersatta med
     self-host (Google Fonts var aldrig listat men följer samma princip).
     Saknad CSP innebär ingen brytspärr mot tredjepart om sidan får ny
     content senare.
   - **Fix:** Self-hosta de tre fontfamiljerna (`Stardos Stencil`,
     `Special Elite`, `JetBrains Mono`) under `fonts/` precis som Inter,
     eller acceptera CDN och dokumentera explicit i README + lägg minst
     en strikt CSP-meta som matchar (det andra alternativet är värre).
   - **Delvis åtgärdat 2026-06-02:** Strikt CSP tillagd med explicit
     whitelist för `https://fonts.googleapis.com` (style-src) och
     `https://fonts.gstatic.com` (font-src). Allt annat utgående är
     blockerat. Kvar: ladda ner WOFF2-filerna och self-hosta så
     whitelisten kan tas bort helt.

4. ✅ **`service-worker.js:495–509` — PMTiles-prefetch håller hela filen i
   RAM**
   - `runPmtilesJob` läser via `reader.read()` och pushar varje chunk till
     `blobChunks.push(new Blob([value]))`, sedan `new Blob(blobChunks, …)`
     på rad 509 innan `cache.put`. Browsern fragmenterar Blob:ar in i
     disk vid behov, men hela tidsfönstret från start till `cache.put`
     håller hela filen levande som referenser samtidigt.
   - **Risk:** Sverige.pmtiles är ~4 GB. Att läsa en 4 GB fil i en
     mobilbrowsers SW är att be om OOM-kill mid-download — i värsta fall
     fastnar SW:n i ett dåligt tillstånd och blockar future-PMTiles-jobb
     tills användaren rensar.
   - In-page `pmtiles-layer.js` har samma 256 MB-threshold för
     SHA-256-hopp av samma anledning, men SW-versionen har ingen sådan
     guard alls.
   - **Fix:** Streama till disk-backed Blob med
     `new Blob(blobChunks)`-skapad direkt i loop (efter varje chunk:
     blobChunks blir array av Blob → kvarvarande chunks rensas inte
     förrän slut-Blob byggs). Bättre alternativ: skapa target-blobben
     med `new Blob()` och appenda inkrementellt via ny Blob var Nte
     chunk + släpp `value`. Eller chunk:a `cache.put` i bitar via
     Range-svar — komplexare. Minimum:
     `blobChunks.push(value)` (Uint8Array, inte Blob), sätt
     `new Blob(blobChunks)` precis innan put så Vi8U inte ligger kvar
     i shadow-Blob:ar.
   - **Åtgärdat 2026-06-02:** Bytte till `TransformStream`-pipe —
     `resp.body.pipeThrough(progressStream)` strömmar direkt från
     fetch-stream till `cache.put`, ingen ackumulering i RAM alls.
     Progress observeras chunk-vis i transformen. Abort/fel propageras
     via stream-error → cache.put rejectar → ingen partiell cache-post.

#### MEDIUM

5. ✅ **15 sidor har bara `upgrade-insecure-requests` som CSP**
   - Sidor med svag CSP: `ah, data, eobusare, fors, index, minkarta,
     obo, obslosa, pedars, postschema, rassoika, scrim, sensorskiss,
     skyttebok, skyttebok-info, vader, weft, what`.
   - 17 sidor (`app6, drondrift, fg, forkort, hjalm24, linje, matt,
     opsec, patl, ra763, ramsor, roadmap, saekr, sigskydd, symbol, tccc,
     un` samt `tipsa, tavla`) har strikt
     `default-src 'self'; … connect-src 'self'; frame-ancestors 'none'`.
   - README §"CSP — status" påstår att bara `opsec.html` har strikt CSP
     — dokumentationen är föråldrad. Roadmap för utrullning fanns i
     `audit/roadmap.md` (nu `docs/audit/roadmap.md` på den här branchen).
   - **Risk:** De viktigaste tactical-sidorna (`minkarta`, `sensorskiss`,
     `vader`, `obslosa`, rapportkonceptet) är just de som har **svag**
     CSP. Det är inte en aktiv läcka (egress går ändå bara dit koden
     säger), men ett brott mot "strikt CSP > upgrade-insecure-requests"-
     principen.
   - **Fix:** Kopiera strikta CSP:n från `drondrift.html:5` (eller
     `opsec.html:5`) till alla 15 sidor. Verifiera att `connect-src`-
     listan är komplett — `vader.html` behöver `https://nominatim.openstreetmap.org
     https://api.open-meteo.com https://api.smhi.se`, `minkarta.html` +
     `sensorskiss.html` behöver tile-hosts + R2-bucket-URL etc.
   - **Åtgärdat 2026-06-02:** Utrullad i tre grupper. 5a (9 pure-form-
     sidor) får samma strikta CSP som drondrift. 5b (6 kart-modal +
     2 full-map = 8 sidor) får tile-hosts + Nominatim + Overpass +
     R2-bucket i img-src/connect-src; TODO-kommentaren om CSP-utrullning
     borttagen samtidigt. 5d (vader) får Nominatim + Open-Meteo +
     `www.smhi.se`. Hela appen nu på strikt `default-src 'self'` —
     `upgrade-insecure-requests` används inte längre någonstans.

6. ✅ **`tipsa.html:6` + `tavla.html:6` — `connect-src https://*.workers.dev`**
   - Wildcard tillåter vilken som helst Cloudflare Workers-subdomän, inte
     bara den faktiska tipsa-workern.
   - **Risk:** Om en XSS skulle smyga in på dessa två sidor (osannolikt
     med `unsafe-inline` redan i bilden) kunde data exfiltreras till
     vilken Workers-subdomän som helst. Liten risk i praktiken.
   - **Fix:** Snäva till exakt URL, t.ex.
     `connect-src 'self' https://7srapport-tipsa.<konto>.workers.dev`.
   - **Åtgärdat 2026-06-02:** Wildcard ersatt med exakt
     `https://dawn-star-7fc5.nijoda.workers.dev`.

7. ✅ **`opsec.html:188–190` — hårdkodad Safari IDB-fallback**
   - `const known = ['minkarta', 'sensorskiss'];` används som fallback
     när `indexedDB.databases()` inte finns (Safari).
   - **Risk:** Om någon ny IndexedDB-databas läggs till (t.ex. ny
     sensor-modul eller en cache för adress-lookup) glöms den bort av
     Safari-användare vid "Glöm enheten". Just nu finns inga andra
     IDB-databaser i koden, så ingen aktiv läcka.
   - **Fix-alternativ:**
     1. Behåll listan + lägg en konstant centralt + lint som varnar.
     2. Sätt ett sentinel-värde via `localStorage.setItem('hv_known_idbs', JSON.stringify([...]))`
        vid varje IDB-open, läs den vid wipe.
   - **Åtgärdat 2026-06-02:** Alternativ 1. `KNOWN_IDB_DATABASES` är nu
     en topp-konstant med sökmönster-kommentar. Två nya varningar i
     wipe-loggen: Safari-användare ser att fallbacken kör + vilka namn
     som testas; på Chrome/FF: om runtime-listan innehåller DB:er som
     saknas i konstanten loggas tydlig varning så devs ser glömda namn.

8. ✅ **`sensorskiss-export.js:208–211` — tysta tile-fel i PNG-export**
   - Misslyckade tiles ritas som mörkgrön rektangel (`#152815`) utan
     varning, både i UI och i den genererade PNG:n.
   - **Risk:** Offline eller dåligt nät → operatören delar en sensor-
     skiss där delar av kartan är ersatta med solid färg, mottagaren
     vet inte att det är en renderingsbugg utan tror att det är ett
     uppmärkt område.
   - **Fix:** Räkna misslyckade tiles i `tiles`-arrayen; om
     `> 10 %` (eller `>= 1`?) → throw, eller åtminstone visa
     toast/varning innan share-action.
   - **Åtgärdat 2026-06-02:** Räknar failures innan ritning. Om
     `failedTiles/total > 0.1` kastas tydligt fel — sensorskiss.html
     fångar redan med try/catch och visar toast med meddelandet.

9. ✅ **`postschema.html:549` — schedulering kan välja "busy" soldat som
   absolut sista fallback**
   - `nyPerson = candidates[0] || fallback[0] || activePool[0];`
     Sista falback ignorerar både vilokrav och `busyNow`-check.
   - **Risk:** Vid extremt snäv konfig (få soldater + många poster +
     hård vilo-regel) kan en soldat dubbel-bokas i schemat utan
     varning. Edge case, men ingen synlig fel-toast.
   - **Fix:** Kasta tydligt fel: `if (!nyPerson) { alert('Schemat går
     inte att lösa med givna soldater/vilokrav.'); return; }`
   - **Åtgärdat 2026-06-02:** Sista fallback `|| activePool[0]` borttagen.
     Om både `candidates` och `fallback` är tomma visas alert och
     `schema = []; return;` bryter genereringen.

#### LOW

10. **`drondrift.html:840 + 743` — dead code för `hojdQuick`**
    - `wireQuickRow('hojdQuick', 'hojd', 'hojdCustom', 0, 500)` och
      `['hojdQuick', 'vindQuick', 'riktQuick'].forEach(…)` refererar
      ett element som inte längre finns (snabbval rensade i commit
      `484549f`). Båda funktionerna no-op:ar gracefully så ingen
      synbar bug, bara skräp.
    - **Fix:** Ta bort `hojdQuick` ur båda referenserna och låt
      `wireQuickRow` antingen kortas eller behållas för just custom-
      input-delen.
    - **Verifierad ofarlig 2026-06-19 (lämnas):** `wireQuickRow` (rad 849)
      MÅSTE stå kvar — den wirar höjd-fritextfältet `hojdCustom` inkl.
      HIGH #1-fixen, inte bara snabbval-raden. Endast `rowId`-argumentet
      `'hojdQuick'` resolverar till null och no-op:ar via `if (row)`-guarden.
      Ren kosmetik; rörs inte ("skriv inte om sådant som fungerar").

11. ✅ **README §"CSP — status" — föråldrad text**
    - Säger "Strikt CSP på plats på opsec.html. Övriga 14 sidor har
      fortfarande den bredare originalvarianten". Verkligheten är att
      17 sidor redan har strikt CSP. Uppdatera så ingen tror sajten
      är svagare än den är.
    - **Åtgärdat 2026-06-19:** README §"CSP — status" omskriven — alla sidor
      har strikt CSP, `upgrade-insecure-requests` borttaget överallt, per-sida
      allowlists dokumenterade.

12. **`drondrift.html:824` — extern länk via `window.open`**
    - `window.open(EXT_URL, '_blank', 'noopener,noreferrer')` är säker.
      Modal-gating av "lämnar 7srapport.com" + ack-checkbox är bra UX.
      Ingen åtgärd. Listad här som "verified clean".

---

## Åtgärdade

*(Inga ännu.)*
