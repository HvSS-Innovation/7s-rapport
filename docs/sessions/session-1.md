# Session 1 — 2026-04-30

## Pushat live

| Commit | Beskrivning |
|---|---|
| `91b1718` | docs(audit): statisk audit + OPSEC-rapport + 3-svänga-roadmap |
| `bbdbd30` | fix(opsec): ta bort passiva permission-prompts + härda formulär |
| `dd4027f` | Merge med origin/main efter konflikt på CACHE-namn (auto-bump krockade med min manuella bump — behöll min) |

CI:n `bump-sw.yml` kommer skriva en `Auto-bump version dd4027f [skip ci]`-commit ovanpå.

## Vad som gjordes

**Recon (Fas 1):**
- Kartlade 15 HTML-sidor, 7 JS-moduler, alla externa runtime-domäner (`cdn.jsdelivr.net`, `unpkg.com`, `nominatim.openstreetmap.org`, `overpass-api.de`, OSM/OTM tile-servrar, `opendata.smhi.se`).
- Greppat alla `navigator.*`-anrop. Hittade sex passiva geolocation-anrop som triggar permission-prompt vid kartmodal-öppning **utan användarintention**.
- Verifierade att `getUserMedia`, `Notification.requestPermission`, `Bluetooth`, `USB`, `Permissions API`, `Sensor` inte används (bra).
- Verifierade att Sentry/GA/Plausible/Mixpanel/Amplitude *inte* finns (bra).
- Identifierade att CSP är dekorativ (bara `upgrade-insecure-requests`), att `Referrer-Policy` saknas, att CoT-XML inte är XML-escape:ad, att "Glöm allt"-knapp saknas.

**Dokumenterat (Fas 2):**
- `audit/audit.md` — full statisk audit, 10 sektioner.
- `audit/security.md` — OPSEC-bedömning per krav 1–14 i hotmodellen.
- `audit/roadmap.md` — tre svängar (idag/veckan/vision) med problem→lösning→tid→risk→mätbart per punkt.

**Exekverat (Fas 3):**
- **1.1** Sex passiva geolocation-block borttagna från `openMapModal()` i `index/ah/scrim/what/weft/obslosa.html`. Användaren har redan explicit `gpsBtn` (📍 MGRS) och kan dra/klicka på kartan. Verifierat med multi-line grep att inga passiva anrop återstår.
- **1.3** `<meta name="referrer" content="no-referrer">` + `<meta name="google" content="notranslate">` i alla 15 HTML-sidor. Ingen Referer:-header läcker till tile-servrar / Nominatim / Overpass / SMHI / jsDelivr / unpkg. Inga Translate-prompts.
- **1.6** Ny `opsec.js` (form-sweep). Vid `DOMContentLoaded` + via MutationObserver för dynamiska fält sätts `autocomplete=off`, `spellcheck=false`, `autocorrect=off`, `autocapitalize=off`, `data-1p-ignore`, `data-bwignore`, `data-lpignore=true`, `data-form-type=other` på alla input/textarea (utom file/submit/button/checkbox/radio/range/color/hidden). Inkluderad i alla 15 sidor före `pwa.js` / `version.js`.
- Service Worker bumpad till `hv-20260430_opsec1`, `opsec.js` tillagd i `FILES` så den cachas offline.

## Vad som testades och valdes bort

- **`<meta http-equiv="Permissions-Policy">`** — fungerar inte via meta-tagg, kräver server-headers. GitHub Pages stödjer inte custom headers utan extern proxy. Lämnat till Sväng 3 (Cloudflare Worker eller Netlify-flytt).
- **Skärpt CSP `default-src 'self'`** i samma commit — ströks medvetet. Kräver att jag verifierar att alla nuvarande inline-script + alla externa fetch-targets täcks korrekt. Felsteg där bryter sidan tyst. Görs i en separat commit med en sida i taget (Sväng 1.2).
- **"Glöm allt"-knapp** — designad i `security.md`, men inte implementerad än. Lägger till i nästa session så jag kan testa knappen i fält innan den blir en vanesak.
- **`git rebase --continue`** strulade efter konfliktlösning (känd git-bug med interaktiv rebase + `core.editor`). Bytte till `merge --no-edit` istället, blev rent.

