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

#### 🛡️ Förbättringar av viloregler (Feedback från fältet)

- [ ] **Viloregel på postnivå (inte personnivå):** Flytta logiken för viloregler från den enskilda personen till den specifika posten. Vid skapande av t.ex. eldpostlista krävs viloregel, men vid infartspost dagtid är det inte lika nödvändigt. Nuvarande personbundna regler skapar onödiga begränsningar.
    - *Implementering:* Varje post i `posterLista` bör ha en toggle eller checkbox för att aktivera/avaktivera vilokrav. Schemaläggningsmotorn respekterar då vilokravet per post snarare än globalt per person.

- [x] **Justerbara parametrar för vila:** Möjliggör inställning av specifik vilotid (i timmar) per post, istället för fasta 6h eller 3+5 som gäller för fordonsförare och liknande.
    - *Exempel:* En soldat som är infartspost dagtid kan behöva 2 timmars vila innan nästa förläggningspost. Implementerat som ett numeriskt fält (Vila h) vid varje post i posterLista. 0 = inget krav.
    - *Bakgrund:* Fastställd viloregel 6h/3+5 gäller fordonsförare — andra posttyper kan ha lägre eller inga krav.

- [ ] **Logik för gruppvis skiftgång (intern rotation):** Stöd för scenarion där en grupp ansvarar för en postering under t.ex. 6–8 timmar och roterar internt (t.ex. 1 h per person), utan individuella vilokrav mellan de korta interna passen.
    - *Krav:* Individuell viloregel ska inte tillämpas på intern rotation inom gruppen, så länge gruppens totala dygnsvila uppfylls i enlighet med dygnsschemat.
    - *Utred:* Räcker en öppen lista för signering i dessa fall, eller krävs en lista i förväg? Implementera ett alternativt schemaläggningsläge för gruppansvar med öppen signering.

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
- [x] Ta bort select-fältet "NIVÅ" (Kompani → Bataljon etc.) från `fors.html`. Ta även bort relaterad JS-logik (`updateNiva()`, `enhetLabel` o.dyl.) om den enbart stödjer detta fält.

### VÄDER – Gör DATUM-fältet redigerbart
- [x] Gör DATUM-fältet i `vader.html` direkt redigerbart som ett vanligt textfält. Nu-knappen får finnas kvar men ska inte vara enda sättet att sätta datum. Använd samma mönster som övriga textfält.

### Alla 13 tabs – Standardisera Från/Till/TNR-layout
- [x] Se till att Från/Till/TNR-blocket i alla 13 flikar matchar OBSLÖSA:s format som referens: inline 2-kolumns grid med `style="display:grid;grid-template-columns:1fr 1fr;gap:8px"` direkt i HTML (ej CSS-klass), label ovanför respektive fält, allt i ett `form-group`-block. TNR ligger i eget `form-group` direkt under.
- Berörda filer: `index.html`, `what.html`, `scrim.html`, `weft.html`, `ah.html`, `obslosa.html` (referens, ej ändra), `fors.html`, `pedars.html`, `postschema.html`, `eobusare.html`, `obo.html`, `rassoika.html`, `vader.html`

### VÄDER – Ta bort Från/Till
- [x] Ta bort Från/Till-fälten i `vader.html`. Väderrapporten är inte en person-till-person-rapport och behöver inte avsändare/mottagare.

### Alla tabs – Standardisera result-header-text
- [x] Ändra `.result-header`-texten i alla filer till formatet `<RAPPORTNAMN> redo att kopieras`:
  - `index.html` — ✅ "Rapport redo att kopieras"
  - `what.html` — ✅ "Rapport redo att kopieras"
  - `scrim.html` — ✅ "Rapport redo att kopieras"
  - `weft.html` — ✅ "Rapport redo att kopieras"
  - `ah.html` — ✅ "Rapport redo att kopieras"
  - `obslosa.html` — ✅ "OBSLÖSA redo att kopieras"
  - `fors.html` — ✅ "FORS redo att kopieras"
  - `pedars.html` — ✅ "PEDARS redo att kopieras"
  - `postschema.html` — ✅ "SCHEMA redo att kopieras"
  - `eobusare.html` — ✅ "EOBUSARE redo att kopieras"
  - `obo.html` — ✅ "OBO redo att kopieras"
  - `rassoika.html` — ✅ "RASSOIKA redo att kopieras"
  - `vader.html` — ✅ "VÄDER redo att kopieras"

