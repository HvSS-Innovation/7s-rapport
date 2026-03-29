# Roadmap: Förbättring av 7S Rapport & Expansion

Denna plan beskriver hur vi utvecklar det befintliga rapporteringsverktyget till en modern, snygg och professionell svit av rapportverktyg för olika syften (7S, WHAT, SCRIM, WEFT, samt A-H). Vi fokuserar på design, användarvänlighet (UX), mobilanpassning och att strukturera koden för publicering på GitHub Pages.

---

## Byggordning (Prioriterad Fasplan)

Arbetet sker i denna ordning för att undvika omarbete:

1. **Fas 1 – Teknisk grund:** Kodstruktur, shared CSS/JS, PWA-skelett
2. **Fas 2 – Master-mall:** Perfekta `7s.html` (7S-rapporten) som referensdesign
3. **Fas 3 – Expansion:** Klona mallen till de fyra nya rapporttyperna och justera fält

---

## 1. Kodstruktur & Modern Utveckling (HTML/CSS/JS)

*   Enkel, ren separation av layout (`index.html` som nav-hub, `7s.html`, `what.html`, etc.) och gemensamma resurser:
    *   `style.css` – all design
    *   `app.js` – generisk logik (kopiering, LocalStorage/IndexedDB, Stund/plats-hantering)
*   `index.html` är en **startsida/navigationshub** som länkar till de olika rapportformulären. Den innehåller inget formulär i sig.
*   Navigering mellan formulären byggs in konsekvent — t.ex. en fast toppbar med tillbaka-knapp och formulärnamn.

---

## 2. Design & Användarvänlighet (UX/UI)

*   **Sagesman Formatmall:** Fältet för 'Sagesman' uppdateras med en strikt formatregel och platshållare/hjälptext. Formatet blir:
    *   `[Första 2 bokstäver i efternamn CAPS][Första bokstav i förnamn CAPS] [Kompaninummer]. [Plutonsnummer] p, [Gruppnummer] grp. [För- och Efternamn]`
    *   Plutons- och gruppnummer skrivs med ordningstal: `1a, 2a, 3e, 4e` osv.
    *   **Gäller samtliga formulär**, inte bara 7S.
*   **Stund & Plats (standard i alla formulär):**
    *   `Stund` – datum/tid, med numeriskt tangentbord på mobil
    *   `Plats` – koordinater (MGRS eller fritext)
*   **Modernt gränssnitt:** Uppdaterad layout med enhetligt och professionellt utseende (CSS Flexbox/Grid). Ett "taktiskt" mörkt läge (Dark Mode) är starkt rekommenderat.
*   **Typografi & Färgschema:** Moderna, lättlästa typsnitt (Inter/Roboto).
*   **Interaktioner:** Mjuka övergångar, tydlig feedback (t.ex. när man kopierar) och tydliga varningar om inmatningsformat inte stämmer.

---

## 3. Mobilanpassning (Responsivitet)

*   **Mobile First:** Apparna anpassas för att snabbt kunna fyllas i på en mobil skärm ute i fält. Inga onödiga zoom-krav.
*   **Tryckvänliga ytor:** Stora knappar, tydliga i-ikoner, anpassat numeriskt tangentbord för fält som kräver siffror (ex. Stund).

---

## 4. Web App & Offline-funktionalitet (PWA)

*   Appen görs "Progressive" med en manifestfil och Service Worker. Detta innebär att appen kan sparas som en ikon på startskärmen (iOS/Android) och köras **helt offline** oavsett mobiltäckning.
*   **Datalagring:** `IndexedDB` används (via ett lättviktigt wrapper-bibliotek) för att lagra rapportutkast — `localStorage` räcker inte för längre rapporter eller många sparade poster.
*   **Exportformat:** Rapporten exporteras som **ren text** (nuvarande format) med möjlighet att lägga till JSON-export senare.

---

## 5. Rapporttyper (Expansion)

Alla nya formulär delar samma layout som 7S-mallen och inkluderar standardfälten Sagesman, Stund och Plats.

### Formulär 1: 7S-rapport (`7s.html`)
Befintlig funktion, omstrukturerad som referensdesign för övriga formulär.

