# Roadmap: Automatiserad Pärmrobot (Hålat papper till pärm)

**Mål:** Att utveckla en användarvänlig och effektiv mekanisk lösning för kontorsmiljöer som automatiskt placerar färdighålade papper i en öppen gaffelpärm (eller ringpärm) och trär dem över ringmekanismen.

## 1. Kravspecifikation
*Definiera de tekniska kraven och funktionerna för lösningen.*

- **Funktionella krav:**
  - Maskinen ska kunna ta emot en bunt med redan hålade papper (standard A4 med svensk standardhålning (4 hål) eller europahålning (2 hål), beroende på vald pärmtyp).
  - Pärmens ringmekanism måste hållas fixerad och öppen under inmatningen.
  - Papperen ska matas in automatiskt (antingen ett och ett i tät följd eller i mindre buntar) och träs smidigt över pärmens ringar.
- **Användarvänlighet & Arbetsmiljö:**
  - Intuitivt gränssnitt med tydliga indikatorer (t.ex. Start/Stopp-knapp, status-LED).
  - Låg ljudnivå, anpassad för att inte störa i ett öppet kontorslandskap.
  - Inbyggda säkerhetsmekanismer (nödstopp, sensorer för luckor så att rörliga delar stannar om händer kommer emellan).
- **Fysiskt format:**
  - Kompakt design; ska kunna placeras på ett vanligt skrivbord i anslutning till en utskriftsstation.
  - Enkelt handhavande för att lägga in och ta ur pärmen.

## 2. Design och prototyp
*Utveckla en 3D-modell för mekanismen som kan mata in papper i en öppen pärm och trä dem över ringarna.*

- **CAD-Modellering (t.ex. Autodesk Fusion 360, FreeCAD, SolidWorks):**
  - **Pärmfixtur:** En stödstruktur som positionerar pärmen i exakt rätt vinkel och säkerställer att ringarna förblir fullt öppna och riktade mot pappersflödet.
  - **Pappersmagasin:** En plan eller lutande yta med sidoguider för iläggning av hela bunten med papper.
  - **Matningsmekanism:** En konfiguration av gummivalsar och en bygd "styrskena" (guide chute) som tvingar ner pappret i en bana där hålen automatiskt träs på ringarna i botten.
- **Virtuell Simulering:**
  - Analys i 3D-miljön för att visuellt säkerställa kinematiken och pappersbanans överlappning med ringarnas vinklar och placering.
- **3D-printad Prototyping:**
  - Printa kritiska sektioner (fästen, styrskenor och matar-axlar) för att testa hur väl vanliga pappersark glider och böjs i mekanismen.

## 3. Komponentval
*Lista de nödvändiga komponenterna och hur de ska integreras.*

- **Mekanik & Chassi:**
  - **3D-printade delar:** PLA eller PETG för stabila styrskenor med låg friktion.
  - **Aluminiumprofiler (t.ex. 2020 V-slot):** För att bygga en robust och modulär grundram som tål vibrationer från motorerna.
  - **Pappersmatningsvalsar:** Gummiklädda rullar (friktionshjul) ofta använda i vanliga skrivare.
  - **Kullager:** För jämn och friktionsfri rotation runt axlarna.
- **Elektronik & Motorer:**
  - **Stegmotorer (t.ex. NEMA 17):** Perfekt för kontrollerad rotation, vilket tillåter att mata pappret exakt rätt sträcka per iteration.
  - **Mikroservon / Linjära ställdon:** För att eventuellt trycka till/skjuta ner pappret det sista steget så att det säkert hamnar i botten av pärmen, eller stänga ringarna i ett senare steg.
- **Sensorer:**
  - **Optiska / IR-sensorer:** Avkänner om magasinet är laddat med papper samt ser till att papprets framkant är på exakt rätt plats.
  - **Microbrytare:** Känner av att pärmen sitter korrekt monterad och inkopplad i armaturen.
- **Integration:**
  - Elektroniken isoleras i en snygg 3D-utskriven kontrollbox där sensorernas data och motorernas kablage samlas och matas in till styrenheten. 

