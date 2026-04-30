# 7S Rapport — Statisk audit

**Datum:** 2026-04-30
**Skala:** 15 HTML-sidor, ~7 JS-moduler, vanilla stack utan byggsteg, hostad på GitHub Pages.
**Begränsning i detta pass:** Statisk kodanalys via grep/läsning. Lighthouse, axe-DevTools, WAVE och faktiska skärmdumpar går inte att producera från CLI utan en faktisk browser. Detta sägs rakt ut istället för låtsas-resultat. Verifiering i fält måste göras manuellt med uppställningen som föreslås i `roadmap.md` Sväng 1, post 12.

## 1. Arkitektur — vad jag faktiskt ser

- 15 separata HTML-sidor som var och en innehåller hela sitt UI inline (CSS + JS i `<style>` och `<script>`). Storlek per sida: 22 KB → 153 KB (`minkarta.html`). Stor del av stilen och en del JS är duplicerad mellan filer.
- Gemensamma moduler är externa `.js`-filer: `pwa.js`, `version.js`, `minkarta-*.js`, `sensorskiss-*.js`.
- PWA: `service-worker.js` (network-first för HTML/JS, cache-first för annat), `manifest.json`, ikoner.
- Inga byggsteg. Inga `package.json`. Allt är direkt redigerbart och deployas via `git push` mot `main` på GitHub Pages.
- README + 12 roadmaps i repo-roten (några overlappande). Det här är *gediget kvalitetsdokumenterat* arbete — men dokumentmängden börjar bli en risk i sig (svårt att se vad som är gällande).

## 2. Externa runtime-domäner

Greppat över alla `.html` och `.js`. **Detta är vad varje besökare faktiskt kontaktar i prod:**

| Domän | Använd för | Risk |
|---|---|---|
| `cdn.jsdelivr.net` | exifr-bibliotek (CoT-formulär) | SRI satt. Tredjepart-CDN ser dock IP + user-agent vid varje sidladdning. |
| `unpkg.com` | Leaflet CSS + JS | Samma. |
| `nominatim.openstreetmap.org` | Reverse-geocoding (gatuadress från klick) | Skickar **användarens valda position** till tredjepart. **Stort.** |
| `overpass-api.de` | Sjö/ö-namn fallback | Skickar koordinatområde. |
| `tile.openstreetmap.org` | Karttiles (z 18–19) | **Skickar användarens visningsruta = position.** |
| `*.tile.opentopomap.org` | Kart-tiles (z ≤ 17) | Samma. |
| `opendata.smhi.se` | Väderprognos | Skickar koordinat till SMHI (svensk myndighet — bättre än CDN, men ändå utgående). |
| `fonts/inter*.woff2` (lokal) | Typografi | Self-hosted. Bra. |
| `github.com` | Versionslänk i footer + fork-info | Klick-länk, inte runtime-fetch. OK. |

`fonts.googleapis.com`/`fonts.gstatic.com` syntes i grep men endast i kommentarer/license-text, inte i `<link>`-taggar. Bra.

**Nettobedömning:** Två tredjepartshändelser — script-CDN:er (`cdn.jsdelivr.net`, `unpkg.com`) och adressuppslag (`nominatim`, `overpass`) — körs vid varje sidöppning eller adressval och loggar IP. Karttiles körs när kartan visas. Kärnflödet "skriv 7S-rapport och kopiera text" kräver däremot inga externa anrop alls efter första sidladdningen tack vare service-workern.

## 3. Permissions — anrop och deras trigger