#### Reglementsenliga och internationella rekommendationer
1. **Svenskt Reglemente:** Följer Handbok Markstrid (Storlek, Sysselsättning, o.s.v.). *Rekommendation:* Gör åtskillnad mellan bekämpningsbar (eld) och ren övervakning (OBS).
2. **NATO/Internationellt:** SALUTE (Size, Activity, Location, Unit, Time, Equipment) via STANAG 2084. *Rekommendation:* Bygg in koppling mellan "Slag/Samverkande" och "Equipment/Unit" internt för interoperabilitet.
3. **Militär UX:** Kognitiv belastning sänks genom snabbval (ikoner för fordon/infanteri) istället för text. Dark mode är ett krav för bibehållet mörkerseende (röd/grön nattbelysning-anpassning).
4. **Saknade Fält:** Tillförlitlighet (A-F, 1-6 matrikel) och Inhämtningsvinkel.

### Formulär 2: Stridsfordon (`what.html`)
*   **W**heels: Antal, avstånd, banddrivna fordons drivhjul samt stödhjul. Gruppering i förhållande till kroppen.
*   **H**ull: Fordonets form (exklusive torn), antenner, avgasrör, snorkel, etc.
*   **A**rmament: Beväpning, kanonstorlek, kulsprutor, rökkastare, reaktivt pansar samt dess placering.
*   **T**urret: Tornets form och vad som finns placerat på det.
*   *(Extra)* **Identifiering:** NATO-beteckning, nationstillhörighet/ursprungsland.

#### Reglementsenliga och internationella rekommendationer
1. **Svenskt Reglemente:** Fordonsidentifiering. *Rekommendation:* Utgå från typiska varningsindikatorer (t.ex. pansarvärnsrobot monterad).
2. **NATO/Internationellt:** AFVID (Armoured Fighting Vehicle Identification). *Rekommendation:* Standardisera hjul/band-räkning enligt STANAG 2097.
3. **Militär UX:** "Tap-to-build" silhuett. Klicka på var tornet är placerat istället för att skriva "bak" eller "mitten" för att spara sekunder.
4. **Saknade Fält:** Aktiva motmedel (t.ex. rök/Arena-system) och vapenriktning.

### Formulär 3: Civila fordon (`scrim.html`)
*   **S**ize: Storlek och form (sedan, kombi, pickup, lastbil).
*   **C**olour: Färg på fordonet.
*   **R**egistration: Registreringsnummer och eventuell flagga/landskod.
*   **I**dentifying marks: Antenner, symboler, flaggor, bucklor, rost.
*   **M**odel: Bilmodell och tillverkare.

#### Reglementsenliga och internationella rekommendationer
1. **Svenskt Reglemente:** Identifiering av misstänkta civila fordon (Gråzon/Sabotage). *Rekommendation:* Fokus på avvikelser från det normala (t.ex. förstärkta fjädrar).
2. **NATO/Internationellt:** VBIED-indikatorer (Vehicle-Borne Improvised Explosive Device).
3. **Militär UX:** Färgkarta för snabbt färgval. Fotouppladdning direkt i appen (PWA/kamera-API) om säkerhetsläge tillåter.
4. **Saknade Fält:** Uppskattad lastvikt (t.ex. djupt liggande chassi) och riktning/fart.

### Formulär 4: Flygfarkoster (`weft.html`)
Helikopter, drönare, transportflyg, stridsflyg.
*   **W**ings: Vingarnas form, storlek och placering på kroppen.
*   **E**ngines: Motorer, placering, antal, propellrar/jet.
*   **F**uselage: Kroppens form, färg, symboler, siffror och nationsmärkning/insignia.
*   **T**ail: Stjärtfenans form, placering, antal samt symboler på fenan.

#### Reglementsenliga och internationella rekommendationer
1. **Svenskt Reglemente:** Luftrumsövervakning (LÖ). *Rekommendation:* Möjliggör snabb-rapportering före fullständig WEFT om det rör sig om hotfullt attackflyg.
2. **NATO/Internationellt:** Air-Track-format. *Rekommendation:* Helikoptrar (H) vs Fixed Wing (F) vs UAS (U) bör vara snabbval.
3. **Militär UX:** Stora snabbknappar ("Drone", "Jet", "Heli") direkt på startskärmen för skyndsam luftvarning.
4. **Saknade Fält:** Akustisk signatur (ljudlöst, jetvrål, rotorblad) och flyghöjd (Trädtopp/Låg/Hög).