## Upptäckter som inte syns från ytan

- **CoT-XML-export är inte XML-escape:ad.** Stickprov i `ah.html:749` och `index.html:1278` sätter användarinput direkt i template-string. Testfältet `</cot><evil/>` skulle bryta XML-mottagaren. Inte fixat i denna commit eftersom det kräver att jag verifierar varje template på fem sidor — gör det fokuserat i nästa session med en `audit/cot-fuzz.html` som regression-test.
- **`bump-sw.yml` har `paths-ignore: service-worker.js`** — vilket betyder att en commit som *bara* ändrar SW inte triggar bumpa. Min commit ändrade både SW och HTML, så jobbet triggades och min CACHE-bump skrevs över av CI:s timestamp. Det är OK eftersom `FILES`-listan inte påverkades.
- **`autocomplete=off` har redan satts på 76 ställen, men ojämnt.** `opsec.js` övertar nu det jobbet generellt — manuella `autocomplete`-attribut behålls (de wins via `hasAttribute`-guard), men nya fält fångas automatiskt utan att jag behöver komma ihåg.
- **CI:ns auto-bump pushar utan `[skip ci]` på första pushen, men SLUTAR ladda eftersom själva pushen är `[skip ci]`-flaggad i commit-meddelandet.** Bra design, krockade dock med min lokala bump.
- **README dagboks-stil är imponerande** — daterade entries med fas-numrering. Värt att underhålla men inte i denna commit.

## Förslag till nästa svängn — rangordnade

1. **CoT-XML-escape (Sväng 1.4).** Högt allvar — kan injicera fientlig XML i mottagar-TAK. Behöver `escapeXml()`-helper + sweep av varje `${...}` på fem CoT-sidor (index, ah, scrim, what, weft) + en `audit/cot-fuzz.html` som regression-test.
2. **"Glöm allt"-knapp (Sväng 1.5).** En kort `opsec.html` med en knapp som rensar localStorage, sessionStorage, alla IDB-databaser, alla caches, avregistrerar SW, navigerar till `about:blank`. Länkad från footer i alla sidor.
3. **CSP-skärpning (Sväng 1.2).** En sida i taget — börja med `vader.html` och `obo.html` (enklast, minst beroenden). Verifiera att inget bryts; gå sedan vidare. Mål: `default-src 'self'; connect-src 'self' https://nominatim.openstreetmap.org https://overpass-api.de https://opendata.smhi.se; img-src 'self' data: blob: https://*.tile.opentopomap.org https://tile.openstreetmap.org; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; font-src 'self'; object-src 'none'; base-uri 'self'`.
4. **Self-hosta Leaflet och exifr (Sväng 2.1).** Tar bort `cdn.jsdelivr.net` och `unpkg.com` från CSP `script-src`. Kan göras tillsammans med 3 så att CSP slutligen kan vara `script-src 'self' 'unsafe-inline'`.
5. **Emoji-borttagning (Sväng 1.7).** Stor sveptid men ren UX-vinst. Gör efter 1, 2, 3 så koden runt knappar är lugn.

## Verifieringsstickprov efter deploy

När CI har auto-bumpat, ska följande stämma i prod:

- DevTools Network: 0 requests till `cdn.jsdelivr.net` och `unpkg.com` med Referer = `https://7srapport.com` (de ska finnas men utan referer).
- Öppna `index.html`-kartmodalen i fresh Chrome inkognito → **ingen** position-prompt. Klicka istället på `gpsBtn` → prompt kommer.
- DevTools Console: `$$('input').filter(el => !el.matches('[type=file],[type=submit],[type=button],[type=checkbox],[type=radio],[type=range],[type=color],[type=hidden]')).every(el => el.getAttribute('autocomplete') === 'off')` returnerar `true`.
- View Source på vilken sida som helst: `<meta name="referrer" content="no-referrer">` och `<meta name="google" content="notranslate">` finns nära toppen.
