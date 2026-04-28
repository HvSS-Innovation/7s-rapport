# 7S Rapport & Fältrapportverktyg

Webbaserade rapportverktyg för Hemvärnet. Samtliga formulär är paketerade som en PWA (Progressive Web App) och fungerar offline direkt i mobilen.

**Live-version:** [7srapport.com](https://7srapport.com)

## Effektivare Sammanställning hos högre chef
En av de största vinsterna med dessa verktyg är möjligheten att korta ledtiderna från observation till beslut genom att soldaterna skickar in sina 7S-rapporter direkt från sina telefoner via **Signal** till högre chef.

## Bakgrund och Syfte
Detta projekt startade som ett försök att hitta ett snabbt och semiautomatiskt arbetsflöde för att effektivisera kommunikationen i fält. Genom att använda färdiga mallar som genererar ren text, minimeras tiden för inmatning samtidigt som rapportformatet blir reglementsenligt och konsekvent. Verktyget är en del i ett pågående arbete med att digitalisera och förenkla ledningsstöd för hemvärnet, utformat för att matcha den smidighet och användarvänlighet som soldaterna är vana vid från det civila livet.

## Funktioner i urval
*   **100% Offline-stöd:** Fungerar utan täckning efter första laddningen.
*   **Mörkeranpassad UX:** Designat med ett strikt Dark Mode.
*   **Metadata-stöttning:** Möjlighet att hämta tid och koordinater från GPS eller foton.
*   **Anpassat för Signal:** Genererar ren text redo att klistras in i Signal, vilket låter de korta meddelandena effektivt försvinna i den civila mobiltrafikens brus.

## Installation för Offline-bruk (PWA)
För att få ut det mesta av verktyget bör det installeras som en app på telefonen:
1.  Öppna [7srapport.com](https://7srapport.com) i din mobila webbläsare (Chrome/Safari).
2.  **iOS:** Tryck på Dela-ikonen (fyrkant med pil upp) och välj "Lägg till på hemskärmen".
3.  **Android:** Tryck på de tre prickarna och välj "Installera app" eller "Lägg till på startskärmen".
Verktyget kommer nu att fungera även när du har flygplansläge eller är i radioskugga.

## Verktyg i sviten

| Formulär | Beskrivning |
|----------|-------------|
| **7S** | Grundläggande spaningsrapport (Storlek, Slag, Sysselsättning...) |
| **WHAT** | Stridsfordonsidentifiering |
| **SCRIM** | Civila fordon |
| **WEFT** | Flygfarkoster (Fixed-wing, Engines, Fuselage, Tail) |
| **A-H** | Personbeskrivning / signalement |
| **OBSLÖSA** | Observationsrapport |
| **FORS** | Förbandsrapport |
| **PEDARS** | Stridsvärderapport |
| **SCHEMA** | Postschema med automatisk rullning och avlösningsväckning |
| **EOBUSARE** | Eldorder |
| **OBO** | Orientering-Beslut-Order (*Tidigt utvecklingsstadium*) |
| **RASSOIKA** | Patrullchefens checklista (*Tidigt utvecklingsstadium*) |
| **VÄDER** | Meteorologisk prognos (Hämtar SMHI-data vid täckning) |
| **MINKARTA** | Minläggningskarta & minprotokoll (reglementstecken från stab-paketet 2026-04-26, UPK-numrering 001–999, UPK/SP-auto-inmätning, datalista, automatisk dela-med-karta, jumbo-symboler i PNG-export, övningsläge) |

## Teknisk Arkitektur
Applikationen är byggd som en "Modern Vanilla" webbapplikation med ren HTML5, CSS3 och JavaScript (ES6). Den använder inga tunga bibliotek eller ramverk för att säkerställa extremt snabb uppstart och minimal batteriförbrukning på mobila enheter. Service Workers hanterar cachning för offline-bruk.

## Licens
Detta projekt är licensierat under **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International** (CC BY-NC-SA 4.0).

Se [LICENSE](LICENSE) för fullständig licenstext.

---

## Dagbok: Utvecklingslogg

### 2026-04-26: MINKARTA v4 — nya SVG-symboler + dela-med-karta
Sex-fas-iteration på MINKARTA (roadmap: `roadmap-minkarta-v4.md`). v3-
grunden med svarta reglementstecken och UPK-numrering ligger kvar; v4 är
en visuell och interaktionsmässig finputs som byter ut själva symbol-
renderingen mot ett nytt SVG-paket från staben och förenklar dela-flödet.

*   **Nya SVG-symboler (FAS 1):** 20 reglementstecken från
    `stab/Ny mapp (2)/` ersätter v3:s inline-SVG:er. Filnamn städas:
    `" (N)"`-suffix bort, `_` → space. Ny nyckel `forst_forb_sakrad`
    (Förberedd förstöring, säkrad) som eget reglementsbegrepp —
    skiljer passage-möjlig säkring från rå förberedd förstöring.
    Sju v3-nycklar tas bort (`strv_full`, `strv_rojskydd`, `trad`,
    `avstand`, `skenminering`, `landmina_okand`, `riktad_verkan`) —
    ingen motsvarighet i nya paketet. Migration i `loadPersisted()`
    filtrerar bort gamla typer i IndexedDB-state och visar en toast
    så användaren ser vad som hände. Palett-bakgrunden vitnas så de
    svarta symbolerna syns tydligt.
*   **Jumbo-symboler i PNG (FAS 2):** `renderExportAsync()` skalar upp
    point/meta-symbolerna 4× (34→136 px) i exporten. Namn-brickan,
    linje-/polygon-strokes och polygon-etiketterna skalas
    proportionellt (`drawNameBadge` får en `scale`-parameter). Texten
    "UPK 594", "HIND" osv. blir läsbar utan inzoom när mottagaren
    öppnar PNG:n i Signal. Skärmvisningen är oförändrad.
*   **Genvägsrad under kartan (FAS 3):** `.palette-layers` (Namn-
    etiketter-toggle) och Pan-läge-knappen flyttas ut ur paletten till
    en ny `.map-controls`-rad direkt under `.map-wrap`, ovanför paletten.
    De mest frekventa UI-kontrollerna är nu åtkomliga utan scroll.
    Ångra/Gör om/Exportera/Rensa ligger kvar i palette-toolbaren.
*   **Utökad Rensa (FAS 4):** "Rensa allt" nollställer nu även hela
    protokoll-panelen — `#pNr`, `#pAmbition`, `#pForband`, `#pChef`,
    `#pTnr`, `#pRojskydd`, `#pUp`, `#pNote`, `#pOut`, `#pShare`,
    `#pUpWarn`. Auto-TNR prefillas om med ny Zulu-kort, badge visas
    igen. PNG-cachen `_lastExport` rensas. Dubbel-bekräftelsen bevaras.
*   **Dela protokoll (FAS 5):** `showAttachMapModal`-dialogen
    elimineras (död kod, CSS och funktioner borttagna). "Kopiera till
    urklipp" döps om till "Dela protokoll" och blir accent-grön. Klick
    genererar alltid PNG + försöker `navigator.share({files, text})`.
    Fallback: clipboard + PNG-download + toast
    "Text kopierad. PNG nedladdad — bifoga manuellt i Signal."
*   **Polish (FAS 6):** `service-worker.js` CACHE bumpat stegvis
    `_1` → `_6`, slutar på `hv-20260426_minkartav4_6`. README:s
    MINKARTA-rad uppdaterad. Manuell test-matris körd.

### 2026-04-25: MINKARTA v3 — svarta reglementstecken + UPK-numrering
Sex-fas-iteration på MINKARTA (roadmap: `roadmap-minkarta-v3.md`).
Härdar reglementstroheten i två riktningar: symbolerna ritas nu i svenskt
militärt manér med svart linjearbete mot vit bakgrund, och
utgångspunkterna byter namn till UPK med stabila slumpnummer 001–999
istället för sekventiella UP1..UPn.

*   **Svarta reglementstecken (FAS 1):** Alla MK_SYMBOLS omritade till
    svart linjearbete + vit fyllning. Halo-principen inverterad: 3 px
    vit korona via `paint-order="stroke"` ersätter v2:s svarta halo.
    Yttre `filter: drop-shadow` på `.mk-icon svg` byggd som vit aura +
    mjuk mörk kant för läsbarhet mot både grönska, vatten och ljusa
    OSM-tiles (z 18–19). Utförd förstöring (`forst_utf`) är enda
    symbolen som behåller röd accent — det speglar reglementets eget
    exempel. Ny färgmatris dokumenterad i `minkarta-symbols.js`.
    Polygon-/linje-halon i canvas-exporten inverterad till vit bred
    stroke under svart linjearbete.
*   **Saknade beteckningar (FAS 2):** Sex nya reglementstecken:
    `landmina_okand` (tom cirkel, ospecificerad mina), `prov_rojskydd`
    (provisoriskt fordonsröjningsskydd — punkter + vikning),
    `rojskydd` (egen R-symbol), `verkansomrade` (streckad halvcirkel),
    `omr_verkan` (områdesverkande mina med W-hake), `riktad_verkan`
    (cirkel + pil). Varje symbol har en designbeslutskommentar som
    dokumenterar tolkningen. Ny palett-grupp "Övriga landminor".
*   **UPK-numrering (FAS 3):** UP-markören byter namn till UPK
    (Utgångs-Punkt-Koordinat). Vid placering slumpas ett heltal
    1–999, paddas till 3 siffror, unikhet kontrolleras via ett Set.
    Etiketten under markören blir "UPK 594". Numret är **stabilt**
    — en gång slumpat, aldrig renumrerat. Raderas en UPK försvinner
    dess rad; övriga behåller sina nummer. Gamla v2-sessioner
    migreras automatiskt vid `loadPersisted`: `typ: 'up'` → `typ:
    'upk'` + tilldelat slumpnummer.
*   **Redigeringspopup (FAS 4):** Klick på UPK-markör öppnar
    `openEditPopup()` med ett UPK-nummer-fält (siffror, 1–3 tecken,
    padstart till 3). Vid Save: validering 1..999, kollisionscheck
    mot övriga UPK:er, inline-hint blir röd vid fel. SP-referenser
    och pUp-textarean uppdateras direkt vid nummerändring.
*   **SP-referenser (FAS 5):** Alla SP-rader refererar nu "från UPK
    594" istället för "från UP1". `pUp`-textarean skriver "UPK 594:
    MGRS — adress"-format. Reglementsvarningen räknar objekt i state
    istället för rader i textarean och kräver "minst 2 UPK och 1
    SP". Den konkurrerande textbaserade varningen i
    `attachProtocolActions` borttagen — `syncUpTextarea` är nu enda
    källan.
*   **Polish (FAS 6):** `service-worker.js` CACHE bumpat stegvis
    `_1` → `_6`, slutar på `hv-20260425_minkartav3_6`. README:s
    MINKARTA-rad i funktionstabellen uppdaterad. Manuell test-matris
    körd i Chrome desktop + Android Chrome. DevTools Network visar
    bara tile-URL:er + `/reverse` för UPK-adresser — inga
    minsymbolpositioner skickas ut.

### 2026-04-24: MINKARTA v2 — halo-kontrast, UP/SP, datalista, share-popover
Tio-fas-iteration på MINKARTA (roadmap: `roadmap-minkarta-v2.md`). Flyttar
tabben från BETA mot stabil. Ingen förändring i integritetskontraktet utöver
tydlig not om OSM-fallback och UP-reverse-geocode.

*   **Djupare zoom (FAS 1):** Hybrid-lager växlar automatiskt till
    OpenStreetMap Standard vid z 18–19 där OpenTopoMap inte har data.
    Status-raden visar `z 18 — OSM Standard` etc. Exporten följer med.
*   **Kontraststark färgpalett (FAS 2):** Halo-princip via SVG
    `paint-order="stroke"` + 3 px mörk outline + dubbla `drop-shadow`-
    filter på marker-ikonen. Huvudfärger: gul `#ffc107` (neutral), röd
    `#e53935` (farligt), cyan `#00e5ff` (styr/referens), grå `#b0bec5`
    (sken). Läses mot vita vägar, gröna skogsytor och blå vattendrag.
    Färgmatris dokumenterad i `minkarta-symbols.js`.
*   **Saknade symboler (FAS 3):** `avstand_tramp` (avståndslagd trampmin.)
    och `avstand_strv` (avståndslagd strvmin.) som streckade polygoner
    med inbäddad mintyp-preview. Egen grupp "Avståndslagda".
*   **Namn-etiketter (FAS 4):** Kompakt svart bricka med vit text under
    varje punkt/meta-symbol. Togglas via ny "Lager"-ruta i paletten
    (`[✓] Namn-etiketter`). Persisteras till localStorage. PNG-export
    matchar pixel-exakt.
*   **Versaler + auto-TNR (FAS 5):** `Förband` och `Chef` tvingas till
    versaler via `oninput` + CSS `text-transform`. TNR prefillas med
    Zulu-kort DDHHMM (UTC, ej lokal tid — avviker från obslosa.setNow()).
    Liten *(auto)*-indikator släcks vid manuell ändring.
*   **UP/SP-verktyg (FAS 6):** Nya `UP-markör` och `SP-markör` i egen
    grupp. UP:er auto-numreras (UP1, UP2…) och reverse-geocodas via
    Nominatim. SP:er mäts automatiskt in mot närmaste UP med bäring + m.
    `pUp`-textarean synkroniseras icke-destruktivt: auto-rader på
    `UP<n>:`/`SP<n>:`-mönstret regenereras, allt annat bevaras. Drag,
    radering och omnumrering hanteras. Reglementsvarning ≥ 2 UP + ≥ 1 SP.
*   **Datalista i protokoll (FAS 7):** Ny sektion efter Anteckningar:
    `=== DATALISTA (fullständiga positioner) ===` med radbaserad tabell
    av idx, typ, MGRS (center för polygoner), etikett, anteckning.
    Togglas via kryssruta `[✓] Inkludera datalista`, default ON.
*   **Ladda ner / Dela-popover (FAS 8):** Exportera PNG visar nu en
    popover med två knappar (Ladda ner, Dela via app) istället för att
    dela direkt. Auto-stäng efter 8 s eller klick utanför.
    `shareBlob`/`downloadBlob` exporteras från `minkarta-export.js`.
*   **Bifoga karta vid delning (FAS 9):** Kopiera-knappen visar en modal
    "Bifoga kartbild?" med tre val. `Text + karta` försöker
    `navigator.share({files, text})` och faller tillbaka till
    clipboard-copy + PNG-download för browsers utan Web Share.
*   **Polish (FAS 10):** `service-worker.js` CACHE bumpat tio gånger
    (`_1` → `_10`) längs vägen, slutar på `hv-20260424_minkartav2_10`.
    README uppdaterad, BETA-markering finns kvar men fas-arbetet är
    klart. Manuell test-matris i Chrome desktop + Android Chrome.
    DevTools Network visar bara tile-URL:er (z/x/y) + Nominatim/Overpass
    för UP-markörer — inga minsymbol-koordinater någonsin.

### 2026-04-23: MINKARTA
Ny tabb för minläggningskartor med svenska militära kart-tecken för minor.

*   **Kart-skelett:** OpenTopoMap 1:50 000-skala, MGRS-sökfält med paste-extrahering (MGRS / lat,lon), status-rad med vy-MGRS + zoom.
*   **Symbolpalett:** Inline-SVG för 17 svenska minprotokoll-tecken (stridsvagnsminor med/utan röjskydd, trampmina, trådmina, larmmina, fordonsmina, sidverkande, försvarsladdning, avståndslagd R-spindel, förstöring förberedd/utförd/planlagd, minlinje, minruta, minerat område med HIND/FÖRDR/STÖR/AVST, skenminering, avspärrning, yttergränsmarkör).
*   **Ritning:** Placering, drag-flytta, long-press för ta bort, edit-popup för ambition/antal/anteckning, undo/redo (Ctrl+Z), autospar till IndexedDB var ~400 ms.
*   **PNG-export:** Bbox styrs av yttergränsmarkörer (fallback = alla objekt + 20 % padding). Canvas-komposition pixel-exakt från OpenTopoMap-tiles. Titel, fyra hörn-MGRS + center-MGRS, norrpil, skalstock, datum. Web Share API när tillgängligt, annars nedladdning.
*   **Minprotokoll-panel:** Mineringsnummer, ambition (300/600/900 strvmina/km), förband, chef, TNR, utgångspunkter med reglementsvarning vid <2 st, röjningsskydd, autoräkning av minantal och minlinjelängd → Signal-vänlig textgenerator + kopiera till urklipp.
*   **Spelläge SÄNKA MINOR:** Orange ÖVNING-banner, separat gameState, blind + facit PNG-export, budget i m², rollbyte A↔B. Ingen nätverks-sync — allt delas user-initiated via PNG.
*   **Integritet:** Inga minsymbolpositioner skickas någonsin ut. Enda utgående anrop är OpenTopoMap-tiles (z/x/y) och user-initiated adressökning.

### 2026-04-07 – 2026-04-09: Karta, Säkerhet & WEFT-drönare
Tre dagar med fokus på kartfunktioner, säkerhet och nya rapportverktyg.

*   **Reverse geocoding:** Kartval visar nu MGRS + gatuadress, stadsdel, gatukorsningar. Stöd för sjö- och önamn via Overpass API med Lantmäteriet ortnamn som fallback (49 781 poster). Spinner-indikator vid adressuppslag.
*   **HTTPS överallt:** Tvingad HTTPS-redirect i alla 13 formulär via `upgrade-insecure-requests` + JS-redirect.
*   **PWA install-banner:** Egen install-banner (12s auto-hide) med "Mer info"-panel som visar versionsinfo, säkerhetsinformation och länk till källkod. Offline-inforuta vid appstart i standalone-läge.
*   **Auto-extrahering:** Inklistrad text i Ställe-fältet tolkas automatiskt som MGRS eller lat/lon och konverteras.
*   **SRI & fonts:** Subresource Integrity-hashar på alla CDN-skript. Self-hosted Inter-font för offline-rendering.
*   **WEFT drönartyp-väljare:** Fyra klickbara MSB-siluetter (Deltawing, Fixed wing, Quad, Octo) som förifyller Wings/Tail. ASCII-siluett i genererad rapport. Terminologi korrigerad: "Raktvinge" → "Fast vinge".
*   **7S kompass:** Riktningsväljare i kors-mönster för Sysselsättning. Kombinationslogik (N+Ö → NÖ), motstående riktningar blockeras (N/S, Ö/V). Nya chips: Fortsätter post, Fortsätter patrull.
*   **Om-sektion:** Expanderbar footer med integritetsinformation (online/offline-anrop), fork-guide (tre steg), övningsrutin och varningstext. Länkar till OpenTopoMap, Nominatim, Overpass API och SMHI.
*   **OCR borttagen:** Tesseract.js-funktionen togs bort från alla 6 formulär — fungerade aldrig tillförlitligt.
*   **Bakgrunds-geocoding:** Adress uppdateras efter att kartmodalen stängts.
*   **Diverse:** Foto-filnamn i WHAT/SCRIM/WEFT/A-H, Hundförare i RASSOIKA, enhetligt radbryte i OBSLÖSA/POSTSCHEMA, TNR default kort format.

### 2026-04-03: Modernisering & Fältanpassning
En intensiv dag med fokus på UX-förbättringar och kryptologisk säkerhet.

*   **TNR-gränssnitt:** Implementerat ett animerat "slide"-reglage för TNR-format (Kort/Komplett) i samtliga 12 formulär. Inkluderar diskret ljudfeedback för taktil bekräftelse vid växling.
*   **Säkrad Lösendragning:** Uppdaterat **OBSLÖSA** och **RASSOIKA** med en ny algoritm för lösenordsgenerering.
    *   *Strikt tvåstaviga ord:* Rensat ut alla enstaviga ord för att minska risken för misshörning.
    *   *Vokalseparering:* Systemet säkerställer att Ord 1 och Ord 2 aldrig delar samma specialvokal (Å, Ä, Ö), vilket optimerar tydligheten i brusiga radiomiljöer (ex. undviker par som "Båtar & Sågar").
*   **OBO-optimering:** Tagit bort det redundanta fältet 'Plats' för att snabba upp inskrivningen för chefen.
*   **RASSOIKA-standard:** Slagit samman tidigare "Statuskvitto" och "Patrullorder" till en enda enhetlig, linjär R-A-S-S-O-I-K-A -utskrift som garanterar fullständig efterlevnad av checklistan.
*   **Layout & Läsbarhet:** Infört extra blankrader i rapportutskrifterna mellan Från-fält och TNR-fält i sju nyckelsystem för att matcha modern Signal-formatering.
*   **Roadmap-struktur:** Omfattande revidering av projektets roadmap för att möjliggöra effektivt samarbete mellan lokal agent och externa AI-modeller.
