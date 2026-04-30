# OPSEC-audit — 7S Rapport

**Datum:** 2026-04-30
**Hotmodell:** Operatören kör verktyget på en icke-härdad enhet, ofta på publika nät. Motståndaren har potentiellt tillgång till ISP-metadata, tredjepartsloggar och i värsta fall enheten själv. Inget får återskapas av annan part än operatören och avsedd mottagare. Verktyget ska se ut som vilken obetydlig sida som helst i metadata.

Notation: ✅ uppfyllt, ⚠️ partiellt, ❌ ej uppfyllt, ◯ kan inte verifieras statiskt.

---

## 1. Permissions-anrop

| API | Förekomster | Bakom explicit fingertryck? |
|---|---|---|
| `navigator.geolocation` | 14 anrop över 8 filer | ❌ **Sex passiva anrop** vid kartmodal-öppning (index/ah/scrim/what/weft/obslosa). Fixas i Sväng 1. Alla `gpsBtn`-/`mgrsBtn`-anrop är OK. |
| `getUserMedia` | 0 | ✅ Används inte. |
| `Notification.requestPermission` | 0 | ✅ Inte i koden. PWA-banner använder `beforeinstallprompt` som är passivt event från browsern, inte vår initierade prompt. |
| `navigator.clipboard.writeText` | ~30 | ✅ Alla i klick-handlers. |
| `navigator.clipboard.readText` | 0 | ✅ Inte i koden. |
| `navigator.share` | ~25 | ✅ Alla i klick-handlers. |
| `Permissions API .query/.request` | 0 | ✅ Vi gör inga preflight-permissions. |
| `Bluetooth`, `USB`, `Serial`, `HID`, `NFC`, `WakeLock`, `Sensor` | 0 | ✅ Inte i koden. |

**Åtgärd:** I `roadmap.md` Sväng 1, post 1 — ta bort `if (navigator.geolocation) { ... }`-blocket från `openMapModal()` i alla sex filer. Användaren har redan `gpsBtn` för explicit position och kan dra/klicka manuellt på kartan.

## 2. Tredjepart-domäner

Konkret lista:

| Domän | Anrop | Vid varje sidöppning? | Åtgärd |
|---|---|---|---|
| `cdn.jsdelivr.net` | exifr-script (foto-EXIF) | Ja, i ah/index/scrim/what/weft | Self-hosta `fonts/`-mönstret. |
| `unpkg.com` | Leaflet CSS + JS | Ja, i ah/index/scrim/what/weft + minkarta + sensorskiss | Self-hosta. SRI-hashar finns redan, så bara byta URL till lokal kopia. |
| `nominatim.openstreetmap.org` | Reverse-geocoding | Bara vid kart-klick eller adressuppslag, alltid på user-intent | Behåll men dokumentera; långsiktigt: tile-proxy som även proxy-ar Nominatim. |
| `overpass-api.de` | Sjö/ön-namn fallback | Som ovan | Som ovan. |
| `tile.openstreetmap.org`, `*.tile.opentopomap.org` | Karttiles | Bara när kartmodalen öppnas | **MBTiles/PMTiles-offline** är enda äkta lösningen. Sväng 3. |
| `opendata.smhi.se` | Vädervarning + prognos | I `vader.html` när användaren begär | OK — svensk myndighet, men dokumentera i UI vad som skickas. |
| `github.com`, `7srapport.com` | Klick-länkar i footer / dokumentation | Aldrig fetch | OK. |

**Inte upptäckta** (bra): Sentry, Plausible, Google Analytics, Hotjar, Cloudflare Analytics, Mixpanel, Amplitude. Vi har ingen telemetri.

## 3. Karttiles → SIGINT

Tile-requests till `*.tile.opentopomap.org` och `tile.openstreetmap.org` skickar visningsrutans z/x/y, vilket är **användarens position med ~1 km precision**. Det är ett känt problem. Tre vägar framåt:

1. **Egen tile-proxy** på 7srapport.com (CORS-passthrough). Tar bort tredjepart-loggning men inte oss själva — och proxy-server är ny attackyta.
2. **MBTiles/PMTiles offline** för förvalda områden (Sverige delat i regioner som operatören laddar ned). Inga utgående requests, men förladdning krävs.
3. **Båda** — proxy som default, MBTiles som "härdat läge".

Min rekommendation: Sväng 3, börja med att packa fyra-fem PMTiles-bundles för svensk täckning (Skåne, Mälar, Norr, Gotland, hela landet). PMTiles går att hosta som statiskt på samma GitHub Pages-domän, alltså inga nya servrar. UI-toggle: "Härdat läge" som låser kartan till offline-tiles.

## 4. Telemetri / analytics

Inga spår av Sentry, GA, Plausible, Mixpanel, etc. ✅

