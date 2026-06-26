# Roadmap — "Om projektet" + Skolorna

**Datum:** 2026-05-04
**Skala:** Text-/copy-uppdatering + design-token-migrering. Inga funktionella förändringar.
**Berörda filer (i prioritetsordning):** `footer.js` (Om projektet-modal renderas där, gemensam för alla 16 sidor), `minkarta-tutorial.css`, `sensorskiss-tutorial.css`, `minkarta.html`/`sensorskiss.html` (deklarerar `:root`-tokens som tutorial-CSSen ska ärva).

---

## Bakgrund — vad jag faktiskt ser idag

### Om projektet-modalen

- **Bor i `footer.js:39-152`** (inte inline i HTML — duplicering är därför inget problem; modalen renderas av samma JS på alla sidor som inkluderar `footer.js`).
- **Stäng-knappen** är samma `aboutToggle`-`<button>` som öppnar modalen — texten ändras mellan "Om projektet" och "Stäng" (`footer.js:123-127`). Ren inline-style som länk.
- **Hårdkodade hex-färger** överallt: `#152815`, `#2d4a2d`, `#8aaa8a`, `#4caf50`, `#c8a24e`, `#1a0a0a`, `#6b2020`, `#d4a0a0`, `#e05050` — duplicerar `--bg-secondary`/`--border`/`--text-secondary`/`--accent`/`--warn`/`--danger`-tokens.
- **Texten "13 formulär"** är fortfarande korrekt om vi räknar enbart rapport-sidor (index.html=7S, what, scrim, weft, ah, obslosa, fors, pedars, postschema, eobusare, obo, rassoika, vader = 13). Men den nämner inte att MINKARTA + SENSORSKISS finns som verktyg.
- **"I skarpt läge"-stycket** är tekniskt föråldrat: rekommendationen är fortfarande "undvik kartfunktionen", men sedan texten skrevs har Härdat läge (PMTiles, [`pmtiles-layer.js`](../pmtiles-layer.js)) och "Spara område offline" (Cache API, [`offline-tiles.js`](../offline-tiles.js)) tillkommit. Båda dessa eliminerar tile-requests när man väl satt på dem. SMHI-anropet i VÄDER är inte täckt.
- **Övriga interaktiva element**: feedback-länken är en `<a>`, "Om projektet"-toggle är en oskodd `<button>`. Båda saknar `.btn`-klass — det är medvetet (subtil länk-stil i sidfoten), men de ser inkonsistenta ut bredvid de nya `.btn`-knapparna ovanför.

### Skolorna (tutorials)

**Stort ✅ — selektorer och text behöver INTE uppdateras** efter knapp-migreringen:

- `minkarta-tutorial.js` har bara dessa target-selektorer: `#mapContainer`, `.status-row`, `#paletteRoot`, `[data-tool="strv_tryck"]`, `[data-tool="tramp"]`, `[data-tool="upk"]`, `[data-tool="ytter"]`, `#mgrsSearch`, `#protoPanel` — **inga** map-control-knappar.
- Tutorial-texten innehåller heller inte ord som "checkbox", "kryssa", "bocka i", "Härdat", "Maximera" eller "toggle". Hela tutorial-flödet handlar om kartan, sökraden, paletten och protokollet — inte om controls-raden.
- `.mkt-launcher` är redan migrerad till `class="btn btn-sm btn-default mkt-launcher"` (`minkarta-tutorial.js:954-959`); CSSen för `.mkt-launcher` är redan borta (kvarstår bara som kommentar i `minkarta-tutorial.css:230-233`).
- `.mkt-launcher-row` ligger redan i sin egen `.mk-controls-row` — separator ritas korrekt.
- `Mini-skola`-knappen i sensorskiss är också redan `.btn .btn-sm .btn-default` (`sensorskiss.html:1761-1764`).
- `sensorskiss-tutorial.js` är ren modal — inga spotlight-targets alls.

