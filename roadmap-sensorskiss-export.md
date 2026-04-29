# Roadmap — Exportera PNG + röd "Rensa allt" i sensorskiss

Datum: 2026-04-29
Workspace: `c:\0-dropbox\Dropbox\1oels dokument\Antigravity\hv`

## Bakgrund / verifiering

- `sensorskiss-export.js` exponerar `window.SK_EXPORT` med
  `renderExportAsync`, `exportFilename`, `downloadBlob`, `shareBlob`,
  `computeBBox` (rad 473–479).
- Sensorskiss laddar redan modulen ([sensorskiss.html:20](sensorskiss.html#L20))
  och använder den i `shareProtocol()` ([sensorskiss.html:1751-1785](sensorskiss.html#L1751-L1785))
  — men ENBART kopplad till "Generera & dela protokoll"-knappen. Det
  finns alltså ingen fristående "Exportera PNG"-knapp i
  palette-toolbaren än.
- Toolbar att utöka: [sensorskiss.html:1383-1420](sensorskiss.html#L1383-L1420)
  (Ångra / Gör om / Rensa allt).
- Mönster att efterlikna i minkarta:
  - Knappdefinition: [minkarta.html:2463-2469](minkarta.html#L2463-L2469)
  - `_lastExport`-cache + popover: [minkarta.html:2515-2598](minkarta.html#L2515-L2598)
  - `prepareExportBlob()` + `exportPng()`-wrapper: [minkarta.html:2518-2614](minkarta.html#L2518-L2614)
  - CSS för `.mk-share-popover`: [minkarta.html:274-286](minkarta.html#L274-L286)
  - "Rensa allt" rensar `_lastExport = null`: [minkarta.html:2485](minkarta.html#L2485)
  - Röd "Rensa allt": [minkarta.html:2471-2475](minkarta.html#L2471-L2475)
- I sensorskiss saknas idag motsvarande `_lastExport`-cache och
  popover-CSS — vi behöver införa dem (eller välja en enklare variant,
  se beslut nedan).
- Svensk text och MGRS-förkortning kan göras 1:1 — `MGRS.forward` finns
  redan globalt i sensorskiss ([sensorskiss.html:458](sensorskiss.html#L458)).
- `state.objects` används som datakälla — samma form som minkarta
  förväntar.

## Beslut som behöver godkännande

1. **Popover-stil eller direkt nedladdning?**
   Minkarta visar en popover med "Ladda ner PNG" + "Dela via app" när
   man klickar Exportera PNG. Sensorskiss har redan en delningsväg via
   "Dela protokoll"-knappen som kombinerar text + bild. För den nya
   knappen finns två rimliga val:

   - **A (rekommendation):** spegla minkarta exakt — popover med Ladda
     ner / Dela. Mest konsekvens, mer kod (ny CSS `sk-share-popover`,
     popover-funktioner). Cirka 90 nya rader i sensorskiss.html.
   - **B:** Direkt nedladdning + valfri shareBlob-fallback om
     `navigator.canShare`. Enklare (~20 rader), men avviker från
     minkartas UX. "Dela via app" döljs som auto-fallback.

   Jag förordar **A** — användaren bad om "samma 'Exportera PNG'-knapp
   som minkarta har", och konsekvent UX är värt extra rader.

2. **Ska "Rensa allt" nolla `_lastExport`-cachen?**
   Minkarta gör det ([minkarta.html:2485](minkarta.html#L2485)).
   Förslag: ja — om vi inför cachen i fas 1 ska samma rensning ske, för
   konsistens.

3. **`btn-accent` finns inte i sensorskiss.** Minkartas popover använder
   `btn btn-sm btn-accent` (rad 2558). Förslag: använd inline-style
   `flex:1;background:var(--accent);color:#fff` på primärknappen i
   popovern — fungerar oavsett om CSS-klassen finns. (Verifierar i
   fas 1 om den faktiskt saknas.)

## Faser

### Fas 1 — Exportera PNG-knapp + popover-flöde

**Filer:** `sensorskiss.html`

**Ändringar:**

1. CSS-block (kopierad från minkarta `.mk-share-popover`, omdöpt till
   `.sk-share-popover` så det inte krockar globalt om båda sidorna
   någonsin hostas tillsammans).
2. `attachPaletteToolbar()` (rad 1383–1420): infoga `exportBtn` mellan
   Gör om och Rensa allt med `flex:2;background:var(--accent)` —
   identiskt med minkartas mönster.
3. Nya funktioner i samma `<script>`-block:
   - `_lastExport` + `_popoverTimer` toppvariabler.
   - `prepareExportBlob()` — anropar `SK_EXPORT.renderExportAsync` med
     `objects: state.objects, title: 'SENSORSKISS', subtitle, dpr: 2`.
     Om inget att exportera → `toast('Inget att exportera.')`.
   - `exportPng()` — wrapper som tänder "Renderar…" på knappen och
     visar popovern. Felfall → `toast('Fel vid export: …')`.
   - `showExportPopover()`, `closeExportPopover()`, `outsideExportClick()`
     — 1:1-kopior, klassnamn `sk-share-popover`, id `skSharePopover`.
4. `Rensa allt`-handlern (rad 1408–1417) får `_lastExport = null;`
   sist (samma rad-mönster som minkarta).

**Risker:**

- Subtitle-källan: minkarta läser `window.__minkartaTitle/Subtitle`.
  Sensorskiss har ingen sådan global. → Använd litteral
  `'Sensorskiss · ' + state.objects.length + ' objekt'` som default
  (samma logik som `shareProtocol()` gör).
- `event` är inte alltid definierad i ren JS-handler i strict mode.
  Minkarta använder den globala `event` ([minkarta.html:2601](minkarta.html#L2601)) — bör fungera, men jag tar
  knappen från `e.currentTarget` istället för säkerhets skull.
- `btn-accent` saknas troligen — använder inline-style som fallback
  (verifierar med Grep i fas 1; om klassen finns, använd den).
- Ingen påverkan på befintlig `shareProtocol()` — den ligger på en
  annan knapp (`#pShare`).

**Test:**

1. Öppna `sensorskiss.html` i browser.
2. Verifiera att toolbaren visar: `Ångra | Gör om | Exportera PNG (grön, dubbel bredd) | Rensa allt`.
3. Klicka Exportera PNG utan objekt → toast "Inget att exportera.".
4. Lägg ut 2–3 sensorer + ett område. Klicka Exportera PNG → popover
   med "Ladda ner PNG" + "Dela via app".
5. Klicka "Ladda ner PNG" → fil sparas; toast "Sparad: …".
6. Klicka "Dela via app" på mobil/PWA-stöd → share-dialog.
7. Klicka Rensa allt (efter en lyckad export) → bekräfta att ny
   Exportera-klick fortfarande funkar (ingen stale cache).
8. ESC eller klick utanför → popover stängs.

**Commit:**
`SENSORSKISS: Exportera PNG-knapp i palette-toolbar (popover, cache, dela)`

---

### Fas 2 — Röd "Rensa allt"

**Filer:** `sensorskiss.html`

**Ändringar:**

- [sensorskiss.html:1404-1407](sensorskiss.html#L1404-L1407):
  Byt `clearBtn.className = 'btn btn-sm btn-ghost'` →
  `clearBtn.className = 'btn btn-sm'` och lägg till
  `clearBtn.style.cssText = 'flex:1;background:#c62828;color:#fff'`
  — identiskt med minkarta ([minkarta.html:2473-2474](minkarta.html#L2473-L2474)).

**Risker:**

- Marginell visuell förändring: knappen växer från `btn-ghost`-bredd
  till `flex:1`. Bör vara önskat (matcha minkarta) men noteras.
- Ingen logikförändring.

**Test:**

1. Reload sensorskiss.html. Verifiera att Rensa allt är röd
   (`#c62828`) med vit text.
2. Klicka Rensa allt — bekräftelsedialogen ska fortfarande dyka upp
   och fungera (oförändrad handler).

**Commit:**
`SENSORSKISS: Röd "Rensa allt"-knapp matchar minkarta`

---

## Sammanfattning av antaganden

- Fas-ordning: 1 (PNG-export) först, 2 (röd knapp) sist — för att fas 1
  inkluderar `_lastExport = null` i Rensa-handlern, och då hamnar
  fas 2 på en redan modifierad rad. Alternativ: gör fas 2 först (1-rads
  ändring), sen fas 1. Men det skulle splittra två commits över samma
  knappblock. **Förordat: fas 1 → fas 2.**
- Båda faserna är låg-risk, lokala till `attachPaletteToolbar()` +
  ny script-sektion.
- Ingen test-suite finns att köra; manuell smoke-test räcker.

## Frågor till dig

1. Godkänner du popover-varianten (A) över direkt nedladdning (B)?
2. Godkänner du att Rensa allt nollar `_lastExport`-cachen (när vi
   väl infört den)?
3. Är ordningen fas 1 → fas 2 ok?

Säg "kör" när du godkänt så börjar jag med fas 1.
