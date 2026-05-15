// ramsor-data.js — datakälla för RAMSOR-fliken.
//
// Datamodell (window.RAMSOR_DATA):
//   roles[]      — rollvalsalternativ. `id` används som localStorage-värde.
//   placeholders — rader som visas när en rolls innehåll inte är inlagt än.
//   ramsor[]     — minnesramsorna. Varje ramsa har:
//     id          — unik ASCII-nyckel (för deep-links och DOM-ids)
//     name        — visningsnamn ("METHANE")
//     short       — en mening, vad ramsan används till (rad under namnet)
//     lines[]     — bokstav-för-bokstav. { letter, text } eller { letter, text, text2 }
//                   (text2 visas som högerkolumn — t.ex. svensk vs internationell)
//     usage       — fritextstycke om när och hur (kan vara tomt)
//     tags[]      — deskriptiva kategoritaggar (inga auktoritets-signaler)
//     roles[]     — vilka roller ramsan dyker upp för. Sätt flera för
//                   ramsor som delas mellan roller. Övriga ramsor (utanför
//                   rollen) hamnar i "Övriga ramsor"-expander.
//
// VIKTIGT:
//   Beskrivande, inte auktoritativt. Inget språk i denna fil får antyda
//   att en ramsa är "fastställd" av FM eller någon annan myndighet. Det
//   som är allmän praxis kallas "vanlig", "etablerad" eller "internationell"
//   — inte "officiell" eller "godkänd".
//
//   Source-research: Inga synliga källhänvisningar till SoldF eller
//   andra externa sajter i UI:t. Innehåll kontrolleras mot allmänt
//   tillgängliga källor men presenteras utan att låtsas certifiera.