**Det som faktiskt återstår på tutorial-sidan:**

1. Tutorial-bubblor (`.mkt-bubble`, `.mkt-toast`, `.mkt-menu`, `.mkt-album-*`, `.mkt-diploma-*`) använder mestadels CSS-variabler men har egna fallback-värden och en avvikande accent-färg: `--mkt-accent: var(--accent, #d4a256)` — fallbacken är en gulorange ton, inte den gröna `#4caf50` som faktiskt definieras i `:root`. När variabeln finns blir det grönt; men knappar i bubblor (`.mkt-primary`) använder `--mkt-accent` som bakgrund med svart text — fungerar OK med grönt också.
2. Knapparna inuti tutorial-bubblor (`.mkt-bubble-actions button`, `.mkt-toast-actions button`, `.mkt-bubble-close`) är **helt egen styling** — inte `.btn`-systemet. Det är en medveten ö-design, men `:focus-visible`-ringen från designsystemet saknas, och `prefers-reduced-motion` respekteras bara delvis (`mktTargetPulse` keyframes saknar reduced-motion-skydd).
3. Sensorskiss-tutorial CSS (`.sk-tut-skip`, `.sk-tut-prev/next/finish`, `.sk-tut-symbol-card`) är också egen ö-design med liknande luckor. `.sk-tut-symbol-card` har vit `#fff`-bakgrund (för symbolernas svarta SVG ska synas) — det är korrekt och får inte ändras.
4. Symbol-album-korten (`.mkt-album-card-svg`) har `background: #fff` av samma anledning. OK, dokumenteras som avsiktligt.

---

## Designprinciper

- **Återanvänd `.btn`-systemet** för Om projektet-modalens CTA (Stäng-knapp får bli `.btn .btn-sm .btn-default` när modalen är öppen). Sidfots-toggle får behålla länk-stilen — den är medvetet liten och anonym.
- **Behåll mörkgrön OPSEC-palett.** Ersätt hårdkodade hex-värden med `:root`-tokens där en token redan existerar. Sparad varning (`#c8a24e`/`#2a1a0a`/`#1a0a0a`/`#6b2020`/`#e05050`) kvarstår som inline — inga generella tokens för dessa, och varningen ska sticka ut.
- **Inga emojis i kod.** Befintliga emojier i UI-text (`✅`, `⚠`, `📷`, `⛶`) får stanna. Ny text introducerar inte emojis.
- **OPSEC-tonen genomsyrar texten:** kort, saklig. Skarpt-läge-stycket ska vara en konkret arbetsgång, inte marknadsföring.
- **Tutorial-bubblor**: respektera `prefers-reduced-motion` även för pulse-animationer (för närvarande bara skyddade i `.btn`-CSS:en).
- **Inga nya externa beroenden, ingen ny build, ingen CSP-ändring.**

---

## Faserad plan

### Fas 1 — Om projektet: faktauppdatering + designsystem-städning **(idag)**

**Fil:** `footer.js`.

- **Behåll** "13 formulär" — det är korrekt för rapport-sidor. Lägg till en mening: "Plus två kart-verktyg (MINKARTA, SENSORSKISS) som ritar minläggning respektive sensorskiss."
- **Skriv om "I skarpt läge"-stycket** så det reflekterar dagens arbetsflöde:
  1. Sätt på Härdat läge i MINKARTA/SENSORSKISS — kartan serveras från PMTiles-fil utan tile-requests.
  2. Klicka "Ladda ner offline" en gång på en betrodd anslutning — hela bundlen hashas och cachas lokalt.
  3. Manuell MGRS för positionsinmatning i rapport-formulären (oförändrat råd).
  4. Undvik VÄDER-formuläret — det går alltid till SMHI när det används.
