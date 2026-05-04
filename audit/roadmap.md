# Roadmap — 7S Rapport

**Datum:** 2026-04-30
Tre svängar. Varje punkt: **problem → lösning → tid → risk → mätbar effekt.**

---

## Sväng 1 — idag, push live

### 1.1 Ta bort passiva geolocation-prompts vid kartmodal — ✅ KLAR (2026-04-30, `bbdbd30`)
- **Problem:** `openMapModal()` i sex filer (index, ah, scrim, what, weft, obslosa) anropar `navigator.geolocation.getCurrentPosition()` automatiskt vid öppning, vilket utlöser webbläsarens permission-prompt utan att användaren bett om det. Bryter explicit den hårda OPSEC-regeln.
- **Lösning:** Ta bort `if (navigator.geolocation) { ... }`-blocket. Behåll `mapLastPos`-cache som initialvy. Användaren har redan `gpsBtn` (📍 MGRS) för explicit position och kan dra/klicka manuellt på kartan.
- **Tid:** 15 min.
- **Risk:** Minimal. Användare som hittills *fick* automatisk centrering på sin position behöver nu antingen trycka MGRS-knappen eller dra kartan. UX-friktion: 1 extra tap för dem som vill det.
- **Mätbart:** 0 passiva geolocation-anrop kvar i grep.

### 1.2 Skärp CSP-meta i alla 15 HTML-filer — ✅ DELVIS KLAR (strikt CSP på `opsec.html` levererad `61e7ea7`; bredare utrullning till alla 15 filer kvarstår)
- **Problem:** Nuvarande CSP är bara `upgrade-insecure-requests`. Ingen sandboxing.
- **Lösning:** Byt ut till en restriktiv `default-src 'self'`-policy som tillåter exakt de tre tile-domänerna, Nominatim, Overpass, SMHI, jsDelivr (för exifr), unpkg (för Leaflet) — och inget annat. `'unsafe-inline'` behövs för inline-script tills Sväng 2.
- **Tid:** 30 min (centraliserat genom en sed-aktig multi-fil-redigering).
- **Risk:** Om något inline-script försöker fetch:a en odeklarerad domän slutar det fungera tyst. Mitigation: testa varje sida efter deploy och justera.
- **Mätbart:** `securityheaders.com`-betyg för 7srapport.com går från D till B (full A+ kräver server-headers, Sväng 3).

### 1.3 Lägg till Referrer-Policy och no-translate — ✅ KLAR (referrer-policy → strict-origin via `c6f79fc`; no-translate och övriga meta lagda i samma sweep)
- **Problem:** Default referrer-policy läcker `https://7srapport.com` till varje extern domän. Google Translate föreslår automatöversätta sidan.
- **Lösning:** `<meta name="referrer" content="no-referrer">` och `<meta name="google" content="notranslate">` i alla 15 filer.
- **Tid:** 10 min.
- **Risk:** Ingen.
- **Mätbart:** `Referer:` är tom på alla utgående requests.

### 1.4 XML-escape i CoT-genereringen — ✅ KLAR (2026-04-30, `85ade1d` + regression-test i `audit/cot-fuzz.html`; konsoliderat i `opsec.js` via `74a4931`)
- **Problem:** Användarinput hamnar oescape:ad i `<contact callsign="...">` och i text-noder. Användaren kan av misstag bryta XML eller, värre, injicera fientliga taggar i CoT-flödet.
- **Lösning:** Ny `escapeXml()`-helpers, applicerad konsekvent runt varje `${...}` i CoT-strings. Verifiera med testfältet `</cot><evil/>`.
- **Tid:** 1–2 timmar (5 filer × ~10 templates).
- **Risk:** Om en escape glöms blir CoT-fil ogiltig och går inte att importera i TAK. Mitigation: lägg en regression-test (manuell kallad: testfältet) i en `audit/cot-fuzz.html`.
- **Mätbart:** Testfältet `</cot><evil/>"&'<` rinner igenom varje formulär och producerar en valid XML-fil där det är `&lt;/cot&gt;` etc.

