# Roadmap — enhetliga, intuitiva knappar

**Datum:** 2026-05-04
**Skala:** UI-polish, inga funktionella förändringar.
**Berörda filer (i prioritetsordning):** `minkarta.html`, `sensorskiss.html`, `minkarta-tutorial.css`, `sensorskiss-tutorial.css`, sedan övriga 13 HTML-sidor (index, ah, scrim, what, weft, obslosa, vader, fors, pedars, postschema, eobusare, obo, rassoika, opsec).

## Bakgrund — vad jag faktiskt ser idag

`renderMapControls()` i `minkarta.html:1196` och `sensorskiss.html:1579` bygger två
`.mk-controls-row` under kartan:

**Rad 1 (vy/interaktion):**
- `<label><input type="checkbox"> Namn-etiketter</label>` — ser ut som formulärfält
- `<label><input type="checkbox"> Visa modell</label>` (bara minkarta) — samma
- `<button class="btn btn-sm btn-ghost">Panorera / välj</button>` — knapp-stil
- `<button class="btn btn-sm btn-ghost" id="mkFullBtn">⛶ Maximera <span class="mk-tool-shortcut">F</span></button>` — knapp + orange tangent-badge

**Rad 2 (offline/härdning):**
- `<button class="btn btn-sm btn-ghost">Spara område offline</button>`
- `<button class="btn btn-sm btn-ghost">[🛡 Härdat läge] / [🛡 Härdat läge: PÅ]</button>` — sätter inline `borderColor='#c8a24e'` (guld) när PÅ
- `<select class="btn btn-sm btn-ghost">…</select>` — native select med `.btn`-klass: ärver typografin men **inte** bakgrund/border, höjden hamnar fel
- `<button class="btn btn-sm btn-ghost">[⬇ Ladda ner offline] / [✓ Lokalt cachad]</button>` — sätter inline `borderColor='#4caf50'` (grön) när klart
- `<button class="mkt-launcher">Lär dig MINKARTA</button>` — transparent bg, smalare padding, mindre font (definierad i `minkarta-tutorial.css:230`)

### Identifierade brott mot rytm/hierarki

1. **Olika storlekar** mellan knappar i samma rad — `.mkt-launcher` har 0.82rem font + 6px 12px padding, `.btn-sm` har 0.85rem + 8px 14px, native select renderas med browser-höjd (typiskt 28-32 px på Windows Chromium).
2. **Olika border-färger:**
   - default `.btn-ghost`: ingen synlig border (background = `--accent-dim`, ingen border-deklaration → fallbackar till browser-default 0/transparent)
   - Härdat-PÅ: gul `#c8a24e`
   - Cachad: grön `#4caf50`
   - native select: grå browser-default
   - `.mkt-launcher`: `var(--border)` (mörkgrön)
3. **Stil-dropdown** ser ut som ett native formulärelement — bryter visuellt mot resten av raden.
4. **"Lär dig MINKARTA"** har egen stil — transparent + smalare.
5. **Checkbox-labels** ser ut som formulärfält, inte knappar — bryter rytmen i rad 1 där allt annat är knappar.
6. **Disabled** kan i nuläget förväxlas med "active" eftersom `.btn-ghost` också har dim bakgrund.

---

## Designprinciper (etableras i Fas 1)

### Tokens — alla nya och befintliga centraliseras i en `:root`-block

```css
/* Knapp-tokens — single source of truth */
--btn-radius: var(--radius-sm);          /* 4px, befintligt */
--btn-radius-md: var(--radius);          /* 8px, för md/lg */
--btn-h-sm: 36px;                         /* tighter än 40 — spar plats */
--btn-h-md: 44px;                         /* iOS minsta touch-target */
--btn-h-lg: 52px;                         /* primära CTA */
--btn-pad-x-sm: 12px;
--btn-pad-x-md: 16px;
--btn-pad-x-lg: 20px;
--btn-font-sm: 0.82rem;
--btn-font-md: 0.92rem;
--btn-font-lg: 1.0rem;
--btn-gap: 8px;                           /* mellan ikon och text */
--btn-row-gap: 8px;                       /* mellan knappar i rad */
--btn-bg: var(--bg-card);
--btn-bg-hover: var(--accent-dim);
--btn-bg-active: var(--accent-dim);       /* för toggle-on */
--btn-border: var(--border);
--btn-border-hover: var(--border-focus);
--btn-border-active: var(--accent);       /* synligt när toggle PÅ */
--btn-fg: var(--text-secondary);
--btn-fg-hover: var(--text-primary);
--btn-fg-active: var(--accent);
--btn-disabled-opacity: 0.45;
--btn-focus-ring: 0 0 0 2px rgba(76,175,80,0.45);
```

### Konsekvent storleksskala (sm / md / lg)