- **Verifiera offline-listan**: lägg till "PMTiles-karta i Härdat läge" och "Cachat kart-område" till "Offline – inga externa anrop".
- **Stäng-knapp**: ge den `class="btn btn-sm btn-default"` när texten är "Stäng" (när modalen är öppen). I "Om projektet"-läge får den behålla länkstilen så den smälter in i sidfoten.
- **Eliminera duplicerade hex-värden**: byt `#152815`→`var(--bg-secondary)`, `#2d4a2d`→`var(--border)`, `#8aaa8a`→`var(--text-secondary)`, `#4caf50`→`var(--accent)`, `#3a5a3a`→en `var(--text-muted)` om kontrast håller.
- **Behåll varningsboxens hex** (`#c8a24e`, `#2a1a0a`) — det är en avsiktligt avvikande färg utan token.
- Verifiera kontrast (WCAG AA, 4.5:1) genom att läsa modalen mot mörkgrön bakgrund.

**Push:** `docs(om-projektet): faktauppdatera skarpt-lage + design-tokens`

### Fas 2 — (utgår — selektor-/textfix för tutorials behövs ej)

Den ursprungliga planens "Spår B Fas 2" (selektor-fix efter knapp-migrering) **stryks** efter verifiering: ingen tutorial-text eller selektor pekar på de migrerade map-controls-knapparna. Lärdom: verifiera koden innan roadmap, inte tvärtom.

### Fas 3 — Tutorial-CSS till designsystem-tokens

**Filer:** `minkarta-tutorial.css`, `sensorskiss-tutorial.css`.

- I `minkarta-tutorial.css`:
  - Korrigera `--mkt-accent: var(--accent, #d4a256)` → `var(--accent, #4caf50)`. Fallback ska vara samma gröna som `--accent`, inte ett gult arv från ett tidigare designsystem.
  - Lägg till `:focus-visible { box-shadow: var(--btn-focus-ring); }` på `.mkt-bubble-actions button`, `.mkt-toast-actions button`, `.mkt-bubble-close`, `.mkt-album-close`, `.mkt-album-footer button`, `.mkt-menu-item`.
  - Wrap:a `mktTargetPulse`/`mktTargetPulseStrong`/`mktBubbleIn`/`mktCardPop`/`mktTapHint`-animationer i `@media (prefers-reduced-motion: no-preference)` så reducerade-rörelse-användare slipper pulserande spotlights.
  - **Behåll** vit `#fff`-bakgrund på `.mkt-album-card-svg` och diplom-stilen (papper-look) — avsiktligt avvikande, dokumenteras som "kontrast-undantag".
- I `sensorskiss-tutorial.css`:
  - Lägg till `:focus-visible { box-shadow: var(--btn-focus-ring); }` på `.sk-tut-skip`, `.sk-tut-prev/next/finish`.
  - **Behåll** vit `#fff` på `.sk-tut-symbol-card` (samma symbol-kontrast-skäl).

**Push:** `feat(tutorial): focus-ring + reduced-motion + accent-fallback`

### Fas 4 — Konsolidering (overstretch)

- Audit/`audit/index.md` uppdateras med en kort not om att Om projektet-texten är levande dokumentation som ska revideras varje gång OPSEC-rådet ändras.
- Eventuellt bryta ut Om projektet-HTML till en separat `about-content.html`-snippet som `footer.js` `fetch()`:ar — men SW-precachen måste då lägga till filen, och fördelen är liten eftersom modalen redan är centraliserad i `footer.js`. **Slutsats:** skippa, inte värt risken.

---

## Risk-lista