### 1.5 "Glöm allt"-knapp — ✅ KLAR (2026-04-30, `56ea164` "Glöm enheten"-sida med dubbelbekräftelse; offline-tiles-cachen explicit nämnd via `57a9a24`)
- **Problem:** Inget enkelt sätt att rensa storage på enheten innan den lämnas över / tas. localStorage, sessionStorage, IndexedDB, Cache API, Service Worker — fyra ställen att rensa manuellt.
- **Lösning:** Ny gemensam OPSEC-meny (knapp i footern på alla sidor — eller en dedikerad `/opsec.html`). En knapp "🧹 Glöm allt på den här enheten" med dubbelbekräftelse. Rensar localStorage, sessionStorage, alla IDB-databaser, alla cache:s, avregistrerar Service Worker, navigerar till `about:blank`.
- **Tid:** 1 timme.
- **Risk:** Användaren råkar trycka — det är därför dubbelbekräftelse finns. Sekundärrisk: kan göra appen offline-trasig till nästa nätuppkoppling. Beskriv det rakt i bekräftelsedialogen.
- **Mätbart:** `localStorage.length === 0`, `(await caches.keys()).length === 0`, `await new Promise(r=>{const req=indexedDB.databases();req.onsuccess=()=>r(req.result);})` ger tom array efter klick.

### 1.6 OPSEC form-sweep — ✅ KLAR (2026-04-30, `bbdbd30` härdar formulär globalt; `a7df397`-7f7a81e a11y-stöd för select i `opsec.js`)
- **Problem:** `autocomplete`/`spellcheck`/`data-1p-ignore` saknas konsekvent — webbläsare och password managers kan föreslå att spara taktisk text.
- **Lösning:** Ny `opsec.js` som vid `DOMContentLoaded` sätter `autocomplete="off"`, `spellcheck="false"`, `autocorrect="off"`, `autocapitalize="off"`, `data-1p-ignore`, `data-bwignore`, `data-lpignore`, `data-form-type="other"` på alla `<input>` och `<textarea>` (utom `type="file"`). Inkludera `opsec.js` före övriga script i alla 15 sidor.
- **Tid:** 30 min.
- **Risk:** Bryter inget. Möjlig friktion: stavningsindikatorer i fritextfält försvinner — men det är önskat.
- **Mätbart:** DevTools `$$('input').every(el => el.getAttribute('autocomplete') === 'off')` är `true`.

### 1.7 Ta bort emoji ur UI-knappar — ✅ KLAR (2026-05-04, `5af0684` ✓-svep + `7d0f057` övriga)
- **Problem:** 📍 🗺 ✓ ⏳ ✅ 🛰 🚁 ☁ 🌐 ⚙ — emoji renderar olika över OS, kraschar vissa skärmläsare, och bryter designdirektivets ikon-system.
- **Lösning (genomförd):** Strategi-byte från SVG-ikonsystem till **ren text + CSS-prick**:
  - Feedback-strängar (`✓ Kopierat`, `✓ Tid hämtad...`) → bara texten. Visuell succé hanteras av befintlig `.copy-feedback`-CSS och log-typen i opsec.
  - Knapp-emoji (`🗺 Karta`, `📷 Hämta...`, `🧹 Glöm allt`, `🎲 Slumpa`, `⛶ Maximera`) → bara texten.
  - Varningar (`⚠ ...`) → text-prefix `OBS: ...` (konsekvent med `FEL: ...` i opsec).
  - Stridsvärdesknapparna i pedars (`🟢🟡🔴`) → CSS-prick (`.sv-dot-gron/gul/rod`) som matchar befintliga selected-state-färger.
- **Faktiskt utfall:** ~109 emoji-förekomster bort i 16 produktionsfiler. SVG-ikon-system bedömdes onödigt — texten säger redan vad knapparna gör. Audit/cot-fuzz.html lämnades (debug-test) och `&#10005;` (✕) i obo/rassoika lämnades (Unicode text-symbol, inte emoji).
- **Mätbart:** 0 emoji kvar i produktions-HTML (verifierat med Python regex `[\U0001F300-\U0001FAFF☀-➿⌀-⏿]`).

