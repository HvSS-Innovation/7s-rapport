# Roadmap — 7S Rapport

**Datum:** 2026-04-30
Tre svängar. Varje punkt: **problem → lösning → tid → risk → mätbar effekt.**

---

## Sväng 1 — idag, push live

### 1.1 Ta bort passiva geolocation-prompts vid kartmodal
- **Problem:** `openMapModal()` i sex filer (index, ah, scrim, what, weft, obslosa) anropar `navigator.geolocation.getCurrentPosition()` automatiskt vid öppning, vilket utlöser webbläsarens permission-prompt utan att användaren bett om det. Bryter explicit den hårda OPSEC-regeln.
- **Lösning:** Ta bort `if (navigator.geolocation) { ... }`-blocket. Behåll `mapLastPos`-cache som initialvy. Användaren har redan `gpsBtn` (📍 MGRS) för explicit position och kan dra/klicka manuellt på kartan.
- **Tid:** 15 min.
- **Risk:** Minimal. Användare som hittills *fick* automatisk centrering på sin position behöver nu antingen trycka MGRS-knappen eller dra kartan. UX-friktion: 1 extra tap för dem som vill det.
- **Mätbart:** 0 passiva geolocation-anrop kvar i grep.

### 1.2 Skärp CSP-meta i alla 15 HTML-filer
- **Problem:** Nuvarande CSP är bara `upgrade-insecure-requests`. Ingen sandboxing.
- **Lösning:** Byt ut till en restriktiv `default-src 'self'`-policy som tillåter exakt de tre tile-domänerna, Nominatim, Overpass, SMHI, jsDelivr (för exifr), unpkg (för Leaflet) — och inget annat. `'unsafe-inline'` behövs för inline-script tills Sväng 2.
- **Tid:** 30 min (centraliserat genom en sed-aktig multi-fil-redigering).
- **Risk:** Om något inline-script försöker fetch:a en odeklarerad domän slutar det fungera tyst. Mitigation: testa varje sida efter deploy och justera.
- **Mätbart:** `securityheaders.com`-betyg för 7srapport.com går från D till B (full A+ kräver server-headers, Sväng 3).

### 1.3 Lägg till Referrer-Policy och no-translate
- **Problem:** Default referrer-policy läcker `https://7srapport.com` till varje extern domän. Google Translate föreslår automatöversätta sidan.
- **Lösning:** `<meta name="referrer" content="no-referrer">` och `<meta name="google" content="notranslate">` i alla 15 filer.
- **Tid:** 10 min.
- **Risk:** Ingen.
- **Mätbart:** `Referer:` är tom på alla utgående requests.

### 1.4 XML-escape i CoT-genereringen
- **Problem:** Användarinput hamnar oescape:ad i `<contact callsign="...">` och i text-noder. Användaren kan av misstag bryta XML eller, värre, injicera fientliga taggar i CoT-flödet.
- **Lösning:** Ny `escapeXml()`-helpers, applicerad konsekvent runt varje `${...}` i CoT-strings. Verifiera med testfältet `</cot><evil/>`.
- **Tid:** 1–2 timmar (5 filer × ~10 templates).
- **Risk:** Om en escape glöms blir CoT-fil ogiltig och går inte att importera i TAK. Mitigation: lägg en regression-test (manuell kallad: testfältet) i en `audit/cot-fuzz.html`.
- **Mätbart:** Testfältet `</cot><evil/>"&'<` rinner igenom varje formulär och producerar en valid XML-fil där det är `&lt;/cot&gt;` etc.

### 1.5 "Glöm allt"-knapp
- **Problem:** Inget enkelt sätt att rensa storage på enheten innan den lämnas över / tas. localStorage, sessionStorage, IndexedDB, Cache API, Service Worker — fyra ställen att rensa manuellt.
- **Lösning:** Ny gemensam OPSEC-meny (knapp i footern på alla sidor — eller en dedikerad `/opsec.html`). En knapp "🧹 Glöm allt på den här enheten" med dubbelbekräftelse. Rensar localStorage, sessionStorage, alla IDB-databaser, alla cache:s, avregistrerar Service Worker, navigerar till `about:blank`.
- **Tid:** 1 timme.
- **Risk:** Användaren råkar trycka — det är därför dubbelbekräftelse finns. Sekundärrisk: kan göra appen offline-trasig till nästa nätuppkoppling. Beskriv det rakt i bekräftelsedialogen.
- **Mätbart:** `localStorage.length === 0`, `(await caches.keys()).length === 0`, `await new Promise(r=>{const req=indexedDB.databases();req.onsuccess=()=>r(req.result);})` ger tom array efter klick.

### 1.6 OPSEC form-sweep
- **Problem:** `autocomplete`/`spellcheck`/`data-1p-ignore` saknas konsekvent — webbläsare och password managers kan föreslå att spara taktisk text.
- **Lösning:** Ny `opsec.js` som vid `DOMContentLoaded` sätter `autocomplete="off"`, `spellcheck="false"`, `autocorrect="off"`, `autocapitalize="off"`, `data-1p-ignore`, `data-bwignore`, `data-lpignore`, `data-form-type="other"` på alla `<input>` och `<textarea>` (utom `type="file"`). Inkludera `opsec.js` före övriga script i alla 15 sidor.
- **Tid:** 30 min.
- **Risk:** Bryter inget. Möjlig friktion: stavningsindikatorer i fritextfält försvinner — men det är önskat.
- **Mätbart:** DevTools `$$('input').every(el => el.getAttribute('autocomplete') === 'off')` är `true`.