window.RAMSOR_DATA = {

  roles: [
    { id: 'sjv',   name: 'Sjv',   desc: 'Sjukvårdare' },
    { id: 'sig',   name: 'Sig',   desc: 'Signalist' },
    { id: 'grpc',  name: 'GrpC',  desc: 'Gruppchef' },
    { id: 'plutc', name: 'PlutC', desc: 'Plutonchef' },
    { id: 'forare',name: 'Förare',desc: 'Fordonsförare' }
  ],

  // Visas när en roll inte har egna ramsor inlagda (eller bara har "Övriga
  // ramsor"). Detta är medvetet rakt språk — användaren ska veta att det
  // inte är en bugg utan att innehåll kommer i en kommande version.
  placeholders: {
    grpc:  'Innehåll för gruppchefsramsor håller på att samlas in. Hör av dig via feedback-länken längst ner om du vill bidra eller har önskemål.',
    plutc: 'Innehåll för plutonchefsramsor håller på att samlas in. Hör av dig via feedback-länken längst ner om du vill bidra.',
    forare:'Innehåll för förare-ramsor håller på att samlas in. Hör av dig via feedback-länken längst ner om du vill bidra.'
  },

  ramsor: [

    // ── SJUKVÅRD ─────────────────────────────────────────────────────
    {
      id: 'methane',
      name: 'METHANE',
      short: 'Rapportstruktur vid masskadehändelse / större incident.',
      lines: [
        { letter: 'M', text: 'Major incident — bekräfta eller stand-by.' },
        { letter: 'E', text: 'Exact location — koordinat eller adress.' },
        { letter: 'T', text: 'Type of incident — vad har hänt.' },
        { letter: 'H', text: 'Hazards — pågående och potentiella faror.' },
        { letter: 'A', text: 'Access — säkra in- och utfartsvägar.' },
        { letter: 'N', text: 'Number of casualties — antal skadade och svårighetsgrad.' },
        { letter: 'E', text: 'Emergency services — vad finns på plats, vad behövs.' }
      ],
      usage: 'Används vid första anmälan från skadeplats vid större incidenter. Internationellt etablerat inom prehospital vård och räddningstjänst.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: 'safe',
      name: 'SAFE',
      short: 'Säkerhetsbedömning innan man närmar sig en skadeplats.',
      lines: [
        { letter: 'S', text: 'Shout / Stop — bedöm scenen, ropa upp om hjälp.' },
        { letter: 'A', text: 'Approach with care — gå försiktigt och kontrollerat.' },
        { letter: 'F', text: 'Free from danger — säkra att området är fritt från fara.' },
        { letter: 'E', text: 'Evaluate the casualty — gå sedan över till primärbedömning.' }
      ],
      usage: 'Användbar checklista innan man börjar arbeta med en skadad. Tanken är att hjälparen själv inte ska bli nästa skadefall.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: 'cabcde',
      name: 'C-ABCDE',
      short: 'Primärbedömning av skadad — letar livshotande tillstånd i prioritetsordning.',
      lines: [
        { letter: 'C', text: 'Catastrophic bleeding — stoppa livshotande blödning direkt.' },
        { letter: 'A', text: 'Airway — fri luftväg, halsryggsskydd om relevant.' },
        { letter: 'B', text: 'Breathing — andning, andningsljud, eventuell pneumothorax.' },
        { letter: 'C', text: 'Circulation — puls, hudfärg, blödningar.' },
        { letter: 'D', text: 'Disability — medvetandegrad, pupillreaktion, neurologi.' },
        { letter: 'E', text: 'Exposure / Environment — undersök hela kroppen, skydda mot kyla.' }
      ],
      usage: 'Etablerad primärbedömning inom traumavård (PHTLS, TCCC m.fl.). C-prefixet (Catastrophic bleeding) lyfts fram först vid trauma med risk för stor yttre blödning.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: '4b',
      name: '4B',
      short: 'Skadesvep efter tecken på inre blödning — del av lilla c i C-ABCDE.',
      lines: [
        { letter: 'B', text: 'Bröstkorg — palpera revben, leta instabilitet, smärta, andningspåverkan.' },
        { letter: 'B', text: 'Buk — palpera kvadranter, leta defense, distension, smärta vid tryck.' },
        { letter: 'B', text: 'Bäcken — kontrollera stabilitet (en gång, försiktigt — komprimera ej upprepat).' },
        { letter: 'B', text: 'Ben — låren först (femurfraktur kan dölja stor inre blödning), sedan underben.' }
      ],
      usage: 'Inom TCCC används 4B som del av skadesvepet vid lilla c i (C)ABCDE — undersöker fyra områden där stor inre blödning kan döljas utan synligt yttre tecken. Snabb minnesregel för att inte missa något av de stora "blödningsrummen".',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: 'acvpu',
      name: 'ACVPU',
      short: 'Snabb skattning av medvetandegrad — del av (C)ABCDE och TCCC.',
      lines: [
        { letter: 'A', text: 'Alert — vaken, orienterad, öppnar ögon spontant och reagerar adekvat på tilltal.' },
        { letter: 'C', text: 'Confusion — vaken men nytillkommen eller förvärrad förvirring/desorientering.' },
        { letter: 'V', text: 'Verbal — reagerar enbart på tilltal (öppnar ögon eller svarar med ljud när du pratar).' },
        { letter: 'P', text: 'Pain — okontaktbar via tal, reagerar på smärtstimulering (rycker undan lem, stönar).' },
        { letter: 'U', text: 'Unresponsive — medvetslös, ingen reaktion på vare sig tilltal eller smärta.' }
      ],
      usage: 'Internationell skala för att snabbt bedöma och övervaka medvetandegrad. Används inom TCCC och som del av D i (C)ABCDE. Den ersätter ofta tidigare AVPU genom att lägga till "C" (Confusion) — en nytillkommen förvirring fångas tidigare än om man bara skiljer på vaken/röst/smärta/medvetslös.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: 'gcs',
      name: 'GCS — Glasgow Coma Scale',
      short: 'Internationell poängskala för medvetandegrad (3–15 p) över tre tester.',
      lines: [
        { letter: 'E', text: 'Ögonöppning (1–4): 4 spontant · 3 vid tilltal · 2 vid smärta · 1 ingen reaktion.' },
        { letter: 'V', text: 'Verbalt svar (1–5): 5 fullt orienterad · 4 desorienterad/konfusionell · 3 enstaka ord · 2 oartikulerat ljud · 1 ingen reaktion.' },
        { letter: 'M', text: 'Motorisk reaktion (1–6): 6 lyder uppmaning · 5 lokaliserar smärta · 4 drar undan armen · 3 flexion i armbåge · 2 extension · 1 ingen reaktion.' }
      ],
      usage: 'Summera de tre delpoängen. Max 15 p = helt vaken patient. Komatös patient får minst 3 p. Skalan är internationellt etablerad. I Sverige (särskilt västra) används parallellt den svenska RLS-85.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: 'at-mist',
      name: 'AT-MIST',
      short: 'Strukturerad överlämning av skadad till nästa vårdnivå.',
      lines: [
        { letter: 'A', text: 'Age — patientens ålder och kön (eller bedömd ålder och kön om okänd, ange då bedömt läge).' },
        { letter: 'T', text: 'Time — tidpunkt för skadan (eller bedömd tid om okänd).' },
        { letter: 'M', text: 'Mechanism — skademekanism (vad orsakade skadan).' },
        { letter: 'I', text: 'Injuries — funna och misstänkta skador.' },
        { letter: 'S', text: 'Signs / Symptoms — vitalparametrar, smärta, medvetande.' },
        { letter: 'T', text: 'Treatment — vad har gjorts (förband, tourniquet, smärtlindring).' }
      ],
      usage: 'Vanlig överlämningsstruktur från fältsjukvårdare till sjukhus eller högre vårdnivå. AT-MIST är den variant som lärs ut på TOS/TCCC idag — Age och Time of injury läggs till framför MIST. Internationellt etablerad.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    {
      id: '9line-medevac',
      name: '9-LINE MEDEVAC',
      short: 'Strukturerad begäran om medicinsk evakuering.',
      lines: [
        { letter: '1', text: 'Plats för upptag (koordinat).' },
        { letter: '2', text: 'Radio och anropssignal på upptagsplats.' },
        { letter: '3', text: 'Antal skadade per prioritet (A urgent, B priority, C routine).' },
        { letter: '4', text: 'Specialutrustning som behövs (ventilator, blod, extrak­tion).' },
        { letter: '5', text: 'Antal skadade per bårtyp (liggande / sittande).' },
        { letter: '6', text: 'Säkerhetsläge på upptagsplats (fientlig kontakt eller ej).' },
        { letter: '7', text: 'Markering av upptagsplats (rök, panel, lampa, IR).' },
        { letter: '8', text: 'Nationalitet och status (egen, civil, krigsfånge).' },
        { letter: '9', text: 'NBC-/terräng-/väderinformation som påverkar landning.' }
      ],
      usage: 'Internationellt format för evakueringsbegäran. Detaljer i rad 6 och 8 varierar något mellan länder och förband.',
      tags: ['Sjukvård', 'Internationellt'],
      roles: ['sjv']
    },

    // TOS — avvaktar specifikation från användare. Visas inte i UI:t men
    // ligger som markör för v0.2.x när specifikationen kommer in.
    // TODO: lägg in TOS-ramsa när användaren preciserat vad som avses.

    // ── SIGNALIST ────────────────────────────────────────────────────
    {
      id: 'talgruppsbyte',
      name: 'Talgruppsbyte',
      short: 'Procedur för att byta talgrupp och kvittera när man kommit över.',
      lines: [
        { letter: '1', text: 'Anropa mottagare i nuvarande talgrupp och meddela byte.' },
        { letter: '2', text: 'Meddela vilken talgrupp som byts till samt anledning om relevant.' },
        { letter: '3', text: 'Invänta kvittens på att mottagaren förstått och är beredd.' },
        { letter: '4', text: 'Byt manuellt till ny talgrupp på radion.' },
        { letter: '5', text: 'Anropa direkt i nya talgruppen och vänta på kvittens.' },
        { letter: '6', text: 'Om inget svar inom rimlig tid — gå tillbaka till tidigare talgrupp och försök igen.' }
      ],
      usage: 'Allmän procedur för planerade byten mellan talgrupper. Detaljer kan variera mellan radiomateriel och förband — följ alltid lokala instruktioner.',
      tags: ['Signalist', 'Generellt'],
      roles: ['sig']
    },

    {
      id: 'ra1444-handhavande',
      name: 'RA 1444 — handhavande',
      short: 'Snabb påminnelse om RA 1444 / 180 (handburen radio) — användning på fältet.',
      lines: [
        { letter: '·', text: 'Strömknappen (vrid medurs) sätter igång radion och styr volymen.' },
        { letter: '·', text: 'Talgrupp väljs med kanalväljaren — bekräfta i displayen.' },
        { letter: '·', text: 'PTT-knappen på sidan (eller på headsetet) trycks in vid sändning, släpps direkt efter.' },
        { letter: '·', text: 'Korta, tydliga meddelanden. Vänta 1 sekund efter PTT innan du börjar tala — undvik att tappa de första orden.' },
        { letter: '·', text: 'Antennen ska peka uppåt — inte mot kroppen — för bästa räckvidd.' }
      ],
      usage: 'Mycket förenklad påminnelse. Detaljerade handhavande-instruktioner och felsökning kommer i en senare version — hör av dig om du har konkreta önskemål.',
      tags: ['Signalist', 'Materiel'],
      roles: ['sig']
    },

    {
      id: 'ra180-1247-eff',
      name: 'RA 180 — 1-2-4-7-Effekt',
      short: 'Felsökning och upprättning av RA 180 — knapparna att kontrollera i ordning.',
      lines: [
        { letter: '1', text: 'Tid — kontrollera att radion har rätt tid.' },
        { letter: '2', text: 'Nätdata — verifiera att rätt nät är inläst.' },
        { letter: '4', text: 'Kryptonycklar — kontrollera att nycklar finns laddade.' },
        { letter: '7', text: 'Rätt nyckel aktiverad — verifiera att rätt nyckel är vald.' },
        { letter: 'Eff', text: 'Effekt-knappen i rätt läge — NORM vid normal användning. Kolla även att radion inte fastnat i dataläge (DDA), samt att antenn och kablage är hela och fastskruvade.' }
      ],
      usage: 'Vid sambandsavbrott: tryck metodiskt på knapparna 1, 2, 4, 7 i tur och ordning för att verifiera tid, nätdata, nycklar och aktiv nyckel. Kontrollera sedan Effekt-läget. Ett vanligt fel är att RA 180 står i låg-läge (avsett för att minska röjande signal/spara batteri vid korta avstånd) när det är svårt att få samband.',
      tags: ['Signalist', 'Materiel'],
      roles: ['sig']
    },

    {
      id: 'passningsalternativ',
      name: 'Passningsalternativ',
      short: 'Passningsschema för sambandssystem — när och hur ofta radion ska passas.',
      lines: [
        { letter: '1', text: 'Alltid — kontinuerlig passning.' },
        { letter: '2', text: '5 min varje 15 min.' },
        { letter: '3', text: '5 min varje 30 min.' },
        { letter: '4', text: '10 min varje 60 min.' }
      ],
      usage: 'Kom överens om från NÄR passningen ska börja. Undvik hela siffror som 00, 15, 30, 45 — välj en udda starttid så att flera enheter inte hamnar synkat på samma minut. Exempel: "Från kl 13.48. Passalt 3." → radion passas i 5 min varje xx.48 och xx.18.',
      tags: ['Signalist', 'Generellt'],
      roles: ['sig']
    },

    {
      id: 'bokstavering',
      name: 'Bokstavering — svensk + internationell',
      short: 'Bokstavering och siffer-uttal: svensk standard (vänster) och NATO/ICAO (höger).',
      columns: ['Svensk', 'Internationell'],
      lines: [
        { letter: 'A', text: 'Adam',     text2: 'Alpha' },
        { letter: 'B', text: 'Bertil',   text2: 'Bravo' },
        { letter: 'C', text: 'Cesar',    text2: 'Charlie' },
        { letter: 'D', text: 'David',    text2: 'Delta' },
        { letter: 'E', text: 'Erik',     text2: 'Echo' },
        { letter: 'F', text: 'Filip',    text2: 'Foxtrot' },
        { letter: 'G', text: 'Gustav',   text2: 'Golf' },
        { letter: 'H', text: 'Helge',    text2: 'Hotel' },
        { letter: 'I', text: 'Ivar',     text2: 'India' },
        { letter: 'J', text: 'Johan',    text2: 'Juliet' },
        { letter: 'K', text: 'Kalle',    text2: 'Kilo' },
        { letter: 'L', text: 'Ludvig',   text2: 'Lima' },
        { letter: 'M', text: 'Martin',   text2: 'Mike' },
        { letter: 'N', text: 'Niklas',   text2: 'November' },
        { letter: 'O', text: 'Olof',     text2: 'Oscar' },
        { letter: 'P', text: 'Petter',   text2: 'Papa' },
        { letter: 'Q', text: 'Quintus',  text2: 'Quebec' },
        { letter: 'R', text: 'Rikard',   text2: 'Romeo' },
        { letter: 'S', text: 'Sigurd',   text2: 'Sierra' },
        { letter: 'T', text: 'Tore',     text2: 'Tango' },
        { letter: 'U', text: 'Urban',    text2: 'Uniform' },
        { letter: 'V', text: 'Viktor',   text2: 'Victor' },
        { letter: 'W', text: 'Wilhelm',  text2: 'Whiskey' },
        { letter: 'X', text: 'Xerxes',   text2: 'X-ray' },
        { letter: 'Y', text: 'Yngve',    text2: 'Yankee' },
        { letter: 'Z', text: 'Zäta',     text2: 'Zulu' },
        { letter: 'Å', text: 'Åke',      text2: 'Alfa-Alfa (AA)' },
        { letter: 'Ä', text: 'Ärlig',    text2: 'Alfa-Echo (AE)' },
        { letter: 'Ö', text: 'Östen',    text2: 'Oscar-Echo (OE)' },
        { letter: '0', text: 'Nolla',    text2: 'ZERO' },
        { letter: '1', text: 'Ett',      text2: 'ONE' },
        { letter: '2', text: 'Tvåa',     text2: 'TWO' },
        { letter: '3', text: 'Trea',     text2: 'THREE' },
        { letter: '4', text: 'Fyra',     text2: 'FOUR' },
        { letter: '5', text: 'Femma',    text2: 'FIVE' },
        { letter: '6', text: 'Sexa',     text2: 'SIX' },
        { letter: '7', text: 'Sju',      text2: 'SEVEN' },
        { letter: '8', text: 'Åtta',     text2: 'EIGHT' },
        { letter: '9', text: 'Nia',      text2: 'NINER' },
        { letter: ',', text: 'Komma',    text2: 'DECIMAL' },
        { letter: '.', text: 'Punkt',    text2: 'STOP' }
      ],
      usage: 'Svenska bokstaverings­alfabetet används i nationell radio­trafik. NATO-alfabetet (ICAO Phonetic) används i internationella sammanhang och i samband med utländska enheter. Å, Ä, Ö saknas internationellt — bokstaveras då som AA, AE respektive OE (Alfa-Alfa, Alfa-Echo, Oscar-Echo). NINER används istället för NINE för att undvika sammanblandning med tyska "nein".',
      tags: ['Signalist', 'Internationellt'],
      roles: ['sig']
    }

    // 1227-tabellen är borttagen som egen ramsa här — det fanns inget riktigt
    // innehåll än, bara en intro-platshållare. Full 1227-tabell ligger i
    // roadmap-data.js under "Kommer snart" och läggs in när den är komplett.
    //
    // GrpC, PlutC, Förare: se placeholders ovan. Innehåll läggs in i v0.2.x
    // när research mot säkra källor kunnat verifieras — inte uppfunnet.

  ]
};
