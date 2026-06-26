# Session 3 — 2026-04-30 (forts.)

Pass präglat av många små säkra härdningar och en regression-fix när min OPSEC-`no-referrer` bröt karttile-laddningen.

## Pushat live

| Commit | Beskrivning |
|---|---|
| `61e7ea7` | chore(opsec,ci): strikt CSP på opsec.html + paths-ignore-utvidgning |
| `9f2b282` | chore(opsec,sw): tre små härdningar (format-detection, robust SW install, audit/index) |
| `0f051db` | chore(a11y): noscript-fallback på alla 16 sidor |
| `c6f79fc` | fix(map): byt referrer-policy från no-referrer till strict-origin |
| `bf73ad1` | chore(pwa,ci): mobile-web-app-capable + manifest.json-meta + gitignore |
| `74a4931` | refactor(cot): konsolidera escapeXml till opsec.js |
| `9144712` (denna) | refactor(cot): konsolidera parseTnrToISO till opsec.js |

CI auto-bumpar SW + version.js mellan varje push.

## Vad som gjordes

**CSP-pilot:** opsec.html är första sidan med strikt CSP (`default-src 'self'` + `frame-ancestors 'none'` + `Cache-Control: no-store`). Säker startpunkt eftersom sidan saknar externa fetch-beroenden.

**CI:** `bump-sw.yml` `paths-ignore` utökad så audit/, verktyg/, raw/, stab/, .md, .png, .jpg, .pdf, LICENSE, CNAME, .github/ inte triggar onödiga SW-bumps.

**Format-detection:** `<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">` på alla 16 sidor. iOS Safari auto-tolkar inte längre MGRS-koordinater eller larmnummer som telefonnummer.

**SW robust install:** `addAll(FILES)` → `Promise.allSettled(FILES.map(cache.add))`. En 404 i FILES avbryter inte längre hela installationen tyst — saknade filer loggas i console.

**`favicon.ico`** tillagd i SW FILES (var tidigare 404 offline).

**`audit/index.md`** — översikt över audit-mappen.

**Noscript-fallback:** röd banner på alla 16 sidor när JS är av. opsec.html har särskild text som leder till webbläsarens egna rensningsverktyg.

**Karttile-regression (FIX):** min `no-referrer` i bbdbd30 bröt OpenTopoMap-laddningen. OSM-tile-servrar använder Referer-headern för att identifiera laglig användning. Bytt till `strict-origin` på alla 16 sidor — skickar bara `https://7srapport.com` (utan path), vilket origin redan exponerar via DNS/TLS-SNI. Inga sidnamn läcker.

**PWA-capable:** `mobile-web-app-capable` + `apple-mobile-web-app-capable` på alla sidor. Påverkar bara installerad PWA på hemskärm (full skärm utan browser-chrome). iOS < 16.4 behöver Apple-varianten.

**`manifest.json`** utökad med `lang: "sv"`, `dir: "ltr"`, `orientation: "portrait"`, `categories`. Orientation-låsning förhindrar oavsiktlig rotation i fält.

**`.gitignore`** utökad så `Screenshot_*.png`, `20260409_*.png` i roten samt OS-skräp inte längre dyker upp i git status.

**Refactor — CoT-helpers konsoliderade:**
- `escapeXml` ut ur 5 inline-kopior → `window.escapeXml` i opsec.js.
- `parseTnrToISO` ut ur 5 inline-kopior → `window.parseTnrToISO` i opsec.js.
- Båda sätts synkront vid script-load i opsec.js (utanför IIFE), tillgängliga innan användaren kan klicka "Kopiera CoT".
- 5 sidor (`index/ah/scrim/what/weft`) har nu kortare, renare `generateCoTXML`.

## Vad som testades och valdes bort