### 1.8 Footer- och versions-städ — ✅ KLAR (delad `footer.js` `63cf200`, råa XML-källor exkluderade `6dc6a36`, dubblett `parse-ortnamn` borttagen `24ff08c`, `roadmap-*.md` ignorerade `94dc672`)
- **Problem:** Roten har `Screenshot_*.png`, `20260409_153702.png`, `kriterier.xml`, `sjöar.xml`, `öar.xml` (filnamn med å,ö), två `parse-ortnamn`-script. Skräpig att navigera.
- **Lösning:** Flytta screenshots till `audit/screenshots/` (eller `git rm` om de inte används). XML-källfilerna till `raw/`. Ta bort dubbletten av `parse-ortnamn`. Beslut tas tillsammans med användaren — jag listar vad jag ser men rör inte filer som kan vara underlag i pågående arbete.
- **Tid:** 5 min beslut + 5 min flytt.
- **Risk:** Användaren kan ha referenser till screenshots i en konversation. **Frågar innan jag flyttar.**
- **Mätbart:** Endast källfiler i roten.

---

## Sväng 2 — denna vecka

### 2.1 Self-hosta Leaflet och exifr — ✅ KLAR (2026-05-03, `3b62c07`)
- **Problem:** Två tredjepart-CDN:er (jsDelivr, unpkg) loggar IP vid varje sidöppning. Bryter "ingen extern part ska se besök".
- **Lösning:** Lägg `vendor/leaflet-1.9.4/` och `vendor/exifr-7.1.3/` lokalt. Ändra `<script>`/`<link>` till lokala paths. Släpp SRI-attribut.
- **Tid:** 1 timme.
- **Risk:** Måste underhålla version manuellt. Mitigation: notera version i README och en CRON-kontroll mot CVE-databas.
- **Mätbart:** 0 utgående requests till `*.jsdelivr.net` och `*.unpkg.com` enligt DevTools Network på första sidöppning.

### 2.2 Bryt ut inline-script till externa filer
- **Problem:** Varje HTML-fil har 500–1500 rader inline-script. Det tvingar `'unsafe-inline'` i CSP, gör koden svår att underhålla, och dupliceras mellan filer (CoT-helpers, fallbackCopy, gpsErrorMessage, etc.).
- **Lösning:** Tre vågor:
  1. Extrahera de gemensamma helpers:arna till `shared/cot.js`, `shared/clipboard.js`, `shared/gps.js`.
  2. Per sida, flytta sidspecifika script till `<sidnamn>.js`.
  3. Ta bort `'unsafe-inline'` ur CSP `script-src`.
- **Tid:** 1–2 dagar (kontrollerat).
- **Risk:** Stor — inline-event-handlers (`onclick="..."`) kommer också blockas. Mitigation: byt till `addEventListener` per sida, en sida i taget, push live mellan varje.
- **Mätbart:** Inga `<script>`-block med innehåll i HTML-filerna.

### 2.3 Bryt ut gemensam CSS
- **Problem:** ~600 rader duplicerad CSS per fil. Förändring i färgskala kräver redigering av 15 filer.
- **Lösning:** `app.css` med design-tokens (CSS custom properties) och baselayouten. Per sida bara en `<sidnamn>.css` med specifik styling. Detta lägger också grunden för "Solljus"-läge och "Mörkning".
- **Tid:** 1 dag.
- **Risk:** Visuell regression mellan sidor om någon hade en lokal override. Mitigation: PR per sida, manuell visuell verifiering.
- **Mätbart:** Sidstorlek (HTML) sjunker med ~50 % i snitt. Tid till första render mätbar via Performance.now().

### 2.4 Snabbrapport-läge för 7S — *AVSKRIVEN 2026-05-03*
> **Status:** byggd, testad, avskriven. Användaren bedömde efter test att
> det fullständiga 7S-formuläret är tillräckligt snabbt och att en separat
> snabbrapport-vy var en distraktion mer än ett verktyg. Koden är borttagen
> ur sajten i samma commit som arkiveringen av 2.5/2.6.
- ~~**Problem:** En komplett 7S-rapport tar 30–60 sek att fylla i, vilket är för långt vid kontaktrapport.~~
- ~~**Lösning:** Ny knapp "Snabbrapport" som öppnar minimalt formulär.~~
- ~~**Tid:** 1 dag.~~

### 2.5 Rapport-historik (lokal, sökbar, diff-bar) — *ARKIVERAD 2026-05-03*
> **Status:** avskriven. Beslut av användaren: rapporter ska försvinna när
> de "kopierats" — det är OPSEC-bra (inget kvar på enheten om den tas).
> Den som vill spara en rapport kan göra det själv via skärmdump eller
> kopia till annan plats. **Bygg inte.**
- ~~**Problem:** Rapporter försvinner efter "kopiera". Ingen möjlighet att se "vad skickade jag förra timmen?".~~
- ~~**Lösning:** IndexedDB-tabell `reports` med rader (timestamp, typ, JSON-state, genererad text). Lista i en ny `historik.html`. Sökbart per datum/förband. Klick → reload som mall för ny rapport.~~
- ~~**Tid:** 1 dag.~~