### EOBUSARE – Ändra rapporttitel
- [x] Ändra rapport-titeln i `generateStatuskvitto()` från `STATUS: EOBUSARE – ELDSTÄLLNING INTAGEN` till bara `EOBUSARE` (rad ~341 i eobusare.html)

### POSTSCHEMA – Fixa tidsberäkning
- [x] Schema ska starta exakt på TNR-tiden (t.ex. TNR 292300 → schema börjar 2300, inte 2303)
- [x] Varje pass slumpas oberoende: reguljär 50/60/70 min, Grpc 60 min, Förare/RPAS 60/70 min
- [x] Eldvakten väcker den nya värnvakten 10 minuter innan avlösningen ska ske
- [x] Grpc har exakt 1 timme per pass
- [x] Förare och RPAS har alltid minst 1 timme och max 1 timme 10 minuter per pass
- [x] Avlösningsordning: Vakt 9 (eld) väcker vakt 2 → vakt 2 går till vakt 1 (värn) och avlöser → vakt 1 går till vakt 9 (eld) och avlöser

### RASSOIKA – Förbättringar från blogganalys
Källa: hemvarn.wordpress.com (RASSOIKA-artikel)
- [x] **I – Fördefinierade roller som snabbval:** Lägg till snabbvalsknappar för vanliga roller (Orienterare, Rapportkarl, Spejare, Säkerhetsman) i indelningssteget, så man slipper skriva fritext varje gång.
- [x] **O – Terrängmodell som orienteringsval:** Lagt till "Terrängmodell" som fjärde alternativ i `o_visat`-selecten.
- [x] **R – Checkpunkter för klargörande:** Lagt till checkboxar under Repetera-steget: mineringar, fiendeläge, egna förband, terräng, väder — som minnesstöd för patrullchefen.
- [x] **K – Förtydliga övningsmoment:** Bytt texten till "Övning av strid/moment genomförd (rehearsal)".

### Automatiserad Feedback-loop (CRM för fältet)
- [x] **Direkt tackmail:** Skicka ett automatiskt "Tack för din rapport" direkt vid inskickat formulär. Använd EmailJS eller Formspree för att hantera detta utan backend.
- [x] **Notifiering vid lösning:** Automatisera ett mail till rapportören när deras bugg/förslag är implementerat. Triggat via GitHub Actions när tillhörande Issue stängs.
- [x] **Versionsreferens:** Inkludera en länk till den uppdaterade versionen av 7srapport.com i mailet.

---

**Nästa Steg:**
Börja med Fas 1: sätt upp filstrukturen (`index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`) och PWA-skelettet. Bygg sedan ut `7s.html` som master-mall innan de övriga formulären skapas.

---

## Roadmap

Här samlas arbetsmoment, inrapporterade fel (Issues från GitHub) och önskemål för framtiden.

### 📝 Nya / Öppna (Arbetsfördelning)

#### ⚠️ [Tier 1 - Kritisk] Säkerhetsrisk: Förhindra ofrivilligt röjande av egen position (Issue #10)
**FARA FÖR PROJEKTET:** Användare riskerar att oavsiktligt rapportera (och därmed röja) sin egen GPS-position när avsikten var att ange _målets/observationens_ position. Detta kan leda till svåra taktiska fel eller riskera förbandets säkerhet om t.ex. artilleri leds mot fel koordinater. 
**Åtgärd för att lösa:**
- **Separation:** Tydliggör skillnaden mellan "Egen position" och "Observerad position" (bör byta namn från "Ställe" till "Målets position").
- **Ingen auto-fyll:** Kartverktyget och plats-fälten får absolut inte auto-fyllarapportörens egen position utan ett uttryckligt och tydligt bekräftelseval från användaren. Kartvalet ska enkom avse den observerade positionen.