- **lg** = primär CTA på sidnivå (Generera rapport, Bekräfta publicering). 52 px.
- **md** = standardknapp (default `.btn`). 44 px. Touch-target uppfyllt.
- **sm** = toolbar/secondary (kart-controls, tab-actions). 36 px. Krav: minst hela raden ska klickas — den lilla 36-px-höjden kompenseras av att hela `<label>`/`<button>` är klickyta.

### Varianter (inte storlekar — färg/intent)

- `.btn` (utan modifier) = grunden: ljust mörkgrönt på `--bg-card`, tunn `--border`, `--text-secondary` text. Detta är vad de flesta kart-controls ska bli.
- `.btn-primary` = solid `--accent`, vit text, för **bekräftande CTA**.
- `.btn-ghost` (förfinas) = transparent bakgrund + 1px border `--border`, för tertiära handlingar — kan ersätta `.mkt-launcher`.
- `.btn-toggle` = ser ut som `.btn` men har `[aria-pressed]`-state. PÅ → `--btn-bg-active` + `--btn-border-active` + `--btn-fg-active` + en checkmark-prick eller inline accent-streck. **Detta löser:** Härdat läge, Namn-etiketter, Visa modell.
- `.btn-select` = `<select>` med `appearance: none`, samma styling som `.btn`, plus en chevron via `background-image` (inline-SVG data-URL). **Detta löser:** Stil-dropdown.

### Status-modifiers — additivt, inte exklusivt

- `.is-success` = grön border-accent (utan att helt skifta färg) — för "Lokalt cachad". Inte en helt egen variant.
- `.is-warn` = gul border-accent — kan användas för en framtida "destruktiv" indikation. (Härdat-läge använder inte detta längre — den blir en ren toggle.)
- `.is-loading` = visar en liten spinner istället för ikon, knappen blir `disabled` under tiden.
- `:disabled` = opacity 0.45, cursor not-allowed, ingen hover, ingen focus-ring.

### Spacing-tokens

- `--btn-row-gap: 8px` används av `.mk-controls-row { gap: var(--btn-row-gap); }`
- Vertikal separator mellan rader: 1px `--border` + 8px padding (befintligt — bevaras).

### Hover/focus/active

- **Hover** (desktop): `--btn-bg-hover` + `--btn-border-hover`. Subtilt — ingen scale-transform.
- **Focus-visible** (tangentbord): `--btn-focus-ring` runt knappen. **Inte** `outline:none` — det bryter tillgänglighet.
- **Active** (klick-feedback): `transform: scale(0.97)` (befintligt på `.btn`). Bevaras.
- **Reduced-motion**: hela `transform`+`transition`-paketet wrapas i `@media (prefers-reduced-motion: no-preference)`.

---

## Faserad plan

### Fas 1 — Tokens + grundknapp (TODAY)
**Fil:** `minkarta.html` (CSS i `<style>`-blocket, rad 30–50 och 70–76).

- Lägg till knapp-tokens i `:root`.
- Skriv om `.btn`/`.btn-sm` så att border alltid finns och variabel-driven (ingen mer 0-border).
- Lägg till `.btn-md`, `.btn-lg` (för helhet — används senare).
- Lägg till `:focus-visible` styling.
- Lägg till `:disabled` styling.
- Lägg till `@media (prefers-reduced-motion: reduce)` som tar bort transition+transform.
- Migrera 1 knapp som proof: `Panorera / välj` (rad 1) — verifiera att den ser konsekvent ut bredvid orörda knappar.

**Push:** `feat(ui): designsystem-tokens for knappar (Fas 1)`

### Fas 2 — Toggle + dropdown
**Filer:** `minkarta.html`, `sensorskiss.html`, `minkarta-tutorial.css`, `sensorskiss-tutorial.css`.

- Lägg till `.btn-toggle` i CSS (med `[aria-pressed="true"]`-selektor).
- Lägg till `.btn-select` i CSS (med chevron-bakgrund).
- I `renderMapControls()`:
  - Byt **Härdat läge**-knappen till `.btn-toggle` med `aria-pressed`. Ta bort inline `borderColor`/`color`-style.
  - Byt **Namn-etiketter**- och **Visa modell**-checkbox-labels till `.btn-toggle`-knappar. Behåll det dolda checkbox-elementet om det behövs för formulär-state (eller flytta state till knappen och spara via samma `saveLayerState()`).
  - Byt **Stil-dropdown** (native `<select>`) till `.btn-select`-styled select.
  - **Ladda ner offline**: ta bort inline borderColor — använd `.is-success`-modifier istället.
- I `minkarta-tutorial.css` och `sensorskiss-tutorial.css`:
  - Skriv om `.mkt-launcher`/`.skt-launcher` så de använder samma tokens som `.btn .btn-sm` (eller helt enkelt: `class="btn btn-sm mkt-launcher"` och låt `.mkt-launcher` bara lägga till positions/eventuell ikon).

**Push:** `feat(ui): toggle + select-varianter, harmonisera kart-kontroller`

### Fas 3 — Konsekvent applicering
**Filer:** alla 15 HTML-filer.