### 2.6 Mall-bibliotek — *ARKIVERAD 2026-05-03*
> **Status:** avskriven. Beslut av användaren: lagrade mallar med gammal
> taktisk text är en OPSEC-risk. De redan befintliga "saved-items" per fält
> (`7s_places`, `7s_sagesman`, `7s_till`, `7s_fran`) räcker som
> autocompletion. **Bygg inte.**
- ~~**Problem:** Återkommande rapporttyper (rutinpost, byte, läget) kräver att hela formuläret fylls i från noll.~~
- ~~**Lösning:** `localStorage["templates"]` med 10 användarstyrda mallar. Knapp i varje formulär: "Spara som mall" / "Använd mall →".~~
- ~~**Tid:** 4 timmar.~~

### 2.7 Andmätare i status-baren
- **Problem:** Operatören vet inte hur långt det är till nästa avlösning, batterinivå syns inte i appen.
- **Lösning:** Litet status-band längst upp: batteri-% (Battery API om tillgänglig — utan permission), nät-status, lokal tid Zulu, nästa deadline (om postschema-data finns). Inga prompts.
- **Tid:** 4 timmar.
- **Risk:** Battery API är borttaget i Firefox av integritetsskäl — ok fallback.
- **Mätbart:** Status synlig på alla 15 sidor.

---

## Sväng 3 — vision

### 3.1 PMTiles offline-bundles — ✅ KLAR Fas 1+2 (2026-05-03/04). Detaljerad roadmap i [`roadmap-pmtiles.md`](roadmap-pmtiles.md)
> Fas 1 `7f30a13`: PMTiles-klient + UI-toggle "Härdat läge". Fas 2: Sverige z 0-15 (~4 GB) hostad på Cloudflare R2, streaming-nedladdning + SHA-256-verifiering, auto-cache-invalidering vid storleks-mismatch, Protomaps Basemap-schema (gator visas), stil-dropdown. Fas 3 (vector tiles via MapLibre GL) återstår som "kanske aldrig" / overstretch.
- **Problem:** Karta loggar position till tile-server vid varje fält-användning. Den enda fix:en är offline.
- **Lösning:** Bygg fyra-fem `.pmtiles`-bundles via `tippecanoe` från Lantmäteriets terränGData (eller OSM som fallback): Sverige-low-zoom (z 5–10), och fyra hi-zoom-regioner (z 11–17). Hosta som statisk fil på 7srapport.com. Ny "Härdat läge"-toggle som låser kartan till offline. Storlek: ~50 MB Sverige-low + ~200 MB per hi-zoom-region.
- **Tid:** 2–3 dagar för pipeline + UI.
- **Risk:** Kräver disk på enheten + förladdning. Inte alla operatörer vill ha 200 MB cache. Mitigation: opt-in download per region.
- **Mätbart:** I "Härdat läge" är utgående anrop = 0.

### 3.2 Voice-to-rapport
- **Problem:** Med handskar och fingerfrysning är skärm-tangentbord opålitligt. Röst går snabbare för 7S-mall.
- **Lösning:** Web Speech API (svenska, lokal grammatik) + en regex-driven parser som plockar ut S-fälten ur talet. "Storlek 4 personer, slag fotpatrull, sysselsättning rörelse mot nordväst, ställe här, plats Hagaparken, tid nu, motåtgärder ingen, nedslagspunkt okänd." → ifyllt formulär.
- **Tid:** 3 dagar.
- **Risk:** Web Speech kräver server-rundtur i Chrome (skickar ljudet till Google!). På iOS körs det lokalt. Krav: feature körs **bara** på iOS eller med på-enhets-modell (Whisper.cpp i WASM). Bättre att vänta tills det går lokalt på alla plattformar.
- **Mätbart:** 100 % av tal-till-text körs lokalt enligt DevTools.