1. **Bryta Om projektet-modalens layout** vid token-migrering. *Mitigering:* byt en token i taget och granska visuellt på minst tre sidor (index, ah, opsec).
2. **Kontrast-regression** om `var(--bg-secondary)` är något ljusare/mörkare än det inline-värde som ersätts. *Mitigering:* tokens definierar exakt samma värden (`#152815` = `--bg-secondary`).
3. **Stäng-knappen kan se för dominant ut** efter `.btn .btn-sm .btn-default`-migrering — en stor knapp i en sidfot full med små länkar. *Mitigering:* applicera klassen bara när texten är "Stäng" (modalen öppen), behåll länkstilen i "Om projektet"-läge. Om resultatet ändå sticker ut, fall tillbaka till `font-size: 0.7rem` + tonad border.
4. **Feltolkning av "I skarpt läge"-rådet** — användaren kan tro att Härdat läge är default. *Mitigering:* skriv tydligt att det är en aktiv inställning som måste sättas, och att utan den rinner data till OTM/OSM.
5. **Tutorial-fokusring kan klippas** mot spotlight-overlay (z-index). *Mitigering:* `:focus-visible` lägger box-shadow inom själva knappens box; ingen klippning eftersom bubblan ligger ovanpå overlay.
6. **Reduced-motion-skydd kan döda tap-hint** så användaren missar att korten är klickbara. *Mitigering:* behåll en svag statisk skugga på `.mkt-album-card:not(.discovered)` även när motion är reducerat.

## Test-plan

- **Desktop (Chromium):** öppna Om projektet på `index.html`, `ah.html`, `opsec.html`, `vader.html`. Verifiera samma utseende, läsbarhet och att Stäng-knappen reagerar.
- **Mobil-bredd (375 px):** verifiera att texten radbryts korrekt, att varningsboxen fortfarande sticker ut, och att inga knappar går utanför viewport.
- **Tutorial-flöde, första gång:** rensa `localStorage` → öppna `minkarta.html` → verifiera att toast dyker upp, att Steg 1 spotlight pulserar mot kartan, att fokus-ring syns vid Tab.
- **Tutorial-flöde, spela om:** klicka "Lär dig MINKARTA" → menu visas → verifiera att Stäng på bubblan har fokus-ring, att Diplom-knapparna är fokuserbara.
- **Sensorskiss Mini-skola:** öppna `sensorskiss.html` → klicka Mini-skola → verifiera att Hoppa över / Tillbaka / Nästa / Slutför har fokus-ring och fungerar.
- **Reduced-motion-OS:** macOS Settings → Accessibility → Reduce motion (eller DevTools "Emulate prefers-reduced-motion") → ladda om → verifiera att tutorial-pulser och album-tap-hint är borta men att korten fortfarande ser klickbara ut.
- **WCAG-kontroll:** spot-check med ögat på Om projektet-texten (`var(--text-secondary)` mot `var(--bg-secondary)` ≈ `#8aaa8a` mot `#152815` ≈ 6:1, OK).

## Vad denna roadmap *inte* gör

- Skriver inte om CoT-XML-säkerhet (`audit/security.md` post 6) — separat roadmap.
- Bryter inte ut Om projektet-texten till en delad HTML-fil — modalen är redan centraliserad i `footer.js`.
- Lägger inte till några nya externa anrop, ikoner eller beroenden.
- Rör inte `service-worker.js` `CACHE`-strängen — CI sköter den.
- Migrerar inte tutorial-knapparna till `.btn`-systemet helt — de är medveten ö-design (passar bubble-stilen).

## Slutkriterium "version 1 levererad"

Fas 1 + Fas 3 pushade. I produktion:
- Om projektet-modalens "skarpt läge"-stycke beskriver Härdat läge + offline-cache som primär arbetsgång.
- Modalen nämner att det finns två kart-verktyg (MINKARTA, SENSORSKISS) utöver de 13 rapport-formulären.
- Stäng-knappen ser ut som en designsystem-knapp i Stäng-läge, men förblir en länk i "Om projektet"-läge.
- Hårdkodade hex i modalen är ersatta med tokens där en token finns.
- Tutorial-bubblor + sensorskiss-tutorial respekterar `prefers-reduced-motion` och har synlig `:focus-visible`-ring på alla knappar.
- Inga regressioner i `index.html`, `ah.html`, `scrim.html`, `what.html`, `weft.html`, `obslosa.html`, `vader.html`, `opsec.html`, `minkarta.html`, `sensorskiss.html`.
