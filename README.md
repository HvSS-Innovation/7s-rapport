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
| **MINKARTA** | Minläggningskarta & minprotokoll (OpenTopoMap, PNG-export, övningsläge) |

## Teknisk Arkitektur
Applikationen är byggd som en "Modern Vanilla" webbapplikation med ren HTML5, CSS3 och JavaScript (ES6). Den använder inga tunga bibliotek eller ramverk för att säkerställa extremt snabb uppstart och minimal batteriförbrukning på mobila enheter. Service Workers hanterar cachning för offline-bruk.

## Licens
Detta projekt är licensierat under **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International** (CC BY-NC-SA 4.0).

Se [LICENSE](LICENSE) för fullständig licenstext.

---

## Dagbok: Utvecklingslogg

### 2026-04-23: MINKARTA
Ny tabb för minläggningskartor enligt *Mineringar på karta – sammanställning*
(Fältarbeten s. 338–342, Handbok 11.7.1).

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