### 3.3 Mörkningsläge (red-on-black)
- **Problem:** Vid mörkerseende-ljus är vita pixlar bländare. Standard mörkt tema är grönt-vitt → fortfarande för ljust.
- **Lösning:** En `data-theme="rod"` som sätter `--bg: #000`, `--fg: #b00020`, kontrast >= 7:1, och **inga animations/toast-blixtar**. Toggla via knapp i footern eller automatiskt när enhet rapporterar låg ljusnivå (Ambient Light Sensor — bara om den används utan prompt).
- **Tid:** 1 dag (förutsätter att Sväng 2.3 brutit ut CSS).
- **Risk:** Kontrastförluster — många UI-element är gröna. Måste byggas om.
- **Mätbart:** Alla text-mot-bakgrund-par >= 7:1 enligt WCAG AAA. Inga `transition` på `background-color` i mörkningsläge.

### 3.4 PWA-strukturell modernisering
- **Problem:** Service Worker är simpel; ingen background sync, ingen push (medvetet bortvald), och cache-strategin är ospecifik per resurs.
- **Lösning:** Workbox-style strategier per resurs, dock **utan** Workbox själv (extern dependency). Egna policies: `NetworkFirst` för HTML, `StaleWhileRevalidate` för CSS/JS, `CacheFirst` för fonts. Versionerad cache-namnging redan på plats.
- **Tid:** 4 timmar.
- **Risk:** Liten — current SW är redan lite av detta.
- **Mätbart:** Lighthouse PWA-score > 95.

### 3.5 Reglements-driver — rapportstrukturer som data
- **Problem:** Ny rapporttyp = ny HTML-fil + duplicerad CSS + JS. 500 rader nytt per typ.
- **Lösning:** En JSON-mall (`forms/7s.json`) som beskriver fält, validering, render, generator-template. En enkel render-engine (`engine/form.js`, ~200 rader) renderar valfri JSON. Nya rapporttyper = en JSON-fil + en länk i menyn.
- **Tid:** 4–5 dagar (det är en strukturell omskrivning).
- **Risk:** Stor — kan tappa subtila per-formulär-beteenden. Migration sker en typ i taget, sida vid sida med befintlig HTML.
- **Mätbart:** En ny rapporttyp läggs till på < 30 min.

### 3.6 Cloudflare Worker / Netlify för riktiga headers
- **Problem:** GitHub Pages kan inte sätta HSTS, Permissions-Policy, X-Content-Type-Options.
- **Lösning:** Antingen flytta hosting till Netlify (`_headers`-fil) eller sätta en Cloudflare Worker framför 7srapport.com som lägger på dessa. Worker-vägen behåller GitHub Pages som origin. Netlify-vägen är enklare men byter hosting-leverantör.
- **Tid:** 1 dag.
- **Risk:** En extra länk i kedjan = en extra failure-mode och en extra logger. Cloudflare loggar visserligen requests by default.
- **Mätbart:** `securityheaders.com`-betyg = A+.

---

## Prioriteringslista (vad att göra först i Sväng 1)

1. ☑ 1.1 — passiv geolocation (kritiskt OPSEC)
2. ☑ 1.3 — referrer + no-translate (5 min, ren vinst)
3. ☑ 1.6 — opsec.js form-sweep (30 min, ren vinst)
4. ◐ 1.2 — CSP-skärpning (delvis: opsec.html klar; resterande 14 sidor kvarstår)
5. ☑ 1.5 — "Glöm allt"-knapp
6. ☑ 1.4 — XML-escape (kräver mest verifiering)
7. ☑ 1.7 — emoji-borttagning (klar 2026-05-04 via ren text + CSS-prick, inte SVG)
8. ☑ 1.8 — root-städ (efter användarens OK)

---

## Implementerat utan att stå i roadmap (30 april – 4 maj)

Saker som blev byggda men inte fanns som planerade rader i någon roadmap.
Listad här som retroaktiv referens.

### Hårdning / a11y / drift
- **noscript-fallback på alla 16 sidor** (`0f051db`)
- **aria-label + button-type-fixes** över hela sajten (`085b393`, `7f7a81e`, `cea61a5`)
- **Robust localStorage-parse:** `JSON.parse` wrappad i try/catch i alla läsningar (`747d6ea`)
- **Service Worker:** cache:a endast 2xx-svar — 403-tile fastnade tidigare (`0983985`)
- **mobile-web-app-capable + manifest.json-meta** + utvidgad CI paths-ignore (`bf73ad1`)
- **strikt CSP på `opsec.html`** + utvidgad CI paths-ignore (`61e7ea7`)
- **Tre små opsec/SW-hardningar** (`9f2b282`)
- **Fyra audit-sessioner dokumenterade** (`session-1.md` t.o.m. `session-4.md`) med t.ex. tnr-fuzz-sida, regression-test-utvidgning för CoT-fuzz, button-type-fix
- **Refaktor:** `parseTnrToISO` + `escapeXml` konsoliderade till `opsec.js` (`74a4931`, `0b82ab9`)