### 1.7 Ta bort emoji ur UI-knappar
- **Problem:** 📍 🗺 ✓ ⏳ ✅ 🛰 🚁 ☁ 🌐 ⚙ — emoji renderar olika över OS, kraschar vissa skärmläsare, och bryter designdirektivets ikon-system.
- **Lösning:** En liten `icons.svg` med 12 inline-symboler (gps-pin, map, check, hourglass, satellite, drone, cloud, globe, settings, broom, eye, eye-off, share, copy). Ett `<svg><use href="#icon-gps"/></svg>`-mönster ersätter emoji-en-på-en.
- **Tid:** 3 timmar (många knappar att uppdatera).
- **Risk:** Lätt att glömma någon. Mitigation: grep efter emoji-block (`[\u{1F300}-\u{1FAFF}]`) före commit.
- **Mätbart:** 0 emoji i `<button>`-innehåll efter sweep.

### 1.8 Footer- och versions-städ
- **Problem:** Roten har `Screenshot_*.png`, `20260409_153702.png`, `kriterier.xml`, `sjöar.xml`, `öar.xml` (filnamn med å,ö), två `parse-ortnamn`-script. Skräpig att navigera.
- **Lösning:** Flytta screenshots till `audit/screenshots/` (eller `git rm` om de inte används). XML-källfilerna till `raw/`. Ta bort dubbletten av `parse-ortnamn`. Beslut tas tillsammans med användaren — jag listar vad jag ser men rör inte filer som kan vara underlag i pågående arbete.
- **Tid:** 5 min beslut + 5 min flytt.
- **Risk:** Användaren kan ha referenser till screenshots i en konversation. **Frågar innan jag flyttar.**
- **Mätbart:** Endast källfiler i roten.

---

## Sväng 2 — denna vecka

### 2.1 Self-hosta Leaflet och exifr
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

### 2.4 Snabbrapport-läge för 7S
- **Problem:** En komplett 7S-rapport tar 30–60 sek att fylla i, vilket är för långt vid kontaktrapport.
- **Lösning:** Ny knapp "Snabbrapport" som öppnar minimalt formulär: Storlek (chips 1–10), Sysselsättning (kompass), Ställe (auto MGRS), Slag (ett ord). De övriga S-en defaultar från senaste rapporten i historik. Submit-tid: < 15 sek.
- **Tid:** 1 dag.
- **Risk:** Default från senaste rapport kan vara fel — alltid synligt och redigerbart i en kollapserad sektion.
- **Mätbart:** Stoppursmätning på 5 testanvändare → median ≤ 15 sek från klick till "kopierad".

### 2.5 Rapport-historik (lokal, sökbar, diff-bar)
- **Problem:** Rapporter försvinner efter "kopiera". Ingen möjlighet att se "vad skickade jag förra timmen?".
- **Lösning:** IndexedDB-tabell `reports` med rader (timestamp, typ, JSON-state, genererad text). Lista i en ny `historik.html`. Sökbart per datum/förband. Klick → reload som mall för ny rapport.
- **Tid:** 1 dag.
- **Risk:** Mer storage på enheten — täcks av "Glöm allt"-knappen från Sväng 1.5.
- **Mätbart:** Senaste 50 rapporter listade och sökbara per fritext.

### 2.6 Mall-bibliotek
- **Problem:** Återkommande rapporttyper (rutinpost, byte, läget) kräver att hela formuläret fylls i från noll.
- **Lösning:** `localStorage["templates"]` med 10 användarstyrda mallar. Knapp i varje formulär: "Spara som mall" / "Använd mall →".
- **Tid:** 4 timmar.
- **Risk:** Mallar med gamla namn kan av misstag skickas. Mitigation: visa mall-namn tydligt i toast vid laddning.
- **Mätbart:** Antal sparade mallar > 0 efter 1 vecka i fält.

### 2.7 Andmätare i status-baren
- **Problem:** Operatören vet inte hur långt det är till nästa avlösning, batterinivå syns inte i appen.
- **Lösning:** Litet status-band längst upp: batteri-% (Battery API om tillgänglig — utan permission), nät-status, lokal tid Zulu, nästa deadline (om postschema-data finns). Inga prompts.
- **Tid:** 4 timmar.
- **Risk:** Battery API är borttaget i Firefox av integritetsskäl — ok fallback.
- **Mätbart:** Status synlig på alla 15 sidor.

---

## Sväng 3 — vision

### 3.1 PMTiles offline-bundles
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

1. ☐ 1.1 — passiv geolocation (kritiskt OPSEC)
2. ☐ 1.3 — referrer + no-translate (5 min, ren vinst)
3. ☐ 1.6 — opsec.js form-sweep (30 min, ren vinst)
4. ☐ 1.2 — CSP-skärpning
5. ☐ 1.5 — "Glöm allt"-knapp
6. ☐ 1.4 — XML-escape (kräver mest verifiering)
7. ☐ 1.7 — emoji-borttagning (störst sveptid)
8. ☐ 1.8 — root-städ (efter användarens OK)