#### 🐛 [Bugg & UX] Förbättringar från Automatiserad Buggtestning
#### ✅ ~~Väder API "Silent Failure" (Dålig Felhantering)~~ — Åtgärdat
~~Vid ett ogiltigt datum kastar `vader.html` ett undantag vid 400 Bad Request från Open-Meteo. Detta fångades upp och renderade en traditionell JS `alert()`.~~
- `alert()` i `vader.html` ersatt med inline-felruta under "Generera väderrapport"-knappen som fade:ar ut efter 6 s.

#### ✅ ~~Rensa deprecated meta-taggar~~ — Åtgärdat
~~`<meta name="apple-mobile-web-app-capable" content="yes">` fanns kvar i `<head>` på alla HTML-filer.~~
- Borttagen från samtliga 13 webbfiler (index, ah, eobusare, fors, obslosa, obo, what, postschema, rassoika, scrim, weft, pedars, vader).

#### ✅ ~~Saknad favicon.ico (kastar 404 error i bakgrunden)~~ — Åtgärdat
~~Webbläsaren begärde `/favicon.ico` och konsolen dumpade 404.~~
- `favicon.ico` (multi-size 16/32/48/64) genererad i root från `icon.svg`, och `<link rel="icon" type="image/svg+xml" href="icon.svg">` + `<link rel="alternate icon" href="favicon.ico">` inlagda i header på alla HTML-filer.


#### ✅ ~~Karta: Dubbla/flera markörer visas på kartan~~ — Åtgärdat
~~Vid upprepad användning av kartmodalen kan flera markörer visas samtidigt.~~
- Åtgärdat i alla 6 tabs med kartmodal.

#### 7S – Interaktiv karta för STÄLLE (issue #5) ✅ Implementerad
MGRS-knappen ersatt med interaktiv karta (Leaflet.js + OpenTopoMap) i alla 6 tabs med STÄLLE/Plats-fält.

**Krav:**
- Behåll befintlig `📍 MGRS`-knapp oförändrad (den fyller funktion vid kontaktrapportering på plats)
- Lägg till en ny knapp `🗺 Karta` bredvid MGRS-knappen i `.input-row` under STÄLLE
- Knappen öppnar en kartöverlägg (modal/fullskärm) med OpenStreetMap-brickor (Leaflet.js via CDN)
- Kartan centreras initialt på användarens GPS-position (om tillgänglig), annars Sverige (59.33, 18.07 zoom 5)
- Tryck/klick på kartan → konverterar lat/lon till MGRS via den befintliga `MGRS.forward(lat, lon)` i `index.html`
- MGRS-koordinaten visas i en ruta på kartan + fylls i `#stalle`-fältet vid bekräftelse ("Välj denna plats")
- En markör visar vald punkt; ny tryckning flyttar markören
- Stäng-knapp (×) avbryter utan att ändra fältet
- **Kartstil: OpenTopoMap** — ingen API-nyckel krävs, visar höjdkurvor, vegetation och skogsmarkering, militärt utseende. URL: `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png`
- Stäng-knapp (×) avbryter utan att ändra fältet
- **Offline-aspekt:** Notera i koden att `tile layer` kan bytas mot lokalt cachade brickor via service worker i framtiden — men *inget krav* att implementera offline-kartor nu
- **Framtida uppgradering:** Om skärpan på hög zoom är otillräcklig — byt till MapLibre GL JS + vector tiles (skalbar vektorgrafik, skarp i alla zoomnivåer, smidigare panorering)

**Berörda filer:** `index.html` (HTML: kartmodal + knapp, CSS: modal-stil, JS: Leaflet init + klick-hantering)
**Beroenden:** Leaflet.js (~40 kB gzip) via CDN `<link>` + `<script>` i `<head>`

#### 7S – SYMBOL kan fyllas via inbäddade delformulär (issue #5) ✅ Implementerad
SYMBOL-fältet i 7S kan fyllas via inbäddade SCRIM/WEFT/A-H/WHAT-formulär som öppnas som modal (iframe med `?mode=embed`). "Klistra in i 7S"-knapp skickar data via `postMessage`.

