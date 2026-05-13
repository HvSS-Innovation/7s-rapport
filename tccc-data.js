// tccc-data.js — datakälla för TCCC-fliken.
//
// TCCC = Tactical Combat Casualty Care. Internationell standard från
// Joint Trauma System / Committee on TCCC. Reglerar prehospital
// traumavård i stridsförhållanden.
//
// Datamodell (window.TCCC_DATA):
//   intro       — varning + bakgrund som visas överst
//   phases[]    — CUF / TFC / TACEVAC. Varje fas har { id, name, full,
//                 desc, focus[] }
//   marchpaws[] — MARCH-PAWS-bokstäverna med beskrivning och
//                 nyckelinterventioner per bokstav
//   topics[]    — fördjupningsämnen (tourniquet-konvertering,
//                 krikotyrotomi, TBI, hypotermi etc.)
//   docs[]      — bifogade PDF:er och externa källor
//
// VIKTIGT:
//   Beskrivande, inte auktoritativt. TCCC är amerikansk doktrin —
//   ej fastställd av Försvarsmakten. Sverige har egen sjukvårds-
//   instruktion. Innehållet här är översatt sammandrag som hjälpmedel
//   för utbildning, inte en ersättning för utbildning.
//
//   INTE EN CHECKLISTA FÖR SKARPT LÄGE. I skarpt läge har man inte
//   tid att scrolla en mobil — då gäller utbildad reflex. Detta är
//   verktyget för att bygga den reflexen mellan övningarna.