### Formulär 5: Personbeskrivning (`ah.html`)
*   **A**ge: Uppskattad ålder.
*   **B**uild: Kroppsform (lång, smal, vältränad, ölmage).
*   **C**olour: Hudfärg.
*   **D**istinguishing marks: Ärr, födelsemärken, kläder (färger, typ av jacka/byxor/skor).
*   **E**levation: Längd.
*   **F**ace: Ansiktsform (kantig, rund), hy, ansiktshår.
*   **G**ait: Gångstil.
*   **H**air: Hårfärg, längd, frisyr.

#### Reglementsenliga och internationella rekommendationer
1. **Svenskt Reglemente:** Signalementsbeskrivning. *Rekommendation:* Skilj på tränad personal (utrustningsfokus) kontra irreguljära/civila.
2. **NATO/Internationellt:** Biometric data reporting. *Rekommendation:* Standardiserade kroppsformer enligt allierad standard för enklare delning.
3. **Militär UX:** Bygg signalement med "Avatar"-klick för att minska tangentbordsanvändning i fält.
4. **Saknade Fält:** Bärning (t.ex. vapenlyft, dold utrustning) och Kommunikationsutrustning (synlig radio/headset, mobilanvändning).

### Formulär 7: RASSOIKA - Patrullordermall (`rassoika.html`)
Detta är ett checkliste-formulär ("pre-flight checklist") för patrullchefen, uppdelat i kort för varje bokstav. Fokus är *inte* en rapport, utan en intern statuskontroll. Gröna bockar fylls i per steg för att tillåta patrullens utgång.

*   **R – Repetera uppgiften:** Checkbox för repeterad uppgift. Fält för *Kärna* och *Lösningsplan*.
*   **A – Avdela personal:** Dynamisk lista/roller: Patrullchef, Spjutspets, Orienterare, etc. Fält för Stf chef.
*   **S – Samla patrullen:** Checkbox för samlad patrull, fält för samlingsplats, kompletterande gemensam planering.
*   **S – Stridsberedskap:** Avprickningslista för Ammunition, Radio, Bildförstärkare/kikare, Signalpistol, Livsmedel, Sjukvård, Maskering, Märkning, och pappershygien (kartor/sekretess).
*   **O – Orientera patrullen:** Fält för Fienden, Egna förband, Uppgiften, Passeringar, Lösen, Interna tecken, Återsamlingsplatser. Select: Visat minnesvärd info på Karta/Terrängskiss/Terrängen.
*   **I – Indela patrullen:** Dynamisk lista kopplar person/roll till uppgift/sektor med specifikt ansvar (uppsikt sidor/bakåt/uppåt).
*   **K – Kontrollera:** Checklista för att alla vet uppgift verifierat genom frågor, utrustnings-skrammel testat, kartor röjda, övning genomförd.
*   **A – Anmäl klar till chef:** Checkbox för anmält, hur/till vem, och stund för utgående (datetime-local).
*   **Export:** Genererar 1) Patrullorder-sammanfattning (allt under O) för uppläsning och 2) Statuskvitto med patrullsammansättning och stund för utgång.

#### Reglementsenliga och internationella rekommendationer
1. **Svenskt Reglemente:** Följer beprövad svensk doktrin i Handbok Markstrid Grupp (Patrullorder). *Rekommendation:* Minneshjälpen bör tillåta iterativa uppdateringar, då information byggs på löpande innan utgång.
2. **NATO/Internationellt:** TLP (Troop Leading Procedures) / WARNORD. *Rekommendation:* Tydlig inbyggd synkronisering av tid (Time Hack) behövs innan utgång.
3. **Militär UX:** Progress-indikator ("5/8 steg klara") med linjär navigering där gröna bockar ges när ett "kort" är klart. Sammanfattningen ("Export") bör visas i ett natt/högkontrast-läge med extra stor text för uppläsning i fält utan ficklampa/glasögon.
4. **Saknade Fält:** Reservsambandsplan (PACE-plan) och stridsvärdesbedömning (Ammunition/Vätska/Skador - t.ex. Grönt/Gult/Rött).

---

## 6. Publicering på GitHub Pages

