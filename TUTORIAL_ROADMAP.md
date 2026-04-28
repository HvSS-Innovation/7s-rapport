# Roadmap — MINKARTA Tutorial-skola

Interaktiv onboarding för `minkarta.html`. Tre steg, lekfull ton, inga
fail-states, inget tvång. Användaren ska kunna stänga, hoppa över, eller
spela om vilket steg som helst när som helst.

**Designprinciper (icke-förhandlingsbara):**

- Inga "fel svar". Allt som klickas ger positiv feedback.
- Tutorialen blockerar aldrig framsteg — `Esc`/X stänger alltid direkt.
- Korta texter (≤2 meningar per pratbubbla). Mycket visuellt.
- Mobile-first: layout 320 px och uppåt. Desktop får mer luft, inte mer text.
- Tutorialen ändrar aldrig riktiga kartobjekt. Den lever i ett eget "demo-lager"
  som rensas vid stängning.

---

## Filer som tillkommer / ändras

| Fil | Status | Roll |
|-----|--------|------|
| `minkarta-tutorial.js` | NY | All tutorial-logik (steg-flöde, state, spotlight, demo-symboler) |
| `minkarta-tutorial.css` | NY | Animationer, spotlight, pratbubblor, "klistermärken" |
| `minkarta.html` | ändras | `<link>` + `<script>`-tagg, "Lär dig MINKARTA"-knapp i `mapControls`, eventuellt en details-sektion `tutorialPanel` |
| `service-worker.js` | ändras | Lägg till de nya filerna i `FILES`, bumpa `CACHE`-konstant |
| `README.md` | ändras | Ny rad i ändringslogg när allt landat |

Inga andra filer rörs. Inga befintliga state-strukturer (`state.objects`,
`state.layers`, IndexedDB-store) ändras.

---

## Arkitektur

### En modul, lat-laddad

`minkarta-tutorial.js` exponerar en enda global: `window.MK_TUTORIAL` med:

```
MK_TUTORIAL.start(stepKey?)   // 'welcome' | 'symbols' | 'master' | undefined (=välj automatiskt)
MK_TUTORIAL.stop()
MK_TUTORIAL.reset()           // nollställer state, raderar localStorage-nyckeln
MK_TUTORIAL.isCompleted()     // bool
MK_TUTORIAL.getProgress()     // { welcome, symbols, master, discoveries[] }
```

Modulen registreras vid `DOMContentLoaded` men **kör ingenting** förrän:
1. Användaren klickar "Lär dig MINKARTA"-knappen, eller
2. Auto-start triggar (se nedan).

### Auto-start: bara första gången

Vid `DOMContentLoaded` läser modulen `localStorage.minkarta_tutorial_v1`. Om
nyckeln saknas eller `{ completed: false, skipped: false, openedFirstTime: false }`,
visar modulen en liten *icke-blockerande* välkomst-toast i nedre högra hörnet:

> "Hej! Vill du ha en snabb rundtur av kartan? [Ja tack] [Nej tack]"

Klick på "Nej tack" sätter `skipped: true` och toasten visas aldrig igen.
Klick på "Ja tack" startar steg 1.

### State-modell

```js
{
  version: 1,
  completed: false,           // sann när alla tre stegen körts klart
  skipped: false,             // användaren tackade nej till auto-start
  openedFirstTime: false,     // första rundtur-erbjudandet visat
  steps: {
    welcome: { seen: false, completed: false },
    symbols: { seen: false, completed: false },
    master:  { seen: false, completed: false }
  },
  discoveries: []             // symbol-keys som "klistermärken" upptäckts på
}
```

Persisteras till `localStorage` efter varje meningsfull state-ändring.
Aldrig till IndexedDB — detta är ren UI-state.

### Demo-lager

En `L.LayerGroup` med namn `tutorialDemo` läggs på kartan **bara medan
tutorialen är öppen**. Lagret rensas i `MK_TUTORIAL.stop()`. Riktiga
state-objekt (state.objects) rörs aldrig.

### Spotlight + pratbubbla

DOM-struktur som monteras vid start:

```
<div id="mkTutOverlay">          (full-screen, z-index hög)
  <div class="mk-tut-dim"></div> (mörkt halvtransparent lager med "hål")
  <div class="mk-tut-bubble">    (pratbubbla)
    <div class="mk-tut-text">…</div>
    <div class="mk-tut-actions">
      <button class="mk-tut-skip">Hoppa över</button>
      <button class="mk-tut-back">Tillbaka</button>
      <button class="mk-tut-next">Vidare</button>
    </div>
    <button class="mk-tut-close" aria-label="Stäng">×</button>
  </div>
</div>
```

Spotlight-effekten görs med en stor `box-shadow: 0 0 0 9999px rgba(0,0,0,.55)`
på ett tomt `<div>` som positioneras över det elementet vi vill lyfta fram.
Det blir runt fönster fyrkantigt med rundade hörn — ingen SVG-mask behövs.