**Flöde:**
1. Under SYMBOL-fältet i `index.html` — lägg till snabbknappar: `[SCRIM]` `[WEFT]` `[A-H]` `[WHAT]` (samma stil som befintliga färg-chips)
2. Klick öppnar valt formulär som en **modal/overlay** ovanpå 7S (användaren lämnar aldrig 7S-sidan)
3. Formuläret laddas i en `<iframe>` med URL-parameter `?mode=embed` (t.ex. `scrim.html?mode=embed`)
4. I embed-läge:
   - Dölj: navigation (`.tab-nav`, `.tab-nav-sub`), header, Från/Till/TNR-block, Stund/Ställe/Sagesman-fält, "Kopiera"-knapp
   - Visa: **enbart de formatspecifika fälten** (SCRIM: Size/Colour/Reg/Ident/Model; WEFT: Wings/Engines/Fuselage/Tail; A-H: Age/Build/…; WHAT: Wheels/Hull/Armament/Turret)
   - Visa knappen **"Klistra in i 7S"** istället för "Generera rapport"
5. Knappen samlar enbart de formatspecifika fälten (inte Stund/Ställe/Sagesman — de finns redan i 7S) och anropar `window.parent.postMessage({ type: 'symbol-fill', format: 'SCRIM', text: '...' }, '*')`
6. `index.html` lyssnar på `message`-event → fyller `#symbol`-textarea med mottagen text → stänger modalen
7. I den slutliga 7S-rapporten visas det som:
   ```
   Symbol (SCRIM):
     Size:       Pickup, stor
     Colour:     Svart
     Reg.nr:     ABC 123
     Ident.mrks: Antenn, rostig
     Model:      Toyota Hilux
   ```

**Viktiga detaljer:**
- Stund, Ställe och Sagesman ska **inte** dupliceras — de ärvs från 7S-rapporten. Embed-läget visar bara det som är unikt för formatet.
- WHAT bör ingå bland valen (stridsfordon är en vanlig observation i 7S)
- Befintliga färg-chips (Grön, Röd, Svart…) under SYMBOL behålls — de kompletterar, inte ersätter, delformuläret. Användaren kan välja att bara skriva "Grön, kamouflage" eller öppna ett fullständigt SCRIM.
- Om SYMBOL redan har text (t.ex. färg-chips) och användaren lägger till SCRIM → text appendas, inte ersätts.
- Modalen bör ha en tydlig rubrik: "SYMBOL: Fyll i via SCRIM" och stäng-knapp (×)
- WHAT bör inkluderas: `what.html?mode=embed` → visar Wheels/Hull/Armament/Turret

**Berörda filer:**
- `index.html` — modal-HTML + CSS, `postMessage`-lyssnare, format-knapparna under SYMBOL
- `scrim.html`, `weft.html`, `ah.html`, `what.html` — detektera `?mode=embed` via `new URLSearchParams(location.search).has('mode')`, dölja nav/header/gemensamma fält, byta "Generera rapport" mot "Klistra in i 7S", skicka `postMessage` med enbart formatspecifika fält

**Notering:** iframe-lösningen är pragmatisk och snabb. Om filerna senare refaktoreras till JS-moduler kan modalerna byggas utan iframe.

**Fristående bruk påverkas ej** — SCRIM/WEFT/A-H/WHAT fungerar precis som idag när de öppnas utan `?mode=embed`.

#### 🎨 Uppgifter för UX/UI-Specialist (Claude Opus Web-gränssnitt)
> **INSTRUKTION TILL CLAUDE:** Eftersom projektet består av 12 separata HTML-filer, ska du **inte** be användaren klistra in koden manuellt överallt. 
> Ditt mål är att utveckla logiken/stilarna som självständiga kodblock (t.ex. en JS-funktion, eller en CSS-klass). Mata ut koden komplett i chatten, och skriv därefter en prompt som användaren kan ge till sin "lokala agent" (Antigravity) som säger: *"Applicera denna CSS/JS i filen X, eller sprid ut denna kod över de 12 html-filerna"*. På så sätt elimineras risken för slarvfel.