*   **Repo-synlighet:** Besluta om repot ska vara **privat** (rekommenderas — innehåller militär terminologi) eller publikt innan publicering.
*   Skapa Git-repo och pusha kod (HTML-filer, CSS, JS, manifest, service worker).
*   Aktivera *GitHub Pages* via repo-inställningarna (branch `main`, mapp `/root`).
*   Löpande uppdateringar sker automatiskt vid varje framtida `push`.

### Aktuella repon

| Repo | URL | Innehåll |
|------|-----|---------|
| `faltrapport` | `gitjoda71.github.io/faltrapport` | Alla formulär: 7S, WHAT, SCRIM, WEFT, A–H |
| `7s-rapport` | `gitjoda71.github.io/7s-rapport` | Gammal version — ersätts av nytt repo |

### Planerat: Renodlad 7S-version

Skapa ett nytt repo **`7s`** (`gitjoda71.github.io/7s`) som innehåller **enbart 7S-rapporten** — inga flikar, ingen navigering till andra formulär. Byggs från `index.html` med tab-nav borttagen och utan de övriga HTML-filerna.

Fördelarna med ett eget repo:
- Enkel URL att dela med soldater som bara ska använda 7S
- Kan uppdateras oberoende av faltrapport-sviten
- Lättare att verifiera att "det inte finns något annat"

---

---

## 7. Backlog / Kommande ändringar

### RASSOIKA – Slumpa lösen
- [x] Lägg till en "Slumpa"-knapp intill lösen-fälten (Ord 1 fråga / Ord 2 svar) i `rassoika.html`
- Genererar två **tvåstaviga svenska ord** som inte naturligt hör ihop (t.ex. "SKO – MOLN", inte "SOL – SKEN")
- Bygg in en wordlist med ~100–200 tvåstaviga substantiv: vardagliga, enkla att uttala i radio, ingen militär terminologi (undviker förväxling med taktiska termer)
- Algoritmen väljer slumpmässigt utan upprepning; om samma ord skulle dras två gånger — dra om
- Orden skrivs i VERSALER (standard för lösen i militär kommunikation)
- Exempel på godkända ord: SKO, MOLN, BORD, KORG, HUND, FISK, STEN, TRÄD, LAMM, KNIV, GLAS, SKOG, BERG, SAND, NATT, STJÄRN… (undvik par som naturligt hör ihop: SOL+SKEN, IS+BERG, DAG+LJUS)

### RASSOIKA – Statuskvitto
- [x] Justera `generateKvitto()` i `rassoika.html` så att utdata matchar exakt nedan format. Ta bort raderna för Lösen och "Anmält till" ur kvittot (känslig info hör hemma i Patrullorder, inte kvittot). **Patrullorder (`generateOrder()`) berörs inte.**
- Målformat:
  ```
  KVITTO: PATRULL UTGÅENDE
  TNR:           <tnr>
  Utgångstid:    <an_stund | ->
  Styrka:        <antal> pers

  Sammansättning:
    <namn> (<roll>)
    …
  Stf: <stf_namn>

  Stegstatus:
    ✗/✓ R-Repetera
    ✗/✓ A-Avdela
    ✗/✓ S-Samla
    ✗/✓ S-Stridsberedskap
    ✗/✓ O-Orientera
    ✗/✓ I-Indela
    ✗/✓ K-Kontrollera
    ✗/✓ A-Anmäl
  ```

### Alla formulär – Lägg till fältet "Till:"
- [x] Alla rapporter ska ha fälten **Från:** och **Till:** i rapporthuvudet, direkt ovanför TNR. Visa `-` om tomt (konsekvent med övriga fält).
- [x] 7S, WHAT, SCRIM, WEFT, A-H: Lägg till en blank rad mellan Till-raden och Stund-raden i rapporten (`''` i lines-arrayen). Målformat:
  ```
  7S RAPPORT
  Från: -
  Till: -

  Stund: 291812 (s 04)
  …
  ```
- Målformat för alla rapporter:
  ```
  <RAPPORTNAMN>
  Från: -
  Till: -
  TNR:  DDHHMM
  ```
- Berörda filer (alla tabbar som genererar rapport):
  `index.html` (7S), `what.html`, `scrim.html`, `weft.html`, `ah.html`,
  `obslosa.html`, `fors.html` (har redan Från, saknar Till),
  `pedars.html` (har redan Enhet/TNR — lägg till Till),
  `postschema.html`, `eobusare.html`, `obo.html`, `rassoika.html`, `vader.html`