- Skanna alla HTML-filer för avvikande knapp-mönster (inline-style på `<button>`, ad-hoc CSS-klasser, native `<select>` som *ser ut* som knappar).
- Migrera till `.btn` + storlek + variant.
- Verifiera visuellt på desktop-bredd och mobil-bredd (responsive).

**Push:** `chore(ui): migrera resterande sidor till knapp-systemet`

### Fas 4 — Mikro-interaktioner (overstretch)
- Subtila hover-transitions (under 150 ms — inte distraherande).
- Disabled-fade-in vid `disabled`-toggle.
- `.is-loading` med spinner.

**Push:** `feat(ui): subtila knapp-mikrointeraktioner`

---

## Risk-lista

1. **Visuell regression i andra sidor.** Eftersom `.btn`/`.btn-sm` finns i många filer och vi förändrar bas-CSSen i `minkarta.html` först, måste Fas 3 verifiera index/ah/scrim/what/weft/obslosa/vader manuellt. *Mitigering:* Fas 1 pushar bara tokens + utökade selektorer; befintliga `.btn-accent`/`.btn-ghost`/`.btn-primary` bevarar sitt utseende.
2. **Dålig kontrast** i toggle-on-state om `--btn-fg-active = --accent` på `--btn-bg-active = --accent-dim`. *Mitigering:* manuell kontroll med ögat (4.5:1 enligt WCAG AA — `#4caf50` mot `#1e3d1e` ligger ~6:1, OK).
3. **Knappar för små för touch.** `.btn-sm` är 36 px. *Mitigering:* hela `<label>`-clickyta är större; primära knappar använder `.btn` (44 px).
4. **`<select>` som inte längre ser ut som dropdown.** *Mitigering:* chevron-ikonen på `.btn-select` och `aria-haspopup`-stil signalerar.
5. **Checkbox-labels i `.btn-toggle`-form bryter formulär-relationen.** Skärmläsare måste fortfarande veta att det är en toggle. *Mitigering:* `<button role="switch" aria-pressed="…">` eller behåll `<input type="checkbox">` dolt med `<label>` som styler som knapp.
6. **Tangent-badge på Maximera-knappen** måste fortsätta sitta på höger sida av texten utan att förskjuta layouten. *Mitigering:* befintlig CSS i `#mkFullBtn .mk-tool-shortcut` bevaras.

## Test-plan

- **Desktop (Chromium):** öppna `minkarta.html` och `sensorskiss.html`, verifiera att rad 1 + rad 2 har konsekvent höjd och border. Hover på varje knapp. Tab genom raden, verifiera focus-ring.
- **Mobil-bredd:** DevTools 375 px viewport. Verifiera att raderna wrap:ar korrekt och inget hamnar utanför.
- **Toggle-state:** klick på Härdat läge → verifiera att hela knappen byter look (inte bara border-färg). Klick igen → verifiera att den går tillbaka.
- **Stil-dropdown:** ska bara visas när Härdat läge PÅ. Öppna den → verifiera att alternativen renderas (native popup) och att vald stil syns i knappens label.
- **Disabled:** ladda om sidan offline (inget MK_HARDENING-modul) → Härdat-knappen visar disabled-look och alert vid klick. (Idag visas bara alert; vi behåller den men styler knappen som disabled efter klick.)
- **Reduced-motion:** macOS Settings → Accessibility → Reduce motion → ladda om → verifiera att hover-/active-transitions är borta.
- **Övriga sidor:** snabb visuell check av `index.html`, `ah.html`, `scrim.html`, `what.html`, `weft.html`, `obslosa.html`, `vader.html`, `opsec.html` — inga regressioner i existerande knappar (`.btn-accent`, `.btn-primary` osv.).

## Vad denna roadmap *inte* gör

- Bryter inte ut CSS till extern `app.css` (ligger som separat refactor i `audit/audit.md` Sväng 2).
- Lägger inga nya externa beroenden.
- Ändrar inte CSP eller andra OPSEC-attribut.
- Rör inte `service-worker.js` `CACHE`-strängen — CI sköter den.
- Inkluderar inte ikon-systemet (emoji → SVG) — det är ett separat projekt.

## Slutkriterium "version 1 levererad"

Fas 1 + Fas 2 pushade. I `minkarta.html` och `sensorskiss.html`:
- Båda raderna i `.map-controls` har konsekvent knapp-höjd och border-färg.
- Stil-dropdown ser ut som de andra knapparna (chevron synlig).
- Härdat läge är en synlig toggle med PÅ/AV (inte bara guld border).
- Namn-etiketter och Visa modell ser ut som toggle-knappar, inte formulärrader.
- "Lär dig MINKARTA" har samma höjd och border-tjocklek som grannknapparna.
- Inga regressioner i `index.html`, `ah.html`, `scrim.html`, `what.html`, `weft.html`, `obslosa.html`, `vader.html`, `opsec.html`.