*   **Automatisk ologisk lösendragning i OBSLÖSA och RASSOIKA**
    *   *Kravspecifikation:* Lösenordsfälten ska slumpas fram automatiskt när sidan laddas, men även ha en knapp för att slumpa fram nya ord manuellt. 
    *   Orden måste uppfylla följande kryptologiska principer: Alltid exakt tvåstaviga svenska ord, inga egennamn, och kombinationen av ord får inte ha en logisk följd (omaka ordklasser).
*   **Pedagogisk toggle/switch för TNR (Kort/Långt)**
    *   *Kravspecifikation:* Knappen som växlar TNR mellan kort och långt format ska bli ett "slide"-reglage för ökad tydlighet. Innehåller enkel glidande CSS-animation, extremt diskret kort ljud ("slide"), färg-/textbyte för tydlig UX.

#### 🤖 Uppgifter för Lokal Agent (Antigravity)
*   ~~**Ta bort fältet 'Plats' i OBO**~~ ✅ Redan borttaget — fältet finns inte i nuvarande OBO.
*   ~~**Enhetligt radbryte i rapportutskriften för resterande formulär**~~ ✅ Alla 12 formulär följer nu samma mall: blankrad efter Från och efter TNR.
*   ~~**Enhetlig linjär utskrift i RASSOIKA (ta bort mall-val)**~~ ✅ Redan implementerat — en enda linjär R-A-S-S-O-I-K-A-utskrift, inga mall-val.

### 🚁 UAV / Underrättelse – Smartare positions- och uppdragshantering
Återkoppling från användare rörande friktionen mellan drönarsystem/karta och rapportverktyget i fält.

- [ ] **1. Åtskillnad av Min Position och Målposition:** Utvärdera om `Ställe`-fältet bör delas upp eller ha extra kontext. En pilot som sitter 4 km bort behöver tydligt separera var *drönaren ser* målet (målet) och var *piloten* befinner sig, för att undvika missförstånd. Byta etikett från "Ställe" till "Målets position (MGRS)"?
- [x] **2. Klistra in MGRS / Text-extrahering:** ✅ Implementerat — paste-event i Ställe-fältet extraherar automatiskt MGRS och lat/lon via `extractCoord()`. Alla 6 kartfiler.
- [x] **3. OCR / Bildinläsning:** ✅ Implementerat — 📷 OCR-knapp vid Ställe-fältet, Tesseract.js on-demand, + "✓ Visa på karta"-verifiering. Alla 6 kartfiler.
- [ ] **4. Uppdrags-profiler (Missions):** 7S-rapporten upplevs för statisk. Inför en inställning typ "Preppad 7S" där man kan ladda in ett visst uppdrag (t.ex. "Spana efter drönare" eller "Spana fordon"). Detta skulle kunna:
    - Höja relevanta snabbval (chips) överst eller "förfärga" dem.
    - Lägga till ett beskrivningsfält på varje punkt som fungerar som en minneslista för uppdraget ("Glöm ej X under denna punkt...").
    - Gömma onödiga fält (kognitiv avlastning).
- [ ] **5. Sensor & Observationsmetod:** Inför snabbval för *hur* observationen gjordes, till exempel: Visuell kamera (MRPAS), IR-kamera (MRPAS), Värmekikare, eller Bildförstärkare. Att veta vilken sensor som använts ger mottagaren viktig teknisk kontext.
- [ ] **6. Tillförlitlighet & Avstånd:** På långa avstånd eller med dåliga sensorer (t.ex. blurrig IR) blir observationer ofta en "bedömningssport". Möjliggör angivelse av ungefärligt avstånd och standardiserad tillförlitlighetsgrad (exempelvis gradering 1–6) så att underrättelsebefälet kan vikta rapportens värde rätt (skilja en stensäker observation från en misstanke).
- [ ] **7. Målets Status (Rörelse):** Ett enkelt snabbval/fält för om målet är i "Rörelse" eller "Orörligt/Statiskt", då detta ofta är direkt avgörande för verkansbeslut eller uppföljning.