| Fil | Rad | Anrop | Trigger | Bedömning |
|---|---|---|---|---|
| `index.html` | 773 | `navigator.geolocation.getCurrentPosition` | knapp `gpsBtn` (📍 MGRS) | OK — explicit klick |
| `index.html` | **1090–1096** | `navigator.geolocation.getCurrentPosition` | **`openMapModal()` öppning** | **BRYTER REGEL** |
| `ah.html` | 596 | gps | `gpsBtn` | OK |
| `ah.html` | **1082–1085** | gps | `openMapModal()` | **BRYTER REGEL** |
| `scrim.html` | 516 | gps | `gpsBtn` | OK |
| `scrim.html` | **996–998** | gps | `openMapModal()` | **BRYTER REGEL** |
| `what.html` | 542 | gps | `gpsBtn` | OK |
| `what.html` | **1023–1025** | gps | `openMapModal()` | **BRYTER REGEL** |
| `weft.html` | 591 | gps | `gpsBtn` | OK |
| `weft.html` | **1150–1152** | gps | `openMapModal()` | **BRYTER REGEL** |
| `obslosa.html` | 558 | gps | `gpsBtn` | OK |
| `obslosa.html` | **922–924** | gps | `openMapModal()` | **BRYTER REGEL** |
| `vader.html` | 155 | gps | knapp `mgrsBtn` (🌐 Min plats) | OK |

**Konsekvens:** Sex av sju kartmodaler triggar geolocation-permission-prompt **bara genom att man öppnar kartan**, även om användaren bara vill klicka manuellt på en plats eller bara titta. Det bryter explicit mot den hårda regeln i uppdragsbeskrivningen och är fixat i Sväng 1.

`navigator.clipboard`, `navigator.share` används bara i lyssnar-callbacks (knapp-klick) — OK. `getUserMedia`, `Notification.requestPermission`, `Bluetooth`, `USB`, `Permissions API.request`, `mediaDevices` — **inga träffar någonstans**. Bra.

## 4. CSP, headers, referrer

- Alla 15 HTML-filer sätter **endast** `<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`. Det är en CSP utan `default-src` — alltså ingen reell sandboxing av script-källor, frame-källor, eller anslutningar. Att enbart upgrade:a HTTP är *inte* en CSP, det är en hint. Fix i Sväng 1.
- **Referrer-Policy**: ingenstans satt. Default i moderna browsers är `strict-origin-when-cross-origin`, vilket betyder att `https://7srapport.com` läcks till varje tile-server, Nominatim, Overpass, SMHI, jsDelivr, unpkg. Det är inte en katastrof men bör skärpas till `no-referrer`.
- **X-Content-Type-Options**, **Permissions-Policy** — inte satta.
- Alla `target="_blank"` har `rel="noopener noreferrer"`. Bra.

GitHub Pages tillåter inte custom HTTP-headers utan extra mellanlager. Vi får sätta vad vi kan via `<meta>`-taggar och dokumentera resten i `security.md`.

## 5. Storage

- `localStorage` används överallt: `mapLastPos`, `pwaInstallSnoozeUntil`, `tnrFormat`, sliders state, kartetiketter, sensorskiss-formdata.
- `sessionStorage` används mer sparsamt.
- `IndexedDB`: minkarta + sensorskiss persisterar fullständigt drawing-state.
- `Cache API` (Service Worker): hela appen + ortnamn.json (~9 MB).
- **Ingen "Glöm allt"-knapp.** En av de viktigaste OPSEC-svagheterna — om enheten tas är allt sparat tillgängligt utan kryptering.

## 6. Form-beteende

- 76 förekomster av `autocomplete=`/`spellcheck=`-attribut spridda över 15 filer. Tunt; inte ett genomgående mönster.
- Stickprov i `index.html`: rapportfält (storlek, slag etc.) har ofta `autocomplete="off"` men inte `data-1p-ignore` / `data-bwignore` / `spellcheck="false"`. Browsers kan fortfarande spara dem som auto-fyll-historik, och 1Password/Bitwarden kan föreslå att spara taktisk text.

## 7. CoT-XML — encoding

CoT-XML genereras med template-strängar. Stickprov i `ah.html` rad 749 och `index.html` rad 1278 visar **ingen XML-escape** av användarinput innan inläggning i `<event>` / `<contact callsign="..." />` etc. Det betyder:

```text
Namn: "</contact><evil/>" + bröd
```

…producerar trasig, potentiellt injicerbar CoT. Mottagar-TAK-klienten kan i värsta fall få oväntad XML. **Det här är XSS/XXE-risk i mottagarmiljön.** Måste fixas med en konsekvent `escapeXml()` runt **all** användarinput. Detta är en Sväng 1-fix men kräver att jag verifierar varje template — sätt på roadmap som dedikerad punkt.

## 8. Kod-renlighet — luddet i veck

Mest synligt utan att läsa allt:

- Stor mängd duplicerad CSS i varje HTML-fil. Hård att underhålla. En extern `app.css` skulle ta bort några hundra duplicerade rader per fil.
- Många emoji i UI: `📍 🗺 ✓ ⏳ ✅ 🛰 🚁 ☁ 🌐 ⚙` — bryter designdirektivets krav på inline-SVG-ikoner. Sväng 1-fix.
- 12 separata roadmap-filer. Den här auditen lägger en till. Konsolidering behövs i Sväng 2.
- `screenshot_*.png` och `20260409_153702.png` i repo-roten är otaggade screenshots från ev. en bug-rapport. Bör flyttas till `audit/` eller `docs/` eller tas bort.
- `kriterier.xml` (337 KB), `sjöar.xml`, `öar.xml` (filnamn med å,ö i raw-roten) — råa parse-källor, bör vara i `raw/`. `sjöar.xml` finns redan i raw enligt mappen, så de i roten verkar vara duplikat.
- `parse-ortnamn.js` och `parse-ortnamn-all.js` — namnet antyder två versioner av samma sak.

## 9. Fem icke-uppenbara tillägg som skulle vara värdeskapande

Inte i prompten men starka kandidater för Sväng 2/3:

1. **Reglements-driver för andra rapportstrukturer.** Idag är 7S, OBSLÖSA, FORS osv. hårdkodade som separata sidor. Om strukturen vore data (JSON-mall + ett render-bibliotek) kunde nya rapporttyper läggas till på minuter och användarens egna mallar bli del av samma motor.
2. **Kompass-overlay i kartmodalen.** Nu är det bara MGRS/lat-lon. För 7S är *Sysselsättning* riktning — en visuell kompass som låter användaren peka i kartan på riktning ger snabbare och säkrare inmatning än kors-väljaren.
3. **Diff-läge för rapporthistorik.** "Vad ändrades sedan förra patrullposten?" är en återkommande fråga. Diff mellan två sparade rapporter i samma flöde sparar tid och tankebredd hos chefen.
4. **Tyst återbörjan.** Om appen kraschar mitt i en rapport (handske + skärm i regn) bör senast inskrivna data vara där exakt som det var. Idag verkar IndexedDB bara användas för minkarta/sensorskiss; rapportformulären har localStorage-fragment men inte fullständig dirty-state-snapshot.
5. **Reglerbart mörkningsläge.** Nattläge är inte bara röd-på-svart — det är också *aldrig en lampblixt*: ingen aria-live-toast som lyser upp skärmen. En genomgående "ljud-/blixt-paus" är värd ett separat designdrag.

Detaljerade argument finns i `roadmap.md`.

## 10. Slutsats för Fas 1

Det viktigaste den här auditen hittar är:

1. **Sex passiva geolocation-prompts vid kartmodal-öppnande.** Direkt brott mot hårdregeln. Fixas i Sväng 1.
2. **CSP är dekorativ.** Fixas i Sväng 1.
3. **CoT-XML är inte XML-escape:ad.** Fixas i Sväng 1 efter verifiering.
4. **"Glöm allt"-knapp saknas.** Sväng 1.
5. **Externa script-CDN:er** (jsdelivr, unpkg) bör self-hostas. Sväng 2.
6. **Karttiles loggar fortfarande position.** Bara MBTiles-/PMTiles-offline löser det. Sväng 3.