## 4. Programmering och styrning
*Beskriv hur en mikrokontroller (t.ex. Arduino) ska programmeras för att styra processen.*

- **Hårdvara:** Arduino Uno/Nano eller Mega är tillräckligt kraftfulla för att tolka sensorerna och driva motorerna. Motorerna drivs billigt och tyst av TMC-drivrutiner (t.ex. TMC2209) via ett enklare "CNC shield".
- **Kontrollflöde & State Machine (C/C++):**
  1. *Viloläge (IDLE):* Arduinon inväntar kvittens från brytare. Lyser papperssensorn och pärmsensorn grönt? Låt LED blinka "redo".
  2. *Matning (FEED):* Ett knapptryck startar en mjuk men snabb matningsprocess. Arduinon skickar pulser till NEMA 17-motorn via `AccelStepper`-biblioteket för att minimera ryck och rassel.
  3. *Inriktning (ALIGNMENT):* När IR-sensorn i kanalen signalerar att paprets frampunkt passerar sista valsarna, bromsas matningen så att papperet landar mjukt med sina hål över metallringarna.
  4. *Återgång (RESET):* Upprepa processen från steg 2 om magasinet har fler papper. Annars stanna.
- **Säkerhetskod:** 
  - Interrupthantering används på högsta prioritetsnivå så att systemet omedelbart klipper strömmen till motorerna om chassits skyddslucka öppnas.

## 5. Testning och iteration
*Planera för testfaser och iterationer för att finjustera lösningen.*

- **POC (Proof of Concept) på bänken:**
  - Testa en pappersvalsmekanism utan pärmen för att garantera att endast 1 papper dras från bunten per motorcykel.
- **Betatest av monterad modell (Alfatest):**
  - Ihopmontering av ram, CAD-delarna och pärm och fullkörning på enstaka papper.
  - Utvärdering av styrskenan: träffar pappershålen ringarna konsekvent under 20 försök i rad?
- **Stresstestning och miljötest (Betatest):**
  - Ladda maskinen med 100 papper. Test av olika papperstjocklekar (80g vs 120g).
- **Felsökningsloop (Iteration):**
  - *Sneddragning?* --> Justera fjädertrycket i 3D-vyn och printa om matarfästet.
  - *Missa hålen?* --> Montera precisionsskruvar för pärmfixturen så den kan förflyttas någon millimeter åt sidorna.

## 6. Produktion och implementering
*Skapa en tidsplan för produktion och implementering av den färdiga lösningen.*

*Estimerad tid: ~8-10 veckor (Deltidsarbete / Internt projekt)*

- **Vecka 1-2: Research och initial 3D-modellering**
  - Mäta de exakta dimensionerna och hålens placeringar på den gaffelpärm som är standard på kontoret. Första test i CAD-program.
- **Vecka 3-4: Materialinsamling och snabba testutskrifter**
  - Beställning av elektronik, motorer, aluminiumprofiler och skruvar. Printa första versionen av pappersmatning.
- **Vecka 5: Elektronik och Programmering**
  - Lödning, anslutning av "hårdvara" mot motorerna. Skriva grundkoden för Arduinons State Machine.
- **Vecka 6: Slutlig montering av Prototyp v1.0**
  - Samtliga komponenter monteras i 3D-printad ram. Alla kablar fästs ordentligt.
- **Vecka 7-8: Rigorösa tester och kalibrering**
  - Stresstest och iterativ justering av gummivalsar, kod och skenor tills pålitligheten ligger på minst 99% lyckade instopp.
- **Vecka 9: Kapsling och Dokumentation**
  - Designa och printa täckande "skal" och ljuddämpning (för ett snyggt, kontorsvänligt utseende). Skriva en kort One-Pager (A4) med instruktioner för hur kollegor placerar papper och pärm.
- **Vecka 10: Pilot-lansering**
  - Placera enheten i kontorets skrivarrum/-plats och utför ett vecko-test med riktiga användare. Följ upp feedback för en eventuell framtida version (Prototyp v1.1).