### 🔗 [Tier 3] ATAK-kompatibilitet & TAK-ekosystemintegration (Issue #26)
Bakgrund: Återkommande fråga om kompatibilitet med ATAK och närliggande funktioner (rapporterad av @salmi4k).  
Utredning av teknisk genomförandeväg, uppdelad i fyra inkrementella etapper.  
**Systemkontext:** Hemvärnets MRPAS (UAV 06 Skatan / Parrot ANAFI USA GOV) integreras redan i TAK via Sweden Dynamics. 7S Rapport kan bli bryggan mellan fältrapportör och taktisk lägesbild.

#### Etapp A — CoT-export (Offline-kompatibel, ingen server krävs)
*Komplexitet: Låg | Beroenden: Inga*
- [x] **CoT XML-generator:** JS-funktion `generateCoTXML()` i varje rapportformulär som konverterar ifylld rapport till giltigt CoT XML-event
  - Mappa rapporttyp → CoT type-kod: 7S infanteri → `a-h-G`, fordon → `a-h-G-E`, flygfarkost → `a-h-A`, drönare → `a-h-A-MFQ`
  - Konvertera MGRS → lat/lon för `<point>`-elementet
  - Tidsstämpel (TNR) → ISO 8601 för `time`/`start`/`stale`
  - Rapportdetaljer i `<detail><remarks>` som fritext