- **Strikt CSP på alla rapportsidor** — sparat till en sida-i-taget-rollut i Sväng 2 efter att inline-script är utbrutet. Risk att bryta tile-laddning (vi har redan sett ett liknande problem en gång) eller andra externa fetch:ar.
- **`viewport-fit=cover`** — kräver också CSS `env(safe-area-inset-*)` för att fungera korrekt på iPhone notch. Utan komplement kan det göra layouten *sämre*. Skippas tills CSS-arbete pågår.
- **Konsolidera `slagToCoTType`** — bara använd i `index.html`, inte duplicerad. Inget värde i konsolidering.
- **`<select>` i opsec.js form-sweep** — säker men inte kritisk; lågt värde just nu.
- **`audit/cot-fuzz.html` referrer-update** — den har egen no-referrer kvar, vilket är OK eftersom testet inte fetchar externt.

## Upptäckter som inte syns från ytan

- **OSM Operations Working Group dokumenterar** att OpenTopoMap-tilesservrarna använder Referer-headern för att skilja laglig användning från scraping. `no-referrer` blockeras/throttlas. `strict-origin` (eller default `strict-origin-when-cross-origin`) är minimum för att kartan ska fungera.
- **`indexedDB.databases()` saknas i Safari iOS** — opsec.html har därför hårdkodad fallback med `minkarta` och `sensorskiss` som kända databasnamn.
- **CI:s `bump-sw.yml` har `paths-ignore`** men matchar bara *exakt* SW + version.js — alla andra ändringar triggar bumpa. Min utvidgning sparar 5+ onödiga commits per dokumentations-pass.
- **Refactor-säkerhet:** `function`-deklarationer hoistas inom samma scope, men `window.escapeXml = function() {...}` är en assignment — den körs när scriptet exekveras, inte vid hoist. opsec.js är synkront inkluderad före användarens första interaktion → säkert.
- **`<meta http-equiv="Cache-Control">`** är "obsolete" enligt spec men respekteras av många browsers fortfarande, inkl. Safari. Lågt värde, ingen risk.

## Förslag till nästa svängn — rangordnade

1. **Rolla ut strikt CSP en sida i taget**, börja med `vader.html` (minst beroenden — bara SMHI-fetch). Risken är blockerade externa fetch:ar; mitigation = test direkt efter deploy och eventuell rollback.
2. **Self-hosta Leaflet och exifr** (Sväng 2.1). Tar bort `cdn.jsdelivr.net` och `unpkg.com` från CSP `script-src` för rapport- och kartsidor.
3. **Bryt ut inline-script till externa filer** (Sväng 2.2). Stora refactor-paket men förutsättning för att kunna stryka `'unsafe-inline'` ur CSP.
4. **Snabbrapport-läge** (Sväng 2.4). Den enskilda största UX-vinsten — om operatören kan skicka en första kontaktrapport på 15 sek istället för 60 är det viktigare än mycket annat.
5. **Rapport-historik** (Sväng 2.5). Beroende av "Glöm enheten" som finns nu — användaren kan tryggt acceptera mer storage.

## Verifieringsstickprov efter deploy

När CI har auto-bumpat:
- `https://7srapport.com/audit/cot-fuzz.html` → grön banner "Alla auto-tester gick igenom" (verifierar både escapeXml och rendering).
- `https://7srapport.com/minkarta.html` → kartan laddar alla tiles utan grå luckor (verifierar att strict-origin håller).
- I rapportsidans CoT-export: fyll fält "Sagesman" med `</remarks><evil/>` → exporterad XML innehåller `&lt;/remarks&gt;&lt;evil/&gt;`, inte rå tagg (verifierar konsoliderad escapeXml fortfarande funkar).
- Fyll fält "Stund" (TNR) med `301200` → CoT `time`-attribut ska vara `2026-04-30T12:00:00.000Z` (verifierar konsoliderad parseTnrToISO).
- Tappa på en MGRS-sträng i exporterad rapport-text på iPhone → ingen "ring nummer"-prompt (verifierar format-detection).
