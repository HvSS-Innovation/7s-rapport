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

## Teknisk Arkitektur
Applikationen är byggd som en "Modern Vanilla" webbapplikation med ren HTML5, CSS3 och JavaScript (ES6). Den använder inga tunga bibliotek eller ramverk för att säkerställa extremt snabb uppstart och minimal batteriförbrukning på mobila enheter. Service Workers hanterar cachning för offline-bruk.

## Licens
Detta projekt är licensierat under **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International** (CC BY-NC-SA 4.0).

Se [LICENSE](LICENSE) för fullständig licenstext.