- [x] **"Exportera som CoT"-knappar:** Kopiera CoT XML, Ladda ner Data Package, Publicera till TAK + dela via Signal — i alla 5 formulär
- [x] **ATAK Data Package-format:** ZIP med `manifest.xml` + `cot/`-mapp istället för rå `.cot`-fil — krävs för att ATAK ska importera korrekt
- [x] **URL-parameterstöd:** `?mgrs=` och `?lat=&lon=` för ATAK→web-integration (långtryck i ATAK → öppna 7S Rapport med förifylld position)
- [ ] **Lokal testmiljö med Android Emulator:** Sätt upp Android Studio + Android Emulator med ATAK CIV för att verifiera import/export utan fysisk enhet
  - Installera [Android Studio](https://developer.android.com/studio) med Device Manager
  - Skapa virtuell enhet (Pixel 7, API 33+)
  - Installera ATAK CIV `.apk` (Google Play i emulatorn eller `.apk` från [TAK.gov](https://tak.gov))
  - Testa Data Package-import, URL-parametrar och CoT-validering
- [ ] **CoT-validering:** Verifiera att genererad XML + Data Package importeras korrekt i ATAK-CIV och visar markörer på kartan

#### Etapp B — TAK Server REST-integration (Kräver nätverksåtkomst)
*Komplexitet: Medel | Beroenden: Etapp A, TAK Server tillgänglig*
- [ ] **Inställningspanel "TAK-anslutning":** Ny sektion i appen (dold bakom toggle i Om-sektionen) för:
  - Server-URL (t.ex. `https://tak.example.com:8443`)
  - Autentisering: klientcertifikat (upload .p12) eller API-nyckel
  - Anslutningstest ("Ping TAK Server")
  - QR-kod-skanning för snabb konfiguration (server + cert i en QR)
- [ ] **"Publicera till TAK"-knapp:** Vid genererad rapport, en-klicks publicering via TAK Server Marti API:
  - POST CoT till `/Marti/api/cot` 
  - Valfritt: koppla till en TAK Mission via `/Marti/api/missions/{name}/contents`
- [ ] **Offline-kö:** Om nät saknas → spara CoT-event i IndexedDB-kö → automatisk synk vid återanslutning (Service Worker bakgrundssynk)

#### Etapp C — Realtidslägesbild (WebSocket / WebTAK-paritet)
*Komplexitet: Hög | Beroenden: Etapp B*
- [ ] **Inkommande CoT-ström:** Lyssna på TAK Server WebSocket → visa andra enheters rapporter/positioner på Leaflet-kartan i realtid
  - Vänliga enheter (blå markörer), rapporterade mål (röda markörer), med MIL-STD-2525-ikoner
- [ ] **Gemensam uppdragskarta:** Visa aktiv TAK Mission-data som kartöverlägg — ritade områden, rutter, intressepunkter från ATAK-klienter
- [ ] **MRPAS-telemetri:** Om tillgängligt via TAK Server — visa drönarens realtidsposition och sensorstatus direkt i 7S-kartmodalens Leaflet-vy

#### Etapp D — ATAK-plugin (Native integration)
*Komplexitet: Mycket hög | Beroenden: Etapp A-C, Android SDK*
- [ ] **ATAK-plugin "7S Rapport":** Android APK som lägger till ett 7S-rapportformulär direkt i ATAK:s gränssnitt
  - Formuläret öppnas som DropDownReceiver-panel i ATAK
  - Automatisk ifyllning av position från ATAK-kartans markör
  - Publicering direkt till TAK Server utan att lämna ATAK
- [ ] **Alternativ: WebView-inbäddning** — ladda 7srapport.com i en ATAK WebView-plugin för snabbare leverans utan native-utveckling

#### Teknisk bedömning (sammanfattning)
| Aspekt | Bedömning |
|--------|-----------|
| **Direkt integration** | Möjlig via CoT XML + TAK Server REST API. JS-bibliotek finns (`@tak-ps/node-cot`) |
| **Export/Import** | Enklaste vägen — `.cot`-fil som delas manuellt till ATAK-enhet. Fungerar offline |
| **Parallellt bruk** | Nuvarande läge — 7S Rapport och ATAK används sida vid sida utan datautbyte |
| **Rekommenderad väg** | Etapp A först (CoT-export, 0 beroenden), sedan B vid behov. C och D är framtida mål |
| **Säkerhetsaspekt** | Egen position får ALDRIG auto-delas via CoT. Explicit bekräftelse krävs vid varje publicering |

#### Referensdokumentation
- ATAK-CIV källkod: `github.com/deptofdefense/AndroidTacticalAssaultKit-CIV`
- TAK Server: `github.com/TAK-Product-Center/Server`
- FreeTAKServer REST API-dokumentation
- node-cot (CoT↔JSON): `npmjs.com/package/@tak-ps/node-cot`
- FOI-R--3981--SE: "RPAS för territoriell övervakning 2030"
- Sweden Dynamics: TAK-integration med 7. Mekbrig/P7
- FMV: Leverans av UAV 06 till Hemvärnet (2024)
- Expertprompt: `verktyg/ATAK_INTEGRATION_PROMPT.md`

---

### ✅ Åtgärdade
*   **Återställd valbar passlängd i POSTSCHEMA**
    *   Fältet "Passlängd (timmar)" är tillbaka under Schema-inställningarna. Koden som tidigare slumpade passlängder (50/60/70 min) inaktiverades, och systemet respekterar nu istället användarens val fullt ut.
*   **Automatisk konvertering till versaler för specifika fält**
    *   Fälten för "Till", "Från" och "Sagesman" konverterar nu automatiskt all inmatning till versaler (stora bokstäver) i farten. Uppdaterat i alla berörda formulär.
*   **Stöd för både gammalt och nytt tidsnummer**
    *   Appen stöder nu både kort format (`DDHHMM`) och fullständigt format (`DDHHMMZMånÅÅÅÅ`) i validering (`pattern`) och hjälptexter i alla 12 formulär.
*   **[Issue #1] byt plats på Från och Till**
    *   Till visas nu före Från i alla 12 formulär (HTML-grid och rapportutskrift). Militär signalordning: mottagare först.
*   **[Issue #2] fullständigt tidsnummer**
    *   Tidsnumret utökat från `DDHHMM` till `DDHHMMZMånÅÅÅÅ` (t.ex. `031430BAPR2026`). Tidszon B (CET) / C (CEST) beräknas automatiskt. Sekunder borttagna. Uppdaterat i alla 12 formulär: JS-funktioner, EXIF-fotoläsning, placeholder, maxlength, pattern-validering och hjälptexter.

### ❌ Refuserade
*(Inga refuserade issues för tillfället)*