### Designsystem & UI-konsistens
- **Designsystem-tokens + härdade `.btn`** Fas 1 (`c14a1b3`)
- **Toggle + select-varianter, harmoniserade kartkontroller** Fas 2 (`da1e94f`)
- **Kontrollraden uppdelad i två tydliga grupper** (`d469410`)
- **Launcher-knapp får egen `.mk-controls-row`-grupp** (`23e9440`)
- **Topo-flavor + stil-dropdown för Härdat läge** (`de5afbf`)
- **(BETA)-badge på CoT/TAK-knappar på 5 sidor** (`7a5c8fb`) — `revert(reports)` i `a47af93` tog bort den från text-rapport och CoT-remarks per beslut
- **Tutorial focus-ring + reduced-motion + accent-fallback** (`02e166a`)
- **"Om projektet"-tab med design-tokens** (`a3e7c54`, `1d6f8e0`)

### MINKARTA
- **Räckvidds-etiketter på verkansområdets raka yttergränser** (`63f9d4f`)
- **Räckvidds-etikett opak vit + center-mitten + zoom-låst storlek** (`2006461`)
- **Larmmina-symbol förenklad enligt ny ritning** (`fc09440`)

### SENSORSKISS
- **Footer med integritetstext + feedback-länk + versionsrad** (`942050d`)
- **Röd "Rensa allt"-knapp matchar minkarta** (`30d917b`)
- **Exportera PNG-knapp i palette-toolbar** (popover, cache, dela) (`29586d0`)
- **Reglementsenliga symboler m. inre rotation** (CIM/PIR/KAMERA/UMRA, Larmmina, Enkelpost, Dubbelpost, RPAS) (`62c765f`, `7eed0a3`, `43eb40e`, `643cc6b`)
- **Drag-bara namnetiketter per symbol** (separat L.marker, lagras i `obj.labelLat/labelLng`, följer symbolen vid symboldrag) (`43eb40e`)
- **Extern lång riktningslinje bara för PIR** via ny `externalLine`-flagga
- **Text-placeholders för CIM/PIR/KAMERA/UMRA** i väntan på vektorformer (`d0eff65`)
- **Roterbara HTML-prototyper** för enkelpost/dubbelpost/larmmina/UMRA-varianter i `stab/Ny mapp/` (`a9aad63`)

### Kamuflage
- **MVP-modal för bulk-nedladdning som döljer verkansområdet** (`a7df397`)
- **Maxzoom 14 → 17 i bulk-modalen** (`c986385`)
- **Beskär kamuflage-område till verkansområdet** Fas 2 (`e0f88e6`)
- **Schemalagd hastighet, auto-paus, wake lock, resume** Fas 3 (`c793ce3`)
- **Splittra till egen fil + koppla bort från sajten** efter beslut (`3e9882f`) — kvar som arkiv

### CI / repo-drift
- **GitHub Actions auto-svar på issues** (`c7de3bc`)
- **`.claude/` ignorerad** (lokal Claude Code-config) (`ec9fda3`)
- **`roadmap-*.md` ignorerade och borttagna ur repo** (innehöll lokal Dropbox-sökväg) (`94dc672`)
- **`guide_egen_kopia.html` borttagen** (läckte lokal sökväg) (`c0fe529`)
- **`fetch-ortnamn.sh` committad, obsolet `parse-ortnamn.js` raderad** (`24ff08c`)

### Avskrivet/återtaget efter test
- **7S Snabbrapport-läge** (Sväng 2.4): byggt + testat 2026-05-03, **togs bort** efter beslut att fullständiga 7S räcker. Avskrivningen är redan markerad i 2.4 ovan.
- **Kamuflage-funktionen** kopplades bort från sajten efter beslut att inte stöta sig med OSM ToS — kvar som filsen referens.