window.TCCC_DATA = {

  intro: {
    title: 'TCCC — Tactical Combat Casualty Care',
    subtitle: 'Översikt över riktlinjer för stridsskadad sjukvård',
    warning: 'Detta är ett utbildnings- och referensverktyg. Det är ' +
             'INTE en checklista att klicka fram i en skarp situation — ' +
             'då finns ingen tid att scrolla. Läs, träna, repetera. ' +
             'Under skarpt läge gäller utbildad reflex, inte mobilen.',
    background: 'TCCC (Tactical Combat Casualty Care) är ett amerikanskt ' +
                'ramverk utvecklat av Committee on TCCC under Joint Trauma ' +
                'System. Det är världsstandard inom prehospital strids- ' +
                'skadevård och ligger till grund för utbildning i många ' +
                'försvarsmakter, även den svenska. Riktlinjerna uppdateras ' +
                'kontinuerligt — senaste fullständiga uppdatering är ' +
                'TCCC Guidelines 2026.',
    disclaimer: 'TCCC är inte fastställd av Försvarsmakten. Sverige har ' +
                'egna sjukvårdsinstruktioner som gäller. Detta verktyg ' +
                'är en privat sammanställning för utbildningssyfte och ' +
                'följer principen att riktlinjer ska anpassas, inte ' +
                'blindt adopteras (Penn Tactical Solutions, 2026).'
  },

  // ── Faser ────────────────────────────────────────────────────────────
  phases: [
    {
      id: 'cuf',
      name: 'CUF',
      full: 'Care Under Fire',
      sv: 'Vård under eld',
      desc: 'När du och den skadade fortfarande är under direkt eldgivning. ' +
            'Mål: stoppa pågående katastrofal blödning och få bort båda ' +
            'från eldlinjen. Allt annat väntar. Returnera elden om uppdraget ' +
            'kräver det — egen säkerhet och eldöverlägsenhet är ofta bästa ' +
            'sjukvård i denna fas.',
      focus: [
        'Bekämpa hotet — egen och kamrats säkerhet först',
        'Snabb tourniquet (TQ) högt och tight på blödande extremitet',
        'Få den skadade till skydd / ut ur eldlinjen',
        'Skadan placeras så att andningsväg inte hindras',
        'INGEN omfattande undersökning här — det görs i TFC'
      ]
    },
    {
      id: 'tfc',
      name: 'TFC',
      full: 'Tactical Field Care',
      sv: 'Taktisk fältvård',
      desc: 'När direkt hot är hanterat eller du är i skydd. Här genomförs ' +
            'systematisk undersökning enligt MARCH-PAWS-ramverket. Tid och ' +
            'utrymme finns för fler interventioner, men du är fortfarande ' +
            'i fält — utrustning och resurser är begränsade.',
      focus: [
        'Systematisk genomgång MARCH-PAWS',
        'Återvärdera tourniquets — högt-och-tight först, konvertera om möjligt',
        'Avancerad luftväg vid behov',
        'Behandla spänningspneumothorax',
        'Förhindra hypotermi (även i värme — chocktillstånd förlorar värme)',
        'Dokumentera (TCCC Casualty Card)'
      ]
    },
    {
      id: 'tacevac',
      name: 'TACEVAC',
      full: 'Tactical Evacuation Care',
      sv: 'Taktisk evakueringsvård',
      desc: 'Vård under transport från skadeplats till nästa vårdnivå. ' +
            'Inkluderar både CASEVAC (evakuering med icke-medicinsk plattform) ' +
            'och MEDEVAC (dedikerad medicinsk transport). Mer resurser och ' +
            'ofta mer kvalificerad personal — möjlighet till fler ' +
            'interventioner och kontinuerlig övervakning.',
      focus: [
        'Övervakning av vitalparametrar',
        'Fortsatt behandling enligt MARCH-PAWS',
        'Smärta — analgesi enligt protokoll',
        'Antibiotika vid penetrerande skador',
        '9-LINE MEDEVAC-rapport till mottagande enhet',
        'Överlämning enligt MIST (i RAMSOR-fliken)'
      ]
    }
  ],

  // ── MARCH-PAWS-ramverket ─────────────────────────────────────────────
  marchpaws: [
    {
      letter: 'M',
      title: 'Massive Hemorrhage',
      sv: 'Katastrofal blödning',
      desc: 'Stoppa pågående livshotande blödning. Den vanligaste ' +
            'förebyggbara dödsorsaken på slagfältet. Ska göras inom sekunder.',
      interventions: [
        'Tourniquet (TQ) — högt och tight på extremitet, 2–3 tum ovanför sår, ALDRIG över led',
        'Hemostatiskt förband (Combat Gauze, ChitoGauze) i kombination med direkt tryck minst 3 minuter',
        'Tryckförband ovanpå hemostat',
        'Junktionell tourniquet (CRoC, SAM Junctional) vid blödning ljumske/axel'
      ],
      pitfalls: [
        'Glöm inte sekundär TQ vid kvarstående blödning — applicera nästa ovanför',
        'Märk TID när TQ sätts — sharpie på TQ eller på pannan',
        'TQ orsakar smärta — den ska vara obekväm för att fungera'
      ]
    },
    {
      letter: 'A',
      title: 'Airway',
      sv: 'Luftväg',
      desc: 'Säkerställ fri luftväg. Medvetslös skadad andas ofta dåligt på ' +
            'rygg pga tungan. TCCC 2026 lyfter kirurgisk krikotyrotomi som ' +
            'första linje vid svår luftvägsobstruktion — supraglottiska ' +
            'luftvägar (i-gel etc.) är inte längre primärt val vid trauma.',
      interventions: [
        'Sidoläge (recovery position) om medvetslös och andas',
        'Käklyft (jaw thrust) — undvik huvudtilt vid misstänkt nackskada',
        'Nasofaryngeal luftväg (NPA) vid behov av enkelt luftvägsstöd',
        'Kirurgisk krikotyrotomi vid svår obstruktion eller ansiktstrauma'
      ],
      pitfalls: [
        'Aldrig orofaryngeal luftväg (OPA) på medveten skadad — kräks',
        'Krikotyrotomi kräver utbildning — träna på modell innan skarpt'
      ]
    },
    {
      letter: 'R',
      title: 'Respiration',
      sv: 'Andning',
      desc: 'Bedöm bröstkorgens funktion. Penetrerande bröstskada → risk för ' +
            'spänningspneumothorax (tryck-pneu). Identifieras på ena sidans ' +
            'avsaknad av andningsljud, ökande andnöd, halsvenstaurad och ' +
            'cirkulationssvikt.',
      interventions: [
        'Vent-occlusive dressing (chest seal med ventil) på alla penetrerande bröst-/ryggsår',
        'Nålthorakentes — 14G nål, 2:a interkostalrum medioklavikulärt ELLER 5:e interkostalrum främre axillarlinjen',
        'Återupprepa thorakentes om symtom återkommer',
        'Övervaka andningsfrekvens, syremättnad om tillgängligt'
      ],
      pitfalls: [
        'En-vägs-chest-seal kan blockeras — kolla regelbundet',
        'Mätt syremättnad ≠ adekvat ventilation vid pneumothorax'
      ]
    },
    {
      letter: 'C',
      title: 'Circulation',
      sv: 'Cirkulation',
      desc: 'Hantera chock och reevaluera blödningsstopp. TQ från CUF ska nu ' +
            'omprövas — kan den konverteras till tryckförband? IV/IO-access ' +
            'och vätskebehandling enligt protokoll. Permissiv hypotension ' +
            'gäller vid trauma utan TBI.',
      interventions: [
        'Återvärdera alla tourniquets — konvertera om kriterier uppfyllda',
        'IV/IO-access — 18G eller större',
        'Blod är förstahandsval; sedan plasma; kristalloider sista hand',
        'Tranexamsyra (TXA) 1g IV om <3h sedan skada',
        'TQ-konvertering: 3 kriterier måste alla uppfyllas (se Fördjupning)'
      ],
      pitfalls: [
        'TQ ska INTE konverteras efter >2h utan medicinsk personal',
        'TQ ska INTE konverteras vid amputation',
        'Tomt rörbälte = grov underskattning av blodförlust — räkna m² blodfläck'
      ]
    },
    {
      letter: 'H',
      title: 'Head / Hypothermia',
      sv: 'Huvudskada / Hypotermi',
      desc: 'Bedöm medvetandegrad (AVPU) och förhindra hypotermi. TBI ' +
            '(traumatisk hjärnskada) har en utökad sektion i TCCC 2026. ' +
            'Hypotermi är dödligt även i värme — chock + blodförlust kyler ' +
            'kroppen oavsett yttertemperatur.',
      interventions: [
        'AVPU-bedömning: Alert / Voice / Pain / Unresponsive',
        'Pupillkontroll — storlek, ljusreaktion, symmetri',
        'HPMK (Hypothermia Prevention and Management Kit) eller Ready Heat',
        'Isolera från marken — pad/madrass under skadad',
        'Vid TBI: höj huvudändan 30° om inget ryggtrauma misstänks'
      ],
      pitfalls: [
        'Aldrig direkt värme på frusen extremitet — risk för brännskada',
        'TBI utan yttre tecken är vanligt — låg tröskel för misstanke vid explosion'
      ]
    },
    {
      letter: 'P',
      title: 'Pain',
      sv: 'Smärta',
      desc: 'Smärtlindring enligt 3-stegs-modell. Smärta är inte bara ' +
            'humanitärt — obehandlad smärta förvärrar chock och försvårar ' +
            'transport.',
      interventions: [
        'Mild smärta + kunna strida: Mobic + Tylenol PO',
        'Måttlig smärta, ej chock: OTFC (oral transmucosal fentanyl)',
        'Svår smärta + chock: Ketamin IM/IV/IO (50mg IM eller 20mg IV/IO)',
        'Anteckna alla doser på TCCC Casualty Card'
      ],
      pitfalls: [
        'Opioid på chockad patient kan tippa över i hjärtstillestånd',
        'Ketamin höjer blodtryck — säkrare vid chock än morfin/fentanyl',
        'En skadad som fått fentanyl ska INTE använda vapen'
      ]
    },
    {
      letter: 'A',
      title: 'Antibiotics',
      sv: 'Antibiotika',
      desc: 'Penetrerande skador och öppna frakturer ska antibiotika-' +
            'profylaxeras tidigt. Förebygger sårinfektion och sepsis.',
      interventions: [
        'Moxifloxacin 400mg PO en gång (förstahandsval om kan svälja)',
        'Ertapenem 1g IV/IM en gång (om kan inte svälja eller penetrerande buk)',
        'Ge inom 3h från skada om möjligt'
      ],
      pitfalls: [
        'Allergi-screening — fråga om kan svara',
        'Dokumentera dos och tid'
      ]
    },
    {
      letter: 'W',
      title: 'Wounds',
      sv: 'Sår',
      desc: 'Övriga sår som inte är livshotande hanteras nu. Rena, täcka, ' +
            'förebygga infektion. Ögon- och bukskador har särskilda regler.',
      interventions: [
        'Skölj med ren vätska om tid finns',
        'Steriltäcka',
        'Buksår med utträngande tarm: täck med fuktig steril kompress — DRA INTE TILLBAKA',
        'Ögonskador: rigid skydd över ögat, inget tryck',
        'Brännskador: täck med torr steril kompress, kyl INTE för länge'
      ],
      pitfalls: [
        'Aldrig sluta ett djupt sår med tryckförband om hemostat inte fungerat — TQ istället',
        'Penetrerande föremål LÄMNAS KVAR — stabilisera, dra inte ut'
      ]
    },
    {
      letter: 'S',
      title: 'Splinting',
      sv: 'Skenor / Stabilisering',
      desc: 'Stabilisera frakturer och dislocerade leder för smärtlindring ' +
            'och förebyggande av sekundärskada. SAM-splint är standard.',
      interventions: [
        'SAM-splint formad till skadan, fixera ovan och nedom skada',
        'Bäckenfraktur: bäckengördel (SAM Pelvic Sling)',
        'Halskrage vid misstänkt nackskada (men inte vid penetrerande halsskada)',
        'Återvärdera distal puls och känsel efter skenning'
      ],
      pitfalls: [
        'För hård fixering → cirkulationsförsämring',
        'Bäckengördel placeras över höftbenen, INTE över midjan'
      ]
    }
  ],

  // ── Fördjupningsämnen ────────────────────────────────────────────────
  topics: [
    {
      id: 'tq-convert',
      title: 'Tourniquet-konvertering (TQ → tryckförband)',
      category: 'Circulation',
      content: 'TCCC 2026 är tydlig: en tourniquet är livräddande men kan ' +
               'orsaka vävnadsskada efter 2 timmar. När taktisk situation ' +
               'tillåter ska TQ konverteras till hemostat + tryckförband.\n\n' +
               'TRE KRITERIER måste alla vara uppfyllda för konvertering:\n' +
               '1. Patienten är INTE i chock\n' +
               '2. Såret kan övervakas nära under och efter konvertering\n' +
               '3. TQ kontrollerar INTE en amputerad extremitet\n\n' +
               'Procedur: applicera hemostat + tryckförband distalt. Lossa ' +
               'TQ långsamt. Övervaka 10–15 min. Om blödning återupptas → ' +
               'TQ tillbaka. ASM/CLS-nivå: konvertera INTE efter >2h utan ' +
               'medicinsk personal närvarande.'
    },
    {
      id: 'cric',
      title: 'Kirurgisk krikotyrotomi (CRIC)',
      category: 'Airway',
      content: 'TCCC 2026 lyfter kirurgisk krikotyrotomi som primärt val ' +
               'vid svår luftvägsobstruktion i fält — supraglottiska ' +
               'enheter (i-gel etc.) är inte längre rekommenderat första ' +
               'val vid stridsskada. Anledningen: penetrerande ansikts- ' +
               'och halstrauma gör supraglottiska enheter opålitliga.\n\n' +
               'Indikation: medvetslös skadad utan andning trots käklyft + ' +
               'NPA. Ansiktstrauma med blod i luftväg. Brännskada i ansikte ' +
               'med ödem.\n\n' +
               'Procedur (grovt): identifiera krikoidmembranet (mellan ' +
               'sköldkörtelbrosket och krikoidbrosket). Vertikalt 3-cm-snitt ' +
               'genom hud. Horisontalt 1-cm-snitt genom membranet. Trach- ' +
               'hook drar upp krikoiden, för in trachealtub 6.0. Fixera.\n\n' +
               'KRÄVER ÖVNING. Träna på modell innan skarpt läge.'
    },
    {
      id: 'tbi',
      title: 'TBI — Traumatisk hjärnskada',
      category: 'Head',
      content: 'TCCC 2026 har utökad sektion för TBI. Tre kategorier:\n' +
               '• Mild TBI (commotio) — kort medvetslöshet eller förvirring\n' +
               '• Måttlig TBI — medvetslöshet, GCS 9–12\n' +
               '• Svår TBI — GCS ≤8, ihållande medvetslöshet\n\n' +
               'Cushings triad (signal för förhöjt intrakraniellt tryck):\n' +
               '• Hypertoni (högt blodtryck)\n' +
               '• Bradykardi (långsam puls)\n' +
               '• Oregelbunden andning\n\n' +
               'Vid misstänkt TBI: höj huvudändan 30° om ej ryggtrauma. ' +
               'Undvik hypotension (hjärnan klarar inte lågt blodtryck). ' +
               'Permissiv hypotension gäller INTE vid TBI — sikta normalt ' +
               'blodtryck. Syrgas om tillgängligt. Snabb evakuering till ' +
               'neurokirurgisk vård.'
    },
    {
      id: 'hypothermia',
      title: 'Hypotermi-prevention',
      category: 'Head',
      content: 'Hypotermi är en del av "dödens triad" (hypotermi + acidos + ' +
               'koagulopati) och är dödligt även i sommarvärme. En skadad i ' +
               'chock förlorar värme oavsett yttertemperatur — kroppens ' +
               'cirkulation klarar inte termoregleringen.\n\n' +
               'HPMK (Hypothermia Prevention and Management Kit) eller ' +
               'liknande aktivt värmesystem är standard. Ready Heat är en ' +
               'kemisk värmefilt utan ström.\n\n' +
               'Princip:\n' +
               '1. Klä av blöta kläder\n' +
               '2. Isolera från marken (pad/madrass)\n' +
               '3. Aktiv värme (HPMK/Ready Heat) på torso\n' +
               '4. Täck huvud — stor värmeförlust där\n' +
               '5. Övervaka — för mycket värme kan ge perifer vasodilation ' +
               'och försämra blodtryck'
    },
    {
      id: 'casualty-card',
      title: 'TCCC Casualty Card',
      category: 'Övrigt',
      content: 'Dokumentation följer den skadade. TCCC Casualty Card är ' +
               'ett standardformulär (DD Form 1380 i USA, motsvarighet ' +
               'finns nationellt). Innehåller:\n\n' +
               '• Skadans typ, plats, mekanism\n' +
               '• TQ-applicering: var, när\n' +
               '• Givna mediciner: namn, dos, tid, väg\n' +
               '• Vätskor: typ, mängd, tid\n' +
               '• Vitalparametrar över tid\n' +
               '• AVPU-status\n\n' +
               'Fästs synligt på skadad (oftast vid bröstficka eller ' +
               'TQ:n själv). Mottagande enhet behöver veta exakt vad som ' +
               'gjorts och när.'
    }
  ],

  // ── Dokument & källor ────────────────────────────────────────────────
  docs: [
    {
      title: 'TCCC Guidelines 2026 (NGCM)',
      url: 'tccc/tccc-guidelines-2026.pdf',
      type: 'pdf',
      desc: 'Fullständiga riktlinjer från Joint Trauma System (kopia)'
    },
    {
      title: 'Adaptation Not Adoption — 2026 TCCC Guidelines',
      url: 'https://penntacticalsolutions.com/blogs/field-notes/adaptation-not-adoption-2026-tccc-guidelines',
      type: 'extern',
      desc: 'Penn Tactical Solutions kommentar på 2026-uppdateringen'
    },
    {
      title: 'RAMSOR — METHANE, C-ABCDE, SAFE, MIST, 9-LINE MEDEVAC',
      url: 'ramsor.html',
      type: 'intern',
      desc: 'Relaterade sjukvårdsramsor i RAMSOR-fliken'
    }
  ]
};