Pratbubblan placeras automatiskt ovan/under/sida om spotlighten beroende på
viewporten. På mobil hamnar den alltid längst ned med full bredd.

---

## Steg 1 — "Välkommen till kartan" (Orientering)

**Mål:** användaren förstår att MINKARTA är en ritplatta för minläggningskartor
och kan panorera/zooma utan rädsla.

**Skärmbilder (i ordning):**

1. **Splash**: pratbubbla mitt på skärmen (ingen spotlight) — "Välkommen till MINKARTA. Här ritar du upp minläggningar med svenska kart-tecken. Vill du ha en kort rundtur?" [Vidare] [Hoppa över]
2. **Spotlight: kartan** — "Det här är din karta. Drag för att panorera, scrolla eller pinch-zooma för att komma närmare." [Vidare]
3. **Spotlight: status-raden** (`.status-row`) — "Här ser du var mitten av kartan ligger i MGRS, och vilken zoomnivå du är på." [Vidare]
4. **Spotlight: paletten** (`#paletteRoot`) — "Här nere finns alla kart-tecken du kan rita. Vi tittar närmare på tre stycken nu." [Vidare]
5. **Spotlight: Stridsvagnsmina-knappen i paletten** — pratbubbla visar SVG:n förstorad + label. "Stridsvagnsmina — den vanligaste markeringen." [Vidare]
6. **Spotlight: Truppmina-knappen** — "Truppmina." [Vidare]
7. **Spotlight: UPK-knappen** — "UPK = utgångspunkt. En bestämbar referenspunkt i terrängen, inte en mina." [Klar när du vill]

Steg 1 markeras `completed: true` när användaren klickar "Klar" eller går till
steg 2.

**Inga riktiga objekt placeras på kartan i steg 1.** Det är bara titt-och-läs.

---

## Steg 2 — "Symbolernas värld" (Utforskning)

**Mål:** användaren upptäcker bredden av paletten och får leka med några
symboler i ett demo-läge.

**Format: "Klistermärkesalbum"**

En översättningspanel öppnas över skärmen (men kan stängas) med 22 symboler
grupperade enligt paletten:

- **Mineringar** (14 punkter)
- **Linjer & gränser** (Minlinje, Avspärrning)
- **Områden** (Minruta, Minerat område, Avståndslagda mineringar)
- **Hjälp-symboler** (UPK, Yttergränsmarkör)

Varje kort visar SVG + label, grå/dim som standard. När användaren klickar:

1. Kortet får en mjuk färg-glimt (CSS `@keyframes mkTutPop`)
2. En liten info-ruta dyker upp under kortet med en mening om symbolen
3. På kartan placeras ett **demo-objekt** av den symbolen mitt i vyn (i `tutorialDemo`-lagret), så användaren ser hur den ser ut "i terrängen"
4. Kortet markeras som "upptäckt" — sparas i `discoveries[]`

Inget krav på att klicka alla. Botten av panelen visar t.ex. "Du har upptäckt
**5 av 22** kart-tecken" — som en mätare, inte en gräns.

**Två demos i denna panel:**

- **Pan-läge vs ritläge:** en toggle visas — användaren kan testa att klicka i kartan i pan-läge (inget händer) vs ritläge (en demo-symbol placeras). Tutorialen rensar demosymbolerna automatiskt.
- **Long-press för borttagning:** pratbubbla "Långt tryck (mobil) eller högerklick (dator) tar bort en symbol. Prova!" — när någon demosymbol tas bort visas glad-feedback.

Steg 2 markeras `completed: true` när användaren klickar "Klar med symboler"
nere på panelen — oavsett hur många klistermärken som upptäckts.

---

## Steg 3 — "Bli en kartmästare" (Fördjupning & lek)

**Mål:** användaren ser de avancerade flödena (sök, edit-popup, UPK,
yttergränsmarkörer, PNG-export, minprotokoll) och får sedan en sandlåda.

**Skärmbilder:**

1. **Spotlight: MGRS-sökfältet** (`#mgrsSearch`) — "Skriv eller klistra in koordinater här. Stöder MGRS, lat,lon eller adresser via Nominatim." [Vidare]
2. **Demo: sökning** — tutorialen fyller i en exempel-MGRS automatiskt och animerar Gå-knappen. Kartan flyger till positionen. "Så här hittar du alltid hem."
3. **Spotlight: edit-popup** — tutorialen placerar en demo-stridsvagnsmina på kartan, låtsasklickar på den, och edit-popupen öppnas. "Här ändrar du etikett, antal, anteckning och rotation. Slidern roterar i realtid."
4. **Spotlight: UPK-genvägen** — "UPK-markörer får automatiskt slumpnummer 001–999. Reverse-geocode ger dig en namn-etikett."
5. **Spotlight: Yttergränsmarkörer** — "Sätt två yttergränsmarkörer för att styra vilken yta PNG-exporten ska täcka. Annars fyller den med padding."
6. **Spotlight: minprotokoll-panelen** (`#protoPanel`) — "När minkartan är klar fyller du i protokoll och delar via Signal eller PDF."
7. **Sandlåde-läge:** "Nu får du leka fritt. Allt fungerar som vanligt. Tutorialen är kvar i bakgrunden tills du stänger den." [Stäng tutorial] [Visa diplom]
8. **Diplom-overlay (frivilligt):** liten kort-design i 80-tals-blankettstil — "MINKARTA-rundtur genomförd. Du har upptäckt **N** kart-tecken. *Datum/klockslag.*" Två knappar: [Stäng] [Spela om från början]