`grep -r "analytics\|track\|sentry\|gtag\|fbq\|hotjar\|plausible" *.html *.js` returnerar bara träffar i kommentarer och i "GitHub-tracker"-stränganalys. Inga aktiva script.

## 5. Foto-EXIF

EXIF-läsning sker via `exifr` lokalt i klienten. ✅ Bilden skickas inte till tredjepart för parsing. **Men:** scriptet hämtas från jsDelivr — varje sidöppning loggar IP där, oavsett om EXIF-funktionen någonsin används. Self-hosting är fixet.

## 6. CoT-XML — encoding

❌ Inte XML-escape:ad. Stickprov i `ah.html` rad 749 och `index.html` rad 1278 sätter användarinput direkt i template-string utan substitution. Sväng 1-fix:

```js
const escapeXml = s => String(s ?? '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
```

Sätts runt varje `${...}` som hamnar inuti CoT. Verifiering: testfältet `</cot><evil/>` ska bli `&lt;/cot&gt;&lt;evil/&gt;` i den exporterade filen.

## 7. Storage-inventering

| Mekanism | Innehåll | Krypterad? |
|---|---|---|
| `localStorage` | TNR-format, kart-cache, drawing-toggle, sensor-form data, sliders | Nej |
| `sessionStorage` | Diverse | Nej |
| `IndexedDB` (`minkarta`, `sensorskiss`) | Hela ritningen — minor, sensorer, koordinater | Nej |
| `Cache API` (sw) | Hela appen + ortnamn.json (9 MB) | Nej |
| Cookies | Inga setCookie i koden | – |

❌ **"Glöm allt"-knapp saknas.** Sväng 1-fix: en knapp i en gemensam "OPSEC"-meny som anropar:

```js
async function nukeEverything() {
  localStorage.clear();
  sessionStorage.clear();
  // IndexedDB databases
  for (const name of ['minkarta', 'sensorskiss']) {
    await new Promise(r => { const req = indexedDB.deleteDatabase(name); req.onsuccess = req.onerror = req.onblocked = r; });
  }
  // Service worker caches
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }
  // Service worker själv
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
  }
  location.replace('about:blank');
}
```

Bekräftelsedialog krävs eftersom det också tar bort offline-cache (kräver återhämtning vid uppkoppling).

## 8. Referer / URL-läckor

⚠️ Initial fix `<meta name="referrer" content="no-referrer">` bröt karttile-laddningen (OpenTopoMap blockerar/throttlar requests utan Referer enligt OSM-policy). Bytt till `<meta name="referrer" content="strict-origin">`: skickar bara `https://7srapport.com` (utan path) till cross-origin. Origin är ändå publikt via DNS/SNI; ingen ny läcka jämfört med no-referrer, men kartan får sin Referer och slutar throttlas. Path inom 7srapport.com läcker fortfarande inte.

✅ Inga `?param=`-querystrings för rapportdata sett.
✅ Inga rapportfält i URL hash.
✅ Inga email-länkar med rapportdata.

## 9. HTTP-headers

GitHub Pages sätter inte custom headers utan en proxy framför. Vad vi kan göra med `<meta http-equiv>`:

| Header | Effekt via meta? | Plan |
|---|---|---|
| `Content-Security-Policy` | Ja, via `<meta http-equiv>` | Skärp till `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.tile.opentopomap.org https://tile.openstreetmap.org https://*.openstreetmap.org; connect-src 'self' https://nominatim.openstreetmap.org https://overpass-api.de https://opendata.smhi.se https://api.met.no; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'` — efter att jsDelivr/unpkg flyttats lokalt. |
| `Referrer-Policy` | Ja, via `<meta name="referrer">` | `no-referrer` |
| `X-Content-Type-Options`, `HSTS`, `Permissions-Policy` | **Nej**, fungerar inte via meta | Behöver host-konfigurering. **GitHub Pages stöder inte detta.** Långsiktigt: lägg en lättviktsproxy (Cloudflare Worker mot egen origin) framför som sätter dessa headers; *eller* migrera till Netlify/Vercel där headers stöds. Dokumenterat. |

`'unsafe-inline'` är nödvändigt eftersom alla nuvarande HTML-filer har inline-script. Det är en kompromiss i Sväng 1; Sväng 2 bör flytta inline-blocken till externa filer så `'unsafe-inline'` kan tas bort. Det är en stor refactor som måste göras kontrollerat.

## 10. Source maps & klient-bundle

Vi har inga byggsteg → inga source maps. `grep -ri "apikey\|secret\|token\|bearer\|password=" *.html *.js` ger inga träffar i koden. ✅

## 11. Form-beteende

Sätts på `<input>`/`<textarea>` ojämnt. Sväng 1-fix: ett enkelt JS-sweep som vid `DOMContentLoaded` tilldelar:

```js
document.querySelectorAll('input,textarea').forEach(el => {
  if (!el.hasAttribute('autocomplete')) el.setAttribute('autocomplete', 'off');
  el.setAttribute('spellcheck', 'false');
  el.setAttribute('autocorrect', 'off');
  el.setAttribute('autocapitalize', 'off');
  el.setAttribute('data-1p-ignore', '');
  el.setAttribute('data-bwignore', '');
  el.setAttribute('data-lpignore', 'true');
  el.setAttribute('data-form-type', 'other');
});
```

Lägg i ny `opsec.js` som inkluderas före övriga script. Undantag: foto-`<input type="file">` ska inte ha `autocomplete=off` på sig (irrelevant där).

`<meta name="google" content="notranslate">` lägger jag in också så att Translate-prompts inte föreslås.

## 12. Service Worker

`service-worker.js` (rad 1–73):
- ✅ Cachar bara same-origin filer.
- ✅ Ingen background sync.
- ✅ Ingen prefetch mot tredjepart.
- ⚠️ Cache-namnet (`hv-20260430_061301`) är en datum-stämpel — bra för invalidation, men avslöjar build-tid i devtools för någon med tillgång till enheten. Mindre risk; lämna.
- ⚠️ `addAll(FILES)` — om någon fil saknas i prod (404) misslyckas hela installationen. Bör loggas, idag tyst fallback.

## 13. Clipboard-användning

`navigator.clipboard.writeText(text)` används för att kopiera CoT-XML och rapport-text. Andra tabs i samma origin kan läsa clipboard på `navigator.clipboard.readText()`. Risken här är begränsad eftersom användaren själv betalar för kopian och webbläsaren visar att vi gjort det.

⚠️ **Inget TTL.** Texten kan ligga kvar i clipboard tills nästa kopia. Mikrocopy-fix:
```text
"Text kopierad. Klistra in i Signal nu — clipboard rensas inte automatiskt."
```

## 14. Subresource Integrity

✅ exifr (jsDelivr) och Leaflet (unpkg) har `integrity` och `crossorigin`. Stickprov verifierat i `ah.html` rad 16–18. Bra. När vi self-hostar kan vi släppa SRI eftersom det är samma origin.

---

## 15. Sårbarhetstest — försök bryta verket

Det här är en lista av vad som **bör testas**, samt mina statiska fynd där applicerbart:

1. **XSS i fritextfält** → CoT-XML är inte escape:ad. ❌ Fix i Sväng 1.
2. **HTML-injection i Signal-share-text** → Signal renderar inte HTML, så inkast i klartext är ofarligt på mottagarsidan. Men `navigator.share({text: ...})` på Android kan i vissa appar tolka HTML-liknande syntax. Lågt allvar; lämna.
3. **Open redirect** → inga `window.location = userInput`-mönster sett.
4. **DOM-clobbering på id-baserade selektorer** → koden använder `getElementById('foo')` extensivt. Om en attacker kan injicera HTML kan de skapa `<form id="foo">` och störa lookups. Bara ett problem **om** vi har inputs som renderas som HTML — och det gör vi inte (vi renderar via `textContent` eller template-strängar i textarea).
5. **Prototype pollution** → vi använder inga gamla bibliotek (Leaflet 1.9.4 är OK, exifr 7 är OK).
6. **`npm audit` / `osv-scanner`** → ingen package.json. Inte applicerbart.
7. **Cache-poisoning av Service Worker** → SW använder network-first för HTML/JS. En MITM som kan intercepta TLS kan poisoning:a cachen. Det är samma anfallsyta som första HTTP-fetchen — alltså inte ett nytt hot.
8. **Tabnabbing** → alla `target="_blank"` har `rel="noopener noreferrer"`. ✅
9. **Timing-attacker mot inloggat tillstånd** → vi har ingen inloggning. Inte applicerbart.

---

## 16. Slutsats — vad fixas idag, vad fixas senare

**Sväng 1 (idag, push live):**
1. Ta bort sex passiva geolocation-anrop i `openMapModal()`.
2. Skärp CSP-meta i alla 15 HTML-filer.
3. Lägg till `<meta name="referrer" content="no-referrer">`.
4. Lägg till `<meta name="google" content="notranslate">`.
5. XML-escape:a all CoT-XML-output.
6. "Glöm allt"-knapp i en gemensam OPSEC-meny.
7. Form-sweep via ny `opsec.js`.

**Sväng 2:**
- Self-hosta Leaflet och exifr.
- Bryt ut inline-script till externa filer så `'unsafe-inline'` kan strykas i CSP.
- Tile-proxy (om vi orkar driva en).

**Sväng 3:**
- PMTiles offline-bundles för svensk täckning.
- Cloudflare Worker eller Netlify-flytt för riktiga HTTP-headers (HSTS, Permissions-Policy, X-Content-Type-Options).