### POSTSCHEMA
- [x] Byt standardnamn på poster: "POST 1" → "Värnpost", "POST 2" → "Eldvakt" (`postschema.html`, funktionerna `resetForm` och `DOMContentLoaded`)
- [x] Klona knappen "+ Lägg till soldat" så att den visas både **ovanför** och **under** soldatlistan (idag finns den bara under). Samma sak bör gälla "+ Lägg till post" om listan växer.
- [x] Soldatfälten ska ha löpande nummer som defaultvärde (1, 2, 3 … i steg med listan). När man klickar i fältet markeras siffran automatiskt (`input.select()` på `focus`-event) så att man direkt kan skriva ett namn utan att radera först. Samma princip bör gälla namnfälten för poster.

### Alla formulär – Rapportformat vid tomma fält (pedagogiskt hjälpmedel)
- [x] Genererad rapport ska **alltid visa alla rubriker/fältnamn**, även när fältet är tomt — visa `-` som platshållare. Fungerar som ett pedagogiskt hjälpmedel: en tom rapport visar rapportens struktur och vad som ska fyllas i.
- Gäller samtliga formulär:
  - `index.html` — **7S** ✅ redan korrekt (referensimplementation)
  - `what.html` — **WHAT** ✅ redan korrekt
  - `scrim.html` — **SCRIM** ✅ redan korrekt
  - `weft.html` — **WEFT** ✅ redan korrekt
  - `ah.html` — **A–H** ✅ redan korrekt
  - `obslosa.html` — **OBSLÖSA** ✅ åtgärdat
  - `fors.html` — **FORS** ✅ åtgärdat
  - `pedars.html` — **PEDARS** ✅ åtgärdat (E, D, A, R visar alltid)
  - `postschema.html` — **SCHEMA** ✅ dynamiskt schema visar alltid poster med `-`
  - `eobusare.html` — **EOBUSARE** ✅ redan korrekt
  - `obo.html` — **OBO** ✅ åtgärdat (Orientering, Beslut, Order alltid synliga)
  - `rassoika.html` — **RASSOIKA** ✅ redan korrekt
  - `vader.html` — **VÄDER** (API-driven, ej tillämpligt)
- **Referens:** `index.html` (7S) — `generateReport()` använder `v('fält') || '-'` för alla fält

### WHAT – Knapp "Fyll tid från foto"
- [x] Ändra knappen "Fyll tid från foto" i `what.html` från `btn-primary` (grön) till samma stil som övriga sekundära knappar (grå/dashed). Den sticker idag ut som en primär åtgärdsknapp men fyller en hjälpfunktion.

### FORS – Ta bort NIVÅ-dropdown
- [ ] Ta bort select-fältet "NIVÅ" (Kompani → Bataljon etc.) från `fors.html`. Ta även bort relaterad JS-logik (`updateNiva()`, `enhetLabel` o.dyl.) om den enbart stödjer detta fält.

### VÄDER – Gör DATUM-fältet redigerbart
- [ ] Gör DATUM-fältet i `vader.html` direkt redigerbart som ett vanligt textfält. Nu-knappen får finnas kvar men ska inte vara enda sättet att sätta datum. Använd samma mönster som övriga textfält.

### Alla 13 tabs – Standardisera Från/Till/TNR-layout
- [ ] Se till att Från/Till/TNR-blocket i alla 13 flikar matchar OBSLÖSA:s format som referens: inline 2-kolumns grid med `style="display:grid;grid-template-columns:1fr 1fr;gap:8px"` direkt i HTML (ej CSS-klass), label ovanför respektive fält, allt i ett `form-group`-block. TNR ligger i eget `form-group` direkt under.
- Berörda filer: `index.html`, `what.html`, `scrim.html`, `weft.html`, `ah.html`, `obslosa.html` (referens, ej ändra), `fors.html`, `pedars.html`, `postschema.html`, `eobusare.html`, `obo.html`, `rassoika.html`, `vader.html`

---

**Nästa Steg:**
Börja med Fas 1: sätt upp filstrukturen (`index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`) och PWA-skelettet. Bygg sedan ut `7s.html` som master-mall innan de övriga formulären skapas.
