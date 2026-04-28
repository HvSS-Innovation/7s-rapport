# Roadmap V2 — MINKARTA Tutorial, fält-test-iteration

Sex förbättringar efter Joels mobiltest av iteration 1. Designprinciperna från
[TUTORIAL_ROADMAP.md](TUTORIAL_ROADMAP.md) gäller fortsatt: inga "fel svar",
allt skippbart, ≤2 meningar per pratbubbla, mobile-first, tutorialen rör aldrig
`state.objects`.

**Process:** Joel granskar denna roadmap → jag implementerar en commit per
ändring → push efter varje commit → Joel testar via mobil mot GitHub Pages.
`service-worker.js` `CACHE`-konstanten bumpas i varje commit som rör js/css/html.

---

## Ändring 1 — Förenkla välkomsttexten i Steg 1

**Filer:** [minkarta-tutorial.js](minkarta-tutorial.js), [service-worker.js](service-worker.js)

**Vad:** I `WELCOME_SCREENS[0].lines` ([minkarta-tutorial.js:285-288](minkarta-tutorial.js#L285-L288))
ersätt nuvarande två meningar med en enda:

```js
lines: [
    'Det här är MINKARTA. Här ritar du upp minläggningar.'
]
```

Tar bort: "med svenska kart-tecken" + hela frågan "Vill du ha en kort
rundtur?" (användaren har redan tackat ja).

**Öppna frågor:** inga.

**Risker:** inga — text-ändring i en konstant.

---

## Ändring 2 — Puls-animation på spotlight-targets

**Filer:** [minkarta-tutorial.js](minkarta-tutorial.js), [minkarta-tutorial.css](minkarta-tutorial.css), [service-worker.js](service-worker.js)

**Vad:** Lägg till en CSS-klass `mkt-pulse-target` som JS sätter på spotlight-target
när en skärm visas och tar bort vid nästa skärm / `stop()`. Animationen ger ett
konsekvent visuellt "här pekar vi"-språk på alla skärmar med target — inte bara
status-raden.

**CSS** (ny `@keyframes` + klass i [minkarta-tutorial.css](minkarta-tutorial.css), nära `.mkt-spotlight`):

```css
@keyframes mktTargetPulse {
    0%, 100% { transform: scale(1);     opacity: 1;   }
    50%      { transform: scale(1.025); opacity: 0.92;}
}
.mkt-pulse-target {
    animation: mktTargetPulse 1.6s ease-in-out infinite;
    transform-origin: center center;
    will-change: transform, opacity;
}
```

Subtil — 2.5% scale + 8% opacity-glimt. Inte distracting.

**JS** ([minkarta-tutorial.js](minkarta-tutorial.js)):

- Lägg till modul-state `let pulseTargetEl = null;`
- I `renderBubble(screen)` (efter `target = screen.target ? document.querySelector(screen.target) : null;`):
  rensa ev. tidigare puls (`if (pulseTargetEl) pulseTargetEl.classList.remove('mkt-pulse-target');`),
  och om ny target finns: `target.classList.add('mkt-pulse-target'); pulseTargetEl = target;`
- I `destroyOverlay()` och i `stop()`: rensa pulsen.

**Test-skärm där effekten ska vara extra tydlig:** Steg 1 skärm 3 (`.status-row`).

**Öppna frågor:** ingen.

**Beslut:** puls på alla targets **utom** `#mapContainer` (hela kartan blir
visuellt rörig om den hoppar 2.5%). Implementeras som hårdkodad undantags-check
i `renderBubble`: `if (target.id !== 'mapContainer') target.classList.add('mkt-pulse-target');`.

---

## Ändring 3 — Minområde: byt antal-rendering på kartan

**Filer:** [minkarta.html](minkarta.html), [service-worker.js](service-worker.js)
(detta är en ändring i MINKARTA, inte tutorialen — tas med i samma roadmap så
helheten landar i samma test-runda).

**Nuläge:**

- Palett-SVG:n `minomradeSvg(antal)` i [minkarta-symbols.js:72-85](minkarta-symbols.js#L72-L85)
  ritar redan antal på fyra positioner (top, bottom, left, right) på en
  ellips med vita rect-luckor i strokens kant — det stämmer med Joels önskemål.
  Men denna SVG används **bara** som palett-ikon.
- På själva kartan ritas minområdet som en Leaflet-polygon (med användarens egna
  kant-noder, inte ellipsen) + **en enda** numerisk badge `addCenterMarker()`
  ovanför polygonens nordkant ([minkarta.html:986-1003](minkarta.html#L986-L1003)).

**Joels feedback:** "Idag svävar siffran ovanför området mitt i SVG:n. Önskat:
antalet ska visas i linje med gränsen, på max fyra linjer — standardformat för
svenska militära minområden."

**Tolkning** (bekräftad av Joels referensbild 2026-04-28):

> Bilden visar en parallellogram-polygon (4 noder, 4 kanter). På **midpunkten av
> varje kant** sitter siffran "6" i en vit liten bricka. I polygonens centrum
> ligger den befintliga `obj.etikett + obj.antal`-tooltipen ("HIND 6").

Slutsats:

- Siffran ska sitta på **midpunkten av varje polygon-KANT** (segment), inte på
  bounding-box-kardinaler.
- En siffra per kant, men max 4 siffror totalt. Polygoner med >4 kanter får
  siffror på de 4 längsta kanterna; resten skip:as.
- Centrum-tooltipen "HIND 6" är `obj.etikett` + `obj.antal` och ritas redan idag
  via `layer.bindTooltip(...)` ([minkarta.html:1072-1076](minkarta.html#L1072-L1076)).
  **Den behålls** — Ändring 3 ersätter bara `addCenterMarker`-badgen.
- Vit bakgrund på siffer-brickan så polygon-stroken bryts visuellt under siffran
  (matchar bilden).

**Implementation:**

Ersätt `addCenterMarker` ([minkarta.html:986-1003](minkarta.html#L986-L1003))
med `addEdgeMarkers(obj)` som registrerar upp till 4 markörer:

```js
function minomradeEdgeMidpoints(path) {
    if (!path || path.length < 2) return [];
    const segs = [];
    for (let i = 0; i < path.length; i++) {
        const a = path[i];
        const b = path[(i + 1) % path.length];
        const dLat = b.lat - a.lat;
        const dLng = b.lng - a.lng;
        const len2 = dLat * dLat + dLng * dLng;
        segs.push({
            mid: [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2],
            len2: len2
        });
    }
    segs.sort((x, y) => y.len2 - x.len2);
    return segs.slice(0, 4).map(s => s.mid);
}

function addEdgeMarkers(obj) {
    if (obj.typ !== 'minomrade') return;
    const n = Number(obj.antal);
    if (!Number.isFinite(n) || n <= 0) return;
    const mids = minomradeEdgeMidpoints(obj.path);
    mids.forEach((latlng, i) => {
        const m = L.marker(latlng, {
            icon: L.divIcon({
                className: 'mk-edge-badge',
                html: '<span>' + n + '</span>',
                iconSize: [28, 22],
                iconAnchor: [14, 11]
            }),
            interactive: false,
            keyboard: false
        });
        m.addTo(map);
        state.layers[obj.id + '_c' + i] = m;
    });
}
```

CSS i `minkarta.html` (befintlig `.mk-numeric-badge`-stil får syskon):

```css
.mk-edge-badge { pointer-events: none; }
.mk-edge-badge span {
    display: inline-block;
    background: #fff;
    color: #000;
    border: 1px solid #000;
    border-radius: 6px;
    padding: 1px 6px;
    font: 700 13px 'Inter', sans-serif;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.9);
}
```

Drag-handlern ([minkarta.html:942-948](minkarta.html#L942-L948)) ska flytta alla
fyra markörerna med samma delta. Enklast: byt `state.layers[obj.id + '_c']` mot
en loop över `_c0`-`_c3`. Vid `dragend` räknas inget om (deltat är samma för
alla), så det räcker att vid drag iterera och `setLatLng` på var och en.

`removeObject`/cleanup-sökväg behöver också iterera `_c0`-`_c3`. Säkrast: lägg
en hjälpare `clearMinomradeBadges(objId)` som tar bort alla `_c*`-suffix.

**Edge cases:**

- Polygon med <2 noder: skip helt (samma guard som idag).
- Mycket små polygoner (siffrorna överlappar): accepteras i v1 — användaren
  kan zooma in. Joel kan säga till efter fält-test om det blir problem.
- Triangel: 3 siffror på 3 kanter, ingen 4:e.

**Risk:** låg. Den befintliga `addCenterMarker` används bara för minområde och
bara för ett `_c`-suffix — ingen annan kod beror på exakt en marker.

---

## Ändring 4 — Kort symbol-info i Steg 2-albumet

**Filer:** [minkarta-tutorial.js](minkarta-tutorial.js), [minkarta-tutorial.css](minkarta-tutorial.css), [service-worker.js](service-worker.js)

**Vad:** När man klickar ett kort i `mktAlbum` ska 1–2 meningars beskrivning
visas, utöver demo-objektet på kartan. Inga källcitat alls — texterna står som
fri prosa.

**UX-beslut (Joel 2026-04-28): (c) nederkant-banner.**

Sticky strip längst ned i albumet som uppdateras per kort-klick. Kort-grid:en
flyttas inte, mobilen får en tydlig läsbar "om-rad" precis över "Klar med
symboler"-knappen.

**Implementation:**

- Lägg `SYMBOL_DESCRIPTIONS`-lookup-tabell i [minkarta-tutorial.js](minkarta-tutorial.js).
  **NJET** att lägga i [minkarta-symbols.js](minkarta-symbols.js) — MINKARTA-modulen
  ska hållas ren från tutorial-data per uppdraget.
- I `renderSymbolsAlbum()` ([minkarta-tutorial.js:635-694](minkarta-tutorial.js#L635-L694)):
  lägg till `<div class="mkt-album-info">…</div>` ovan footer-knappen, med
  default-text "Klicka på ett kort för att läsa om symbolen".
- I `onCardClick(symId, cardEl)` ([minkarta-tutorial.js:696-708](minkarta-tutorial.js#L696-L708)):
  uppdatera `mkt-album-info` med `SYMBOL_DESCRIPTIONS[symId]`.

**Texter (alla 24 nycklar i `MK_SYMBOLS`):**

Texterna nedan implementeras direkt. Joel godkänner blocket som helhet — om
någon enskild text känns fel efter mobilttest säger han till och jag ändrar
den raden i en följdcommit. Inga källor nämns.

| Nyckel | Text |
|--------|------|
| `strv_tryck` | Tryckutlöst stridsvagnsmina. Vanligaste markeringen på minkartan. |
| `tramp` | Truppmina. Utlöses av tryck eller spränglina. |
| `larm` | Larmmina. Varnar utan att skada — ljud eller ljus. |
| `fordonsmina` | Fordonsmina. Verkar mot lätta fordon, mindre laddning än stridsvagnsminor. |
| `fordon_sid` | Sidverkande fordonsmina. Riktad verkan vinkelrätt mot fordonsspår. |
| `forsvar` | Försvarsladdning. Placeras manuellt och kan utlösas av egen trupp. |
| `prov_rojskydd` | Provisoriskt fordonsröjningsskydd. Försvårar mekanisk röjning av minor. |
| `rojskydd` | Röjningsskydd. Detonerar om fienden försöker röja minfältet. |
| `forst_forb` | Förberedd förstöring. Laddningar på plats men ej säkrade för avfyring. |
| `forst_forb_sakrad` | Förberedd förstöring, säkrad. Passage tillåten tills säkringen lyfts. |
| `forst_utf` | Utförd förstöring. Markerar bro, väg eller anläggning som redan sprängts. |
| `forst_plan` | Planlagd förstöring. Beslutad men ännu inte förberedd. |
| `omr_verkan` | Områdesverkande mina. Verkar över ett större område samtidigt. |
| `verkansomrade` | Verkansområde för en områdesverkande mina eller ett vapensystem. |
| `minlinje` | Minlinje. Minor utlagda i en sammanhängande linje. |
| `avsparrning` | Avspärrning, minvarning. Gränsen där minfältet börjar. |
| `minruta` | Minruta. Rektangulär minering enligt fast schema. |
| `minomrade` | Minerat område. Yta med minering — antal anges på gränsen. |
| `avstand_tramp` | Avståndslagd trampminering. Trampminor lagda på distans. |
| `avstand_strv` | Avståndslagd stridsvagnsminering. Strvminor lagda på distans, oftast via artilleri. |
| `upk` | Utgångs-Punkt-Koordinat. Bestämbar referenspunkt i terrängen — inte en mina. |
| `ytter` | Yttergränsmarkör. Styr vilken yta PNG-exporten täcker. |
| `text` | Fri text. Egen anteckning på kartan. |
| `frihand` | Fri-rita. Frihandsritad linje för skissmarkeringar. |

**Mobil-CSS:** banner ska wrappa och inte växa över ~3 rader, så albumets grid
inte tryckes ihop på små skärmar.

---

## Ändring 5 — Steg 3 skärm 1 (Sökning) tydligare

**Filer:** [minkarta-tutorial.js](minkarta-tutorial.js), [minkarta-tutorial.css](minkarta-tutorial.css), [service-worker.js](service-worker.js)

**Joels feedback:** "Rutan är mörkt grön och man förstår inte vad det är man ser
eller ska titta någonstans."

**Problem:** target `#mgrsSearch` ([minkarta.html:319](minkarta.html#L319)) är
ett tunt textfält högst upp på sidan. Spotlighten är diskret och bubblan börjar
med teknisk jargong ("MGRS, Nominatim").

**Tre alternativ:**

- **(a) CSS-pil från bubblan till spotlighten.** En pekande triangel/arrow som
  visuellt kopplar bubblan till target. Implementeras som `::before` på bubblan
  vars position bestäms av JS (samma logik som `placeBubble` redan har för
  ovan/under).
- **(b) Extra stark target-puls + omformulerad text.** Större puls (1.06× scale,
  hög-opacity outline) bara på just denna skärm + naturligare första rad:
  "Sökfältet längst upp på skärmen — …".
- **(c) Mini-mockup av sökfältet inuti bubblan.** Visa en stil-replikering av
  inputfältet med exempel-text "33VXG 48779 03412" så användaren känner igen
  vad det är.

**Föreslagen omformulering** (gäller alla alternativ):

> "Sökfältet längst upp på skärmen.
>  Skriv adress, klistra in MGRS eller lat,lon — kartan flyger dit."

**Beslut (Joel 2026-04-28): (a) + (b)** — CSS-pil + starkare puls + ny text. (c)
sparas till nästa iteration om detta inte räcker.

**Implementation om (a)+(b):**

CSS:

```css
.mkt-bubble.mkt-with-arrow::after {
    content: '';
    position: absolute;
    width: 0; height: 0;
    border-style: solid;
    /* riktning sätts av JS via inline style.borderWidth + style.top/left */
}
.mkt-pulse-target.mkt-pulse-strong {
    animation-name: mktTargetPulseStrong;
}
@keyframes mktTargetPulseStrong {
    0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(212,162,86,0.0); }
    50%      { transform: scale(1.06); box-shadow: 0 0 0 6px rgba(212,162,86,0.45); }
}
```

JS i `renderBubble`: om `screen.arrow === true`, lägg `mkt-with-arrow` på
bubblan och beräkna pil-position. Om `screen.strongPulse === true`, lägg
`mkt-pulse-strong` på pulsen.

I `MASTER_SCREENS[0]` ([minkarta-tutorial.js:339-345](minkarta-tutorial.js#L339-L345)):

```js
{
    title: 'Steg 3 av 3 — Sökning',
    lines: [
        'Sökfältet längst upp på skärmen.',
        'Skriv adress, klistra in MGRS eller lat,lon — kartan flyger dit.'
    ],
    target: '#mgrsSearch',
    arrow: true,
    strongPulse: true
}
```

**Öppna frågor:** inga.

---

## Ändring 6 — Ta bort UPK-skärmen i Steg 3

**Filer:** [minkarta-tutorial.js](minkarta-tutorial.js), [service-worker.js](service-worker.js)

**Vad:** Ta bort skärmen `MASTER_SCREENS[3]` (UPK-markörer)
([minkarta-tutorial.js:362-367](minkarta-tutorial.js#L362-L367)). Steg 3 går
från 7 till 6 skärmar. UPK-info får komma tillbaka senare när Joel bestämt var
den ska bo.

**Innan:** `MASTER_SCREENS` har 7 skärmar (Sökning, Rita, Redigera, UPK, Yttergräns, Minprotokoll, Klart).
**Efter:** 6 skärmar (Sökning, Rita, Redigera, Yttergräns, Minprotokoll, Klart).

`progress`-texten ("3 av 7") räknas dynamiskt på `activeScreens.length` så den
uppdateras automatiskt — inga andra ändringar krävs.

**Öppna frågor:** ingen.

**Risk:** ingen. Steg 1 har redan en egen UPK-skärm (`WELCOME_SCREENS[6]`,
[minkarta-tutorial.js:327-333](minkarta-tutorial.js#L327-L333)) som beskriver
UPK som referenspunkt — så användaren har sett begreppet vid det här laget.

---

## Implementations-ordning (en commit per ändring)

| # | Commit-meddelande | Ändring |
|---|-------------------|---------|
| 1 | `MINKARTA tutorial: forenkla valkomsttext i Steg 1` | Ändring 1 |
| 2 | `MINKARTA tutorial: puls-animation pa spotlight-targets` | Ändring 2 |
| 3 | `MINKARTA: minomrade-antal pa polygonens grans (4 positioner)` | Ändring 3 |
| 4 | `MINKARTA tutorial: kort symbol-info i Steg 2-albumet` | Ändring 4 |
| 5 | `MINKARTA tutorial: tydligare Steg 3 sokning (pil + puls + text)` | Ändring 5 |
| 6 | `MINKARTA tutorial: ta bort UPK-skarm i Steg 3` | Ändring 6 |

Joel testar mellan varje commit. Vid push-konflikt:
`git pull --no-rebase --autostash origin main`, lös konflikt (behåll min nyare
CACHE-timestamp), commit, push. Commit-hash skrivs ut efter varje push.

**`service-worker.js` `CACHE`-konstant** bumpas till ny `hv-YYYYMMDD_HHMMSS`-tag
i varje commit som rör js/css/html.

---

## Beslut 2026-04-28 (Joels svar på öppna frågor)

1. **#2 puls** — hoppa över `#mapContainer`, puls på alla andra.
2. **#3 minområde** — referensbild bekräftad: siffra på midpunkten av varje
   polygon-KANT, max 4 (de längsta vid >4 kanter). Centrum-tooltipen "HIND 6"
   behålls (befintlig kod).
3. **#4 UX** — (c) nederkant-banner.
4. **#4 texter** — godkända som de står i tabellen, inga källor nämns.
5. **#5 sökfält** — (a) CSS-pil + (b) starkare puls + ny text.

Ingen ytterligare blockering. Vid Joels OK på roadmap → börja Ändring 1.