Steg 3 markeras `completed: true` när antingen "Stäng tutorial" eller "Visa
diplom" klickas. Hela tutorialen får då `completed: true`.

---

## Återstart-meny

I `mapControls`-raden direkt under kartan placeras en diskret knapp:

> `Lär dig MINKARTA`

Klick öppnar en liten meny:

```
Steg 1 — Välkommen till kartan        [✓ klar]
Steg 2 — Symbolernas värld            [✓ klar]
Steg 3 — Bli en kartmästare           [• ej klar]
─────────────────────────────────────
Spela om allt från början
Återställ tutorial-progress
```

`Återställ tutorial-progress` tar bort `localStorage.minkarta_tutorial_v1` och
auto-start-toasten dyker upp igen vid nästa sidladdning.

---

## Implementations-ordning (commits)

Joel granskar mellan varje steg. Kort changelog efter varje commit.

1. **Steg 0 — Skelett** *(commit: `MINKARTA tutorial: skelett, state, overlay`)*
   - Skapa `minkarta-tutorial.js` + `minkarta-tutorial.css`
   - State-modell + localStorage
   - "Lär dig MINKARTA"-knapp i `mapControls`
   - Auto-start-toast (utan stegsinnehåll än)
   - Spotlight + pratbubbla-komponent
   - Service-worker uppdaterad

2. **Steg 1 — Välkommen** *(commit: `MINKARTA tutorial: steg 1 Vakomna till kartan`)*
   - 7 spotlight-skärmar enligt ovan
   - Inga demo-objekt på kartan i detta steg

3. **Steg 2 — Symbolernas värld** *(commit: `MINKARTA tutorial: steg 2 Symbolernas varld`)*
   - Klistermärkespanel
   - Demo-lager (`tutorialDemo`) + auto-rensning
   - "Upptäckt"-räknare och localStorage-persistens av `discoveries`

4. **Steg 3 — Kartmästare** *(commit: `MINKARTA tutorial: steg 3 Kartmastare + diplom`)*
   - 8 spotlight-skärmar inkl. sandlåde-läge och diplom
   - Återstart-meny i `mapControls`

5. **Polish** *(commit: `MINKARTA tutorial: polish + README-anteckning`)*
   - Tillgänglighet: `aria-live`, fokushantering, `Esc` stänger
   - README-rad i ändringsloggen
   - Eventuella buggfixar från test

Varje steg får en egen commit + push så Joel kan testa löpande.

---

## Designval som vill bekräftas innan kod skrivs

1. **Pratbubble-stil:** Bara text + ram, eller en liten avatar/mascot? *(Roadmapen
   förutsätter ren text — säg till om du vill ha en figur.)*
2. **Auto-start:** Ska första-besöket-toasten visas, eller ska tutorialen vara
   helt opt-in via knappen? *(Roadmapen föreslår toast med "Ja tack/Nej tack".)*
3. **Diplom:** Estetik som befintliga rapportblanketter (Courier-typsnitt,
   tjock svart ram), eller något annat? *(Roadmapen föreslår blankettstil.)*
4. **Demo-lager-färg:** Ska demo-symbolerna vara markerat annorlunda
   (t.ex. blå tint) så användaren ser att de inte är riktiga? *(Roadmapen
   föreslår en mjuk blå-glow runt SVG:n via CSS-filter, ingen ändring av
   själva svgs.)*
5. **Mobile-trigger för long-press-demo i steg 2:** OK att tutorialen kan
   simulera en long-press, eller ska den bara förklara och låta användaren
   testa själv? *(Roadmapen föreslår simulering för flytande visualisering,
   men användaren kan alltid själv prova.)*

---

## Avgränsningar (icke-mål)

- Ingen tutorial för 7S/WHAT/SCRIM/etc — bara MINKARTA i denna iteration.
- Ingen flerspråkig version — bara svenska.
- Inga ljudeffekter.
- Ingen poäng / leaderboard / tävlingsmoment.
- Ingen användardata skickas någonsin någonstans (samma integritetsprincip
  som resten av MINKARTA).
